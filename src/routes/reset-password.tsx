import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
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

  // Accept both Supabase recovery links and the 8-digit recovery OTP.
  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const urlError = params.get("error_description") ?? hash.get("error_description");
    if (urlError) setError("لینک بازیابی معتبر نیست یا منقضی شده است. از صفحه ورود مدیر دوباره درخواست بازیابی کنید.");

    const tokenHash = params.get("token_hash");
    const tokenType = params.get("type");
    if (tokenHash && tokenType === "recovery") {
      setBusy(true);
      supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" }).then(({ error: verifyError }) => {
        if (!active) return;
        if (verifyError) {
          setError("لینک بازیابی معتبر نیست یا منقضی شده است. دوباره درخواست بازیابی کنید.");
        } else {
          setStage("password");
          setNotice("هویت شما از طریق لینک ایمیل تأیید شد. رمز جدید حداقل ۱۰ نویسه‌ای بسازید.");
        }
        setBusy(false);
      });
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" && active) {
        setStage("password");
        setNotice("لینک بازیابی تأیید شد. اکنون رمز جدید حداقل ۱۰ نویسه‌ای بسازید.");
      }
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  async function requestCode(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    const normalized = email.trim().toLowerCase();
    const { error: sendError } = await supabase.auth.resetPasswordForEmail(normalized, {
      redirectTo: "https://terrabar.ir/reset-password",
    });
    if (sendError) {
      setError(/after (\d+) seconds/i.test(sendError.message) ? "برای امنیت، کمی پیش درخواست بازیابی ارسال شده است. لطفاً حدود ۲۰ ثانیه صبر کنید و فقط یک بار دیگر تلاش کنید." : "ارسال ایمیل بازیابی انجام نشد. تنظیمات SMTP و قالب Recovery در Supabase باید بررسی شود.");
    } else {
      setEmail(normalized);
      setStage("verify");
      setNotice("کد تأیید ایمیل جدا از رمز جدید است. کد ۸ رقمی را در مرحله بعد وارد کنید؛ سپس رمز جدیدی با حداقل ۱۰ نویسه بسازید.");
    }
    setBusy(false);
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    if (!/^\d{8}$/.test(code.trim())) {
      setError("کد ایمیل باید دقیقاً ۸ رقم باشد؛ این کد با رمز جدید متفاوت است.");
      setBusy(false); return;
    }
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(), token: code.trim(), type: "recovery",
    });
    if (verifyError) {
      setError("کد بازیابی معتبر نیست یا منقضی شده است. کد جدید درخواست کنید.");
    } else {
      setStage("password");
      setNotice("کد ایمیل تأیید شد. اکنون رمز جدید را وارد کنید؛ رمز باید حداقل ۱۰ نویسه داشته باشد و خودِ کد ایمیل نیست.");
    }
    setBusy(false);
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    if (password.length < 10) {
      setError("رمز جدید باید دست‌کم ۱۰ نویسه داشته باشد؛ لازم نیست با کد ۸ رقمی ایمیل یکسان باشد.");
      setBusy(false); return;
    }
    if (password !== confirm) {
      setError("تکرار رمز با رمز جدید یکسان نیست.");
      setBusy(false); return;
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
    <p className="mt-2 text-sm leading-6 text-muted-foreground">کد ۸ رقمی ایمیل فقط برای تأیید هویت است. رمز جدید مدیر باید حداقل ۱۰ نویسه داشته باشد؛ این دو را با هم اشتباه نگیرید.</p>
    {stage === "request" && <form onSubmit={requestCode} className="mt-6 grid gap-4">
      <label className="field-label">ایمیل حساب<input required type="email" autoComplete="email" dir="ltr" value={email} onChange={e => setEmail(e.target.value)} className="field-input text-left" placeholder="name@example.com" /></label>
      <Button type="submit" disabled={busy}>{busy ? "در حال ارسال…" : "ارسال کد بازیابی"}</Button>
    </form>}
    {stage === "verify" && <form onSubmit={verifyCode} className="mt-6 grid gap-4">
      <p className="text-sm">کد ۸ رقمی ارسال‌شده به {email} را وارد کنید. این کد رمز جدید نیست.</p>
      <label className="field-label">کد ۸ رقمی ایمیل<input required inputMode="numeric" autoComplete="one-time-code" dir="ltr" minLength={8} maxLength={8} pattern="[0-9]{8}" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))} className="field-input text-center text-lg tracking-widest" /></label>
      <Button type="submit" disabled={busy || code.length !== 8}>{busy ? "در حال بررسی…" : "تأیید کد ایمیل"}</Button>
      <Button type="button" variant="outline" disabled={busy} onClick={() => { setStage("request"); setCode(""); setError(""); setNotice(""); }}>ارسال دوباره / تغییر ایمیل</Button>
    </form>}
    {stage === "password" && <form onSubmit={savePassword} className="mt-6 grid gap-4">
      <label className="field-label">رمز جدید (حداقل ۱۰ نویسه، جدا از کد ایمیل)<input required type="password" autoComplete="new-password" minLength={10} dir="ltr" value={password} onChange={e => setPassword(e.target.value)} className="field-input" /></label>
      <label className="field-label">تکرار رمز جدید<input required type="password" autoComplete="new-password" minLength={10} dir="ltr" value={confirm} onChange={e => setConfirm(e.target.value)} className="field-input" /></label>
      <Button type="submit" disabled={busy}>{busy ? "در حال ذخیره…" : "ذخیره رمز جدید"}</Button>
    </form>}
    {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
    {notice && <p role="status" className="mt-4 text-sm text-primary">{notice}</p>}
    <div className="mt-6 flex justify-between text-sm"><Link to="/auth" className="text-primary underline">ورود کاربران</Link><Link to="/admin-login" className="text-primary underline">ورود مدیر</Link></div>
  </div></div></section>;
}
