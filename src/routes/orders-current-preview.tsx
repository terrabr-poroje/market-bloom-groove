import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowLeft, Clock3, CreditCard, MapPin, PackageCheck, Truck } from "lucide-react";
import { pageHead } from "@/lib/marketplace";

export const Route = createFileRoute("/orders-current-preview")({
  head: () => pageHead("پیگیری سفارش‌های جاری | ترابار", "پیش‌نمایش پیگیری سفارش‌های جاری خریدار در ترابار."),
  component: CurrentOrdersPreview,
});

const demoOrders = [
  { id: "TB-1405-0182", product: "سیب زرد", quantity: "۲۰ کارتن · هر کارتن ۱۰ کیلو", total: "۱۲٬۰۰۰٬۰۰۰ تومان", status: "در انتظار پرداخت", tone: "amber", step: 1, detail: "سفارش تأیید شده؛ برای ادامه، پرداخت را تکمیل کنید.", date: "ثبت سفارش: ۲۷ مهر ۱۴۰۵" },
  { id: "TB-1405-0176", product: "گوجه‌فرنگی", quantity: "۵۰ سبد · هر سبد ۱۰ کیلو", total: "۲۵٬۰۰۰٬۰۰۰ تومان", status: "بار ارسال شده", tone: "blue", step: 3, detail: "سفارش تحویل شرکت حمل شده و در مسیر مقصد است.", date: "ثبت سفارش: ۲۶ مهر ۱۴۰۵" },
];

function CurrentOrdersPreview() {
  return (
    <main dir="rtl" className="min-h-[70vh] bg-market-surface px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <Link to="/account-preview" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-primary"><ArrowRight className="size-4" /> بازگشت به حساب کاربری</Link>
        <header className="mb-6 rounded-3xl bg-emerald-950 px-5 py-7 text-white shadow-lg sm:px-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold"><Truck className="size-4" /> TERRABAR | ترابار</span>
          <h1 className="mt-3 text-2xl font-black sm:text-3xl">پیگیری سفارش‌های جاری</h1>
          <p className="mt-2 text-sm leading-7 text-emerald-50/90">وضعیت پرداخت و ارسال سفارش‌ها را از یک جا دنبال کنید.</p>
        </header>
        <div className="mb-4 flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
          <span className="text-sm text-muted-foreground">سفارش‌های تکمیل‌نشده</span><strong className="text-foreground">۲ سفارش نمونه</strong>
        </div>
        <div className="space-y-4">
          {demoOrders.map((order) => (
            <article key={order.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
                <div><p className="text-xs text-muted-foreground">شماره سفارش</p><p className="mt-1 font-extrabold text-foreground">{order.id}</p></div>
                <span className={order.tone === "amber" ? "rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800" : "rounded-full bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-800"}>{order.status}</span>
              </div>
              <div className="p-4 sm:p-5">
                <h2 className="text-lg font-extrabold text-foreground">{order.product}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{order.quantity}</p>
                <div className="mt-4 rounded-xl bg-muted/50 p-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-foreground"><Clock3 className="size-4 text-primary" /> آخرین وضعیت</div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{order.detail}</p>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-lg bg-background p-2"><PackageCheck className="mx-auto mb-1 size-4 text-emerald-700" /><span>ثبت سفارش</span></div>
                    <div className={order.step >= 2 ? "rounded-lg bg-background p-2 text-emerald-800" : "rounded-lg bg-background p-2 text-muted-foreground"}><CreditCard className="mx-auto mb-1 size-4" /><span>پرداخت</span></div>
                    <div className={order.step >= 3 ? "rounded-lg bg-background p-2 text-emerald-800" : "rounded-lg bg-background p-2 text-muted-foreground"}><Truck className="mx-auto mb-1 size-4" /><span>ارسال</span></div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
                  <div><p className="text-xs text-muted-foreground">{order.date}</p><p className="mt-1 font-black text-foreground">{order.total}</p></div>
                  {order.step === 1 ? <button type="button" className="rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground">ادامه پرداخت</button> : <button type="button" className="rounded-xl border border-border px-4 py-3 text-sm font-bold text-foreground">جزئیات ارسال</button>}
                </div>
              </div>
            </article>
          ))}
        </div>
        <p className="mt-5 rounded-xl border border-border bg-card p-4 text-sm leading-6 text-muted-foreground">این صفحه پیش‌نمایش طراحی است؛ سفارش‌ها و وضعیت‌ها نمونه‌اند و دکمه‌ها هنوز به پرداخت یا اطلاعات واقعی حمل‌ونقل وصل نیستند.</p>
        <Link to="/account-preview" className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm font-bold text-foreground">بازگشت به حساب کاربری <ArrowLeft className="size-4" /></Link>
      </div>
    </main>
  );
}
