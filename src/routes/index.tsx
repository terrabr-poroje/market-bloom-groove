import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle2,
  MapPinned,
  PackagePlus,
  Search,
  ShieldCheck,
  Sprout,
  Store,
  Truck,
  Users,
  LogIn,
} from "lucide-react";
import { pageHead } from "@/lib/marketplace";

export const Route = createFileRoute("/")({
  head: () =>
    pageHead(
      "ترابار | بازار میوه و تره‌بار ایران",
      "ترابار؛ بستری برای معرفی بار، درخواست خرید و همکاری فعالان بازار میوه و تره‌بار."
    ),
  component: Index,
});

const mainActions = [
  {
    title: "ثبت‌نام / ورود",
    description: "حساب خود را بسازید یا با شماره موبایل وارد ترابار شوید.",
    icon: LogIn,
    to: "/auth",
    action: "ورود یا ثبت‌نام",
    tone: "bg-emerald-50 text-emerald-800",
  },
  {
    title: "اعلام بار",
    description: "محصول، رقم، کیفیت، مبدأ، وزن، موجودی و قیمت بار خود را معرفی کنید.",
    icon: PackagePlus,
    to: "/announce",
    action: "ثبت و مدیریت بار",
    tone: "bg-lime-50 text-lime-800",
  },
  {
    title: "درخواست بار",
    description: "بار موردنیاز را جست‌وجو کنید یا درخواست تأمین محصولات خود را ثبت کنید.",
    icon: Search,
    to: "/requests",
    action: "جست‌وجوی بار",
    tone: "bg-teal-50 text-teal-800",
  },
];

const steps = [
  { number: "۱", title: "عضویت و انتخاب شهر", text: "با نقش کاری و شهر فعالیت خود شروع کنید.", icon: Users },
  { number: "۲", title: "معرفی یا جست‌وجوی بار", text: "اطلاعات محصول و شرایط خرید را بررسی کنید.", icon: Store },
  { number: "۳", title: "هماهنگی و تحویل", text: "فرآیند سفارش را طبق دسترسی‌ها و مقررات ترابار پیگیری کنید.", icon: Truck },
];

