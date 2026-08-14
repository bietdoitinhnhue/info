const net = require("net");
const {
    getCurrentUser,
    json,
    rateLimit,
    redis,
    redisPipeline,
    requireSameOrigin
} = require("../lib/shortener-store");

const MAX_DOMAIN_CHANGES_PER_HOUR = 8;

function readBody(req) {
    if (!req.body) return {};
    if (typeof req.body === "object") return req.body;
    try {
        return JSON.parse(req.body);
    } catch {
        return {};
    }
}

function normalizeDomain(value) {
    const raw = String(value || "").trim().toLowerCase().replace(/\.$/, "");
    if (!raw || raw.length > 253 || raw.includes("/")) return "";
    try {
        const hostname = new URL("https://" + raw).hostname.toLowerCase().replace(/\.$/, "");
        if (hostname !== raw || net.isIP(hostname) || !hostname.includes(".")) return "";
        const labels = hostname.split(".");
        if (labels.some(label => !label || label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))) return "";
        if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".vercel.app")) return "";
        return hostname;
    } catch {
        return "";
    }
}

function parseRecord(raw) {
    if (!raw) return null;
    try {
        const record = JSON.parse(raw);
        return record && record.domain ? record : null;
    } catch {
        return null;
    }
}

function publicRecord(record) {
    if (!record) return null;
    return {
        domain: record.domain,
        status: record.status === "ready" ? "ready" : "pending",
        dns: record.dns || null,
        verification: Array.isArray(record.verification) ? record.verification : [],
        createdAt: record.createdAt || null,
        updatedAt: record.updatedAt || null
    };
}

function vercelSettings() {
    return {
        token: String(process.env.VERCEL_API_TOKEN || "").trim(),
        projectId: String(process.env.SHORTENER_VERCEL_PROJECT_ID || process.env.VERCEL_PROJECT_ID || "").trim(),
        teamId: String(process.env.SHORTENER_VERCEL_TEAM_ID || process.env.VERCEL_TEAM_ID || process.env.VERCEL_ORG_ID || "").trim()
    };
}

function configurationError() {
    const error = new Error("Custom domain chưa được cấu hình Vercel API.");
    error.code = "VERCEL_NOT_CONFIGURED";
    return error;
}

function vercelUrl(path, settings, extra = {}) {
    const url = new URL("https://api.vercel.com" + path);
    if (settings.teamId) url.searchParams.set("teamId", settings.teamId);
    Object.entries(extra).forEach(([key, value]) => {
        if (value) url.searchParams.set(key, value);
    });
    return url.toString();
}

