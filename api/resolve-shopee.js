const ALLOWED_HOSTS = new Set(["s.shopee.vn", "shope.ee"]);
const MAX_REDIRECTS = 8;
const TIMEOUT_MS = 8000;

function isAllowedShopeeUrl(value) {
    let url;
    try {
        url = new URL(value);
    } catch {
        return false;
    }

    if (url.protocol !== "https:") return false;

    const host = url.hostname.toLowerCase();
    return ALLOWED_HOSTS.has(host) || host === "shopee.vn" || host.endsWith(".shopee.vn");
}

async function fetchOnce(url, method = "GET") {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
        return await fetch(url, {
            method,
            redirect: "manual",
            signal: controller.signal,
            headers: {
                "user-agent": "Mozilla/5.0 (compatible; DrakeShopeeLinkResolver/1.0)",
                accept: "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8"
            }
        });
    } finally {
        clearTimeout(timer);
    }
}

async function resolveShopeeUrl(startUrl) {
    let current = new URL(startUrl);

    for (let i = 0; i < MAX_REDIRECTS; i += 1) {
        if (!isAllowedShopeeUrl(current.toString())) {
            throw new Error("Shopee redirect ra ngoài miền được hỗ trợ.");
        }

        let response = await fetchOnce(current.toString(), "HEAD");
        if (response.status === 405 || response.status === 403 || response.status === 400) {
            response = await fetchOnce(current.toString(), "GET");
        }

        if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get("location");
            if (!location) throw new Error("Shopee trả redirect nhưng không có địa chỉ đích.");

            const next = new URL(location, current);
            if (!isAllowedShopeeUrl(next.toString())) {
                throw new Error("Shopee redirect ra ngoài miền được hỗ trợ.");
            }
            current = next;
            continue;
        }

        if (response.ok) {
            const finalUrl = response.url || current.toString();
            if (!isAllowedShopeeUrl(finalUrl)) {
                throw new Error("URL đích không thuộc Shopee Việt Nam.");
            }
            return finalUrl;
        }

        throw new Error(`Shopee trả về HTTP ${response.status}.`);
    }

    throw new Error("Link chuyển hướng quá nhiều lần.");
}

module.exports = async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "application/json; charset=utf-8");

    if (req.method !== "GET") {
        res.status(405).json({ error: "Method not allowed" });
        return;
    }

    const rawUrl = typeof req.query.url === "string" ? req.query.url.trim() : "";
    if (!rawUrl || !isAllowedShopeeUrl(rawUrl)) {
        res.status(400).json({ error: "Chỉ hỗ trợ link Shopee Việt Nam hợp lệ." });
        return;
    }

    try {
        const finalUrl = await resolveShopeeUrl(rawUrl);
        res.status(200).json({ finalUrl });
    } catch (error) {
        const message = error && error.name === "AbortError"
            ? "Shopee phản hồi quá lâu. Hãy thử lại."
            : (error.message || "Không thể giải link Shopee.");
        res.status(502).json({ error: message });
    }
};
