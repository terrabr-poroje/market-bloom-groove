import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ShoppingBasket, PackagePlus, Store, Sprout, ShieldCheck } from "lucide-react";
import { pageHead } from "@/lib/marketplace";

export const Route = createFileRoute("/")({
  head: () =>
    pageHead(
      "ترابار | بازار خرید و اعلام بار میوه و تره‌بار",
      "در ترابار بار پیدا کنید، بار خود را اعلام کنید و ویترین اختصاصی خود را برای نمایش بارهای فعال بسازید.",
      "/"
    ),
  component: Index,
});

const introductions = [
  {
    title: "خرید بار",
    description:
      "بارهای قابل عرضه را بررسی کنید، محصول موردنیازتان را پیدا کنید و برای خرید یا تأمین آن درخواست بفرستید. دسترسی به بارها بر اساس نوع حساب و شهر فعالیت تنظیم می‌شود.",
    icon: ShoppingBasket,
    tone: "bg-emerald-50 text-emerald-800",
  },
  {
    title: "اعلام بار",
    description:
      "اگر باغدار، کشاورز، تأمین‌کننده یا بارفروش هستید، اطلاعات محصول، کیفیت، مقدار و قیمت را ثبت کنید تا خریداران بتوانند بار شما را پیدا کنند. اعلام بار حرفه‌ای پس از تأیید عضویت فعال می‌شود.",
    icon: PackagePlus,
    tone: "bg-lime-50 text-lime-800",
  },
  {
    title: "ویترین اختصاصی هر شخص",
    description:
      "هر عضو می‌تواند لینک ویترین اختصاصی خود را در اختیار مشتریان بگذارد. ویترین، بارهای فعال همان عضو را نمایش می‌دهد تا مشتریان راحت‌تر محصولات او را ببینند و درخواست خرید ثبت کنند.",
    icon: Store,
    tone: "bg-teal-50 text-teal-800",
  },
];

function Index() {
  return (
    <div className="min-h-[75vh] bg-background">
      <section className="site-container py-8 sm:py-14">
        <div className="mx-auto max-w-5xl">
          <div className="overflow-hidden rounded-3xl border border-emerald-900/10 bg-gradient-to-br from-emerald-50 via-white to-lime-50 px-5 py-8 text-center shadow-sm sm:px-10 sm:py-12">
            <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-emerald-700 text-white shadow-sm">
              <Sprout className="size-8" aria-hidden="true" />
            </div>
            <p className="mt-5 text-sm font-extrabold tracking-wide text-emerald-800">TERRABAR | ترابار</p>
            <h1 className="mx-auto mt-3 max-w-3xl text-2xl font-black leading-relaxed text-emerald-950 sm:text-4xl">
              بازار ارتباطی خرید و اعلام بار میوه و تره‌بار
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-8 text-slate-700 sm:text-base">
              ترابار برای ارتباط ساده‌تر خریداران، باغداران، کشاورزان، تأمین‌کنندگان و بارفروشان ساخته می‌شود؛ از معرفی بار تا درخواست خرید و ویترین اختصاصی اعضا.
            </p>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-3">
            {introductions.map(({ title, description, icon: Icon, tone }) => (
              <article key={title} className="flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
                <span className={`grid size-12 place-items-center rounded-xl ${tone}`}>
                  <Icon className="size-6" aria-hidden="true" />
                </span>
                <h2 className="mt-4 text-lg font-extrabold text-foreground">{title}</h2>
                <p className="mt-2 text-sm leading-8 text-muted-foreground">{description}</p>
              </article>
            ))}
          </div>

          <div className="mt-7 rounded-2xl border border-emerald-800/15 bg-white p-5 text-center shadow-sm sm:p-7">
            <div className="mx-auto flex max-w-2xl items-start justify-center gap-2 text-sm leading-7 text-emerald-950">
              <ShieldCheck className="mt-1 size-5 shrink-0 text-emerald-700" aria-hidden="true" />
              <p>برای شروع استفاده از امکانات ترابار، ابتدا وارد بخش ثبت‌نام و ورود شوید. فعال‌شدن امکانات حرفه‌ای به تأیید عضویت مربوط است.</p>
            </div>
            <Link
              to="/auth"
              className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-6 py-3 font-extrabold text-white transition hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2 sm:w-auto"
            >
              مرحلهٔ بعد
              <ArrowLeft className="size-5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
