/* eslint-disable @typescript-eslint/no-explicit-any -- Dynamic queries target the audited production Supabase schema; generated client types are stale. */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { CalendarDays, ChevronDown, Leaf, MapPin, PackageCheck, Plus, Search, Send, ShoppingCart, SlidersHorizontal, Store, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadCard } from "@/components/load-card";
import { cities, faNumber, loads as sampleLoads, normalizeNumericInput, pageHead, qualities, type Load, type Quality } from "@/lib/marketplace";

export const Route = createFileRoute("/requests")({
  head: () => pageHead("درخواست خرید", "جست‌وجوی بارهای مجاز و ثبت درخواست سفارش چندمحصولی در ترابار.", "/requests"),
  component: Requests,
});

type PurchaseMode = "retail" | "wholesale" | "special" | "professional";
type DirectOrderItem = { product: string; variety: string; quantity: string; unit: "kg" | "package" | "ton"; quality: string };
type MyDirectRequest = { id: string; request_number: number; product_type: string; quantity: number; quantity_unit: string; destination_city: string | null; quality_requirements: string | null; needed_by: string | null; notes: string | null; status: string; created_at: string };
type MyOrder = { id: string; invoice_number: number; load_id: string; quantity: number; unit: string; total_price: number | null; delivery_type: string | null; delivery_address: string | null; status: string; payment_status: string; paid_at: string | null; delivery_status: string; shipped_at: string | null; delivered_at: string | null; notes: string | null; created_at: string };
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

const normalizeDigits = (value: string) => value
  .replace(/[۰-۹]/g, digit => String(digit.charCodeAt(0) - 0x06f0))
  .replace(/[٠-٩]/g, digit => String(digit.charCodeAt(0) - 0x0660));
const jalaliToIsoDate = (value: string): string | null => {
  const match = normalizeDigits(value.trim()).match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/);
  if (!match) return null;
  const jy = Number(match[1]), jm = Number(match[2]), jd = Number(match[3]);
  if (jm < 1 || jm > 12 || jd < 1 || jd > 31) return null;
  const fmt = new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", { year: "numeric", month: "numeric", day: "numeric", timeZone: "UTC" });
  const start = Date.UTC(jy + 621, 0, 1);
  const end = Date.UTC(jy + 623, 0, 1);
  for (let time = start; time < end; time += 86400000) {
    const parts = Object.fromEntries(fmt.formatToParts(new Date(time)).filter(p => p.type !== "literal").map(p => [p.type, Number(p.value)]));
    if (parts.year === jy && parts.month === jm && parts.day === jd) return new Date(time).toISOString().slice(0, 10);
  }
  return null;
};
const isoToJalaliDate = (value: string) => {
  if (!value) return "";
  const date = new Date(value + "T12:00:00Z");
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: "UTC" }).format(date).replace(/-/g, "/");
};

const canUseProfessionalRole = (roles: string[]) => roles.some(role => ["supplier", "bar_seller", "seller"].includes(role));

