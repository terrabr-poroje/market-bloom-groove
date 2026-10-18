import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { pageHead } from "@/lib/marketplace";

export const Route = createFileRoute("/reset-password")({
  head: () => pageHead("بازیابی رمز عبور", "بازیابی امن رمز با کد یک‌بارمصرف ایمیل."),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [stage, setStage] = useState<"request" | "verify" | "password">("request");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function requestCode(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    const normalized = email.trim().toLowerCase();
    const { error: sendError } = await supabase.auth.resetPasswordForEmail(normalized, {
      redirectTo: "https://terrabar.ir/reset-password",
    });
    if (sendError) {
      setError("ارسال کد بازیابی انجام نشد. تنظیمات ایمیل و قالب Recovery در Supabase باید بررسی شود.");
    } else {
      setEmail(normalized);
      setStage("verify");
      setNotice("اگر این ایمیل به حسابی در ترابار متصل باشد، پیام بازیابی ارسال می‌شود. صندوق ورودی و هرزنامه را بررسی کنید.");
    }
    setBusy(false);
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(), token: code.trim(), type: "recovery",
    });
    if (verifyError) {
      setError("کد بازیابی معتبر نیست یا منقضی شده است. کد جدید درخواست کنید.");
    } else {
      setStage("password");
      setNotice("کد تأیید شد. اکنون رمز جدید را تعیین کنید.");
    }
    setBusy(false);
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    if (password.length < 10) {
      setError("رمز باید دست‌کم ۱۰ نویسه داشته باشد."); setBusy(false); return;
    }
    if (password !== confirm) {
      setError("تکرار رمز با رمز جدید یکسان نیست."); setBusy(false); return;
    }
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError("ذخیره رمز انجام نشد؛ ممکن است نشست بازیابی منقضی شده باشد. دوباره کد بگیرید.");
      setBusy(false); return;
    }
    await supabase.auth.signOut();
    setNotice("رمز جدید با موفقیت ذخیره شد. اکنون می‌توانید وارد شوید.");
    setBusy(false);
    window.setTimeout(() => navigate({ to: "/auth" }), 900);
  }

  return <section className="bg-market-surface py-12"><div className="site-container max-w-md"><div className="rounded-xl border border-border bg-card p-6 sm:p-8">
    <h1 className="text-2xl font-extrabold">بازیابی رمز عبور</h1>
    <p className="mt-2 text-sm leading-6 text-muted-foreground">کد عددی فقط به ایمیل ثبت‌شده حساب ارسال می‌شود. این صفحه برای کاربران و مدیران ترابار است.</p>
    {stage === "request" && <form onSubmit={requestCode} className="mt-6 grid gap-4">
      <label className="field-label">ایمیل حساب<input required type="email" autoComplete="email" dir="ltr" value={email} onChange={e => setEmail(e.target.value)} className="field-input text-left" placeholder="name@example.com" /></label>
      <Button type="submit" disabled={busy}>{busy ? "در حال ارسال…" : "ارسال کد بازیابی"}</Button>
    </form>}
    {stage === "verify" && <form onSubmit={verifyCode} className="mt-6 grid gap-4">
      <p className="text-sm">کد ارسال‌شده به {email} را وارد کنید.</p>
      <label className="field-label">کد عددی<input required inputMode="numeric" autoComplete="one-time-code" dir="ltr" minLength={6} maxLength={10} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, ""))} className="field-input text-center text-lg tracking-widest" /></label>
      <Button type="submit" disabled={busy || code.length < 6}>{busy ? "در حال بررسی…" : "تأیید کد"}</Button>
      <Button type="button" variant="outline" disabled={busy} onClick={() => { setStage("request"); setCode(""); setError(""); setNotice(""); }}>ارسال دوباره / تغییر ایمیل</Button>
    </form>}
    {stage === "password" && <form onSubmit={savePassword} className="mt-6 grid gap-4">
      <label className="field-label">رمز جدید<input required type="password" autoComplete="new-password" minLength={10} dir="ltr" value={password} onChange={e => setPassword(e.target.value)} className="field-input" /></label>
      <label className="field-label">تکرار رمز جدید<input required type="password" autoComplete="new-password" minLength={10} dir="ltr" value={confirm} onChange={e => setConfirm(e.target.value)} className="field-input" /></label>
      <Button type="submit" disabled={busy}>{busy ? "در حال ذخیره…" : "ذخیره رمز جدید"}</Button>
    </form>}
    {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
    {notice && <p role="status" className="mt-4 text-sm text-primary">{notice}</p>}
    <div className="mt-6 flex justify-between text-sm"><Link to="/auth" className="text-primary underline">ورود کاربران</Link><Link to="/admin-login" className="text-primary underline">ورود مدیر</Link></div>
  </div></div></section>;
}
