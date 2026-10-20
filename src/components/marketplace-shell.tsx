/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase schema queries use dynamic types while generated DB types are stale. */
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowRight, Headphones, MapPin, Menu, X, ShieldCheck, LogIn,
  UserRound, ShoppingBasket, PackagePlus, Store, ClipboardList, BookOpenText, LogOut,
} from "lucide-react";
import { Brand } from "./marketplace-brand";
import { useAuth, signOut } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

type MenuItem = { label: string; to: string; icon: typeof UserRound };

export function MarketplaceShell({ children }: { children: ReactNode }) {
  const [menu, setMenu] = useState(false);
  const [roleCodes, setRoleCodes] = useState<string[]>([]);
  const [roleLookupDone, setRoleLookupDone] = useState(false);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { user, roles, loading, isAdmin } = useAuth();
  const closeMenu = () => setMenu(false);

  useEffect(() => {
    let active = true;
    async function loadMemberMenuRoles() {
      setRoleLookupDone(false);
      if (!user) {
        setRoleCodes([]);
        setRoleLookupDone(true);
        return;
      }
      try {
        const { data: member } = await (supabase as any)
          .from("members").select("id").eq("auth_user_id", user.id).maybeSingle();
        if (!member?.id) {
          if (active) { setRoleCodes([]); setRoleLookupDone(true); }
          return;
        }
        const { data, error } = await (supabase as any)
          .from("member_roles").select("role_code")
          .eq("member_id", member.id).eq("approval_status", "approved");
        if (!active) return;
        if (error) console.error("[Terrabar menu] Could not load approved roles:", error);
        setRoleCodes((data ?? []).map((row: any) => String(row.role_code).toLowerCase()));
      } catch (error) {
        if (active) {
          console.error("[Terrabar menu] Role lookup failed:", error);
          setRoleCodes([]);
        }
      } finally {
        if (active) setRoleLookupDone(true);
      }
    }
    void loadMemberMenuRoles();
    return () => { active = false; };
  }, [user?.id]);

  const isBuyer = roleCodes.some((code) => ["buyer", "ordinary_buyer", "regular_buyer"].includes(code));
  const isProBuyer = roleCodes.some((code) => ["special_buyer", "buyer_special", "professional_buyer", "pro_buyer"].includes(code));
  const isSeller = roles.includes("seller") || roleCodes.some((code) => ["seller", "bar_seller"].includes(code));
  const isSupplier = roles.includes("supplier") || roleCodes.includes("supplier");
  const isCityManager = roles.includes("city_manager");
  const isMainAdmin = isAdmin;

  const memberItems: MenuItem[] = [];
  if (user && !loading && roleLookupDone) {
    memberItems.push({ label: "صفحه اصلی حساب من", to: "/member-home", icon: UserRound });
    memberItems.push({ label: "حساب کاربری و پیگیری سفارش‌ها", to: "/account", icon: ClipboardList });
    if (isBuyer || isProBuyer || isSeller || isSupplier || (!isSeller && !isSupplier && !isCityManager && !isMainAdmin)) {
      memberItems.push({ label: "درخواست خرید و مشاهده بارها", to: "/requests", icon: ShoppingBasket });
    }
    if (isSeller || isSupplier) {
      memberItems.push({ label: "اعلام بار و مدیریت محصولات", to: "/announce", icon: PackagePlus });
      memberItems.push({ label: "ویترین و سفارش‌ها", to: "/account", icon: Store });
    }
    if (isMainAdmin) memberItems.push({ label: "پنل مدیریت کل", to: "/admin", icon: ShieldCheck });
    if (isCityManager) memberItems.push({ label: "پنل مدیریت شهر", to: "/admin", icon: ShieldCheck });
    memberItems.push({ label: "راهنمای استفاده", to: "/guide", icon: BookOpenText });
    memberItems.push({ label: "پشتیبانی", to: "/contact", icon: Headphones });
  }

  async function handleSignOut() {
    try {
      await signOut();
      closeMenu();
      await navigate({ to: "/" });
    } catch (error) {
      console.error("[Terrabar menu] Sign out failed:", error);
    }
  }

  return (
    <>
      <header className="border-b border-border bg-background">
        <div className="site-container flex min-h-16 items-center justify-between gap-3 py-3">
          <Link to={user ? "/member-home" : "/"} aria-label="ترابار، صفحه نخست" onClick={closeMenu} className="shrink-0">
            <Brand />
          </Link>
          <button
            type="button"
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={menu ? "بستن منو" : "باز کردن منو"}
            aria-expanded={menu}
            aria-controls="terrabar-main-menu"
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
        {menu && (
          <nav id="terrabar-main-menu" aria-label={user ? "منوی اختصاصی عضو" : "منوی اصلی"} className="site-container grid gap-2 border-t border-border py-4 sm:max-w-md sm:mr-auto">
            {user ? (
              loading || !roleLookupDone ? (
                <p className="px-4 py-3 text-sm text-muted-foreground">در حال دریافت امکانات مجاز حساب…</p>
              ) : (
                <>
                  <p className="px-4 pb-1 text-xs font-semibold text-muted-foreground">منوی اختصاصی حساب شما</p>
                  {memberItems.map(({ label, to, icon: Icon }) => (
                    <Link key={label} to={to as any} onClick={closeMenu} className="flex min-h-12 items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm font-bold hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <Icon className="size-5 text-emerald-700" aria-hidden="true" />{label}
                    </Link>
                  ))}
                  <button type="button" onClick={() => void handleSignOut()} className="flex min-h-12 items-center gap-3 rounded-xl border border-red-200 px-4 py-3 text-right text-sm font-bold text-red-700 hover:bg-red-50">
                    <LogOut className="size-5" aria-hidden="true" />خروج از حساب
                  </button>
                </>
              )
            ) : (
              <>
                <Link to="/admin-login" onClick={closeMenu} className="flex min-h-12 items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm font-bold hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <ShieldCheck className="size-5 text-emerald-700" aria-hidden="true" />ورود مدیران
                </Link>
                <Link to="/auth" onClick={closeMenu} className="flex min-h-12 items-center gap-3 rounded-xl bg-emerald-700 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <LogIn className="size-5" aria-hidden="true" />ثبت‌نام / ورود اعضا
                </Link>
              </>
            )}
          </nav>
        )}
      </header>

      {pathname !== "/" && (
        <div className="site-container py-3">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
              else void navigate({ to: user ? "/member-home" : "/" });
            }}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowRight className="size-4" aria-hidden="true" />بازگشت به صفحه قبل
          </button>
        </div>
      )}

      <main>{children}</main>

      <footer className="border-t border-border bg-background">
        <div className="site-container flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <Link to={user ? "/member-home" : "/"} aria-label="ترابار، صفحه نخست" className="shrink-0"><Brand /></Link>
          <p className="text-sm leading-7 text-muted-foreground">بازار میوه و تره‌بار ایران؛ ارتباط باغدار، تأمین‌کننده، بارفروش و خریدار.</p>
          <Link to="/contact" className="inline-flex items-center gap-2 text-sm text-primary hover:underline"><Headphones className="size-4" />پشتیبانی</Link>
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground"><MapPin className="size-3.5" />ایران</span>
        </div>
      </footer>
    </>
  );
}
