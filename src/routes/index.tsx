import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpLeft,
  LogIn,
  PackagePlus,
  Search,
  Sprout,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { pageHead } from "@/lib/marketplace";
import heroImage from "@/assets/market-hero.jpg";

export const Route = createFileRoute("/")({
  head: () =>
    pageHead(
      "ترابار | بازار میوه و تره‌بار ایران",
      "ترابار؛ بستری برای معرفی بار، درخواست خرید و ارتباط فعالان بازار میوه و تره‌بار."
    ),
  component: Index,
});

const mainActions = [
  {
    title: "ثبت‌نام / ورود",
    description:
      "وارد حساب خود شوید یا برای شروع فعالیت در بازار ترابار ثبت‌نام کنید.",
    icon: LogIn,
    to: "/auth",
    action: "ورود یا ثبت‌نام",
  },
  {
    title: "اعلام بار",
    description:
      "محصول و بار خود را با مشخصات، کیفیت، مبدأ و قیمت معرفی کنید.",
    icon: PackagePlus,
    to: "/announce",
    action: "ثبت و اعلام بار",
  },
  {
    title: "درخواست بار",
    description:
      "بارهای موجود را بررسی کنید و محصول مورد نیازتان را پیدا کنید.",
    icon: Search,
    to: "/requests",
    action: "مشاهده بارها",
  },
];

function Index() {
  return (
    <>
      <section className="relative isolate overflow-hidden bg-footer text-primary-foreground">
        <img
          src={heroImage}
          alt="بازار میوه و تره‌بار و محصولات تازه"
          width={1920}
          height={1024}
          fetchPriority="high"
          className="absolute inset-0 -z-20 h-full w-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-black/60" />

        <div className="site-container py-16 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm">
              <Sprout className="size-5" />
              ارتباط فعالان بازار میوه و تره‌بار
            </div>

            <h1 className="text-4xl font-extrabold leading-relaxed sm:text-6xl">
              ترابار
              <span className="mt-2 block text-2xl font-bold sm:text-4xl">
                بازار میوه و تره‌بار ایران
              </span>
            </h1>

            <p className="mx-auto mt-5 max-w-2xl text-sm leading-8 text-white/90 sm:text-base">
              از باغدار و کشاورز تا بارفروش و خریدار؛
              <br />
              بستری برای معرفی بار و پیدا کردن محصول مورد نیاز بازار.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-background py-12 sm:py-16">
        <div className="site-container">
          <div className="mb-9 text-center">
            <h2 className="text-2xl font-extrabold sm:text-3xl">
              از کجا شروع می‌کنید؟
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              مسیر مورد نظر خود را انتخاب کنید.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {mainActions.map((item) => (
              <div
                key={item.to}
                className="flex flex-col rounded-xl border border-border bg-background p-6 transition-shadow hover:shadow-md"
              >
                <div className="mb-5 grid size-12 place-items-center rounded-xl bg-accent text-primary">
                  <item.icon className="size-6" />
                </div>

                <h3 className="text-lg font-bold">{item.title}</h3>

                <p className="mt-3 flex-1 text-sm leading-8 text-muted-foreground">
                  {item.description}
                </p>

                <Button asChild className="mt-6 w-full">
                  <Link to={item.to}>
                    {item.action}
                    <ArrowUpLeft className="mr-1 size-4" />
                  </Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-market-surface py-8">
        <div className="site-container text-center">
          <p classNam="text-sm leading-8 text-muted-foreground">

            ترابار؛ نقطه اتصال تأمین‌کنندگان، بارفروشان و خریداران.

            <br />

            هدف ما، ساده‌تر کردن معرفی بار و جست‌وجوی محصول در بازار است.

          </p>

        </div>

      </section>

    </>

  );

}