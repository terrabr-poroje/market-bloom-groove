import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, WalletCards, ReceiptText, Clock3, CircleCheck } from "lucide-react";
import { pageHead } from "@/lib/marketplace";

export const Route = createFileRoute("/preview-finance")({
  head: () => pageHead("پیش‌نمایش امور مالی و فاکتورها | ترابار", "نمایش نمونه امور مالی و فاکتورها بدون اطلاعات واقعی."),
  component: PreviewFinance,
});

function PreviewFinance() {
  return (
    <main dir="rtl" className="min-h-[70vh] bg-market-surface px-4 py-8 sm:py-12">
      <div className="site-container grid max-w-4xl gap-6">
        <Link to="/preview-member-home" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><ArrowRight className="size-4" /> بازگشت به صفحه کاربران</Link>
        <header>
          <p className="text-sm font-semibold text-primary">TERRABAR</p>
          <h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">امور مالی و فاکتورها</h1>
          <p className="mt-2 text-sm text-muted-foreground">این فقط پیش‌نمایش ظاهری است؛ هیچ اطلاعات مالی واقعی نمایش داده نمی‌شود.</p>
        </header>
        <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center gap-2"><WalletCards className="size-5 text-primary" /><h2 className="font-bold">خلاصه حساب</h2></div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[{label:"مجموع خریدها",value:"۰ تومان"},{label:"مبالغ پرداخت‌شده",value:"۰ تومان"},{label:"مانده حساب",value:"۰ تومان"}].map((item) => (
              <div key={item.label} className="rounded-lg border border-border p-4"><p className="text-sm text-muted-foreground">{item.label}</p><p className="mt-2 text-lg font-extrabold">{item.value}</p><p className="mt-1 text-xs text-muted-foreground">مقدار نمونه</p></div>
            ))}
          </div>
        </section>
        <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center gap-2"><ReceiptText className="size-5 text-primary" /><h2 className="font-bold">فاکتورها</h2></div>
          <div className="mt-4 overflow-hidden rounded-lg border border-border">
            <div className="grid grid-cols-2 gap-3 bg-secondary/50 px-4 py-3 text-sm font-bold sm:grid-cols-4"><span>شماره فاکتور</span><span>تاریخ</span><span>مبلغ</span><span>وضعیت</span></div>
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">در پیش‌نمایش، فاکتور واقعی وجود ندارد.</div>
          </div>
        </section>
        <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center gap-2"><Clock3 className="size-5 text-primary" /><h2 className="font-bold">وضعیت پرداخت‌ها</h2></div>
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-border p-4"><CircleCheck className="mt-0.5 size-5 text-primary" /><div><p className="font-semibold">نمونه وضعیت</p><p className="mt-1 text-sm text-muted-foreground">پس از اتصال به حساب واقعی، وضعیت پرداخت و گردش حساب در این بخش نمایش داده می‌شود.</p></div></div>
        </section>
      </div>
    </main>
  );
}
