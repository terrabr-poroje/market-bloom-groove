/* eslint-disable @typescript-eslint/no-explicit-any -- Dynamic queries target the audited production Supabase schema; generated client types are stale. */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from 'react';
import { Check, CheckCircle2, Copy, Megaphone, ShieldAlert, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { faNumber, normalizeNumericInput, pageHead, provinces, qualities } from '@/lib/marketplace';
import { CityPicker } from '@/components/city-picker';

export const Route = createFileRoute("/announce")({
  head: () => pageHead('اعلام بار', 'ثبت و انتشار فوری بار برای اعضای تأییدشده ترابار.'),
  component: AnnouncePage,
});

const qualityValues = ['premium', 'standard', 'economy', 'negotiated'] as const;
const qualityMap = Object.fromEntries(qualities.map((label, index) => [label, qualityValues[index]]));
const salesSections = [
  { key: 'retail', label: 'خرده‌فروشی', defaultMin: 1 },
  { key: 'wholesale', label: 'عمده‌فروشی', defaultMin: 2 },
  { key: 'special', label: 'فروش ویژه', defaultMin: 2 },
  { key: 'professional', label: 'ویژه حرفه‌ای', defaultMin: 5 },
] as const;
type SaleSectionKey = typeof salesSections[number]['key'];

function allowedSaleSections(role: string): SaleSectionKey[] {
  return role === 'supplier' ? ['professional'] : ['retail', 'wholesale', 'special', 'professional'];
}
type OwnedLoad = { id: string; name: string; product_type: string; engine: string | null; city: string; origin: string | null; quality: string | null; quantity: number; count: number | null; price: number; status: string; package_type: string | null; package_weight: number | null; min_order_quantity: number | null; ready_date: string | null; description: string | null; created_at: string };
type IncomingOrder = { id: string; load_id: string; customer_name: string; customer_city: string; quantity: number; unit: string; price: number; total_price: number; delivery_address: string | null; delivery_type: string | null; status: string; payment_status: string; delivery_status: string; notes: string | null; created_at: string };
const loadStatusLabels: Record<string, string> = { pending: 'در انتظار تأیید', active: 'فعال', inactive: 'غیرفعال', rejected: 'رد شده', sold_out: 'تمام‌شده', expired: 'منقضی‌شده' };
const orderStatusLabels: Record<string, string> = { pending: 'در انتظار پاسخ شما', accepted: 'تأیید شده توسط فروشنده', rejected: 'رد شده توسط فروشنده' };
const paymentStatusLabels: Record<string, string> = { unpaid: 'پرداخت‌نشده', pending: 'در انتظار تأیید پرداخت', paid: 'پرداخت تأییدشده', failed: 'پرداخت ناموفق', refunded: 'بازپرداخت‌شده' };
const deliveryStatusLabels: Record<string, string> = { awaiting_payment: 'در انتظار پرداخت', awaiting_dispatch: 'آماده ارسال', shipped: 'بار ارسال شده', delivered: 'تحویل گرفته شده', disputed: 'در حال بررسی اختلاف' };


const localIsoDate = (date = new Date()) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};
const jalaliFormatter = new Intl.DateTimeFormat('en-US-u-ca-persian-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric' });
const jalaliDisplayFormatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { year: 'numeric', month: 'long', day: 'numeric' });
const jalaliMonthFormatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', { month: 'long' });
const jalaliParts = (date: Date) => Object.fromEntries(jalaliFormatter.formatToParts(date).filter(p => p.type !== 'literal').map(p => [p.type, Number(p.value)])) as { year: number; month: number; day: number };
function JalaliDateField({ label, value, min, onChange }: { label: string; value: string; min?: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const selected = value ? new Date(`${value}T12:00:00`) : new Date();
  const [view, setView] = useState(() => selected);
  useEffect(() => { if (value) setView(new Date(`${value}T12:00:00`)); }, [value]);
  const parts = jalaliParts(view);
  const monthStart = (() => {
    for (let offset = -35; offset <= 5; offset++) {
      const candidate = new Date(view.getFullYear(), view.getMonth(), view.getDate() + offset, 12);
      const p = jalaliParts(candidate);
      if (p.year === parts.year && p.month === parts.month && p.day === 1) return candidate;
    }
    return new Date(view.getFullYear(), view.getMonth(), 1, 12);
  })();
  const monthDays = Array.from({ length: 31 }, (_, i) => new Date(monthStart.getFullYear(), monthStart.getMonth(), monthStart.getDate() + i, 12))
    .filter(d => { const p = jalaliParts(d); return p.year === parts.year && p.month === parts.month; });
  const firstWeekday = (monthStart.getDay() + 1) % 7;
  const minIso = min || localIsoDate();
  const toIso = (date: Date) => localIsoDate(date);
  const dayNames = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];
  return <div className="field-label relative">{label}
    <button type="button" className="field-input w-full text-right" onClick={() => setOpen(v => !v)} aria-expanded={open}>
      {value ? jalaliDisplayFormatter.format(selected) : 'انتخاب تاریخ شمسی'}
    </button>
    {open && <div className="absolute z-50 mt-1 w-[min(20rem,90vw)] rounded-xl border border-border bg-background p-3 shadow-lg" dir="rtl">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button type="button" className="rounded border px-3 py-1" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 15, 12))} aria-label="ماه قبل">ماه قبل</button>
        <strong>{jalaliMonthFormatter.format(monthStart)} {parts.year.toLocaleString('fa-IR')}</strong>
        <button type="button" className="rounded border px-3 py-1" onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 15, 12))} aria-label="ماه بعد">ماه بعد</button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">{dayNames.map((d, i) => <span key={i} className="py-1">{d}</span>)}</div>
      <div className="grid grid-cols-7 gap-1 text-center">{Array.from({ length: firstWeekday }, (_, i) => <span key={`blank-${i}`} />)}{monthDays.map(date => {
        const iso = toIso(date); const day = jalaliParts(date).day; const disabled = iso < minIso;
        return <button key={iso} type="button" disabled={disabled} onClick={() => { onChange(iso); setOpen(false); }} className={`rounded-md py-2 text-sm ${iso === value ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'} ${disabled ? 'cursor-not-allowed opacity-30' : ''}`}>{day.toLocaleString('fa-IR')}</button>;
      })}</div>
    </div>}
  </div>;
}

