import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft, Menu, Search, Sprout, Package, ShoppingBasket,
  Store, ShieldCheck, MapPin, ChevronLeft, Leaf, Truck,
} from "lucide-react";

export const Route = createFileRoute("/design-preview")({
  head: () => ({
    meta: [
      { title: "پیش‌نمایش طراحی ترابار" },
      { name: "description", content: "پیش‌نمایش رابط کاربری سبز و سفید ترابار؛ نسخه طراحی و بدون اتصال به عملیات واقعی." },
    ],
  }),
  component: DesignPreview,
});

const products = [
  { name: "گوجه‌فرنگی", type: "دستچین بازار", price: "۴۵٬۰۰۰", unit: "تومان / کیلو", weight: "۱۰ کیلوگرم", packages: "۵۰ بسته", image: "photo-1546094096-0df4bcaaa337" },
  { name: "خیار", type: "تازه و یکدست", price: "۳۸٬۰۰۰", unit: "تومان / کیلو", weight: "۱۰ کیلوگرم", packages: "۸۰ بسته", image: "photo-1604977042946-1eecc30f269e" },
  { name: "سیب قرمز", type: "درجه یک", price: "۶۲٬۰۰۰", unit: "تومان / کیلو", weight: "۸ کیلوگرم", packages: "۳۲ بسته", image: "photo-1560806887-1e4cd0b6cbd6" },
  { name: "پرتقال", type: "مناسب بازار", price: "۴۰٬۰۰۰", unit: "تومان / کیلو", weight: "۱۰ کیلوگرم", packages: "۶۰ بسته", image: "photo-1547514701-42782101795e" },
];

