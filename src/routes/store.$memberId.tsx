/* eslint-disable @typescript-eslint/no-explicit-any -- Uses the audited production Supabase schema. */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Store, LogIn, ArrowRight, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadCard } from "@/components/load-card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { loads as sampleLoads, type Load, type Quality } from "@/lib/marketplace";

export const Route = createFileRoute("/store/$memberId")({
  head: () => ({ meta: [{ title: "ویترین اختصاصی فروشنده | ترابار" }, { name: "description", content: "مشاهده بارهای فعال و موجود فروشنده در ویترین اختصاصی ترابار." }] }),
  component: SellerStorefront,
});

function SellerStorefront() {
  const { memberId } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const path = `/store/${encodeURIComponent(memberId)}`;
  const [seller, setSeller] = useState<any>(null);
  const [loads, setLoads] = useState<Load[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    let active = true;
    async function fetchStorefront() {
      setLoading(true);
      setError("");
      const { data: memberRows, error: memberError } = await (supabase as any)
        .rpc("get_storefront_member", { p_member_id: memberId });
      const member = Array.isArray(memberRows) ? memberRows[0] : memberRows;
      if (!active) return;
      if (memberError || !member) {
        setSeller(null); setLoads([]); setError("این ویترین پیدا نشد یا دیگر در دسترس نیست."); setLoading(false); return;
      }
      setSeller(member);
      const { data, error: loadError } = await (supabase as any)
        .from("loads")
        .select("id, name, quantity, city, role, product_type, origin, engine, source_market, price, price_unit, quality, description, ready_date, status, member_id, created_at, min_quantity, unit, seller_type, source_region, sale_type, min_order_quantity, count, package_type, package_weight")
        .or("member_id.eq." + memberId + ",owner_member_id.eq." + memberId).eq("status", "active").order("created_at", { ascending: false });
      if (!active) return;
      if (loadError) {
        setError("بارهای این ویترین بارگذاری نشدند. لطفاً دوباره تلاش کنید.");
        setLoads([]); setLoading(false); return;
      }
      const rows = data ?? [];
      const ids = rows.map((row: any) => row.id);
      const { data: tiers } = ids.length
        ? await (supabase as any).from("load_price_tiers").select("load_id, sale_type, unit_price, minimum_packages").in("load_id", ids)
        : { data: [] };
      if (!active) return;
      setLoads(rows.map((row: any) => {
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
        const rowTiers = (tiers ?? []).filter((tier: any) => String(tier.load_id) === String(row.id));
        const legacyType = String(row.sale_type || "regular");
        const saleOptions = rowTiers.length ? rowTiers.map((tier: any) => {
          const key = String(tier.sale_type);
          const labels: Record<string, string> = { retail: "خرده‌فروشی", wholesale: "عمده‌فروشی", special: "فروش ویژه", professional: "ویژه حرفه‌ای", regular: "فروش عادی", pro: "ویژه حرفه‌ای" };
          return { saleType: key, label: labels[key] || key, price: Number(tier.unit_price), minimum: Math.max(1, Number(tier.minimum_packages ?? 1)) };
        }) : [{ saleType: legacyType, label: "قیمت پایه", price: Number(row.price) || 0, minimum: Math.max(1, Number(row.min_order_quantity ?? 1)) }];
        return {
          id: row.id, memberId: String(row.member_id || ""), saleType: legacyType, saleOptions,
          packageType: String(row.package_type || "کارتن"), createdAt: String(row.created_at || ""),
          product, variety: String(row.engine || row.source_market || ""),
          category: /گوجه|پیاز|خیار|سیب‌زمینی|بادمجان|فلفل/.test(product) ? "صیفی‌جات" : /سبزی|جعفری|گشنیز|شوید|کاهو/.test(product) ? "سبزیجات" : "میوه",
          quality: qualityMap[rawQuality] ?? "توافقی", city: String(row.city || member.city || ""),
          province: String(row.source_region || row.origin || ""), weight,
          stock: packageCount || Math.floor(quantity / weight), minimum: Math.max(1, Number(row.min_order_quantity ?? 1)),
          price: Number(row.price) || 0, ready: row.ready_date ? new Date(row.ready_date).toLocaleDateString("fa-IR") : "زمان بارگیری هماهنگ شود",
          validity: "طبق وضعیت بار", seller: String(member.full_name || "فروشنده ترابار"),
          sellerType: String(row.seller_type || row.role || member.role || "فروشنده"),
          image: sampleLoads[0]?.image ?? "", isSample: false,
        } as Load;
      }));
      setLoading(false);
    }
    void fetchStorefront();
    return () => { active = false; };
  }, [memberId, user?.id, authLoading]);

  function goToAuth() {
    sessionStorage.setItem("terrabar:after-auth", path);
    window.location.href = `/auth?next=${encodeURIComponent(path)}`;
  }

  if (authLoading || loading) return <section className="site-container py-16 text-center text-sm text-muted-foreground">در حال بارگذاری ویترین…</section>;
  if (!user) return <section className="site-container max-w-xl py-16"><div className="rounded-2xl border border-border bg-card p-6 text-center sm:p-9"><Store className="mx-auto size-12 text-primary" /><h1 className="mt-4 text-2xl font-extrabold">ورود به ویترین اختصاصی فروشنده</h1><p className="mt-3 text-sm leading-7 text-muted-foreground">برای مشاهده بارهای فعال این فروشنده، ابتدا وارد ترابار شوید یا ثبت‌نام کنید. پس از ورود، مستقیم به همین ویترین برمی‌گردید.</p><Button className="mt-6 w-full" onClick={goToAuth}>ورود / ثبت‌نام <LogIn className="mr-2 size-4" /></Button></div></section>;

  return <section className="site-container py-8 sm:py-12">
    <div className="mb-7 rounded-2xl bg-emerald-950 p-5 text-white sm:p-8">
      <p className="flex items-center gap-2 text-sm text-emerald-100"><Store className="size-4" /> ویترین اختصاصی ترابار</p>
      <h1 className="mt-3 text-2xl font-black sm:text-3xl">{seller?.full_name || "فروشنده ترابار"}</h1>
      {seller?.city && <p className="mt-3 flex items-center gap-2 text-sm text-emerald-100"><MapPin className="size-4" />{seller.city}</p>}
      <p className="mt-3 text-sm text-emerald-100">بارهای فعال و موجود این فروشنده</p>
    </div>
    {error && <p role="alert" className="mb-5 rounded-lg border border-destructive/30 p-4 text-sm text-destructive">{error}</p>}
    {!error && loads.length === 0 ? <div className="rounded-xl border border-border bg-card p-8 text-center"><Store className="mx-auto size-9 text-muted-foreground" /><h2 className="mt-3 font-bold">فعلاً بار فعالی در این ویترین وجود ندارد</h2><p className="mt-2 text-sm text-muted-foreground">با ثبت بار جدید توسط فروشنده، آگهی در همین صفحه نمایش داده می‌شود.</p></div> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{loads.map(load => <LoadCard key={String(load.id)} load={load} />)}</div>}
    <div className="mt-8"><Button variant="outline" onClick={() => window.location.href = "/member-home"}><ArrowRight className="ml-2 size-4" />بازگشت به صفحه کاربران ترابار</Button></div>
  </section>;
}
