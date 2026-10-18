import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/login-buyer")({
  head: () => ({ meta: [{ title: "صفحه ورود کاربران خریدار | ترابار" }, { name: "description", content: "صفحه ورود کاربران خریدار با ورود یک‌بارمصرف ترابار." }] }),
  component: RoleLoginEntry,
});

function RoleLoginEntry() {
  useEffect(() => {
    window.location.replace("/auth?role=buyer");
  }, []);

  return (
    <main dir="rtl" className="site-container max-w-xl py-12 text-center">
      <div className="rounded-xl border border-border bg-card p-8">
        <h1 className="text-2xl font-extrabold">صفحه ورود کاربران خریدار</h1>
        <p className="mt-3 text-sm text-muted-foreground">در حال بازکردن صفحه ورود اختصاصی ترابار…</p>
        <a className="mt-5 inline-block text-primary underline" href="/auth?role=buyer">اگر صفحه خودکار باز نشد، اینجا بزنید</a>
      </div>
    </main>
  );
}
