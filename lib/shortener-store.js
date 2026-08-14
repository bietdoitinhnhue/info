const crypto = require("crypto");
const { promisify } = require("util");

const scryptAsync = promisify(crypto.scrypt);
const SESSION_COOKIE = "shortener_session";
const SESSION_SECONDS = 60 * 60 * 24 * 30;

function getRedisConfig() {
    return {
        url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "",
        token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || ""
    };
}

function storageError() {
    const error = new Error("Storage chưa được cấu hình.");
    error.code = "STORAGE_NOT_CONFIGURED";
    return error;
}

async function readPayload(response) {
    let payload;
    try {
        payload = await response.json();
    } catch {
        throw new Error("Storage trả về dữ liệu không hợp lệ.");
    }
    if (!response.ok) throw new Error(payload.error || "Không thể kết nối storage.");
    return payload;
}

async function redis(command) {
    const config = getRedisConfig();
    if (!config.url || !config.token) throw storageError();

    const response = await fetch(config.url.replace(/\/$/, ""), {
        method: "POST",
        headers: {
            authorization: "Bearer " + config.token,
            "content-type": "application/json"
        },
        body: JSON.stringify(command)
    });
    const payload = await readPayload(response);
    if (payload.error) throw new Error(payload.error);
    return payload.result;
}

async function redisPipeline(commands) {
    if (!commands.length) return [];
    const config = getRedisConfig();
    if (!config.url || !config.token) throw storageError();

    const response = await fetch(config.url.replace(/\/$/, "") + "/pipeline", {
        method: "POST",
        headers: {
            authorization: "Bearer " + config.token,
            "content-type": "application/json"
        },
        body: JSON.stringify(commands)
    });
    const payload = await readPayload(response);
    if (!Array.isArray(payload)) throw new Error("Storage pipeline không hợp lệ.");
    return payload.map(item => {
        if (item && item.error) throw new Error(item.error);
        return item ? item.result : null;
    });
}

function json(res, status, payload) {
    res.status(status).json(payload);
}

function parseCookies(req) {
    const raw = String(req.headers.cookie || "");
    const cookies = {};
    for (const part of raw.split(";")) {
        const index = part.indexOf("=");
        if (index < 0) continue;
        const key = part.slice(0, index).trim();
        const value = part.slice(index + 1).trim();
        if (!key) continue;
        try {
            cookies[key] = decodeURIComponent(value);
        } catch {
            cookies[key] = value;
        }
    }
    return cookies;
}

function sessionCookie(token) {
    return SESSION_COOKIE + "=" + encodeURIComponent(token)
        + "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=" + SESSION_SECONDS;
}

function clearSessionCookie() {
    return SESSION_COOKIE + "=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
}

function getSessionToken(req) {
    return parseCookies(req)[SESSION_COOKIE] || "";
}

function publicUser(user) {
    if (!user) return null;
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: isAdminEmail(user.email) ? "admin" : "user",
        createdAt: user.createdAt
    };
}

async function getCurrentUser(req) {
    const token = getSessionToken(req);
    if (!token || token.length > 160) return null;
    const userId = await redis(["GET", "session:" + token]);
    if (!userId) return null;

    const raw = await redis(["GET", "user:" + userId]);
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function isAdminEmail(email) {
    const admins = String(process.env.SHORTENER_ADMIN_EMAILS || "")
        .split(",")
        .map(value => value.trim().toLowerCase())
        .filter(Boolean);
    return admins.includes(String(email || "").trim().toLowerCase());
}

function requireSameOrigin(req) {
    const origin = String(req.headers.origin || "");
    if (!origin) return true;
    try {
        return new URL(origin).host === String(req.headers.host || "");
    } catch {
        return false;
    }
}

function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
}

function validEmail(email) {
    return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
    const derived = await scryptAsync(password, salt, 64);
    return "scrypt:" + salt + ":" + Buffer.from(derived).toString("hex");
}

async function verifyPassword(password, stored) {
    const parts = String(stored || "").split(":");
    if (parts.length !== 3 || parts[0] !== "scrypt") return false;
    const derived = await scryptAsync(password, parts[1], 64);
    const expected = Buffer.from(parts[2], "hex");
    const actual = Buffer.from(derived);
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function randomId(bytes = 18) {
    return crypto.randomBytes(bytes).toString("base64url");
}

function getClientHash(req) {
    const forwarded = String(req.headers["x-forwarded-for"] || "");
    const ip = forwarded.split(",")[0].trim() || String(req.socket?.remoteAddress || "unknown");
    return crypto.createHash("sha256").update(ip).digest("hex").slice(0, 24);
}

async function rateLimit(key, limit, ttlSeconds) {
    const count = Number(await redis(["INCR", key]));
    if (count === 1) await redis(["EXPIRE", key, ttlSeconds]);
    return {
        allowed: Number.isFinite(count) && count <= limit,
        remaining: Math.max(0, limit - count)
    };
}

function parseLinkRecord(raw) {
    if (!raw) return null;
    try {
        const record = JSON.parse(raw);
        if (record && typeof record.destination === "string") return record;
    } catch {
        // Legacy records stored the destination directly.
    }
    return {
        destination: String(raw),
        userId: null,
        createdAt: null,
        legacy: true
    };
}

function hashToObject(value) {
    if (!value) return {};
    if (!Array.isArray(value)) return value;
    const object = {};
    for (let i = 0; i < value.length; i += 2) {
        object[String(value[i])] = value[i + 1];
    }
    return object;
}

module.exports = {
    SESSION_SECONDS,
    clearSessionCookie,
    getClientHash,
    getCurrentUser,
    getSessionToken,
    hashPassword,
    hashToObject,
    isAdminEmail,
    json,
    normalizeEmail,
    parseLinkRecord,
    publicUser,
    randomId,
    rateLimit,
    redis,
    redisPipeline,
    requireSameOrigin,
    sessionCookie,
    validEmail,
    verifyPassword
};