export function Requests({ ordersOnly = false, professionalOnly = false }: { ordersOnly?: boolean; professionalOnly?: boolean } = {}) {
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
  const [purchaseMode, setPurchaseMode] = useState<PurchaseMode>(professionalOnly ? "professional" : "retail");
  const [selectedSaleTypes, setSelectedSaleTypes] = useState<string[]>(["retail", "wholesale", "special"]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedQualities, setSelectedQualities] = useState<string[]>([]);
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [quality, setQuality] = useState("");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ city: "", category: "", quality: "", query: "" });
  const [sort, setSort] = useState("newest");
  const [orderItems, setOrderItems] = useState<DirectOrderItem[]>([emptyItem()]);
  const [neededBy, setNeededBy] = useState("");
  const [neededByError, setNeededByError] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [orderBusy, setOrderBusy] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [orderSaved, setOrderSaved] = useState(false);
  const CART_KEY = "terrabar-cart-items";
  const CART_TTL_MS = 6 * 60 * 60 * 1000;
  type CartLine = { load: Load; quantity: number; saleType: string; expiresAt?: number };
  const readValidCart = (): CartLine[] => {
    try {
      const raw = window.localStorage.getItem(CART_KEY) ?? window.sessionStorage.getItem(CART_KEY) ?? "[]";
      const now = Date.now();
      const parsed = JSON.parse(raw) as CartLine[];
      const valid = Array.isArray(parsed) ? parsed.map(item => ({ ...item, expiresAt: Number(item.expiresAt) || now + CART_TTL_MS })).filter(item => item.expiresAt! > now) : [];
      window.localStorage.setItem(CART_KEY, JSON.stringify(valid));
      window.sessionStorage.removeItem(CART_KEY);
      return valid;
    } catch { return []; }
  };
  const [cartItems, setCartItems] = useState<CartLine[]>(() => typeof window !== "undefined" ? readValidCart() : []);
  const [submittedCart, setSubmittedCart] = useState<{ load: Load; quantity: number; saleType: string }[]>([]);
  const [cartError, setCartError] = useState("");
  const [cartNotice, setCartNotice] = useState("");
  const [cartBusy, setCartBusy] = useState(false);
  const [cartInvoiceVisible, setCartInvoiceVisible] = useState(false);
  
  useEffect(() => { try { window.localStorage.setItem(CART_KEY, JSON.stringify(cartItems)); window.sessionStorage.removeItem(CART_KEY); window.dispatchEvent(new Event("terrabar-cart-updated")); } catch {} }, [cartItems]);
  useEffect(() => {
    const expireCartItems = () => {
      const valid = readValidCart();
      setCartItems(current => JSON.stringify(current) === JSON.stringify(valid) ? current : valid);
      window.dispatchEvent(new Event("terrabar-cart-updated"));
    };
    const timer = window.setInterval(expireCartItems, 30_000);
    window.addEventListener("focus", expireCartItems);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", expireCartItems); };
  }, []);

  useEffect(() => {
    if (!professionalOnly && typeof window !== "undefined" && window.location.hash === "#professional" && canUseProfessionalRole(approvedRoleCodes)) {
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
        const { data: tiers } = loadIds.length ? await (supabase as any).from("load_price_tiers").select("load_id, sale_type, unit_price, minimum_packages, min_quantity, max_quantity").in("load_id", loadIds) : { data: [] };
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
          const saleOptions = rowTiers.length ? [...new Set(rowTiers.map((tier: any) => String(tier.sale_type)))].map((key: string) => {
            const labels: Record<string, string> = { retail: "خرده‌فروشی", wholesale: "عمده‌فروشی", special: "فروش ویژه", professional: "ویژه حرفه‌ای", regular: "فروش عادی", pro: "ویژه حرفه‌ای" };
            const typedTiers = rowTiers.filter((tier: any) => String(tier.sale_type) === key);
            const breaks = typedTiers.map((tier: any) => ({ minQuantity: Math.max(1, Number(tier.min_quantity ?? tier.minimum_packages ?? 1)), maxQuantity: tier.max_quantity == null ? null : Number(tier.max_quantity), price: Number(tier.unit_price) })).sort((a: any, b: any) => a.minQuantity - b.minQuantity);
            const first = breaks[0];
            const packageMinimums = typedTiers.map((tier: any) => Number(tier.minimum_packages)).filter((value: number) => Number.isFinite(value) && value > 0);
            const kgMinimums = typedTiers.map((tier: any) => Number(tier.min_quantity)).filter((value: number) => Number.isFinite(value) && value > 0);
            const minimum = packageMinimums.length ? Math.min(...packageMinimums) : kgMinimums.length ? Math.ceil(Math.min(...kgMinimums) / weight) : Number(row.min_order_quantity ?? 1);
            return { saleType: key, label: labels[key] || key, price: Number(first?.price ?? row.price) || 0, minimum: Math.max(1, minimum), priceBreaks: breaks };
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
          .select("id, request_number, product_type, quantity, quantity_unit, destination_city, quality_requirements, needed_by, notes, status, created_at")
          .eq("buyer_member_id", member.id).is("load_id", null).order("created_at", { ascending: false }),
        (supabase as any).from("orders")
          .select("id, invoice_number, load_id, quantity, unit, total_price, delivery_type, delivery_address, status, payment_status, paid_at, delivery_status, shipped_at, delivered_at, notes, created_at")
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
  const availableProducts = [...new Set(displayLoads.map(load => load.product).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fa"));
  const filtered = displayLoads
    .filter(load => {
      const options = load.saleOptions?.length ? load.saleOptions : [{ saleType: String(load.saleType || "regular"), label: "قیمت پایه", price: load.price, minimum: load.minimum }];
      // Normalize legacy sale-type and city values so retail tiers aren't hidden by capitalization,
      // Persian/Arabic letter variants, or stray whitespace in existing records.
      const normalizeValue = (value: unknown) => String(value ?? "").trim().toLowerCase()
        .replace(/[يى]/g, "ی").replace(/ك/g, "ک").replace(/\s+/g, "");
      const normalizedOptions = options.map(option => ({ ...option, saleType: normalizeValue(option.saleType) }));
      const isProfessionalInventory = normalizedOptions.some(option => ["professional", "pro"].includes(option.saleType));
      const professionalCityAccess = purchaseMode === "professional" && canBuySupplierProfessional && isProfessionalInventory;
      const normalizedLoadCity = normalizeValue(load.city);
      const normalizedAllowedCities = allowedCities.map(normalizeValue);
      const cityAllowed = professionalOnly ? canBuySupplierProfessional && isProfessionalInventory : cityAccess === "all" ? true : cityAccess === "unavailable" ? false : normalizedAllowedCities.includes(normalizedLoadCity) || professionalCityAccess;
      const normalizedSelectedTypes = selectedSaleTypes.map(normalizeValue);
      const optionAllowed = professionalOnly ? isProfessionalInventory : normalizedOptions.some(option => {
        if (["professional", "pro"].includes(option.saleType)) return false;
        if (option.saleType === "retail") return normalizedSelectedTypes.includes("retail");
        if (option.saleType === "wholesale") return normalizedSelectedTypes.includes("wholesale");
        if (option.saleType === "special") return normalizedSelectedTypes.includes("special");
        if (option.saleType === "regular") return normalizedSelectedTypes.includes("retail") || normalizedSelectedTypes.includes("wholesale");
        return normalizedSelectedTypes.includes(option.saleType);
      });
      return cityAllowed
        && (professionalOnly ? isProfessionalInventory : !isProfessionalInventory)
        && optionAllowed
        && (!selectedProducts.length || selectedProducts.includes(load.product))
        && (!selectedQualities.length || selectedQualities.includes(load.quality))
        && (!minPrice || load.price >= Number(normalizeNumericInput(minPrice)))
        && (!maxPrice || load.price <= Number(normalizeNumericInput(maxPrice)))
        && (!normalizedQuery || `${load.product}${load.variety}`.replace(/\s/g, "").includes(normalizedQuery));
    })
    .sort((a, b) => sort === "price" ? a.price - b.price : sort === "stock" ? b.stock - a.stock : (Date.parse(b.createdAt || "") || Number(b.id) || 0) - (Date.parse(a.createdAt || "") || Number(a.id) || 0));

  function priceFor(load: Load, saleType: string, quantity: number) {
    const option = load.saleOptions?.find(item => item.saleType === saleType);
    const match = option?.priceBreaks?.find(item => quantity * load.weight >= item.minQuantity && (item.maxQuantity == null || quantity * load.weight <= item.maxQuantity));
    return Number(match?.price ?? option?.price ?? load.price);
  }
  function addToCart(load: Load, quantity: number, saleType: string) {
    if (load.isSample) { setCartError("بار نمونه قابل ثبت در سفارش واقعی نیست."); return; }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > load.stock) { setCartError("تعداد باید عدد صحیح و در محدوده موجودی باشد."); return; }
    const option = load.saleOptions?.find(item => item.saleType === saleType);
    if (!option || quantity < option.minimum) { setCartError(`حداقل سفارش این بخش ${faNumber(option?.minimum ?? load.minimum)} بسته است.`); return; }
    setCartError(""); setCartNotice(`«${load.product}» به سبد خرید اضافه شد.`); setCartInvoiceVisible(false);
    setCartItems(items => {
      const found = items.find(item => String(item.load.id) === String(load.id) && item.saleType === saleType);
      if (!found) return [...items, { load, quantity, saleType, expiresAt: Date.now() + CART_TTL_MS }];
      return items.map(item => item === found ? { ...item, quantity: Math.min(load.stock, item.quantity + quantity), expiresAt: Date.now() + CART_TTL_MS } : item);
    });
  }
  function updateCartQuantity(index: number, value: string) {
    const parsed = Number(normalizeNumericInput(value));
    if (!Number.isInteger(parsed) || parsed <= 0) return;
    setCartItems(items => items.map((item, i) => i === index ? { ...item, quantity: Math.min(item.load.stock, Math.max(item.load.saleOptions?.find(o => o.saleType === item.saleType)?.minimum ?? item.load.minimum, parsed)) } : item));
    setCartInvoiceVisible(false);
  }
  const cartTotal = cartItems.reduce((sum, item) => sum + item.quantity * item.load.weight * priceFor(item.load, item.saleType, item.quantity), 0);
  const submittedCartTotal = submittedCart.reduce((sum, item) => sum + item.quantity * item.load.weight * priceFor(item.load, item.saleType, item.quantity), 0);
  async function submitCart() {
    setCartBusy(true); setCartError(""); setCartNotice("");
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) { setCartError("برای ثبت سفارش وارد حساب شوید."); setCartBusy(false); return; }
    const { data: member, error: memberError } = await (supabase as any).from("members").select("id,full_name,phone,email,city").eq("auth_user_id", authData.user.id).maybeSingle();
    if (memberError || !member) { setCartError("پروفایل عضو پیدا نشد؛ ابتدا ثبت‌نام را کامل کنید."); setCartBusy(false); return; }
    if (cartItems.some(item => !item.load.memberId)) { setCartError("برای یکی از بارها شناسه فروشنده ثبت نشده است؛ سفارش ارسال نشد."); setCartBusy(false); return; }
    const rows = cartItems.map(item => ({ load_id: item.load.id, customer_name: member.full_name, customer_phone: member.phone, customer_email: member.email, customer_city: member.city, quantity: item.quantity, unit: "package", price: priceFor(item.load, item.saleType, item.quantity), total_price: item.quantity * item.load.weight * priceFor(item.load, item.saleType, item.quantity), sale_type: item.saleType, delivery_type: "pickup", delivery_address: null, status: "pending", payment_status: "unpaid", notes: "ثبت از سبد خرید ترابار؛ در انتظار تأیید فروشنده", buyer_member_id: member.id, seller_member_id: item.load.memberId }));
    const { error } = await (supabase as any).from("orders").insert(rows);
    if (error) setCartError("ثبت سفارش‌های سبد انجام نشد. سفارش واقعی ثبت نشده است؛ دسترسی‌های سفارش در سوپابیس بررسی شود.");
    else { setSubmittedCart(cartItems); setCartNotice("سفارش‌ها ثبت شدند و در انتظار تأیید فروشنده‌اند. پرداخت تا تأیید شرایط انجام نمی‌شود؛ درگاه پرداخت هنوز به این پروژه متصل نیست."); setCartItems([]); setCartInvoiceVisible(true); }
    setCartBusy(false);
  }

  function search(event: FormEvent) {
    event.preventDefault();
    setFilters({ city, category, quality, query });
    document.getElementById("market-loads")?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" });
  }
  function reset() {
    setCity(""); setCategory(""); setQuality(""); setQuery("");
    setSelectedSaleTypes(["retail", "wholesale", "special"]); setSelectedProducts([]); setSelectedQualities([]); setMinPrice(""); setMaxPrice("");
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
    const invalid = orderItems.some(item => !item.product.trim() || !Number.isFinite(Number(normalizeNumericInput(item.quantity))) || Number(normalizeNumericInput(item.quantity)) <= 0);
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

    const normalizedNeededBy = neededBy.trim() ? jalaliToIsoDate(neededBy) : null;
    if (neededBy.trim() && !normalizedNeededBy) { setNeededByError("تاریخ شمسی را به شکل ۱۴۰۵/۰۷/۲۹ وارد کنید."); setOrderBusy(false); return; }
    setNeededByError("");
    const rows = orderItems.map(item => ({
      buyer_member_id: member.id,
      product_type: item.product.trim(),
      quantity: Number(normalizeNumericInput(item.quantity)),
      quantity_unit: item.unit,
      destination_city: member.city || null,
      quality_requirements: [item.variety.trim(), item.quality].filter(Boolean).join(" — "),
      needed_by: normalizedNeededBy,
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

  if (professionalOnly && !canUseProfessional) {
    return <section dir="rtl" className="bg-market-surface py-16"><div className="site-container max-w-xl rounded-2xl border border-border bg-card p-6 text-center"><h1 className="text-xl font-extrabold">خرید ویژه حرفه‌ای</h1><p className="mt-3 text-sm leading-7 text-muted-foreground">این بخش فقط برای تأمین‌کنندگان و بارفروشان دارای عضویت تأییدشده فعال است. بارهای ویژه حرفه‌ای در بازارهای دیگر نمایش داده نمی‌شوند.</p><Link to="/member-home" className="mt-5 inline-flex rounded-lg border border-border px-4 py-2 text-sm font-semibold">بازگشت به صفحه اصلی کاربر</Link></div></section>;
  }

  return (
    <>
{!ordersOnly && <>
      <section aria-label={professionalOnly ? "بارهای ویژه حرفه‌ای" : "جست‌وجوی بازار"} className="relative border-b border-border bg-market-surface">
        <div className="site-container py-4 sm:py-5">
          <div className="mb-3 rounded-2xl bg-emerald-950 px-4 py-4 text-white shadow-sm sm:px-6">
            <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold text-emerald-200"><span className="size-2 rounded-full bg-lime-300" />بازار خرید</div>
            <h1 className="text-xl font-extrabold sm:text-2xl">بازار خرید <span className="text-lime-300">ترابار</span></h1>
            <p className="mt-1.5 text-xs leading-5 text-emerald-50/90 sm:text-sm">بارهای مجاز شهر حساب شما؛ آگهی‌های حرفه‌ای در بخش مستقل نمایش داده می‌شوند.</p>
          </div>

          <form onSubmit={search} className="grid gap-2 rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-4">
            <label className="search-field"><Search className="size-5 shrink-0 text-primary" /><div className="min-w-0 flex-1"><span className="block text-[11px] text-muted-foreground">جست‌وجوی بار</span><input aria-label="جست‌وجوی محصول" placeholder="نام محصول یا رقم…" value={query} onChange={e => setQuery(e.target.value)} className="w-full min-w-0 bg-transparent py-1 text-sm outline-none" /></div></label>
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
              <details className="relative min-w-0"><summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-0.5 rounded-lg border border-border bg-background px-1.5 py-1 text-[10px] font-semibold sm:px-2 sm:text-xs"><span>مقدار خرید{selectedSaleTypes.length && selectedSaleTypes.length < 3 ? ` (${selectedSaleTypes.length})` : ""}</span><ChevronDown className="size-4 shrink-0" /></summary><div className="absolute right-0 z-30 mt-2 w-52 rounded-xl border border-border bg-card p-3 shadow-xl"><p className="mb-2 text-xs text-muted-foreground">یک یا چند گزینه را انتخاب کنید</p>{[{v:"retail",l:"خرده"},{v:"wholesale",l:"عمده"},{v:"special",l:"ویژه"}].map(opt=><label key={opt.v} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-secondary"><input type="checkbox" checked={selectedSaleTypes.includes(opt.v)} onChange={e=>setSelectedSaleTypes(prev=>e.target.checked?[...prev,opt.v]:prev.filter(v=>v!==opt.v))} />{opt.l}</label>)}<button type="button" className="mt-2 text-xs font-semibold text-primary" onClick={()=>setSelectedSaleTypes(["retail","wholesale","special"])}>انتخاب همه</button></div></details>
              <details className="relative min-w-0"><summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-0.5 rounded-lg border border-border bg-background px-1.5 py-1 text-[10px] font-semibold sm:px-2 sm:text-xs"><span>محصول{selectedProducts.length ? ` (${selectedProducts.length})` : ""}</span><ChevronDown className="size-4 shrink-0" /></summary><div className="absolute right-0 z-30 mt-2 max-h-64 w-60 overflow-auto rounded-xl border border-border bg-card p-3 shadow-xl"><p className="mb-2 text-xs text-muted-foreground">امکان انتخاب چند محصول</p>{availableProducts.map(product=><label key={product} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-secondary"><input type="checkbox" checked={selectedProducts.includes(product)} onChange={e=>setSelectedProducts(prev=>e.target.checked?[...prev,product]:prev.filter(v=>v!==product))} />{product}</label>)}{!availableProducts.length&&<span className="text-xs text-muted-foreground">محصول فعالی موجود نیست</span>}<button type="button" className="mt-2 text-xs font-semibold text-primary" onClick={()=>setSelectedProducts([])}>پاک‌کردن انتخاب محصول</button></div></details>
              <details className="relative"><summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-0.5 rounded-lg border border-border bg-card px-2 py-1 text-[10px] font-semibold sm:text-xs"><span>کیفیت{selectedQualities.length ? ` (${selectedQualities.length})` : ""}</span><ChevronDown className="size-4 shrink-0" /></summary><div className="absolute right-0 z-30 mt-2 w-52 rounded-xl border border-border bg-card p-3 shadow-xl">{qualities.map(q=><label key={q} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-secondary"><input type="checkbox" checked={selectedQualities.includes(q)} onChange={e=>setSelectedQualities(prev=>e.target.checked?[...prev,q]:prev.filter(v=>v!==q))} />{q}</label>)}<button type="button" className="mt-2 text-xs font-semibold text-primary" onClick={()=>setSelectedQualities([])}>همه کیفیت‌ها</button></div></details>
              <details className="relative"><summary className="flex min-h-9 cursor-pointer list-none items-center justify-between gap-0.5 rounded-lg border border-border bg-card px-2 py-1 text-[10px] font-semibold sm:text-xs"><span>قیمت</span><ChevronDown className="size-4 shrink-0" /></summary><div className="absolute left-0 z-30 mt-2 w-60 rounded-xl border border-border bg-card p-3 shadow-xl"><p className="mb-2 text-xs text-muted-foreground">بازه قیمت هر کیلو (تومان)</p><label className="mb-2 block text-xs">از<input inputMode="numeric" value={minPrice} onChange={e=>setMinPrice(normalizeNumericInput(e.target.value))} className="field-input mt-1" placeholder="حداقل قیمت" /></label><label className="block text-xs">تا<input inputMode="numeric" value={maxPrice} onChange={e=>setMaxPrice(normalizeNumericInput(e.target.value))} className="field-input mt-1" placeholder="حداکثر قیمت" /></label><div className="mt-3 flex gap-2"><button type="button" className="text-xs font-semibold text-primary" onClick={()=>setSort("price")}>ارزان به گران</button><button type="button" className="text-xs font-semibold text-primary" onClick={()=>setSort("newest")}>جدیدترین</button></div></div></details>
            </div>
            <div className="flex items-center justify-between gap-2"><span className="text-[10px] text-muted-foreground">شهر: {!cityAccessReady ? "در حال بررسی…" : profileCity || "تکمیل نشده"}</span><Button type="submit" className="h-8 px-3 text-[11px]"><Search className="ml-1 size-3.5" />اعمال</Button></div>
          </form>
          <div className="mt-2 flex flex-wrap items-center gap-1 text-xs text-muted-foreground"><span className="ml-1">پرجست‌وجو:</span>{["پرتقال", "سیب", "گوجه‌فرنگی", "پیاز"].map(product => <Button key={product} variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setQuery(product); setCity(""); setCategory(""); setQuality(""); setFilters({ city: "", category: "", quality: "", query: product }); }}>{product}</Button>)}</div>
        </div>
      </section>

      <section id="market-loads" className="scroll-mt-5 bg-market-surface py-5 sm:py-7">
        <div className="site-container">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border pb-4">
            <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-muted-foreground"><span aria-live="polite">{loadingLoads ? "در حال دریافت بارها…" : `${faNumber(filtered.length)} بار`}</span>{(activeFilters(filters) || selectedSaleTypes.length !== 3 || selectedProducts.length > 0 || selectedQualities.length > 0 || minPrice || maxPrice) && <Button variant="ghost" className="h-7 px-2 text-xs" onClick={reset}><X className="size-3" />حذف فیلترها</Button>}</div>
            <div className="flex items-center gap-2"><label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground"><SlidersHorizontal className="size-3.5" /><select aria-label="مرتب‌سازی بارها" className="max-w-36 bg-transparent text-foreground outline-none" value={sort} onChange={e => setSort(e.target.value)}><option value="newest">تازه‌ترین بارها</option><option value="price">کمترین قیمت</option><option value="stock">بیشترین موجودی</option></select></label>{(cartItems.length > 0 || cartNotice) && <Button type="button" size="sm" className="h-8 gap-1 px-2 text-xs" onClick={() => { window.location.href = "/cart"; }}><ShoppingCart className="size-3.5" />سبد {cartItems.length > 0 ? `(${faNumber(cartItems.length)})` : ""}</Button>}</div>
          </div>
          {cartNotice && !cartError && <div role="status" aria-live="polite" className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/20 bg-accent/50 px-3 py-2.5 text-sm"><span className="font-semibold text-primary"><PackageCheck className="ml-1 inline size-4" />{cartNotice}</span><Button type="button" variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => { window.location.href = "/cart"; }}>بررسی سبد خرید <ShoppingCart className="size-3.5" /></Button></div>}
          {loadError && <p role="alert" className="mt-4 text-sm text-destructive">{loadError}</p>}
          {cartError && <p role="alert" className="mt-3 text-sm text-destructive">{cartError} <Link to="/cart" className="font-bold underline">رفتن به سبد خرید</Link></p>}
          {filtered.length ? <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 xl:grid-cols-5">{filtered.map(load => <LoadCard key={`${load.isSample ? "sample" : "live"}-${load.id}`} load={load} purchaseMode={purchaseMode} cartSelected={cartItems.some(item => String(item.load.id) === String(load.id))} onAddToCart={addToCart} />)}</div> : <div className="py-16 text-center"><Search className="mx-auto mb-4 size-10 text-muted-foreground" /><h3 className="text-lg font-bold">باری با این مشخصات پیدا نشد</h3><p className="mt-3 text-sm text-muted-foreground">در این نوع خرید، در حال حاضر بار فعالی با این مشخصات پیدا نشد.</p><Button variant="outline" className="mt-5" onClick={reset}>حذف فیلترها</Button></div>}
          <div className="mt-7 flex items-center justify-center gap-2 text-xs text-muted-foreground"><PackageCheck className="size-4 text-primary" />{liveLoads.length ? "بارهای ثبت‌شده از دیتابیس نمایش داده می‌شوند؛ کارت‌های نمونه در محیط توسعه مشخص‌اند." : "تا زمان ثبت بار واقعی، کارت‌های نمایشی نمونه هستند."}</div>
        </div>
      </section>


      </>}

      {ordersOnly && <>
      <section aria-label="درخواست سفارش و پیگیری" className="border-b border-border bg-market-surface py-5">
        <div className="site-container max-w-4xl">
          <h1 className="text-xl font-black">درخواست سفارش و پیگیری</h1>
          <p className="mt-1 text-sm text-muted-foreground">از همین صفحه درخواست چندمحصولی ثبت کنید و وضعیت خریدها و درخواست‌های تأمین را دنبال کنید.</p>
          <Link to="/requests" className="mt-3 inline-flex items-center rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold">بازگشت به بازار</Link>
        </div>
      </section>
      <section id="direct-order" className="scroll-mt-5 border-t border-border bg-card py-6 sm:py-8">
        <div className="site-container max-w-4xl">
          <div className="mb-4 flex items-center gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-primary"><Send className="size-5" /></div>
            <div><h2 className="text-lg font-extrabold">درخواست سفارش چندمحصولی</h2><p className="mt-1 text-xs text-muted-foreground">محصولات موردنیاز را وارد کنید تا درخواست برای بررسی ثبت شود.</p></div>
          </div>
          {orderSaved && <div role="status" className="mb-4 rounded-lg border border-primary/20 bg-accent/40 p-3 text-sm font-semibold text-primary">درخواست شما ثبت شد. از بخش «پیگیری سفارش» وضعیت آن را دنبال کنید.</div>}
          {orderError && <p role="alert" className="mb-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{orderError}</p>}
          <form onSubmit={submitDirectOrder} className="space-y-3 rounded-xl border border-border p-3 sm:p-4">
            {orderItems.map((item, index) => <div key={index} className="grid grid-cols-2 gap-2 rounded-lg bg-market-surface p-3 sm:grid-cols-5">
              <label className="text-xs font-semibold">نام محصول<input required value={item.product} onChange={e=>updateItem(index,"product",e.target.value)} className="field-input mt-1" placeholder="مثلاً سیب" /></label>
              <label className="text-xs font-semibold">رقم / توضیح<input value={item.variety} onChange={e=>updateItem(index,"variety",e.target.value)} className="field-input mt-1" placeholder="اختیاری" /></label>
              <label className="text-xs font-semibold">مقدار موردنیاز<input required inputMode="decimal" value={item.quantity} onChange={e=>updateItem(index,"quantity",normalizeNumericInput(e.target.value))} className="field-input mt-1" placeholder="مقدار" /></label>
              <label className="text-xs font-semibold">واحد<select value={item.unit} onChange={e=>updateItem(index,"unit",e.target.value)} className="field-input mt-1"><option value="kg">کیلوگرم</option><option value="package">بسته</option><option value="ton">تن</option></select></label>
              <div className="flex items-end"><Button type="button" variant="outline" className="h-10 w-full text-xs" disabled={orderItems.length===1} onClick={()=>setOrderItems(items=>items.filter((_,i)=>i!==index))}><Trash2 className="ml-1 size-3.5"/>حذف ردیف</Button></div>
            </div>)}
            <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" className="h-9 text-xs" onClick={()=>setOrderItems(items=>[...items,emptyItem()])}><Plus className="ml-1 size-4"/>افزودن محصول</Button><label className="min-w-40 flex-1 text-xs font-semibold">تاریخ موردنیاز (هجری شمسی، اختیاری)<input type="text" inputMode="numeric" dir="ltr" value={neededBy} onChange={e=>{setNeededBy(normalizeDigits(e.target.value));setNeededByError("");}} className="field-input mt-1 text-left" placeholder="۱۴۰۵/۰۷/۲۹" aria-describedby="needed-by-help" /><span id="needed-by-help" className="mt-1 block text-[11px] text-muted-foreground">عدد فارسی یا انگلیسی؛ نمونه: ۱۴۰۵/۰۷/۲۹ یا 1405/07/29</span>{neededByError && <span role="alert" className="mt-1 block text-[11px] text-destructive">{neededByError}</span>}</label></div>
            <label className="block text-xs font-semibold">توضیحات تکمیلی<textarea value={orderNotes} onChange={e=>setOrderNotes(e.target.value)} className="field-input mt-1 min-h-20" placeholder="کیفیت یا شرایط موردنظر (اختیاری)"/></label>
            <Button type="submit" disabled={orderBusy} className="h-10 w-full sm:w-auto">{orderBusy ? "در حال ثبت…" : "ثبت درخواست سفارش"}</Button>
          </form>
        </div>
      </section>

      <section id="tracking" className="scroll-mt-5 border-t border-border bg-market-surface py-6 sm:py-8">
        <div className="site-container max-w-4xl">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3"><div className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-primary"><PackageCheck className="size-5"/></div><div><h2 className="text-lg font-extrabold">پیگیری خرید و سفارش</h2><p className="mt-1 text-xs text-muted-foreground">وضعیت سفارش‌های ثبت‌شده و درخواست‌های تأمین را ببینید یا خرید را ادامه دهید.</p></div></div>
            <div className="flex gap-2"><Link to="/cart" className="inline-flex h-9 items-center justify-center gap-1 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground"><ShoppingCart className="size-4"/>ادامه خرید / سبد</Link><a href="#market-loads" className="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-card px-3 text-xs font-semibold">بازگشت به بازار</a></div>
          </div>
          {myRequestError && <p role="alert" className="mb-3 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{myRequestError}</p>}
          {loadingMyRequests ? <p className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">در حال دریافت سفارش‌ها…</p> : <>
            <h3 className="mb-2 font-bold">خریدهای ثبت‌شده</h3>
            {myOrders.length ? <div className="mb-5 space-y-2">{myOrders.map(order=><article key={order.id} className="rounded-xl border border-border bg-card p-3 sm:p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-bold">فاکتور شماره {faNumber(order.invoice_number)}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString("fa-IR")} · {faNumber(order.quantity)} {order.unit==="package"?"بسته":order.unit}</p></div><span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-primary">{orderStatusLabels[order.status] || order.status || "در حال بررسی"}</span></div><div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground"><span>پرداخت: {paymentStatusLabels[order.payment_status] || order.payment_status || "نامشخص"}</span>{order.total_price != null && <span>مبلغ: {faNumber(order.total_price)} تومان</span>}{order.delivery_status && <span>تحویل: {deliveryStatusLabels[order.delivery_status] || order.delivery_status}</span>}</div><div className="mt-3 flex flex-wrap gap-2"><Link to="/cart" className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground">ادامه خرید</Link><a href="#market-loads" className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-xs font-semibold">انتخاب محصول دیگر</a></div></article>)}</div> : <p className="mb-5 rounded-xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">هنوز خریدی ثبت نکرده‌اید. از بازار محصول انتخاب کنید و به سبد خرید بروید.</p>}
            <h3 className="mb-2 font-bold">درخواست‌های تأمین چندمحصولی</h3>
            {myDirectRequests.length ? <div className="space-y-2">{myDirectRequests.map(request=><article key={request.id} className="rounded-xl border border-border bg-card p-3 sm:p-4"><div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-bold">درخواست شماره {faNumber(request.request_number)} · {request.product_type} · {faNumber(request.quantity)} {request.quantity_unit==="kg"?"کیلوگرم":request.quantity_unit==="ton"?"تن":"بسته"}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(request.created_at).toLocaleDateString("fa-IR")}{request.quality_requirements ? ` · ${request.quality_requirements}` : ""}</p></div><span className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-primary">{directStatusLabels[request.status] || request.status}</span></div>{request.notes && <p className="mt-2 text-xs text-muted-foreground">{request.notes}</p>}<div className="mt-3 flex gap-2"><a href="#direct-order" className="inline-flex h-8 items-center rounded-lg border border-border px-3 text-xs font-semibold">ثبت درخواست جدید</a><a href="#market-loads" className="inline-flex h-8 items-center rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground">ادامه خرید از بازار</a></div></article>)}</div> : <p className="rounded-xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">درخواستی برای تأمین ثبت نشده است.</p>}
          </>}
        </div>
      </section>
      </>}

    </>
  );
}

export function OrdersPage() {
  return <Requests ordersOnly />;
}

function activeFilters(filters: { city: string; category: string; quality: string; query: string }) {
  return Object.values(filters).some(Boolean);
}
