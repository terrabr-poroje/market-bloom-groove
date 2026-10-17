import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { pageHead } from "@/lib/marketplace";

export const Route = createFileRoute("/admin-reset-password")({
  head: () => pageHead("تنظیم رمز مدیر", "تنظیم یا تغییر رمز عبور مدیر ترابار."),
  component: AdminResetPasswordPage,
});

function AdminResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(""); setNotice("");
    if (password.length < 10) { setError("رمز عبور باید دست‌کم ۱۰ نویسه داشته باشد."); setBusy(false); return; }
    if (password !== confirm) { setError("تکرار رمز عبور با رمز اصلی یکسان نیست."); setBusy(false); return; }
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { setError("ابتدا از لینک معتبر ارسال‌شده به ایمیل مدیر وارد این صفحه شوید."); setBusy(false); return; }
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) { setError("تغییر رمز انجام نشد؛ لینک ممکن است منقضی شده باشد."); setBusy(false); return; }
    setNotice("رمز عبور تغییر کرد. اکنون با نام کاربری و رمز جدید وارد شوید.");
    await supabase.auth.signOut();
    setBusy(false);
    window.setTimeout(() => navigate({ to: "/admin-login" }), 900);
  }

  return <section className="bg-market-surface py-12"><div className="site-container max-w-md"><div className="rounded-xl border border-border bg-card p-6 sm:p-8">
    <h1 className="text-2xl font-extrabold">تنظیم رمز مدیر</h1>
    <p className="mt-2 text-sm leading-6 text-muted-foreground">این صفحه فقط با لینک امن بازیابی ارسال‌شده به ایمیل ثبت‌شده مدیر قابل استفاده است.</p>
    <form onSubmit={submit} className="mt-6 grid gap-4">
      <label className="field-label">رمز عبور جدید<input required type="password" minLength={10} autoComplete="new-password" dir="ltr" value={password} onChange={e => setPassword(e.target.value)} className="field-input" /></label>
      <label className="field-label">تکرار رمز عبور<input required type="password" minLength={10} autoComplete="new-password" dir="ltr" value={confirm} onChange={e => setConfirm(e.target.value)} className="field-input" /></label>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}{notice && <p role="status" className="text-sm text-primary">{notice}</p>}
      <Button type="submit" disabled={busy}>{busy ? "در حال ذخیره…" : "ذخیره رمز جدید"}</Button>
    </form>
    <Link to="/admin-login" className="mt-5 inline-block text-sm text-primary underline">بازگشت به ورود مدیر</Link>
  </div></div></section>;
}
