import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, PackagePlus, Search, LogIn, Leaf, MapPin, ShieldCheck } from "lucide-react";
import { pageHead } from "@/lib/marketplace";

export const Route = createFileRoute("/")({
  head: () =>
    pageHead(
      "ترابار | بازار میوه و تره‌بار ایران",
      "ترابار؛ بستری برای معرفی بار، درخواست خرید و همکاری فعالان بازار میوه و تره‌بار.",
      "/"
    ),
  component: Index,
});

const actions = [
  {
    title: "ثبت‌نام / ورود",
    description: "برای شروع همکاری یا ورود به حساب کاربری",
    to: "/auth",
    icon: LogIn,
  },
  {
    title: "اعلام بار",
    description: "ثبت و مدیریت محصول، کیفیت، موجودی و قیمت",
    to: "/announce",
    icon: PackagePlus,
  },
  {
    title: "درخواست بار",
    description: "جست‌وجوی بار و ثبت درخواست تأمین محصول",
    to: "/requests",
    icon: Search,
  },
];

function Index() {
  return (
    <div className="min-h-[70vh] bg-background">
      <section className="site-container py-8 sm:py-12">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:grid-cols-[1fr_2fr] sm:items-center sm:p-8">
            <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border-2 border-dashed border-emerald-700/30 bg-emerald-50/50 p-5 text-center text-emerald-900">
              <Leaf className="mb-3 size-9" aria-hidden="true" />
              <p className="font-bold">نشان ترابار</p>
              <p className="mt-1 text-sm leading-6">محل قرارگیری لوگوی رسمی</p>
            </div>
            <div className="py-2">
              <p className="text-sm font-bold tracking-wide text-emerald-700">TERRABAR | ترابار</p>
              <h1 className="mt-3 text-2xl font-black leading-relaxed text-foreground sm:text-4xl">
                فروش عمده میوه و تره‌بار
              </h1>
              <p className="mt-3 text-sm leading-8 text-muted-foreground sm:text-base">
                ارتباط باغدار، کشاورز، تأمین‌کننده، بارفروش و خریدار؛ از معرفی بار تا پیدا کردن محصول موردنیاز بازار.
              </p>
              <p className="mt-4 inline-flex items-center gap-2 text-sm text-emerald-800">
                <MapPin className="size-4" aria-hidden="true" />
                دسترسی‌ها بر اساس نقش کاربری و شهر فعالیت تنظیم می‌شوند.
              </p>
            </div>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            {actions.map(({ title, description, to, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="group flex min-h-44 flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-700/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
              >
                <span className="grid size-11 place-items-center rounded-xl bg-emerald-50 text-emerald-800">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="mt-4 text-lg font-extrabold text-foreground">{title}</span>
                <span className="mt-2 text-sm leading-7 text-muted-foreground">{description}</span>
                <span className="mt-auto flex items-center gap-2 pt-4 text-sm font-bold text-emerald-800">
                  ورود به بخش <ArrowLeft className="size-4 transition group-hover:-translate-x-1" />
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-700/20 bg-emerald-50/50 p-4 text-sm leading-7 text-emerald-950">
            <ShieldCheck className="mt-1 size-5 shrink-0" aria-hidden="true" />
            <p>ثبت و انتشار بار برای اعضای تأییدشده انجام می‌شود. برای جست‌وجو و ثبت درخواست، وارد حساب کاربری شوید تا محدودیت‌های شهر و نقش شما رعایت شود.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
