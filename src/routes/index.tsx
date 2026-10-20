import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  MapPinned,
  Search,
  Sprout,
  LogIn,
  Menu,
} from "lucide-react";
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
          <div className="relative isolate overflow-hidden rounded-3xl bg-emerald-950 px-5 py-8 text-white shadow-xl sm:px-9 sm:py-11 lg:px-14 lg:py-14">
            <div aria-hidden="true" className="pointer-events-none absolute -left-16 -top-24 size-72 rounded-full border-[36px] border-white/5 sm:size-96" />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 left-1/3 size-64 rounded-full bg-emerald-700/30 blur-3xl" />
            <div className="relative grid items-center gap-9 lg:grid-cols-[1.2fr_0.8fr] lg:gap-12">
              <div className="max-w-2xl">
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
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Link to="/auth" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-emerald-950 transition hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                    شروع همکاری <ArrowLeft className="size-4" />
                  </Link>
                  <Link to="/requests" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                    جست‌وجوی بار <Search className="size-4" />
                  </Link>
                </div>
                <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs text-emerald-100/90">
                  <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-4" /> مسیرهای مجزا برای هر نقش</span>
                  <span className="inline-flex items-center gap-1.5"><MapPinned className="size-4" /> توجه به شهر و محدوده دسترسی</span>
                </div>
              </div>

              <div className="relative mx-auto w-full max-w-sm">
                <Link
                  to="/auth"
                  className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-lime-300 px-10 text-lg font-extrabold text-emerald-950 shadow-lg transition hover:bg-lime-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  مرحله بعد <ArrowLeft className="size-5" />
                </Link>
                <div className="absolute -bottom-4 -left-3 -z-10 size-24 rounded-2xl bg-lime-300/20 blur-xl" />
              </div>
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
