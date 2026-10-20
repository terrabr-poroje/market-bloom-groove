import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = new Set([
  "https://terrabar.ir",
  "https://www.terrabar.ir",
  "https://terrabar-preview.onrender.com",
  "http://localhost:8080",
]);

function corsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  const safeOrigin = allowedOrigins.has(origin) ? origin : "https://terrabar.ir";
  const requestedHeaders = req.headers.get("Access-Control-Request-Headers");
  return {
    "Access-Control-Allow-Origin": safeOrigin,
    "Access-Control-Allow-Headers": requestedHeaders ?? "authorization, x-client-info, apikey, content-type, x-supabase-api-version, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin, Access-Control-Request-Headers",
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

function normalizeUsername(value: unknown): string {
  return String(value ?? "").normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function strongPassword(value: string): boolean {
  return value.length >= 10 && /\p{L}/u.test(value) && /\p{N}/u.test(value);
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin") ?? "";
  if (origin && !allowedOrigins.has(origin)) {
    return json(req, { error: "مبدأ درخواست مجاز نیست." }, 403);
  }
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "درخواست نامعتبر است." }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) {
    return json(req, { error: "تنظیمات امن ورود مدیر کامل نیست." }, 500);
  }

  let body: { action?: string; username?: string; password?: string; code?: string };
  try {
    body = await req.json();
  } catch {
    return json(req, { error: "اطلاعات ارسالی معتبر نیست." }, 400);
  }

  const username = normalizeUsername(body.username);
  if (!username || username.length > 160) {
    return json(req, { error: "نام کاربری را وارد کنید." }, 400);
  }

  const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const auth = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: admin, error: lookupError } = await db
    .from("admin_users")
    .select("auth_user_id, admin_role, is_active")
    .ilike("login_username", username)
    .eq("is_active", true)
    .maybeSingle();

  if (lookupError) {
    console.error("[admin-login] admin lookup failed:", lookupError.message);
    return json(req, { error: "بررسی حساب مدیر موقتاً انجام نشد." }, 503);
  }

  const validAdmin = Boolean(
    admin?.auth_user_id &&
    ["main_admin", "city_manager"].includes(String(admin.admin_role))
  );

  if (body.action === "reset") {
    if (!validAdmin) {
      return json(req, {
        ok: true,
        message: "اگر نام کاربری متعلق به مدیر فعال باشد، کد بازیابی به ایمیل ثبت‌شده ارسال می‌شود.",
      });
    }

    const { data: userData, error: userError } = await db.auth.admin.getUserById(admin!.auth_user_id);
    const email = userData.user?.email;
    if (userError || !email) {
      console.error("[admin-login] admin recovery identity unavailable:", userError?.message ?? "no email");
      return json(req, {
        ok: false,
        error: "برای حساب مدیر ایمیل قابل‌بازیابی پیدا نشد؛ اتصال حساب مدیر باید بررسی شود.",
      });
    }

    const { error: resetError } = await auth.auth.resetPasswordForEmail(email, {
      redirectTo: "https://terrabar.ir/reset-password",
    });

    if (resetError) {
      console.error("[admin-login] password recovery email failed:", resetError.message);
      const waitMatch = resetError.message.match(/after (\d+) seconds/i);
      const userMessage = waitMatch
        ? `برای امنیت، درخواست بازیابی اخیراً ارسال شده است. لطفاً ${waitMatch[1]} ثانیه صبر کنید و سپس فقط یک بار تلاش کنید.`
        : "ارسال ایمیل بازیابی ناموفق بود. تنظیم SMTP و قالب Recovery در Supabase بررسی شود.";
      return json(req, { ok: false, error: userMessage }, waitMatch ? 429 : 502);
    }

    return json(req, {
      ok: true,
      message: "اگر نام کاربری متعلق به مدیر فعال باشد، کد بازیابی به ایمیل ثبت‌شده ارسال شده است.",
    });
  }

  if (body.action === "verify_reset") {
    const code = String(body.code ?? "").trim();
    const password = String(body.password ?? "");
    if (!validAdmin || !/^\d{8}$/.test(code)) {
      return json(req, { ok: false, error: "کد بازیابی نامعتبر یا منقضی شده است." }, 400);
    }
    if (!strongPassword(password)) {
      return json(req, { ok: false, error: "رمز جدید باید حداقل ۱۰ نویسه و شامل حروف و عدد باشد." }, 400);
    }

    const { data: userData, error: userError } = await db.auth.admin.getUserById(admin!.auth_user_id);
    const email = userData.user?.email;
    if (userError || !email) {
      console.error("[admin-login] admin recovery identity unavailable:", userError?.message ?? "no email");
      return json(req, { ok: false, error: "ایمیل حساب مدیر قابل بررسی نیست." }, 503);
    }

    const { data: verified, error: verifyError } = await auth.auth.verifyOtp({
      email,
      token: code,
      type: "recovery",
    });
    if (verifyError || verified.user?.id !== admin!.auth_user_id) {
      console.warn("[admin-login] recovery OTP rejected");
      return json(req, { ok: false, error: "کد بازیابی نامعتبر یا منقضی شده است. کد جدید بگیرید." }, 400);
    }

    const { error: updateError } = await db.auth.admin.updateUserById(admin!.auth_user_id, { password });
    if (updateError) {
      console.error("[admin-login] admin password update failed:", updateError.message);
      return json(req, { ok: false, error: "ذخیره رمز جدید انجام نشد. دوباره تلاش کنید." }, 502);
    }

    return json(req, { ok: true, message: "رمز مدیر با موفقیت تغییر کرد." });
  }

  const password = String(body.password ?? "");
  if (!validAdmin || password.length < 10) {
    return json(req, { error: "نام کاربری یا رمز عبور صحیح نیست." }, 401);
  }

  const { data: userData, error: userError } = await db.auth.admin.getUserById(admin!.auth_user_id);
  const email = userData.user?.email;
  if (userError || !email) {
    console.error("[admin-login] admin login identity unavailable:", userError?.message ?? "no email");
    return json(req, { error: "ورود مدیر موقتاً در دسترس نیست." }, 503);
  }

  const { data, error } = await auth.auth.signInWithPassword({ email, password });
  if (error || !data.session || data.user?.id !== admin!.auth_user_id) {
    return json(req, { error: "نام کاربری یا رمز عبور صحیح نیست." }, 401);
  }

  return json(req, {
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    },
    role: admin!.admin_role,
  });
});
