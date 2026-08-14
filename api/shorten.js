const crypto = require("crypto");

const LINK_PREFIX = "short-link:";
const RATE_PREFIX = "short-rate:";
const MAX_LINK_LENGTH = 2048;
const MAX_CREATES_PER_HOUR = 30;
const SLUG_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$/;

function getRedisConfig() {
    return {
        url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "",
        token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || ""
    };
}

async function redis(command) {
    const config = getRedisConfig();
    if (!config.url || !config.token) {
        const error = new Error("Storage chưa được cấu hình.");
        error.code = "STORAGE_NOT_CONFIGURED";
        throw error;
    }

    const response = await fetch(config.url.replace(/\/$/, ""), {
        method: "POST",
        headers: {
            authorization: "Bearer " + config.token,
            "content-type": "application/json"
        },
        body: JSON.stringify(command)
    });

    let payload;
    try {
        payload = await response.json();
    } catch {
        throw new Error("Storage trả về dữ liệu không hợp lệ.");
    }

    if (!response.ok || payload.error) {
        throw new Error(payload.error || "Không thể kết nối storage.");
    }

    return payload.result;
}

function json(res, status, payload) {
    res.status(status).json(payload);
}

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

function hasValidCreateKey(req) {
    const expected = process.env.SHORTENER_CREATE_KEY;
    if (!expected) return true;

    const provided = String(req.headers["x-shortener-key"] || "");
    const expectedBuffer = Buffer.from(expected);
    const providedBuffer = Buffer.from(provided);
    return expectedBuffer.length === providedBuffer.length
        && crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

function getClientHash(req) {
    const forwarded = String(req.headers["x-forwarded-for"] || "");
    const ip = forwarded.split(",")[0].trim() || String(req.socket?.remoteAddress || "unknown");
    return crypto.createHash("sha256").update(ip).digest("hex").slice(0, 24);
}

async function enforceRateLimit(req) {
    const windowId = Math.floor(Date.now() / 3600000);
    const key = RATE_PREFIX + getClientHash(req) + ":" + windowId;
    const count = Number(await redis(["INCR", key]));

    if (count === 1) {
        await redis(["EXPIRE", key, 3700]);
    }

    return count <= MAX_CREATES_PER_HOUR;
}

async function handleRedirect(req, res) {
    const slug = normalizeSlug(req.query.slug);
    if (!SLUG_PATTERN.test(slug)) {
        json(res, 400, { error: "URL rút gọn không hợp lệ." });
        return;
    }

    const destination = await redis(["GET", LINK_PREFIX + slug]);
    if (!destination) {
        json(res, 404, { error: "Link này không tồn tại hoặc đã bị xóa." });
        return;
    }

    res.setHeader("Cache-Control", "public, max-age=60, s-maxage=300");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    res.writeHead(302, { Location: destination });
    res.end();
}

async function handleCreate(req, res) {
    if (!hasValidCreateKey(req)) {
        json(res, 401, {
            error: "Mã quản trị chưa đúng.",
            requiresKey: true
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

    if (!(await enforceRateLimit(req))) {
        res.setHeader("Retry-After", "3600");
        json(res, 429, { error: "Bạn đã tạo quá nhiều link. Hãy thử lại sau." });
        return;
    }

    const key = LINK_PREFIX + slug;
    const created = await redis(["SET", key, destination, "NX"]);

    if (created !== "OK") {
        const existing = await redis(["GET", key]);
        if (existing === destination) {
            json(res, 200, { created: false, path: "/go/" + slug, slug });
            return;
        }

        json(res, 409, {
            error: "URL mong muốn đã được sử dụng. Hãy chọn tên khác."
        });
        return;
    }

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
            json(res, 503, {
                error: "Công cụ chưa được kết nối storage. Hãy cấu hình Upstash Redis trên Vercel."
            });
            return;
        }

        console.error("Shortener error:", error);
        json(res, 502, { error: "Không thể xử lý link lúc này. Hãy thử lại." });
    }
};