async function optimizeLoadPhoto(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  try {
    const maxDimension = 1600;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= 1_200_000) return file;
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', 0.82));
    if (!blob || blob.size >= file.size) return file;
    const baseName = file.name.replace(/\\.[^.]+$/, '') || 'load-photo';
    return new File([blob], baseName + '.webp', { type: 'image/webp', lastModified: Date.now() });
  } finally { bitmap.close(); }
}
function AnnouncePage() {
  const { user, loading, canAnnounce } = useAuth();
  const [form, setForm] = useState({ product: '', variety: '', quality: 'استاندارد', city: 'کرج', province: 'البرز', packageType: 'کارتن', weight: '', stock: '', minimum: '', price: '', ready: localIsoDate(), adStart: localIsoDate(), adEnd: localIsoDate(), responseStart: '08:00', responseEnd: '18:00', description: '' });
  const [memberCity, setMemberCity] = useState('');
  const [storefrontMemberId, setStorefrontMemberId] = useState('');
  const [storeLinkCopied, setStoreLinkCopied] = useState(false);
  const [memberRole, setMemberRole] = useState<'supplier' | 'bar_seller' | 'seller' | ''>('');
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [saleSectionsEnabled, setSaleSectionsEnabled] = useState<SaleSectionKey[]>(['retail']);
  const [salePrices, setSalePrices] = useState<Record<SaleSectionKey, string>>({ retail: '', wholesale: '', special: '', professional: '' });
  const [saleMinimums, setSaleMinimums] = useState<Record<SaleSectionKey, string>>({ retail: '1', wholesale: '2', special: '2', professional: '5' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [ownedLoads, setOwnedLoads] = useState<OwnedLoad[]>([]);
  const [incomingOrders, setIncomingOrders] = useState<IncomingOrder[]>([]);
  const [loadingIncomingOrders, setLoadingIncomingOrders] = useState(true);
  const [loadingOwnedLoads, setLoadingOwnedLoads] = useState(true);
  const [manageError, setManageError] = useState('');
  const [busyLoadId, setBusyLoadId] = useState('');
  const [editingLoad, setEditingLoad] = useState<OwnedLoad | null>(null);
  const [editValues, setEditValues] = useState({ product: '', variety: '', quality: 'standard', origin: '', city: '', packageType: 'کارتن', weight: '', count: '', minimum: '', price: '', ready: '', description: '' });
  const [editTiers, setEditTiers] = useState<Record<SaleSectionKey, { enabled: boolean; price: string; minimum: string }>>({ retail: { enabled: true, price: '', minimum: '1' }, wholesale: { enabled: false, price: '', minimum: '2' }, special: { enabled: false, price: '', minimum: '2' }, professional: { enabled: false, price: '', minimum: '5' } });
  const set = (key: keyof typeof form) => (value: string) => setForm(prev => ({ ...prev, [key]: value }));
  const toggleSaleSection = (key: SaleSectionKey, checked: boolean) => {
    setSaleSectionsEnabled(prev => checked ? [...new Set([...prev, key])] : prev.filter(item => item !== key));

  };

  useEffect(() => {
    let active = true;
    async function fetchOwnedLoads() {
      if (!user) { setLoadingOwnedLoads(false); setLoadingIncomingOrders(false); return; }
      const { data: member } = await (supabase as any).from('members').select('id, city').eq('auth_user_id', user.id).maybeSingle();
      if (!active) return;
      if (!member) { setOwnedLoads([]); setIncomingOrders([]); setLoadingOwnedLoads(false); setLoadingIncomingOrders(false); return; }
      setMemberCity(String(member.city ?? '').trim());
      setStorefrontMemberId(String(member.id));
      if (member.city) setForm(prev => ({ ...prev, city: String(member.city).trim(), province: String(member.city).trim() }));
      const { data: roleRows } = await (supabase as any).from('member_roles').select('role_code, approval_status').eq('member_id', member.id).eq('approval_status', 'approved');
      if (!active) return;
      const codes = (roleRows ?? []).map((row: any) => String(row.role_code).toLowerCase());
      const detectedRole = codes.includes('supplier') ? 'supplier' : codes.includes('bar_seller') ? 'bar_seller' : codes.includes('seller') ? 'seller' : '';
      setMemberRole(detectedRole);
      const allowedSections = allowedSaleSections(detectedRole);
      setSaleSectionsEnabled(allowedSections[0] ? [allowedSections[0]] : []);
      setSaleMinimums(prev => ({ ...prev, professional: '5', retail: '1', wholesale: '2', special: '2' }));
      const [{ data, error: listError }, { data: orderData, error: orderListError }] = await Promise.all([
        (supabase as any).from('loads').select('id, name, product_type, engine, city, origin, quality, quantity, count, price, status, package_type, package_weight, min_order_quantity, ready_date, description, created_at').or('member_id.eq.' + member.id + ',owner_member_id.eq.' + member.id).order('created_at', { ascending: false }),
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

  async function startEditLoad(load: OwnedLoad) {
    setManageError('');
    const { data: tiers, error: tierError } = await (supabase as any).from('load_price_tiers')
      .select('sale_type, unit_price, minimum_packages').eq('load_id', load.id);
    if (tierError) {
      setManageError('اطلاعات قیمت‌گذاری این بار دریافت نشد؛ ویرایش انجام نشد.');
      return;
    }
    const nextTiers: Record<SaleSectionKey, { enabled: boolean; price: string; minimum: string }> = {
      retail: { enabled: false, price: String(load.price ?? ''), minimum: '1' },
      wholesale: { enabled: false, price: String(load.price ?? ''), minimum: '2' },
      special: { enabled: false, price: String(load.price ?? ''), minimum: '2' },
      professional: { enabled: false, price: String(load.price ?? ''), minimum: '5' },
    };
    for (const tier of tiers ?? []) {
      if (tier.sale_type in nextTiers && allowedSaleSections(memberRole).includes(tier.sale_type as SaleSectionKey)) {
        const key = tier.sale_type as SaleSectionKey;
        nextTiers[key] = { enabled: true, price: String(tier.unit_price ?? load.price ?? ''), minimum: String(tier.minimum_packages ?? 1) };
      }
    }
    if (!Object.values(nextTiers).some(t => t.enabled)) nextTiers[allowedSaleSections(memberRole)[0] ?? 'retail'].enabled = true;
    setEditTiers(nextTiers);
    setEditValues({
      product: load.product_type || load.name || '',
      variety: load.engine || '',
      quality: load.quality || 'standard',
      origin: load.origin || '',
      city: load.city || '',
      packageType: load.package_type || 'کارتن',
      weight: String(load.package_weight ?? (load.count ? Number(load.quantity) / Number(load.count) : '')),
      count: String(load.count ?? ''),
      minimum: String(load.min_order_quantity ?? 1),
      price: String(load.price ?? ''),
      ready: load.ready_date || new Date().toISOString().slice(0, 10),
      description: load.description || '',
    });
    setEditingLoad(load);
  }

  async function saveEditedLoad(event: FormEvent) {
    event.preventDefault();
    if (!editingLoad) return;
    const weight = Number(editValues.weight), count = Number(editValues.count);
    const minimum = Number(editValues.minimum), price = Number(editValues.price);
    const allowedSections = allowedSaleSections(memberRole);
    const enabled = salesSections.filter(section => allowedSections.includes(section.key) && editTiers[section.key].enabled);
    if (!editValues.product.trim() || !editValues.variety.trim() || !editValues.city.trim() || !editValues.origin.trim() ||
        !Number.isFinite(weight) || weight <= 0 || !Number.isInteger(count) || count < 1 ||
        !Number.isInteger(minimum) || minimum < 1 || minimum > count || !Number.isFinite(price) || price <= 0 ||
        !enabled.length || salesSections.some(section => editTiers[section.key].enabled && !allowedSections.includes(section.key)) || enabled.some(section => {
          const t = editTiers[section.key];
          return !Number.isFinite(Number(t.price)) || Number(t.price) < 10000 || !Number.isInteger(Number(t.minimum)) || Number(t.minimum) < 1 || Number(t.minimum) > count;
        })) {
      setManageError('ویرایش ذخیره نشد؛ همه اطلاعات ضروری، موجودی، حداقل سفارش و قیمت‌های بخش‌های فروش را بررسی کنید.');
      return;
    }
    setBusyLoadId(editingLoad.id);
    setManageError('');
    const { error: updateError } = await (supabase as any).from('loads').update({
      name: [editValues.product.trim(), editValues.variety.trim()].join(' '),
      product_type: editValues.product.trim(),
      engine: editValues.variety.trim(),
      quality: editValues.quality,
      origin: editValues.origin.trim(),
      source_region: editValues.origin.trim(),
      city: editValues.city.trim(),
      package_type: editValues.packageType,
      package_weight: weight,
      quantity: weight * count,
      count,
      min_quantity: Number(editValues.minimum) * weight,
      min_order_quantity: minimum,
      price,
      ready_date: editValues.ready,
      description: editValues.description.trim() || null,
    }).eq('id', editingLoad.id);
    if (updateError) {
      setManageError('ذخیره ویرایش بار انجام نشد؛ ممکن است ستون یا سیاست دسترسی دیتابیس نیاز به بررسی داشته باشد.');
      setBusyLoadId('');
      return;
    }
    const { error: clearTierError } = await (supabase as any).from('load_price_tiers').delete().eq('load_id', editingLoad.id);
    if (clearTierError) {
      setManageError('اطلاعات اصلی ذخیره شد، اما به‌روزرسانی قیمت‌های اختصاصی ناموفق بود. بار را دوباره بررسی کنید.');
      setBusyLoadId('');
      return;
    }
    const tierRows = enabled.map(section => ({
      load_id: editingLoad.id, sale_type: section.key,
      unit_price: Number(editTiers[section.key].price),
      minimum_packages: Number(editTiers[section.key].minimum),
      min_quantity: Number(editTiers[section.key].minimum) * weight, max_quantity: null,
    }));
    const { error: insertTierError } = await (supabase as any).from('load_price_tiers').insert(tierRows);
    if (insertTierError) {
      setManageError('اطلاعات اصلی ذخیره شد، اما ذخیره قیمت‌های بخش فروش ناموفق بود؛ بار را بررسی کنید.');
      setBusyLoadId('');
      return;
    }
    setOwnedLoads(items => items.map(item => item.id === editingLoad.id ? {
      ...item, name: [editValues.product.trim(), editValues.variety.trim()].join(' '),
      product_type: editValues.product.trim(), engine: editValues.variety.trim(),
      quality: editValues.quality, origin: editValues.origin.trim(), city: editValues.city.trim(),
      package_type: editValues.packageType, package_weight: weight, quantity: weight * count,
      count, min_order_quantity: minimum, price, ready_date: editValues.ready,
      description: editValues.description.trim() || null,
    } : item));
    setEditingLoad(null);
    setBusyLoadId('');
    setManageError('ویرایش بار و قیمت‌های فروش ذخیره شد.');
  }

  async function deleteLoad(load: OwnedLoad) {
    if (!window.confirm('بار «' + (load.name || load.product_type) + '» حذف شود؟ این کار قابل بازگشت نیست.')) return;
    setBusyLoadId(load.id);
    setManageError('');
    const { data: linkedOrders, error: linkedOrderError } = await (supabase as any).from('orders').select('id').eq('load_id', load.id).limit(1);
    if (linkedOrderError) {
      setManageError('بررسی سفارش‌های مرتبط ممکن نشد؛ برای جلوگیری از حذف ناقص، عملیات متوقف شد.');
      setBusyLoadId('');
      return;
    }
    if ((linkedOrders ?? []).length) {
      setManageError('این بار سفارش مرتبط دارد؛ برای حفظ سوابق خرید، حذف کامل مجاز نیست. در صورت نیاز ابتدا بار را غیرفعال کنید.');
      setBusyLoadId('');
      return;
    }
    const { data: images, error: imageListError } = await (supabase as any).from('load_images').select('storage_path').eq('load_id', load.id);
    if (imageListError) {
      setManageError('فهرست عکس‌های بار دریافت نشد؛ برای جلوگیری از حذف ناقص، عملیات متوقف شد.');
      setBusyLoadId('');
      return;
    }
    const { error: tierDeleteError } = await (supabase as any).from('load_price_tiers').delete().eq('load_id', load.id);
    if (tierDeleteError) {
      setManageError('حذف قیمت‌های وابسته ممکن نشد؛ بار حذف نشد.');
      setBusyLoadId('');
      return;
    }
    const { error: imageDeleteError } = await (supabase as any).from('load_images').delete().eq('load_id', load.id);
    if (imageDeleteError) {
      setManageError('حذف اطلاعات عکس‌های بار ممکن نشد؛ حذف بار متوقف شد.');
      setBusyLoadId('');
      return;
    }
    const paths = (images ?? []).map((image: any) => image.storage_path).filter(Boolean);
    if (paths.length) {
      const { error: storageError } = await supabase.storage.from('terrabar-load-images').remove(paths);
      if (storageError) {
        console.warn('[Terrabar] load image storage cleanup failed', storageError);
      }
    }
    const { error: deleteError } = await (supabase as any).from('loads').delete().eq('id', load.id);
    if (deleteError) {
      setManageError('حذف خود بار انجام نشد؛ اگر سفارش مرتبط دارد ممکن است پایگاه داده مانع حذف باشد.');
      setBusyLoadId('');
      return;
    }
    setOwnedLoads(items => items.filter(item => item.id !== load.id));
    setEditingLoad(current => current?.id === load.id ? null : current);
    setBusyLoadId('');
    setManageError('بار و اطلاعات وابسته آن حذف شد.');
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
    const validSaleSections = saleSectionsEnabled.filter(key => {
      const p = Number(salePrices[key]);
      const min = Number(saleMinimums[key]);
      return Number.isFinite(p) && p >= 10000 && Number.isInteger(min) && min >= 1 && min <= packageCount;
    });
    if (!saleSectionsEnabled.length || validSaleSections.length !== saleSectionsEnabled.length) {
      setError('برای هر بخش فروش انتخاب‌شده، قیمت هر کیلو و حداقل تعداد بسته معتبر وارد کنید.');
      setBusy(false);
      return;
    }
    if (!form.product.trim() || !form.variety.trim() || !form.province.trim() || !form.city.trim() || !form.adStart || !form.adEnd || form.adStart < localIsoDate() || form.adEnd < form.adStart || !form.responseStart || !form.responseEnd || form.responseEnd <= form.responseStart ||
        photoFiles.length > 5 || photoFiles.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) ||
        !Number.isFinite(packageWeight) || packageWeight <= 0 ||
        !Number.isInteger(packageCount) || packageCount < 1 ||
        !form.ready) {
      setError('اطلاعات بار معتبر نیست. تاریخ شروع باید از امروز به بعد، پایان هم‌روز یا بعد از شروع، ساعت پایان بعد از ساعت شروع و قیمت هر کیلو حداقل ۱۰٬۰۰۰ تومان باشد.');
      setBusy(false);
      return;
    }

    // Resolve the approved member record first; loads.member_id references members.id,
    // not auth.users.id. The production schema uses its own canonical column names.
    const { data: member, error: memberError } = await (supabase as any)
      .from('members')
      .select('id, city')
      .eq('auth_user_id', user.id)
      .maybeSingle();

    if (memberError || !member) {
      setError('پروفایل عضویت شما پیدا نشد. ابتدا درخواست عضویت را ثبت کنید.');
      setBusy(false);
      return;
    }

    const { data: approvedRoleRows, error: approvedRoleError } = await (supabase as any)
      .from('member_roles').select('role_code, approval_status').eq('member_id', member.id).eq('approval_status', 'approved');
    const codes = (approvedRoleRows ?? []).map((row: any) => String(row.role_code).toLowerCase());
    const actualMemberRole = codes.includes('supplier') ? 'supplier' : codes.includes('bar_seller') ? 'bar_seller' : codes.includes('seller') ? 'seller' : '';
    if (approvedRoleError || !actualMemberRole) {
      setError('فقط تأمین‌کننده یا بارفروش تأییدشده می‌تواند بار منتشر کند.');
      setBusy(false); return;
    }
    const allowedSections = allowedSaleSections(actualMemberRole);
    if (!validSaleSections.length || saleSectionsEnabled.some(key => !allowedSections.includes(key))) {
      setError(actualMemberRole === 'supplier'
        ? 'تأمین‌کننده فقط می‌تواند بار را در بخش «ویژه حرفه‌ای» اعلام کند.'
        : 'بارفروش می‌تواند در بخش‌های «خرده‌فروشی»، «عمده‌فروشی»، «فروش ویژه» و «ویژه حرفه‌ای» اعلام بار کند.');
      setBusy(false); return;
    }
    const roleValidSaleSections = validSaleSections.filter(key => allowedSections.includes(key));
    if (actualMemberRole !== 'supplier' && !member.city) {
      setError('شهر ثابت عضویت شما ثبت نشده است؛ ابتدا اطلاعات عضویت را تکمیل کنید.');
      setBusy(false); return;
    }
    const offeredCity = actualMemberRole === 'supplier' ? form.city.trim() : String(member.city).trim();
    const originCity = form.province.trim();
    const firstSaleSection = roleValidSaleSections[0];
    const canonicalPrice = Number(salePrices[firstSaleSection]);
    const canonicalMinimum = Number(saleMinimums[firstSaleSection]);
    const { data: insertedLoad, error: insertError } = await (supabase as any).from('loads').insert({
      name: [form.product.trim(), form.variety.trim()].filter(Boolean).join(' '),
      product_type: form.product.trim(),
      engine: form.variety.trim() || null,
      quality: qualityMap[form.quality] ?? 'standard',
      city: offeredCity,
      origin: originCity,
      quantity: packageWeight * packageCount,
      count: packageCount,
      package_type: form.packageType,
      package_weight: packageWeight,
      unit: 'kg',
      min_quantity: canonicalMinimum * packageWeight,
      min_order_quantity: canonicalMinimum,
      price: canonicalPrice,
      price_unit: 'toman_per_kg',
      ready_date: form.ready,
      ad_start_date: form.adStart,
      ad_end_date: form.adEnd,
      response_start_time: form.responseStart,
      response_end_time: form.responseEnd,
      description: form.description.trim() || null,
      status: 'active',
      role: actualMemberRole === 'supplier' ? 'supplier' : 'seller',
      seller_type: actualMemberRole === 'supplier' ? 'supplier' : 'seller',
      member_id: member.id,
      owner_member_id: member.id,
      sale_type: roleValidSaleSections.length === 1 ? roleValidSaleSections[0] : 'regular',
      source_region: originCity,
    }).select('id').single();
    if (insertError || !insertedLoad) {
      setError('ثبت بار انجام نشد؛ اطلاعات یا دسترسی دیتابیس را بررسی کنید.');
    } else {
      const priceRows = roleValidSaleSections.map(key => ({
        load_id: insertedLoad.id,
        sale_type: key,
        unit_price: Number(salePrices[key]),
        minimum_packages: Number(saleMinimums[key]),
        min_quantity: Number(saleMinimums[key]) * packageWeight,
        max_quantity: null,
      }));
      const { error: tierError } = await (supabase as any).from('load_price_tiers').insert(priceRows);
      if (tierError) {
        await (supabase as any).from('loads').update({ status: 'inactive' }).eq('id', insertedLoad.id);
        setError('قیمت‌گذاری بخش‌های فروش ذخیره نشد؛ آگهی برای جلوگیری از انتشار ناقص غیرفعال شد.');
        setBusy(false); return;
      }
      if (photoFiles.length) {
        const imageRows: { load_id: string; storage_path: string; display_order: number }[] = [];
        for (const [index, file] of photoFiles.entries()) {
          let optimizedFile: File;
          try { optimizedFile = await optimizeLoadPhoto(file); }
          catch { optimizedFile = file; }
          const safeName = optimizedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
          const path = `${user.id}/${insertedLoad.id}/${crypto.randomUUID()}-${safeName}`;
          const { error: uploadError } = await supabase.storage.from('terrabar-load-images').upload(path, optimizedFile, { contentType: optimizedFile.type, upsert: false });
          if (uploadError) {
            const uploadedPaths = imageRows.map(image => image.storage_path);
            if (uploadedPaths.length) await supabase.storage.from('terrabar-load-images').remove(uploadedPaths);
            await (supabase as any).from('loads').update({ status: 'inactive' }).eq('id', insertedLoad.id);
            setError('بارگذاری عکس انجام نشد و آگهی برای جلوگیری از انتشار ناقص غیرفعال شد. علت: ' + uploadError.message);
            setBusy(false); return;
          }
          imageRows.push({ load_id: insertedLoad.id, storage_path: path, display_order: index });
        }
        const { error: imageError } = await (supabase as any).from('load_images').insert(imageRows);
        if (imageError) {
          setError('بار ثبت شد، اما پیوند عکس‌ها ذخیره نشد. آگهی را غیرفعال می‌کنیم تا ناقص منتشر نشود.');
          await (supabase as any).from('loads').update({ status: 'inactive' }).eq('id', insertedLoad.id);
          setBusy(false); return;
        }
      }
      setSaved(true);
    }
    setBusy(false);
  }

  if (loading) return <section className="py-16 text-center text-sm text-muted-foreground">در حال بارگذاری…</section>;

  if (!user) {
    return (
      <section className="bg-market-surface py-16"><div className="site-container max-w-md text-center">
        <h1 className="text-2xl font-extrabold">ابتدا وارد حساب شوید</h1>
        <p className="mt-3 text-sm text-muted-foreground">اعلام بار فقط پس از ثبت‌نام و تأیید عضویت حرفه‌ای توسط مدیریت فعال می‌شود.</p>
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
      {user && !loadingOwnedLoads && memberRole && storefrontMemberId && <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-800"><Store className="size-5" /></span>
          <div className="min-w-0 flex-1">
            <h2 className="font-extrabold text-emerald-950">ویترین اختصاصی من</h2>
            <p className="mt-1 text-sm leading-6 text-emerald-900">این لینک را برای مشتری‌های خود بفرستید. اگر مشتری وارد ترابار نشده باشد، ابتدا ثبت‌نام یا ورود می‌کند و سپس مستقیم به ویترین شما برمی‌گردد.</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input readOnly dir="ltr" aria-label="لینک اختصاصی ویترین" value={typeof window !== 'undefined' ? window.location.origin + '/store/' + encodeURIComponent(storefrontMemberId) : '/store/' + storefrontMemberId} className="field-input min-w-0 flex-1 bg-white text-left text-sm" />
              <Button type="button" className="shrink-0" onClick={async () => {
                const link = window.location.origin + '/store/' + encodeURIComponent(storefrontMemberId);
                try { await navigator.clipboard.writeText(link); setStoreLinkCopied(true); window.setTimeout(() => setStoreLinkCopied(false), 2500); }
                catch { const field = document.querySelector<HTMLInputElement>('input[aria-label="لینک اختصاصی ویترین"]'); field?.focus(); field?.select(); setManageError('کپی خودکار انجام نشد؛ لینک انتخاب شده است، آن را کپی کنید.'); }
              }}>{storeLinkCopied ? <Check className="ml-2 size-4" /> : <Copy className="ml-2 size-4" />}{storeLinkCopied ? 'کپی شد' : 'کپی لینک ویترین'}</Button>
            </div>
            {storeLinkCopied && <p role="status" className="mt-2 text-xs font-semibold text-emerald-800">لینک ویترین کپی شد؛ می‌توانید آن را برای مشتری بفرستید.</p>}
          </div>
        </div>
      </div>}
      <div className="rounded-lg border border-border bg-card p-6 sm:p-8">
        <h1 className="flex items-center gap-2 text-2xl font-extrabold"><Megaphone className="size-6 text-primary" />اعلام بار جدید</h1>
        <p className="mt-2 text-sm text-muted-foreground">اعلام بار فقط برای عضویت حرفه‌ای تأییدشده فعال است. تأمین‌کننده فقط در «ویژه حرفه‌ای» و بارفروش در بخش‌های مجاز از جمله «ویژه حرفه‌ای» بار اعلام می‌کند.</p>
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
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" disabled={!!busyLoadId} onClick={() => void startEditLoad(load)}>ویرایش همه اطلاعات</Button>
                    {["active", "pending"].includes(load.status) && <Button type="button" variant="outline" size="sm" disabled={!!busyLoadId} onClick={() => void deactivateLoad(load.id)}>{busyLoadId === load.id ? "در حال انجام…" : "غیرفعال‌کردن"}</Button>}
                    <Button type="button" variant="destructive" size="sm" disabled={!!busyLoadId} onClick={() => void deleteLoad(load)}>{busyLoadId === load.id ? "در حال انجام…" : "حذف بار"}</Button>
                  </div>
                  {editingLoad?.id === load.id && <form onSubmit={saveEditedLoad} className="mt-4 grid gap-3 rounded-xl border border-primary/30 bg-muted/30 p-4">
                    <h3 className="font-bold">ویرایش کامل بار</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <label className="field-label">نام محصول<input required className="field-input" value={editValues.product} onChange={e => setEditValues(v => ({...v, product:e.target.value}))} /></label>
                      <label className="field-label">رقم / نوع<input required className="field-input" value={editValues.variety} onChange={e => setEditValues(v => ({...v, variety:e.target.value}))} /></label>
                      <label className="field-label">کیفیت<select className="field-input" value={editValues.quality} onChange={e => setEditValues(v => ({...v, quality:e.target.value}))}><option value="premium">ویژه</option><option value="standard">استاندارد</option><option value="economy">اقتصادی</option><option value="negotiated">توافقی</option></select></label>
                      <label className="field-label">شهر مبدأ<input required className="field-input" value={editValues.origin} onChange={e => setEditValues(v => ({...v, origin:e.target.value}))} /></label>
                      <label className="field-label">شهر محل عرضه<input required className="field-input" value={editValues.city} onChange={e => setEditValues(v => ({...v, city:e.target.value}))} /></label>
                      <label className="field-label">نوع بسته<input required className="field-input" value={editValues.packageType} onChange={e => setEditValues(v => ({...v, packageType:e.target.value}))} /></label>
                      <label className="field-label">وزن هر بسته (کیلو)<input required type="text" inputMode="decimal" min="0.1" step="0.1" className="field-input" value={editValues.weight} onChange={e => setEditValues(v => ({...v, weight:normalizeNumericInput(e.target.value)}))} /></label>
                      <label className="field-label">تعداد بسته‌ها<input required type="text" inputMode="decimal" min="1" step="1" className="field-input" value={editValues.count} onChange={e => setEditValues(v => ({...v, count:normalizeNumericInput(e.target.value)}))} /></label>
                      <label className="field-label">حداقل سفارش (بسته)<input required type="text" inputMode="decimal" min="1" step="1" className="field-input" value={editValues.minimum} onChange={e => setEditValues(v => ({...v, minimum:normalizeNumericInput(e.target.value)}))} /></label>
                      <label className="field-label">قیمت پایه هر کیلو (تومان)<input required type="text" inputMode="decimal" min="1" step="1" className="field-input" value={editValues.price} onChange={e => setEditValues(v => ({...v, price:normalizeNumericInput(e.target.value)}))} /></label>
                      <JalaliDateField label="زمان آماده بودن (شمسی)" value={editValues.ready} onChange={value => setEditValues(v => ({ ...v, ready: value }))} />
                    </div>
                    <fieldset className="grid gap-3 rounded-lg border border-border p-3"><legend className="px-2 font-semibold">قیمت و حداقل سفارش هر بخش فروش</legend>
                      {salesSections.map(section => { const roleAllowsSection = allowedSaleSections(memberRole).includes(section.key); return <div key={section.key} className="grid gap-2 rounded border border-border p-3">
                        <label className="flex items-center gap-2"><input type="checkbox" checked={editTiers[section.key].enabled && roleAllowsSection} disabled={!roleAllowsSection} onChange={e => setEditTiers(v => ({...v, [section.key]: {...v[section.key], enabled:e.target.checked}}))} />{section.label}</label>
                        {editTiers[section.key].enabled && <div className="grid grid-cols-2 gap-2">
                          <label className="field-label">قیمت هر کیلو<input required type="text" inputMode="decimal" min="1" className="field-input" value={editTiers[section.key].price} onChange={e => setEditTiers(v => ({...v, [section.key]: {...v[section.key], price:normalizeNumericInput(e.target.value)}}))} /></label>
                          <label className="field-label">حداقل بسته<input required type="text" inputMode="decimal" min="1" className="field-input" value={editTiers[section.key].minimum} onChange={e => setEditTiers(v => ({...v, [section.key]: {...v[section.key], minimum:normalizeNumericInput(e.target.value)}}))} /></label>
                        </div>}
                      </div>; })}
                    </fieldset>
                    <label className="field-label">توضیحات<textarea className="field-input min-h-20" value={editValues.description} onChange={e => setEditValues(v => ({...v, description:e.target.value}))} /></label>
                    <div className="flex flex-wrap gap-2"><Button type="submit" disabled={!!busyLoadId}>{busyLoadId === load.id ? "در حال ذخیره…" : "ذخیره همه تغییرات"}</Button><Button type="button" variant="outline" disabled={!!busyLoadId} onClick={() => setEditingLoad(null)}>انصراف</Button></div>
                  </form>}
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
              <JalaliDateField label="زمان آماده بودن (شمسی)" value={form.ready} onChange={value => set('ready')(value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <JalaliDateField label="شروع نمایش آگهی (شمسی)" value={form.adStart} min={localIsoDate()} onChange={value => setForm(prev => ({ ...prev, adStart: value, adEnd: prev.adEnd < value ? value : prev.adEnd }))} />
              <JalaliDateField label="پایان نمایش آگهی (شمسی)" value={form.adEnd} min={form.adStart || localIsoDate()} onChange={value => set('adEnd')(value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="field-label">پاسخ‌گویی از ساعت<input required type="time" value={form.responseStart} onChange={e => set('responseStart')(e.target.value)} className="field-input" /></label>
              <label className="field-label">پاسخ‌گویی تا ساعت<input required type="time" value={form.responseEnd} min={form.responseStart} onChange={e => set('responseEnd')(e.target.value)} className="field-input" /></label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <label className="field-label">شهر مبدأ بار<CityPicker value={form.province} onChange={value => set("province")(value)} id="load-province" options={provinces} placeholder="جست‌وجوی استان…" /></label>
              {memberRole === 'supplier' ? <label className="field-label">شهر محل عرضه<CityPicker value={form.city} onChange={value => set("city")(value)} id="load-city" placeholder="جست‌وجوی شهر…" /></label> : <label className="field-label">شهر محل عرضه<input readOnly aria-readonly="true" value={memberCity || 'شهر عضویت ثبت نشده'} className="field-input bg-muted" /><span className="text-xs text-muted-foreground">برای بارفروش، شهر محل عرضه ثابت و مطابق شهر عضویت است.</span></label>}
            </div>
            <div className="grid grid-cols-3 gap-3">
              <label className="field-label">نوع بسته<select required value={form.packageType} onChange={e => set('packageType')(e.target.value)} className="field-input"><option>کارتن</option><option>سبد</option><option>کیسه</option><option>جعبه</option><option>بسته‌بندی فله</option><option>بسته‌بندی اختصاصی</option></select></label>
              <label className="field-label">وزن هر بسته (کیلو)<input required type="text" inputMode="decimal" min="1" step="0.5" dir="ltr" value={form.weight} onChange={e => set('weight')(normalizeNumericInput(e.target.value))} className="field-input text-left" /></label>
              <label className="field-label">موجودی (بسته)<input required type="text" inputMode="decimal" min="1" step="1" dir="ltr" value={form.stock} onChange={e => set('stock')(normalizeNumericInput(e.target.value))} className="field-input text-left" /></label>
            </div>
            <fieldset className="grid gap-3 rounded-lg border border-border p-4">
              <legend className="px-2 font-bold">بخش‌های فروش و قیمت اختصاصی هر بخش</legend>
              <p className="text-xs text-muted-foreground">{memberRole === 'supplier' ? 'تأمین‌کننده فقط در بخش ویژه حرفه‌ای اعلام بار می‌کند.' : 'بارفروش می‌تواند در بخش‌های خرده‌فروشی، عمده‌فروشی و فروش ویژه اعلام بار کند.'} قیمت و حداقل سفارش هر بخش جداگانه ثبت می‌شود.</p>
              {salesSections.map(section => {
                const roleAllowsSection = allowedSaleSections(memberRole).includes(section.key);
                const enabled = saleSectionsEnabled.includes(section.key) && roleAllowsSection;
                return <div key={section.key} className="grid gap-3 rounded-md border border-border p-3">
                  <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={enabled} disabled={!memberRole || !roleAllowsSection} onChange={e => toggleSaleSection(section.key, e.target.checked)} />{section.label}</label>
                  {enabled && <div className="grid grid-cols-2 gap-3">
                    <label className="field-label">قیمت هر کیلو (تومان)<input required type="text" inputMode="decimal" min="10000" step="100" dir="ltr" value={salePrices[section.key]} onChange={e => setSalePrices(prev => ({ ...prev, [section.key]: normalizeNumericInput(e.target.value) }))} className="field-input text-left" placeholder="حداقل ۱۰۰۰۰ تومان" /></label>
                    <label className="field-label">حداقل بسته در این بخش<input required type="text" inputMode="decimal" min="1" max={form.stock || undefined} step="1" dir="ltr" value={saleMinimums[section.key]} onChange={e => setSaleMinimums(prev => ({ ...prev, [section.key]: normalizeNumericInput(e.target.value) }))} className="field-input text-left" /></label>
                  </div>}
                </div>;
              })}
            </fieldset>
            <label className="field-label">عکس‌های بار (حداکثر ۵ عکس، JPG/PNG/WebP تا ۱۰ مگابایت هر عکس)<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e => setPhotoFiles(Array.from(e.target.files ?? []).slice(0, 5))} className="field-input" /><span className="text-xs text-muted-foreground">{photoFiles.length ? `${faNumber(photoFiles.length)} عکس انتخاب شده` : 'انتخاب عکس اختیاری است.'}</span></label>
            <label className="field-label">توضیحات<textarea value={form.description} onChange={e => set('description')(e.target.value)} className="field-input min-h-20 resize-y" placeholder="جزئیات بسته‌بندی، کیفیت، شرایط تحویل…" /></label>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={busy}>{busy ? 'در حال ثبت…' : 'ثبت و انتشار بار'}</Button>
          </form>
        )}
      </div>
    </div></section>
  );
}
