type D1Result<T = Record<string, unknown>> = { results?: T[]; success?: boolean; meta?: { changes?: number } };
type D1Statement = {
  bind: (...values: unknown[]) => D1Statement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<{ success?: boolean; meta?: { changes?: number }; error?: string }>;
};
type D1Database = { prepare(sql: string): D1Statement };
export type SmsBindingEnv = {
  DB: D1Database;
  AUTH_JWT_SECRET?: string;
  SMS_IR_API_KEY?: string;
  SMS_IR_TEMPLATE_ID?: string;
  SMS_IR_TEMPLATE_PARAM?: string;
  SMS_IR_SENDER?: string;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const ACCESS_TTL_SECONDS = 60 * 60;
const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60;
const OTP_TTL_SECONDS = 5 * 60;
const OTP_RESEND_SECONDS = 60;
const OTP_MAX_ATTEMPTS = 5;

function jsonResponse(body: unknown, status = 200, request?: Request): Response {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  if (request) {
    const origin = request.headers.get("origin");
    const url = new URL(request.url);
    const allowed = origin && new URL(origin).host === url.host ? origin : url.origin;
    headers.set("access-control-allow-origin", allowed);
    headers.set("access-control-allow-headers", "authorization, apikey, content-type, x-client-info, prefer, accept");
    headers.set("access-control-allow-methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD");
    headers.set("access-control-allow-credentials", "true");
    headers.set("vary", "Origin");
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function fromBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
function randomHex(bytes = 24): string {
  const value = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(value, (b) => b.toString(16).padStart(2, "0")).join("");
}
async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
async function signJwt(payload: Record<string, unknown>, secret: string): Promise<string> {
  const head = base64Url(encoder.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const body = base64Url(encoder.encode(JSON.stringify(payload)));
  const data = encoder.encode(head + "." + body);
  const signature = await crypto.subtle.sign("HMAC", await hmacKey(secret), data);
  return head + "." + body + "." + base64Url(new Uint8Array(signature));
}
async function verifyJwt(token: string, secret: string): Promise<Record<string, unknown> | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const valid = await crypto.subtle.verify("HMAC", await hmacKey(secret), fromBase64Url(parts[2]), encoder.encode(parts[0] + "." + parts[1]));
    if (!valid) return null;
    const payload = JSON.parse(decoder.decode(fromBase64Url(parts[1]))) as Record<string, unknown>;
    if (typeof payload.exp !== "number" || payload.exp <= Math.floor(Date.now() / 1000)) return null;
    if (typeof payload.sub !== "string" || typeof payload.sid !== "string") return null;
    return payload;
  } catch {
    return null;
  }
}

function normalizePhone(value: unknown): string {
  const digits = String(value ?? "").replace(/[^0-9]/g, "");
  if (digits.startsWith("0098")) return "+98" + digits.slice(4);
  if (digits.startsWith("98")) return "+" + digits;
  if (digits.startsWith("0")) return "+98" + digits.slice(1);
  if (digits.length === 10 && digits.startsWith("9")) return "+98" + digits;
  return digits ? "+" + digits : "";
}
function smsMobile(value: string): string {
  if (value.startsWith("+98")) return "0" + value.slice(3);
  if (value.startsWith("98")) return "0" + value.slice(2);
  return value;
}
function normalizeUsername(value: unknown): string {
  return String(value ?? "").normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
}
function strongPassword(value: string): boolean {
  return value.length >= 10 && /\p{L}/u.test(value) && /\p{N}/u.test(value);
}

async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: 160000, hash: "SHA-256" }, key, 256);
  return "pbkdf2$160000$" + base64Url(salt) + "$" + base64Url(new Uint8Array(bits));
}
async function verifyPassword(password: string, stored: string | null): Promise<boolean> {
  if (!stored) return false;
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations < 100000 || iterations > 500000) return false;
  try {
    const salt = fromBase64Url(parts[2]);
    const expected = fromBase64Url(parts[3]);
    const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
    const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, key, 256));
    if (bits.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < bits.length; i++) diff |= bits[i] ^ expected[i];
    return diff === 0;
  } catch {
    return false;
  }
}

