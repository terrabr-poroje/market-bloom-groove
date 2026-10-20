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
  return {
    "Access-Control-Allow-Origin": safeOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}
function clean(value: unknown) {
  return String(value ?? "").normalize("NFKC").trim().replace(/\s+/g, " ");
}
function normalizeUsername(value: unknown) {
  return clean(value).toLocaleLowerCase();
}
function strongPassword(value: string) {
  return value.length >= 10 && /\p{L}/u.test(value) && /\p{N}/u.test(value);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "درخواست نامعتبر است." }, 405);

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const bearer = req.headers.get("Authorization") ?? "";
  if (!url || !anon || !service || !bearer.startsWith("Bearer ")) {
    return json(req, { error: "نشست مدیر معتبر نیست." }, 401);
  }

  const callerClient = createClient(url, anon, {
    global: { headers: { Authorization: bearer } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: callerData, error: callerError } = await callerClient.auth.getUser();
  if (callerError || !callerData.user) return json(req, { error: "نشست مدیر معتبر نیست." }, 401);

  const db = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: callerAdmin, error: adminError } = await db.from("admin_users")
    .select("id, admin_role, is_active")
    .eq("auth_user_id", callerData.user.id).eq("is_active", true).maybeSingle();
  if (adminError || callerAdmin?.admin_role !== "main_admin") {
    return json(req, { error: "فقط مدیر کل اجازه مدیریت مدیران شهر را دارد." }, 403);
  }

  let body: { action?: string; targetAuthUserId?: string; city?: string; displayName?: string; username?: string; password?: string };
  try { body = await req.json(); } catch { return json(req, { error: "اطلاعات ارسالی معتبر نیست." }, 400); }

  if (body.action === "list") {
    const [
      { data: approvedRoles, error: rolesError },
      { data: managers, error: managersError },
      { data: cities, error: citiesError },
    ] = await Promise.all([
      db.from("member_roles")
        .select("role_code, members!inner(auth_user_id, full_name, city, email)")
        .eq("approval_status", "approved")
        .not("members.auth_user_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(2000),
      db.from("admin_users")
        .select("id, auth_user_id, display_name, login_username, city, is_active")
        .eq("admin_role", "city_manager").order("created_at", { ascending: true }),
      db.from("cities").select("city_name").eq("is_active", true).order("city_name"),
    ]);
    if (rolesError || managersError || citiesError) {
      console.error("[admin-manage-city-manager] list failed", rolesError?.message, managersError?.message, citiesError?.message);
      return json(req, { error: "فهرست عضویت‌های تأییدشده، مدیران یا شهرها دریافت نشد." }, 503);
    }

    const unique = new Map<string, { auth_user_id: string; full_name: string; city: string; role: string }>();
    for (const row of approvedRoles ?? []) {
      const member = Array.isArray(row.members) ? row.members[0] : row.members;
      if (!member?.auth_user_id) continue;
      const previous = unique.get(member.auth_user_id);
      const role = String(row.role_code ?? "");
      unique.set(member.auth_user_id, {
        auth_user_id: member.auth_user_id,
        full_name: clean(member.full_name) || "عضو بدون نام",
        city: clean(member.city),
        role: previous ? previous.role + "، " + role : role,
      });
    }
    return json(req, { members: [...unique.values()].sort((a, b) => a.full_name.localeCompare(b.full_name, "fa")), managers: managers ?? [], cities: cities ?? [] });
  }

  if (body.action === "assign") {
    const targetAuthUserId = clean(body.targetAuthUserId);
    const city = clean(body.city);
    const displayName = clean(body.displayName);
    const username = normalizeUsername(body.username || displayName);
    const password = String(body.password ?? "");
    if (!targetAuthUserId || !city || !displayName || !username || username.length > 160 || displayName.length > 160) {
      return json(req, { error: "نام مدیر، نام کاربری و شهر را کامل وارد کنید." }, 400);
    }
    if (!strongPassword(password)) {
      return json(req, { error: "رمز عبور باید دست‌کم ۱۰ نویسه و شامل حرف و عدد باشد." }, 400);
    }

    const [
      { data: approvedMembership, error: membershipError },
      { data: cityRow, error: cityError },
      { data: existingAdmin, error: existingError },
      { data: usernameOwner, error: usernameError },
    ] = await Promise.all([
      db.from("member_roles").select("id, members!inner(auth_user_id)")
        .eq("approval_status", "approved").eq("members.auth_user_id", targetAuthUserId).limit(1).maybeSingle(),
      db.from("cities").select("city_name").eq("city_name", city).eq("is_active", true).maybeSingle(),
      db.from("admin_users").select("id, admin_role").eq("auth_user_id", targetAuthUserId).maybeSingle(),
      db.from("admin_users").select("auth_user_id").ilike("login_username", username).maybeSingle(),
    ]);
    if (membershipError || cityError || existingError || usernameError) {
      return json(req, { error: "بررسی عضویت، نام کاربری یا شهر انجام نشد." }, 503);
    }
    if (!approvedMembership || !cityRow) return json(req, { error: "فقط عضو دارای عضویت تأییدشده را می‌توان به مدیر شهر تبدیل کرد؛ شهر نیز باید فعال باشد." }, 400);
    if (existingAdmin?.admin_role === "main_admin") return json(req, { error: "حساب مدیر کل را نمی‌توان به مدیر شهر تبدیل کرد." }, 409);
    if (usernameOwner && usernameOwner.auth_user_id !== targetAuthUserId) {
      return json(req, { error: "این نام کاربری قبلاً برای مدیر دیگری ثبت شده است." }, 409);
    }

    const { data: authData, error: authError } = await db.auth.admin.getUserById(targetAuthUserId);
    if (authError || !authData.user?.email_confirmed_at) {
      return json(req, { error: "حساب عضو باید ایمیل تأییدشده داشته باشد تا ورود مدیر با نام کاربری و رمز برقرار شود." }, 400);
    }

    // Set the chosen password on the member's existing Auth account; no new account is created.
    const { error: passwordError } = await db.auth.admin.updateUserById(targetAuthUserId, { password });
    if (passwordError) {
      console.error("[admin-manage-city-manager] password update failed", passwordError.message);
      return json(req, { error: "تنظیم رمز عبور انجام نشد؛ رمز انتخابی و وضعیت حساب را بررسی کنید." }, 502);
    }

    const { data: savedAdmin, error: saveError } = await db.from("admin_users").upsert({
      auth_user_id: targetAuthUserId,
      admin_role: "city_manager",
      city,
      is_active: true,
      display_name: displayName,
      login_username: username,
      created_by: callerData.user.id,
    }, { onConflict: "auth_user_id" }).select("id, auth_user_id, display_name, login_username, city, is_active").single();
    if (saveError || !savedAdmin) {
      console.error("[admin-manage-city-manager] manager save failed", saveError?.message);
      if (saveError?.code === "23505") return json(req, { error: "این نام کاربری قبلاً برای مدیر دیگری ثبت شده است." }, 409);
      return json(req, { error: "رمز تنظیم شد اما ثبت نقش مدیر انجام نشد؛ لطفاً نام کاربری را بررسی کنید." }, 503);
    }

    const { error: clearError } = await db.from("admin_user_cities").delete().eq("admin_user_id", savedAdmin.id);
    if (clearError) return json(req, { error: "مدیر ثبت شد، اما به‌روزرسانی محدوده شهر کامل نشد؛ فهرست مدیران را دوباره بررسی کنید." }, 503);
    const { error: assignError } = await db.from("admin_user_cities").insert({ admin_user_id: savedAdmin.id, city_name: city });
    if (assignError) return json(req, { error: "مدیر ثبت شد، اما تخصیص شهر کامل نشد؛ فهرست مدیران را دوباره بررسی کنید." }, 503);
    return json(req, { manager: savedAdmin, message: "مدیر شهر ثبت شد؛ نام کاربری و رمز تنظیم شدند و دسترسی به شهر انتخاب‌شده محدود شد." });
  }

  if (body.action === "deactivate") {
    const targetAuthUserId = clean(body.targetAuthUserId);
    const { data: manager, error: lookupError } = await db.from("admin_users")
      .select("id, admin_role").eq("auth_user_id", targetAuthUserId).maybeSingle();
    if (lookupError || !manager || manager.admin_role !== "city_manager") return json(req, { error: "مدیر شهر پیدا نشد." }, 404);
    const { error: deactivateError } = await db.from("admin_users").update({ is_active: false }).eq("id", manager.id);
    if (deactivateError) return json(req, { error: "غیرفعال‌کردن مدیر انجام نشد." }, 503);
    return json(req, { message: "دسترسی مدیر شهر غیرفعال شد." });
  }
  return json(req, { error: "عملیات نامعتبر است." }, 400);
});
