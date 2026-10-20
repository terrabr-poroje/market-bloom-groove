/* eslint-disable @typescript-eslint/no-explicit-any -- Dynamic queries target the audited production Supabase schema; generated client types are stale. */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { CalendarDays, ChevronDown, Leaf, MapPin, PackageCheck, Plus, Search, Send, SlidersHorizontal, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadCard } from "@/components/load-card";
import { cities, faNumber, loads as sampleLoads, pageHead, qualities, type Load, type Quality } from "@/lib/marketplace";

export const Route = createFileRoute("/requests")({
  head: () => pageHead("درخواست خرید", "جست‌وجوی بارهای مجاز و ثبت درخواست سفارش چندمحصولی در ترابار.", "/requests"),
  component: Requests,
});

type PurchaseMode = "retail" | "wholesale" | "special" | "professional";
type DirectOrderItem = { product: string; variety: string; quantity: string; unit: "kg" | "package" | "ton"; quality: string };
type MyDirectRequest = { id: string; product_type: string; quantity: number; quantity_unit: string; destination_city: string | null; quality_requirements: string | null; needed_by: string | null; notes: string | null; status: string; created_at: string };
type MyOrder = { id: string; load_id: string; quantity: number; unit: string; total_price: number | null; delivery_type: string | null; delivery_address: string | null; status: string; payment_status: string; paid_at: string | null; delivery_status: string; shipped_at: string | null; delivered_at: string | null; notes: string | null; created_at: string };
const orderStatusLabels: Record<string, string> = { pending: 'در انتظار تأیید فروشنده', accepted: 'تأیید فروشنده؛ در انتظار پرداخت', rejected: 'رد شده توسط فروشنده', paid: 'پرداخت‌شده', shipped: 'بار ارسال شده', bar_sent: 'بار ارسال شده', delivered: 'تحویل گرفته شده', received: 'تحویل گرفته شده', completed: 'تکمیل‌شده', cancelled: 'لغوشده' };
const directStatusLabels: Record<string, string> = { new: "ثبت‌شده", in_review: "در حال بررسی", sourcing: "در حال تأمین", offer_ready: "پیشنهاد تأمین آماده", rejected: "ردشده", cancelled: "لغوشده", completed: "تکمیل‌شده" };
const paymentStatusLabels: Record<string, string> = { unpaid: "پرداخت‌نشده", pending: "در انتظار تأیید پرداخت", paid: "پرداخت تأییدشده", failed: "پرداخت ناموفق", refunded: "بازپرداخت‌شده" };
const deliveryStatusLabels: Record<string, string> = { awaiting_payment: "در انتظار پرداخت", awaiting_dispatch: "آماده ارسال", shipped: "بار ارسال شده", delivered: "تحویل گرفته شده", disputed: "در حال بررسی اختلاف" };
const purchaseModes: { value: PurchaseMode; label: string; description: string; saleTypes: string[] }[] = [
  { value: "retail", label: "خرده", description: "خرید در سطح خرده طبق شرایط آگهی", saleTypes: ["regular", "retail"] },
  { value: "wholesale", label: "عمده", description: "خرید عمده بر اساس حداقل سفارش فروشنده", saleTypes: ["wholesale", "regular"] },
  { value: "special", label: "ویژه", description: "دسترسی ویژه طبق نقش و شهرهای مجاز", saleTypes: ["special"] },
  { value: "professional", label: "ویژه حرفه‌ای", description: "فقط برای تأمین‌کننده و بارفروش؛ خرید از همه استان‌ها", saleTypes: ["professional", "pro"] },
];
const emptyItem = (): DirectOrderItem => ({ product: "", variety: "", quantity: "", unit: "kg", quality: "توافقی" });
const canUseProfessionalRole = (roles: string[]) => roles.some(role => ["supplier", "bar_seller", "seller"].includes(role));