function Index() {
  return (
    <div className="overflow-hidden">
      <section className="relative bg-market-surface">
        <div className="site-container py-8 sm:py-12 lg:py-16">
          <div className="relative isolate overflow-hidden rounded-3xl bg-emerald-950 px-5 py-8 text-white shadow-xl sm:px-9 sm:py-11 lg:px-14 lg:py-14">
            <div aria-hidden="true" className="pointer-events-none absolute -left-16 -top-24 size-72 rounded-full border-[36px] border-white/5 sm:size-96" />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-24 left-1/3 size-64 rounded-full bg-emerald-700/30 blur-3xl" />
            <div className="relative grid items-center gap-9 lg:grid-cols-[1.2fr_0.8fr] lg:gap-12">
              <div className="max-w-2xl">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-emerald-50">
                  <Sprout className="size-4" />
                  از باغ تا بازار، در یک مسیر
                </div>
                <p className="text-sm font-bold tracking-wide text-emerald-200">TERRABAR <span className="mx-1 text-white/40">|</span> ترابار</p>
                <h1 className="mt-3 text-3xl font-black leading-relaxed sm:text-4xl lg:text-5xl">بازار میوه و تره‌بار ایران</h1>
                <p className="mt-4 max-w-xl text-sm leading-8 text-emerald-50/90 sm:text-base">
                  بستری برای ارتباط باغدار، کشاورز، تأمین‌کننده، بارفروش و خریدار؛
                  برای معرفی بار و پیدا کردن محصول موردنیاز بازار.
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Link to="/auth" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-emerald-950 transition hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                    شروع همکاری <ArrowLeft className="size-4" />
                  </Link>
                  <Link to="/requests" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                    جست‌وجوی بار <Search className="size-4" />
                  </Link>
                </div>
                <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-xs text-emerald-100/90">
                  <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="size-4" /> مسیرهای مجزا برای هر نقش</span>
                  <span className="inline-flex items-center gap-1.5"><MapPinned className="size-4" /> توجه به شهر و محدوده دسترسی</span>
                </div>
              </div>

              <div className="relative mx-auto w-full max-w-sm">
                <div className="rounded-2xl border border-white/15 bg-white/[0.08] p-4 shadow-2xl backdrop-blur-sm sm:p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-emerald-100/70">بازار ترابار</p>
                      <h2 className="mt-1 text-lg font-extrabold">از کجا شروع می‌کنید؟</h2>
                    </div>
                    <div className="grid size-11 place-items-center rounded-xl bg-lime-300 text-emerald-950"><Sprout className="size-6" /></div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/10 p-3">
                      <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-white/10"><Users className="size-5 text-lime-200" /></div>
                      <div><p className="text-sm font-bold">عضو بازار شوید</p><p className="mt-1 text-xs leading-5 text-emerald-100/70">ورود و ثبت‌نام در ترابار</p></div>
                      <ArrowLeft className="mr-auto size-4 text-emerald-100/70" />
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/10 p-3">
                      <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-white/10"><PackagePlus className="size-5 text-lime-200" /></div>
                      <div><p className="text-sm font-bold">بار خود را معرفی کنید</p><p className="mt-1 text-xs leading-5 text-emerald-100/70">ثبت اطلاعات و موجودی محصول</p></div>
                      <ArrowLeft className="mr-auto size-4 text-emerald-100/70" />
                    </div>
                    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/10 p-3">
                      <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-white/10"><Search className="size-5 text-lime-200" /></div>
                      <div><p className="text-sm font-bold">بار موردنیاز را پیدا کنید</p><p className="mt-1 text-xs leading-5 text-emerald-100/70">جست‌وجو و ثبت درخواست خرید</p></div>
                      <ArrowLeft className="mr-auto size-4 text-emerald-100/70" />
                    </div>
                  </div>
                  <p className="mt-4 flex items-center gap-2 border-t border-white/10 pt-4 text-xs leading-6 text-emerald-100/70"><ShieldCheck className="size-4 shrink-0 text-lime-200" /> دسترسی‌ها بر اساس نقش کاربری و شهر فعالیت تنظیم می‌شوند.</p>
                </div>
                <div className="absolute -bottom-4 -left-3 -z-10 size-24 rounded-2xl bg-lime-300/20 blur-xl" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-background py-10 sm:py-14 lg:py-16">
        <div className="site-container">
          <div className="mb-7 flex flex-col gap-2 sm:mb-9 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold text-primary">مسیرهای اصلی</p>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">کار خود را از اینجا شروع کنید</h2>
            </div>
            <p className="max-w-lg text-sm leading-7 text-muted-foreground">با توجه به نقش خود، وارد مسیر مناسب شوید و مراحل بعدی را دنبال کنید.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {mainActions.map(item => {
              const Icon = item.icon;
              return (
                <article key={item.to} className="group flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg sm:p-6">
                  <div className="mb-5 flex items-center justify-between">
                    <div className={`grid size-14 place-items-center rounded-2xl ${item.tone}`}><Icon className="size-7" /></div>
                    <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">مسیر ترابار</span>
                  </div>
                  <h3 className="text-lg font-extrabold">{item.title}</h3>
                  <p className="mt-3 flex-1 text-sm leading-7 text-muted-foreground">{item.description}</p>
                  <Link to={item.to} className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    {item.action}<ArrowLeft className="mr-auto size-4 transition-transform group-hover:-translate-x-1" />
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-market-surface py-10 sm:py-14">
        <div className="site-container">
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <p className="text-sm font-bold text-primary">مسیر همکاری</p>
            <h2 className="mt-2 text-2xl font-black sm:text-3xl">فرآیند ترابار، قدم‌به‌قدم</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">از ساخت حساب تا پیگیری بار، هر بخش برای نیازهای فعالان بازار طراحی شده است.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {steps.map(step => {
              const Icon = step.icon;
              return (
                <div key={step.number} className="relative rounded-2xl border border-border bg-card p-5 sm:p-6">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-full bg-primary text-sm font-extrabold text-primary-foreground">{step.number}</span>
                    <div className="grid size-10 place-items-center rounded-xl bg-accent text-primary"><Icon className="size-5" /></div>
                  </div>
                  <h3 className="mt-5 font-extrabold">{step.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{step.text}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex flex-col items-start justify-between gap-4 rounded-2xl border border-emerald-900/10 bg-emerald-950 p-5 text-white sm:flex-row sm:items-center sm:px-7">
            <div>
              <h3 className="font-extrabold">آماده شروع هستید؟</h3>
              <p className="mt-1 text-sm leading-7 text-emerald-100/80">وارد ترابار شوید و مسیر متناسب با فعالیت خود را انتخاب کنید.</p>
            </div>
            <Link to="/auth" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-emerald-950 transition hover:bg-emerald-50">ورود به ترابار <ArrowLeft className="size-4" /></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
