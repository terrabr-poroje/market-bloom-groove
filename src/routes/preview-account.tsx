import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, UserRound, ShieldCheck, Package, ClipboardList, Store } from "lucide-react";
import { pageHead } from "@/lib/marketplace";

export const Route = createFileRoute("/preview-account")({
  head: () => pageHead("پیش‌نمایش حساب کاربری | ترابار", "نمایش نمونه حساب کاربری بدون ورود و بدون اطلاعات واقعی."),
  component: PreviewAccount,
});

function PreviewAccount() {
  return (
    <main dir="rtl" className="min-h-[70vh] bg-market-surface px-4 py-8 sm:py-12">
      <div className="site-container grid max-w-5xl gap-6">
        <Link to="/preview-member-home" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><ArrowRight className="size-4" /> بازگشت به صفحه کاربران</Link>
        <header><p className="text-sm font-semibold text-primary">TERRABAR</p><h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">حساب کاربری من</h1><p className="mt-2 text-sm text-muted-foreground">این صفحه نمونه‌ای برای بررسی ظاهر است؛ اطلاعات زیر آزمایشی است و از حساب واقعی دریافت نشده.</p></header>
        <div className="grid gap-4 md:grid-cols-3">
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2"><UserRound className="size-5 text-primary" /><h2 className="font-bold">اطلاعات پروفایل</h2></div>
            <dl className="mt-4 grid gap-3 text-sm">
              <div><dt className="text-muted-foreground">نام و نام خانوادگی</dt><dd className="mt-1 font-semibold">نمونه کاربر</dd></div>
              <div><dt className="text-muted-foreground">شماره تماس</dt><dd className="mt-1 font-semibold">ثبت‌نشده در پیش‌نمایش</dd></div>
              <div><dt className="text-muted-foreground">شهر عضویت</dt><dd className="mt-1 font-semibold">ثبت‌نشده در پیش‌نمایش</dd></div>
            </dl>
            <Link to="/membership" className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline">تکمیل عضویت <ArrowRight className="mr-1 size-4" /></Link>
          </section>
          <section className="rounded-xl border border-border bg-card p-5 md:col-span-2">
            <div className="flex items-center gap-2"><ShieldCheck className="size-5 text-primary" /><h2 className="font-bold">عضویت‌ها و دسترسی‌ها</h2></div>
            <div className="mt-4 rounded-lg border border-border p-4"><div className="flex items-center justify-between gap-2"><span className="font-semibold">خریدار</span><span className="rounded-full bg-secondary px-2.5 py-1 text-xs">نمونه</span></div><p className="mt-2 text-xs text-muted-foreground">وضعیت عضویت در این پیش‌نمایش آزمایشی است.</p></div>
            <Link to="/membership" className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline">پیگیری / درخواست عضویت <ArrowRight className="mr-1 size-4" /></Link>
          </section>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[{title:"بارهای ثبت‌شده",value:"۰",icon:Package},{title:"سفارش‌های مرتبط",value:"۰",icon:ClipboardList},{title:"نقش‌های تأییدشده",value:"۰",icon:ShieldCheck}].map((item) => { const Icon = item.icon; return <div key={item.title} className="rounded-xl border border-border bg-card p-5"><Icon className="size-5 text-primary" /><p className="mt-3 text-sm text-muted-foreground">{item.title}</p><p className="mt-1 text-2xl font-extrabold">{item.value}</p><p className="mt-1 text-xs text-muted-foreground">داده نمونه</p></div>; })}
        </div>
        <section className="rounded-xl border border-border bg-card p-5 sm:p-6"><div className="flex items-center gap-2"><Store className="size-5 text-primary" /><h2 className="text-lg font-bold">بارهای من</h2></div><p className="mt-4 text-sm text-muted-foreground">در این نمونه باری ثبت نشده است.</p><Link to="/announce" className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline">ثبت / مدیریت بار <ArrowRight className="mr-1 size-4" /></Link></section>
        <section className="rounded-xl border border-border bg-card p-5 sm:p-6"><div className="flex items-center gap-2"><ClipboardList className="size-5 text-primary" /><h2 className="text-lg font-bold">سوابق سفارش و امور مالی</h2></div><p className="mt-4 text-sm text-muted-foreground">در این نمونه فاکتور یا سفارش واقعی نمایش داده نمی‌شود.</p><Link to="/orders" className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline">پیگیری همه سفارش‌ها و درخواست‌ها <ArrowRight className="mr-1 size-4" /></Link></section>
      </div>
    </main>
  );
}
