import { createFileRoute, Link } from "@tanstack/react-router";
import { UserRound, ShoppingBasket, PackagePlus, ArrowLeft, Sprout } from "lucide-react";
import { pageHead } from "@/lib/marketplace";

export const Route = createFileRoute("/member-home")({
  head: () => pageHead("صفحه اصلی کاربران | ترابار", "صفحه اصلی کاربران واردشده به ترابار."),
  component: MemberHomePreview,
});

const options = [
  {
    title: "حساب کاربری",
    description: "مدیریت حساب و اطلاعات شما",
    icon: UserRound,
    to: "/membership",
    style: "bg-emerald-50 text-emerald-800",
  },
  {
    title: "خرید بار",
    description: "مشاهده و جست‌وجوی بارهای موجود",
    icon: ShoppingBasket,
    to: "/requests",
    style: "bg-lime-50 text-lime-800",
  },
  {
    title: "اعلام بار",
    description: "معرفی بار و موجودی برای فروش",
    icon: PackagePlus,
    to: "/announce",
    style: "bg-teal-50 text-teal-800",
  },
];

function MemberHomePreview() {
  return (
    <main dir="rtl" className="min-h-[70vh] bg-market-surface px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <header className="relative mb-7 overflow-hidden rounded-3xl bg-emerald-950 px-5 py-7 text-white shadow-lg sm:mb-9 sm:px-8 sm:py-9">
          <div aria-hidden="true" className="pointer-events-none absolute -left-12 -top-16 size-48 rounded-full border-[22px] border-white/5 sm:size-64" />
          <div className="relative">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-emerald-50">
              <Sprout className="size-4" /> TERRABAR | ترابار
            </div>
            <h1 className="text-2xl font-black leading-relaxed sm:text-3xl">صفحه اصلی کاربران</h1>
            <p className="mt-2 text-sm leading-7 text-emerald-50/90">برای ادامه، یکی از مسیرهای زیر را انتخاب کنید.</p>
          </div>
        </header>
        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          {options.map((option) => {
            const Icon = option.icon;
            return (
              <Link
                key={option.title}
                to={option.to}
                className="group flex min-h-28 items-center gap-4 rounded-2xl border border-border bg-card px-4 py-5 text-right shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:min-h-32 sm:gap-5 sm:px-6"
              >
                <span className={`grid size-14 shrink-0 place-items-center rounded-xl sm:size-16 ${option.style}`}>
                  <Icon className="size-7 sm:size-8" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-extrabold text-foreground sm:text-xl">{option.title}</span>
                  <span className="mt-1 block text-sm leading-6 text-muted-foreground">{option.description}</span>
                </span>
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-foreground transition group-hover:bg-accent group-hover:text-primary">
                  <ArrowLeft className="size-5 transition group-hover:-translate-x-0.5" aria-hidden="true" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
