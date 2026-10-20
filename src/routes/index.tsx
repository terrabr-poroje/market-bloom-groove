import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Menu, Sprout } from "lucide-react";
import { pageHead } from "@/lib/marketplace";

export const Route = createFileRoute("/")({
  head: () =>
    pageHead(
      "ترابار | بازار میوه و تره‌بار ایران",
      "ترابار؛ مسیر ارتباط باغدار، کشاورز، تأمین‌کننده، بارفروش و خریدار."
    ),
  component: Index,
});

function Index() {
  return (
    <main dir="rtl" className="overflow-hidden bg-background">
      <section className="relative isolate">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-emerald-50 via-background to-background dark:from-emerald-950/30" />
        <div className="site-container py-8 sm:py-14 lg:py-20">
          <div className="relative overflow-hidden rounded-[2rem] border border-emerald-900/10 bg-white shadow-xl shadow-emerald-950/5 dark:border-emerald-100/10 dark:bg-card">
            <div aria-hidden="true" className="pointer-events-none absolute -left-20 -top-20 size-64 rounded-full bg-emerald-200/50 blur-3xl dark:bg-emerald-700/20" />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 right-1/3 size-72 rounded-full bg-lime-200/40 blur-3xl dark:bg-lime-700/10" />
            <div className="relative mx-auto flex max-w-4xl flex-col items-center px-5 py-12 text-center sm:px-10 sm:py-16 lg:px-16 lg:py-20">
              <div className="mb-6 grid size-16 place-items-center rounded-2xl bg-emerald-800 text-lime-200 shadow-lg shadow-emerald-900/20">
                <Sprout className="size-9" aria-hidden="true" />
              </div>
              <p className="text-sm font-extrabold tracking-[0.18em] text-emerald-800 dark:text-emerald-300">TERRABAR <span className="mx-1 text-muted-foreground">|</span> ترابار</p>
              <h1 className="mt-4 text-3xl font-black leading-relaxed text-foreground sm:text-4xl lg:text-5xl">
                بازار میوه و تره‌بار ایران
              </h1>
              <p className="mt-5 max-w-2xl text-sm leading-8 text-muted-foreground sm:text-base">
                از باغ تا بازار، در یک مسیر مطمئن؛ برای باغداران، کشاورزان، تأمین‌کنندگان، بارفروشان و خریداران.
              </p>
              <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
                <Link
                  to="/auth"
                  className="inline-flex min-h-14 items-center justify-center gap-3 rounded-xl bg-emerald-800 px-6 py-4 text-base font-extrabold text-white shadow-lg shadow-emerald-900/15 transition hover:bg-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
                >
                  مرحله بعد
                  <ArrowLeft className="size-5" aria-hidden="true" />
                </Link>
                <p className="text-xs leading-6 text-muted-foreground">
                  در مرحله بعد می‌توانید وارد حساب شوید یا ثبت‌نام کنید.
                </p>
              </div>
              <div className="mt-10 grid w-full max-w-2xl gap-3 border-t border-border pt-7 text-right sm:grid-cols-3">
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-700 dark:text-emerald-400" />
                  <span>ثبت‌نام و ورود یکپارچه</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-700 dark:text-emerald-400" />
                  <span>مناسب فعالان بازار</span>
                </div>
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-emerald-700 dark:text-emerald-400" />
                  <span>دسترسی بر اساس نقش و شهر</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-background pb-8">
        <div className="site-container flex justify-center">
          <details className="group relative w-full max-w-md">
            <summary className="flex cursor-pointer list-none items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground shadow-sm transition hover:bg-accent [&::-webkit-details-marker]:hidden">
              <Menu className="size-4" aria-hidden="true" />
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
    </main>
  );
}
