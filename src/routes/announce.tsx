/* eslint-disable @typescript-eslint/no-explicit-any -- Dynamic queries target the audited production Supabase schema; generated client types are stale. */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, Megaphone, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { cities, faNumber, pageHead, qualities } from '@/lib/marketplace';

export const Route = createFileRoute("/announce")({
  head: () => pageHead('اعلام بار', 'ثبت و انتشار فوری بار برای اعضای تأییدشده ترابار.'),
  component: AnnouncePage,
});

const qualityValues = ['premium', 'standard', 'economy', 'negotiated'] as const;
const qualityMap = Object.fromEntries(qualities.map((label, index) => [label, qualityValues[index]]));
type OwnedLoad = { id: string; name: string; product_type: string; engine: string | null; city: string; quantity: number; count: number | null; price: number; status: string; created_at: string };
type IncomingOrder = { id: string; load_id: string; customer_name: string; customer_city: string; quantity: number; unit: string; price: number; total_price: number; delivery_address: string | null; delivery_type: string | null; status: string; payment_status: string; delivery_status: string; notes: string | null; created_at: string };
const loadStatusLabels: Record<string, string> = { pending: 'در انتظار تأیید', active: 'فعال', inactive: 'غیرفعال', rejected: 'رد شده', sold_out: 'تمام‌شده', expired: 'منقضی‌شده' };
const orderStatusLabels: Record<string, string> = { pending: 'در انتظار پاسخ شما', accepted: 'تأیید شده توسط فروشنده', rejected: 'رد شده توسط فروشنده' };
const paymentStatusLabels: Record<string, string> = { unpaid: 'پرداخت‌نشده', pending: 'در انتظار تأیید پرداخت', paid: 'پرداخت تأییدشده', failed: 'پرداخت ناموفق', refunded: 'بازپرداخت‌شده' };
const deliveryStatusLabels: Record<string, string> = { awaiting_payment: 'در انتظار پرداخت', awaiting_dispatch: 'آماده ارسال', shipped: 'بار ارسال شده', delivered: 'تحویل گرفته شده', disputed: 'در حال بررسی اختلاف' };

