import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRightLeft, BadgeCheck, BookOpen, ClipboardList, History, PackagePlus, ShoppingBasket, Store, UserCheck, UserRound } from "lucide-react";
import { pageHead } from "@/lib/marketplace";

export const Route = createFileRoute("/seller-account-preview")({
  head: () => pageHead("پیش‌نمایش حساب بارفروش | ترابار", "پیش‌نمایش قابل بازبینی حساب کاربری بارفروش ترابار."),
  component: SellerAccountPreviewPage,
});

const tasks = [
  { title: "اعلام بار جدید", description: "ثبت محصول، رقم، کیفیت، مقدار بسته‌ها، وزن و قیمت فروش", icon: PackagePlus, color: "bg-lime-50 text-lime-800", to: "/announce" },
  { title: "مدیریت بارهای اعلام‌شده", description: "مشاهده بارهای فعال و بررسی موجودی و قیمت آن‌ها", icon: ClipboardList, color: "bg-emerald-50 text-emerald-800", to: "/announce" },
  { title: "اطلاعات حساب و گردش حساب", description: "مشاهده اطلاعات حساب بانکی ثبت‌شده، دریافتی‌ها، پرداختی‌ها و سوابق تراکنش‌ها", icon: ArrowRightLeft, color: "bg-violet-50 text-violet-800", to: "/seller-accounting-preview" },
  { title: "سفارش‌ها؛ جاری و تکمیل‌شده", description: "مشاهده سفارش‌های در جریان و سابقه سفارش‌های تکمیل‌شده در یک صفحه", icon: History, color: "bg-sky-50 text-sky-800", to: "/seller-orders-preview" },
  { title: "امکانات خرید", description: "خرید بار، پیگیری سفارش‌های جاری و مشاهده سفارش‌های انجام‌شده", icon: ShoppingBasket, color: "bg-violet-50 text-violet-800", to: "/seller-purchase-preview" },
  { title: "ویترین من", description: "مشاهده صفحه بارهای فعال و معرفی ویترین به خریداران", icon: Store, color: "bg-amber-50 text-amber-800", to: "/member-home" },
  { title: "پیگیری تأیید عضویت", description: "مشاهده وضعیت درخواست عضویت و بررسی نتیجه مدیر؛ در صورت نیاز ثبت دوباره درخواست ردشده", icon: UserCheck, color: "bg-blue-50 text-blue-800", to: "/membership" },
  { title: "راهنمای حساب کاربری", description: "آشنایی با امکانات حساب، کارهایی که پس از تأیید عضویت فعال می‌شوند و روش استفاده از بخش‌های ترابار", icon: BookOpen, color: "bg-orange-50 text-orange-800", to: "/guide" },
];

function SellerAccountPreviewPage() {
  return (
    <section dir="rtl" className="min-h-[70vh] bg-market-surface px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <header className="relative mb-6 overflow-hidden rounded-3xl bg-emerald-950 px-5 py-7 text-white shadow-lg sm:px-8 sm:py-9">
          <div aria-hidden="true" className="pointer-events-none absolute -left-12 -top-16 size-48 rounded-full border-[22px] border-white/5 sm:size-64" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-emerald-50"><UserRound className="size-4" /> TERRABAR | ترابار</span>
            <h1 className="mt-3 text-2xl font-black leading-relaxed sm:text-3xl">حساب کاربری بارفروش</h1>
            <p className="mt-2 text-sm leading-7 text-emerald-50/90">مدیریت بارها، سفارش‌ها و ویترین شما در ترابار.</p>
          </div>
        </header>
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-4">
            <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-800"><UserRound className="size-8" /></div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-extrabold text-foreground">نام بارفروش / حجره</h2>
              <p className="mt-1 text-sm text-muted-foreground">شماره تماس ثبت‌شده: ۰۹۱۲ *** **۴۵</p>
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-foreground"><BadgeCheck className="size-3.5" /> نمونه وضعیت: عضویت تأییدشده</span>
            </div>
          </div>
          <div className="mt-5 rounded-xl bg-muted/50 p-4">
            <div className="text-sm text-muted-foreground">شهر فعالیت</div>
            <p className="mt-2 font-bold text-foreground">کرج، البرز</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">امکان اعلام بار پس از تأیید عضویت بارفروش فعال می‌شود. اطلاعات این صفحه صرفاً نمونه نمایشی است.</p>
          </div>
        </section>
        <h2 className="mb-3 mt-7 text-lg font-extrabold text-foreground">امکانات حساب بارفروش</h2>
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
        <p className="mt-4 rounded-xl border border-border bg-card px-4 py-3 text-sm leading-6 text-muted-foreground">این نسخه برای بازبینی چیدمان و امکانات پیشنهادی است؛ اتصال نهایی هر بخش به داده‌های واقعی و سطح دسترسی‌ها جداگانه بررسی می‌شود.</p>
        <div className="mt-6"><Link to="/member-home" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90">بازگشت به صفحه اصلی کاربران <ArrowLeft className="size-4" /></Link></div>
      </div>
    </section>
  );
}
