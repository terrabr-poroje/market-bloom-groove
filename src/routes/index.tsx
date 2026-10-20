import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Menu, Sprout } from "lucide-react";
import { pageHead } from "@/lib/marketplace";

export const Route = createFileRoute("/")({
  head: () =>
    pageHead(
      "ترابار | بازار میوه و تره‌بار ایران",
      "ترابار؛ بستری برای معرفی بار، درخواست خرید و همکاری فعالان بازار میوه و تره‌بار."
    ),
  component: Index,
});

function Index() {
  return (
    <div className="overflow-hidden">
      <section className="relative bg-market-surface">
        <div className="site-container py-8 sm:py-12 lg:py-16">
          <div className="relative isolate overflow-hidden rounded-3xl bg-emerald-950 px-5 py-10 text-white shadow-xl sm:px-9 sm:py-14 lg:px-14 lg:py-20">
            <div aria-hidden="true" className="pointer-events-none absolute -left-16 -top-24 size-72 rounded-full border-[36px] border-white/5 sm:size-96" />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 left-1/3 size-64 rounded-full bg-emerald-700/30 blur-3xl" />
            <div className="relative mx-auto flex max-w-3xl flex-col items-center text-center">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-emerald-50">
                <Sprout className="size-4" />
                از باغ تا بازار، در یک مسیر
              </div>
              <p className="text-sm font-bold tracking-wide text-emerald-200">TERRABAR <span className="mx-1 text-white/40">|</span> ترابار</p>
              <h1 className="mt-3 text-3xl font-black leading-relaxed sm:text-4xl lg:text-5xl">بازار میوه و تره‌بار ایران</h1>
              <p className="mt-4 max-w-xl text-sm leading-8 text-emerald-50/90 sm:text-base">
                بستری برای ارتباط باغدار، کشاورز، تأمین‌کننده، بارفروش و خریدار؛
                برای معرفی بار و پیدا کردن محصول موردنیاز بازار.
              </p>
              <Link
                to="/auth"
                className="mt-8 inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-white px-8 py-3 text-sm font-extrabold text-emerald-950 shadow-lg transition hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                مرحله بعد
                <ArrowLeft className="size-4" />
              </Link>
              <p className="mt-4 text-xs leading-6 text-emerald-100/75">
                در مرحله بعد می‌توانید وارد حساب خود شوید یا ثبت‌نام کنید.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-background py-3 sm:py-4">
        <div className="site-container flex justify-center">
          <details className="group relative w-full max-w-md">
            <summary className="flex cursor-pointer list-none items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground shadow-sm transition hover:bg-accent [&::-webkit-details-marker]:hidden">
              <Menu className="size-4" />
              راهنما و پشتیبانی
            </summary>
            <div className="mt-2 grid gap-1 rounded-xl border border-border bg-card p-2 shadow-sm">
              <Link to="/guide" className="rounded-lg px-3 py-3 text-sm font-medium hover:bg-secondary">راهنمای استفاده از سایت</Link>
              <Link to="/contact" className="rounded-lg px-3 py-3 text-sm font-medium hover:bg-secondary">ارتباط با پشتیبانی</Link>
              <Link to="/rules" className="rounded-lg px-3 py-3 text-sm font-medium hover:bg-secondary">قوانین و حریم خصوصی</Link>
            </div>
          </details>
        </div>
      </section>
    </div>
  );
}
