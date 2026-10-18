import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRightLeft, ArrowLeft, UserRound } from "lucide-react";
import { pageHead } from "@/lib/marketplace";

export const Route = createFileRoute("/seller-accounting-preview")({
  head: () => pageHead("گردش حساب‌های من | ترابار", "پیش‌نمایش بخش گردش حساب بارفروش ترابار."),
  component: SellerAccountingPreviewPage,
});

function SellerAccountingPreviewPage() {
  return (
    <section dir="rtl" className="min-h-[70vh] bg-market-surface px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <header className="rounded-3xl bg-emerald-950 px-5 py-7 text-white shadow-lg sm:px-8 sm:py-9">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-emerald-50"><UserRound className="size-4" /> TERRABAR | ترابار</span>
          <h1 className="mt-3 text-2xl font-black leading-relaxed sm:text-3xl">گردش حساب‌های من</h1>
          <p className="mt-2 text-sm leading-7 text-emerald-50/90">پیش‌نمایش بخش مالی حساب بارفروش.</p>
        </header>
        <div className="mt-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3">
            <span className="grid size-14 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-800"><ArrowRightLeft className="size-7" /></span>
            <div>
              <h2 className="font-extrabold text-foreground">گردش مالی بارفروش</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">این بخش برای نمایش دریافتی‌ها، پرداختی‌ها، کارمزدها و سوابق تراکنش‌ها در نظر گرفته شده است.</p>
            </div>
          </div>
          <p className="mt-5 rounded-xl bg-muted/50 p-4 text-sm leading-7 text-muted-foreground">در حال حاضر این صفحه صرفاً پیش‌نمایش چیدمان است و به تراکنش‌ها یا اطلاعات مالی واقعی متصل نیست. مبالغ و سابقه مالی تا زمان طراحی و تأیید جزئیات نمایش داده نمی‌شوند.</p>
        </div>
        <Link to="/seller-account-preview" className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90">بازگشت به حساب بارفروش <ArrowLeft className="size-4" /></Link>
      </div>
    </section>
  );
}
