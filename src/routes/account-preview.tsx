import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BadgeCheck, History, MapPin, Truck, UserRound } from "lucide-react";
import { pageHead } from "@/lib/marketplace";

export const Route = createFileRoute("/account-preview")({
  head: () => pageHead("پیش‌نمایش حساب کاربری | ترابار", "پیش‌نمایش بخش حساب خریدار ترابار."),
  component: AccountPreviewPage,
});

const tasks = [
  { title: "پیگیری سفارش‌های جاری", description: "سفارش‌های نیمه‌تمام؛ در انتظار پرداخت یا در حال ارسال", icon: Truck, color: "bg-emerald-50 text-emerald-800", to: "/orders-current-preview" },
  { title: "سفارش‌های انجام‌شده", description: "مشاهده سفارش‌های تحویل‌شده و ثبت امتیاز و نظر برای هر سفارش تکمیل‌شده", icon: History, color: "bg-lime-50 text-lime-800", to: "/orders-completed-preview" },
];

function AccountPreviewPage() {
  return (
    <section dir="rtl" className="min-h-[70vh] bg-market-surface px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <header className="relative mb-6 overflow-hidden rounded-3xl bg-emerald-950 px-5 py-7 text-white shadow-lg sm:px-8 sm:py-9">
          <div aria-hidden="true" className="pointer-events-none absolute -left-12 -top-16 size-48 rounded-full border-[22px] border-white/5 sm:size-64" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-emerald-50"><UserRound className="size-4" /> TERRABAR | ترابار</span>
            <h1 className="mt-3 text-2xl font-black leading-relaxed sm:text-3xl">حساب کاربری</h1>
            <p className="mt-2 text-sm leading-7 text-emerald-50/90">اطلاعات حساب و پیگیری خریدهای شما در ترابار.</p>
          </div>
        </header>
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-4">
            <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-800"><UserRound className="size-8" /></div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-extrabold text-foreground">نام و نام خانوادگی کاربر</h2>
              <p className="mt-1 text-sm text-muted-foreground">شماره تماس ثبت‌شده: ۰۹۱۲ *** **۴۵</p>
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-foreground"><BadgeCheck className="size-3.5" /> حساب کاربری فعال</span>
            </div>
          </div>
          <div className="mt-5 rounded-xl bg-muted/50 p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="size-4" /> شهر انتخاب‌شده</div>
            <p className="mt-2 font-bold text-foreground">کرج، البرز</p>
          </div>
        </section>
        <h2 className="mb-3 mt-7 text-lg font-extrabold text-foreground">امکانات حساب خریدار</h2>
        <div className="grid grid-cols-1 gap-3">
          {tasks.map((task) => {
            const Icon = task.icon;
            return <Link to={task.to} key={task.title} className="flex min-h-28 items-center gap-4 rounded-2xl border border-border bg-card px-4 py-5 shadow-sm transition hover:border-primary/40 hover:shadow-md sm:gap-5 sm:px-6">
              <span className={`grid size-14 shrink-0 place-items-center rounded-xl sm:size-16 ${task.color}`}><Icon className="size-7 sm:size-8" aria-hidden="true" /></span>
              <span className="min-w-0 flex-1"><strong className="block text-base font-extrabold text-foreground sm:text-lg">{task.title}</strong><span className="mt-1 block text-sm leading-6 text-muted-foreground">{task.description}</span></span>
              <ArrowLeft className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            </Link>;
          })}
        </div>
        <p className="mt-4 rounded-xl border border-border bg-card px-4 py-3 text-sm leading-6 text-muted-foreground">حساب خریدار به تأیید عضویت حرفه‌ای نیاز ندارد. ثبت امتیاز و نظر فقط از داخل جزئیات سفارش‌های انجام‌شده انجام می‌شود؛ برای سفارش‌های جاری امکان ثبت نظر وجود ندارد.</p>
        <div className="mt-6"><Link to="/member-home" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90">بازگشت به صفحه اصلی کاربران <ArrowLeft className="size-4" /></Link></div>
      </div>
    </section>
  );
}
