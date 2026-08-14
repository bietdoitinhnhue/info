const {
    getCurrentUser,
    json,
    parseLinkRecord,
    rateLimit,
    redis,
    redisPipeline,
    requireSameOrigin
} = require("../lib/shortener-store");

const LINK_PREFIX = "short-link:";
const MAX_LINK_LENGTH = 2048;
const MAX_CREATES_PER_HOUR = 30;
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$/;
const DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
});

function normalizeSlug(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\/[^/]+\//, "")
        .replace(/^go\//, "")
        .replace(/^\/+|\/+$/g, "");
}

function parseDestination(value) {
    const raw = String(value || "").trim();
    if (!raw || raw.length > MAX_LINK_LENGTH) return null;
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

function readBody(req) {
    if (!req.body) return {};
    if (typeof req.body === "object") return req.body;
    try {
        return JSON.parse(req.body);
    } catch {
        return {};
    }
}

function cleanMetric(value, fallback, maxLength = 60) {
    const cleaned = String(value || "")
        .replace(/[\u0000-\u001f\u007f]/g, "")
        .trim()
        .slice(0, maxLength);
    return cleaned || fallback;
}

function decodeCity(value) {
    try {
        return decodeURIComponent(String(value || ""));
    } catch {
        return String(value || "");
    }
}

function socialLabel(value) {
    const source = String(value || "").toLowerCase();
    if (/facebook|fb\.com|fbclid/.test(source)) return "Facebook";
    if (/instagram|ig\.me/.test(source)) return "Instagram";
    if (/tiktok/.test(source)) return "TikTok";
    if (/youtube|youtu\.be/.test(source)) return "YouTube";
    if (/zalo/.test(source)) return "Zalo";
    if (/telegram|t\.me/.test(source)) return "Telegram";
    if (/twitter|x\.com/.test(source)) return "X / Twitter";
    if (/linkedin/.test(source)) return "LinkedIn";
    if (/pinterest/.test(source)) return "Pinterest";
    return "";
}

function classifySource(req) {
    const explicit = req.query.utm_source || req.query.source;
    const explicitLabel = socialLabel(explicit);
    if (explicitLabel) return explicitLabel;

    const referrer = String(req.headers.referer || req.headers.referrer || "");
    if (!referrer) return "Direct";
    try {
        const url = new URL(referrer);
        const label = socialLabel(url.hostname);
        if (label) return label;
        if (url.host === String(req.headers.host || "")) return "Internal";
        return "Other";
    } catch {
        return "Other";
    }
}

function classifyDevice(req) {
    const ua = String(req.headers["user-agent"] || "").toLowerCase();
    if (/bot|crawler|spider|preview|facebookexternalhit/.test(ua)) return "Bot";
    if (/ipad|tablet|kindle/.test(ua)) return "Tablet";
    if (/mobile|iphone|android/.test(ua)) return "Mobile";
    return "Desktop";
}

async function recordClick(req, slug) {
    const country = cleanMetric(req.headers["x-vercel-ip-country"], "Unknown", 12).toUpperCase();
    const cityName = cleanMetric(decodeCity(req.headers["x-vercel-ip-city"]), "Unknown");
    const city = cityName === "Unknown" ? cityName : cityName + ", " + country;
    const source = classifySource(req);
    const device = classifyDevice(req);
    const date = DATE_FORMATTER.format(new Date());
    const base = "analytics:" + slug;

    await redisPipeline([
        ["HINCRBY", base, "total", 1],
        ["HSET", base, "lastClick", new Date().toISOString()],
        ["HINCRBY", base + ":daily", date, 1],
        ["HINCRBY", base + ":countries", country, 1],
        ["HINCRBY", base + ":cities", city, 1],
        ["HINCRBY", base + ":sources", source, 1],
        ["HINCRBY", base + ":devices", device, 1]
    ]);
}

async function handleRedirect(req, res) {
    const slug = normalizeSlug(req.query.slug);
    if (!SLUG_PATTERN.test(slug)) {
        json(res, 400, { error: "URL rút gọn không hợp lệ." });
        return;
    }

    const raw = await redis(["GET", LINK_PREFIX + slug]);
    const record = parseLinkRecord(raw);
    if (!record || !record.destination) {
        json(res, 404, { error: "Link này không tồn tại hoặc đã bị xóa." });
        return;
    }

    try {
        await recordClick(req, slug);
    } catch (error) {
        console.error("Analytics error:", error);
    }

    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    res.writeHead(302, { Location: record.destination });
    res.end();
}

async function handleCreate(req, res) {
    if (!requireSameOrigin(req)) {
        json(res, 403, { error: "Yêu cầu không hợp lệ." });
        return;
    }

    const user = await getCurrentUser(req);
    if (!user) {
        json(res, 401, {
            error: "Hãy đăng nhập để tạo và quản lý link.",
            requiresAuth: true
        });
        return;
    }

    const body = readBody(req);
    const slug = normalizeSlug(body.slug);
    const destination = parseDestination(body.destination);

    if (!SLUG_PATTERN.test(slug)) {
        json(res, 400, {
            error: "URL mong muốn cần 2–48 ký tự: chữ thường, số hoặc dấu gạch ngang."
        });
        return;
    }
    if (!destination) {
        json(res, 400, {
            error: "Hãy nhập link đích http/https hợp lệ, tối đa 2.048 ký tự."
        });
        return;
    }

    const rate = await rateLimit(
        "short-create-rate:" + user.id + ":" + Math.floor(Date.now() / 3600000),
        MAX_CREATES_PER_HOUR,
        3700
    );
    if (!rate.allowed) {
        res.setHeader("Retry-After", "3600");
        json(res, 429, { error: "Bạn đã tạo quá nhiều link. Hãy thử lại sau." });
        return;
    }

    const now = new Date();
    const record = {
        slug,
        destination,
        userId: user.id,
        createdAt: now.toISOString()
    };
    const key = LINK_PREFIX + slug;
    const created = await redis(["SET", key, JSON.stringify(record), "NX"]);

    if (created !== "OK") {
        const existing = parseLinkRecord(await redis(["GET", key]));
        if (existing && existing.userId === user.id && existing.destination === destination) {
            json(res, 200, { created: false, path: "/go/" + slug, slug });
            return;
        }
        json(res, 409, { error: "URL mong muốn đã được sử dụng. Hãy chọn tên khác." });
        return;
    }

    await redisPipeline([
        ["ZADD", "user-links:" + user.id, now.getTime(), slug],
        ["ZADD", "all-links", now.getTime(), slug]
    ]);

    json(res, 201, { created: true, path: "/go/" + slug, slug });
}

module.exports = async function handler(req, res) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");

    try {
        if (req.method === "GET") {
            await handleRedirect(req, res);
            return;
        }
        if (req.method === "POST") {
            await handleCreate(req, res);
            return;
        }

        res.setHeader("Allow", "GET, POST");
        json(res, 405, { error: "Method not allowed" });
    } catch (error) {
        if (error && error.code === "STORAGE_NOT_CONFIGURED") {
            json(res, 503, { error: "Công cụ chưa được kết nối storage." });
            return;
        }
        console.error("Shortener error:", error);
        json(res, 502, { error: "Không thể xử lý link lúc này. Hãy thử lại." });
    }
};
