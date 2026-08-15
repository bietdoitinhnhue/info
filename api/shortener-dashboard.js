const {
    getCurrentUser,
    hashToObject,
    isAdminEmail,
    json,
    parseLinkRecord,
    publicUser,
    rateLimit,
    redis,
    redisPipeline,
    requireSameOrigin
} = require("../lib/shortener-store");

const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$/;
const PAGE_SIZE = 50;
const MAX_LINK_UPDATES_PER_HOUR = 30;

function readBody(req) {
    if (!req.body) return {};
    if (typeof req.body === "object") return req.body;
    try {
        return JSON.parse(req.body);
    } catch {
        return {};
    }
}

function parseDestination(value) {
    const raw = String(value || "").trim();
    if (!raw || raw.length > 2048) return null;
    try {
        const url = new URL(raw);
        if (!["http:", "https:"].includes(url.protocol)) return null;
        if (url.username || url.password) return null;
        if (/\/go\/[a-z0-9-]+\/?$/i.test(url.pathname)) return null;
        return url.toString();
    } catch {
        return null;
    }
}

function normalizePairs(value) {
    if (!Array.isArray(value)) return [];
    const pairs = [];
    for (let i = 0; i < value.length; i += 2) {
        pairs.push({ slug: String(value[i]), score: Number(value[i + 1]) || 0 });
    }
    return pairs;
}

function numericObject(value) {
    const object = hashToObject(value);
    return Object.fromEntries(
        Object.entries(object).map(([key, count]) => [key, Number(count) || 0])
    );
}

async function loadLinks(user, scope, page) {
    const admin = isAdminEmail(user.email);
    const effectiveScope = admin && scope === "all" ? "all" : "mine";
    const listKey = effectiveScope === "all" ? "all-links" : "user-links:" + user.id;
    const start = page * PAGE_SIZE;
    const [rawPairs, total] = await redisPipeline([
        ["ZREVRANGE", listKey, start, start + PAGE_SIZE - 1, "WITHSCORES"],
        ["ZCARD", listKey]
    ]);
    const pairs = normalizePairs(rawPairs);

    const commands = [];
    for (const pair of pairs) {
        commands.push(["GET", "short-link:" + pair.slug]);
        commands.push(["HGET", "analytics:" + pair.slug, "total"]);
    }
    const results = await redisPipeline(commands);
    const links = [];
    const ownerIds = new Set();

    for (let i = 0; i < pairs.length; i += 1) {
        const record = parseLinkRecord(results[i * 2]);
        if (!record || !record.destination) continue;
        if (effectiveScope === "mine" && record.userId !== user.id) continue;
        if (record.userId) ownerIds.add(record.userId);
        links.push({
            slug: pairs[i].slug,
            destination: record.destination,
            domain: record.domain || null,
            path: record.domain ? "/" + pairs[i].slug : "/go/" + pairs[i].slug,
            shortUrl: record.domain ? "https://" + record.domain + "/" + pairs[i].slug : null,
            createdAt: record.createdAt || new Date(pairs[i].score).toISOString(),
            ownerId: record.userId,
            clicks: Number(results[i * 2 + 1]) || 0
        });
    }

    const ownerMap = {};
    if (admin && effectiveScope === "all" && ownerIds.size) {
        const ids = Array.from(ownerIds);
        const owners = await redisPipeline(ids.map(id => ["GET", "user:" + id]));
        ids.forEach((id, index) => {
            try {
                const parsed = owners[index] ? JSON.parse(owners[index]) : null;
                if (parsed) ownerMap[id] = publicUser(parsed);
            } catch {
                // Ignore deleted or malformed users.
            }
        });
    }

    links.forEach(link => {
        link.owner = link.ownerId && ownerMap[link.ownerId]
            ? { name: ownerMap[link.ownerId].name, email: ownerMap[link.ownerId].email }
            : null;
        delete link.ownerId;
    });

    return {
        links,
        page,
        pageSize: PAGE_SIZE,
        total: Number(total) || 0,
        scope: effectiveScope
    };
}

