import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/login-seller")({
  head: () => ({ meta: [{ title: "صفحه ورود کاربران بارفروش | ترابار" }, { name: "description", content: "صفحه ورود کاربران بارفروش با ورود یک‌بارمصرف ترابار." }] }),
  component: RoleLoginEntry,
});

function RoleLoginEntry() {
  useEffect(() => {
    window.location.replace("/auth?role=seller");
  }, []);

  return (
    <main dir="rtl" className="site-container max-w-xl py-12 text-center">
      <div className="rounded-xl border border-border bg-card p-8">
        <h1 className="text-2xl font-extrabold">صفحه ورود کاربران بارفروش</h1>
        <p className="mt-3 text-sm text-muted-foreground">در حال بازکردن صفحه ورود اختصاصی ترابار…</p>
        <a className="mt-5 inline-block text-primary underline" href="/auth?role=seller">اگر صفحه خودکار باز نشد، اینجا بزنید</a>
      </div>
    </main>
  );
}
