import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowLeft, History, PackageCheck, Truck } from "lucide-react";
import { pageHead } from "@/lib/marketplace";

export const Route = createFileRoute("/seller-orders-preview")({
  head: () => pageHead("سفارش‌های بارفروش | ترابار", "پیش‌نمایش یکپارچه سفارش‌های جاری و تکمیل‌شده بارفروش."),
  component: SellerOrdersPreview,
});

const currentOrders = [
  { id: "TB-1405-0182", items: "۳ نوع محصول", total: "۱۲٬۰۰۰٬۰۰۰ تومان", status: "در انتظار اقدام", date: "۲۷ مهر ۱۴۰۵" },
  { id: "TB-1405-0176", items: "۲ نوع محصول", total: "۲۵٬۰۰۰٬۰۰۰ تومان", status: "در حال ارسال", date: "۲۵ مهر ۱۴۰۵" },
];
const completedOrders = [
  { id: "TB-1405-0141", items: "۳ نوع محصول", total: "۸٬۵۰۰٬۰۰۰ تومان", date: "۲۲ مهر ۱۴۰۵" },
  { id: "TB-1405-0128", items: "۲ نوع محصول", total: "۱۵٬۰۰۰٬۰۰۰ تومان", date: "۱۸ مهر ۱۴۰۵" },
];

function SellerOrdersPreview() {
  return (
    <main dir="rtl" className="min-h-[70vh] bg-market-surface px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <Link to="/seller-account-preview" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-primary"><ArrowRight className="size-4" /> بازگشت به حساب بارفروش</Link>
        <header className="mb-5 rounded-3xl bg-emerald-950 px-5 py-6 text-white shadow-lg sm:px-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold"><History className="size-4" /> TERRABAR | ترابار</span>
          <h1 className="mt-3 text-2xl font-black">سفارش‌ها؛ جاری و تکمیل‌شده</h1>
          <p className="mt-2 text-sm leading-6 text-emerald-50/90">هر دو وضعیت در یک صفحه و در دو بخش جداگانه نمایش داده می‌شوند.</p>
        </header>
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold text-foreground"><Truck className="size-5" /> سفارش‌های جاری</h2>
          <div className="space-y-3">
            {currentOrders.map((order) => <details key={order.id} className="rounded-2xl border border-border bg-card shadow-sm">
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-4">
                <div><strong className="block text-foreground">{order.id}</strong><span className="mt-1 block text-xs text-muted-foreground">{order.date} · {order.items}</span></div>
                <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800">{order.status}</span>
                <div className="w-full font-black text-foreground">{order.total}</div>
              </summary>
              <div className="border-t border-border px-4 py-3 text-sm leading-7 text-muted-foreground">جزئیات این سفارش نمونه است. وضعیت واقعی سفارش‌ها پس از اتصال به پایگاه داده نمایش داده می‌شود.</div>
            </details>)}
          </div>
        </section>
        <section className="mt-7">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold text-foreground"><PackageCheck className="size-5" /> سفارش‌های تکمیل‌شده</h2>
          <div className="space-y-3">
            {completedOrders.map((order) => <details key={order.id} className="rounded-2xl border border-border bg-card shadow-sm">
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-4">
                <div><strong className="block text-foreground">{order.id}</strong><span className="mt-1 block text-xs text-muted-foreground">{order.date} · {order.items}</span></div>
                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">تکمیل‌شده</span>
                <div className="w-full font-black text-foreground">{order.total}</div>
              </summary>
              <div className="border-t border-border px-4 py-3 text-sm leading-7 text-muted-foreground">سابقه تحویل این سفارش نمونه است. نمایش سوابق واقعی پس از اتصال به داده‌های سفارش انجام می‌شود.</div>
            </details>)}
          </div>
        </section>
        <p className="mt-5 rounded-xl border border-border bg-card p-4 text-xs leading-6 text-muted-foreground">این صفحه فقط پیش‌نمایش است و اطلاعات سفارش‌ها نمونه‌اند؛ هنوز به سفارش‌های واقعی متصل نشده است.</p>
        <Link to="/seller-account-preview" className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm font-bold text-foreground">بازگشت به حساب بارفروش <ArrowLeft className="size-4" /></Link>
      </div>
    </main>
  );
}
