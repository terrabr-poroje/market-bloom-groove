import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, ArrowLeft, Truck, CreditCard, Trash2 } from "lucide-react";
import { pageHead } from "@/lib/marketplace";

export const Route = createFileRoute("/orders-current-preview")({
  head: () => pageHead("پیگیری سفارش‌های جاری | ترابار", "خلاصه سفارش‌های جاری در ترابار."),
  component: CurrentOrdersPreview,
});

const demoOrders = [
  { id: "TB-1405-0182", items: "۳ نوع محصول", total: "۱۲٬۰۰۰٬۰۰۰ تومان", status: "در انتظار پرداخت", tone: "amber", date: "۲۷ مهر ۱۴۰۵", inventoryAvailable: true, cancelled: false },
  { id: "TB-1405-0180", items: "۲ نوع محصول", total: "۶٬۴۰۰٬۰۰۰ تومان", status: "لغو شد؛ موجودی تمام شده", tone: "red", date: "۲۶ مهر ۱۴۰۵", inventoryAvailable: false, cancelled: true },
  { id: "TB-1405-0176", items: "۲ نوع محصول", total: "۲۵٬۰۰۰٬۰۰۰ تومان", status: "در حال ارسال", tone: "blue", date: "۲۵ مهر ۱۴۰۵", inventoryAvailable: true, cancelled: false },
];

function CurrentOrdersPreview() {
  const [orders, setOrders] = useState(demoOrders);
  const [notice, setNotice] = useState("");
  const removeOrder = (id: string) => {
    setOrders((current) => current.filter((order) => order.id !== id));
    setNotice("سفارش نمونه از فهرست حساب کاربری حذف شد.");
  };

  return (
    <main dir="rtl" className="min-h-[70vh] bg-market-surface px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <Link to="/account-preview" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-primary"><ArrowRight className="size-4" /> بازگشت به حساب کاربری</Link>
        <header className="mb-5 rounded-3xl bg-emerald-950 px-5 py-6 text-white shadow-lg sm:px-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold"><Truck className="size-4" /> TERRABAR | ترابار</span>
          <h1 className="mt-3 text-2xl font-black">پیگیری سفارش‌های جاری</h1>
        </header>
        <p className="mb-3 text-sm text-muted-foreground">هر سبد خرید یک سفارش مستقل است. سفارش در انتظار پرداخت فقط در صورت موجود بودن کالا قابل ادامه است.</p>
        {notice && <p role="status" className="mb-3 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">{notice}</p>}
        <div className="space-y-3">
          {orders.map((order) => <details key={order.id} className="rounded-2xl border border-border bg-card shadow-sm">
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 p-4">
              <div><strong className="block text-foreground">{order.id}</strong><span className="mt-1 block text-xs text-muted-foreground">{order.date} · {order.items}</span></div>
              <span className={order.tone === "amber" ? "rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800" : order.tone === "red" ? "rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-800" : "rounded-full bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-800"}>{order.status}</span>
              <div className="w-full font-black text-foreground">{order.total}</div>
            </summary>
            <div className="border-t border-border px-4 py-3 text-sm leading-7 text-muted-foreground">
              <p>خلاصه سبد نمونه: محصول اول · محصول دوم{order.items.startsWith("۳") ? " · محصول سوم" : ""}</p>
              <p>وضعیت: {order.status}</p>
              {order.cancelled ? <p className="mt-2 font-semibold text-red-700">این سفارش به دلیل اتمام موجودی لغو شده است و می‌توانید آن را از فهرست حساب حذف کنید.</p> : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {order.status === "در انتظار پرداخت" && order.inventoryAvailable && <button type="button" onClick={() => setNotice("در نسخه آزمایشی، موجودی برای این سفارش موجود نشان داده شده است؛ اتصال به ادامه سفارش و پرداخت واقعی هنوز انجام نشده.")} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"><CreditCard className="size-4" /> ادامه سفارش</button>}
                {order.cancelled && <button type="button" onClick={() => removeOrder(order.id)} className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-700"><Trash2 className="size-4" /> حذف از حساب کاربری</button>}
              </div>
            </div>
          </details>)}
          {orders.length === 0 && <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">سفارشی در این فهرست باقی نمانده است.</p>}
        </div>
        <p className="mt-4 text-xs leading-6 text-muted-foreground">این پیش‌نمایش با سفارش‌های نمونه است. لغو خودکار براساس موجودی و حذف دائمی/حسابی تا اتصال به پایگاه داده هنوز واقعی نیست.</p>
        <Link to="/account-preview" className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-secondary px-4 py-3 text-sm font-bold text-foreground">بازگشت به حساب کاربری <ArrowLeft className="size-4" /></Link>
      </div>
    </main>
  );
}
