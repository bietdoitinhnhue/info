(() => {
    "use strict";

    const DEFAULT_AFFILIATE_ID = "17390820072";
    const RESOLVER_ENDPOINT = "/api/resolve-shopee";
    const TRACKING_KEYS = new Set([
        "mmp_pid", "credential_token", "exp_group", "gads_t_sig", "uls_trackid",
        "sp_atk", "xptdk", "is_from_login", "smtt", "utm_source", "utm_medium",
        "utm_campaign", "utm_content", "utm_term", "affiliate_id", "sub_id"
    ]);

    const elements = {
        form: document.getElementById("affiliate-form"),
        productUrl: document.getElementById("product-url"),
        affiliateId: document.getElementById("affiliate-id"),
        message: document.getElementById("form-message"),
        result: document.getElementById("result"),
        resultUrl: document.getElementById("result-url"),
        resultNote: document.getElementById("result-note"),
        copyButton: document.getElementById("copy-button"),
        copyLabel: document.querySelector("#copy-button span"),
        openLink: document.getElementById("open-link"),
        pasteButton: document.getElementById("paste-button"),
        resetButton: document.getElementById("reset-button"),
        currentYear: document.getElementById("current-year")
    };

    function showMessage(message) {
        elements.message.textContent = message;
        elements.message.hidden = false;
    }

    function clearMessage() {
        elements.message.textContent = "";
        elements.message.hidden = true;
    }

    function normalizeAffiliateId(value) {
        return value.trim().replace(/^an_/i, "").replace(/\D/g, "");
    }

    function extractUrl(value) {
        const trimmed = value.trim();
        const match = trimmed.match(/https?:\/\/[^\s<>"']+/i);
        const candidate = match ? match[0] : trimmed;
        return candidate.replace(/[),.;\]}]+$/g, "");
    }

    function isShopeeVietnamHost(hostname) {
        const host = hostname.toLowerCase();
        return host === "shopee.vn" || host.endsWith(".shopee.vn") || host === "shope.ee";
    }

    function getProductIds(pathname) {
        const canonicalMatch = pathname.match(/\/product\/(\d+)\/(\d+)(?:\/|$)/i);
        if (canonicalMatch) return { shopId: canonicalMatch[1], itemId: canonicalMatch[2] };

        const slugMatch = pathname.match(/(?:^|-)i\.(\d+)\.(\d+)(?:\/|$)/i);
        if (slugMatch) return { shopId: slugMatch[1], itemId: slugMatch[2] };

        return null;
    }

    function stripOldTracking(url) {
        Array.from(url.searchParams.keys()).forEach((key) => {
            const lowerKey = key.toLowerCase();
            if (TRACKING_KEYS.has(lowerKey) || lowerKey.startsWith("utm_")) {
                url.searchParams.delete(key);
            }
        });
        url.hash = "";
    }

    function unwrapAnRedir(url) {
        if (url.hostname.toLowerCase() !== "s.shopee.vn" || url.pathname.toLowerCase() !== "/an_redir") {
            return null;
        }

        const originLink = url.searchParams.get("origin_link");
        if (!originLink) throw new Error("Link an_redir không có origin_link hợp lệ.");

        let originUrl;
        try {
            originUrl = new URL(originLink);
        } catch {
            throw new Error("Không đọc được sản phẩm gốc từ link an_redir.");
        }

        if (!isShopeeVietnamHost(originUrl.hostname) || originUrl.hostname.toLowerCase() === "s.shopee.vn") {
            throw new Error("origin_link không phải trang sản phẩm Shopee Việt Nam hợp lệ.");
        }
        return originUrl;
    }

    function isShortShopeeUrl(url) {
        const host = url.hostname.toLowerCase();
        return host === "shope.ee" || (host === "s.shopee.vn" && url.pathname.toLowerCase() !== "/an_redir");
    }

    async function resolveShortUrl(url) {
        const response = await fetch(`${RESOLVER_ENDPOINT}?url=${encodeURIComponent(url.toString())}`, {
            headers: { accept: "application/json" }
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.finalUrl) {
            throw new Error(data.error || "Không thể giải link Shopee rút gọn. Hãy thử lại.");
        }

        let finalUrl;
        try {
            finalUrl = new URL(data.finalUrl);
        } catch {
            throw new Error("Shopee trả về URL đích không hợp lệ.");
        }
        if (!isShopeeVietnamHost(finalUrl.hostname)) {
            throw new Error("Link rút gọn không dẫn đến Shopee Việt Nam.");
        }
        return finalUrl;
    }

    function cleanLandingUrl(sourceUrl) {
        const productIds = getProductIds(sourceUrl.pathname);
        let landingUrl;

        if (productIds) {
            landingUrl = new URL(`https://shopee.vn/product/${productIds.shopId}/${productIds.itemId}`);
        } else {
            landingUrl = new URL(sourceUrl.toString());
            landingUrl.protocol = "https:";
            landingUrl.hostname = "shopee.vn";
            stripOldTracking(landingUrl);
        }

        stripOldTracking(landingUrl);
        return { landingUrl, productIds };
    }

    function createAffiliateRedirect(landingUrl, affiliateId) {
        const redirectUrl = new URL("https://s.shopee.vn/an_redir");
        redirectUrl.searchParams.set("origin_link", landingUrl.toString());
        redirectUrl.searchParams.set("affiliate_id", affiliateId);
        return redirectUrl.toString();
    }

    async function buildAffiliateUrl(rawInput, rawAffiliateId) {
        const affiliateId = normalizeAffiliateId(rawAffiliateId);
        if (!affiliateId) throw new Error("Hãy nhập Affiliate ID của bạn.");
        if (affiliateId.length < 6) throw new Error("Affiliate ID chưa hợp lệ. Hãy kiểm tra lại dãy số.");

        const extracted = extractUrl(rawInput);
        if (!extracted) throw new Error("Hãy dán link Shopee.");

        let sourceUrl;
        try {
            sourceUrl = new URL(extracted);
        } catch {
            throw new Error("Link chưa đúng định dạng. Link cần bắt đầu bằng https://");
        }

        if (!isShopeeVietnamHost(sourceUrl.hostname)) {
            throw new Error("Công cụ hiện chỉ hỗ trợ link Shopee Việt Nam.");
        }

        let sourceType = "full";
        const unwrapped = unwrapAnRedir(sourceUrl);
        if (unwrapped) {
            sourceUrl = unwrapped;
            sourceType = "an_redir";
        } else if (isShortShopeeUrl(sourceUrl)) {
            sourceUrl = await resolveShortUrl(sourceUrl);
            sourceType = "short";

            const nestedOrigin = unwrapAnRedir(sourceUrl);
            if (nestedOrigin) sourceUrl = nestedOrigin;
        }

        const { landingUrl, productIds } = cleanLandingUrl(sourceUrl);
        const outputUrl = createAffiliateRedirect(landingUrl, affiliateId);

        return {
            url: outputUrl,
            landingUrl: landingUrl.toString(),
            affiliateId,
            productIds,
            sourceType
        };
    }

    function showResult(data) {
        elements.form.hidden = true;
        elements.resultUrl.value = data.url;
        elements.openLink.href = data.url;

        const sourceText = data.sourceType === "short"
            ? "Đã giải link rút gọn về trang đích, bỏ tracking Affiliate cũ"
            : data.sourceType === "an_redir"
                ? "Đã lấy origin_link và bỏ Affiliate ID cũ"
                : "Đã làm sạch tracking cũ";
        const productText = data.productIds ? ` sản phẩm ${data.productIds.itemId},` : ",";
        elements.resultNote.textContent = `${sourceText}${productText} sau đó tạo an_redir mới với Affiliate ID ${data.affiliateId}.`;

        elements.copyLabel.textContent = "Sao chép link";
        elements.result.hidden = false;
        elements.copyButton.focus();
    }

    async function writeClipboard(value) {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(value);
            return;
        }
        elements.resultUrl.focus();
        elements.resultUrl.select();
        const copied = document.execCommand("copy");
        window.getSelection()?.removeAllRanges();
        if (!copied) throw new Error("copy-failed");
    }

    elements.form.addEventListener("submit", async (event) => {
        event.preventDefault();
        clearMessage();
        const submitButton = elements.form.querySelector(".primary-button");
        const submitLabel = submitButton.querySelector("span");
        submitButton.disabled = true;
        submitLabel.textContent = "Đang xử lý...";

        try {
            const data = await buildAffiliateUrl(elements.productUrl.value, elements.affiliateId.value);
            elements.affiliateId.value = data.affiliateId;
            showResult(data);
        } catch (error) {
            showMessage(error.message || "Không thể tạo link. Hãy kiểm tra lại thông tin.");
        } finally {
            submitButton.disabled = false;
            submitLabel.textContent = "Tạo link affiliate";
        }
    });

    elements.affiliateId.addEventListener("input", () => {
        const cleanValue = normalizeAffiliateId(elements.affiliateId.value);
        elements.affiliateId.value = cleanValue;
        elements.affiliateId.setSelectionRange(cleanValue.length, cleanValue.length);
        clearMessage();
    });

    elements.productUrl.addEventListener("input", clearMessage);

    elements.pasteButton.addEventListener("click", async () => {
        clearMessage();
        try {
            if (!navigator.clipboard || !window.isSecureContext) throw new Error("clipboard-unavailable");
            const value = await navigator.clipboard.readText();
            if (!value.trim()) return showMessage("Clipboard đang trống.");
            elements.productUrl.value = value.trim();
            elements.productUrl.focus();
        } catch {
            showMessage("Trình duyệt chưa cho phép đọc clipboard. Hãy dán link thủ công vào ô.");
            elements.productUrl.focus();
        }
    });

    elements.copyButton.addEventListener("click", async () => {
        try {
            await writeClipboard(elements.resultUrl.value);
            elements.copyLabel.textContent = "Đã sao chép";
            window.setTimeout(() => { elements.copyLabel.textContent = "Sao chép link"; }, 2200);
        } catch {
            elements.resultUrl.focus();
            elements.resultUrl.select();
        }
    });

    elements.resetButton.addEventListener("click", () => {
        elements.result.hidden = true;
        elements.form.hidden = false;
        elements.productUrl.value = "";
        elements.openLink.href = "#";
        clearMessage();
        elements.productUrl.focus();
    });

    elements.currentYear.textContent = new Date().getFullYear();
    elements.affiliateId.value = DEFAULT_AFFILIATE_ID;
})();