function Requests() {
  const { user } = useAuth();
  const [profileCity, setProfileCity] = useState("");
  const [approvedRoleCodes, setApprovedRoleCodes] = useState<string[]>([]);
  const [allowedCities, setAllowedCities] = useState<string[]>([]);
  const [cityAccess, setCityAccess] = useState<"own" | "nearby" | "all" | "assigned" | "unavailable">("unavailable");
  const [cityAccessReady, setCityAccessReady] = useState(false);
  const [myDirectRequests, setMyDirectRequests] = useState<MyDirectRequest[]>([]);
  const [myOrders, setMyOrders] = useState<MyOrder[]>([]);
  const [loadingMyRequests, setLoadingMyRequests] = useState(false);
  const [myRequestError, setMyRequestError] = useState("");
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
    if (typeof window !== "undefined" && window.location.hash === "#professional" && canUseProfessionalRole(approvedRoleCodes)) {
      setPurchaseMode("professional");
    }
  }, [approvedRoleCodes.join("|")]);

  useEffect(() => {
    let active = true;
    async function resolveCityAccess() {
      setCityAccessReady(false);
      if (!user) { setProfileCity(""); setApprovedRoleCodes([]); setAllowedCities([]); setCityAccess("unavailable"); setCityAccessReady(true); return; }
      const { data: member, error } = await (supabase as any).from("members").select("city").eq("auth_user_id", user.id).maybeSingle();
      if (!active) return;
      if (error || !member?.city) { setProfileCity(""); setApprovedRoleCodes([]); setAllowedCities([]); setCityAccess("unavailable"); setCityAccessReady(true); return; }
      const ownCity = String(member.city).trim();
      setProfileCity(ownCity);
      const [{ data: roleRows }, { data: adminRows }] = await Promise.all([
        (supabase as any).from("member_roles").select("role_code, approval_status, members!inner(auth_user_id)").eq("members.auth_user_id", user.id),
        (supabase as any).from("admin_users").select("id, admin_role, city").eq("auth_user_id", user.id).eq("is_active", true),
      ]);
      if (!active) return;
      const roles = (roleRows ?? []).map((r: any) => String(r.role_code).toLowerCase());
      setApprovedRoleCodes(roles);
      const adminRoles = (adminRows ?? []).map((r: any) => String(r.admin_role).toLowerCase());
      if (!roles.some((role: string) => ["supplier", "bar_seller", "seller"].includes(role))) setPurchaseMode("retail");
      if (adminRoles.some((r: string) => ["main_admin", "main-administrator", "admin"].includes(r))) {
        setAllowedCities([]); setCityAccess("all");
      } else if (adminRoles.includes("city_manager")) {
        const ids = (adminRows ?? []).filter((r: any) => String(r.admin_role).toLowerCase() === "city_manager").map((r: any) => r.id);
        const { data: assigned } = await (supabase as any).from("admin_user_cities").select("city_name, admin_user_id").in("admin_user_id", ids);
        if (!active) return;
        setAllowedCities([...new Set([...(assigned ?? []).map((r: any) => String(r.city_name)), ...((adminRows ?? []).map((r: any) => r.city).filter(Boolean) as string[])])]);
        setCityAccess("assigned");
      } else if (roles.some((role: string) => ["supplier", "bar_seller", "seller"].includes(role))) {
        // Registered suppliers and bar sellers may browse professional inventory across all cities; approval is required only for posting loads.
        setAllowedCities([]); setCityAccess("all");
      } else if (roles.some((role: string) => ["special_buyer", "buyer_special"].includes(role))) {
        // Special buyers can browse their city plus explicitly enabled neighboring cities.
        const [{ data: outgoing, error: outgoingError }, { data: incoming, error: incomingError }] = await Promise.all([
          (supabase as any).from("city_neighbors").select("neighbor_city_name").eq("city_name", ownCity).eq("is_enabled", true),
          (supabase as any).from("city_neighbors").select("city_name").eq("neighbor_city_name", ownCity).eq("is_enabled", true),
        ]);
        if (!active) return;
        if (outgoingError || incomingError) {
          setAllowedCities([ownCity]); setCityAccess("own");
        } else {
          const neighbors = [
            ...(outgoing ?? []).map((row: any) => String(row.neighbor_city_name)),
            ...(incoming ?? []).map((row: any) => String(row.city_name)),
          ];
          setAllowedCities([...new Set([ownCity, ...neighbors])]); setCityAccess("nearby");
        }
      } else {
        // Ordinary buyers are limited to their registered city.
        setAllowedCities([ownCity]); setCityAccess("own");
      }
      setCityAccessReady(true);
    }
    void resolveCityAccess();
    return () => { active = false; };
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    async function recordSearchVisit() {
      const { data: member } = await (supabase as any).from("members").select("id").eq("auth_user_id", user!.id).maybeSingle();
      if (!active) return;
      const storageKey = `terrabar:visit:/requests:${user!.id}`;
      const now = Date.now();
      const previous = Number(sessionStorage.getItem(storageKey) || 0);
      if (previous && now - previous < 30 * 60 * 1000) return;
      const { error } = await (supabase as any).from("site_visits").insert({ user_id: user!.id, member_id: member?.id ?? null, route: "/requests" });
      if (!error && active) sessionStorage.setItem(storageKey, String(now));
    }
    void recordSearchVisit();
    return () => { active = false; };
  }, [user?.id]);

  useEffect(() => {
    let active = true;
    async function fetchLoads() {
      if (!cityAccessReady) return;
      if (!user) { setLoadingLoads(false); return; }
      const { data, error } = await (supabase as any)
        .from("loads")
        .select("id, name, quantity, city, role, product_type, origin, engine, source_market, price, price_unit, quality, description, ready_date, status, member_id, created_at, min_quantity, unit, seller_type, source_region, sale_type, min_order_quantity, count, package_type, package_weight")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (!active) return;
      if (error) {
        setLoadError("دریافت بارهای واقعی انجام نشد. اتصال دیتابیس یا مجوز مشاهده را بررسی کنید.");
      } else {
        const loadIds = (data ?? []).map((row: any) => row.id);
        const { data: tiers } = loadIds.length ? await (supabase as any).from("load_price_tiers").select("load_id, sale_type, unit_price, minimum_packages").in("load_id", loadIds) : { data: [] };
        if (!active) return;
        setLiveLoads((data ?? []).map((row: any) => {
          const packageCount = Math.max(0, Number(row.count ?? 0));
          const quantity = Math.max(0, Number(row.quantity ?? 0));
          const weight = Number(row.package_weight) > 0 ? Number(row.package_weight) : packageCount > 0 ? Math.max(1, Math.round(quantity / packageCount)) : 1;
          const product = String(row.product_type || row.name || "محصول");
          const rawQuality = String(row.quality || "").toLowerCase();
          const qualityMap: Record<string, Quality> = {
            special: "ویژه", premium: "ویژه", "ویژه": "ویژه",
            standard: "استاندارد", "استاندارد": "استاندارد",
            economical: "اقتصادی", economy: "اقتصادی", "اقتصادی": "اقتصادی",
            negotiable: "توافقی", "توافقی": "توافقی",
          };
          const category = /گوجه|پیاز|خیار|سیب‌زمینی|بادمجان|فلفل/.test(product) ? "صیفی‌جات" : /سبزی|جعفری|گشنیز|شوید|کاهو/.test(product) ? "سبزیجات" : "میوه";
          const rowTiers = (tiers ?? []).filter((tier: any) => String(tier.load_id) === String(row.id));
          const legacyType = String(row.sale_type || "regular");
          const saleOptions = rowTiers.length ? rowTiers.map((tier: any) => {
            const key = String(tier.sale_type);
            const labels: Record<string, string> = { retail: "خرده‌فروشی", wholesale: "عمده‌فروشی", special: "فروش ویژه", professional: "ویژه حرفه‌ای", regular: "فروش عادی", pro: "ویژه حرفه‌ای" };
            return { saleType: key, label: labels[key] || key, price: Number(tier.unit_price), minimum: Math.max(1, Number(tier.minimum_packages ?? 1)) };
          }) : [{ saleType: legacyType, label: "قیمت پایه", price: Number(row.price) || 0, minimum: Math.max(1, Number(row.min_order_quantity ?? 1)) }];
          return {
            id: row.id, memberId: String(row.member_id || ""), saleType: legacyType, saleOptions, packageType: String(row.package_type || "کارتن"), createdAt: String(row.created_at || ""), product,
            variety: String(row.engine || row.source_market || ""), category,
            quality: qualityMap[rawQuality] ?? "توافقی",
            city: String(row.city || ""), province: String(row.source_region || row.origin || ""),
            weight, stock: packageCount || Math.floor(quantity / weight),
            minimum: Math.max(1, Number(row.min_order_quantity ?? 1)),
            price: Number(row.price) || 0,
            ready: row.ready_date ? new Date(row.ready_date).toLocaleDateString("fa-IR") : "زمان بارگیری هماهنگ شود",
            validity: "طبق وضعیت بار", seller: "عضو تأییدشدهٔ ترابار",
            sellerType: String(row.seller_type || row.role || "فروشنده"),
            image: sampleLoads[0]?.image ?? "", isSample: false,
          } as Load;
        }));
      }
      setLoadingLoads(false);
    }
    void fetchLoads();
    return () => { active = false; };
  }, [cityAccessReady, user?.id]);

  useEffect(() => {
    let active = true;
    async function fetchMyDirectRequests() {
      if (!user) return;
      const { data: member, error: memberError } = await (supabase as any)
        .from("members").select("id").eq("auth_user_id", user.id).maybeSingle();
      if (!active) return;
      if (memberError || !member) {
        setMyRequestError("پروفایل خریدار پیدا نشد؛ ابتدا ثبت‌نام را کامل کنید.");
        return;
      }
      setLoadingMyRequests(true);
      const [{ data, error }, { data: ordersData, error: ordersError }] = await Promise.all([
        (supabase as any).from("purchase_requests")
          .select("id, product_type, quantity, quantity_unit, destination_city, quality_requirements, needed_by, notes, status, created_at")
          .eq("buyer_member_id", member.id).is("load_id", null).order("created_at", { ascending: false }),
        (supabase as any).from("orders")
          .select("id, load_id, quantity, unit, total_price, delivery_type, delivery_address, status, payment_status, paid_at, delivery_status, shipped_at, delivered_at, notes, created_at")
          .eq("buyer_member_id", member.id).order("created_at", { ascending: false }),
      ]);
      if (!active) return;
      if (error) setMyRequestError("پیگیری درخواست سفارش ممکن نیست؛ سیاست‌های خواندن درخواست باید در Supabase فعال باشد.");
      else setMyDirectRequests((data ?? []) as MyDirectRequest[]);
      if (ordersError) setMyRequestError("فهرست خریدهای شما دریافت نشد؛ ممکن است دسترسی سفارش هنوز فعال نشده باشد.");
      else setMyOrders((ordersData ?? []) as MyOrder[]);
      setLoadingMyRequests(false);
    }
    void fetchMyDirectRequests();
    return () => { active = false; };
  }, [user?.id]);

  const displayLoads = useMemo(
    () => import.meta.env.DEV ? [...liveLoads, ...sampleLoads] : liveLoads,
    [liveLoads],
  );
  const normalizedQuery = filters.query.trim().replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/\s/g, "");
  const canUseProfessional = approvedRoleCodes.some(role => ["supplier", "bar_seller", "seller"].includes(role));
  const canBuySupplierProfessional = approvedRoleCodes.some(role => ["supplier", "bar_seller", "seller"].includes(role));
  const selectedMode = purchaseModes.find(item => item.value === purchaseMode) ?? purchaseModes[0];
  const filtered = displayLoads
    .filter(load => {
      const options = load.saleOptions?.length ? load.saleOptions : [{ saleType: String(load.saleType || "regular"), label: "قیمت پایه", price: load.price, minimum: load.minimum }];
      const isProfessionalInventory = String(load.sellerType || "").toLowerCase() === "supplier" || options.some(option => ["professional", "pro"].includes(option.saleType));
      const professionalCityAccess = purchaseMode === "professional" && canBuySupplierProfessional && isProfessionalInventory;
      const cityAllowed = cityAccess === "all" ? true : cityAccess === "unavailable" ? false : allowedCities.includes(load.city) || professionalCityAccess;
      const professionalAudienceAllowed = purchaseMode !== "professional" || !isProfessionalInventory || canBuySupplierProfessional;
      return cityAllowed
        && professionalAudienceAllowed
        && options.some(option => selectedMode?.saleTypes.includes(option.saleType))
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

  if (!user) {
    return (
      <section className="bg-market-surface py-16">
        <div className="site-container max-w-lg">
          <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-sm sm:p-8">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-accent text-primary"><Search className="size-7" /></div>
            <h1 className="mt-4 text-2xl font-extrabold">برای جست‌وجوی بار وارد ترابار شوید</h1>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">برای مشاهده بارهای فعال متناسب با شهر و سطح دسترسی، ابتدا ثبت‌نام کنید یا وارد حساب خود شوید. این کار کمک می‌کند بازدیدها و استفاده از بازار به‌صورت دقیق و امن ثبت شود.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Link to="/auth" onClick={() => sessionStorage.setItem("terrabar:after-auth", "/requests")} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground">ثبت‌نام / ورود</Link>
              <Link to="/" className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border px-4 py-3 text-sm font-semibold">بازگشت به صفحه اصلی</Link>
            </div>
            <p className="mt-4 text-xs leading-6 text-muted-foreground">اطلاعات حساب فقط برای مدیریت عضویت و خدمات ترابار استفاده می‌شود؛ نشانی اینترنتی (IP) یا اثرانگشت دستگاه ذخیره نمی‌شود.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <section aria-label="جست‌وجوی بازار" className="relative border-b border-border bg-background">
        <div className="site-container py-6">
          <div className="mb-5">
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-primary"><span className="size-2 rounded-full bg-primary" />درخواست خرید</div>
            <h1 className="text-2xl font-extrabold sm:text-3xl">بارهای فعال <span className="text-primary">ترابار</span></h1>
            <p className="mt-3 text-xs leading-6 text-muted-foreground sm:text-sm">نوع خرید را انتخاب کنید، سپس بارهای مجاز را بر اساس شهر، محصول و کیفیت پیدا کنید. خریدار عادی فقط به خرده، عمده و ویژه در محدوده استانی مجاز دسترسی دارد. خرید ویژه حرفه‌ای بدون محدودیت استان فقط برای تأمین‌کننده و بارفروش فعال است.</p>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {purchaseModes.filter(mode => mode.value !== "professional" || canUseProfessional).map(mode => (
              <button key={mode.value} type="button" onClick={() => setPurchaseMode(mode.value)} aria-pressed={purchaseMode === mode.value}
                className={`rounded-lg border p-3 text-right transition-colors ${purchaseMode === mode.value ? "border-primary bg-accent" : "border-border bg-card hover:border-primary/50"}`}>
                <strong className="block text-sm">{mode.label}</strong>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">{mode.description}</span>
              </button>
            ))}
          </div>

          <form onSubmit={search} className="search-grid grid gap-3 lg:grid-cols-[1.25fr_1fr_1fr_1fr_auto]">
            <label className="search-field"><Search className="size-5 shrink-0 text-primary" /><div className="min-w-0 flex-1"><span className="block text-[11px] text-muted-foreground">چه باری نیاز دارید؟</span><input aria-label="جست‌وجوی محصول" placeholder="نام محصول یا رقم…" value={query} onChange={e => setQuery(e.target.value)} className="w-full min-w-0 bg-transparent py-1 text-sm outline-none" /></div></label>
            <div className="search-field" aria-label="شهر حساب کاربری"><MapPin className="size-5 shrink-0 text-primary" /><div className="min-w-0 flex-1"><span className="block text-[11px] text-muted-foreground">شهر ثبت‌شده حساب شما</span><span className="block truncate py-1 text-sm font-semibold">{!cityAccessReady ? "در حال بررسی شهر و سطح دسترسی…" : profileCity || "ورود و تکمیل شهر حساب لازم است"}</span><span className="block text-[10px] text-muted-foreground">{cityAccess === "nearby" ? "شهر خودتان و شهرهای همسایه مجاز" : cityAccess === "all" ? "دسترسی به همه شهرها طبق سطح حساب" : cityAccess === "assigned" ? "فقط شهرهای واگذارشده به مدیر" : cityAccess === "own" ? "فقط بارهای شهر ثبت‌شده شما" : "برای مشاهده بارهای مجاز وارد حساب شوید"}</span></div></div>
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
          <div id="tracking" className="mt-8 scroll-mt-6 border-t border-border pt-6">
            <h2 className="text-xl font-extrabold">پیگیری درخواست‌های سفارش من</h2>
            {!user ? <p className="mt-3 text-sm text-muted-foreground">برای دیدن وضعیت درخواست‌ها <Link to="/auth" className="font-bold text-primary underline">وارد حساب شوید</Link>.</p> : loadingMyRequests ? <p className="mt-3 text-sm text-muted-foreground">در حال دریافت وضعیت درخواست‌ها…</p> : myDirectRequests.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">هنوز درخواست سفارش مستقیمی ثبت نکرده‌اید.</p> : (
              <ul className="mt-4 grid gap-3">
                {myDirectRequests.map(request => <li key={request.id} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3"><div><strong>{request.product_type}</strong><p className="mt-1 text-xs text-muted-foreground">{faNumber(Number(request.quantity))} {request.quantity_unit} · {request.quality_requirements || "کیفیت توافقی"}{request.needed_by ? " · تاریخ موردنیاز: " + request.needed_by : ""}</p></div><span className="rounded-full bg-secondary px-3 py-1 text-xs">{directStatusLabels[request.status] ?? request.status}</span></div>
                  {request.notes && <p className="mt-2 text-xs text-muted-foreground">توضیحات: {request.notes}</p>}
                </li>)}
              </ul>
            )}
            {myRequestError && <p role="alert" className="mt-3 text-sm text-destructive">{myRequestError}</p>}
            <h3 className="mt-7 text-lg font-bold">خریدهای من</h3>
            {!user ? <p className="mt-3 text-sm text-muted-foreground">برای مشاهده سفارش‌ها <Link to="/auth" className="font-bold text-primary underline">وارد حساب شوید</Link>.</p> : loadingMyRequests ? <p className="mt-3 text-sm text-muted-foreground">در حال دریافت سفارش‌ها…</p> : myOrders.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">هنوز سفارشی ثبت نکرده‌اید.</p> : (
              <ul className="mt-4 grid gap-3">
                {myOrders.map(order => <li key={order.id} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3"><div><strong>سفارش {order.id.slice(0, 8)}</strong><p className="mt-1 text-xs text-muted-foreground">{faNumber(Number(order.quantity))} بسته · {order.total_price == null ? "مبلغ در انتظار بررسی" : faNumber(Number(order.total_price)) + " تومان"} · {order.delivery_type === "pickup" ? "تحویل حضوری" : "حمل"}</p></div><span className="rounded-full bg-secondary px-3 py-1 text-xs">{orderStatusLabels[order.status] ?? order.status}</span></div>
                  <p className="mt-2 text-xs text-muted-foreground">پرداخت: {paymentStatusLabels[order.payment_status] ?? "نامشخص"} · تحویل: {deliveryStatusLabels[order.delivery_status] ?? "در انتظار به‌روزرسانی"}{order.paid_at ? " · زمان پرداخت: " + new Date(order.paid_at).toLocaleString("fa-IR") : ""}</p>
                  {order.delivery_address && <p className="mt-2 text-xs text-muted-foreground">نشانی تحویل: {order.delivery_address}</p>}
                  {order.notes && <p className="mt-2 text-xs text-muted-foreground">توضیحات: {order.notes}</p>}
                </li>)}
              </ul>
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
