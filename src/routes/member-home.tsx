/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase schema queries use dynamic types while generated client types are stale. */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UserRound, ShoppingBasket, PackagePlus, ArrowLeft, Sprout, BookOpenText, LifeBuoy, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { pageHead } from "@/lib/marketplace";

export const Route = createFileRoute("/member-home")({
  head: () => pageHead("صفحه اصلی کاربران | ترابار", "صفحه اختصاصی اعضای ترابار بر اساس نقش کاربری."),
  component: MemberHome,
});

function MemberHome() {
  const { user, loading, roles, canAnnounce } = useAuth();
  const [isOrdinaryBuyer, setIsOrdinaryBuyer] = useState(false);
  const [roleCheckDone, setRoleCheckDone] = useState(false);

  useEffect(() => {
    let active = true;
    async function checkRole() {
      setRoleCheckDone(false);
      if (!user) {
        if (active) { setIsOrdinaryBuyer(false); setRoleCheckDone(true); }
        return;
      }
      const roleHints = (roles ?? []).map((role: any) => String(typeof role === "string" ? role : role?.role_code ?? role?.role ?? "").toLowerCase());
      const isBuyerHint = roleHints.some((role: string) => ["buyer", "ordinary_buyer", "regular_buyer"].includes(role));
      const isProfessionalHint = roleHints.some((role: string) => ["supplier", "bar_seller", "seller", "special_buyer", "buyer_special", "professional_buyer"].includes(role));
      const { data: memberRow, error: memberError } = await (supabase as any)
        .from("members")
        .select("id")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      if (!active) return;
      if (memberError || !memberRow?.id) {
        setIsOrdinaryBuyer(false);
        setRoleCheckDone(true);
        return;
      }
      const { data, error: roleError } = await (supabase as any)
        .from("member_roles")
        .select("role_code")
        .eq("member_id", memberRow.id)
        .eq("approval_status", "approved");
      if (!active) return;
      if (roleError) console.error("[Terrabar member home] Could not load approved roles:", roleError);
      const codes = (data ?? []).map((row: any) => String(row.role_code).toLowerCase());
      const hasBuyer = isBuyerHint || codes.some((role: string) => ["buyer", "ordinary_buyer", "regular_buyer"].includes(role));
      const hasNonOrdinary = isProfessionalHint || codes.some((role: string) => ["supplier", "bar_seller", "seller", "special_buyer", "buyer_special", "professional_buyer", "pro_buyer"].includes(role));
      setIsOrdinaryBuyer(hasBuyer && !hasNonOrdinary);
      setRoleCheckDone(true);
    }
    void checkRole();
    return () => { active = false; };
  }, [user?.id, roles]);

  const buyerOptions = [
    { title: "حساب کاربری", description: "اطلاعات حساب و پیگیری‌های لازم", icon: UserRound, to: "/account", style: "bg-emerald-50 text-emerald-800" },
    { title: "خرید بار و درخواست سفارش", description: "جست‌وجوی بار، خرید خرده، عمده، ویژه یا ثبت درخواست تأمین", icon: ShoppingBasket, to: "/requests", style: "bg-lime-50 text-lime-800" },
  ];
  const memberOptions = [
    ...buyerOptions,
    ...(canAnnounce ? [
      { title: "فروش و اعلام بار", description: "ثبت و مدیریت بارهای فروش و سفارش‌های دریافتی", icon: PackagePlus, to: "/announce", style: "bg-teal-50 text-teal-800" },
    ] : []),
  ];

  if (loading || !roleCheckDone) return <main dir="rtl" className="site-container py-16 text-center text-sm text-muted-foreground">در حال آماده‌سازی صفحه حساب شما…</main>;
  const options = isOrdinaryBuyer ? buyerOptions : memberOptions;

  return (
    <main dir="rtl" className="min-h-[70vh] bg-market-surface px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <header className="relative mb-7 overflow-hidden rounded-3xl bg-emerald-950 px-5 py-7 text-white shadow-lg sm:mb-9 sm:px-8 sm:py-9">
          <div aria-hidden="true" className="pointer-events-none absolute -left-12 -top-16 size-48 rounded-full border-[22px] border-white/5 sm:size-64" />
          <div className="relative">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-emerald-50"><Sprout className="size-4" /> TERRABAR | ترابار</div>
            <h1 className="text-2xl font-black leading-relaxed sm:text-3xl">{isOrdinaryBuyer ? "صفحه اصلی خریدار عادی" : "صفحه اصلی اعضای ترابار"}</h1>
            <p className="mt-2 text-sm leading-7 text-emerald-50/90">{isOrdinaryBuyer ? "برای مدیریت حساب یا ثبت درخواست خرید، یکی از گزینه‌های زیر را انتخاب کنید." : "امکانات خرید برای اعضا در دسترس است؛ امکانات فروش بر اساس تأیید عضویت فعال می‌شود."}</p>
          </div>
        </header>
        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          {options.map((option) => {
            const Icon = option.icon;
            return <Link key={option.title} to={option.to as any} className="group flex min-h-28 items-center gap-4 rounded-2xl border border-border bg-card px-4 py-5 text-right shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:min-h-32 sm:gap-5 sm:px-6">
              <span className={`grid size-14 shrink-0 place-items-center rounded-xl sm:size-16 ${option.style}`}><Icon className="size-7 sm:size-8" aria-hidden="true" /></span>
              <span className="min-w-0 flex-1"><span className="block text-lg font-extrabold text-foreground sm:text-xl">{option.title}</span><span className="mt-1 block text-sm leading-6 text-muted-foreground">{option.description}</span></span>
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-secondary text-foreground transition group-hover:bg-accent group-hover:text-primary"><ArrowLeft className="size-5 transition group-hover:-translate-x-0.5" aria-hidden="true" /></span>
            </Link>;
          })}
        </div>
        {isOrdinaryBuyer ? <section className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center gap-2 font-extrabold"><BookOpenText className="size-5 text-primary" /> راهنمای خریدار عادی</div>
          <ul className="mt-3 grid gap-2 text-sm leading-7 text-muted-foreground">
            <li>• برای خرید از گزینه «خرید بار و درخواست سفارش» استفاده کنید.</li>
            <li>• برای تأمین چند محصول، بخش «درخواست سفارش» را تکمیل کنید.</li>
            <li>• وضعیت درخواست‌ها و سفارش‌ها از بخش حساب کاربری و پیگیری‌ها قابل مشاهده است.</li>
            <li>• بارهای قابل مشاهده بر اساس شهر و سطح دسترسی خرید شما محدود می‌شوند.</li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
            <Link to="/guide" className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold"><BookOpenText className="size-4" /> راهنمای کامل</Link>
            <Link to="/contact" className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold"><LifeBuoy className="size-4" /> پشتیبانی</Link>
            <Link to="/rules" className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold"><ShieldCheck className="size-4" /> قوانین و حریم خصوصی</Link>
          </div>
        </section> : <section className="mt-6 rounded-2xl border border-border bg-card p-5 text-sm leading-7 text-muted-foreground"><ShieldCheck className="mb-2 size-5 text-primary" /> {canAnnounce ? "حساب شما به امکانات خرید و فروش دسترسی دارد." : "امکانات خرید فعال است؛ اعلام بار و مدیریت ویترین پس از تأیید عضویت فروشندگی فعال می‌شود."}</section>}
      </div>
    </main>
  );
}
