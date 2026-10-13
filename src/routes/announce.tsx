import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from 'react';
import { CheckCircle2, Megaphone, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { cities, pageHead, qualities } from '@/lib/marketplace';

export const Route = createFileRoute("/announce")({
  head: () => pageHead('اعلام بار', 'ثبت بار جدید در بازار ترابار؛ پس از تأیید مدیر در بازار منتشر می‌شود.'),
  component: AnnouncePage,
});

const qualityValues = ['premium', 'standard', 'economy', 'negotiated'] as const;
const qualityMap = Object.fromEntries(qualities.map((label, index) => [label, qualityValues[index]]));

function AnnouncePage() {
  const { user, loading, canAnnounce } = useAuth();
  const [form, setForm] = useState({ product: '', variety: '', quality: 'استاندارد', city: cities[0], province: '', weight: '', stock: '', minimum: '', price: '', ready: 'آماده بارگیری', description: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const set = (key: keyof typeof form) => (value: string) => setForm(prev => ({ ...prev, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    setBusy(true);
    setError('');
    const { error: insertError } = await supabase.from('loads').insert({
      seller_id: user.id,
      product_name: form.product,
      variety: form.variety,
      quality: qualityMap[form.quality] ?? 'standard',
      city: form.city,
      province: form.province,
      package_weight_kg: Number(form.weight),
      stock_packages: Number(form.stock),
      min_order_packages: Number(form.minimum),
      price_per_kg: Number(form.price),
      ready_at: form.ready,
      description: form.description,
      status: 'pending',
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
        <p className="mt-2 text-sm text-muted-foreground">بار شما پس از بررسی و تأیید مدیر در بازار منتشر می‌شود.</p>
        {saved ? (
          <div className="mt-8 text-center"><CheckCircle2 className="mx-auto mb-3 size-12 text-primary" /><p className="font-bold">بار شما ثبت شد و در انتظار تأیید مدیر است</p><p className="mt-2 text-sm text-muted-foreground">پس از تأیید، در فهرست بارهای بازار نمایش داده می‌شود.</p><Button asChild className="mt-6"><Link to="/">بازگشت به بازار</Link></Button></div>
        ) : (
          <form onSubmit={submit} className="mt-6 grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="field-label">نام محصول<input required value={form.product} onChange={e => set('product')(e.target.value)} className="field-input" placeholder="مثلاً پرتقال" /></label>
              <label className="field-label">رقم / نوع<input required value={form.variety} onChange={e => set('variety')(e.target.value)} className="field-input" placeholder="مثلاً تامسون" /></label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="field-label">درجه کیفیت<select className="field-input" value={form.quality} onChange={e => set('quality')(e.target.value)}>{qualities.map(item => <option key={item}>{item}</option>)}</select></label>
              <label className="field-label">زمان آماده بودن<input required value={form.ready} onChange={e => set('ready')(e.target.value)} className="field-input" placeholder="مثلاً آماده بارگیری" /></label>
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
            <Button type="submit" disabled={busy}>{busy ? 'در حال ثبت…' : 'ثبت بار و ارسال برای تأیید مدیر'}</Button>
          </form>
        )}
      </div>
    </div></section>
  );
}
