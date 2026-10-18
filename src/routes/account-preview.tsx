import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BadgeCheck, Clock3, MapPin, Package, ShieldCheck, UserRound } from "lucide-react";
import { pageHead } from "@/lib/marketplace";

export const Route = createFileRoute("/account-preview")({
  head: () => pageHead("پیش‌نمایش حساب کاربری | ترابار", "پیش‌نمایش طراحی بخش حساب کاربری ترابار."),
  component: AccountPreviewPage,
});

function AccountPreviewPage() {
  return (
    <section dir="rtl" className="min-h-[70vh] bg-market-surface px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <header className="relative mb-6 overflow-hidden rounded-3xl bg-emerald-950 px-5 py-7 text-white shadow-lg sm:px-8 sm:py-9">
          <div aria-hidden="true" className="pointer-events-none absolute -left-12 -top-16 size-48 rounded-full border-[22px] border-white/5 sm:size-64" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-emerald-50">
              <UserRound className="size-4" /> TERRABAR | ترابار
            </span>
            <h1 className="mt-3 text-2xl font-black leading-relaxed sm:text-3xl">حساب کاربری</h1>
            <p className="mt-2 text-sm leading-7 text-emerald-50/90">اطلاعات حساب، وضعیت عضویت و فعالیت‌های شما در ترابار.</p>
          </div>
        </header>

        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-300/70 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
          <ShieldCheck className="mt-0.5 size-5 shrink-0" />
          <p><strong>پیش‌نمایش طراحی:</strong> اطلاعات این صفحه نمونه هستند و از حساب واقعی خوانده نمی‌شوند.</p>
        </div>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-4">
            <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-800">
              <UserRound className="size-8" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-extrabold text-foreground">نام و نام خانوادگی کاربر</h2>
              <p className="mt-1 text-sm text-muted-foreground">شماره تماس ثبت‌شده: ۰۹۱۲ *** **۴۵</p>
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-foreground">
                <BadgeCheck className="size-3.5" /> حساب کاربری فعال
              </span>
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-muted/50 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="size-4" /> شهر فعالیت</div>
              <p className="mt-2 font-bold text-foreground">کرج، البرز</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Clock3 className="size-4" /> وضعیت عضویت حرفه‌ای</div>
              <p className="mt-2 font-bold text-foreground">در انتظار تأیید مدیر</p>
            </div>
          </div>
          <button type="button" className="mt-4 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-bold text-foreground transition hover:bg-secondary">
            ویرایش اطلاعات حساب
          </button>
        </section>

        <h2 className="mb-3 mt-7 text-lg font-extrabold text-foreground">مدیریت حساب و فعالیت‌ها</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-lime-50 text-lime-800"><Package className="size-6" /></span>
            <span className="min-w-0 flex-1"><strong className="block text-sm">سفارش‌ها و خریدهای من</strong><span className="mt-1 block text-xs leading-5 text-muted-foreground">پیگیری درخواست‌ها و وضعیت سفارش</span></span>
            <ArrowLeft className="size-4 shrink-0 text-muted-foreground" />
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-800"><ShieldCheck className="size-6" /></span>
            <span className="min-w-0 flex-1"><strong className="block text-sm">درخواست عضویت</strong><span className="mt-1 block text-xs leading-5 text-muted-foreground">مشاهده و پیگیری تأیید نقش‌ها</span></span>
            <ArrowLeft className="size-4 shrink-0 text-muted-foreground" />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link to="/member-home" className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90">
            بازگشت به صفحه اصلی کاربران <ArrowLeft className="size-4" />
          </Link>
          <Link to="/membership" className="inline-flex min-h-12 flex-1 items-center justify-center rounded-xl border border-border bg-card px-4 py-3 text-sm font-bold text-foreground transition hover:bg-secondary">
            مشاهده صفحه درخواست عضویت
          </Link>
        </div>
      </div>
    </section>
  );
}