async function sendSmsOtp(env: SmsBindingEnv, phone: string, code: string): Promise<void> {
  if (!env.SMS_IR_API_KEY || !env.SMS_IR_TEMPLATE_ID) throw new Error("SMS_IR_NOT_CONFIGURED");
  const response = await fetch("https://api.sms.ir/v1/send/verify", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": env.SMS_IR_API_KEY,
      "accept": "application/json",
    },
    body: JSON.stringify({
      mobile: smsMobile(phone),
      templateId: Number(env.SMS_IR_TEMPLATE_ID),
      parameters: [{ name: env.SMS_IR_TEMPLATE_PARAM || "OTP", value: code }],
    }),
  });
  const payload = await response.json().catch(() => ({})) as { status?: number; message?: string; data?: unknown };
  if (!response.ok || (typeof payload.status === "number" && payload.status !== 1)) {
    throw new Error("SMS_IR_SEND_FAILED");
  }
}

async function createSession(env: SmsBindingEnv, user: Record<string, unknown>, existingSessionId?: string) {
  if (!env.AUTH_JWT_SECRET) throw new Error("AUTH_JWT_SECRET_NOT_CONFIGURED");
  const now = Math.floor(Date.now() / 1000);
  const sessionId = existingSessionId || randomHex(16);
  const refreshToken = randomHex(32);
  const refreshHash = await sha256(refreshToken);
  const expiresAt = now + REFRESH_TTL_SECONDS;
  if (existingSessionId) {
    await env.DB.prepare("UPDATE auth_sessions SET token_hash = ?, expires_at = ?, last_seen_at = ? WHERE id = ?")
      .bind(refreshHash, expiresAt, new Date().toISOString(), sessionId).run();
  } else {
    await env.DB.prepare("INSERT INTO auth_sessions (id, user_id, token_hash, expires_at, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(sessionId, user.id, refreshHash, expiresAt, new Date().toISOString(), new Date().toISOString()).run();
  }
  const accessExpiresAt = now + ACCESS_TTL_SECONDS;
  const accessToken = await signJwt({
    aud: "authenticated",
    role: "authenticated",
    sub: user.id,
    sid: sessionId,
    iat: now,
    exp: accessExpiresAt,
    iss: "https://terrabar.ir/auth/v1",
  }, env.AUTH_JWT_SECRET);
  const publicUser = toAuthUser(user);
  return {
    access_token: accessToken,
    token_type: "bearer",
    expires_in: ACCESS_TTL_SECONDS,
    expires_at: accessExpiresAt,
    refresh_token: refreshToken,
    user: publicUser,
  };
}
function toAuthUser(row: Record<string, unknown>) {
  return {
    id: row.id,
    aud: "authenticated",
    role: "authenticated",
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    email_confirmed_at: row.email_confirmed_at ?? undefined,
    phone_confirmed_at: row.phone_confirmed_at ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
    app_metadata: row.app_metadata ? JSON.parse(String(row.app_metadata)) : { provider: "phone", providers: ["phone"] },
    user_metadata: row.user_metadata ? JSON.parse(String(row.user_metadata)) : {},
  };
}

export async function getCloudflareAuthContext(request: Request, env: SmsBindingEnv) {
  const secret = env.AUTH_JWT_SECRET;
  if (!secret) return null;
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) return null;
  const payload = await verifyJwt(header.slice(7), secret);
  if (!payload) return null;
  const session = await env.DB.prepare("SELECT id, user_id, expires_at FROM auth_sessions WHERE id = ? AND user_id = ?")
    .bind(payload.sid, payload.sub).first<Record<string, unknown>>();
  if (!session || Number(session.expires_at) <= Math.floor(Date.now() / 1000)) return null;
  const user = await env.DB.prepare("SELECT * FROM auth_users WHERE id = ? AND disabled_at IS NULL")
    .bind(payload.sub).first<Record<string, unknown>>();
  return user ? { user, sessionId: String(session.id), payload } : null;
}

