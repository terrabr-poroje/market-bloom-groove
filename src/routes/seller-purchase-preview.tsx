import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowLeft, History, ShoppingBasket, Truck } from "lucide-react";
import { pageHead } from "@/lib/marketplace";

export const Route = createFileRoute("/seller-purchase-preview")({
  head: () => pageHead("امکانات خرید بارفروش | ترابار", "امکانات خرید حساب بارفروش، مشابه حساب خریدار."),
  component: SellerPurchasePreview,
});

const purchaseOptions = [
  { title: "خرید بار", description: "مشاهده و جست‌وجوی بارهای موجود برای خرید", icon: ShoppingBasket, color: "bg-lime-50 text-lime-800", to: "/requests" },
  { title: "پیگیری سفارش‌های جاری", description: "پیگیری خریدهای در انتظار پرداخت یا در حال ارسال", icon: Truck, color: "bg-emerald-50 text-emerald-800", to: "/orders-current-preview" },
  { title: "سفارش‌های انجام‌شده", description: "مرور خریدهای تکمیل‌شده و سابقه سفارش‌ها", icon: History, color: "bg-violet-50 text-violet-800", to: "/orders-completed-preview" },
];

function SellerPurchasePreview() {
  return (
    <main dir="rtl" className="min-h-[70vh] bg-market-surface px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <Link to="/seller-account-preview" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-primary"><ArrowRight className="size-4" /> بازگشت به حساب بارفروش</Link>
        <header className="mb-6 rounded-3xl bg-emerald-950 px-5 py-7 text-white shadow-lg sm:px-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold"><ShoppingBasket className="size-4" /> TERRABAR | ترابار</span>
          <h1 className="mt-3 text-2xl font-black">امکانات خرید</h1>
          <p className="mt-2 text-sm leading-7 text-emerald-50/90">بارفروش هم می‌تواند مانند خریدار خرید کند؛ این سه مسیر در یک بخش جمع شده‌اند.</p>
        </header>
        <div className="grid grid-cols-1 gap-3">
          {purchaseOptions.map((option) => {
            const Icon = option.icon;
            return <Link to={option.to} key={option.title} className="flex min-h-28 items-center gap-4 rounded-2xl border border-border bg-card px-4 py-5 shadow-sm transition hover:border-primary/40 hover:shadow-md sm:gap-5 sm:px-6">
              <span className={`grid size-14 shrink-0 place-items-center rounded-xl sm:size-16 ${option.color}`}><Icon className="size-7 sm:size-8" aria-hidden="true" /></span>
              <span className="min-w-0 flex-1"><strong className="block text-base font-extrabold text-foreground sm:text-lg">{option.title}</strong><span className="mt-1 block text-sm leading-6 text-muted-foreground">{option.description}</span></span>
              <ArrowLeft className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            </Link>;
          })}
        </div>
        <p className="mt-4 rounded-xl border border-border bg-card px-4 py-3 text-sm leading-6 text-muted-foreground">این صفحه مسیرهای خرید حساب خریدار را برای حساب بارفروش هم در دسترس می‌گذارد. جزئیات امکانات خرید فعلاً بدون تغییر باقی مانده است و داده‌ها همچنان نمونه‌ای/نمایشی هستند.</p>
        <Link to="/seller-account-preview" className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm font-bold text-foreground">بازگشت به حساب بارفروش <ArrowLeft className="size-4" /></Link>
      </div>
    </main>
  );
}
