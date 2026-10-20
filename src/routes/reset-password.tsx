import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { pageHead } from "@/lib/marketplace";

export const Route = createFileRoute("/reset-password")({
  head: () => pageHead("بازیابی رمز مدیر", "بازیابی امن حساب مدیران ترابار."),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [stage, setStage] = useState<"request" | "verify">("request");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const requestedUsername = new URLSearchParams(window.location.search).get("username")?.trim();
    if (requestedUsername) {
      setUsername(requestedUsername);
      setStage("verify");
      setNotice("کد ارسال‌شده به ایمیل ثبت‌شده مدیر را وارد کنید.");
    }
  }, []);

  async function requestCode(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    const normalized = username.normalize("NFKC").trim().replace(/\s+/g, " ");
    const { data, error: requestError } = await supabase.functions.invoke("admin-login", {
      body: { action: "reset", username: normalized },
    });
    if (requestError || data?.ok === false) {
      setError(data?.error ?? "ارسال کد انجام نشد. حساب مدیر و تنظیمات ایمیل باید بررسی شود.");
    } else {
      setUsername(normalized);
      setStage("verify");
      setNotice("اگر این نام کاربری متعلق به مدیر فعال باشد، کد به ایمیل ثبت‌شده ارسال شده است.");
    }
    setBusy(false);
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    const normalized = username.normalize("NFKC").trim().replace(/\s+/g, " ");
    if (!/^\d{8}$/.test(code)) {
      setError("کد ایمیل باید دقیقاً ۸ رقم باشد.");
      setBusy(false); return;
    }
    if (password.length < 10 || !/\p{L}/u.test(password) || !/\p{N}/u.test(password)) {
      setError("رمز جدید باید حداقل ۱۰ نویسه و شامل حروف و عدد باشد.");
      setBusy(false); return;
    }
    if (password !== confirm) {
      setError("تکرار رمز با رمز جدید یکسان نیست.");
      setBusy(false); return;
    }
    const { data, error: verifyError } = await supabase.functions.invoke("admin-login", {
      body: { action: "verify_reset", username: normalized, code, password },
    });
    if (verifyError || data?.ok !== true) {
      setError(data?.error ?? "کد نامعتبر یا منقضی شده است؛ دوباره کد بازیابی بگیرید.");
      setBusy(false); return;
    }
    setNotice("رمز جدید ذخیره شد. اکنون با رمز جدید وارد شوید.");
    setBusy(false);
    window.setTimeout(() => navigate({ to: "/admin-login" }), 1000);
  }

  return <section className="bg-market-surface py-10"><div className="site-container max-w-md"><div className="rounded-xl border border-border bg-card p-6 sm:p-8">
    <h1 className="text-2xl font-extrabold">بازیابی رمز مدیر</h1>
    {stage === "request" ? <form onSubmit={requestCode} className="mt-6 grid gap-4">
      <label className="field-label">نام کاربری مدیر<input required autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} className="field-input" /></label>
      <Button type="submit" disabled={busy || !username.trim()}>{busy ? "در حال ارسال…" : "ارسال کد ۸ رقمی"}</Button>
    </form> : <form onSubmit={savePassword} className="mt-6 grid gap-4">
      <label className="field-label">نام کاربری مدیر<input required autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} className="field-input" /></label>
      <label className="field-label">کد ۸ رقمی ایمیل<input required inputMode="numeric" autoComplete="one-time-code" dir="ltr" maxLength={8} pattern="[0-9]{8}" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))} className="field-input text-center text-lg tracking-widest" /></label>
      <label className="field-label">رمز جدید<input required type="password" autoComplete="new-password" minLength={10} dir="ltr" value={password} onChange={e => setPassword(e.target.value)} className="field-input" /></label>
      <label className="field-label">تکرار رمز جدید<input required type="password" autoComplete="new-password" minLength={10} dir="ltr" value={confirm} onChange={e => setConfirm(e.target.value)} className="field-input" /></label>
      <Button type="submit" disabled={busy || code.length !== 8}>{busy ? "در حال بررسی…" : "تأیید کد و ذخیره رمز"}</Button>
      <Button type="button" variant="outline" disabled={busy} onClick={() => { setStage("request"); setCode(""); setPassword(""); setConfirm(""); setError(""); setNotice(""); }}>ارسال کد جدید</Button>
    </form>}
    {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
    {notice && <p role="status" className="mt-4 text-sm text-primary">{notice}</p>}
    <div className="mt-6 flex justify-between text-sm"><Link to="/admin-login" className="text-primary underline">ورود مدیر</Link><Link to="/" className="text-primary underline">صفحه اصلی</Link></div>
  </div></div></section>;
}
