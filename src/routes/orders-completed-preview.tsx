import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowLeft, PackageCheck, Star } from "lucide-react";
import { pageHead } from "@/lib/marketplace";

export const Route = createFileRoute("/orders-completed-preview")({
  head: () => pageHead("سفارش‌های انجام‌شده | ترابار", "خلاصه سفارش‌های تکمیل‌شده و ارزیابی هر سفارش."),
  component: CompletedOrdersPreview,
});

const demoOrders = [
  { id: "TB-1405-0141", items: "۳ نوع محصول", total: "۸٬۵۰۰٬۰۰۰ تومان", date: "۲۲ مهر ۱۴۰۵", reviewed: false },
  { id: "TB-1405-0128", items: "۲ نوع محصول", total: "۱۵٬۰۰۰٬۰۰۰ تومان", date: "۱۸ مهر ۱۴۰۵", reviewed: true },
];

function CompletedOrdersPreview() {
  return (
    <main dir="rtl" className="min-h-[70vh] bg-market-surface px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <Link to="/account-preview" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-primary"><ArrowRight className="size-4" /> بازگشت به حساب کاربری</Link>
        <header className="mb-5 rounded-3xl bg-emerald-950 px-5 py-6 text-white shadow-lg sm:px-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold"><PackageCheck className="size-4" /> TERRABAR | ترابار</span>
          <h1 className="mt-3 text-2xl font-black">سفارش‌های انجام‌شده</h1>
        </header>
        <p className="mb-3 text-sm text-muted-foreground">هر خرید جداگانه نمایش داده می‌شود؛ برای مشاهده محصولات یا ثبت امتیاز، سفارش را باز کنید.</p>
        <div className="space-y-3">
          {demoOrders.map((order) => <details key={order.id} className="rounded-2xl border border-border bg-card shadow-sm">
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-4">
              <div><strong className="block text-foreground">{order.id}</strong><span className="mt-1 block text-xs text-muted-foreground">{order.date} · {order.items}</span></div>
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800">تکمیل‌شده</span>
              <div className="w-full font-black text-foreground">{order.total}</div>
            </summary>
            <div className="border-t border-border px-4 py-3">
              <p className="text-sm leading-6 text-muted-foreground">جزئیات نمونه سبد: محصول اول · محصول دوم · محصول سوم</p>
              {order.reviewed ? <div className="mt-3 text-sm text-emerald-800">امتیاز و نظر قبلاً ثبت شده است · ★★★★★</div> : <div className="mt-3 rounded-xl bg-muted/50 p-3">
                <p className="text-sm font-bold text-foreground">ثبت امتیاز برای این سفارش</p>
                <p className="mt-1 text-sm text-muted-foreground">این بخش نمونه است؛ ثبت واقعی نظر هنوز فعال نشده.</p>
                <div className="mt-2 flex gap-1 text-amber-500" aria-label="نمونه امتیاز یک تا پنج ستاره">{[1,2,3,4,5].map((n) => <Star key={n} className="size-5" />)}</div>
              </div>}
            </div>
          </details>)}
        </div>
        <p className="mt-4 text-xs leading-6 text-muted-foreground">اطلاعات این صفحه نمونه است و هنوز به سفارش‌های واقعی متصل نیست.</p>
        <Link to="/account-preview" className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm font-bold text-foreground">بازگشت به حساب کاربری <ArrowLeft className="size-4" /></Link>
      </div>
    </main>
  );
}
