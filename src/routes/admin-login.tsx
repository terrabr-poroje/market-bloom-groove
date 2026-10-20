/* eslint-disable @typescript-eslint/no-explicit-any -- Admin role lookup uses the audited production Supabase schema. */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { KeyRound, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { pageHead } from "@/lib/marketplace";

export const Route = createFileRoute("/admin-login")({
  head: () => pageHead("ورود مدیران ترابار", "ورود امن مدیر کل و مدیران شهر ترابار."),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(""); setNotice("");
    const { data, error: loginError } = await supabase.functions.invoke("admin-login", {
      body: { action: "login", username: username.normalize("NFKC").trim().replace(/\s+/g, " "), password },
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
    setNotice(adminRecord.admin_role === "main_admin" ? "ورود مدیر کل تأیید شد." : "ورود مدیر شهر تأیید شد.");
    setBusy(false);
    await navigate({ to: "/admin" });
  }

  async function resetPassword() {
    const normalized = username.normalize("NFKC").trim().replace(/\s+/g, " ");
    if (!normalized) { setError("نام کاربری مدیر را وارد کنید."); return; }
    setBusy(true); setError(""); setNotice("");
    const { data, error: resetError } = await supabase.functions.invoke("admin-login", {
      body: { action: "reset", username: normalized },
    });
    if (resetError || data?.ok === false) {
      setError(data?.error ?? "ارسال کد انجام نشد. حساب مدیر و تنظیمات ایمیل باید بررسی شود.");
      setBusy(false); return;
    }
    window.location.href = `/reset-password?username=${encodeURIComponent(normalized)}`;
  }

  return (
    <section className="bg-market-surface py-10">
      <div className="site-container max-w-md">
        <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
          <div className="mb-5 flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-xl bg-accent text-primary"><ShieldCheck className="size-6" /></div>
            <h1 className="text-2xl font-extrabold">ورود مدیران ترابار</h1>
          </div>
          <form onSubmit={submit} className="grid gap-4">
            <label className="field-label">نام کاربری
              <input required autoComplete="username" value={username} onChange={e => setUsername(e.target.value)} className="field-input" />
            </label>
            <label className="field-label">رمز عبور
              <input required type="password" autoComplete="current-password" minLength={10} value={password} onChange={e => setPassword(e.target.value)} className="field-input" dir="ltr" />
            </label>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            {notice && <p role="status" className="text-sm text-primary">{notice}</p>}
            <Button type="submit" disabled={busy}>{busy ? "در حال بررسی…" : "ورود به پنل مدیریت"}<KeyRound className="mr-2 size-4" /></Button>
            <Button type="button" variant="outline" disabled={busy || !username.trim()} onClick={resetPassword}>{busy ? "در حال ارسال…" : "بازیابی رمز"}</Button>
          </form>
          <div className="mt-5 flex justify-between text-sm"><Link to="/auth" className="text-primary underline">ورود کاربران</Link><Link to="/" className="text-primary underline">صفحه اصلی</Link></div>
        </div>
      </div>
    </section>
  );
}
