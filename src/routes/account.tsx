/* eslint-disable @typescript-eslint/no-explicit-any -- Uses the audited production members/member_roles schema. */
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ClipboardList, Package, ShieldCheck, Store, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, signOut } from "@/lib/auth";
import { pageHead } from "@/lib/marketplace";
import { RatingForm } from "@/components/rating-form";

export const Route = createFileRoute("/account")({
  head: () => pageHead("حساب کاربری من", "مدیریت پروفایل، عضویت‌ها، بارها و سفارش‌های حساب ترابار."),
  component: AccountPage,
});

type Member = { id: string; full_name: string | null; phone: string | null; city: string | null; verification_status: string | null };
type MemberRole = { id: string; role_code: string; approval_status: string; created_at: string };
type Load = { id: string; name: string | null; product_type: string | null; engine: string | null; city: string | null; quantity: number | null; count: number | null; price: number | null; status: string; created_at: string };
type Order = { id: string; load_id: string | null; seller_member_id: string | null; buyer_member_id: string | null; quantity: number | null; unit: string | null; total_price: number | null; status: string; payment_status: string | null; delivery_status: string | null; created_at: string };

const roleLabels: Record<string, string> = { supplier: "تأمین‌کننده", seller: "بارفروش / حجره‌دار", bar_seller: "بارفروش / حجره‌دار", buyer: "خریدار", special_buyer: "خریدار", professional_buyer: "خریدار" };
const approvalLabels: Record<string, string> = { pending: "در انتظار بررسی", approved: "تأییدشده", rejected: "ردشده" };
const loadLabels: Record<string, string> = { active: "فعال", pending: "در انتظار بررسی", inactive: "غیرفعال", rejected: "ردشده", sold_out: "تمام‌شده", expired: "منقضی‌شده", published: "منتشرشده" };
const orderLabels: Record<string, string> = { pending: "در انتظار پاسخ", accepted: "تأییدشده", confirmed: "تأییدشده", rejected: "ردشده", shipped: "ارسال‌شده", delivered: "تحویل‌شده", cancelled: "لغوشده" };
const paymentLabels: Record<string, string> = { unpaid: "پرداخت‌نشده", pending: "در انتظار تأیید", paid: "پرداخت‌شده", failed: "ناموفق", refunded: "بازپرداخت‌شده" };

