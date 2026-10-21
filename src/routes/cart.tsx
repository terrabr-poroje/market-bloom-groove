/* eslint-disable @typescript-eslint/no-explicit-any -- Orders use the audited Supabase schema while generated client types are stale. */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Minus, Plus, ShoppingCart, Trash2, PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { faNumber, normalizeNumericInput, pageHead, type Load } from "@/lib/marketplace";

export const Route = createFileRoute("/cart")({
  head: () => pageHead("سبد خرید", "بررسی سبد خرید، اصلاح تعداد و ثبت سفارش در ترابار.", "/cart"),
  component: CartPage,
});

type CartItem = { load: Load; quantity: number; saleType: string };
const CART_KEY = "terrabar-cart-items";

function priceFor(item: CartItem) {
  const option = item.load.saleOptions?.find(option => option.saleType === item.saleType);
  const weight = item.quantity * item.load.weight;
  const match = option?.priceBreaks?.find(br => weight >= br.minQuantity && (br.maxQuantity == null || weight <= br.maxQuantity));
  return Number(match?.price ?? option?.price ?? item.load.price);
}

function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitted, setSubmitted] = useState<{ count: number; total: number } | null>(null);

  useEffect(() => {
    const read = () => {
      try { setItems(JSON.parse(window.sessionStorage.getItem(CART_KEY) || "[]")); }
      catch { setItems([]); }
      setLoaded(true);
    };
    read();
    window.addEventListener("terrabar-cart-updated", read);
    window.addEventListener("storage", read);
    return () => {
      window.removeEventListener("terrabar-cart-updated", read);
      window.removeEventListener("storage", read);
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.sessionStorage.setItem(CART_KEY, JSON.stringify(items));
      window.dispatchEvent(new Event("terrabar-cart-updated"));
    } catch {}
  }, [items, loaded]);

  const total = useMemo(() => items.reduce((sum, item) => sum + item.quantity * item.load.weight * priceFor(item), 0), [items]);
  function changeQuantity(index: number, raw: string) {
    const value = Number(normalizeNumericInput(raw));
    if (!Number.isInteger(value) || value < 1) return;
    setItems(current => current.map((item, i) => {
      if (i !== index) return item;
      const minimum = item.load.saleOptions?.find(o => o.saleType === item.saleType)?.minimum ?? item.load.minimum;
      return { ...item, quantity: Math.min(item.load.stock, Math.max(minimum, value)) };
    }));
    setError("");
    setNotice("");
  }
  async function submitOrder() {
    setError("");
    setNotice("");
    if (!items.length) { setError("سبد خرید خالی است."); return; }
    setBusy(true);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setError("برای ثبت سفارش ابتدا وارد حساب خود شوید.");
      setBusy(false);
      return;
    }
    const { data: member, error: memberError } = await (supabase as any)
      .from("members").select("id,full_name,phone,email,city").eq("auth_user_id", authData.user.id).maybeSingle();
    if (memberError || !member) {
      setError("پروفایل عضو پیدا نشد؛ ابتدا ثبت‌نام را کامل کنید.");
      setBusy(false);
      return;
    }
    if (items.some(item => !item.load.memberId)) {
      setError("برای یکی از کالاها شناسه فروشنده ثبت نشده است؛ سفارش ارسال نشد.");
      setBusy(false);
      return;
    }
    const orderTotal = total;
    const rows = items.map(item => ({
      load_id: item.load.id,
      customer_name: member.full_name,
      customer_phone: member.phone,
      customer_email: member.email,
      customer_city: member.city,
      quantity: item.quantity,
      unit: "package",
      price: priceFor(item),
      total_price: item.quantity * item.load.weight * priceFor(item),
      sale_type: item.saleType,
      delivery_type: "pickup",
      delivery_address: null,
      status: "pending",
      payment_status: "unpaid",
      notes: "ثبت از سبد خرید ترابار؛ در انتظار تأیید فروشنده",
      buyer_member_id: member.id,
      seller_member_id: item.load.memberId,
    }));
    const { error: insertError } = await (supabase as any).from("orders").insert(rows);
    if (insertError) {
      setError("ثبت سفارش انجام نشد. سفارشی ثبت نشده است؛ دسترسی‌های سفارش در سوپابیس باید بررسی شود.");
    } else {
      setSubmitted({ count: items.length, total: orderTotal });
      setItems([]);
      setNotice("سفارش‌ها ثبت شدند و در انتظار تأیید فروشنده‌اند.");
    }
    setBusy(false);
  }

  return <div className="site-container max-w-4xl py-6 sm:py-10">
    <Link to="/requests" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"><ArrowRight className="size-4" />بازگشت به ادامه خرید</Link>
    <div className="mt-5 flex items-center justify-between gap-3 border-b border-border pb-4">
      <div><h1 className="text-2xl font-black">سبد خرید</h1><p className="mt-1 text-sm text-muted-foreground">تعداد، وزن و مبلغ کالاها را بررسی کنید و از همین‌جا سفارش را ثبت کنید.</p></div>
      <ShoppingCart className="size-7 text-primary" />
    </div>
    {submitted && <div role="status" className="mt-5 rounded-xl border border-primary/30 bg-accent/40 p-4"><CheckCircle2 className="inline ml-2 size-5 text-primary" /><strong>سفارش ثبت شد</strong><p className="mt-2 text-sm">{faNumber(submitted.count)} قلم کالا · {faNumber(submitted.total)} تومان</p><p className="mt-2 text-sm leading-6 text-muted-foreground">سفارش در انتظار تأیید فروشنده است. درگاه پرداخت واقعی هنوز به ترابار متصل نشده؛ پرداخت آنلاین از این صفحه پس از راه‌اندازی درگاه فعال خواهد شد.</p></div>}
    {!loaded ? <p className="py-10 text-center text-muted-foreground">در حال بارگذاری سبد خرید…</p> : items.length === 0 ? <div className="mt-8 rounded-xl border border-dashed border-border p-8 text-center"><ShoppingCart className="mx-auto size-10 text-muted-foreground" /><h2 className="mt-3 text-lg font-bold">سبد خرید خالی است</h2><p className="mt-2 text-sm text-muted-foreground">برای افزودن کالا به بازار برگردید.</p><Link to="/requests" className="mt-5 inline-flex"><Button>ادامه خرید</Button></Link></div> : <>
      <div className="mt-5 space-y-3">{items.map((item, index) => {
        const unitPrice = priceFor(item);
        const lineTotal = item.quantity * item.load.weight * unitPrice;
        return <article key={String(item.load.id) + "-" + item.saleType} className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="font-extrabold">{item.load.product} {item.load.variety}</h2><p className="mt-1 text-xs text-muted-foreground">{item.load.quality} · {item.load.city} · {item.load.saleOptions?.find(o => o.saleType === item.saleType)?.label ?? item.saleType}</p></div><Button type="button" size="icon" variant="ghost" aria-label="حذف کالا از سبد" onClick={() => setItems(current => current.filter((_, i) => i !== index))}><Trash2 className="size-4 text-destructive" /></Button></div>
          <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4"><div><span className="block text-xs text-muted-foreground">قیمت هر کیلو</span><strong>{faNumber(unitPrice)} تومان</strong></div><div><span className="block text-xs text-muted-foreground">وزن بسته</span><strong>{faNumber(item.load.weight)} کیلو</strong></div><div><span className="block text-xs text-muted-foreground">وزن کل</span><strong>{faNumber(item.quantity * item.load.weight)} کیلو</strong></div><div><span className="block text-xs text-muted-foreground">مبلغ کل</span><strong className="text-primary">{faNumber(lineTotal)} تومان</strong></div></div>
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3"><span className="text-sm font-semibold">تعداد بسته</span><div className="flex items-center gap-2"><Button type="button" size="icon" variant="outline" className="size-8" aria-label="کاهش تعداد" disabled={item.quantity <= (item.load.saleOptions?.find(o => o.saleType === item.saleType)?.minimum ?? item.load.minimum)} onClick={() => changeQuantity(index, String(item.quantity - 1))}><Minus className="size-3.5" /></Button><input aria-label="تعداد بسته" inputMode="numeric" className="field-input h-8 w-16 px-1 text-center" value={String(item.quantity)} onChange={e => changeQuantity(index, e.target.value)} /><Button type="button" size="icon" variant="outline" className="size-8" aria-label="افزایش تعداد" disabled={item.quantity >= item.load.stock} onClick={() => changeQuantity(index, String(item.quantity + 1))}><Plus className="size-3.5" /></Button></div></div>
        </article>;
      })}</div>
      <div className="mt-5 rounded-xl border border-primary/30 bg-card p-4 sm:p-5"><div className="flex items-center justify-between gap-3"><span className="text-sm text-muted-foreground">جمع کل کالاها (بدون هزینه حمل)</span><strong className="text-xl font-black text-primary">{faNumber(total)} تومان</strong></div><p className="mt-2 text-xs leading-6 text-muted-foreground">پس از ثبت، سفارش برای تأیید فروشنده ارسال می‌شود. پرداخت فقط پس از تأیید شرایط سفارش انجام خواهد شد.</p><div className="mt-4 grid gap-2 sm:grid-cols-2"><Button type="button" variant="outline" onClick={() => { setItems([]); setError(""); setNotice("سبد خرید خالی شد."); }}>خالی کردن سبد</Button><Button type="button" disabled={busy || !items.length} onClick={() => void submitOrder()}>{busy ? "در حال ثبت سفارش…" : "ادامه به ثبت سفارش" }<PackageCheck className="mr-2 size-4" /></Button></div></div>
    </>}
    {error && <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error} {error.includes("وارد حساب") && <Link to="/auth" className="font-bold underline">ورود / ثبت‌نام</Link>}</p>}
    {notice && !submitted && <p role="status" className="mt-4 text-sm text-muted-foreground">{notice}</p>}
  </div>;
}
