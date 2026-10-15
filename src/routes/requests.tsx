/* eslint-disable @typescript-eslint/no-explicit-any -- Dynamic queries target the audited production Supabase schema; generated client types are stale. */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CalendarDays, ChevronDown, Leaf, MapPin, PackageCheck, Plus, Search, Send, SlidersHorizontal, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadCard } from "@/components/load-card";
import { cities, faNumber, loads as sampleLoads, pageHead, qualities, type Load, type Quality } from "@/lib/marketplace";

export const Route = createFileRoute("/requests")({
  head: () => pageHead("درخواست خرید", "جست‌وجوی بارهای مجاز و ثبت درخواست سفارش چندمحصولی در ترابار."),
  component: Requests,
});

type PurchaseMode = "retail" | "wholesale" | "special" | "professional";
type DirectOrderItem = { product: string; variety: string; quantity: string; unit: "kg" | "package" | "ton"; quality: string };
const purchaseModes: { value: PurchaseMode; label: string; description: string; saleTypes: string[] }[] = [
  { value: "retail", label: "خرده", description: "خرید در سطح خرده طبق شرایط آگهی", saleTypes: ["regular", "retail"] },
  { value: "wholesale", label: "عمده", description: "خرید عمده بر اساس حداقل سفارش فروشنده", saleTypes: ["wholesale", "regular"] },
  { value: "special", label: "ویژه", description: "دسترسی ویژه طبق نقش و شهرهای مجاز", saleTypes: ["special"] },
  { value: "professional", label: "ویژه حرفه‌ای", description: "درخواست حرفه‌ای با امکان بررسی مقدار و شرایط متفاوت", saleTypes: ["professional", "pro"] },
];
const emptyItem = (): DirectOrderItem => ({ product: "", variety: "", quantity: "", unit: "kg", quality: "توافقی" });