async function vercelRequest(path, options = {}, extra = {}) {
    const settings = vercelSettings();
    if (!settings.token || !settings.projectId) throw configurationError();
    const response = await fetch(vercelUrl(path, settings, extra), {
        method: options.method || "GET",
        headers: {
            authorization: "Bearer " + settings.token,
            "content-type": "application/json"
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        cache: "no-store"
    });
    let payload = {};
    try {
        payload = await response.json();
    } catch {
        payload = {};
    }
    if (!response.ok) {
        const error = new Error(payload?.error?.message || payload?.message || "Vercel không thể xử lý domain.");
        error.status = response.status;
        error.code = payload?.error?.code || "VERCEL_API_ERROR";
        throw error;
    }
    return payload;
}

function firstIPv4(config) {
    const recommendations = Array.isArray(config.recommendedIPv4) ? config.recommendedIPv4 : [];
    for (const recommendation of recommendations) {
        const values = Array.isArray(recommendation?.value) ? recommendation.value : [recommendation?.value];
        const value = values.find(item => net.isIP(String(item || "")) === 4);
        if (value) return String(value);
    }
    return "76.76.21.21";
}

function firstCname(config) {
    const recommendations = Array.isArray(config.recommendedCNAME) ? config.recommendedCNAME : [];
    for (const recommendation of recommendations) {
        const value = recommendation && typeof recommendation === "object" ? recommendation.value : recommendation;
        if (value) return String(value).replace(/\.$/, "");
    }
    return "cname.vercel-dns.com";
}

function dnsInstructions(domain, projectDomain, config) {
    const apex = String(projectDomain.apexName || "").toLowerCase();
    const isApex = apex && apex === domain;
    const relativeName = apex && domain.endsWith("." + apex)
        ? domain.slice(0, -(apex.length + 1))
        : domain;
    return isApex
        ? { type: "A", name: "@", value: firstIPv4(config) }
        : { type: "CNAME", name: relativeName, value: firstCname(config) };
}

function verificationInstructions(projectDomain) {
    if (!Array.isArray(projectDomain.verification)) return [];
    return projectDomain.verification.slice(0, 3).map(item => ({
        type: String(item.type || "TXT").toUpperCase().slice(0, 10),
        domain: String(item.domain || "").slice(0, 253),
        value: String(item.value || "").slice(0, 512),
        reason: String(item.reason || "").slice(0, 300)
    })).filter(item => item.domain && item.value);
}

async function inspectDomain(record, attemptVerification) {
    const settings = vercelSettings();
    const encodedProject = encodeURIComponent(settings.projectId);
    const encodedDomain = encodeURIComponent(record.domain);
    let projectDomain = await vercelRequest("/v9/projects/" + encodedProject + "/domains/" + encodedDomain);

    if (attemptVerification && projectDomain.verified === false) {
        try {
            projectDomain = await vercelRequest(
                "/v9/projects/" + encodedProject + "/domains/" + encodedDomain + "/verify",
                { method: "POST" }
            );
        } catch (error) {
            if (![400, 409].includes(error.status)) throw error;
        }
    }

    const config = await vercelRequest(
        "/v6/domains/" + encodedDomain + "/config",
        {},
        { projectIdOrName: settings.projectId, strict: "true" }
    );
    const now = new Date().toISOString();
    return {
        ...record,
        status: projectDomain.verified !== false && config.misconfigured === false ? "ready" : "pending",
        dns: dnsInstructions(record.domain, projectDomain, config),
        verification: verificationInstructions(projectDomain),
        updatedAt: now
    };
}

async function loadOwnDomain(user) {
    const domain = await redis(["GET", "user-domain:" + user.id]);
    if (!domain) return null;
    return parseRecord(await redis(["GET", "custom-domain:" + domain]));
}

function isReservedDomain(req, domain) {
    const requestHost = String(req.headers.host || "").toLowerCase().split(":")[0];
    const publicDomains = String(process.env.SHORTENER_PRIMARY_DOMAINS || "")
        .split(",")
        .map(item => normalizeDomain(item))
        .filter(Boolean);
    return domain === requestHost || publicDomains.includes(domain);
}

async function addDomain(req, res, user, body) {
    const domain = normalizeDomain(body.domain);
    if (!domain) {
        json(res, 400, { error: "Hãy nhập domain hợp lệ, ví dụ go.tenmien.com." });
        return;
    }
    if (isReservedDomain(req, domain)) {
        json(res, 400, { error: "Domain chính của hệ thống không thể gán cho tài khoản." });
        return;
    }

    const rate = await rateLimit(
        "domain-rate:" + user.id + ":" + Math.floor(Date.now() / 3600000),
        MAX_DOMAIN_CHANGES_PER_HOUR,
        3700
    );
    if (!rate.allowed) {
        json(res, 429, { error: "Bạn thao tác domain quá nhiều. Hãy thử lại sau." });
        return;
    }

    const lockKey = "domain-lock:" + user.id;
    const locked = await redis(["SET", lockKey, domain, "NX", "EX", 120]);
    if (locked !== "OK") {
        json(res, 409, { error: "Domain của tài khoản đang được xử lý." });
        return;
    }

    let claimed = false;
    let addedToProject = false;
    try {
        if (await redis(["GET", "user-domain:" + user.id])) {
            json(res, 409, { error: "Mỗi tài khoản được kết nối tối đa 1 custom domain." });
            return;
        }
        claimed = await redis(["SET", "custom-domain-owner:" + domain, user.id, "NX"]) === "OK";
        if (!claimed) {
            json(res, 409, { error: "Domain này đã được một tài khoản khác sử dụng." });
            return;
        }

        const settings = vercelSettings();
        if (!settings.token || !settings.projectId) throw configurationError();
        const projectDomain = await vercelRequest(
            "/v10/projects/" + encodeURIComponent(settings.projectId) + "/domains",
            { method: "POST", body: { name: domain } }
        );
        addedToProject = true;
        const createdAt = new Date().toISOString();
        let record = {
            domain,
            userId: user.id,
            status: "pending",
            dns: null,
            verification: verificationInstructions(projectDomain),
            createdAt,
            updatedAt: createdAt
        };
        record = await inspectDomain(record, false);

        await redisPipeline([
            ["SET", "custom-domain:" + domain, JSON.stringify(record)],
            ["SET", "user-domain:" + user.id, domain],
            ["ZADD", "all-domains", Date.now(), domain]
        ]);
        json(res, 201, { domain: publicRecord(record) });
    } catch (error) {
        if (addedToProject) {
            const settings = vercelSettings();
            try {
                await vercelRequest(
                    "/v9/projects/" + encodeURIComponent(settings.projectId) + "/domains/" + encodeURIComponent(domain),
                    { method: "DELETE" }
                );
            } catch {
                // Keep the original error; an orphan domain can be removed in Vercel Settings.
            }
        }
        if (claimed) await redis(["DEL", "custom-domain-owner:" + domain]);
        throw error;
    } finally {
        await redis(["DEL", lockKey]);
    }
}

async function checkDomain(res, user) {
    const record = await loadOwnDomain(user);
    if (!record) {
        json(res, 404, { error: "Tài khoản chưa kết nối custom domain." });
        return;
    }
    const updated = await inspectDomain(record, true);
    await redis(["SET", "custom-domain:" + updated.domain, JSON.stringify(updated)]);
    json(res, 200, { domain: publicRecord(updated) });
}

async function removeDomain(res, user) {
    const record = await loadOwnDomain(user);
    if (!record) {
        json(res, 404, { error: "Tài khoản chưa kết nối custom domain." });
        return;
    }
    const settings = vercelSettings();
    await vercelRequest(
        "/v9/projects/" + encodeURIComponent(settings.projectId) + "/domains/" + encodeURIComponent(record.domain),
        { method: "DELETE" }
    );
    await redisPipeline([
        ["DEL", "custom-domain:" + record.domain],
        ["DEL", "custom-domain-owner:" + record.domain],
        ["DEL", "user-domain:" + user.id],
        ["ZREM", "all-domains", record.domain]
    ]);
    json(res, 200, { removed: true });
}

module.exports = async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("X-Content-Type-Options", "nosniff");

    try {
        const user = await getCurrentUser(req);
        if (!user) {
            json(res, 401, { error: "Hãy đăng nhập để quản lý custom domain.", requiresAuth: true });
            return;
        }

        if (req.method === "GET") {
            json(res, 200, { domain: publicRecord(await loadOwnDomain(user)), limit: 1 });
            return;
        }
        if (!["POST", "DELETE"].includes(req.method)) {
            res.setHeader("Allow", "GET, POST, DELETE");
            json(res, 405, { error: "Method not allowed" });
            return;
        }
        if (!requireSameOrigin(req)) {
            json(res, 403, { error: "Yêu cầu không hợp lệ." });
            return;
        }

        if (req.method === "DELETE") {
            await removeDomain(res, user);
            return;
        }
        const body = readBody(req);
        if (body.action === "add") {
            await addDomain(req, res, user, body);
            return;
        }
        if (body.action === "check") {
            await checkDomain(res, user);
            return;
        }
        json(res, 400, { error: "Thao tác domain không hợp lệ." });
    } catch (error) {
        if (error && error.code === "STORAGE_NOT_CONFIGURED") {
            json(res, 503, { error: "Custom domain chưa được kết nối storage." });
            return;
        }
        if (error && error.code === "VERCEL_NOT_CONFIGURED") {
            json(res, 503, { error: error.message });
            return;
        }
        if (error && error.status && error.status < 500) {
            json(res, error.status, { error: error.message });
            return;
        }
        console.error("Custom domain error:", error);
        json(res, 502, { error: "Không thể xử lý custom domain lúc này." });
    }
};