function DesignPreview() {
  return (
    <main dir="rtl" className="min-h-screen bg-[#f5f8f5] text-slate-800">
      <div className="border-b border-emerald-100 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button aria-label="منو" className="grid size-10 place-items-center rounded-xl border border-slate-200 text-emerald-900"><Menu className="size-5" /></button>
            <div className="flex items-center gap-2">
              <span className="grid size-10 place-items-center rounded-xl bg-emerald-700 text-white"><Leaf className="size-6" /></span>
              <div><p className="text-xl font-black tracking-tight text-emerald-800">ترابار</p><p className="text-[10px] font-semibold tracking-[0.2em] text-slate-400">TERRABAR MARKET</p></div>
            </div>
          </div>
          <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-600 md:flex">
            <a href="#products" className="hover:text-emerald-700">مشاهده بارها</a><a href="#how" className="hover:text-emerald-700">راهنمای همکاری</a><a href="#members" className="hover:text-emerald-700">ویترین اعضا</a>
          </nav>
          <Link to="/auth" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-800">ورود / ثبت‌نام <ArrowLeft className="size-4" /></Link>
        </div>
      </div>

      <section className="mx-auto max-w-7xl px-4 pb-10 pt-6 sm:px-6 sm:pb-14 sm:pt-10 lg:px-8">
        <div className="relative isolate overflow-hidden rounded-[2rem] bg-gradient-to-br from-emerald-950 via-emerald-900 to-green-800 px-5 py-10 text-white shadow-xl sm:px-10 sm:py-14 lg:px-14">
          <div aria-hidden="true" className="absolute -left-12 -top-16 -z-10 size-64 rounded-full border-[30px] border-white/5 sm:size-96" />
          <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_.9fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-emerald-100"><Sprout className="size-4" /> ارتباط مستقیم بازار تره‌بار</span>
              <h1 className="mt-5 max-w-2xl text-3xl font-black leading-[1.6] sm:text-4xl lg:text-5xl">از باغ تا بازار، <span className="text-lime-300">ساده‌تر و مطمئن‌تر</span></h1>
              <p className="mt-4 max-w-xl text-sm leading-8 text-emerald-50 sm:text-base">ترابار، فضای همکاری باغداران، کشاورزان، تأمین‌کنندگان، بارفروشان و خریداران برای معرفی بار و پیدا کردن محصول موردنیاز بازار.</p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link to="/auth" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-emerald-950 hover:bg-emerald-50">شروع همکاری <ArrowLeft className="size-4" /></Link>
                <a href="#products" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/5 px-5 py-3 text-sm font-bold text-white hover:bg-white/10"><Search className="size-4" /> مشاهده بارها</a>
              </div>
              <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs text-emerald-100"><span className="inline-flex items-center gap-1.5"><ShieldCheck className="size-4" /> دسترسی متناسب با نقش کاربر</span><span className="inline-flex items-center gap-1.5"><MapPin className="size-4" /> توجه به محدوده شهرها</span></div>
            </div>
            <div className="rounded-3xl border border-white/15 bg-white/10 p-3 shadow-2xl backdrop-blur sm:p-4">
              <div className="overflow-hidden rounded-2xl bg-white">
                <img className="h-44 w-full object-cover sm:h-56" src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=80" alt="سبدهای میوه و سبزی تازه" />
                <div className="grid grid-cols-3 gap-2 p-3 text-center sm:gap-3 sm:p-4">
                  <div className="rounded-xl bg-emerald-50 p-3"><Package className="mx-auto size-5 text-emerald-700" /><p className="mt-2 text-xs font-bold text-emerald-950">اعلام بار</p></div>
                  <div className="rounded-xl bg-emerald-50 p-3"><ShoppingBasket className="mx-auto size-5 text-emerald-700" /><p className="mt-2 text-xs font-bold text-emerald-950">درخواست بار</p></div>
                  <div className="rounded-xl bg-emerald-50 p-3"><Store className="mx-auto size-5 text-emerald-700" /><p className="mt-2 text-xs font-bold text-emerald-950">ویترین اعضا</p></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-end justify-between gap-3"><div><p className="text-xs font-bold text-emerald-700">شروع سریع</p><h2 className="mt-1 text-xl font-black sm:text-2xl">برای چه کاری به ترابار آمده‌اید؟</h2></div><span className="hidden text-xs text-slate-500 sm:block">سه مسیر اصلی بازار</span></div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Link to="/auth" className="group rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><span className="grid size-11 place-items-center rounded-xl bg-emerald-100 text-emerald-800"><UsersIcon /></span><h3 className="mt-4 font-extrabold">ثبت‌نام و ورود</h3><p className="mt-2 text-sm leading-6 text-slate-500">ساخت حساب و انتخاب شهر و نقش اصلی</p><span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-emerald-700">ورود به حساب <ChevronLeft className="size-4" /></span></Link>
          <Link to="/announce" className="group rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><span className="grid size-11 place-items-center rounded-xl bg-emerald-100 text-emerald-800"><Package className="size-5" /></span><h3 className="mt-4 font-extrabold">اعلام بار</h3><p className="mt-2 text-sm leading-6 text-slate-500">معرفی محصول، کیفیت، وزن، تعداد و قیمت</p><span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-emerald-700">معرفی بار <ChevronLeft className="size-4" /></span></Link>
          <Link to="/requests" className="group rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><span className="grid size-11 place-items-center rounded-xl bg-emerald-100 text-emerald-800"><ShoppingBasket className="size-5" /></span><h3 className="mt-4 font-extrabold">درخواست بار</h3><p className="mt-2 text-sm leading-6 text-slate-500">جست‌وجوی محصولات و ثبت نیاز خرید</p><span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-emerald-700">ثبت درخواست <ChevronLeft className="size-4" /></span></Link>
        </div>
      </section>

      <section id="products" className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-end justify-between gap-3"><div><p className="text-xs font-bold text-emerald-700">ویترین بازار</p><h2 className="mt-1 text-xl font-black sm:text-2xl">محصولات تازه</h2><p className="mt-2 text-sm text-slate-500">اطلاعات این کارت‌ها صرفاً نمونه طراحی است و قیمت واقعی بازار نیست.</p></div><a href="#products" className="hidden items-center gap-1 text-sm font-bold text-emerald-700 sm:flex">همه محصولات <ChevronLeft className="size-4" /></a></div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {products.map((p) => <article key={p.name} className="overflow-hidden rounded-2xl border border-emerald-100 bg-white shadow-sm transition hover:shadow-md"><img src={`https://images.unsplash.com/${p.image}?auto=format&fit=crop&w=700&q=75`} alt={p.name} loading="lazy" className="h-32 w-full object-cover sm:h-44" /><div className="p-3 sm:p-4"><span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-800">{p.type}</span><h3 className="mt-3 font-extrabold">{p.name}</h3><p className="mt-1 text-xs text-slate-500">{p.weight} · {p.packages}</p><div className="mt-4 border-t border-slate-100 pt-3"><p className="text-lg font-black text-emerald-800">{p.price}</p><p className="text-[11px] text-slate-500">{p.unit}</p></div></div></article>)}
        </div>
      </section>

      <section id="members" className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8"><div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-emerald-100 bg-white p-6 sm:flex-row sm:items-center sm:p-8"><div className="flex items-start gap-3"><span className="grid size-12 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-800"><Truck className="size-6" /></span><div><h2 className="text-lg font-black">همکاری مستقیم، مسیر روشن‌تر</h2><p className="mt-2 max-w-2xl text-sm leading-7 text-slate-500">ترابار برای ارتباط بهتر فعالان زنجیره تأمین میوه و تره‌بار طراحی می‌شود. اطلاعات واقعی و دسترسی‌ها پس از اتصال و بررسی سامانه نمایش داده خواهند شد.</p></div></div><Link to="/auth" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800">عضویت در ترابار <ArrowLeft className="size-4" /></Link></div></section>
      <footer className="border-t border-emerald-100 bg-white"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8"><span className="font-black text-emerald-800">ترابار | TERRABAR</span><span>باغدار · کشاورز · بارفروش · خریدار</span><span>پیش‌نمایش طراحی — بدون عملیات واقعی خرید یا پرداخت</span></div></footer>
    </main>
  );
}

function UsersIcon() {
  return <Store className="size-5" />;
}
