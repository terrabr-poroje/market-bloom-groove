import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, LogIn, PackagePlus, Search, Sprout } from "lucide-react";
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
  },
  {
    title: "اعلام بار",
    description: "بار خود را با محصول، رقم، کیفیت، مبدأ، وزن، موجودی و قیمت معرفی کنید.",
    icon: PackagePlus,
    to: "/announce",
    action: "ثبت و مدیریت بار",
  },
  {
    title: "درخواست بار",
    description: "بارهای مجاز را جست‌وجو کنید یا درخواست تأمین چندمحصولی ثبت کنید.",
    icon: Search,
    to: "/requests",
    action: "جست‌وجوی بار",
  },
];

function Index() {
  return (
    <>
      <section className="bg-background">
        <div className="site-container py-10 sm:py-16">
          <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
            <div className="mb-6 grid size-24 place-items-center rounded-2xl border-2 border-dashed border-primary/40 bg-accent text-primary sm:size-28" aria-label="جایگاه لوگوی ترابار">
              <Sprout className="size-12 sm:size-14" />
            </div>
            <p className="text-sm font-semibold text-primary">TERRABAR | ترابار</p>
            <h1 className="mt-3 text-3xl font-extrabold leading-relaxed text-foreground sm:text-5xl">بازار میوه و تره‌بار ایران</h1>
            <p className="mt-4 max-w-2xl text-sm leading-8 text-muted-foreground sm:text-base">
              ارتباط باغدار، کشاورز، تأمین‌کننده، بارفروش و خریدار در یک بستر واحد؛
              <br className="hidden sm:block" />
              برای معرفی بار و پیدا کردن محصول موردنیاز بازار.
            </p>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-market-surface py-10 sm:py-14">
        <div className="site-container">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-extrabold sm:text-3xl">از کجا شروع می‌کنید؟</h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">یکی از مسیرهای اصلی ترابار را انتخاب کنید.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {mainActions.map(item => {
              const Icon = item.icon;
              return (
                <article key={item.to} className="flex flex-col rounded-xl border border-border bg-card p-5 sm:p-6">
                  <div className="mb-4 grid size-12 place-items-center rounded-xl bg-accent text-primary"><Icon className="size-6" /></div>
                  <h3 className="text-lg font-bold">{item.title}</h3>
                  <p className="mt-3 flex-1 text-sm leading-7 text-muted-foreground">{item.description}</p>
                  <Link to={item.to} className="mt-6 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">{item.action}<ArrowLeft className="mr-auto size-4" /></Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