function AnnouncePage() {
  const { user, loading, canAnnounce } = useAuth();
  const [form, setForm] = useState({ product: '', variety: '', quality: 'استاندارد', city: cities[0] ?? 'کرج', province: '', weight: '', stock: '', minimum: '', price: '', ready: new Date().toISOString().slice(0, 10), description: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [ownedLoads, setOwnedLoads] = useState<OwnedLoad[]>([]);
  const [incomingOrders, setIncomingOrders] = useState<IncomingOrder[]>([]);
  const [loadingIncomingOrders, setLoadingIncomingOrders] = useState(true);
  const [loadingOwnedLoads, setLoadingOwnedLoads] = useState(true);
  const [manageError, setManageError] = useState('');
  const [busyLoadId, setBusyLoadId] = useState('');
  const set = (key: keyof typeof form) => (value: string) => setForm(prev => ({ ...prev, [key]: value }));

  useEffect(() => {
    let active = true;
    async function fetchOwnedLoads() {
      if (!user) { setLoadingOwnedLoads(false); setLoadingIncomingOrders(false); return; }
      const { data: member } = await (supabase as any).from('members').select('id').eq('auth_user_id', user.id).maybeSingle();
      if (!active) return;
      if (!member) { setOwnedLoads([]); setIncomingOrders([]); setLoadingOwnedLoads(false); setLoadingIncomingOrders(false); return; }
      const [{ data, error: listError }, { data: orderData, error: orderListError }] = await Promise.all([
        (supabase as any).from('loads').select('id, name, product_type, engine, city, quantity, count, price, status, created_at').or('member_id.eq.' + member.id + ',owner_member_id.eq.' + member.id).order('created_at', { ascending: false }),
        (supabase as any).from('orders').select('id, load_id, customer_name, customer_city, quantity, unit, price, total_price, delivery_address, delivery_type, status, payment_status, delivery_status, notes, created_at').eq('seller_member_id', member.id).order('created_at', { ascending: false }),
      ]);
      if (!active) return;
      if (listError) setManageError('فهرست بارهای شما دریافت نشد؛ دسترسی مشاهده را بررسی کنید.');
      else setOwnedLoads((data ?? []) as OwnedLoad[]);
      if (orderListError) setManageError('فهرست درخواست‌های سفارش دریافت نشد؛ ممکن است سیاست‌های سفارش هنوز روی دیتابیس اعمال نشده باشند.');
      else setIncomingOrders((orderData ?? []) as IncomingOrder[]);
      setLoadingOwnedLoads(false);
      setLoadingIncomingOrders(false);
    }
    void fetchOwnedLoads();
    return () => { active = false; };
  }, [user?.id]);

  async function respondToOrder(orderId: string, status: 'accepted' | 'rejected') {
    setBusyLoadId(orderId);
    setManageError('');
    const { error: responseError } = await (supabase as any).from('orders').update({ status }).eq('id', orderId).eq('status', 'pending');
    if (responseError) setManageError('ثبت پاسخ به سفارش انجام نشد؛ دسترسی فروشنده را بررسی کنید.');
    else setIncomingOrders(items => items.map(item => item.id === orderId ? { ...item, status } : item));
    setBusyLoadId('');
  }

  async function deactivateLoad(loadId: string) {
    setBusyLoadId(loadId);
    setManageError('');
    const { error: updateError } = await (supabase as any).from('loads')
      .update({ status: 'inactive' })
      .eq('id', loadId)
      .in('status', ['active', 'pending']);
    if (updateError) setManageError('غیرفعال‌کردن بار انجام نشد؛ سیاست دسترسی دیتابیس باید در محیط آزمایشی اعمال و بررسی شود.');
    else setOwnedLoads(items => items.map(item => item.id === loadId ? { ...item, status: 'inactive' } : item));
    setBusyLoadId('');
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    setBusy(true);
    setError('');

    const packageWeight = Number(form.weight);
    const packageCount = Number(form.stock);
    const minimumPackages = Number(form.minimum);
    const pricePerKg = Number(form.price);
    if (!form.product.trim() || !form.variety.trim() || !form.province.trim() ||
        !Number.isFinite(packageWeight) || packageWeight <= 0 ||
        !Number.isInteger(packageCount) || packageCount < 1 ||
        !Number.isInteger(minimumPackages) || minimumPackages < 1 || minimumPackages > packageCount ||
        !Number.isFinite(pricePerKg) || pricePerKg <= 0) {
      setError('اطلاعات بار معتبر نیست. وزن و قیمت باید مثبت باشند و حداقل سفارش از موجودی بیشتر نباشد.');
      setBusy(false);
      return;
    }

    // Resolve the approved member record first; loads.member_id references members.id,
    // not auth.users.id. The production schema uses its own canonical column names.
    const { data: member, error: memberError } = await (supabase as any)
      .from('members')
      .select('id')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (memberError || !member) {
      setError('پروفایل عضویت شما پیدا نشد. ابتدا درخواست عضویت را ثبت کنید.');
      setBusy(false);
      return;
    }

    const { error: insertError } = await (supabase as any).from('loads').insert({
      name: [form.product.trim(), form.variety.trim()].filter(Boolean).join(' '),
      product_type: form.product.trim(),
      engine: form.variety.trim() || null,
      quality: qualityMap[form.quality] ?? 'standard',
      city: form.city,
      origin: form.province.trim(),
      quantity: packageWeight * packageCount,
      count: packageCount,
      unit: 'kg',
      min_quantity: minimumPackages * packageWeight,
      min_order_quantity: minimumPackages,
      price: pricePerKg,
      price_unit: 'toman_per_kg',
      ready_date: form.ready,
      description: form.description.trim() || null,
      status: 'active',
      role: 'seller',
      seller_type: 'seller',
      member_id: member.id,
      owner_member_id: member.id,
      sale_type: 'regular',
      source_region: form.province.trim(),
    });
    if (insertError) setError('ثبت بار انجام نشد؛ مقادیر را بررسی کرده و دوباره تلاش کنید.');
    else setSaved(true);
    setBusy(false);
  }

  if (loading) return <section className="py-16 text-center text-sm text-muted-foreground">در حال بارگذاری…</section>;

  if (!user) {
    return (
      <section className="bg-market-surface py-16"><div className="site-container max-w-md text-center">
        <h1 className="text-2xl font-extrabold">ابتدا وارد حساب شوید</h1>
        <p className="mt-3 text-sm text-muted-foreground">اعلام بار فقط برای اعضای تأییدشده (تأمین‌کننده یا بارفروش) فعال است.</p>
        <Button asChild className="mt-6"><Link to="/auth">ورود / ثبت‌نام</Link></Button>
      </div></section>
    );
  }

  if (!canAnnounce) {
    return (
      <section className="bg-market-surface py-16"><div className="site-container max-w-md text-center">
        <ShieldAlert className="mx-auto mb-4 size-12 text-warning" />
        <h1 className="text-2xl font-extrabold">عضویت شما هنوز تأیید نشده است</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">اعلام بار پس از تأیید درخواست عضویت شما به‌عنوان تأمین‌کننده یا بارفروش توسط مدیر فعال می‌شود.</p>
        <Button asChild className="mt-6"><Link to="/membership">ثبت یا پیگیری درخواست عضویت</Link></Button>
      </div></section>
    );
  }

  return (
    <section className="bg-market-surface py-12"><div className="site-container max-w-2xl">
      <div className="rounded-lg border border-border bg-card p-6 sm:p-8">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold"><Megaphone className="size-6 text-primary" />اعلام بار جدید</h1>
        <p className="mt-2 text-sm text-muted-foreground">پس از تأیید عضویت، بار شما بلافاصله منتشر می‌شود؛ محدودیت‌های نقش و شهر در سیستم کنترل می‌شوند.</p>
        <div className="mt-6 border-t border-border pt-5">
          <h2 className="text-lg font-bold">درخواست‌های سفارش برای بارهای من</h2>
          {loadingIncomingOrders ? <p className="mt-3 text-sm text-muted-foreground">در حال دریافت درخواست‌ها…</p> : incomingOrders.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">درخواست سفارشی برای بارهای شما ثبت نشده است.</p> : (
            <ul className="mt-3 grid gap-3">
              {incomingOrders.map(order => (
                <li key={order.id} className="rounded-lg border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div><p className="font-bold">{order.customer_name} · {order.customer_city}</p><p className="mt-1 text-xs text-muted-foreground">{faNumber(Number(order.quantity))} بسته · {faNumber(Number(order.total_price))} تومان · {order.delivery_type === "pickup" ? "تحویل حضوری" : "نیازمند حمل"}</p><p className="mt-1 text-xs text-muted-foreground">پرداخت: {paymentStatusLabels[order.payment_status] ?? "نامشخص"} · تحویل: {deliveryStatusLabels[order.delivery_status] ?? "در انتظار به‌روزرسانی"}</p>{order.delivery_address && <p className="mt-1 text-xs text-muted-foreground">نشانی: {order.delivery_address}</p>}{order.notes && <p className="mt-1 text-xs text-muted-foreground">توضیح: {order.notes}</p>}</div>
                    <span className="rounded-full bg-secondary px-3 py-1 text-xs">{orderStatusLabels[order.status] ?? order.status}</span>
                  </div>
                  {order.status === "pending" && <div className="mt-3 flex gap-2"><Button type="button" size="sm" disabled={busyLoadId === order.id} onClick={() => void respondToOrder(order.id, "accepted")}>تأیید سفارش</Button><Button type="button" size="sm" variant="outline" disabled={busyLoadId === order.id} onClick={() => void respondToOrder(order.id, "rejected")}>رد سفارش</Button></div>}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="mt-6 border-t border-border pt-5">
          <h2 className="text-lg font-bold">مدیریت بارهای من</h2>
          {loadingOwnedLoads ? <p className="mt-3 text-sm text-muted-foreground">در حال دریافت بارهای شما…</p> : ownedLoads.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">هنوز باری برای این حساب ثبت نشده است.</p> : (
            <ul className="mt-3 grid gap-3">
              {ownedLoads.map(load => (
                <li key={load.id} className="rounded-lg border border-border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-bold">{load.product_type || load.name}{load.engine ? " · " + load.engine : ""}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{load.city} · {faNumber(Number(load.count ?? 0))} بسته · {faNumber(Number(load.price))} تومان/کیلو</p>
                    </div>
                    <span className="rounded-full bg-secondary px-3 py-1 text-xs">{loadStatusLabels[load.status] ?? load.status}</span>
                  </div>
                  {["active", "pending"].includes(load.status) && <Button type="button" variant="outline" size="sm" className="mt-3" disabled={busyLoadId === load.id} onClick={() => void deactivateLoad(load.id)}>{busyLoadId === load.id ? "در حال غیرفعال‌کردن…" : "غیرفعال‌کردن بار"}</Button>}
                </li>
              ))}
            </ul>
          )}
          {manageError && <p role="alert" className="mt-3 text-sm text-destructive">{manageError}</p>}
        </div>
        {saved ? (
          <div className="mt-8 text-center"><CheckCircle2 className="mx-auto mb-3 size-12 text-primary" /><p className="font-bold">بار شما با موفقیت منتشر شد</p><p className="mt-2 text-sm text-muted-foreground">آگهی شما اکنون در فهرست بارهای فعال بازار نمایش داده می‌شود.</p><Button asChild className="mt-6"><Link to="/">بازگشت به بازار</Link></Button></div>
        ) : (
          <form onSubmit={submit} className="mt-6 grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="field-label">نام محصول<input required value={form.product} onChange={e => set('product')(e.target.value)} className="field-input" placeholder="مثلاً پرتقال" /></label>
              <label className="field-label">رقم / نوع<input required value={form.variety} onChange={e => set('variety')(e.target.value)} className="field-input" placeholder="مثلاً تامسون" /></label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="field-label">درجه کیفیت<select className="field-input" value={form.quality} onChange={e => set('quality')(e.target.value)}>{qualities.map(item => <option key={item}>{item}</option>)}</select></label>
              <label className="field-label">زمان آماده بودن<input required value={form.ready} onChange={e => set('ready')(e.target.value)} className="field-input" type="date" /></label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="field-label">شهر مبدأ<select className="field-input" value={form.city} onChange={e => set('city')(e.target.value)}>{cities.map(item => <option key={item}>{item}</option>)}</select></label>
              <label className="field-label">استان<input required value={form.province} onChange={e => set('province')(e.target.value)} className="field-input" placeholder="مثلاً مازندران" /></label>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <label className="field-label">وزن هر بسته (کیلو)<input required type="number" min="1" step="0.5" dir="ltr" value={form.weight} onChange={e => set('weight')(e.target.value)} className="field-input text-left" /></label>
              <label className="field-label">موجودی (بسته)<input required type="number" min="1" step="1" dir="ltr" value={form.stock} onChange={e => set('stock')(e.target.value)} className="field-input text-left" /></label>
              <label className="field-label">حداقل سفارش (بسته)<input required type="number" min="1" step="1" dir="ltr" value={form.minimum} onChange={e => set('minimum')(e.target.value)} className="field-input text-left" /></label>
            </div>
            <label className="field-label">قیمت هر کیلوگرم (تومان)<input required type="number" min="1" step="100" dir="ltr" value={form.price} onChange={e => set('price')(e.target.value)} className="field-input text-left" placeholder="مثلاً ۴۸۰۰۰" /></label>
            <label className="field-label">توضیحات<textarea value={form.description} onChange={e => set('description')(e.target.value)} className="field-input min-h-20 resize-y" placeholder="جزئیات بسته‌بندی، کیفیت، شرایط تحویل…" /></label>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={busy}>{busy ? 'در حال ثبت…' : 'ثبت و انتشار بار'}</Button>
          </form>
        )}
      </div>
    </div></section>
  );
}