function AccountPage() {
  const { user, loading, roles } = useAuth();
  const navigate = useNavigate();
  const [member, setMember] = useState<Member | null>(null);
  const [memberRoles, setMemberRoles] = useState<MemberRole[]>([]);
  const [loads, setLoads] = useState<Load[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadAccount() {
      if (!user) { setBusy(false); return; }
      setBusy(true);
      setError("");
      try {
        const { data: profile, error: profileError } = await (supabase as any)
          .from("members")
          .select("id, full_name, phone, city, verification_status")
          .eq("auth_user_id", user.id)
          .maybeSingle();
        if (!active) return;
        if (profileError) throw profileError;
        if (!profile) {
          setMember(null); setMemberRoles([]); setLoads([]); setOrders([]);
          setBusy(false);
          return;
        }
        setMember(profile as Member);
        const [roleResult, loadResult, orderResult] = await Promise.all([
          (supabase as any).from("member_roles")
            .select("id, role_code, approval_status, created_at")
            .eq("member_id", profile.id).order("created_at", { ascending: false }),
          (supabase as any).from("loads")
            .select("id, name, product_type, engine, city, quantity, count, price, status, created_at")
            .or("member_id.eq." + profile.id + ",owner_member_id.eq." + profile.id)
            .order("created_at", { ascending: false }).limit(50),
          (supabase as any).from("orders")
            .select("id, load_id, seller_member_id, buyer_member_id, quantity, unit, total_price, status, payment_status, delivery_status, created_at")
            .or("buyer_member_id.eq." + profile.id + ",seller_member_id.eq." + profile.id)
            .order("created_at", { ascending: false }).limit(50),
        ]);
        if (!active) return;
        setMemberRoles((roleResult.data ?? []) as MemberRole[]);
        setLoads((loadResult.data ?? []) as Load[]);
        setOrders((orderResult.data ?? []) as Order[]);
        const errors = [roleResult.error, loadResult.error, orderResult.error].filter(Boolean);
        if (errors.length) setError("بخشی از سوابق به‌دلیل محدودیت دسترسی دیتابیس بارگذاری نشد؛ اطلاعاتی که نمایش داده می‌شود از داده‌های قابل‌دسترسی است.");
      } catch (e) {
        console.error("[Terrabar account] load failed", e);
        if (active) setError("اطلاعات حساب دریافت نشد. دوباره صفحه را بارگذاری کنید.");
      } finally {
        if (active) setBusy(false);
      }
    }
    void loadAccount();
    return () => { active = false; };
  }, [user?.id]);

  async function handleSignOut() {
    await signOut();
    await navigate({ to: "/auth" });
  }

  if (loading || busy) return <section className="site-container py-16 text-center text-sm text-muted-foreground">در حال بارگذاری حساب کاربری…</section>;
  if (!user) return <section className="site-container max-w-xl py-16 text-center"><UserRound className="mx-auto size-10 text-primary" /><h1 className="mt-4 text-2xl font-extrabold">ورود به حساب کاربری</h1><p className="mt-2 text-sm text-muted-foreground">برای مشاهده پروفایل، عضویت‌ها، بارها و سفارش‌ها ابتدا وارد شوید.</p><Button asChild className="mt-6"><Link to="/auth">ورود / ثبت‌نام</Link></Button></section>;

  return (
    <section className="bg-market-surface py-8 sm:py-12">
      <div className="site-container grid gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-sm font-semibold text-primary">TERRABAR</p><h1 className="mt-1 text-2xl font-extrabold sm:text-3xl">حساب کاربری من</h1><p className="mt-2 text-sm text-muted-foreground">پروفایل، عضویت‌ها، بارهای من و سوابق سفارش در یک صفحه.</p></div><Button asChild variant="outline"><Link to="/requests" hash="tracking"><ClipboardList className="ml-2 size-4" />پیگیری درخواست‌ها و سفارش‌ها</Link></Button>
          <Button variant="outline" onClick={handleSignOut}>خروج از حساب</Button>
        </div>
        {error && <p role="status" className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5 md:col-span-1">
            <div className="flex items-center gap-2"><UserRound className="size-5 text-primary" /><h2 className="font-bold">اطلاعات پروفایل</h2></div>
            {member ? <dl className="mt-4 grid gap-3 text-sm">
              <div><dt className="text-muted-foreground">نام و نام خانوادگی</dt><dd className="mt-1 font-semibold">{member.full_name || "ثبت نشده"}</dd></div>
              <div><dt className="text-muted-foreground">شماره تماس</dt><dd dir="ltr" className="mt-1 text-right font-semibold">{member.phone || user.email || "ثبت نشده"}</dd></div>
              <div><dt className="text-muted-foreground">شهر عضویت</dt><dd className="mt-1 font-semibold">{member.city || "ثبت نشده"}</dd></div>
              <div><dt className="text-muted-foreground">شناسه حساب</dt><dd className="mt-1 break-all text-xs text-muted-foreground">{user.id}</dd></div>
            </dl> : <div className="mt-4 text-sm text-muted-foreground"><p>پروفایل عضویت هنوز ایجاد نشده است.</p><Button asChild className="mt-4 w-full"><Link to="/membership">تکمیل عضویت</Link></Button></div>}
          </div>
          <div className="rounded-xl border border-border bg-card p-5 md:col-span-2">
            <div className="flex items-center gap-2"><ShieldCheck className="size-5 text-primary" /><h2 className="font-bold">عضویت‌ها و دسترسی‌ها</h2></div>
            {memberRoles.length ? <ul className="mt-4 grid gap-3 sm:grid-cols-2">{memberRoles.map(r => <li key={r.id} className="rounded-lg border border-border p-4"><div className="flex items-center justify-between gap-2"><span className="font-semibold">{roleLabels[r.role_code] || r.role_code}</span><span className="rounded-full bg-secondary px-2.5 py-1 text-xs">{approvalLabels[r.approval_status] || r.approval_status}</span></div><p className="mt-2 text-xs text-muted-foreground">{r.approval_status === "approved" ? "امکانات این نقش طبق سطح دسترسی و شهر مجاز فعال است." : r.approval_status === "pending" ? "پس از بررسی مدیر، وضعیت و امکانات به‌روزرسانی می‌شود." : "برای پیگیری یا ارسال مجدد درخواست به بخش عضویت بروید."}</p></li>)}</ul> : <p className="mt-4 text-sm text-muted-foreground">هنوز نقش یا درخواست عضویتی برای این حساب ثبت نشده است.</p>}
            <div className="mt-4 flex flex-wrap gap-2"><Button asChild variant="outline"><Link to="/membership">پیگیری / درخواست عضویت</Link></Button><Button asChild variant="outline"><Link to="/requests">جست‌وجو و درخواست بار</Link></Button>{memberRoles.some(r => r.approval_status === "approved" && ["supplier", "bar_seller", "seller"].includes(r.role_code.toLowerCase())) && <Button asChild><Link to="/requests#professional">خرید ویژه حرفه‌ای (همه استان‌ها)</Link></Button>}</div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5"><Package className="size-5 text-primary" /><p className="mt-3 text-sm text-muted-foreground">بارهای ثبت‌شده</p><p className="mt-1 text-2xl font-extrabold">{loads.length}</p><p className="mt-1 text-xs text-muted-foreground">{loads.filter(l => l.status === "active" || l.status === "published").length} بار فعال / منتشرشده</p></div>
          <div className="rounded-xl border border-border bg-card p-5"><ClipboardList className="size-5 text-primary" /><p className="mt-3 text-sm text-muted-foreground">سفارش‌های مرتبط</p><p className="mt-1 text-2xl font-extrabold">{orders.length}</p><p className="mt-1 text-xs text-muted-foreground">خریدهای شما و سفارش‌های بارهای شما</p></div>
          <div className="rounded-xl border border-border bg-card p-5"><ShieldCheck className="size-5 text-primary" /><p className="mt-3 text-sm text-muted-foreground">نقش‌های تأییدشده</p><p className="mt-1 text-2xl font-extrabold">{memberRoles.filter(r => r.approval_status === "approved").length}</p><p className="mt-1 text-xs text-muted-foreground">نقش‌های فعال ثبت‌شده در سامانه</p></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><Store className="size-5 text-primary" /><h2 className="text-lg font-bold">بارهای من</h2></div><Button asChild size="sm"><Link to="/announce">ثبت / مدیریت بار <ArrowLeft className="mr-1 size-4" /></Link></Button></div>
          {!loads.length ? <p className="mt-4 text-sm text-muted-foreground">هنوز باری برای این حساب ثبت نشده است.</p> : <div className="mt-4 grid gap-3">{loads.map(l => <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4"><div><p className="font-semibold">{l.name || [l.product_type, l.engine].filter(Boolean).join(" ") || "بار بدون عنوان"}</p><p className="mt-1 text-xs text-muted-foreground">{l.city || "شهر ثبت نشده"} · {l.count ?? "—"} بسته · {Number(l.price ?? 0).toLocaleString("fa-IR")} تومان/کیلو</p></div><span className="rounded-full bg-secondary px-3 py-1 text-xs">{loadLabels[l.status] || l.status}</span></div>)}</div>}
        </div>
        <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold">سوابق سفارش</h2><Button asChild variant="outline" size="sm"><Link to="/requests">رفتن به درخواست بار <ArrowLeft className="mr-1 size-4" /></Link></Button></div>
          {!orders.length ? <p className="mt-4 text-sm text-muted-foreground">هنوز سفارشی برای این حساب ثبت نشده است.</p> : <div className="mt-4 grid gap-3">{orders.map(o => <div key={o.id} className="rounded-lg border border-border p-4"><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold">سفارش {o.id.slice(0, 8)}</span><span className="rounded-full bg-secondary px-3 py-1 text-xs">{orderLabels[o.status] || o.status}</span></div><p className="mt-2 text-sm text-muted-foreground">{o.quantity ?? "—"} {o.unit || "واحد"} · مبلغ {Number(o.total_price ?? 0).toLocaleString("fa-IR")} تومان</p><p className="mt-1 text-xs text-muted-foreground">پرداخت: {paymentLabels[o.payment_status || "unpaid"] || o.payment_status || "نامشخص"} · تحویل: {orderLabels[o.delivery_status || ""] || o.delivery_status || "در انتظار ثبت وضعیت"}</p><p className="mt-1 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("fa-IR")}</p>{member && o.buyer_member_id === member.id && (["delivered", "received", "completed"].includes(o.status) || o.delivery_status === "delivered") && <div className="mt-3 grid gap-2 sm:grid-cols-2">{o.load_id && <RatingForm key={`${o.id}-load`} orderId={o.id} reviewerMemberId={member.id} targetType="load" targetId={o.load_id} title="امتیاز به بار خریداری‌شده" />}{o.seller_member_id && o.seller_member_id !== member.id && <RatingForm key={`${o.id}-seller`} orderId={o.id} reviewerMemberId={member.id} targetType="member" targetId={o.seller_member_id} title="امتیاز به فروشنده" />}</div>}</div>)}</div>}
        </div>
        <div className="flex flex-wrap gap-3"><Button asChild variant="outline"><Link to="/requests">درخواست بار</Link></Button><Button asChild variant="outline"><Link to="/membership">عضویت و تأییدها</Link></Button><Button asChild variant="outline"><Link to="/seller-accounting-preview">امور مالی و گردش حساب</Link></Button>{roles.some(r => r === "supplier" || r === "seller" || r === "bar_seller") && <Button asChild variant="outline"><Link to="/announce">مدیریت محصولات</Link></Button>}</div>
      </div>
    </section>
  );
}
