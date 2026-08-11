(() => {
    "use strict";

    const DEFAULT_AFFILIATE_ID = "17390820072";
    const TRACKING_KEYS = new Set([
        "mmp_pid",
        "credential_token",
        "exp_group",
        "gads_t_sig",
        "uls_trackid",
        "sp_atk",
        "xptdk",
        "is_from_login",
        "smtt",
        "utm_source",
        "utm_medium",
        "utm_campaign",
        "utm_content",
        "utm_term"
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
        return host === "shopee.vn" || host.endsWith(".shopee.vn");
    }

    function getProductIds(pathname) {
        const canonicalMatch = pathname.match(/\/product\/(\d+)\/(\d+)(?:\/|$)/i);
        if (canonicalMatch) {
            return {
                shopId: canonicalMatch[1],
                itemId: canonicalMatch[2]
            };
        }

        const slugMatch = pathname.match(/(?:^|-)i\.(\d+)\.(\d+)(?:\/|$)/i);
        if (slugMatch) {
            return {
                shopId: slugMatch[1],
                itemId: slugMatch[2]
            };
        }

        return null;
    }

    function stripOldTracking(url) {
        Array.from(url.searchParams.keys()).forEach((key) => {
            if (TRACKING_KEYS.has(key.toLowerCase()) || key.toLowerCase().startsWith("utm_")) {
                url.searchParams.delete(key);
            }
        });
        url.hash = "";
    }

    function buildAffiliateUrl(rawInput, rawAffiliateId) {
        const affiliateId = normalizeAffiliateId(rawAffiliateId);
        if (!affiliateId) {
            throw new Error("Hãy nhập Affiliate ID của bạn.");
        }

        if (affiliateId.length < 6) {
            throw new Error("Affiliate ID chưa hợp lệ. Hãy kiểm tra lại dãy số.");
        }

        const extracted = extractUrl(rawInput);
        if (!extracted) {
            throw new Error("Hãy dán link sản phẩm Shopee.");
        }

        let sourceUrl;
        try {
            sourceUrl = new URL(extracted);
        } catch {
            throw new Error("Link chưa đúng định dạng. Link cần bắt đầu bằng https://");
        }

        if (!isShopeeVietnamHost(sourceUrl.hostname)) {
            throw new Error("Công cụ hiện chỉ hỗ trợ link sản phẩm trên Shopee Việt Nam.");
        }

        if (sourceUrl.hostname.toLowerCase() === "s.shopee.vn") {
            throw new Error("Đây là link Shopee rút gọn. Hãy mở link này rồi sao chép URL sản phẩm đầy đủ trên shopee.vn.");
        }

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

        // Shopee's official third-party affiliate flow:
        // https://s.shopee.vn/an_redir?origin_link=<encoded landing URL>&affiliate_id=<numeric ID>
        // URLSearchParams encodes origin_link automatically.
        const redirectUrl = new URL("https://s.shopee.vn/an_redir");
        redirectUrl.searchParams.set("origin_link", landingUrl.toString());
        redirectUrl.searchParams.set("affiliate_id", affiliateId);

        return {
            url: redirectUrl.toString(),
            landingUrl: landingUrl.toString(),
            affiliateId,
            productIds
        };
    }

    function showResult(data) {
        elements.form.hidden = true;
        elements.resultUrl.value = data.url;
        elements.openLink.href = data.url;
        elements.resultNote.textContent = data.productIds
            ? `Đã chuẩn hóa sản phẩm ${data.productIds.itemId}, xóa tracking cũ và tạo link qua Shopee an_redir với Affiliate ID ${data.affiliateId}.`
            : `Đã xóa tracking cũ và tạo link qua Shopee an_redir với Affiliate ID ${data.affiliateId}.`;
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

    elements.form.addEventListener("submit", (event) => {
        event.preventDefault();
        clearMessage();

        try {
            const data = buildAffiliateUrl(elements.productUrl.value, elements.affiliateId.value);
            elements.affiliateId.value = data.affiliateId;
            showResult(data);
        } catch (error) {
            showMessage(error.message || "Không thể tạo link. Hãy kiểm tra lại thông tin.");
        }
    });

    elements.affiliateId.addEventListener("input", () => {
        const selectionStart = elements.affiliateId.selectionStart;
        const cleanValue = normalizeAffiliateId(elements.affiliateId.value);
        elements.affiliateId.value = cleanValue;
        if (selectionStart !== null) {
            elements.affiliateId.setSelectionRange(cleanValue.length, cleanValue.length);
        }
        clearMessage();
    });

    elements.productUrl.addEventListener("input", clearMessage);

    elements.pasteButton.addEventListener("click", async () => {
        clearMessage();
        try {
            if (!navigator.clipboard || !window.isSecureContext) throw new Error("clipboard-unavailable");
            const value = await navigator.clipboard.readText();
            if (!value.trim()) {
                showMessage("Clipboard đang trống.");
                return;
            }
            elements.productUrl.value = value.trim();
            elements.productUrl.focus();
        } catch {
            showMessage("Trình duyệt chưa cho phép đọc clipboard. Hãy nhấn giữ và dán link vào ô.");
            elements.productUrl.focus();
        }
    });

    elements.copyButton.addEventListener("click", async () => {
        try {
            await writeClipboard(elements.resultUrl.value);
            elements.copyLabel.textContent = "Đã sao chép";
            window.setTimeout(() => {
                elements.copyLabel.textContent = "Sao chép link";
            }, 2200);
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
