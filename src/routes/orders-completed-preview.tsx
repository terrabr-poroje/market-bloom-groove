import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowLeft, CheckCircle2, MessageSquareText, PackageCheck, Star } from "lucide-react";
import { pageHead } from "@/lib/marketplace";

export const Route = createFileRoute("/orders-completed-preview")({
  head: () => pageHead("سفارش‌های انجام‌شده | ترابار", "پیش‌نمایش تاریخچه سفارش‌ها و ثبت نظر برای سفارش‌های تکمیل‌شده."),
  component: CompletedOrdersPreview,
});

const demoOrders = [
  { id: "TB-1405-0141", product: "لیموترش پرشین", quantity: "۱۰ کارتن · هر کارتن ۱۰ کیلو", total: "۸٬۵۰۰٬۰۰۰ تومان", date: "تحویل: ۲۲ مهر ۱۴۰۵", seller: "فروشنده نمونه · کرج", reviewed: false },
  { id: "TB-1405-0128", product: "خیار گلخانه‌ای", quantity: "۳۰ سبد · هر سبد ۱۰ کیلو", total: "۱۵٬۰۰۰٬۰۰۰ تومان", date: "تحویل: ۱۸ مهر ۱۴۰۵", seller: "فروشنده نمونه · البرز", reviewed: true },
];

function CompletedOrdersPreview() {
  return (
    <main dir="rtl" className="min-h-[70vh] bg-market-surface px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <Link to="/account-preview" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-primary"><ArrowRight className="size-4" /> بازگشت به حساب کاربری</Link>
        <header className="mb-6 rounded-3xl bg-emerald-950 px-5 py-7 text-white shadow-lg sm:px-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold"><PackageCheck className="size-4" /> TERRABAR | ترابار</span>
          <h1 className="mt-3 text-2xl font-black sm:text-3xl">سفارش‌های انجام‌شده</h1>
          <p className="mt-2 text-sm leading-7 text-emerald-50/90">سوابق خریدهای تحویل‌گرفته‌شده و ثبت تجربه خرید برای هر سفارش.</p>
        </header>
        <div className="mb-4 flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3">
          <span className="text-sm text-muted-foreground">سفارش‌های تحویل‌گرفته‌شده</span><strong className="text-foreground">۲ سفارش نمونه</strong>
        </div>
        <div className="space-y-4">
          {demoOrders.map((order) => (
            <article key={order.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 sm:px-5">
                <div><p className="text-xs text-muted-foreground">شماره سفارش</p><p className="mt-1 font-extrabold text-foreground">{order.id}</p></div>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800"><CheckCircle2 className="size-4" /> تحویل گرفته شده</span>
              </div>
              <div className="p-4 sm:p-5">
                <h2 className="text-lg font-extrabold text-foreground">{order.product}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{order.quantity}</p>
                <div className="mt-3 grid gap-2 rounded-xl bg-muted/50 p-3 text-sm sm:grid-cols-2">
                  <p className="text-muted-foreground">{order.seller}</p><p className="text-muted-foreground">{order.date}</p><p className="font-extrabold text-foreground">{order.total}</p>
                </div>
                <div className="mt-4 rounded-xl border border-border p-4">
                  {order.reviewed ? <><div className="flex items-center gap-2 font-bold text-emerald-800"><CheckCircle2 className="size-4" /> نظر شما ثبت شده</div><div className="mt-2 flex gap-1 text-amber-500" aria-label="امتیاز ثبت‌شده ۵ از ۵">{[1,2,3,4,5].map((n) => <Star key={n} className="size-5 fill-current" />)}</div><p className="mt-2 text-sm text-muted-foreground">نمونه: کیفیت محصول خوب بود و سفارش به‌موقع تحویل شد.</p></> : <><div className="flex items-center gap-2 font-extrabold text-foreground"><MessageSquareText className="size-5 text-primary" /> امتیاز و نظر درباره این سفارش</div><p className="mt-2 text-sm leading-6 text-muted-foreground">پس از تحویل سفارش، می‌توانید کیفیت بار و تجربه خرید را ارزیابی کنید.</p><div className="mt-3 flex gap-1 text-amber-500" aria-label="انتخاب امتیاز نمونه">{[1,2,3,4,5].map((n) => <Star key={n} className="size-7" />)}</div><textarea aria-label="متن نظر" placeholder="نظر خود را درباره کیفیت بار و تجربه خرید بنویسید..." className="mt-3 min-h-24 w-full rounded-xl border border-input bg-background p-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary" /><button type="button" className="mt-3 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground"><Star className="size-4" /> ثبت نظر و امتیاز</button></>}
                </div>
              </div>
            </article>
          ))}
        </div>
        <p className="mt-5 rounded-xl border border-border bg-card p-4 text-sm leading-6 text-muted-foreground">پیشنهاد: فقط سفارش‌هایی که وضعیت نهایی «تحویل گرفته شده» یا «تکمیل‌شده» دارند امکان امتیازدهی داشته باشند. این صفحه نمونه طراحی است و امتیازها و نظرات هنوز ذخیره واقعی نمی‌شوند.</p>
        <Link to="/account-preview" className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm font-bold text-foreground">بازگشت به حساب کاربری <ArrowLeft className="size-4" /></Link>
      </div>
    </main>
  );
}
