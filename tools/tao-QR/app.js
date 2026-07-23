/* global QRCodeStyling */

(() => {
    "use strict";

    const defaults = {
        tab: "url",
        dotStyle: "rounded",
        cornerStyle: "extra-rounded",
        qrColor: "#082868",
        cornerColor: "#ff7300",
        backgroundColor: "#ffffff"
    };

    const state = {
        activeTab: defaults.tab,
        qrCode: null,
        qrOptions: null,
        logo: null,
        banks: [],
        selectedBank: null,
        debounceTimer: null,
        bankImageUrl: "",
        ready: false
    };

    const elements = {};

    const byId = (id) => document.getElementById(id);

    function cacheElements() {
        [
            "url-input", "phone-input", "contact-name", "contact-phone", "contact-email",
            "contact-company", "wifi-ssid", "wifi-password", "wifi-encryption", "wifi-hidden",
            "toggle-password", "bank-search", "bank-options", "bank-load-status",
            "bank-account-number", "bank-account-name", "bank-amount", "bank-description",
            "bank-template", "customize-section", "dot-style", "corner-style", "qr-color",
            "corner-color", "background-color", "qr-color-value", "corner-color-value",
            "background-color-value", "transparent-background", "logo-upload", "remove-logo",
            "qr-preview", "preview-stage", "preview-placeholder", "status-message",
            "download-png", "download-svg", "reset-button", "current-year"
        ].forEach((id) => {
            elements[id] = byId(id);
        });
    }

    function setStatus(message, isError = false) {
        elements["status-message"].classList.toggle("is-error", isError);
        elements["status-message"].innerHTML = "";

        const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        icon.setAttribute("viewBox", "0 0 24 24");
        icon.setAttribute("aria-hidden", "true");
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", isError ? "M12 9v4M12 17h.01M10.3 3.8 2.2 18a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3L13.7 3.8a2 2 0 0 0-3.4 0z" : "m5 12 4 4L19 6");
        icon.appendChild(path);
        elements["status-message"].append(icon, document.createTextNode(message));
    }

    function normalizeUrl(value) {
        const trimmed = value.trim();
        if (!trimmed) return "https://drakenguyen.me";
        if (/^[a-z][a-z\d+.-]*:/i.test(trimmed)) return trimmed;
        return `https://${trimmed}`;
    }

    function cleanPhone(value) {
        return value.trim().replace(/[^\d+*#;,]/g, "");
    }

    function escapeWifi(value) {
        return value.replace(/([\\;,":])/g, "\\$1");
    }

    function escapeVCard(value) {
        return value
            .replace(/\\/g, "\\\\")
            .replace(/\n/g, "\\n")
            .replace(/;/g, "\\;")
            .replace(/,/g, "\\,");
    }

    function removeAccents(value) {
        return value
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/đ/g, "d")
            .replace(/Đ/g, "D")
            .toLowerCase();
    }

    function buildData() {
        if (state.activeTab === "url") {
            return normalizeUrl(elements["url-input"].value);
        }

        if (state.activeTab === "phone") {
            return `tel:${cleanPhone(elements["phone-input"].value) || "0968333342"}`;
        }

        if (state.activeTab === "contact") {
            const name = escapeVCard(elements["contact-name"].value.trim());
            const phone = cleanPhone(elements["contact-phone"].value);
            const email = escapeVCard(elements["contact-email"].value.trim());
            const company = escapeVCard(elements["contact-company"].value.trim());
            const lines = ["BEGIN:VCARD", "VERSION:3.0", `FN:${name || "Liên hệ"}`];
            if (phone) lines.push(`TEL;TYPE=CELL:${phone}`);
            if (email) lines.push(`EMAIL:${email}`);
            if (company) lines.push(`ORG:${company}`);
            lines.push("END:VCARD");
            return lines.join("\r\n");
        }

        if (state.activeTab === "wifi") {
            const ssid = escapeWifi(elements["wifi-ssid"].value.trim());
            const encryption = elements["wifi-encryption"].value;
            const password = encryption === "nopass" ? "" : escapeWifi(elements["wifi-password"].value);
            const hidden = elements["wifi-hidden"].checked ? "true" : "false";
            return `WIFI:T:${encryption};S:${ssid};P:${password};H:${hidden};;`;
        }

        return "";
    }

    function getQrOptions(size = 300) {
        const transparent = elements["transparent-background"].checked;
        return {
            width: size,
            height: size,
            type: "svg",
            data: buildData() || " ",
            margin: size > 300 ? 36 : 10,
            image: state.logo || undefined,
            qrOptions: {
                errorCorrectionLevel: state.logo ? "H" : "Q"
            },
            dotsOptions: {
                color: elements["qr-color"].value,
                type: elements["dot-style"].value
            },
            cornersSquareOptions: {
                color: elements["corner-color"].value,
                type: elements["corner-style"].value
            },
            cornersDotOptions: {
                color: elements["corner-color"].value,
                type: "dot"
            },
            backgroundOptions: {
                color: transparent ? "transparent" : elements["background-color"].value
            },
            imageOptions: {
                crossOrigin: "anonymous",
                margin: 7,
                imageSize: 0.36,
                hideBackgroundDots: true
            }
        };
    }

    function showPlaceholder(show) {
        elements["preview-placeholder"].hidden = !show;
        elements["qr-preview"].hidden = show;
    }

    function setDownloadState(enabled, allowSvg = true) {
        elements["download-png"].disabled = !enabled;
        elements["download-svg"].disabled = !enabled || !allowSvg;
        elements["download-svg"].hidden = !allowSvg;
    }

    function updateStandardQr() {
        showPlaceholder(false);
        elements["qr-preview"].innerHTML = "";
        const availableWidth = Math.floor(elements["qr-preview"].clientWidth || 300);
        const previewSize = Math.max(220, Math.min(300, availableWidth));
        state.qrOptions = getQrOptions(previewSize);

        if (!state.qrCode) {
            state.qrCode = new QRCodeStyling(state.qrOptions);
        } else {
            state.qrCode.update(state.qrOptions);
        }

        state.qrCode.append(elements["qr-preview"]);
        state.ready = true;
        setDownloadState(true, true);
        setStatus("QR đã sẵn sàng");
    }

    function buildBankImageUrl() {
        const account = elements["bank-account-number"].value.replace(/\s+/g, "");
        if (!state.selectedBank || !account) return "";

        const template = elements["bank-template"].value;
        const params = new URLSearchParams();
        const accountName = elements["bank-account-name"].value.trim();
        const amount = elements["bank-amount"].value.replace(/\D/g, "");
        const description = elements["bank-description"].value.trim();

        if (accountName) params.set("accountName", accountName);
        if (amount) params.set("amount", amount);
        if (description) params.set("addInfo", description);

        const query = params.toString();
        const base = `https://img.vietqr.io/image/${encodeURIComponent(state.selectedBank.bin)}-${encodeURIComponent(account)}-${encodeURIComponent(template)}.png`;
        return query ? `${base}?${query}` : base;
    }

    function updateBankQr() {
        elements["qr-preview"].innerHTML = "";
        state.bankImageUrl = buildBankImageUrl();
        state.ready = Boolean(state.bankImageUrl);

        if (!state.bankImageUrl) {
            showPlaceholder(true);
            setDownloadState(false, false);
            setStatus("Chọn ngân hàng và nhập số tài khoản", true);
            return;
        }

        showPlaceholder(false);
        const image = new Image();
        image.alt = "Mã VietQR chuyển khoản";
        image.referrerPolicy = "no-referrer";
        image.addEventListener("load", () => {
            setDownloadState(true, false);
            setStatus("VietQR đã sẵn sàng");
        });
        image.addEventListener("error", () => {
            setDownloadState(false, false);
            setStatus("Không tải được VietQR. Hãy kiểm tra kết nối.", true);
        });
        image.src = state.bankImageUrl;
        elements["qr-preview"].appendChild(image);
    }

    function updateQr() {
        if (typeof QRCodeStyling === "undefined") {
            setDownloadState(false, state.activeTab !== "bank");
            setStatus("Không tải được thư viện QR. Hãy tải lại trang.", true);
            return;
        }

        if (state.activeTab === "bank") {
            updateBankQr();
        } else {
            updateStandardQr();
        }
    }

    function scheduleUpdate() {
        window.clearTimeout(state.debounceTimer);
        state.debounceTimer = window.setTimeout(updateQr, 140);
    }

    function switchTab(tabName, focusTab = false) {
        state.activeTab = tabName;

        document.querySelectorAll("[data-tab]").forEach((button) => {
            const isActive = button.dataset.tab === tabName;
            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-selected", String(isActive));
            button.tabIndex = isActive ? 0 : -1;
            if (isActive && focusTab) button.focus();
        });

        document.querySelectorAll("[data-panel]").forEach((panel) => {
            const isActive = panel.dataset.panel === tabName;
            panel.hidden = !isActive;
            panel.classList.toggle("is-active", isActive);
        });

        const isBank = tabName === "bank";
        elements["customize-section"].hidden = isBank;
        setDownloadState(!isBank, !isBank);
        scheduleUpdate();
    }

    function navigateTabs(event) {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();

        const tabs = Array.from(document.querySelectorAll("[data-tab]"));
        const currentIndex = tabs.findIndex((tab) => tab.dataset.tab === state.activeTab);
        let nextIndex = currentIndex;

        if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % tabs.length;
        if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        if (event.key === "Home") nextIndex = 0;
        if (event.key === "End") nextIndex = tabs.length - 1;

        switchTab(tabs[nextIndex].dataset.tab, true);
    }

    function updateColorOutput(inputId, outputId) {
        elements[outputId].value = elements[inputId].value.toUpperCase();
    }

    function formatMoneyInput(event) {
        const digits = event.target.value.replace(/\D/g, "").slice(0, 15);
        event.target.value = digits ? new Intl.NumberFormat("vi-VN").format(Number(digits)) : "";
    }

    function renderBankOptions(query = "") {
        const normalizedQuery = removeAccents(query.trim());
        const matches = state.banks
            .filter((bank) => {
                if (!normalizedQuery) return true;
                return removeAccents(`${bank.shortName} ${bank.name} ${bank.code || ""}`).includes(normalizedQuery);
            })
            .slice(0, 40);

        elements["bank-options"].innerHTML = "";

        if (!matches.length) {
            const empty = document.createElement("div");
            empty.className = "bank-option";
            empty.textContent = "Không tìm thấy ngân hàng";
            elements["bank-options"].appendChild(empty);
        } else {
            matches.forEach((bank) => {
                const button = document.createElement("button");
                button.className = "bank-option";
                button.type = "button";
                button.setAttribute("role", "option");

                const image = new Image();
                image.src = bank.logo;
                image.alt = "";
                image.loading = "lazy";
                image.referrerPolicy = "no-referrer";

                const text = document.createElement("span");
                const name = document.createElement("strong");
                const fullName = document.createElement("small");
                name.textContent = bank.shortName;
                fullName.textContent = bank.name;
                text.append(name, fullName);
                button.append(image, text);

                button.addEventListener("click", () => {
                    state.selectedBank = bank;
                    elements["bank-search"].value = `${bank.shortName} - ${bank.name}`;
                    closeBankOptions();
                    scheduleUpdate();
                });

                elements["bank-options"].appendChild(button);
            });
        }

        elements["bank-options"].hidden = false;
        elements["bank-search"].setAttribute("aria-expanded", "true");
    }

    function closeBankOptions() {
        elements["bank-options"].hidden = true;
        elements["bank-search"].setAttribute("aria-expanded", "false");
    }

    async function loadBanks() {
        try {
            const response = await fetch("https://api.vietqr.io/v2/banks", {
                headers: { Accept: "application/json" }
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const result = await response.json();
            if (!Array.isArray(result.data)) throw new Error("Invalid bank data");
            state.banks = result.data.filter((bank) => bank.bin && bank.shortName);
            elements["bank-load-status"].textContent = `${state.banks.length} ngân hàng sẵn sàng.`;
        } catch (error) {
            console.error("Không tải được danh sách ngân hàng:", error);
            elements["bank-load-status"].textContent = "Không tải được danh sách ngân hàng. Hãy tải lại trang.";
        }
    }

    function handleLogo(event) {
        const file = event.target.files && event.target.files[0];
        if (!file) return;

        if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
            setStatus("Logo phải là PNG, JPG hoặc WebP.", true);
            event.target.value = "";
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            setStatus("Logo không được lớn hơn 2 MB.", true);
            event.target.value = "";
            return;
        }

        const reader = new FileReader();
        reader.addEventListener("load", () => {
            state.logo = reader.result;
            elements["remove-logo"].hidden = false;
            scheduleUpdate();
        });
        reader.readAsDataURL(file);
    }

    function removeLogo() {
        state.logo = null;
        elements["logo-upload"].value = "";
        elements["remove-logo"].hidden = true;
        scheduleUpdate();
    }

    async function downloadBankPng() {
        if (!state.bankImageUrl) {
            setStatus("Hãy điền đủ thông tin chuyển khoản.", true);
            return;
        }

        try {
            const response = await fetch(state.bankImageUrl, { mode: "cors" });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);
            const anchor = document.createElement("a");
            anchor.href = objectUrl;
            anchor.download = "drake-vietqr.png";
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
            setStatus("Đã tải VietQR");
        } catch (error) {
            console.error("Không tải được VietQR:", error);
            window.open(state.bankImageUrl, "_blank", "noopener,noreferrer");
            setStatus("Ảnh đã mở ở tab mới để bạn lưu xuống");
        }
    }

    function downloadStandard(extension) {
        if (!state.ready) {
            setStatus("QR chưa sẵn sàng.", true);
            return;
        }

        const highResolutionQr = new QRCodeStyling(getQrOptions(1024));
        highResolutionQr.download({
            name: "drake-qr",
            extension
        });
        setStatus(`Đang tải file ${extension.toUpperCase()}`);
    }

    function resetTool() {
        elements["dot-style"].value = defaults.dotStyle;
        elements["corner-style"].value = defaults.cornerStyle;
        elements["qr-color"].value = defaults.qrColor;
        elements["corner-color"].value = defaults.cornerColor;
        elements["background-color"].value = defaults.backgroundColor;
        elements["transparent-background"].checked = false;
        elements["background-color"].disabled = false;
        elements["background-color"].closest(".color-field").classList.remove("is-disabled");
        updateColorOutput("qr-color", "qr-color-value");
        updateColorOutput("corner-color", "corner-color-value");
        updateColorOutput("background-color", "background-color-value");
        removeLogo();
        scheduleUpdate();
    }

    function bindEvents() {
        document.querySelectorAll("[data-tab]").forEach((button) => {
            button.addEventListener("click", () => switchTab(button.dataset.tab));
            button.addEventListener("keydown", navigateTabs);
        });

        document.querySelectorAll(".tab-panel input, .tab-panel select, #customize-section select").forEach((field) => {
            if (field.id !== "bank-search" && field.id !== "logo-upload") {
                field.addEventListener("input", scheduleUpdate);
                field.addEventListener("change", scheduleUpdate);
            }
        });

        ["qr-color", "corner-color", "background-color"].forEach((id) => {
            const outputId = `${id}-value`;
            elements[id].addEventListener("input", () => {
                updateColorOutput(id, outputId);
                scheduleUpdate();
            });
        });

        elements["transparent-background"].addEventListener("change", () => {
            const disabled = elements["transparent-background"].checked;
            elements["background-color"].disabled = disabled;
            elements["background-color"].closest(".color-field").classList.toggle("is-disabled", disabled);
            scheduleUpdate();
        });

        elements["toggle-password"].addEventListener("click", () => {
            const isPassword = elements["wifi-password"].type === "password";
            elements["wifi-password"].type = isPassword ? "text" : "password";
            elements["toggle-password"].parentElement.classList.toggle("is-visible", isPassword);
            elements["toggle-password"].setAttribute("aria-label", isPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu");
        });

        elements["wifi-encryption"].addEventListener("change", () => {
            const noPassword = elements["wifi-encryption"].value === "nopass";
            elements["wifi-password"].disabled = noPassword;
            if (noPassword) elements["wifi-password"].value = "";
            scheduleUpdate();
        });

        elements["bank-search"].addEventListener("focus", () => renderBankOptions(elements["bank-search"].value));
        elements["bank-search"].addEventListener("input", () => {
            state.selectedBank = null;
            renderBankOptions(elements["bank-search"].value);
            scheduleUpdate();
        });
        elements["bank-search"].addEventListener("keydown", (event) => {
            if (event.key === "Escape") closeBankOptions();
        });

        document.addEventListener("click", (event) => {
            if (!event.target.closest(".bank-search-wrap")) closeBankOptions();
        });

        elements["bank-amount"].addEventListener("input", formatMoneyInput);
        elements["logo-upload"].addEventListener("change", handleLogo);
        elements["remove-logo"].addEventListener("click", removeLogo);
        elements["reset-button"].addEventListener("click", resetTool);

        elements["download-png"].addEventListener("click", () => {
            if (state.activeTab === "bank") downloadBankPng();
            else downloadStandard("png");
        });
        elements["download-svg"].addEventListener("click", () => downloadStandard("svg"));
        window.addEventListener("resize", scheduleUpdate);
    }

    function initialize() {
        cacheElements();
        elements["current-year"].textContent = String(new Date().getFullYear());
        bindEvents();
        updateColorOutput("qr-color", "qr-color-value");
        updateColorOutput("corner-color", "corner-color-value");
        updateColorOutput("background-color", "background-color-value");
        switchTab(defaults.tab);
        loadBanks();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initialize);
    } else {
        initialize();
    }
})();
