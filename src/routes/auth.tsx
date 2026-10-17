/* eslint-disable @typescript-eslint/no-explicit-any -- Dynamic queries target the audited production Supabase schema; generated client types are stale. */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { CheckCircle2, Clock3, LogIn, Phone, ShieldCheck, Sprout, Store, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cities, pageHead } from "@/lib/marketplace";

export const Route = createFileRoute("/auth")({
  head: () => pageHead("ورود و ثبت‌نام", "ثبت‌نام و ورود با شماره موبایل در ترابار؛ انتخاب نقش خریدار، تأمین‌کننده یا بارفروش."),
  component: AuthPage,
});

type MainRole = "buyer" | "supplier" | "bar_seller";

const roleOptions: { value: MainRole; title: string; description: string; icon: typeof UserRound }[] = [
  {
    value: "buyer",
    title: "خریدار",
    description: "برای مشاهده بارهای مجاز، خرید محصول و ثبت درخواست تأمین.",
    icon: UserRound,
  },
  {
    value: "supplier",
    title: "تأمین‌کننده",
    description: "باغدار، کشاورز، تولیدکننده، سورتینگ، باربارکن و فعالیت‌های صادرات یا واردات؛ امکانات حرفه‌ای پس از تأیید فعال می‌شوند.",
    icon: Sprout,
  },
  {
    value: "bar_seller",
    title: "بارفروش / حجره‌دار",
    description: "فعال بازار میوه و تره‌بار؛ امکان اعلام بار پس از بررسی و تأیید عضویت فعال می‌شود.",
    icon: Store,
  },
];

