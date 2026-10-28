/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase schema queries use dynamic types while generated DB types are stale. */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  UserRound, ShoppingBasket, PackagePlus, ArrowLeft, Sprout,
  BookOpenText, LifeBuoy, ShieldCheck, Store, Clock3, ClipboardList, WalletCards, PackageCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { pageHead } from "@/lib/marketplace";

export const Route = createFileRoute("/member-home")({
  head: () => pageHead("صفحه اصلی کاربران | ترابار", "صفحه اختصاصی خریدار، تأمین‌کننده و بارفروش در ترابار."),
  component: MemberHome,
});

type RoleHomeData = {
  memberId: string;
  name: string;
  city: string;
  primaryRole: "buyer" | "supplier" | "seller";
  hasSupplierRole: boolean;
  hasSellerRole: boolean;
  supplierApproved: boolean;
  sellerApproved: boolean;
};

function MemberHome() {
  const { user, loading } = useAuth();
  const [roleData, setRoleData] = useState<RoleHomeData | null>(null);
  const [roleCheckDone, setRoleCheckDone] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadRoleData() {
      setRoleCheckDone(false);
      setLoadError("");
      if (!user) {
        if (active) {
          setRoleData(null);
          setRoleCheckDone(true);
        }
        return;
      }

      const { data: member, error: memberError } = await (supabase as any)
        .from("members")
        .select("id, full_name, city, role")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      if (!active) return;
      if (memberError || !member?.id) {
        setRoleData(null);
        setLoadError("اطلاعات حساب شما بارگذاری نشد. لطفاً دوباره وارد شوید یا با پشتیبانی تماس بگیرید.");
        setRoleCheckDone(true);
        return;
      }

      const { data: roleRows, error: rolesError } = await (supabase as any)
        .from("member_roles")
        .select("role_code, approval_status")
        .eq("member_id", member.id);

      if (!active) return;
      if (rolesError) console.error("[Terrabar member home] Could not load role approvals:", rolesError);

      const rows = roleRows ?? [];
      const memberRole = String(member.role ?? "").toLowerCase();
      const codes = rows.map((row: any) => ({
        code: String(row.role_code ?? "").toLowerCase(),
        status: String(row.approval_status ?? "").toLowerCase(),
      }));
      const hasSupplierRole = memberRole === "supplier" || codes.some((row: any) => row.code === "supplier");
      const hasSellerRole = ["seller", "bar_seller"].includes(memberRole) || codes.some((row: any) => ["seller", "bar_seller"].includes(row.code));
      const supplierApproved = codes.some((row: any) => row.code === "supplier" && row.status === "approved");
      const sellerApproved = codes.some((row: any) => ["seller", "bar_seller"].includes(row.code) && row.status === "approved");
      const primaryRole = hasSupplierRole ? "supplier" : hasSellerRole ? "seller" : "buyer";

      setRoleData({
        memberId: String(member.id),
        name: String(member.full_name || ""),
        city: String(member.city || ""),
        primaryRole,
        hasSupplierRole,
        hasSellerRole,
        supplierApproved,
        sellerApproved,
      });
      setRoleCheckDone(true);
    }

    void loadRoleData();
    return () => { active = false; };
  }, [user?.id]);

  if (loading || !roleCheckDone) {
    return <main dir="rtl" className="site-container py-16 text-center text-sm text-muted-foreground">در حال آماده‌سازی صفحه حساب شما…</main>;
  }

  if (!user) {
    return <main dir="rtl" className="site-container py-16 text-center">
      <h1 className="text-2xl font-black">برای ورود به صفحه حساب، وارد ترابار شوید.</h1>
      <Link to="/auth" className="mt-5 inline-flex rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground">ورود / ثبت‌نام</Link>
    </main>;
  }

  if (!roleData) {
    return <main dir="rtl" className="site-container py-16 text-center">
      <p role="alert" className="text-sm text-destructive">{loadError || "اطلاعات حساب در دسترس نیست."}</p>
      <Link to="/account" className="mt-5 inline-flex rounded-xl border border-border px-5 py-3 font-bold">مشاهده حساب کاربری</Link>
    </main>;
  }

  const { memberId, name, city, primaryRole, hasSupplierRole, hasSellerRole, supplierApproved, sellerApproved } = roleData;
  const title = primaryRole === "supplier" ? "تأمین‌کننده" : primaryRole === "seller" ? "بارفروش و حجره‌دار" : "خریدار";
  const isProfessional = hasSupplierRole || hasSellerRole;

  const sellingApproved = (hasSupplierRole && supplierApproved) || (hasSellerRole && sellerApproved);

  const accountOptions = [
    { title: "حساب کاربری", description: "مشاهده و تکمیل اطلاعات حساب و عضویت‌ها", icon: UserRound, to: "/account", style: "bg-emerald-50 text-emerald-800" },
    { title: "پیگیری سفارش‌ها و درخواست‌ها", description: "مشاهده شماره فاکتور، شماره پیگیری و وضعیت خریدها و درخواست‌های تأمین در یک بخش", icon: PackageCheck, to: "/orders", style: "bg-sky-50 text-sky-800" },
    { title: "امور مالی و فاکتورها", description: "مشاهده مبالغ سفارش‌ها و سوابق مالی حساب", icon: WalletCards, to: "/account#finance", style: "bg-violet-50 text-violet-800" },
  ];

  const shoppingOptions = [
    { title: "درخواست خرید و مشاهده بارها", description: "جست‌وجوی بار، انتخاب محصول و ثبت درخواست خرید", icon: ShoppingBasket, to: "/requests", style: "bg-lime-50 text-lime-800" },
    ...((sellingApproved) ? [{
      title: "خرید ویژه حرفه‌ای",
      description: "فقط بارهای موجود با نوع فروش «ویژه حرفه‌ای» در بازار مستقل حرفه‌ای",
      icon: ShoppingBasket,
      to: "/professional-purchase",
      style: "bg-amber-50 text-amber-800",
    }] : []),
  ];

  const professionalOptions = (hasSupplierRole || hasSellerRole) ? [{
    title: "ویترین فروش اختصاصی من",
    description: sellingApproved ? "مشاهده بارهای فعال حساب در ویترین اختصاصی" : "پس از تأیید عضویت، ویترین فروش فعال می‌شود",
    icon: Store,
    to: sellingApproved ? `/store/${memberId}` : "/membership",
    enabled: sellingApproved,
    style: "bg-amber-50 text-amber-800",
  }] : [];

  const sellingOptions = [{
    title: "اعلام بار و مدیریت بارها",
    description: sellingApproved ? "ثبت بار جدید و مدیریت آگهی‌های فروش در یک بخش" : "پس از تأیید عضویت فعال می‌شود؛ امکانات خرید همچنان در دسترس است",
    icon: PackagePlus,
    to: "/announce",
    enabled: sellingApproved,
    style: "bg-teal-50 text-teal-800",
  }];

  return (
    <main dir="rtl" className="min-h-[70vh] bg-market-surface px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <header className="relative mb-7 overflow-hidden rounded-3xl bg-emerald-950 px-5 py-7 text-white shadow-lg sm:mb-9 sm:px-8 sm:py-9">
          <div aria-hidden="true" className="pointer-events-none absolute -left-12 -top-16 size-48 rounded-full border-[22px] border-white/5 sm:size-64" />
          <div className="relative">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-emerald-50"><Sprout className="size-4" /> TERRABAR | ترابار</div>
            <h1 className="text-2xl font-black leading-relaxed sm:text-3xl">صفحه اصلی {title}</h1>
            <p className="mt-2 text-sm leading-7 text-emerald-50/90">{name ? `خوش آمدید، ${name}.` : "به ترابار خوش آمدید."} امکانات این صفحه بر اساس نقش و وضعیت تأیید عضویت شما تنظیم می‌شود.</p>
            {city && <p className="mt-1 text-sm text-emerald-100">شهر ثبت‌شده: {city}</p>}
          </div>
        </header>

        <section aria-labelledby="account-tools-heading">
          <h2 id="account-tools-heading" className="mb-3 text-lg font-extrabold text-foreground">حساب کاربری و پیگیری</h2>
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            {accountOptions.map((option) => {
              const Icon = option.icon;
              return <Link key={option.title} to={option.to as any} className="group flex min-h-24 items-center gap-4 rounded-2xl border border-border bg-card px-4 py-4 text-right shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:gap-5 sm:px-6">
                <span className={`grid size-12 shrink-0 place-items-center rounded-xl sm:size-14 ${option.style}`}><Icon className="size-6 sm:size-7" aria-hidden="true" /></span>
                <span className="min-w-0 flex-1"><span className="block text-base font-extrabold text-foreground sm:text-lg">{option.title}</span><span className="mt-1 block text-sm leading-6 text-muted-foreground">{option.description}</span></span>
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-foreground transition group-hover:bg-accent group-hover:text-primary"><ArrowLeft className="size-4" aria-hidden="true" /></span>
              </Link>;
            })}
          </div>
        </section>

        <section aria-labelledby="shopping-tools-heading" className="mt-7">
          <h2 id="shopping-tools-heading" className="mb-3 text-lg font-extrabold text-foreground">خرید و مشاهده بارها</h2>
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            {shoppingOptions.map((option) => {
              const Icon = option.icon;
              return <Link key={option.title} to={option.to as any} className="group flex min-h-24 items-center gap-4 rounded-2xl border border-border bg-card px-4 py-4 text-right shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:gap-5 sm:px-6">
                <span className={`grid size-12 shrink-0 place-items-center rounded-xl sm:size-14 ${option.style}`}><Icon className="size-6 sm:size-7" aria-hidden="true" /></span>
                <span className="min-w-0 flex-1"><span className="block text-base font-extrabold text-foreground sm:text-lg">{option.title}</span><span className="mt-1 block text-sm leading-6 text-muted-foreground">{option.description}</span></span>
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-foreground transition group-hover:bg-accent group-hover:text-primary"><ArrowLeft className="size-4" aria-hidden="true" /></span>
              </Link>;
            })}
          </div>
        </section>

        {isProfessional && <>
          <h2 className="mb-3 mt-7 text-lg font-extrabold text-foreground">فروش و مدیریت بار</h2>
          {!sellingApproved && <div className="mb-3 flex items-start gap-3 rounded-2xl border border-amber-300/70 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
            <Clock3 className="mt-0.5 size-5 shrink-0" />
            <div><strong>عضویت حرفه‌ای شما در انتظار تأیید است.</strong><p>خرید و پیگیری سفارش‌ها در دسترس است؛ ویترین فروش و اعلام بار پس از تأیید مدیریت فعال می‌شوند.</p><Link to="/membership" className="mt-2 inline-flex font-bold underline">پیگیری درخواست عضویت</Link></div>
          </div>}
          <div className="grid grid-cols-1 gap-3 sm:gap-4">
            {[...professionalOptions, ...sellingOptions].map((option) => {
              const Icon = option.icon;
              const enabled = option.enabled !== false;
              const card = <>
                <span className={`grid size-12 shrink-0 place-items-center rounded-xl sm:size-14 ${option.style}`}><Icon className="size-6 sm:size-7" aria-hidden="true" /></span>
                <span className="min-w-0 flex-1"><span className="block text-base font-extrabold text-foreground sm:text-lg">{option.title}</span><span className="mt-1 block text-sm leading-6 text-muted-foreground">{option.description}</span></span>
                {enabled ? <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-foreground"><ArrowLeft className="size-4" aria-hidden="true" /></span> : <span className="grid size-8 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-800"><ShieldCheck className="size-4" aria-hidden="true" /></span>}
              </>;
              return enabled
                ? <Link key={option.title} to={option.to as any} className="group flex min-h-24 items-center gap-4 rounded-2xl border border-border bg-card px-4 py-4 text-right shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:gap-5 sm:px-6">{card}</Link>
                : <div key={option.title} aria-disabled="true" className="flex min-h-24 cursor-not-allowed items-center gap-4 rounded-2xl border border-dashed border-border bg-muted/40 px-4 py-4 text-right opacity-80 sm:gap-5 sm:px-6">{card}</div>;
            })}
          </div>
        </>}

        {!isProfessional && <section className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center gap-2 font-extrabold"><BookOpenText className="size-5 text-primary" /> راهنمای خریدار</div>
          <ul className="mt-3 grid gap-2 text-sm leading-7 text-muted-foreground">
            <li>• برای خرید از گزینه «درخواست خرید» استفاده کنید.</li>
            <li>• برای تأمین چند محصول، بخش «درخواست سفارش» را تکمیل کنید.</li>
            <li>• بارها و ویترین‌هایی را مشاهده می‌کنید که مطابق نوع حساب و محدوده مجاز شما هستند.</li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
            <Link to="/guide" className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold"><BookOpenText className="size-4" /> راهنمای کامل</Link>
            <Link to="/contact" className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold"><LifeBuoy className="size-4" /> پشتیبانی</Link>
            <Link to="/rules" className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold"><ShieldCheck className="size-4" /> قوانین و حریم خصوصی</Link>
          </div>
        </section>}

        {isProfessional && <section className="mt-6 rounded-2xl border border-border bg-card p-4 text-sm leading-6 text-muted-foreground">
          <ShieldCheck className="mb-2 size-5 text-primary" />
          ویترین عمومی شما فقط بارهای فعال حساب را نشان می‌دهد. خرید برای حساب‌های تأمین‌کننده و بارفروش نیز در دسترس است؛ امکانات فروش با وضعیت تأیید عضویت کنترل می‌شود.
        </section>}
      </div>
    </main>
  );
}
