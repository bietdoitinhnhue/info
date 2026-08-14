const {
    SESSION_SECONDS,
    clearSessionCookie,
    getClientHash,
    getCurrentUser,
    getSessionToken,
    hashPassword,
    json,
    normalizeEmail,
    publicUser,
    randomId,
    rateLimit,
    redis,
    requireSameOrigin,
    sessionCookie,
    validEmail,
    verifyPassword
} = require("../lib/shortener-store");

function readBody(req) {
    if (!req.body) return {};
    if (typeof req.body === "object") return req.body;
    try {
        return JSON.parse(req.body);
    } catch {
        return {};
    }
}

function validName(name) {
    return name.length >= 2 && name.length <= 60;
}

function validPassword(password) {
    return password.length >= 8 && password.length <= 128;
}

async function createSession(res, userId) {
    const token = randomId(32);
    await redis(["SET", "session:" + token, userId, "EX", SESSION_SECONDS]);
    res.setHeader("Set-Cookie", sessionCookie(token));
}

async function handleRegister(req, res, body) {
    const name = String(body.name || "").trim().replace(/\s+/g, " ");
    const email = normalizeEmail(body.email);
    const password = String(body.password || "");

    if (!validName(name)) {
        json(res, 400, { error: "Tên cần từ 2 đến 60 ký tự." });
        return;
    }
    if (!validEmail(email)) {
        json(res, 400, { error: "Email không hợp lệ." });
        return;
    }
    if (!validPassword(password)) {
        json(res, 400, { error: "Mật khẩu cần từ 8 đến 128 ký tự." });
        return;
    }

    const rate = await rateLimit(
        "auth-register-rate:" + getClientHash(req) + ":" + Math.floor(Date.now() / 3600000),
        10,
        3700
    );
    if (!rate.allowed) {
        res.setHeader("Retry-After", "3600");
        json(res, 429, { error: "Bạn đã đăng ký quá nhiều lần. Hãy thử lại sau." });
        return;
    }

    const userId = randomId(15);
    const claimed = await redis(["SET", "user-email:" + email, userId, "NX"]);
    if (claimed !== "OK") {
        json(res, 409, { error: "Email này đã được đăng ký." });
        return;
    }

    try {
        const now = new Date().toISOString();
        const user = {
            id: userId,
            name,
            email,
            passwordHash: await hashPassword(password),
            createdAt: now
        };
        await redis(["SET", "user:" + userId, JSON.stringify(user)]);
        await createSession(res, userId);
        json(res, 201, { authenticated: true, user: publicUser(user) });
    } catch (error) {
        await redis(["DEL", "user-email:" + email]).catch(() => {});
        throw error;
    }
}

async function handleLogin(req, res, body) {
    const email = normalizeEmail(body.email);
    const password = String(body.password || "");

    const rate = await rateLimit(
        "auth-login-rate:" + getClientHash(req) + ":" + Math.floor(Date.now() / 3600000),
        20,
        3700
    );
    if (!rate.allowed) {
        res.setHeader("Retry-After", "3600");
        json(res, 429, { error: "Bạn thử đăng nhập quá nhiều lần. Hãy thử lại sau." });
        return;
    }

    const userId = validEmail(email) ? await redis(["GET", "user-email:" + email]) : null;
    const raw = userId ? await redis(["GET", "user:" + userId]) : null;
    let user = null;
    try {
        user = raw ? JSON.parse(raw) : null;
    } catch {
        user = null;
    }

    const valid = user && await verifyPassword(password, user.passwordHash);
    if (!valid) {
        json(res, 401, { error: "Email hoặc mật khẩu chưa đúng." });
        return;
    }

    await createSession(res, user.id);
    json(res, 200, { authenticated: true, user: publicUser(user) });
}

async function handleLogout(req, res) {
    const token = getSessionToken(req);
    if (token) await redis(["DEL", "session:" + token]);
    res.setHeader("Set-Cookie", clearSessionCookie());
    json(res, 200, { authenticated: false });
}

module.exports = async function handler(req, res) {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("X-Content-Type-Options", "nosniff");

    try {
        if (req.method === "GET") {
            const user = await getCurrentUser(req);
            json(res, 200, {
                authenticated: Boolean(user),
                user: publicUser(user)
            });
            return;
        }

        if (req.method !== "POST") {
            res.setHeader("Allow", "GET, POST");
            json(res, 405, { error: "Method not allowed" });
            return;
        }

        if (!requireSameOrigin(req)) {
            json(res, 403, { error: "Yêu cầu không hợp lệ." });
            return;
        }

        const body = readBody(req);
        const action = String(body.action || "");
        if (action === "register") {
            await handleRegister(req, res, body);
            return;
        }
        if (action === "login") {
            await handleLogin(req, res, body);
            return;
        }
        if (action === "logout") {
            await handleLogout(req, res);
            return;
        }

        json(res, 400, { error: "Thao tác không hợp lệ." });
    } catch (error) {
        if (error && error.code === "STORAGE_NOT_CONFIGURED") {
            json(res, 503, { error: "Hệ thống tài khoản chưa được kết nối storage." });
            return;
        }
        console.error("Auth error:", error);
        json(res, 502, { error: "Không thể xử lý tài khoản lúc này." });
    }
};
