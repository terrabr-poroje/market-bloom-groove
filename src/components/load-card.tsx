/* eslint-disable @typescript-eslint/no-explicit-any -- Dynamic queries target the audited production Supabase schema; generated client types are stale. */
import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Check, Clock3, MapPin, Package, Store, Truck, Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { calculateOrder, faNumber, type Load } from '@/lib/marketplace';

export function LoadCard({ load }: { load: Load }) {
  const [dialog, setDialog] = useState<'order' | 'seller' | null>(null);
  const [count, setCount] = useState(String(load.minimum));
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [deliveryType, setDeliveryType] = useState<'terrabar' | 'pickup' | 'buyer_carrier'>('terrabar');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const quantity = Number(count);
  const valid = Number.isInteger(quantity) && quantity >= load.minimum && quantity <= load.stock;
  const totals = calculateOrder(load, valid ? quantity : 0);
  function openOrder() {
    setCount(String(load.minimum));
    setSubmitted(false);
    setOrderError('');
    setDeliveryType('terrabar');
    setDeliveryAddress('');
    setOrderNotes('');
    setDialog('order');
  }
  async function submitOrder() {
    setOrderError('');
    if (!valid) return;
    if (load.isSample) { setSubmitted(true); return; }
    if (!load.memberId) {
      setOrderError('شناسه فروشنده در اطلاعات بار موجود نیست؛ ثبت سفارش متوقف شد.');
      return;
    }
    if (deliveryType !== 'pickup' && !deliveryAddress.trim()) {
      setOrderError('برای حمل به نشانی تحویل نیاز داریم. برای تحویل حضوری، گزینه مربوطه را انتخاب کنید.');
      return;
    }
    setBusy(true);
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      setOrderError('برای ثبت درخواست سفارش ابتدا وارد حساب شوید.');
      setBusy(false);
      return;
    }
    const { data: buyer, error: buyerError } = await (supabase as any)
      .from('members')
      .select('id, full_name, phone, city, role')
      .eq('auth_user_id', authData.user.id)
      .maybeSingle();
    if (buyerError || !buyer) {
      setOrderError('پروفایل خریدار پیدا نشد؛ ابتدا ثبت‌نام را کامل کنید.');
      setBusy(false);
      return;
    }
    const { error: insertError } = await (supabase as any).from('orders').insert({
      load_id: load.id,
      customer_name: buyer.full_name,
      customer_phone: buyer.phone,
      customer_city: buyer.city,
      quantity,
      unit: 'package',
      price: load.price,
      total_price: totals.total,
      delivery_address: deliveryType === 'pickup' ? null : deliveryAddress.trim(),
      delivery_type: deliveryType,
      status: 'pending',
      notes: orderNotes.trim() || null,
      buyer_member_id: buyer.id,
      seller_member_id: load.memberId,
    });
    if (insertError) {
      setOrderError('ثبت درخواست انجام نشد. بررسی کنید نقش خریدار و دسترسی‌های سفارش در Supabase فعال باشند.');
    } else {
      setSubmitted(true);
    }
    setBusy(false);
  }
  const qualityStyle = { 'ویژه': 'bg-accent text-primary', 'استاندارد': 'bg-info-soft text-info', 'اقتصادی': 'bg-warning-soft text-warning', 'توافقی': 'bg-muted text-muted-foreground' }[load.quality];
  return <article className="load-card overflow-hidden rounded-lg border border-border bg-card">
    <div className="relative aspect-[1.8/1] overflow-hidden"><img src={load.image} alt={`${load.product} ${load.variety}`} loading="lazy" width={1024} height={768} className={`h-full w-full object-cover transition-transform duration-500 motion-safe:hover:scale-105 ${load.id === 1 ? 'object-[85%_65%]' : ''}`} /><span className={`absolute right-3 top-3 inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-semibold ${qualityStyle}`}>{load.quality === 'ویژه' && <Check className="size-3" />}{load.quality}</span><span className="absolute bottom-3 left-3 rounded bg-card/95 px-2 py-1 text-[10px] text-muted-foreground">{load.isSample ? 'بار نمونه' : 'بار ثبت‌شده'}</span></div>
    <div className="p-4"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><h3 className="text-xl font-extrabold">{load.product}</h3><p className="mt-1 text-sm text-muted-foreground">{load.variety}</p></div><span className="rounded bg-secondary px-2 py-1 text-[10px] text-muted-foreground">{load.category}</span></div>
      <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3.5 text-primary" />{load.city}، {load.province}</p>
      <div className="my-4 grid grid-cols-3 border-y border-border py-3 text-center"><div><p className="text-[10px] text-muted-foreground">وزن بسته</p><p className="mt-1 text-xs font-bold">{faNumber(load.weight)} کیلوگرم</p></div><div className="border-x border-border"><p className="text-[10px] text-muted-foreground">موجودی</p><p className="mt-1 text-xs font-bold">{faNumber(load.stock)} بسته</p></div><div><p className="text-[10px] text-muted-foreground">حداقل سفارش</p><p className="mt-1 text-xs font-bold">{faNumber(load.minimum)} بسته</p></div></div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1"><span className="text-xs text-muted-foreground">قیمت هر کیلوگرم</span><span className="text-xl font-extrabold text-primary">{faNumber(load.price)} <span className="text-xs font-normal text-muted-foreground">تومان</span></span></div>
      <div className="mt-3 flex flex-col gap-2 text-[10px]"><span className="flex items-center gap-1 text-primary"><Truck className="size-3.5" />{load.ready}</span><span className="flex items-center gap-1 text-muted-foreground"><Clock3 className="size-3.5" />{load.isSample ? `اعتبار نمونه: ${load.validity}` : load.validity}</span></div>
      <Button className="mt-4 h-10 w-full gap-1 px-2 text-xs" onClick={openOrder}>مشاهده جزئیات و ثبت سفارش<ArrowLeft className="mr-auto" /></Button><Button variant="ghost" className="mt-1 w-full text-xs text-muted-foreground" onClick={() => setDialog('seller')}><Store className="size-3.5" />ویترین فروشنده</Button>
    </div>
    <Dialog open={dialog !== null} onOpenChange={open => { if (!open) setDialog(null); }}><DialogContent dir="rtl" className="max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg text-right"><DialogTitle className="mt-3 text-right">{dialog === 'seller' ? load.seller : `${load.product} · ${load.variety}`}</DialogTitle><DialogDescription className="text-right">{dialog === 'seller' ? `${load.sellerType} — اطلاعات تماس مستقیم نمایش داده نمی‌شود` : load.isSample ? 'این کارت نمونه است؛ فقط محاسبه نمایشی انجام می‌شود.' : 'درخواست به فروشنده ارسال می‌شود؛ پرداخت پس از تأیید شرایط انجام خواهد شد.'}</DialogDescription>
      {dialog === 'seller' ? <><img className="aspect-[2/1] w-full rounded object-cover" src={load.image} alt={load.product} /><p className="flex items-center gap-2 text-sm"><MapPin className="size-4 text-primary" />{load.city}، {load.province}</p><div className="border-t border-border pt-4"><h4 className="font-bold">بار موجود در ویترین</h4><p className="mt-2 text-sm text-muted-foreground">{load.product} {load.variety} · {load.quality} · {faNumber(load.stock)} بسته</p><Button className="mt-4 w-full" onClick={openOrder}>مشاهده بار<ArrowLeft /></Button></div></> : submitted ? <div className="py-5 text-center"><Check className="mx-auto size-12 rounded-full bg-secondary p-2 text-primary" /><h3 className="mt-4 font-bold">{load.isSample ? 'پیش‌نمایش سفارش آماده است' : 'درخواست سفارش ثبت شد'}</h3><p className="mt-3 text-sm">{faNumber(quantity)} بسته · {faNumber(totals.weight)} کیلوگرم</p><p className="mt-2 text-lg font-bold text-primary">{faNumber(totals.total)} تومان</p><p className="mt-4 text-xs leading-6 text-muted-foreground">{load.isSample ? 'سفارش واقعی ثبت نشده و موجودی تغییری نکرده است.' : 'درخواست در انتظار تأیید فروشنده است. پرداخت هنوز انجام نشده و موجودی تا زمان توافق کم نمی‌شود.'}</p><Button className="mt-5" onClick={() => setDialog(null)}>بازگشت</Button></div> : <>
        <div className="grid grid-cols-2 gap-3 border-y border-border py-4 text-sm"><span>درجه کیفیت: <strong>{load.quality}</strong></span><span>مبدأ: <strong>{load.city}</strong></span><span>وزن بسته: <strong>{faNumber(load.weight)} کیلو</strong></span><span>موجودی: <strong>{faNumber(load.stock)} بسته</strong></span><span className="flex items-center gap-1 text-primary"><Truck className="size-4" />{load.ready}</span><span>{load.isSample ? `اعتبار نمونه: ${load.validity}` : load.validity}</span></div>
        <label htmlFor={`quantity-${load.id}`} className="text-sm font-semibold">تعداد بسته</label><div className="grid grid-cols-[40px_minmax(0,1fr)_40px] gap-2"><Button size="icon" variant="outline" aria-label="افزایش تعداد بسته" disabled={quantity >= load.stock} onClick={() => setCount(String(Math.min(load.stock, Math.max(load.minimum, quantity || 0) + 1)))}><Plus /></Button><input id={`quantity-${load.id}`} type="number" value={count} min={load.minimum} max={load.stock} step="1" onChange={e => setCount(e.target.value)} className="field-input text-center" /><Button size="icon" variant="outline" aria-label="کاهش تعداد بسته" disabled={quantity <= load.minimum} onClick={() => setCount(String(Math.max(load.minimum, quantity - 1)))}><Minus /></Button></div><p className={`text-xs ${valid ? 'text-muted-foreground' : 'text-destructive'}`}>حداقل {faNumber(load.minimum)} و حداکثر {faNumber(load.stock)} بسته؛ فقط تعداد صحیح.</p>
        <div className="grid gap-3 bg-secondary p-4 text-sm"><div className="flex justify-between"><span>وزن کل</span><strong>{faNumber(totals.weight)} کیلوگرم</strong></div><div className="flex justify-between"><span>قیمت هر کیلوگرم</span><strong>{faNumber(load.price)} تومان</strong></div><div className="flex justify-between border-t border-border pt-3"><span>مبلغ کل کالا</span><strong className="text-lg text-primary">{faNumber(totals.total)} تومان</strong></div></div><p className="text-xs text-muted-foreground">هزینه حمل در مبلغ فوق محاسبه نشده است.</p>
        {!load.isSample && <div className="grid gap-3 rounded-lg border border-border p-4">
          <label className="field-label">روش دریافت بار<select className="field-input" value={deliveryType} onChange={e => setDeliveryType(e.target.value as 'terrabar' | 'pickup' | 'buyer_carrier')}><option value="terrabar">حمل‌کننده پیشنهادی ترابار</option><option value="pickup">تحویل حضوری از فروشنده</option><option value="buyer_carrier">حمل‌کننده خریدار</option></select></label>
          {deliveryType !== 'pickup' && <label className="field-label">نشانی تحویل<input required value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} className="field-input" placeholder="نشانی دقیق یا محل تحویل" /></label>}
          <label className="field-label">توضیحات سفارش (اختیاری)<textarea value={orderNotes} onChange={e => setOrderNotes(e.target.value)} className="field-input min-h-16 resize-y" placeholder="توضیحات لازم برای فروشنده" /></label>
        </div>}
        {orderError && <p role="alert" className="text-sm text-destructive">{orderError} {orderError.includes('وارد حساب') && <Link to="/auth" className="font-bold text-primary underline">ورود / ثبت‌نام</Link>}</p>}
        <Button disabled={!valid || busy} onClick={() => void submitOrder()}>{busy ? 'در حال ارسال…' : load.isSample ? 'پیش‌نمایش سفارش' : 'ارسال درخواست سفارش'}<Package /></Button>
      </>}
    </DialogContent></Dialog>
  </article>;
}