async function sendOtp(request: Request, env: SmsBindingEnv): Promise<Response> {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return jsonResponse({ msg: "Invalid request body" }, 400, request);
  const rawPhone = body.phone;
  const rawEmail = body.email;
  const channel = rawPhone ? "sms" : "email";
  const identifier = channel === "sms" ? normalizePhone(rawPhone) : String(rawEmail ?? "").trim().toLowerCase();
  if (channel === "sms" && !/^\+98\d{10}$/.test(identifier)) return jsonResponse({ msg: "شماره موبایل معتبر نیست." }, 400, request);
  if (channel === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)) return jsonResponse({ msg: "ایمیل معتبر نیست." }, 400, request);

  const existing = await env.DB.prepare(channel === "sms" ? "SELECT * FROM auth_users WHERE phone = ? LIMIT 1" : "SELECT * FROM auth_users WHERE lower(email) = ? LIMIT 1")
    .bind(identifier).first<Record<string, unknown>>();
  const createUser = body.create_user === true || body.create_user === "true";
  if (!existing && !createUser) return jsonResponse({ msg: "حساب کاربری پیدا نشد." }, 400, request);
  if (existing && existing.disabled_at) return jsonResponse({ msg: "این حساب غیرفعال است." }, 403, request);

  const recent = await env.DB.prepare("SELECT created_at FROM otp_challenges WHERE identifier = ? AND channel = ? AND julianday(created_at) >= julianday('now', ?) ORDER BY created_at DESC LIMIT 1")
    .bind(identifier, channel, "-" + OTP_RESEND_SECONDS + " seconds").first<Record<string, unknown>>();
  if (recent) return jsonResponse({ msg: "برای دریافت کد جدید کمی صبر کنید." }, 429, request);

  const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0");
  const codeHash = await sha256(String(env.AUTH_JWT_SECRET || "terrabar") + ":" + identifier + ":" + code);
  const now = Math.floor(Date.now() / 1000);
  const id = randomHex(16);
  await env.DB.prepare("INSERT INTO otp_challenges (id, phone, identifier, channel, code_hash, expires_at, attempts, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, ?)")
    .bind(id, channel === "sms" ? identifier : "", identifier, channel, codeHash, now + OTP_TTL_SECONDS, new Date().toISOString()).run();

  if (channel === "sms") {
    try {
      await sendSmsOtp(env, identifier, code);
    } catch (error) {
      await env.DB.prepare("DELETE FROM otp_challenges WHERE id = ?").bind(id).run();
      const message = error instanceof Error && error.message === "SMS_IR_NOT_CONFIGURED"
        ? "اتصال امن SMS.ir در Cloudflare هنوز تنظیم نشده است."
        : "ارسال پیامک از طریق SMS.ir انجام نشد.";
      return jsonResponse({ msg: message }, 503, request);
    }
  } else {
    await env.DB.prepare("DELETE FROM otp_challenges WHERE id = ?").bind(id).run();
    return jsonResponse({ msg: "ارسال کد ایمیل تا زمان اتصال سرویس ایمیل Cloudflare فعال نیست." }, 503, request);
  }
  return jsonResponse({ message_id: id }, 200, request);
}

