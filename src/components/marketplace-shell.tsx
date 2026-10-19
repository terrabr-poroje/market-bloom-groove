import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { ArrowRight, Headphones, MapPin, Menu, X } from "lucide-react";
import { Brand } from "./marketplace-brand";

export function MarketplaceShell({ children }: { children: ReactNode }) {
  const [menu, setMenu] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const closeMenu = () => setMenu(false);

  return (
    <>
      <header className="border-b border-border bg-background">
        <div className="site-container flex min-h-16 items-center justify-between gap-3 py-3">
          <Link to="/" aria-label="ترابار، صفحه نخست" onClick={closeMenu} className="shrink-0">
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
          <nav id="terrabar-main-menu" aria-label="منوی اصلی" className="site-container grid gap-1 border-t border-border py-3">
            <Link to="/" onClick={closeMenu} className="rounded-md px-3 py-2.5 text-sm hover:bg-secondary">صفحه اصلی</Link>
            <Link to="/auth" onClick={closeMenu} className="rounded-md px-3 py-2.5 text-sm hover:bg-secondary">ثبت‌نام / ورود</Link>
            <Link to="/account" onClick={closeMenu} className="rounded-md px-3 py-2.5 text-sm hover:bg-secondary">حساب کاربری من</Link>
            <Link to="/announce" onClick={closeMenu} className="rounded-md px-3 py-2.5 text-sm hover:bg-secondary">اعلام بار و مدیریت محصولات</Link>
            <Link to="/requests" onClick={closeMenu} className="rounded-md px-3 py-2.5 text-sm hover:bg-secondary">درخواست بار</Link>
            <Link to="/membership" onClick={closeMenu} className="rounded-md px-3 py-2.5 text-sm hover:bg-secondary">عضویت و پیگیری تأیید</Link>
            <Link to="/admin" onClick={closeMenu} className="rounded-md px-3 py-2.5 text-sm hover:bg-secondary">پنل مدیریت</Link>
            <Link to="/about" onClick={closeMenu} className="rounded-md px-3 py-2.5 text-sm hover:bg-secondary">درباره ترابار</Link>
            <Link to="/guide" onClick={closeMenu} className="rounded-md px-3 py-2.5 text-sm hover:bg-secondary">راهنمای استفاده از سایت</Link>
            <Link to="/rules" onClick={closeMenu} className="rounded-md px-3 py-2.5 text-sm hover:bg-secondary">قوانین و حریم خصوصی</Link>
            <Link to="/contact" onClick={closeMenu} className="rounded-md px-3 py-2.5 text-sm hover:bg-secondary">ارتباط با پشتیبانی</Link>
          </nav>
        )}
      </header>

      {location.pathname !== "/" && (
        <div className="site-container py-3">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined" && window.history.length > 1) window.history.back();
              else void navigate({ to: "/" });
            }}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowRight className="size-4" aria-hidden="true" />
            بازگشت به صفحه قبل
          </button>
        </div>
      )}

      <main>{children}</main>

      <footer className="border-t border-border bg-background">
        <div className="site-container flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <Link to="/" aria-label="ترابار، صفحه نخست" className="shrink-0"><Brand /></Link>
          <p className="text-sm leading-7 text-muted-foreground">بازار میوه و تره‌بار ایران؛ ارتباط باغدار، تأمین‌کننده، بارفروش و خریدار.</p>
          <Link to="/contact" className="inline-flex items-center gap-2 text-sm text-primary hover:underline"><Headphones className="size-4" />پشتیبانی</Link>
          <span className="inline-flex items-center gap-2 text-xs text-muted-foreground"><MapPin className="size-3.5" />ایران</span>
        </div>
      </footer>
    </>
  );
}
