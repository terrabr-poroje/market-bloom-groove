/* eslint-disable @typescript-eslint/no-explicit-any -- Admin role lookup uses the audited production Supabase schema. */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { KeyRound, ShieldCheck, MapPinned, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { pageHead } from "@/lib/marketplace";

export const Route = createFileRoute("/admin-login")({
  head: () => pageHead("حساب مدیران ترابار", "انتخاب نوع مدیریت و ورود امن مدیر کل یا مدیر شهر و استان."),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const requestedRole = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("role") : null;
  const selectedRole = requestedRole === "main_admin" || requestedRole === "city_manager" ? requestedRole : null;
  const roleTitle = selectedRole === "main_admin" ? "مدیر کل" : "مدیر شهر یا استان";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    const { data, error: loginError } = await supabase.functions.invoke("admin-login", {
      body: { action: "login", username: username.normalize("NFKC").trim().replace(/\\s+/g, " "), password },
    });
    if (loginError || !data?.session?.access_token || !data?.session?.refresh_token) {
      setError(data?.error ?? "ورود انجام نشد؛ نام کاربری و رمز را بررسی کنید.");
      setBusy(false); return;
    }
    const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
    if (sessionError || !sessionData.user) {
      setError("ورود امن برقرار نشد. دوباره تلاش کنید.");
      setBusy(false); return;
    }
    const { data: adminRecord, error: adminError } = await (supabase as any)
      .from("admin_users").select("admin_role, is_active")
      .eq("auth_user_id", sessionData.user.id).eq("is_active", true).maybeSingle();
    if (adminError || !adminRecord || !["main_admin", "city_manager"].includes(adminRecord.admin_role)) {
      await supabase.auth.signOut();
      setError("این حساب مدیر فعال ترابار نیست.");
      setBusy(false); return;
    }
    if (selectedRole && adminRecord.admin_role !== selectedRole) {
      await supabase.auth.signOut();
      setError(`این حساب متعلق به ${adminRecord.admin_role === "main_admin" ? "مدیر کل" : "مدیر شهر یا استان"} است؛ از مسیر درست وارد شوید.`);
      setBusy(false); return;
    }
    setNotice(adminRecord.admin_role === "main_admin" ? "ورود مدیر کل تأیید شد." : "ورود مدیر شهر تأیید شد.");
    setBusy(false);
    await navigate({ to: "/admin" });
  }

  async function resetPassword() {
    setBusy(true); setError(""); setNotice("");
    const { data, error: resetError } = await supabase.functions.invoke("admin-login", {
      body: { action: "reset", username: username.normalize("NFKC").trim().replace(/\\s+/g, " ") },
    });
    if (resetError) {
      setError("ارتباط با سرویس بازیابی رمز برقرار نشد. دوباره تلاش کنید؛ اگر ادامه داشت، گزارش خطای سرویس باید بررسی شود.");
    } else if (data?.ok === false) {
      setError(data.error ?? "ارسال ایمیل بازیابی انجام نشد. تنظیمات ایمیل و آدرس بازگشت را بررسی کنید.");
    } else {
      setNotice(data?.message ?? "اگر نام کاربری متعلق به مدیر فعال باشد، لینک تنظیم رمز ارسال می‌شود.");
    }
    setBusy(false);
  }

  if (!selectedRole) {
    return (
      <section className="bg-market-surface px-4 py-12">
        <div className="site-container max-w-2xl">
          <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
            <div className="mb-6 text-center">
              <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-accent text-primary"><ShieldCheck className="size-7" /></div>
              <h1 className="mt-4 text-2xl font-extrabold">حساب مدیران ترابار</h1>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">نوع حساب مدیریتی خود را انتخاب کنید.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <a href="/admin-login?role=main_admin" className="group flex min-h-36 items-center gap-4 rounded-xl border border-border bg-background p-5 transition hover:border-primary/50 hover:shadow-sm">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-800"><ShieldCheck className="size-6" /></span>
                <span className="flex-1"><strong className="block text-lg">مدیر کل</strong><span className="mt-1 block text-sm leading-6 text-muted-foreground">مدیریت سراسری ترابار</span></span>
                <ArrowLeft className="size-4 text-muted-foreground transition group-hover:-translate-x-1" />
              </a>
              <a href="/admin-login?role=city_manager" className="group flex min-h-36 items-center gap-4 rounded-xl border border-border bg-background p-5 transition hover:border-primary/50 hover:shadow-sm">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-lime-100 text-lime-800"><MapPinned className="size-6" /></span>
                <span className="flex-1"><strong className="block text-lg">مدیر شهر یا استان</strong><span className="mt-1 block text-sm leading-6 text-muted-foreground">مدیریت محدوده تخصیص‌یافته</span></span>
                <ArrowLeft className="size-4 text-muted-foreground transition group-hover:-translate-x-1" />
              </a>
            </div>
            <div className="mt-6 text-center"><Link to="/" className="text-sm text-primary underline">بازگشت به صفحه اصلی</Link></div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-market-surface py-12">
      <div className="site-container max-w-md">
        <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-xl bg-accent text-primary"><ShieldCheck className="size-6" /></div>
            <div><h1 className="text-2xl font-extrabold">ورود {roleTitle}</h1><p className="mt-1 text-sm text-muted-foreground">ورود امن به حساب مدیریتی ترابار</p></div>
          </div>
          <form onSubmit={submit} className="grid gap-4">
            <label className="field-label">نام کاربری
              <input required autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} className="field-input" placeholder="نام کاربری مدیر" />
            </label>
            <label className="field-label">رمز عبور
              <input required type="password" autoComplete="current-password" minLength={10} value={password} onChange={e => setPassword(e.target.value)} className="field-input" placeholder="حداقل ۱۰ نویسه" dir="ltr" />
            </label>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            {notice && <p role="status" className="text-sm text-primary">{notice}</p>}
            <Button type="submit" disabled={busy}>{busy ? "در حال بررسی…" : "ورود به پنل مدیریت"}<KeyRound className="mr-2 size-4" /></Button>
            <Button type="button" variant="outline" disabled={busy || !username.trim()} onClick={resetPassword}>ارسال کد / بازیابی رمز</Button>
            <Link to="/reset-password" className="text-center text-sm text-primary underline">کد ۸ رقمی را دریافت کرده‌ام؛ تأیید و تنظیم رمز جدید</Link>
          </form>
          <p className="mt-4 text-xs leading-6 text-muted-foreground">نوع حساب و فعال‌بودن سمت مدیریتی از پایگاه داده بررسی می‌شود؛ انتخاب این صفحه به‌تنهایی هیچ دسترسی‌ای ایجاد نمی‌کند.</p>
          <div className="mt-5 flex justify-between text-sm"><a href="/admin-login" className="text-primary underline">انتخاب نوع مدیریت</a><Link to="/" className="text-primary underline">صفحه اصلی</Link></div>
        </div>
      </div>
    </section>
  );
}