async function verifyOtp(request: Request, env: SmsBindingEnv): Promise<Response> {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return jsonResponse({ msg: "Invalid request body" }, 400, request);
  const channel = body.phone ? "sms" : "email";
  const identifier = channel === "sms" ? normalizePhone(body.phone) : String(body.email ?? "").trim().toLowerCase();
  const code = String(body.token ?? "").trim();
  if (!identifier || !/^\d{6}$/.test(code)) return jsonResponse({ msg: "کد تأیید معتبر نیست." }, 400, request);

  const challenge = await env.DB.prepare("SELECT * FROM otp_challenges WHERE identifier = ? AND channel = ? AND consumed_at IS NULL ORDER BY created_at DESC LIMIT 1")
    .bind(identifier, channel).first<Record<string, unknown>>();
  if (!challenge || Number(challenge.expires_at) <= Math.floor(Date.now() / 1000) || Number(challenge.attempts) >= OTP_MAX_ATTEMPTS) {
    return jsonResponse({ msg: "کد تأیید منقضی شده یا معتبر نیست." }, 400, request);
  }
  const candidate = await sha256(String(env.AUTH_JWT_SECRET || "terrabar") + ":" + identifier + ":" + code);
  if (candidate !== challenge.code_hash) {
    await env.DB.prepare("UPDATE otp_challenges SET attempts = attempts + 1 WHERE id = ? AND consumed_at IS NULL AND attempts < ?")
      .bind(challenge.id, OTP_MAX_ATTEMPTS).run();
    return jsonResponse({ msg: "کد تأیید معتبر نیست." }, 400, request);
  }

  // Atomically consume the challenge before creating a user/session.
  // Concurrent verification requests can no longer reuse the same OTP.
  const consumed = await env.DB.prepare(
    "UPDATE otp_challenges SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL AND expires_at > ? AND attempts < ?"
  ).bind(new Date().toISOString(), challenge.id, Math.floor(Date.now() / 1000), OTP_MAX_ATTEMPTS).run();
  if (!consumed.meta?.changes) {
    return jsonResponse({ msg: "کد تأیید قبلاً استفاده شده یا منقضی شده است." }, 409, request);
  }

  let user = await env.DB.prepare(channel === "sms" ? "SELECT * FROM auth_users WHERE phone = ? LIMIT 1" : "SELECT * FROM auth_users WHERE lower(email) = ? LIMIT 1")
    .bind(identifier).first<Record<string, unknown>>();
  if (!user) {
    const id = randomHex(16);
    const now = new Date().toISOString();
    if (channel === "sms") {
      await env.DB.prepare("INSERT INTO auth_users (id, phone, phone_confirmed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
        .bind(id, identifier, now, now, now).run();
    } else {
      await env.DB.prepare("INSERT INTO auth_users (id, email, email_confirmed_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?)")
        .bind(id, identifier, now, now, now).run();
    }
    user = await env.DB.prepare("SELECT * FROM auth_users WHERE id = ?").bind(id).first<Record<string, unknown>>();
  } else {
    const field = channel === "sms" ? "phone_confirmed_at" : "email_confirmed_at";
    await env.DB.prepare("UPDATE auth_users SET " + field + " = ?, updated_at = ? WHERE id = ?")
      .bind(new Date().toISOString(), new Date().toISOString(), user.id).run();
    user[field] = new Date().toISOString();
  }
  if (!user) return jsonResponse({ msg: "ساخت نشست کاربری انجام نشد." }, 500, request);
  await env.DB.prepare("UPDATE auth_users SET last_sign_in_at = ?, updated_at = ? WHERE id = ?")
    .bind(new Date().toISOString(), new Date().toISOString(), user.id).run();
  const session = await createSession(env, user);
  return jsonResponse(session, 200, request);
}

async function refreshSession(request: Request, env: SmsBindingEnv): Promise<Response> {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const token = String(body?.refresh_token ?? "");
  if (!token) return jsonResponse({ msg: "Refresh token is required" }, 400, request);
  const hash = await sha256(token);
  const session = await env.DB.prepare("SELECT id, user_id, expires_at FROM auth_sessions WHERE token_hash = ? LIMIT 1")
    .bind(hash).first<Record<string, unknown>>();
  if (!session || Number(session.expires_at) <= Math.floor(Date.now() / 1000)) return jsonResponse({ msg: "Invalid refresh token" }, 401, request);
  const user = await env.DB.prepare("SELECT * FROM auth_users WHERE id = ? AND disabled_at IS NULL")
    .bind(session.user_id).first<Record<string, unknown>>();
  if (!user) return jsonResponse({ msg: "User not found" }, 401, request);
  return jsonResponse(await createSession(env, user, String(session.id)), 200, request);
}

async function handleAuthRequest(request: Request, env: SmsBindingEnv): Promise<Response> {
  const path = new URL(request.url).pathname.replace(/^\/auth\/v1/, "");
  if (request.method === "OPTIONS") return jsonResponse({}, 200, request);
  if (path === "/otp" && request.method === "POST") return sendOtp(request, env);
  if (path === "/verify" && request.method === "POST") return verifyOtp(request, env);
  if (path === "/token" && request.method === "POST") return refreshSession(request, env);
  if (path === "/user" && request.method === "GET") {
    const auth = await getCloudflareAuthContext(request, env);
    if (!auth) return jsonResponse({ message: "Invalid JWT" }, 401, request);
    return jsonResponse(toAuthUser(auth.user), 200, request);
  }
  if (path === "/logout" && request.method === "POST") {
    const auth = await getBearerUser(request, env);
    if (auth) await env.DB.prepare("DELETE FROM auth_sessions WHERE id = ?").bind(auth.sessionId).run();
    return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
  }
  if (path === "/user" && request.method === "PUT") {
    const auth = await getBearerUser(request, env);
    if (!auth) return jsonResponse({ message: "Invalid JWT" }, 401, request);
    const body = await request.json().catch(() => ({})) as Record<string, unknown>;
    const password = String(body.password ?? "");
    if (!strongPassword(password)) return jsonResponse({ message: "رمز عبور باید حداقل ۱۰ نویسه و شامل حرف و عدد باشد." }, 400, request);
    const passwordHash = await hashPassword(password);
    await env.DB.prepare("UPDATE auth_users SET password_hash = ?, updated_at = ? WHERE id = ?")
      .bind(passwordHash, new Date().toISOString(), auth.user.id).run();
    const updated = await env.DB.prepare("SELECT * FROM auth_users WHERE id = ?").bind(auth.user.id).first<Record<string, unknown>>();
    return jsonResponse(toAuthUser(updated || auth.user), 200, request);
  }
  if (path === "/recover" && request.method === "POST") {
    return jsonResponse({ msg: "بازیابی ایمیل تا زمان راه‌اندازی سرویس ایمیل Cloudflare فعال نیست." }, 503, request);
  }
  if (path === "/settings" && request.method === "GET") {
    return jsonResponse({ disable_signup: false, sms_provider: "sms.ir" }, 200, request);
  }
  return jsonResponse({ msg: "Auth endpoint not found" }, 404, request);
}

async function handleAdminLogin(request: Request, env: SmsBindingEnv): Promise<Response> {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return jsonResponse({ error: "اطلاعات ارسالی معتبر نیست." }, 400, request);
  const action = String(body.action ?? "login");
  const username = normalizeUsername(body.username);
  if (!username || username.length > 160) return jsonResponse({ error: "نام کاربری را وارد کنید." }, 400, request);

  if (action === "emergency_reset") {
    const code = String(body.code ?? "").trim();
    const password = String(body.password ?? "");
    if (!/^\d{12}$/.test(code) || !/^\d{10}$/.test(password)) return jsonResponse({ ok: false, error: "کد اضطراری یا رمز جدید معتبر نیست." }, 400, request);
    const admin = await env.DB.prepare("SELECT au.auth_user_id, au.admin_role FROM admin_users au WHERE lower(au.login_username) = ? AND au.is_active = 1 LIMIT 1")
      .bind(username).first<Record<string, unknown>>();
    if (!admin || admin.admin_role !== "main_admin") return jsonResponse({ ok: false, error: "حساب مدیر کل پیدا نشد." }, 404, request);
    const hash = await sha256(code);
    const recovery = await env.DB.prepare("SELECT id FROM admin_recovery_codes WHERE auth_user_id = ? AND code_hash = ? AND used_at IS NULL AND expires_at > ? LIMIT 1")
      .bind(admin.auth_user_id, hash, new Date().toISOString()).first<Record<string, unknown>>();
    if (!recovery) return jsonResponse({ ok: false, error: "کد اضطراری اشتباه، مصرف‌شده یا منقضی شده است." }, 400, request);
    const consumed = await env.DB.prepare("UPDATE admin_recovery_codes SET used_at = ? WHERE id = ? AND used_at IS NULL")
      .bind(new Date().toISOString(), recovery.id).run();
    if (!consumed.meta?.changes) return jsonResponse({ ok: false, error: "این کد قبلاً استفاده شده است." }, 409, request);
    const passwordHash = await hashPassword(password);
    await env.DB.prepare("UPDATE auth_users SET password_hash = ?, updated_at = ? WHERE id = ?")
      .bind(passwordHash, new Date().toISOString(), admin.auth_user_id).run();
    return jsonResponse({ ok: true, message: "رمز مدیر کل تغییر کرد. کد اضطراری دیگر قابل استفاده نیست." }, 200, request);
  }

  if (action === "reset" || action === "verify_reset") {
    return jsonResponse({ ok: false, error: "بازیابی ایمیل مدیر هنوز به سرویس ایمیل Cloudflare متصل نشده است." }, 503, request);
  }

  if (action !== "login") return jsonResponse({ error: "عملیات نامعتبر است." }, 400, request);
  const admin = await env.DB.prepare("SELECT auth_user_id, admin_role FROM admin_users WHERE lower(login_username) = ? AND is_active = 1 LIMIT 1")
    .bind(username).first<Record<string, unknown>>();
  const password = String(body.password ?? "");
  const user = admin?.auth_user_id
    ? await env.DB.prepare("SELECT * FROM auth_users WHERE id = ? AND disabled_at IS NULL").bind(admin.auth_user_id).first<Record<string, unknown>>()
    : null;
  const valid = Boolean(admin && user && ["main_admin", "city_manager"].includes(String(admin.admin_role)) && await verifyPassword(password, String(user.password_hash ?? "")));
  if (!valid || !user) return jsonResponse({ error: "نام کاربری یا رمز عبور صحیح نیست." }, 401, request);
  const session = await createSession(env, user);
  return jsonResponse({ session: { access_token: session.access_token, refresh_token: session.refresh_token }, role: admin.admin_role }, 200, request);
}

async function handleCityManager(request: Request, env: SmsBindingEnv): Promise<Response> {
  const auth = await getBearerUser(request, env);
  if (!auth) return jsonResponse({ error: "نشست مدیر معتبر نیست." }, 401, request);
  const caller = await env.DB.prepare("SELECT id, admin_role FROM admin_users WHERE auth_user_id = ? AND is_active = 1 LIMIT 1")
    .bind(auth.user.id).first<Record<string, unknown>>();
  if (!caller || caller.admin_role !== "main_admin") return jsonResponse({ error: "فقط مدیر کل اجازه مدیریت مدیران شهر را دارد." }, 403, request);
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return jsonResponse({ error: "اطلاعات ارسالی معتبر نیست." }, 400, request);
  const action = String(body.action ?? "");
  if (action === "list") {
    const [members, managers, cities] = await Promise.all([
      env.DB.prepare("SELECT DISTINCT u.id AS auth_user_id, m.full_name, m.city, mr.role_code AS role FROM member_roles mr JOIN members m ON m.id = mr.member_id JOIN auth_users u ON u.id = m.auth_user_id WHERE mr.approval_status = 'approved' ORDER BY m.full_name LIMIT 2000").all<Record<string, unknown>>(),
      env.DB.prepare("SELECT id, auth_user_id, display_name, login_username, city, is_active FROM admin_users WHERE admin_role = 'city_manager' ORDER BY created_at").all<Record<string, unknown>>(),
      env.DB.prepare("SELECT city_name FROM cities WHERE is_active = 1 ORDER BY city_name").all<Record<string, unknown>>(),
    ]);
    return jsonResponse({ members: members.results ?? [], managers: managers.results ?? [], cities: cities.results ?? [] }, 200, request);
  }
  if (action === "assign") {
    const target = String(body.targetAuthUserId ?? "");
    const city = String(body.city ?? "").normalize("NFKC").trim();
    const displayName = String(body.displayName ?? "").trim();
    const username = normalizeUsername(body.username || displayName);
    const password = String(body.password ?? "");
    if (!target || !city || !displayName || !username || !strongPassword(password)) return jsonResponse({ error: "اطلاعات مدیر شهر کامل یا معتبر نیست." }, 400, request);
    const approved = await env.DB.prepare("SELECT 1 AS ok FROM member_roles mr JOIN members m ON m.id = mr.member_id WHERE m.auth_user_id = ? AND mr.approval_status = 'approved' LIMIT 1")
      .bind(target).first();
    const activeCity = await env.DB.prepare("SELECT 1 AS ok FROM cities WHERE city_name = ? AND is_active = 1").bind(city).first();
    if (!approved || !activeCity) return jsonResponse({ error: "عضویت فرد باید تأیید شده باشد و شهر انتخابی فعال باشد." }, 400, request);
    const existing = await env.DB.prepare("SELECT id, admin_role FROM admin_users WHERE auth_user_id = ? LIMIT 1").bind(target).first<Record<string, unknown>>();
    if (existing?.admin_role === "main_admin") return jsonResponse({ error: "حساب مدیر کل قابل تبدیل نیست." }, 409, request);
    const usernameOwner = await env.DB.prepare("SELECT auth_user_id FROM admin_users WHERE lower(login_username) = ? AND auth_user_id <> ? LIMIT 1").bind(username, target).first();
    if (usernameOwner) return jsonResponse({ error: "این نام کاربری قبلاً ثبت شده است." }, 409, request);
    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();
    if (existing) {
      await env.DB.prepare("UPDATE admin_users SET admin_role = 'city_manager', city = ?, is_active = 1, display_name = ?, login_username = ? WHERE id = ?")
        .bind(city, displayName, username, existing.id).run();
    } else {
      await env.DB.prepare("INSERT INTO admin_users (id, auth_user_id, admin_role, city, is_active, created_at, created_by, login_username, display_name) VALUES (?, ?, 'city_manager', ?, 1, ?, ?, ?, ?)")
        .bind(randomHex(16), target, city, now, auth.user.id, username, displayName).run();
    }
    await env.DB.prepare("UPDATE auth_users SET password_hash = ?, updated_at = ? WHERE id = ?").bind(passwordHash, now, target).run();
    const manager = await env.DB.prepare("SELECT id FROM admin_users WHERE auth_user_id = ? AND admin_role = 'city_manager' LIMIT 1").bind(target).first<Record<string, unknown>>();
    if (manager) {
      await env.DB.prepare("DELETE FROM admin_user_cities WHERE admin_user_id = ?").bind(manager.id).run();
      await env.DB.prepare("INSERT INTO admin_user_cities (admin_user_id, city_name, created_at) VALUES (?, ?, ?)").bind(manager.id, city, now).run();
    }
    return jsonResponse({ message: "مدیر شهر ثبت شد و دسترسی او به شهر انتخاب‌شده محدود شد." }, 200, request);
  }
  if (action === "deactivate") {
    const target = String(body.targetAuthUserId ?? "");
    const r = await env.DB.prepare("UPDATE admin_users SET is_active = 0 WHERE auth_user_id = ? AND admin_role = 'city_manager'").bind(target).run();
    if (!r.meta?.changes) return jsonResponse({ error: "مدیر شهر پیدا نشد." }, 404, request);
    return jsonResponse({ message: "دسترسی مدیر شهر غیرفعال شد." }, 200, request);
  }
  return jsonResponse({ error: "عملیات نامعتبر است." }, 400, request);
}

export async function handleCloudflareAuthRequest(request: Request, rawEnv: unknown): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  if (!path.startsWith("/auth/v1/") && !path.startsWith("/functions/v1/")) return null;
  const env = rawEnv as SmsBindingEnv;
  if (!env?.DB) return jsonResponse({ msg: "Cloudflare D1 is not configured." }, 503, request);
  if (request.method === "OPTIONS") return jsonResponse({}, 200, request);
  try {
    if (path.startsWith("/auth/v1/")) return await handleAuthRequest(request, env);
    if (path === "/functions/v1/admin-login" && request.method === "POST") return await handleAdminLogin(request, env);
    if (path === "/functions/v1/admin-manage-city-manager" && request.method === "POST") return await handleCityManager(request, env);
    return jsonResponse({ error: "Function not found" }, 404, request);
  } catch (error) {
    console.error("[Terrabar Cloudflare auth]", error);
    return jsonResponse({ msg: "خطای داخلی سرویس احراز هویت." }, 500, request);
  }
}
