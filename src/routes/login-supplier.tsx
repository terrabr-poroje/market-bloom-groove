import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/login-supplier")({
  head: () => ({ meta: [{ title: "صفحه ورود کاربران تأمین‌کننده | ترابار" }, { name: "description", content: "صفحه ورود کاربران تأمین‌کننده با ورود یک‌بارمصرف ترابار." }] }),
  component: RoleLoginEntry,
});

function RoleLoginEntry() {
  useEffect(() => {
    window.location.replace("/auth?role=supplier");
  }, []);

  return (
    <main dir="rtl" className="site-container max-w-xl py-12 text-center">
      <div className="rounded-xl border border-border bg-card p-8">
        <h1 className="text-2xl font-extrabold">صفحه ورود کاربران تأمین‌کننده</h1>
        <p className="mt-3 text-sm text-muted-foreground">در حال بازکردن صفحه ورود اختصاصی ترابار…</p>
        <a className="mt-5 inline-block text-primary underline" href="/auth?role=supplier">اگر صفحه خودکار باز نشد، اینجا بزنید</a>
      </div>
    </main>
  );
}