function normalizeIranPhone(value: string) {
  const digits = value.replace(/[^\d+]/g, "");
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("0098")) return `+${digits.slice(2)}`;
  if (digits.startsWith("98")) return `+${digits}`;
  if (digits.startsWith("0")) return `+98${digits.slice(1)}`;
  return digits ? `+98${digits}` : "";
}

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [adminLogin, setAdminLogin] = useState(false);
  const [authMethod, setAuthMethod] = useState<"phone" | "email">("phone");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [city, setCity] = useState(cities[0] ?? "کرج");
  const [activity, setActivity] = useState("");
  const [role, setRole] = useState<MainRole>("buyer");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function sendCode(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const normalizedPhone = normalizeIranPhone(phone);
    const normalizedEmail = email.trim().toLowerCase();
    if (authMethod === "phone" && !/^\+\d{10,15}$/.test(normalizedPhone)) {
      setError("شماره موبایل را با قالب معتبر وارد کنید؛ نمونه: 09123456789");
      setBusy(false);
      return;
    }
    if (authMethod === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("یک ایمیل معتبر وارد کنید.");
      setBusy(false);
      return;
    }
    if (mode === "signup" && !acceptedTerms) {
      setError("برای ادامه، پذیرش قوانین ترابار الزامی است.");
      setBusy(false);
      return;
    }
    if (mode === "signup" && role !== "buyer" && !activity.trim()) {
      setError("برای نقش حرفه‌ای، نوع فعالیت یا محصولات را وارد کنید.");
      setBusy(false);
      return;
    }

    const authOptions = {
      shouldCreateUser: mode === "signup" && !adminLogin,
      data: mode === "signup"
        ? {
            full_name: fullName.trim(),
            city,
            requested_role: role,
            ...(authMethod === "phone" ? { phone: normalizedPhone } : { email: normalizedEmail }),
          }
        : undefined,
    };
    const { error: otpError } = authMethod === "phone"
      ? await supabase.auth.signInWithOtp({ phone: normalizedPhone, options: authOptions })
      : await supabase.auth.signInWithOtp({ email: normalizedEmail, options: authOptions });
    if (otpError) {
      const providerMessage = otpError.message ? ` (جزئیات: ${otpError.message})` : "";
      setError(authMethod === "phone"
        ? `ارسال کد انجام نشد. فعال‌بودن ورود پیامکی و تنظیمات ارائه‌دهنده پیامک در Supabase را بررسی کنید.${providerMessage}`
        : `ارسال کد ایمیل انجام نشد. تنظیمات Email Auth، قالب OTP و محدودیت ارسال ایمیل در Supabase را بررسی کنید.${providerMessage}`);
    } else {
      if (authMethod === "phone") setPhone(normalizedPhone);
      else setEmail(normalizedEmail);
      setCodeSent(true);
      setNotice(authMethod === "phone" ? "کد یک‌بارمصرف پیامکی ارسال شد." : "کد عددی تأیید به ایمیل شما ارسال شد؛ صندوق ورودی و پوشه هرزنامه را بررسی کنید.");
    }
    setBusy(false);
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const normalizedPhone = normalizeIranPhone(phone);
    const normalizedEmail = email.trim().toLowerCase();
    const { data, error: verifyError } = authMethod === "phone"
      ? await supabase.auth.verifyOtp({ phone: normalizedPhone, token: code.trim(), type: "sms" })
      : await supabase.auth.verifyOtp({ email: normalizedEmail, token: code.trim(), type: "email" });
    if (verifyError || !data.user) {
      setError("کد تأیید معتبر نیست یا منقضی شده است؛ دوباره بررسی کنید.");
      setBusy(false);
      return;
    }

    if (adminLogin) {
      const { data: adminRecord, error: adminLookupError } = await (supabase as any)
        .from("admin_users")
        .select("id, admin_role")
        .eq("auth_user_id", data.user.id)
        .eq("is_active", true)
        .maybeSingle();
      if (adminLookupError || !adminRecord || !["main_admin", "city_manager"].includes(String(adminRecord.admin_role))) {
        await supabase.auth.signOut();
        setError("این حساب دسترسی فعال مدیریت ترابار ندارد. با حساب مدیر مجاز وارد شوید.");
        setBusy(false);
        return;
      }
      setNotice("ورود مدیر با موفقیت تأیید شد؛ در حال انتقال به پنل مدیریت…");
      setBusy(false);
      window.setTimeout(() => navigate({ to: "/admin" }), 500);
      return;
    }

    if (mode === "signup") {
      const { data: existingMember, error: lookupError } = await (supabase as any)
        .from("members")
        .select("id, role")
        .eq("auth_user_id", data.user.id)
        .maybeSingle();

      if (lookupError) {
        setError("ورود انجام شد، اما بررسی پروفایل کامل نشد. دوباره تلاش کنید یا با مدیر تماس بگیرید.");
        setBusy(false);
        return;
      }

      let memberId = existingMember?.id;
      if (!memberId) {
        const memberRole = role === "bar_seller" ? "seller" : role;
        const { data: member, error: insertError } = await (supabase as any)
          .from("members")
          .insert({
            auth_user_id: data.user.id,
            full_name: fullName.trim(),
            phone: authMethod === "phone" ? normalizedPhone : null,
            email: authMethod === "email" ? normalizedEmail : null,
            city,
            role: memberRole,
            verification_status: "pending",
            products: role === "buyer" ? null : activity.trim(),
          })
          .select("id")
          .single();

        if (insertError || !member) {
          setError("حساب تأیید شد، اما ساخت پروفایل کامل نشد. تنظیمات دسترسی members در Supabase باید بررسی شود.");
          setBusy(false);
          return;
        }
        memberId = member.id;
      }

      if (role !== "buyer") {
        const roleCode = role === "bar_seller" ? "bar_seller" : "supplier";
        const { data: priorRole, error: roleLookupError } = await (supabase as any)
          .from("member_roles")
          .select("id, approval_status")
          .eq("member_id", memberId)
          .eq("role_code", roleCode)
          .maybeSingle();

        if (roleLookupError) {
          setError("پروفایل ساخته شد، اما وضعیت درخواست عضویت بررسی نشد.");
          setBusy(false);
          return;
        }
        if (!priorRole) {
          const { error: roleInsertError } = await (supabase as any)
            .from("member_roles")
            .insert({ member_id: memberId, role_code: roleCode, approval_status: "pending" });
          if (roleInsertError) {
            setError("حساب ساخته شد، اما درخواست تأیید نقش ثبت نشد. از بخش درخواست عضویت دوباره تلاش کنید.");
            setBusy(false);
            return;
          }
        }
      }
      setNotice(role === "buyer" ? "ثبت‌نام انجام شد." : "ثبت‌نام انجام شد؛ درخواست نقش حرفه‌ای شما در انتظار بررسی مدیریت است.");
    } else {
      setNotice("ورود با موفقیت انجام شد.");
    }
    setBusy(false);
    window.setTimeout(() => navigate({ to: mode === "signup" && role !== "buyer" ? "/membership" : "/" }), 900);
  }

  if (loading) return <section className="py-16 text-center text-sm text-muted-foreground">در حال بررسی حساب…</section>;

  if (user && !codeSent && !busy && !error) {
    return (
      <section className="bg-market-surface py-16">
        <div className="site-container max-w-md text-center">
          <CheckCircle2 className="mx-auto mb-4 size-12 text-primary" />
          <h1 className="text-2xl font-extrabold">به ترابار خوش آمدید</h1>
          <p className="mt-3 text-sm text-muted-foreground">شما وارد حساب خود شده‌اید.</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild><Link to="/membership">درخواست عضویت و پیگیری وضعیت</Link></Button>
            <Button asChild variant="outline"><Link to="/">بازگشت به صفحه اصلی</Link></Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-market-surface py-10 sm:py-14">
      <div className="site-container max-w-xl">
        <div className="rounded-xl border border-border bg-card p-5 sm:p-8">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-xl bg-accent text-primary"><Phone className="size-6" /></div>
            <div>
              <h1 className="text-2xl font-extrabold">{mode === "signup" ? "ثبت‌نام در ترابار" : "ورود به ترابار"}</h1>
              <p className="mt-1 text-sm text-muted-foreground">ورود امن با کد یک‌بارمصرف پیامکی یا ایمیلی</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 rounded-lg bg-secondary p-1">
            <button type="button" onClick={() => { setMode("signup"); setAdminLogin(false); setAuthMethod("phone"); setCodeSent(false); setError(""); setNotice(""); }} className={`rounded-md px-3 py-2 text-sm font-semibold ${mode === "signup" ? "bg-card shadow-sm" : "text-muted-foreground"}`}>ثبت‌نام</button>
            <button type="button" onClick={() => { setMode("login"); setAdminLogin(false); setCodeSent(false); setError(""); setNotice(""); }} className={`rounded-md px-3 py-2 text-sm font-semibold ${mode === "login" ? "bg-card shadow-sm" : "text-muted-foreground"}`}>ورود</button>
          </div>

          <Button type="button" variant={adminLogin ? "default" : "outline"} className="mt-4 w-full" onClick={() => { setAdminLogin(true); setMode("login"); setAuthMethod("email"); setCodeSent(false); setCode(""); setError(""); setNotice(""); }}>ورود مدیر ترابار با ایمیل</Button>
          {adminLogin && <p className="mt-2 text-xs text-muted-foreground">فقط حساب‌هایی که در پایگاه داده به‌عنوان مدیر فعال ثبت شده‌اند اجازه ورود به پنل مدیریت دارند.</p>}

          {!codeSent ? (
            <form onSubmit={sendCode} className="mt-6 grid gap-4">
              {mode === "signup" && (
                <>
                  <label className="field-label">نام و نام خانوادگی<input required value={fullName} onChange={e => setFullName(e.target.value)} className="field-input" placeholder="نام کامل شما" autoComplete="name" /></label>
                  <label className="field-label">شهر محل فعالیت<select className="field-input" value={city} onChange={e => setCity(e.target.value)}>{cities.map(item => <option key={item}>{item}</option>)}</select></label>
                  {role !== "buyer" && <label className="field-label">نوع فعالیت / محصولات<input required value={activity} onChange={e => setActivity(e.target.value)} className="field-input" placeholder={role === "supplier" ? "مثلاً باغدار مرکبات، کشاورز یا سورتینگ" : "مثلاً حجره و نوع محصولات قابل عرضه"} /></label>}
                  <fieldset className="grid gap-3">
                    <legend className="mb-1 text-sm font-bold">نقش اصلی خود را انتخاب کنید</legend>
                    {roleOptions.map(item => {
                      const Icon = item.icon;
                      return (
                        <label key={item.value} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${role === item.value ? "border-primary bg-accent/50" : "border-border"}`}>
                          <input type="radio" name="main-role" value={item.value} checked={role === item.value} onChange={() => setRole(item.value)} className="mt-1 accent-primary" />
                          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-accent text-primary"><Icon className="size-5" /></span>
                          <span className="flex-1"><strong className="block text-sm">{item.title}</strong><span className="mt-1 block text-xs leading-6 text-muted-foreground">{item.description}</span></span>
                        </label>
                      );
                    })}
                  </fieldset>
                  <label className="flex items-start gap-2 text-xs leading-6 text-muted-foreground"><input type="checkbox" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} className="mt-1 accent-primary" /><span>قوانین و مقررات ترابار را می‌پذیرم.</span></label>
                </>
              )}
              {!adminLogin && <fieldset className="grid gap-2">
                <legend className="text-sm font-bold">روش ورود یا ثبت‌نام را انتخاب کنید</legend>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => { setAuthMethod("phone"); setCodeSent(false); setError(""); setNotice(""); }} className={`rounded-lg border p-3 text-sm font-semibold ${authMethod === "phone" ? "border-primary bg-accent/50" : "border-border"}`}>شماره موبایل</button>
                  <button type="button" onClick={() => { setAuthMethod("email"); setCodeSent(false); setError(""); setNotice(""); }} className={`rounded-lg border p-3 text-sm font-semibold ${authMethod === "email" ? "border-primary bg-accent/50" : "border-border"}`}>ایمیل</button>
                </div>
              </fieldset>}
              {authMethod === "phone" && !adminLogin
                ? <label className="field-label">شماره موبایل<input required dir="ltr" inputMode="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} className="field-input text-left" placeholder="09123456789" /></label>
                : <label className="field-label">ایمیل<input required type="email" dir="ltr" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className="field-input text-left" placeholder="name@example.com" /><span className="text-xs font-normal text-muted-foreground">{adminLogin ? "کد ورود فقط برای ایمیل حساب مدیر فعال ارسال می‌شود." : "می‌توانید بدون شماره موبایل با ایمیل ثبت‌نام کنید."}</span></label>}
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              {notice && <p role="status" className="text-sm text-primary">{notice}</p>}
              <Button type="submit" disabled={busy}>{busy ? "در حال ارسال…" : "ارسال کد تأیید"}<Phone className="mr-2 size-4" /></Button>
            </form>
          ) : (
            <form onSubmit={verifyCode} className="mt-6 grid gap-4">
              <div className="rounded-lg bg-accent/40 p-4 text-sm"><p className="font-semibold">کد تأیید برای {authMethod === "phone" ? phone : email} ارسال شد</p><p className="mt-1 text-xs text-muted-foreground">کد دریافت‌شده را وارد کنید تا {mode === "signup" ? "ثبت‌نام" : "ورود"} کامل شود.</p></div>
              <label className="field-label">کد یک‌بارمصرف<input required dir="ltr" inputMode="numeric" autoComplete="one-time-code" minLength={6} maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} className="field-input text-center text-lg tracking-[0.4em]" placeholder="000000" /></label>
              {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
              {notice && <p role="status" className="text-sm text-primary">{notice}</p>}
              <Button type="submit" disabled={busy || code.trim().length !== 6}>{busy ? "در حال بررسی…" : "تأیید کد و ادامه"}<ShieldCheck className="mr-2 size-4" /></Button>
              <Button type="button" variant="outline" disabled={busy} onClick={() => { setCodeSent(false); setCode(""); setError(""); setNotice(""); }}>اصلاح شماره / ارسال دوباره</Button>
            </form>
          )}

          {error && !codeSent && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
          {notice && !codeSent && <p role="status" className="mt-3 flex items-center gap-2 text-sm text-primary"><Clock3 className="size-4" />{notice}</p>}
          <p className="mt-6 text-center text-xs leading-6 text-muted-foreground">اطلاعات تماس اعضا عمومی نیست. نقش‌های تأمین‌کننده و بارفروش پس از بررسی مدیریت فعال می‌شوند.</p>
          <Button asChild variant="link" className="mt-2 w-full"><Link to="/">بازگشت به صفحه اصلی</Link></Button>
        </div>
      </div>
    </section>
  );
}