function Requests() {
  const [liveLoads, setLiveLoads] = useState<Load[]>([]);
  const [loadingLoads, setLoadingLoads] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [purchaseMode, setPurchaseMode] = useState<PurchaseMode>("retail");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [quality, setQuality] = useState("");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ city: "", category: "", quality: "", query: "" });
  const [sort, setSort] = useState("newest");
  const [orderItems, setOrderItems] = useState<DirectOrderItem[]>([emptyItem()]);
  const [neededBy, setNeededBy] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [orderBusy, setOrderBusy] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [orderSaved, setOrderSaved] = useState(false);

  useEffect(() => {
    let active = true;
    async function fetchLoads() {
      const { data, error } = await (supabase as any)
        .from("loads")
        .select("id, name, quantity, city, role, product_type, origin, engine, source_market, price, price_unit, quality, description, ready_date, status, member_id, created_at, min_quantity, unit, seller_type, source_region, sale_type, min_order_quantity, count")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (!active) return;
      if (error) {
        setLoadError("دریافت بارهای واقعی انجام نشد. اتصال دیتابیس یا مجوز مشاهده را بررسی کنید.");
      } else {
        setLiveLoads((data ?? []).map((row: any) => {
          const packageCount = Math.max(0, Number(row.count ?? 0));
          const quantity = Math.max(0, Number(row.quantity ?? 0));
          const weight = packageCount > 0 ? Math.max(1, Math.round(quantity / packageCount)) : 1;
          const product = String(row.product_type || row.name || "محصول");
          const rawQuality = String(row.quality || "").toLowerCase();
          const qualityMap: Record<string, Quality> = {
            special: "ویژه", premium: "ویژه", "ویژه": "ویژه",
            standard: "استاندارد", "استاندارد": "استاندارد",
            economical: "اقتصادی", economy: "اقتصادی", "اقتصادی": "اقتصادی",
            negotiable: "توافقی", "توافقی": "توافقی",
          };
          const category = /گوجه|پیاز|خیار|سیب‌زمینی|بادمجان|فلفل/.test(product) ? "صیفی‌جات" : /سبزی|جعفری|گشنیز|شوید|کاهو/.test(product) ? "سبزیجات" : "میوه";
          return {
            id: row.id, createdAt: String(row.created_at || ""), product,
            variety: String(row.engine || row.source_market || ""), category,
            quality: qualityMap[rawQuality] ?? "توافقی",
            city: String(row.city || ""), province: String(row.source_region || row.origin || ""),
            weight, stock: packageCount || Math.floor(quantity / weight),
            minimum: Math.max(1, Number(row.min_order_quantity ?? 1)),
            price: Number(row.price) || 0,
            ready: row.ready_date ? new Date(row.ready_date).toLocaleDateString("fa-IR") : "زمان بارگیری هماهنگ شود",
            validity: "طبق وضعیت بار", seller: "عضو تأییدشدهٔ ترابار",
            sellerType: String(row.seller_type || row.role || "فروشنده"),
            image: sampleLoads[0].image, isSample: false,
            saleType: String(row.sale_type || "regular"),
          } as Load & { saleType: string };
        }));
      }
      setLoadingLoads(false);
    }
    void fetchLoads();
    return () => { active = false; };
  }, []);

  const displayLoads = useMemo(
    () => import.meta.env.DEV ? [...liveLoads, ...sampleLoads] : liveLoads,
    [liveLoads],
  );
  const normalizedQuery = filters.query.trim().replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/\s/g, "");
  const selectedMode = purchaseModes.find(item => item.value === purchaseMode)!;
  const filtered = displayLoads
    .filter(load => {
      const saleType = String((load as Load & { saleType?: string }).saleType || "regular");
      return selectedMode.saleTypes.includes(saleType)
        && (!filters.city || load.city === filters.city)
        && (!filters.category || load.category === filters.category)
        && (!filters.quality || load.quality === filters.quality)
        && (!normalizedQuery || `${load.product}${load.variety}`.replace(/\s/g, "").includes(normalizedQuery));
    })
    .sort((a, b) => sort === "price" ? a.price - b.price : sort === "stock" ? b.stock - a.stock : (Date.parse(b.createdAt || "") || Number(b.id) || 0) - (Date.parse(a.createdAt || "") || Number(a.id) || 0));

  function search(event: FormEvent) {
    event.preventDefault();
    setFilters({ city, category, quality, query });
    document.getElementById("market-loads")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
  }
  function reset() {
    setCity(""); setCategory(""); setQuality(""); setQuery("");
    setFilters({ city: "", category: "", quality: "", query: "" });
  }
  function updateItem(index: number, key: keyof DirectOrderItem, value: string) {
    setOrderItems(items => items.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
  }

  async function submitDirectOrder(event: FormEvent) {
    event.preventDefault();
    setOrderBusy(true);
    setOrderError("");
    setOrderSaved(false);
    const invalid = orderItems.some(item => !item.product.trim() || !Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0);
    if (invalid) {
      setOrderError("برای هر ردیف، نام محصول و مقدار مثبت وارد کنید.");
      setOrderBusy(false);
      return;
    }

    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setOrderError("برای ثبت درخواست سفارش ابتدا وارد حساب خود شوید.");
      setOrderBusy(false);
      return;
    }
    const { data: member, error: memberError } = await (supabase as any)
      .from("members").select("id, city").eq("auth_user_id", authData.user.id).maybeSingle();
    if (memberError || !member) {
      setOrderError("پروفایل عضو پیدا نشد؛ ابتدا ثبت‌نام را کامل کنید.");
      setOrderBusy(false);
      return;
    }

    const rows = orderItems.map(item => ({
      buyer_member_id: member.id,
      product_type: item.product.trim(),
      quantity: Number(item.quantity),
      quantity_unit: item.unit,
      destination_city: member.city || null,
      quality_requirements: [item.variety.trim(), item.quality].filter(Boolean).join(" — "),
      needed_by: neededBy || null,
      notes: orderNotes.trim() || null,
      status: "new",
      load_id: null,
    }));
    const { error } = await (supabase as any).from("purchase_requests").insert(rows);
    if (error) {
      setOrderError("درخواست ثبت نشد. ممکن است دسترسی ثبت درخواست هنوز در Supabase فعال نشده باشد؛ هیچ موفقیتی ثبت نشده است.");
    } else {
      setOrderSaved(true);
      setOrderItems([emptyItem()]);
      setNeededBy("");
      setOrderNotes("");
    }
    setOrderBusy(false);
  }

  return (
    <>
      <section aria-label="جست‌وجوی بازار" className="relative border-b border-border bg-background">
        <div className="site-container py-6">
          <div className="mb-5">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-primary"><span className="size-2 rounded-full bg-primary" />درخواست خرید</div>
            <h1 className="text-2xl font-extrabold sm:text-3xl">بارهای فعال <span className="text-primary">ترابار</span></h1>
            <p className="mt-3 text-xs leading-6 text-muted-foreground sm:text-sm">نوع خرید را انتخاب کنید، سپس بارهای مجاز را بر اساس شهر، محصول و کیفیت پیدا کنید.</p>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {purchaseModes.map(mode => (
              <button key={mode.value} type="button" onClick={() => setPurchaseMode(mode.value)} aria-pressed={purchaseMode === mode.value}
                className={`rounded-lg border p-3 text-right transition-colors ${purchaseMode === mode.value ? "border-primary bg-accent" : "border-border bg-card hover:border-primary/50"}`}>
                <strong className="block text-sm">{mode.label}</strong>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">{mode.description}</span>
              </button>
            ))}
          </div>

          <form onSubmit={search} className="search-grid grid gap-3 lg:grid-cols-[1.25fr_1fr_1fr_1fr_auto]">
            <label className="search-field"><Search className="size-5 shrink-0 text-primary" /><div className="min-w-0 flex-1"><span className="block text-[11px] text-muted-foreground">چه باری نیاز دارید؟</span><input aria-label="جست‌وجوی محصول" placeholder="نام محصول یا رقم…" value={query} onChange={e => setQuery(e.target.value)} className="w-full min-w-0 bg-transparent py-1 text-sm outline-none" /></div></label>
            <label className="search-field"><MapPin className="size-5 shrink-0 text-primary" /><div className="min-w-0 flex-1"><span className="block text-[11px] text-muted-foreground">شهر مبدأ بار</span><select aria-label="شهر مبدأ بار" value={city} onChange={e => setCity(e.target.value)} className="search-select"><option value="">همه شهرها</option>{cities.map(item => <option key={item}>{item}</option>)}</select></div><ChevronDown className="size-3.5 shrink-0 text-muted-foreground" /></label>
            <label className="search-field"><Leaf className="size-5 shrink-0 text-primary" /><div className="min-w-0 flex-1"><span className="block text-[11px] text-muted-foreground">دسته‌بندی محصول</span><select aria-label="دسته‌بندی محصول" value={category} onChange={e => setCategory(e.target.value)} className="search-select"><option value="">همه محصولات</option><option>میوه</option><option>صیفی‌جات</option><option>سبزیجات</option></select></div><ChevronDown className="size-3.5 shrink-0 text-muted-foreground" /></label>
            <label className="search-field"><SlidersHorizontal className="size-5 shrink-0 text-primary" /><div className="min-w-0 flex-1"><span className="block text-[11px] text-muted-foreground">درجه کیفیت</span><select aria-label="درجه کیفیت" value={quality} onChange={e => setQuality(e.target.value)} className="search-select"><option value="">همه درجه‌ها</option>{qualities.map(item => <option key={item}>{item}</option>)}</select></div><ChevronDown className="size-3.5 shrink-0 text-muted-foreground" /></label>
            <Button type="submit" className="h-[62px] px-7"><Search />جست‌وجوی بار</Button>
          </form>
          <div className="mt-4 flex flex-wrap items-center gap-1 text-xs text-muted-foreground"><span className="ml-1">پرجست‌وجو:</span>{["پرتقال", "سیب", "گوجه‌فرنگی", "پیاز"].map(product => <Button key={product} variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setQuery(product); setCity(""); setCategory(""); setQuality(""); setFilters({ city: "", category: "", quality: "", query: product }); }}>{product}</Button>)}</div>
        </div>
      </section>

      <section id="market-loads" className="scroll-mt-5 bg-market-surface py-10 sm:py-12">
        <div className="site-container">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border pb-4">
            <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-muted-foreground"><span aria-live="polite">{loadingLoads ? "در حال دریافت بارها…" : `${faNumber(filtered.length)} بار`}</span>{activeFilters(filters) && <Button variant="ghost" className="h-7 px-2 text-xs" onClick={reset}><X className="size-3" />حذف فیلترها</Button>}</div>
            <label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground"><SlidersHorizontal className="size-3.5" /><select aria-label="مرتب‌سازی بارها" className="max-w-36 bg-transparent text-foreground outline-none" value={sort} onChange={e => setSort(e.target.value)}><option value="newest">تازه‌ترین بارها</option><option value="price">کمترین قیمت</option><option value="stock">بیشترین موجودی</option></select></label>
          </div>
          {loadError && <p role="alert" className="mt-4 text-sm text-destructive">{loadError}</p>}
          {filtered.length ? <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">{filtered.map(load => <LoadCard key={`${load.isSample ? "sample" : "live"}-${load.id}`} load={load} />)}</div> : <div className="py-16 text-center"><Search className="mx-auto mb-4 size-10 text-muted-foreground" /><h3 className="text-lg font-bold">باری با این مشخصات پیدا نشد</h3><p className="mt-3 text-sm text-muted-foreground">در این نوع خرید، در حال حاضر بار فعالی با این مشخصات پیدا نشد.</p><Button variant="outline" className="mt-5" onClick={reset}>حذف فیلترها</Button></div>}
          <div className="mt-7 flex items-center justify-center gap-2 text-xs text-muted-foreground"><PackageCheck className="size-4 text-primary" />{liveLoads.length ? "بارهای ثبت‌شده از دیتابیس نمایش داده می‌شوند؛ کارت‌های نمونه در محیط توسعه مشخص‌اند." : "تا زمان ثبت بار واقعی، کارت‌های نمایشی نمونه هستند."}</div>
        </div>
      </section>

      <section id="direct-order" className="border-t border-border bg-background py-12 sm:py-16">
        <div className="site-container max-w-4xl">
          <div className="mb-6">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-primary"><Send className="size-4" />پیشنهادات و سفارش مستقیم</div>
            <h2 className="text-2xl font-extrabold">درخواست تأمین چندمحصولی</h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">چند محصول را در یک مرحله معرفی کنید. درخواست بر اساس شهر حساب شما برای بررسی مدیریت ترابار ارسال می‌شود؛ مبدأ و مقصد اجباری نیست.</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5 sm:p-7">
            {orderSaved ? <div className="py-8 text-center"><PackageCheck className="mx-auto mb-3 size-12 text-primary" /><h3 className="font-bold">درخواست سفارش ثبت شد</h3><p className="mt-2 text-sm text-muted-foreground">وضعیت درخواست را پس از تکمیل اتصال بخش پیگیری سفارش‌ها مشاهده می‌کنید.</p><Button className="mt-5" onClick={() => setOrderSaved(false)}>ثبت درخواست دیگر</Button></div> : (
              <form onSubmit={submitDirectOrder} className="grid gap-5">
                {orderItems.map((item, index) => (
                  <fieldset key={index} className="grid gap-3 rounded-lg border border-border p-4">
                    <div className="flex items-center justify-between"><legend className="font-bold">محصول {faNumber(index + 1)}</legend>{orderItems.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => setOrderItems(items => items.filter((_, i) => i !== index))}><Trash2 className="size-4" />حذف</Button>}</div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="field-label">نام محصول<input required value={item.product} onChange={e => updateItem(index, "product", e.target.value)} className="field-input" placeholder="مثلاً سیب‌زمینی" /></label>
                      <label className="field-label">رقم / مشخصات<input value={item.variety} onChange={e => updateItem(index, "variety", e.target.value)} className="field-input" placeholder="نوع یا مشخصات دلخواه" /></label>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <label className="field-label">مقدار<input required type="number" min="0.01" step="any" dir="ltr" value={item.quantity} onChange={e => updateItem(index, "quantity", e.target.value)} className="field-input text-left" /></label>
                      <label className="field-label">واحد<select className="field-input" value={item.unit} onChange={e => updateItem(index, "unit", e.target.value)}><option value="kg">کیلوگرم</option><option value="package">بسته</option><option value="ton">تن</option></select></label>
                      <label className="field-label">کیفیت<select className="field-input" value={item.quality} onChange={e => updateItem(index, "quality", e.target.value)}>{qualities.map(q => <option key={q}>{q}</option>)}</select></label>
                    </div>
                  </fieldset>
                ))}
                <Button type="button" variant="outline" onClick={() => setOrderItems(items => [...items, emptyItem()])}><Plus className="size-4" />افزودن محصول دیگر</Button>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="field-label"><span className="flex items-center gap-2"><CalendarDays className="size-4" />تاریخ موردنیاز</span><input type="date" min={new Date().toISOString().slice(0, 10)} value={neededBy} onChange={e => setNeededBy(e.target.value)} className="field-input" /></label>
                  <label className="field-label">توضیحات تکمیلی (اختیاری)<input value={orderNotes} onChange={e => setOrderNotes(e.target.value)} className="field-input" placeholder="نکات سفارش" /></label>
                </div>
                {orderError && <p role="alert" className="text-sm text-destructive">{orderError}</p>}
                <Button type="submit" disabled={orderBusy}>{orderBusy ? "در حال ثبت درخواست…" : "ارسال درخواست برای بررسی مدیریت"}<Send className="mr-2 size-4" /></Button>
                <p className="text-xs leading-6 text-muted-foreground">برای ارسال باید وارد حساب شوید. اطلاعات تماس طرفین در آگهی نمایش داده نمی‌شود.</p>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function activeFilters(filters: { city: string; category: string; quality: string; query: string }) {
  return Object.values(filters).some(Boolean);
}
