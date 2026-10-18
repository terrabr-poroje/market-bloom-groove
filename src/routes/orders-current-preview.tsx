import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowLeft, Truck } from "lucide-react";
import { pageHead } from "@/lib/marketplace";

export const Route = createFileRoute("/orders-current-preview")({
  head: () => pageHead("پیگیری سفارش‌های جاری | ترابار", "خلاصه سفارش‌های جاری در ترابار."),
  component: CurrentOrdersPreview,
});

const demoOrders = [
  { id: "TB-1405-0182", items: "۳ نوع محصول", total: "۱۲٬۰۰۰٬۰۰۰ تومان", status: "در انتظار پرداخت", tone: "amber", date: "۲۷ مهر ۱۴۰۵" },
  { id: "TB-1405-0176", items: "۲ نوع محصول", total: "۲۵٬۰۰۰٬۰۰۰ تومان", status: "در حال ارسال", tone: "blue", date: "۲۶ مهر ۱۴۰۵" },
];

function CurrentOrdersPreview() {
  return (
    <main dir="rtl" className="min-h-[70vh] bg-market-surface px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <Link to="/account-preview" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-primary"><ArrowRight className="size-4" /> بازگشت به حساب کاربری</Link>
        <header className="mb-5 rounded-3xl bg-emerald-950 px-5 py-6 text-white shadow-lg sm:px-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold"><Truck className="size-4" /> TERRABAR | ترابار</span>
          <h1 className="mt-3 text-2xl font-black">پیگیری سفارش‌های جاری</h1>
        </header>
        <p className="mb-3 text-sm text-muted-foreground">هر سبد خرید یک سفارش مستقل است؛ برای دیدن جزئیات، همان سفارش را باز کنید.</p>
        <div className="space-y-3">
          {demoOrders.map((order) => <details key={order.id} className="rounded-2xl border border-border bg-card shadow-sm">
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-4">
              <div><strong className="block text-foreground">{order.id}</strong><span className="mt-1 block text-xs text-muted-foreground">{order.date} · {order.items}</span></div>
              <span className={order.tone === "amber" ? "rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800" : "rounded-full bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-800"}>{order.status}</span>
              <div className="w-full font-black text-foreground">{order.total}</div>
            </summary>
            <div className="border-t border-border px-4 py-3 text-sm leading-7 text-muted-foreground">
              <p>جزئیات نمونه سبد: محصول اول · محصول دوم · محصول سوم</p>
              <p>وضعیت فعلی: {order.status}</p>
              <p>تاریخ سفارش: {order.date}</p>
            </div>
          </details>)}
        </div>
        <p className="mt-4 text-xs leading-6 text-muted-foreground">اطلاعات این صفحه نمونه است و هنوز به سفارش‌های واقعی متصل نیست.</p>
        <Link to="/account-preview" className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm font-bold text-foreground">بازگشت به حساب کاربری <ArrowLeft className="size-4" /></Link>
      </div>
    </main>
  );
}
