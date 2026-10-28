/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase schema queries use dynamic types while generated DB types are stale. */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  UserRound, ShoppingBasket, PackagePlus, ArrowLeft, Sprout, Store, ClipboardList, WalletCards, PackageCheck,
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
  const [pageWaitExpired, setPageWaitExpired] = useState(false);

  // Independent page-level fallback in case the shared auth loading flag never clears.
  useEffect(() => {
    const timer = window.setTimeout(() => setPageWaitExpired(true), 12000);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let active = true;
    const loadingTimer = window.setTimeout(() => {
      if (!active) return;
      setLoadError("بارگذاری اطلاعات حساب طول کشید. اتصال را بررسی کنید و دوباره تلاش کنید.");
      setRoleCheckDone(true);
    }, 10000);
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

    void loadRoleData().finally(() => window.clearTimeout(loadingTimer));
    return () => {
      active = false;
      window.clearTimeout(loadingTimer);
    };
  }, [user?.id]);

  if (!pageWaitExpired && (loading || !roleCheckDone)) {
    return <main dir="rtl" className="site-container py-16 text-center text-sm text-muted-foreground">در حال آماده‌سازی صفحه حساب شما…</main>;
  }

  if (pageWaitExpired && loading && !roleData) {
    return <main dir="rtl" className="site-container py-16 text-center" role="alert">
      <p className="text-sm text-destructive">بررسی ورود طول کشید و صفحه حساب آماده نشد. لطفاً دوباره تلاش کنید.</p>
      <button type="button" onClick={() => window.location.reload()} className="mt-5 inline-flex rounded-xl bg-primary px-5 py-3 font-bold text-primary-foreground">تلاش مجدد</button>
    </main>;
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

  const accountOptions = [
    { title: "حساب کاربری", icon: UserRound, to: "/account" },
    { title: "امور مالی و فاکتورها", icon: WalletCards, to: "/seller-accounting-preview" },
  ];

  const buyingOptions = [
    { title: "درخواست خرید", icon: ShoppingBasket, to: "/requests" },
    { title: "درخواست سفارش", icon: ClipboardList, to: "/requests" },
    { title: "خرید ویژه حرفه ای", icon: ShoppingBasket, to: "/professional-purchase" },
    { title: "پیگیری خرید و سفارش", icon: PackageCheck, to: "/orders" },
  ];

  const sellingOptions = [
    { title: "اعلام بار", icon: PackagePlus, to: "/announce" },
    { title: "مدیریت بار ها", icon: ClipboardList, to: "/announce" },
    { title: "ویترین فروش اختصاصی", icon: Store, to: sellingApproved ? `/store/${memberId}` : "/membership" },
  ];

  const buyerOptions = [
    { title: "حساب کاربری", icon: UserRound, to: "/account" },
    { title: "درخواست خرید", icon: ShoppingBasket, to: "/requests" },
    { title: "پیگیری خرید و سفارش", icon: PackageCheck, to: "/orders" },
  ];

  const renderOptions = (options: typeof accountOptions) => options.map((option) => {
    const Icon = option.icon;
    return (
      <Link
        key={option.title}
        to={option.to as any}
        className="group flex min-h-24 items-center gap-4 rounded-2xl border border-border bg-card px-4 py-4 text-right shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:min-h-28 sm:px-5"
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-800 sm:size-14">
          <Icon className="size-6 sm:size-7" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1 text-base font-extrabold text-foreground sm:text-lg">{option.title}</span>
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-foreground transition group-hover:bg-accent group-hover:text-primary">
          <ArrowLeft className="size-4" aria-hidden="true" />
        </span>
      </Link>
    );
  });

  const renderSection = (heading: string, options: typeof accountOptions) => (
    <section aria-label={heading} className="mt-6 first:mt-0">
      <h2 className="mb-3 text-lg font-extrabold text-foreground">{heading}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {renderOptions(options)}
      </div>
    </section>
  );

  const visibleBuyerOptions = buyerOptions;
  return (
    <main dir="rtl" className="min-h-[70vh] bg-market-surface px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-6 rounded-3xl bg-emerald-950 px-5 py-7 text-white shadow-lg sm:px-8 sm:py-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-emerald-50">
            <Sprout className="size-4" /> TERRABAR | ترابار
          </div>
          <h1 className="text-2xl font-black leading-relaxed sm:text-3xl">صفحه اصلی {title}</h1>
          <p className="mt-2 text-sm leading-7 text-emerald-50/90">{name ? `خوش آمدید، ${name}.` : "به ترابار خوش آمدید."}</p>
        </header>

        {isProfessional ? (
          <>
            {renderSection("حساب کاربری", accountOptions)}
            {renderSection("امکانات خرید", buyingOptions)}
            {renderSection("امکانات فروش", sellingOptions)}
          </>
        ) : (
          <>
            {renderSection("حساب کاربری", visibleBuyerOptions.filter((option) => option.title === "حساب کاربری"))}
            {renderSection("امکانات خرید", visibleBuyerOptions.filter((option) => option.title !== "حساب کاربری"))}
          </>
        )}
      </div>
    </main>
  );
}