async function loadDetail(user, slug) {
    if (!SLUG_PATTERN.test(slug)) {
        const error = new Error("URL rút gọn không hợp lệ.");
        error.status = 400;
        throw error;
    }

    const record = parseLinkRecord(await redis(["GET", "short-link:" + slug]));
    if (!record) {
        const error = new Error("Không tìm thấy link.");
        error.status = 404;
        throw error;
    }

    const admin = isAdminEmail(user.email);
    if (!admin && record.userId !== user.id) {
        const error = new Error("Bạn không có quyền xem link này.");
        error.status = 403;
        throw error;
    }

    const base = "analytics:" + slug;
    const [overview, daily, countries, cities, sources, devices] = await redisPipeline([
        ["HGETALL", base],
        ["HGETALL", base + ":daily"],
        ["HGETALL", base + ":countries"],
        ["HGETALL", base + ":cities"],
        ["HGETALL", base + ":sources"],
        ["HGETALL", base + ":devices"]
    ]);

    return {
        link: {
            slug,
            destination: record.destination,
            domain: record.domain || null,
            path: record.domain ? "/" + slug : "/go/" + slug,
            shortUrl: record.domain ? "https://" + record.domain + "/" + slug : null,
            createdAt: record.createdAt,
            ownerId: admin ? record.userId : undefined
        },
        analytics: {
            total: Number(hashToObject(overview).total) || 0,
            lastClick: hashToObject(overview).lastClick || null,
            daily: numericObject(daily),
            countries: numericObject(countries),
            cities: numericObject(cities),
            sources: numericObject(sources),
            devices: numericObject(devices)
        }
    };
}

async function updateDestination(req, user) {
    if (!requireSameOrigin(req)) {
        const error = new Error("Yêu cầu không hợp lệ.");
        error.status = 403;
        throw error;
    }

    const body = readBody(req);
    const slug = String(body.slug || "").trim().toLowerCase();
    const destination = parseDestination(body.destination);
    if (!SLUG_PATTERN.test(slug)) {
        const error = new Error("URL rút gọn không hợp lệ.");
        error.status = 400;
        throw error;
    }
    if (!destination) {
        const error = new Error("Hãy nhập link đích http/https hợp lệ, tối đa 2.048 ký tự.");
        error.status = 400;
        throw error;
    }

    const key = "short-link:" + slug;
    const record = parseLinkRecord(await redis(["GET", key]));
    if (!record) {
        const error = new Error("Không tìm thấy link.");
        error.status = 404;
        throw error;
    }

    const admin = isAdminEmail(user.email);
    if (!admin && record.userId !== user.id) {
        const error = new Error("Bạn không có quyền sửa link này.");
        error.status = 403;
        throw error;
    }

    if (record.domain) {
        const target = new URL(destination);
        if (target.hostname.toLowerCase() === record.domain && target.pathname.replace(/\/$/, "") === "/" + slug) {
            const error = new Error("Link đích không thể trỏ ngược về chính link rút gọn.");
            error.status = 400;
            throw error;
        }
    }

    const rate = await rateLimit(
        "short-update-rate:" + user.id + ":" + Math.floor(Date.now() / 3600000),
        MAX_LINK_UPDATES_PER_HOUR,
        3700
    );
    if (!rate.allowed) {
        const error = new Error("Bạn đã sửa link quá nhiều lần. Hãy thử lại sau.");
        error.status = 429;
        throw error;
    }

    const updatedAt = new Date().toISOString();
    await redis(["SET", key, JSON.stringify({
        ...record,
        destination,
        updatedAt
    })]);

    return {
        changed: record.destination !== destination,
        link: {
            slug,
            destination,
            domain: record.domain || null,
            path: record.domain ? "/" + slug : "/go/" + slug,
            shortUrl: record.domain ? "https://" + record.domain + "/" + slug : null,
            createdAt: record.createdAt,
            updatedAt
        }
    };
}

module.exports = async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("X-Content-Type-Options", "nosniff");

    if (!["GET", "PATCH"].includes(req.method)) {
        res.setHeader("Allow", "GET, PATCH");
        json(res, 405, { error: "Method not allowed" });
        return;
    }

    try {
        const user = await getCurrentUser(req);
        if (!user) {
            json(res, 401, { error: "Hãy đăng nhập để xem dashboard.", requiresAuth: true });
            return;
        }

        if (req.method === "PATCH") {
            const data = await updateDestination(req, user);
            json(res, 200, data);
            return;
        }

        const view = String(req.query.view || "links");
        if (view === "links") {
            const page = Math.max(0, Math.min(1000, Number(req.query.page) || 0));
            const data = await loadLinks(user, String(req.query.scope || "mine"), page);
            json(res, 200, { user: publicUser(user), ...data });
            return;
        }

        if (view === "detail") {
            const data = await loadDetail(user, String(req.query.slug || "").toLowerCase());
            json(res, 200, data);
            return;
        }

        json(res, 400, { error: "Chế độ dashboard không hợp lệ." });
    } catch (error) {
        if (error && error.code === "STORAGE_NOT_CONFIGURED") {
            json(res, 503, { error: "Dashboard chưa được kết nối storage." });
            return;
        }
        if (error && error.status) {
            json(res, error.status, { error: error.message });
            return;
        }
        console.error("Dashboard error:", error);
        json(res, 502, { error: "Không thể tải analytics lúc này." });
    }
};
