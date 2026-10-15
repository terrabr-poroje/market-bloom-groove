import { Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { ChevronLeft, Headphones, MapPin, Menu, Plus, Search, Sprout, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Brand } from "./marketplace-brand";

export function MarketplaceShell({ children }: { children: ReactNode }) {
  const [menu, setMenu] = useState(false);
  const closeMenu = () => setMenu(false);

  return (
    <>
      <div className="border-b border-border bg-secondary">
        <div className="site-container flex items-center justify-between gap-3 py-2 text-xs text-muted-foreground">
          <span className="flex min-w-0 items-center gap-1.5"><MapPin className="size-3.5 shrink-0 text-primary" />بازار میوه و تره‌بار ایران</span>
          <Link to="/guide" className="hidden items-center gap-1 sm:flex">راهنمای ترابار<ChevronLeft className="size-3" /></Link>
          <span className="sm:hidden">از باغ تا بازار</span>
        </div>
      </div>

      <header className="border-b border-border bg-background">
        <div className="site-container grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-4 lg:flex lg:justify-between">
          <Link to="/" aria-label="ترابار، صفحه نخست" onClick={closeMenu}><Brand /></Link>
          <nav aria-label="منوی اصلی" className="hidden items-center gap-7 text-sm lg:flex">
            <Link to="/" activeProps={{ className: "text-primary font-bold" }}>صفحه اصلی</Link>
            <Link to="/requests" activeProps={{ className: "text-primary font-bold" }}>درخواست خرید</Link>
            <Link to="/announce" activeProps={{ className: "text-primary font-bold" }}>اعلام بار</Link>
            <Link to="/about" activeProps={{ className: "text-primary font-bold" }}>درباره ترابار</Link>
            <Link to="/guide" activeProps={{ className: "text-primary font-bold" }}>راهنمای معامله</Link>
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <Button asChild variant="ghost" className="hidden sm:inline-flex"><Link to="/auth"><UserRound />ثبت‌نام / ورود</Link></Button>
            <Button asChild variant="outline" className="hidden sm:inline-flex"><Link to="/requests"><Search />درخواست بار</Link></Button>
            <Button asChild><Link to="/announce"><Plus />اعلام بار</Link></Button>
            <Button variant="ghost" size="icon" aria-label={menu ? "بستن منو" : "باز کردن منو"} aria-expanded={menu} onClick={() => setMenu(!menu)}>{menu ? <X /> : <Menu />}</Button>
          </div>
        </div>

        {menu && (
          <nav aria-label="منوی کامل" className="site-container grid gap-2 border-t border-border py-4">
            <Link to="/" onClick={closeMenu} className="rounded-md px-3 py-2 hover:bg-secondary">صفحه اصلی</Link>
            <Link to="/auth" onClick={closeMenu} className="rounded-md px-3 py-2 hover:bg-secondary">ثبت‌نام / ورود</Link>
            <Link to="/announce" onClick={closeMenu} className="rounded-md px-3 py-2 hover:bg-secondary">اعلام بار و مدیریت محصولات</Link>
            <Link to="/requests" onClick={closeMenu} className="rounded-md px-3 py-2 hover:bg-secondary">درخواست خرید</Link>
            <Link to="/membership" onClick={closeMenu} className="rounded-md px-3 py-2 hover:bg-secondary">عضویت و پیگیری تأیید</Link>
            <Link to="/admin" onClick={closeMenu} className="rounded-md px-3 py-2 hover:bg-secondary">پنل مدیریت</Link>
            <Link to="/about" onClick={closeMenu} className="rounded-md px-3 py-2 hover:bg-secondary">درباره ترابار</Link>
            <Link to="/guide" onClick={closeMenu} className="rounded-md px-3 py-2 hover:bg-secondary">راهنمای معامله</Link>
            <Link to="/rules" onClick={closeMenu} className="rounded-md px-3 py-2 hover:bg-secondary">قوانین و حریم خصوصی</Link>
            <Link to="/contact" onClick={closeMenu} className="rounded-md px-3 py-2 hover:bg-secondary">تماس با ما</Link>
          </nav>
        )}
      </header>

      <main>{children}</main>

      <footer className="mt-0 bg-footer text-footer-foreground">
        <div className="site-container grid gap-9 py-12 sm:grid-cols-2 lg:grid-cols-[1.7fr_1fr_1fr_1.2fr]">
          <div>
            <Link to="/"><Brand inverse /></Link>
            <p className="mt-5 max-w-xs text-sm leading-7 text-footer-muted">پیوندی تازه میان باغ، میدان و بازار.<br />بازار تخصصی خرید و فروش عمده و خرد میوه و تره‌بار در سراسر ایران.</p>
            <div className="mt-4 flex items-center gap-2 text-xs text-footer-muted"><Sprout className="size-4" />از ریشه، کنار کسب‌وکار شما</div>
          </div>
          <div>
            <h3 className="mb-5 font-bold">همراه ترابار</h3>
            <div className="grid gap-3 text-sm text-footer-muted"><Link to="/about">درباره ترابار</Link><Link to="/guide">راهنمای خرید و فروش</Link><Link to="/rules">قوانین و حریم خصوصی</Link><Link to="/contact">تماس با ما</Link></div>
          </div>
          <div>
            <h3 className="mb-5 font-bold">دسترسی سریع</h3>
            <div className="grid justify-items-start gap-3 text-sm text-footer-muted"><Link to="/requests">درخواست خرید</Link><Link to="/announce">اعلام بار</Link><Link to="/auth">ثبت‌نام / ورود</Link><Link to="/membership">عضویت حرفه‌ای</Link><Link to="/admin">پنل مدیریت</Link></div>
          </div>
          <div>
            <h3 className="mb-5 font-bold">ارتباط با ترابار</h3>
            <p className="flex items-center gap-2 text-sm text-footer-muted"><MapPin className="size-4 shrink-0" />ایران</p>
            <p className="mt-3 text-xs leading-6 text-footer-muted">اطلاعات رسمی تماس به‌زودی اعلام می‌شود.</p>
            <Button asChild variant="outline" className="mt-4 border-footer-muted/30 bg-transparent text-footer-foreground"><Link to="/contact"><Headphones />تماس و پشتیبانی<ChevronLeft /></Link></Button>
          </div>
        </div>
        <div className="border-t border-footer-muted/20">
          <div className="site-container flex flex-col justify-between gap-2 py-5 text-xs text-footer-muted sm:flex-row">
            <p>© ۱۴۰۵ ترابار؛ تمامی حقوق محفوظ است.</p>
            <p>درخواست‌ها و آگهی‌ها بر اساس دسترسی حساب نمایش داده می‌شوند.</p>
          </div>
        </div>
      </footer>
    </>
  );
}
