import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Info, Menu, Sprout, X } from "lucide-react";
import { pageHead } from "@/lib/marketplace";
import appleImage from "@/assets/apples.jpg";
import tomatoImage from "@/assets/tomatoes.jpg";
import onionImage from "@/assets/onions.jpg";

export const Route = createFileRoute("/design-preview")({
  head: () => {
    const h = pageHead("پیش‌نمایش طراحی جدید | ترابار", "نسخه آزمایشی ظاهر جدید ترابار؛ فقط برای مشاهده طراحی، بدون عملیات واقعی.");
    return { ...h, meta: [...(h.meta ?? []), { name: "robots", content: "noindex, nofollow" }] };
  },
  component: DesignPreview,
});

const actions = [
  { icon: LogIn, title: "ثبت‌نام / ورود", text: "عضویت در بازار ترابار با نقش موردنظر" },
  { icon: PackagePlus, title: "اعلام بار", text: "معرفی محصول، وزن بسته و موجودی" },
  { icon: Search, title: "درخواست بار", text: "جست‌وجو و ثبت نیاز خرید" },
];

const products = [
  { img: appleImage, name: "سیب قرمز", city: "ارومیه", grade: "درجه یک", price: "۴۵٬۰۰۰" },
  { img: tomatoImage, name: "گوجه‌فرنگی", city: "جیرفت", grade: "درجه دو", price: "۲۸٬۰۰۰" },
  { img: onionImage, name: "پیاز زرد", city: "اصفهان", grade: "درجه یک", price: "۱۸٬۰۰۰" },
];

function DesignPreview() {
  const [open, setOpen] = useState(false);
  return (
    <div dir="rtl" className="min-h-screen bg-market-surface">
      <div className="bg-amber-100 px-4 py-2 text-center text-xs font-bold text-amber-900">
        پیش‌نمایش طراحی — تمام قیمت‌ها و داده‌ها صرفاً نمونه هستند و هیچ سفارش یا پرداخت واقعی انجام نمی‌شود.
      </div>
      <header className="sticky top-0 z-10 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 text-primary">
            <span className="grid size-10 place-items-center rounded-xl bg-primary/10"><Sprout className="size-6" /></span>
            <div><span className="block text-2xl font-black leading-7">ترابار</span><span dir="ltr" className="block text-[10px] font-semibold">TERRABAR</span></div>
          </div>
          <nav className="hidden gap-6 text-sm font-semibold text-foreground md:flex">
            <span>خانه</span><span>بارهای فعال</span><span>درباره ما</span><span>راهنما</span>
          </nav>
          <button aria-label="منو" onClick={() => setOpen(!open)} className="grid size-10 place-items-center rounded-lg border border-border md:hidden">
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
        {open && <div className="grid gap-1 border-t border-border px-4 py-2 text-sm md:hidden">
          {["خانه", "بارهای فعال", "درباره ما", "راهنما"].map((m) => <span key={m} className="rounded-lg px-3 py-2 hover:bg-secondary">{m}</span>)}
        </div>}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        <section className="rounded-3xl bg-emerald-950 px-6 py-10 text-white shadow-xl sm:px-10 sm:py-14">
          <p className="text-sm font-bold text-emerald-200">TERRABAR | ترابار</p>
          <h1 className="mt-3 text-3xl font-black leading-relaxed sm:text-5xl">بازار میوه و تره‌بار ایران</h1>
          <p className="mt-4 max-w-xl text-sm leading-8 text-emerald-50/90 sm:text-base">ارتباط باغدار، تأمین‌کننده، بارفروش و خریدار در یک مسیر شفاف.</p>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          {actions.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
              <span className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="size-6" /></span>
              <h2 className="mt-4 text-lg font-extrabold text-foreground">{title}</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-primary">نمونه دکمه <ArrowLeft className="size-4" /></span>
            </div>
          ))}
        </section>

        <section className="mt-10">
          <h2 className="text-xl font-black text-foreground">نمونه کارت محصول</h2>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Info className="size-4" /> داده‌ها و قیمت‌ها صرفاً نمونه طراحی هستند.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <article key={p.name} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <img src={p.img} alt={p.name} loading="lazy" className="h-44 w-full object-cover" />
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-extrabold text-foreground">{p.name}</h3>
                    <span className="rounded-full bg-secondary px-2 py-1 text-xs font-bold text-secondary-foreground">نمونه</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{p.city} · {p.grade}</p>
                  <p className="mt-3 text-lg font-black text-primary">{p.price} <span className="text-xs font-semibold text-muted-foreground">تومان/کیلو (نمونه)</span></p>
                  <button disabled className="mt-3 w-full cursor-not-allowed rounded-xl bg-muted px-4 py-2.5 text-sm font-bold text-muted-foreground">فقط نمایش طراحی</button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="mt-10 text-center">
          <Link to="/" className="text-sm font-bold text-primary">بازگشت به صفحه اصلی فعلی</Link>
        </div>
      </main>
    </div>
  );
}
