import { createFileRoute, Link } from "@tanstack/react-router";
import { UserRound, ShoppingBasket, PackagePlus, ArrowLeft } from "lucide-react";
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
    <main dir="rtl" className="min-h-[70vh] bg-market-surface px-4 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-8 text-center sm:mb-12">
          <p className="text-sm font-bold tracking-wide text-primary">TERRABAR | ترابار</p>
          <h1 className="mt-3 text-3xl font-black text-foreground sm:text-4xl">صفحه اصلی کاربران</h1>
          <p className="mt-3 text-sm text-muted-foreground">لطفاً مسیر موردنظرتان را انتخاب کنید.</p>
        </header>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-5">
          {options.map((option) => {
            const Icon = option.icon;
            return (
              <Link
                key={option.title}
                to={option.to}
                className="group flex min-h-52 flex-col items-center justify-center rounded-2xl border border-border bg-card p-6 text-center shadow-sm transition hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className={`grid size-16 place-items-center rounded-2xl ${option.style}`}>
                  <Icon className="size-8" aria-hidden="true" />
                </span>
                <h2 className="mt-5 text-xl font-extrabold text-foreground">{option.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{option.description}</p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary">
                  ورود به بخش <ArrowLeft className="size-4 transition group-hover:-translate-x-1" />
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
