/* eslint-disable @typescript-eslint/no-explicit-any -- Dynamic queries target the audited production Supabase schema; generated client types are stale. */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ChevronDown, Leaf, MapPin, PackageCheck, Search, SlidersHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadCard } from '@/components/load-card';
import { cities, faNumber, loads as sampleLoads, pageHead, qualities, type Load, type Quality } from '@/lib/marketplace';

export const Route = createFileRoute("/requests")({
  head: () => pageHead('درخواست‌های خرید و بارهای فعال', 'جست‌وجو و مشاهده بارهای فعال میوه و تره‌بار بر اساس شهر، دسته‌بندی و درجه کیفیت؛ ثبت سفارش مستقیم از فروشنده.'),
  component: Requests,
});

function Requests() {
  const [liveLoads, setLiveLoads] = useState<Load[]>([]);
  const [loadingLoads, setLoadingLoads] = useState(true);
  const [loadError, setLoadError] = useState('');
  useEffect(() => {
    let active = true;
    async function fetchLoads() {
      const { data, error } = await (supabase as any)
        .from('loads')
        .select('id, name, quantity, city, role, product_type, origin, engine, source_market, price, price_unit, quality, description, ready_date, status, member_id, created_at, min_quantity, unit, seller_type, source_region, sale_type, min_order_quantity, count')
        .eq('status', 'active')
        .order('created_at', { ascending: false });
      if (!active) return;
      if (error) {
        setLoadError('دریافت بارهای واقعی انجام نشد. اتصال دیتابیس یا مجوز مشاهده را بررسی کنید.');
      } else {
        setLiveLoads((data ?? []).map((row: any) => {
          const packageCount = Math.max(0, Number(row.count ?? 0));
          const quantity = Math.max(0, Number(row.quantity ?? 0));
          const weight = packageCount > 0 ? Math.max(1, Math.round(quantity / packageCount)) : 1;
          const product = String(row.product_type || row.name || 'محصول');
          const variety = String(row.engine || row.source_market || '');
          const rawQuality = String(row.quality || '').toLowerCase();
          const qualityMap: Record<string, Quality> = {
            special: 'ویژه', premium: 'ویژه', 'ویژه': 'ویژه',
            standard: 'استاندارد', 'استاندارد': 'استاندارد',
            economical: 'اقتصادی', economy: 'اقتصادی', 'اقتصادی': 'اقتصادی',
            negotiable: 'توافقی', 'توافقی': 'توافقی',
          };
          const quality = qualityMap[rawQuality] ?? 'توافقی';
          const category = /گوجه|پیاز|خیار|سیب‌زمینی|بادمجان|فلفل/.test(product) ? 'صیفی‌جات' : /سبزی|جعفری|گشنیز|شوید|کاهو/.test(product) ? 'سبزیجات' : 'میوه';
          return {
            id: row.id, createdAt: String(row.created_at || ''), product, variety, category, quality,
            city: String(row.city || ''),
            province: String(row.source_region || row.origin || ''),
            weight,
            stock: packageCount || Math.floor(quantity / weight),
            minimum: Math.max(1, Number(row.min_order_quantity ?? 1)),
            price: Number(row.price) || 0,
            ready: row.ready_date ? new Date(row.ready_date).toLocaleDateString('fa-IR') : 'زمان بارگیری هماهنگ شود',
            validity: 'طبق وضعیت بار',
            seller: 'عضو تأییدشدهٔ ترابار',
            sellerType: String(row.seller_type || row.role || 'فروشنده'),
            image: sampleLoads[0].image,
            isSample: false,
          } as Load;
        }));
      }
      setLoadingLoads(false);
    }
    void fetchLoads();
    return () => { active = false; };
  }, []);
  // Demo listings are useful during local design, but must never appear as real marketplace inventory in production.
  const displayLoads = useMemo(() => import.meta.env.DEV ? [...liveLoads, ...sampleLoads] : liveLoads, [liveLoads]);
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('');
  const [quality, setQuality] = useState('');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ city: '', category: '', quality: '', query: '' });
  const [sort, setSort] = useState('newest');
  const normalizedQuery = filters.query.trim().replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/\s/g, '');
  const filtered = displayLoads.filter(load => (!filters.city || load.city === filters.city) && (!filters.category || load.category === filters.category) && (!filters.quality || load.quality === filters.quality) && (!normalizedQuery || `${load.product}${load.variety}`.replace(/\s/g, '').includes(normalizedQuery))).sort((a, b) => sort === 'price' ? a.price - b.price : sort === 'stock' ? b.stock - a.stock : (Date.parse(b.createdAt || '') || Number(b.id) || 0) - (Date.parse(a.createdAt || '') || Number(a.id) || 0));
  function search(event: FormEvent) { event.preventDefault(); setFilters({ city, category, quality, query }); document.getElementById('market-loads')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' }); }
  function reset() { setCity(''); setCategory(''); setQuality(''); setQuery(''); setFilters({ city: '', category: '', quality: '', query: '' }); }
  const active = Object.values(filters).some(Boolean);
  return (
    <>
      <section aria-label="جست‌وجوی بازار" className="relative border-b border-border bg-background"><div className="site-container py-6">
        <div className="mb-5"><div className="mb-2 flex items-center gap-2 text-xs font-medium text-primary"><span className="size-2 rounded-full bg-primary" />درخواست‌های خرید</div><h1 className="text-2xl font-extrabold sm:text-3xl">بارهای فعال <span className="text-primary">ترابار</span></h1><p className="mt-3 text-xs leading-6 text-muted-foreground sm:text-sm">بار موردنیاز خود را بر اساس شهر، دسته‌بندی و کیفیت پیدا کنید و مستقیم سفارش دهید.</p></div>
        <form onSubmit={search} className="search-grid grid gap-3 lg:grid-cols-[1.25fr_1fr_1fr_1fr_auto]">
          <label className="search-field"><Search className="size-5 shrink-0 text-primary" /><div className="min-w-0 flex-1"><span className="block text-[11px] text-muted-foreground">چه باری نیاز دارید؟</span><input aria-label="جست‌وجوی محصول" placeholder="نام محصول یا رقم…" value={query} onChange={e => setQuery(e.target.value)} className="w-full min-w-0 bg-transparent py-1 text-sm outline-none" /></div></label>
          <label className="search-field"><MapPin className="size-5 shrink-0 text-primary" /><div className="min-w-0 flex-1"><span className="block text-[11px] text-muted-foreground">شهر مبدأ بار</span><select aria-label="شهر مبدأ بار" value={city} onChange={e => setCity(e.target.value)} className="search-select"><option value="">همه شهرها</option>{cities.map(item => <option key={item}>{item}</option>)}</select></div><ChevronDown className="size-3.5 shrink-0 text-muted-foreground" /></label>
          <label className="search-field"><Leaf className="size-5 shrink-0 text-primary" /><div className="min-w-0 flex-1"><span className="block text-[11px] text-muted-foreground">دسته‌بندی محصول</span><select aria-label="دسته‌بندی محصول" value={category} onChange={e => setCategory(e.target.value)} className="search-select"><option value="">همه محصولات</option><option>میوه</option><option>صیفی‌جات</option><option>سبزیجات</option></select></div><ChevronDown className="size-3.5 shrink-0 text-muted-foreground" /></label>
          <label className="search-field"><SlidersHorizontal className="size-5 shrink-0 text-primary" /><div className="min-w-0 flex-1"><span className="block text-[11px] text-muted-foreground">درجه کیفیت</span><select aria-label="درجه کیفیت" value={quality} onChange={e => setQuality(e.target.value)} className="search-select"><option value="">همه درجه‌ها</option>{qualities.map(item => <option key={item}>{item}</option>)}</select></div><ChevronDown className="size-3.5 shrink-0 text-muted-foreground" /></label>
          <Button type="submit" className="h-[62px] px-7"><Search />جست‌وجوی بار</Button>
        </form>
        <div className="mt-4 flex flex-wrap items-center gap-1 text-xs text-muted-foreground"><span className="ml-1">پرجست‌وجو:</span>{['پرتقال', 'سیب', 'گوجه‌فرنگی', 'پیاز'].map(product => <Button key={product} variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setQuery(product); setCity(''); setCategory(''); setQuality(''); setFilters({ city: '', category: '', quality: '', query: product }); }}>{product}</Button>)}</div>
      </div></section>
      <section id="market-loads" className="scroll-mt-5 bg-market-surface py-10 sm:py-12"><div className="site-container">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border pb-4"><div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-muted-foreground"><span aria-live="polite">{loadingLoads ? 'در حال دریافت بارها…' : `${faNumber(filtered.length)} بار`}</span>{active && <Button variant="ghost" className="h-7 px-2 text-xs" onClick={reset}><X className="size-3" />حذف فیلترها</Button>}</div><label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground"><SlidersHorizontal className="size-3.5" /><select aria-label="مرتب‌سازی بارها" className="max-w-36 bg-transparent text-foreground outline-none" value={sort} onChange={e => setSort(e.target.value)}><option value="newest">تازه‌ترین بارها</option><option value="price">کمترین قیمت</option><option value="stock">بیشترین موجودی</option></select></label></div>
        {filtered.length ? <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{filtered.map(load => <LoadCard key={`${load.isSample ? 'sample' : 'live'}-${load.id}`} load={load} />)}</div> : <div className="py-16 text-center"><Search className="mx-auto mb-4 size-10 text-muted-foreground" /><h3 className="text-lg font-bold">باری با این مشخصات پیدا نشد</h3><p className="mt-3 text-sm text-muted-foreground">در حال حاضر بار فعالی با این مشخصات پیدا نشد.</p><Button variant="outline" className="mt-5" onClick={reset}>نمایش همه بارها</Button></div>}
        <div className="mt-7 flex items-center justify-center gap-2 text-xs text-muted-foreground"><PackageCheck className="size-4 text-primary" />{liveLoads.length ? 'بارهای ثبت‌شده از دیتابیس نمایش داده می‌شوند؛ کارت‌های نمونه جداگانه مشخص شده‌اند.' : 'تا زمان ثبت بار واقعی، کارت‌های نمایشی نمونه هستند.'}</div>
      </div></section>
    </>
  );
}
