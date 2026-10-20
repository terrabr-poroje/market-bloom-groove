import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { pageHead } from "@/lib/marketplace";

export const Route = createFileRoute("/reset-password")({
  head: () => pageHead("بازیابی رمز مدیر", "بازیابی امن حساب مدیران ترابار."),
  component: ResetPasswordPage,
});

type Stage = "request" | "waiting" | "set" | "emergency";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [emergencyCode, setEmergencyCode] = useState("");
  const [stage, setStage] = useState<Stage>("emergency");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let alive = true;
    const applyRecoverySession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!alive || !data.session) return;
      const { data: admin, error: adminError } = await supabase
        .from("admin_users")
        .select("admin_role, is_active")
        .eq("auth_user_id", data.session.user.id)
        .eq("is_active", true)
        .maybeSingle();
      if (!alive) return;
      if (adminError || !admin || !["main_admin", "city_manager"].includes(admin.admin_role)) {
        setError("این لینک برای حساب مدیر فعال ترابار معتبر نیست. از صفحه ورود، بازیابی را دوباره درخواست کنید.");
        return;
      }
      setStage("set");
      setNotice("لینک بازیابی تأیید شد. رمز جدید ۱۰ رقمی را وارد کنید.");
    };
    void applyRecoverySession();
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        window.setTimeout(() => { void applyRecoverySession(); }, 0);
      }
    });
    const params = new URLSearchParams(window.location.search);
    const requestedUsername = params.get("username")?.trim();
    if (requestedUsername) setUsername(requestedUsername);
    if (params.get("emergency") === "1") setStage("emergency");
    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function requestRecovery(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    const normalized = username.normalize("NFKC").trim().replace(/\s+/g, " ");
    const { data, error: requestError } = await supabase.functions.invoke("admin-login", {
      body: { action: "reset", username: normalized },
    });
    if (requestError || data?.ok === false) {
      setError(data?.error ?? "ارسال ایمیل بازیابی انجام نشد. تنظیمات ایمیل Supabase را بررسی کنید.");
    } else {
      setUsername(normalized);
      setStage("waiting");
      setNotice("ایمیل بازیابی درخواست شد. صندوق ورودی و پوشه هرزنامه را بررسی کنید و روی لینک «Reset your password» بزنید؛ کد ۱۰ رقمی جداگانه ارسال نمی‌شود.");
    }
    setBusy(false);
  }


  async function saveEmergencyPassword(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    if (!/^\d{12}$/.test(emergencyCode)) {
      setError("کد اضطراری باید دقیقاً ۱۲ رقم باشد."); setBusy(false); return;
    }
    if (!/^\d{10}$/.test(password)) {
      setError("رمز جدید باید دقیقاً ۱۰ رقم عددی باشد."); setBusy(false); return;
    }
    if (password !== confirm) {
      setError("تکرار رمز با رمز جدید یکسان نیست."); setBusy(false); return;
    }
    const normalized = username.normalize("NFKC").trim().replace(/\\s+/g, " ");
    const { data, error: recoveryError } = await supabase.functions.invoke("admin-login", {
      body: { action: "emergency_reset", username: normalized, code: emergencyCode, password },
    });
    if (recoveryError || !data?.ok) {
      setError(data?.error ?? "بازیابی اضطراری انجام نشد؛ کد و نام کاربری را بررسی کنید.");
      setBusy(false); return;
    }
    setNotice("رمز مدیر کل تغییر کرد. کد اضطراری مصرف شده و دیگر قابل استفاده نیست؛ اکنون با رمز جدید وارد شوید.");
    setBusy(false);
    window.setTimeout(() => navigate({ to: "/admin-login" }), 1400);
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    if (!/^\d{10}$/.test(password)) {
      setError("رمز جدید باید دقیقاً ۱۰ رقم عددی باشد.");
      setBusy(false); return;
    }
    if (password !== confirm) {
      setError("تکرار رمز با رمز جدید یکسان نیست.");
      setBusy(false); return;
    }
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setError("نشست بازیابی پیدا نشد. ایمیل را باز کنید و دوباره روی لینک بازیابی بزنید.");
      setBusy(false); return;
    }
    const { data: admin, error: adminError } = await supabase
      .from("admin_users")
      .select("admin_role, is_active")
      .eq("auth_user_id", sessionData.session.user.id)
      .eq("is_active", true)
      .maybeSingle();
    if (adminError || !admin || !["main_admin", "city_manager"].includes(admin.admin_role)) {
      setError("این حساب مدیر فعال ترابار نیست؛ رمز تغییر نکرد.");
      setBusy(false); return;
    }
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message || "ذخیره رمز جدید انجام نشد. دوباره تلاش کنید.");
      setBusy(false); return;
    }
    await supabase.auth.signOut();
    setNotice("رمز جدید ذخیره شد. اکنون با نام کاربری و رمز جدید وارد شوید.");
    setBusy(false);
    window.setTimeout(() => navigate({ to: "/admin-login" }), 1200);
  }

  return <section className="bg-market-surface py-10"><div className="site-container max-w-md"><div className="rounded-xl border border-border bg-card p-6 sm:p-8">
    <h1 className="text-2xl font-extrabold">بازیابی رمز مدیر</h1>

    {stage === "emergency" && <form onSubmit={saveEmergencyPassword} className="mt-6 grid gap-4">
      <p className="text-sm text-muted-foreground">بازیابی اضطراری فقط برای مدیر کل فعال است. کد یک‌بارمصرف پس از استفاده باطل می‌شود و حداکثر ۳۰ دقیقه اعتبار دارد.</p>
      <label className="field-label">نام کاربری مدیر کل<input required autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} className="field-input" /></label>
      <label className="field-label">کد اضطراری ۱۲ رقمی<input required inputMode="numeric" autoComplete="one-time-code" maxLength={12} pattern="[0-9]{12}" dir="ltr" value={emergencyCode} onChange={e => setEmergencyCode(e.target.value.replace(/\\D/g, "").slice(0, 12))} className="field-input" /></label>
      <label className="field-label">رمز جدید (دقیقاً ۱۰ رقم)<input required type="password" inputMode="numeric" autoComplete="new-password" maxLength={10} pattern="[0-9]{10}" dir="ltr" value={password} onChange={e => setPassword(e.target.value.replace(/\\D/g, "").slice(0, 10))} className="field-input" /></label>
      <label className="field-label">تکرار رمز جدید<input required type="password" inputMode="numeric" autoComplete="new-password" maxLength={10} pattern="[0-9]{10}" dir="ltr" value={confirm} onChange={e => setConfirm(e.target.value.replace(/\\D/g, "").slice(0, 10))} className="field-input" /></label>
      <Button type="submit" disabled={busy || !username.trim() || emergencyCode.length !== 12 || password.length !== 10 || confirm.length !== 10}>{busy ? "در حال تغییر رمز…" : "تأیید کد و تغییر رمز مدیر کل"}</Button>
      <Button type="button" variant="outline" onClick={() => { setStage("request"); setError(""); setNotice(""); }}>بازیابی از طریق ایمیل</Button>
    </form>}
    {stage === "request" && <form onSubmit={requestRecovery} className="mt-6 grid gap-4">
      <label className="field-label">نام کاربری مدیر<input required autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} className="field-input" /></label>
      <Button type="submit" disabled={busy || !username.trim()}>{busy ? "در حال ارسال…" : "ارسال ایمیل بازیابی"}</Button>
      <Button type="button" variant="outline" onClick={() => { setStage("emergency"); setError(""); setNotice(""); }}>بازگشت به بازیابی اضطراری با کد</Button>
    </form>}
    {stage === "waiting" && <div className="mt-6 grid gap-4">
      <p className="text-sm text-muted-foreground">ایمیل را در همان صندوقی بررسی کنید که برای حساب مدیر ثبت شده است. اگر لینک را باز کردید و این صفحه هنوز تغییر نکرد، صفحه را یک‌بار تازه‌سازی کنید.</p>
      <Button type="button" variant="outline" disabled={busy} onClick={() => { setStage("request"); setError(""); setNotice(""); }}>درخواست دوباره ایمیل</Button>
    </div>}
    {stage === "set" && <form onSubmit={savePassword} className="mt-6 grid gap-4">
      <label className="field-label">رمز جدید (دقیقاً ۱۰ رقم)<input required type="password" inputMode="numeric" autoComplete="new-password" minLength={10} maxLength={10} pattern="[0-9]{10}" dir="ltr" value={password} onChange={e => setPassword(e.target.value.replace(/\D/g, "").slice(0, 10))} className="field-input" /></label>
      <label className="field-label">تکرار رمز جدید<input required type="password" inputMode="numeric" autoComplete="new-password" minLength={10} maxLength={10} pattern="[0-9]{10}" dir="ltr" value={confirm} onChange={e => setConfirm(e.target.value.replace(/\D/g, "").slice(0, 10))} className="field-input" /></label>
      <Button type="submit" disabled={busy || password.length !== 10 || confirm.length !== 10}>{busy ? "در حال ذخیره…" : "ذخیره رمز جدید"}</Button>
    </form>}
    {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
    {notice && <p role="status" className="mt-4 text-sm text-primary">{notice}</p>}
    <div className="mt-6 flex justify-between text-sm"><Link to="/admin-login" className="text-primary underline">ورود مدیر</Link><Link to="/" className="text-primary underline">صفحه اصلی</Link></div>
  </div></div></section>;
}
