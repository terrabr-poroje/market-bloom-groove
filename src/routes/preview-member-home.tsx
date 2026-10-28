import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, UserRound, WalletCards, ShoppingBasket, PackageCheck, Store, PackagePlus, ClipboardList } from "lucide-react";
import { pageHead } from "@/lib/marketplace";

export const Route = createFileRoute("/preview-member-home")({
  head: () => pageHead("پیش‌نمایش صفحه کاربران | ترابار", "پیش‌نمایش ظاهری صفحه کاربران ترابار."),
  component: PreviewMemberHome,
});

const sections = [
  {
    title: "حساب کاربری",
    items: [
      { title: "حساب کاربری", description: "مشاهده و تکمیل اطلاعات حساب و عضویت‌ها", icon: UserRound, style: "bg-emerald-50 text-emerald-800" },
      { title: "امور مالی و فاکتورها", description: "مشاهده مبالغ سفارش‌ها و وضعیت پرداخت در سوابق حساب", icon: WalletCards, style: "bg-violet-50 text-violet-800" },
    ],
  },
  {
    title: "امکانات خرید",
    items: [
      { title: "درخواست خرید", description: "جست‌وجوی بار و انتخاب محصولات موردنیاز", icon: ShoppingBasket, style: "bg-lime-50 text-lime-800" },
      { title: "درخواست سفارش", description: "ثبت و پیگیری درخواست تأمین محصولات", icon: PackageCheck, style: "bg-sky-50 text-sky-800" },
      { title: "خرید ویژه حرفه‌ای", description: "مشاهده بارهای ویژه حرفه‌ای", icon: ShoppingBasket, style: "bg-amber-50 text-amber-800" },
      { title: "پیگیری خرید و سفارش", description: "مشاهده فاکتورها و وضعیت سفارش‌ها و درخواست‌ها", icon: PackageCheck, style: "bg-sky-50 text-sky-800" },
    ],
  },
  {
    title: "امکانات فروش",
    items: [
      { title: "اعلام بار", description: "ثبت بار جدید برای فروش", icon: PackagePlus, style: "bg-teal-50 text-teal-800" },
      { title: "مدیریت بارها", description: "مدیریت بارهای ثبت‌شده", icon: ClipboardList, style: "bg-sky-50 text-sky-800" },
      { title: "ویترین فروش اختصاصی", description: "مشاهده ویترین فروش", icon: Store, style: "bg-amber-50 text-amber-800" },
    ],
  },
];

function PreviewMemberHome() {
  return (
    <main dir="rtl" className="min-h-[70vh] bg-market-surface px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <header className="relative mb-7 overflow-hidden rounded-3xl bg-emerald-950 px-5 py-7 text-white shadow-lg sm:mb-9 sm:px-8 sm:py-9">
          <div aria-hidden="true" className="pointer-events-none absolute -left-12 -top-16 size-48 rounded-full border-[22px] border-white/5 sm:size-64" />
          <div className="relative">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-emerald-50">TERRABAR | ترابار</div>
            <h1 className="text-2xl font-black leading-relaxed sm:text-3xl">صفحه اصلی کاربران</h1>
            <p className="mt-2 text-sm leading-7 text-emerald-50/90">پیش‌نمایش ظاهری صفحه کاربران؛ برای مشاهده این صفحه نیازی به ورود یا ثبت‌نام نیست.</p>
          </div>
        </header>
        {sections.map((section) => (
          <section key={section.title} className="mb-5 overflow-hidden rounded-2xl border border-emerald-200 bg-card shadow-sm">
            <h2 className="bg-emerald-800 px-4 py-3 text-base font-extrabold text-white sm:px-5">{section.title}</h2>
            <div className="grid grid-cols-1 gap-3 p-3 sm:p-4">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.title} className="flex min-h-20 items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 text-right sm:gap-4 sm:px-4">
                    <span className={`grid size-11 shrink-0 place-items-center rounded-lg ${item.style}`}><Icon className="size-6" aria-hidden="true" /></span>
                    <span className="min-w-0 flex-1"><span className="block font-extrabold text-foreground">{item.title}</span><span className="mt-1 block text-sm leading-5 text-muted-foreground">{item.description}</span></span>
                    <ArrowLeft className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
