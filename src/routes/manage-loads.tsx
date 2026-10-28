/* eslint-disable @typescript-eslint/no-explicit-any -- Existing Supabase schema types are stale. */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Pencil, Trash2, X, Save, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { pageHead, qualities } from "@/lib/marketplace";

export const Route = createFileRoute("/manage-loads")({
  head: () => pageHead("مدیریت بارهای من", "ویرایش و مدیریت بارهای اعلام‌شده توسط خودتان در ترابار."),
  component: ManageLoadsPage,
});

type Load = {
  id: string; name: string; product_type: string; engine: string | null; city: string;
  origin: string | null; quality: string | null; quantity: number; count: number | null;
  price: number; status: string; package_type: string | null; package_weight: number | null;
  min_order_quantity: number | null; description: string | null; created_at: string;
};
const statusLabels: Record<string, string> = {
  active: "فعال", pending: "در انتظار تأیید", inactive: "غیرفعال",
  rejected: "رد شده", sold_out: "تمام‌شده", expired: "منقضی‌شده",
};
const qualityLabels: Record<string, string> = {
  premium: "ویژه", standard: "استاندارد", economy: "اقتصادی", negotiated: "توافقی",
};

function ManageLoadsPage() {
  const { user, loading } = useAuth();
  const [loads, setLoads] = useState<Load[]>([]);
  const [busy, setBusy] = useState(false);
  const [loadingLoads, setLoadingLoads] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<Load | null>(null);
  const [form, setForm] = useState({ product: "", variety: "", quality: "standard", city: "", origin: "", packageType: "کارتن", weight: "", count: "", minimum: "", description: "" });

  async function refresh() {
    if (!user) { setLoads([]); setLoadingLoads(false); return; }
    setLoadingLoads(true);
    setError("");
    const { data: member, error: memberError } = await (supabase as any)
      .from("members").select("id").eq("auth_user_id", user.id).maybeSingle();
    if (memberError || !member?.id) {
      setError("اطلاعات عضویت دریافت نشد. لطفاً دوباره وارد حساب شوید.");
      setLoads([]); setLoadingLoads(false); return;
    }
    const { data, error: listError } = await (supabase as any).from("loads")
      .select("id, name, product_type, engine, city, origin, quality, quantity, count, price, status, package_type, package_weight, min_order_quantity, description, created_at")
      .or("member_id.eq." + member.id + ",owner_member_id.eq." + member.id)
      .order("created_at", { ascending: false });
    if (listError) setError("فهرست بارهای شما دریافت نشد؛ دسترسی مشاهده بارها را بررسی کنید.");
    else setLoads((data ?? []) as Load[]);
    setLoadingLoads(false);
  }

  useEffect(() => { void refresh(); }, [user?.id]);

  function startEdit(load: Load) {
    setEditing(load);
    setForm({
      product: load.product_type || load.name || "", variety: load.engine || "",
      quality: load.quality || "standard", city: load.city || "", origin: load.origin || "",
      packageType: load.package_type || "کارتن",
      weight: String(load.package_weight ?? (load.count ? Number(load.quantity) / Number(load.count) : "")),
      count: String(load.count ?? ""), minimum: String(load.min_order_quantity ?? 1),
      description: load.description || "",
    });
    setError("");
  }

  async function saveEdit(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    const weight = Number(form.weight), count = Number(form.count), minimum = Number(form.minimum);
    if (!form.product.trim() || !form.variety.trim() || !form.city.trim() || !form.origin.trim() ||
      !Number.isFinite(weight) || weight <= 0 || !Number.isInteger(count) || count < 1 ||
      !Number.isInteger(minimum) || minimum < 1 || minimum > count) {
      setError("نام محصول، رقم، شهر، مبدأ، وزن بسته، موجودی و حداقل سفارش را بررسی کنید.");
      return;
    }
    setBusy(true); setError("");
    const { data: member } = await (supabase as any).from("members").select("id").eq("auth_user_id", user?.id).maybeSingle();
    if (!member?.id) { setError("حساب کاربری تأیید نشد."); setBusy(false); return; }
    const { error: updateError } = await (supabase as any).from("loads").update({
      name: [form.product.trim(), form.variety.trim()].join(" "),
      product_type: form.product.trim(), engine: form.variety.trim(), quality: form.quality,
      city: form.city.trim(), origin: form.origin.trim(), source_region: form.origin.trim(),
      package_type: form.packageType, package_weight: weight, quantity: weight * count,
      count, min_quantity: minimum * weight, min_order_quantity: minimum,
      description: form.description.trim() || null,
    }).eq("id", editing.id).or("member_id.eq." + member.id + ",owner_member_id.eq." + member.id);
    if (updateError) setError("ویرایش ذخیره نشد؛ دسترسی و اطلاعات بار را بررسی کنید.");
    else { setEditing(null); await refresh(); setError("تغییرات بار ذخیره شد."); }
    setBusy(false);
  }

  async function removeLoad(load: Load) {
    if (!window.confirm(`بار «${load.name || load.product_type}» حذف شود؟ این کار قابل بازگشت نیست.`)) return;
    setBusy(true); setError("");
    const { data: member } = await (supabase as any).from("members").select("id").eq("auth_user_id", user?.id).maybeSingle();
    if (!member?.id) { setError("حساب کاربری تأیید نشد."); setBusy(false); return; }
    const { data: orders, error: orderError } = await (supabase as any).from("orders").select("id").eq("load_id", load.id).limit(1);
    if (orderError || (orders ?? []).length) {
      setError(orderError ? "سفارش‌های مرتبط بررسی نشد؛ حذف انجام نشد." : "این بار سفارش مرتبط دارد؛ برای حفظ سوابق خرید، حذف کامل ممکن نیست.");
      setBusy(false); return;
    }
    const { data: images, error: imagesError } = await (supabase as any).from("load_images").select("storage_path").eq("load_id", load.id);
    if (imagesError) { setError("اطلاعات عکس‌های بار دریافت نشد؛ حذف انجام نشد."); setBusy(false); return; }
    const { error: tierError } = await (supabase as any).from("load_price_tiers").delete().eq("load_id", load.id);
    if (tierError) { setError("حذف قیمت‌های وابسته انجام نشد؛ بار حذف نشد."); setBusy(false); return; }
    const { error: imageError } = await (supabase as any).from("load_images").delete().eq("load_id", load.id);
    if (imageError) { setError("حذف اطلاعات عکس‌ها انجام نشد؛ بار حذف نشد."); setBusy(false); return; }
    const paths = (images ?? []).map((item: any) => item.storage_path).filter(Boolean);
    if (paths.length) await supabase.storage.from("terrabar-load-images").remove(paths);
    const { error: deleteError } = await (supabase as any).from("loads").delete().eq("id", load.id)
      .or("member_id.eq." + member.id + ",owner_member_id.eq." + member.id);
    if (deleteError) setError("حذف بار انجام نشد؛ ممکن است دیتابیس مانع حذف شده باشد.");
    else setLoads(items => items.filter(item => item.id !== load.id));
    setBusy(false);
  }

  async function toggleActive(load: Load) {
    if (!["active", "pending", "inactive"].includes(load.status)) return;
    setBusy(true); setError("");
    const { data: member } = await (supabase as any).from("members").select("id").eq("auth_user_id", user?.id).maybeSingle();
    if (!member?.id) { setError("حساب کاربری تأیید نشد."); setBusy(false); return; }
    const nextStatus = load.status === "inactive" ? "active" : "inactive";
    const { error: updateError } = await (supabase as any).from("loads").update({ status: nextStatus }).eq("id", load.id)
      .or("member_id.eq." + member.id + ",owner_member_id.eq." + member.id);
    if (updateError) setError("وضعیت بار تغییر نکرد؛ دسترسی را بررسی کنید.");
    else setLoads(items => items.map(item => item.id === load.id ? { ...item, status: nextStatus } : item));
    setBusy(false);
  }

  if (loading) return <main dir="rtl" className="site-container py-16 text-center">در حال بارگذاری…</main>;
  if (!user) return <main dir="rtl" className="site-container max-w-lg py-16 text-center"><h1 className="text-2xl font-black">ابتدا وارد حساب شوید</h1><Button asChild className="mt-5"><Link to="/auth">ورود / ثبت‌نام</Link></Button></main>;

  return <main dir="rtl" className="min-h-[70vh] bg-market-surface px-4 py-8 sm:py-12"><div className="site-container max-w-3xl">
    <Link to="/member-home" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-muted-foreground"><ArrowRight className="size-4" />بازگشت به صفحه حساب</Link>
    <header className="mb-6"><h1 className="text-2xl font-black">مدیریت بارهای من</h1><p className="mt-2 text-sm leading-7 text-muted-foreground">فقط بارهایی که خودتان اعلام کرده‌اید در این فهرست نمایش داده می‌شوند. از اینجا می‌توانید مشخصات را ویرایش، بار را فعال/غیرفعال یا حذف کنید.</p></header>
    {error && <p role="status" className="mb-4 rounded-xl border border-border bg-card p-3 text-sm">{error}</p>}
    {editing && <form onSubmit={saveEdit} className="mb-6 grid gap-4 rounded-2xl border border-border bg-card p-4 sm:p-6">
      <div className="flex items-center justify-between"><h2 className="font-extrabold">ویرایش بار</h2><button type="button" aria-label="بستن ویرایش" onClick={() => setEditing(null)}><X className="size-5" /></button></div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="field-label">نام محصول<input className="field-input" required value={form.product} onChange={e => setForm(p => ({ ...p, product: e.target.value }))} /></label>
        <label className="field-label">رقم / نوع<input className="field-input" required value={form.variety} onChange={e => setForm(p => ({ ...p, variety: e.target.value }))} /></label>
        <label className="field-label">کیفیت<select className="field-input" value={form.quality} onChange={e => setForm(p => ({ ...p, quality: e.target.value }))}>{["premium","standard","economy","negotiated"].map((q,i) => <option key={q} value={q}>{qualities[i] || qualityLabels[q]}</option>)}</select></label>
        <label className="field-label">شهر عرضه<input className="field-input" required value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} /></label>
        <label className="field-label">شهر مبدأ<input className="field-input" required value={form.origin} onChange={e => setForm(p => ({ ...p, origin: e.target.value }))} /></label>
        <label className="field-label">نوع بسته‌بندی<input className="field-input" required value={form.packageType} onChange={e => setForm(p => ({ ...p, packageType: e.target.value }))} /></label>
        <label className="field-label">وزن هر بسته (کیلوگرم)<input className="field-input" type="number" min="0.1" step="0.1" required value={form.weight} onChange={e => setForm(p => ({ ...p, weight: e.target.value }))} /></label>
        <label className="field-label">تعداد بسته موجود<input className="field-input" type="number" min="1" step="1" required value={form.count} onChange={e => setForm(p => ({ ...p, count: e.target.value }))} /></label>
        <label className="field-label">حداقل سفارش (بسته)<input className="field-input" type="number" min="1" step="1" required value={form.minimum} onChange={e => setForm(p => ({ ...p, minimum: e.target.value }))} /></label>
      </div>
      <label className="field-label">توضیحات<textarea className="field-input min-h-24" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></label>
      <div className="flex gap-2"><Button type="submit" disabled={busy}><Save className="ml-2 size-4" />ذخیره تغییرات</Button><Button type="button" variant="outline" onClick={() => setEditing(null)}>انصراف</Button></div>
    </form>}
    {loadingLoads ? <p className="py-10 text-center text-sm text-muted-foreground">در حال دریافت بارهای شما…</p> : loads.length === 0 ? <div className="rounded-2xl border border-border bg-card p-8 text-center"><Package className="mx-auto mb-3 size-10 text-muted-foreground" /><p className="font-bold">هنوز باری برای مدیریت ندارید.</p><p className="mt-2 text-sm text-muted-foreground">بارهای اعلام‌شده شما پس از ثبت در این بخش نمایش داده می‌شوند.</p><Button asChild variant="outline" className="mt-4"><Link to="/announce">رفتن به بخش اعلام بار</Link></Button></div> :
      <div className="grid gap-3">{loads.map(load => <article key={load.id} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h2 className="font-extrabold">{load.name || load.product_type}</h2><p className="mt-1 text-sm text-muted-foreground">{load.city} · {load.package_type || "بسته"} {load.package_weight ?? "—"} کیلو · موجودی {load.count ?? "—"} بسته</p><p className="mt-1 text-sm">کیفیت: {qualityLabels[load.quality || ""] || load.quality || "ثبت نشده"} · قیمت پایه: {Number(load.price || 0).toLocaleString("fa-IR")} تومان/کیلو</p><p className="mt-1 text-xs text-muted-foreground">وضعیت: {statusLabels[load.status] || load.status}</p></div>
        <div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => startEdit(load)}><Pencil className="ml-1 size-4" />ویرایش</Button>{["active","pending","inactive"].includes(load.status) && <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void toggleActive(load)}>{load.status === "inactive" ? "فعال‌کردن" : "غیرفعال‌کردن"}</Button>}<Button type="button" size="sm" variant="destructive" disabled={busy} onClick={() => void removeLoad(load)}><Trash2 className="ml-1 size-4" />حذف</Button></div></div>
      </article>)}</div>}
  </div></main>;
}
