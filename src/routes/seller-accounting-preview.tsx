/* eslint-disable @typescript-eslint/no-explicit-any */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ArrowLeft, ArrowRightLeft, CalendarDays, CheckCircle2, Clock3, FileText, Landmark, LoaderCircle, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { pageHead } from "@/lib/marketplace";

export const Route = createFileRoute("/seller-accounting-preview")({
  head: () => pageHead("امور مالی و گردش حساب | ترابار", "مشاهده گردش مالی، اطلاعات بانکی و صورت‌حساب عضو ترابار."),
  component: SellerAccountingPage,
});

const money = (v: number) => new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 0 }).format(Math.round(v)) + " تومان";
const fmtDate = (v: string) => new Intl.DateTimeFormat("fa-IR", { dateStyle: "medium" }).format(new Date(v));
const cleanIban = (v: string) => v.replace(/[\s-]/g, "").toUpperCase();

function SellerAccountingPage() {
  const { user, loading } = useAuth();
  const [memberId, setMemberId] = useState("");
  const [bank, setBank] = useState<any>(null);
  const [bankName, setBankName] = useState("");
  const [holder, setHolder] = useState("");
  const [iban, setIban] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      if (!user) { setBusy(false); return; }
      setBusy(true); setError("");
      const { data: member, error: me } = await (supabase as any).from("members").select("id").eq("auth_user_id", user.id).maybeSingle();
      if (me || !member?.id) {
        if (active) { setError("عضویت متصل به این حساب پیدا نشد. با حساب کاربری اصلی ترابار وارد شوید."); setBusy(false); }
        return;
      }
      const id = String(member.id);
      const [b, o, t] = await Promise.all([
        (supabase as any).from("seller_bank_accounts").select("id,bank_name,account_holder_name,iban,verification_status").eq("member_id", id).maybeSingle(),
        (supabase as any).from("orders").select("id,seller_member_id,buyer_member_id,total_price,created_at,status,payment_status,delivery_status").or(`seller_member_id.eq.${id},buyer_member_id.eq.${id}`).order("created_at", { ascending: false }),
        (supabase as any).from("seller_financial_transactions").select("id,order_id,transaction_type,amount,description,reference_code,transaction_date,payout_status,processed_at").eq("member_id", id).order("transaction_date", { ascending: false }),
      ]);
      if (!active) return;
      if (b.error) setError("خواندن حساب بانکی ناموفق بود: " + b.error.message);
      else if (b.data) { setBank(b.data); setBankName(b.data.bank_name); setHolder(b.data.account_holder_name); setIban(b.data.iban); }
      if (o.error) setError("خواندن سفارش‌ها ناموفق بود: " + o.error.message); else setOrders(o.data ?? []);
      if (t.error) setError("خواندن تراکنش‌ها ناموفق بود: " + t.error.message); else setTransactions(t.data ?? []);
      setMemberId(id); setBusy(false);
    }
    if (!loading) void load();
    return () => { active = false; };
  }, [user, loading]);

  const delivered = orders.filter(o => o.seller_member_id === memberId && String(o.payment_status ?? "").toLowerCase() === "paid" && String(o.delivery_status ?? "").toLowerCase() === "delivered" && !["cancelled", "canceled", "refunded"].includes(String(o.status ?? "").toLowerCase()));
  const salesTotal = delivered.reduce((s, o) => s + Number(o.total_price ?? 0), 0);
  const commissionTotal = transactions.filter(t => t.transaction_type === "commission").reduce((s, t) => s + Number(t.amount ?? 0), 0);
  const netSalesTotal = Math.max(0, salesTotal - (commissionTotal || Math.round(salesTotal * 0.05 * 100) / 100));
  const receiptsTotal = transactions.filter(t => t.transaction_type === "receipt").reduce((s, t) => s + Number(t.amount ?? 0), 0);
  const payoutsTotal = transactions.filter(t => t.transaction_type === "payout" && t.payout_status === "success").reduce((s, t) => s + Number(t.amount ?? 0), 0);
  const reservedPayouts = transactions.filter(t => t.transaction_type === "payout" && ["pending", "in_progress"].includes(String(t.payout_status ?? ""))).reduce((s, t) => s + Number(t.amount ?? 0), 0);
  const adjustmentCredits = transactions.filter(t => t.transaction_type === "adjustment").reduce((s, t) => s + Number(t.amount ?? 0), 0);
  const availableBalance = Math.max(0, receiptsTotal + adjustmentCredits - payoutsTotal - reservedPayouts);
  const due = availableBalance;
  const entries = useMemo(() => [
    ...orders.map(o => ({ id: String(o.id), date: String(o.created_at), title: o.seller_member_id === memberId ? "فروش / سفارش دریافتی" : "خرید / صورتحساب پرداختنی", detail: "وضعیت تحویل: " + (o.delivery_status || o.status || "ثبت‌شده"), amount: (o.buyer_member_id === memberId && o.seller_member_id !== memberId ? -1 : 1) * Number(o.total_price ?? 0), status: "پرداخت: " + (o.payment_status ?? "نامشخص") })),
    ...transactions.map(t => ({ id: String(t.id), date: String(t.transaction_date), title: t.transaction_type === "receipt" ? "اعتبار فروش خالص" : t.transaction_type === "commission" ? "کارمزد ترابار (۵٪)" : t.transaction_type === "payout" ? "واریز به حساب بانکی / برداشت از مانده" : "اصلاح حساب", detail: String(t.description ?? "") + (t.reference_code ? " · شناسه پیگیری: " + t.reference_code : ""), amount: ["commission", "payout"].includes(String(t.transaction_type)) ? -Number(t.amount ?? 0) : Number(t.amount ?? 0), status: t.transaction_type === "payout" ? (t.payout_status === "success" ? "واریز موفق" : t.payout_status === "failed" ? "ناموفق" : t.payout_status === "in_progress" ? "در حال انجام" : "در انتظار واریز") + (t.processed_at ? " · " + fmtDate(t.processed_at) : "") : "ثبت‌شده" })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [orders, transactions]);
  const filtered = entries.filter(e => (!from || e.date.slice(0, 10) >= from) && (!to || e.date.slice(0, 10) <= to));

  async function saveBank(e: FormEvent) {
    e.preventDefault(); setError(""); setNotice("");
    const normalized = cleanIban(iban);
    if (!/^IR\d{24}$/.test(normalized)) { setError("شماره شبا باید با IR شروع شود و پس از آن ۲۴ رقم داشته باشد."); return; }
    if (!bankName.trim() || !holder.trim() || !memberId) { setError("نام بانک، صاحب حساب و ورود به حساب کاربری لازم است."); return; }
    setSaving(true);
    const payload = { member_id: memberId, bank_name: bankName.trim(), account_holder_name: holder.trim(), iban: normalized, verification_status: "pending", updated_at: new Date().toISOString() };
    const result = bank
      ? await (supabase as any).from("seller_bank_accounts").update(payload).eq("id", bank.id).select("id,bank_name,account_holder_name,iban,verification_status").single()
      : await (supabase as any).from("seller_bank_accounts").insert(payload).select("id,bank_name,account_holder_name,iban,verification_status").single();
    setSaving(false);
    if (result.error) { setError("ذخیره اطلاعات بانکی انجام نشد: " + result.error.message); return; }
    setBank(result.data); setNotice("اطلاعات بانکی ذخیره شد و در انتظار تأیید مدیر است.");
  }

  if (loading || busy) return <main dir="rtl" className="mx-auto max-w-3xl p-8 text-center"><LoaderCircle className="mx-auto mb-3 size-7 animate-spin" />در حال دریافت اطلاعات مالی…</main>;
  if (!user) return <main dir="rtl" className="mx-auto max-w-3xl p-6"><Link to="/auth" className="inline-flex items-center gap-2 text-primary"><ArrowLeft className="size-4" /> ورود به ترابار</Link><p className="mt-4 rounded-xl border bg-card p-5">برای مشاهده صورت‌حساب ابتدا وارد شوید.</p></main>;

  return <main dir="rtl" className="min-h-[70vh] bg-market-surface px-4 py-8 sm:py-12"><div className="mx-auto w-full max-w-3xl">
    <Link to="/account" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-primary"><ArrowLeft className="size-4" /> بازگشت به حساب کاربری</Link>
    <header className="mb-6 rounded-3xl bg-emerald-950 px-5 py-7 text-white shadow-lg sm:px-8"><span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold"><Wallet className="size-4" /> TERRABAR | ترابار</span><h1 className="mt-3 text-2xl font-black">امور مالی و گردش حساب اعضا</h1><p className="mt-2 text-sm leading-7 text-emerald-50/90">صورت‌حساب خرید و فروش، تراکنش‌ها، مانده و اطلاعات حساب بانکی عضو در یک صفحه.</p></header>
    {error && <p role="alert" className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
    {notice && <p role="status" className="mb-4 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">{notice}</p>}
    <section className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold"><Landmark className="size-5" /> ۱. اطلاعات حساب بانکی</h2>
      <form onSubmit={saveBank} className="space-y-4">
        <label className="block space-y-2 text-sm font-semibold">نام بانک<input className="w-full rounded-lg border border-input bg-background px-3 py-3 font-normal" value={bankName} onChange={e => setBankName(e.target.value)} placeholder="مثلاً بانک ملت" maxLength={100} required /></label>
        <label className="block space-y-2 text-sm font-semibold">نام و نام خانوادگی صاحب حساب<input className="w-full rounded-lg border border-input bg-background px-3 py-3 font-normal" value={holder} onChange={e => setHolder(e.target.value)} placeholder="مطابق نام صاحب حساب" maxLength={160} required /></label>
        <label className="block space-y-2 text-sm font-semibold">شماره شبا<input className="w-full rounded-lg border border-input bg-background px-3 py-3 font-normal" dir="ltr" value={iban} onChange={e => setIban(e.target.value.toUpperCase())} placeholder="IR000000000000000000000000" autoComplete="off" maxLength={29} required /><span className="block text-xs font-normal leading-5 text-muted-foreground">شماره شبا با IR و ۲۴ رقم وارد شود.</span></label>
        {bank && <p className="flex items-center gap-2 rounded-lg bg-muted p-3 text-sm">{bank.verification_status === "verified" ? <CheckCircle2 className="size-4 text-emerald-600" /> : <Clock3 className="size-4" />} وضعیت: {bank.verification_status === "verified" ? "تأییدشده" : bank.verification_status === "rejected" ? "ردشده" : "در انتظار بررسی مدیر"}</p>}
        <button disabled={saving} className="w-full rounded-xl bg-primary px-4 py-3 font-bold text-primary-foreground disabled:opacity-50">{saving ? "در حال ذخیره…" : "ذخیره اطلاعات بانکی"}</button>
      </form>
    </section>
    <section className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"><h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold"><ArrowRightLeft className="size-5" /> ۲. گردش حساب</h2>
      <div className="mb-4 rounded-2xl bg-emerald-950 p-5 text-white"><p className="text-sm text-emerald-100">جمع حساب · فروش قطعی تحویل‌شده</p><p className="mt-2 text-3xl font-black">{money(salesTotal)}</p><p className="mt-2 text-xs leading-5 text-emerald-100">مجموع ناخالص سفارش‌های پرداخت‌شده و تحویل‌شده.</p></div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950"><p className="text-sm">کارمزد ترابار (۵٪)</p><p className="mt-2 text-xl font-extrabold">{money(commissionTotal || Math.round(salesTotal * 0.05 * 100) / 100)}</p></div><div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950"><p className="text-sm">سهم خالص فروشنده (۹۵٪)</p><p className="mt-2 text-xl font-extrabold">{money(netSalesTotal)}</p></div><div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950"><p className="text-sm">مانده قابل تسویه پس از کسر تسویه‌های در انتظار</p><p className="mt-2 text-xl font-extrabold">{money(due)}</p></div><div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950"><p className="text-sm">دریافتی خالص ثبت‌شده</p><p className="mt-2 text-xl font-extrabold">{money(receiptsTotal)}</p><p className="mt-1 text-xs">تسویه‌های موفق بانکی: {money(payoutsTotal)}</p></div></div>
      <p className="mt-3 text-xs leading-5 text-muted-foreground">رسیدها فقط از دفتر مالی خوانده می‌شوند؛ کاربر نمی‌تواند خودش دریافتی ثبت کند.</p>
    </section>
    <section className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"><h2 className="mb-3 flex items-center gap-2 text-lg font-extrabold"><Landmark className="size-5" /> اتصال به درگاه پرداخت و دریافت صورت‌حساب</h2><p className="text-sm leading-7 text-muted-foreground">اتصال واقعی به درگاه هنوز برای این پروژه پیکربندی نشده است؛ برای فعال‌سازی باید درگاه مورد تأیید ترابار و کلیدهای امن آن در سمت سرور تنظیم و تأیید بازگشت پرداخت پیاده‌سازی شود. این صفحه فعلاً هیچ پرداختی انجام نمی‌دهد و وضعیت پرداخت را از روی کلیک کاربر تغییر نمی‌دهد.</p><button type="button" disabled className="mt-3 w-full cursor-not-allowed rounded-xl border border-border bg-muted px-4 py-3 text-sm font-bold text-muted-foreground">اتصال به درگاه — پس از پیکربندی فعال می‌شود</button></section><section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6"><h2 className="mb-4 flex items-center gap-2 text-lg font-extrabold"><FileText className="size-5" /> صورت‌حساب</h2>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="space-y-2 text-sm">از تاریخ<input className="w-full rounded-lg border border-input bg-background px-3 py-2" type="date" value={from} onChange={e => setFrom(e.target.value)} /></label><label className="space-y-2 text-sm">تا تاریخ<input className="w-full rounded-lg border border-input bg-background px-3 py-2" type="date" value={to} onChange={e => setTo(e.target.value)} /></label></div>
      <p className="mb-3 flex items-center gap-2 text-sm text-muted-foreground"><CalendarDays className="size-4" /> {filtered.length.toLocaleString("fa-IR")} مورد</p>
      {filtered.length === 0 ? <p className="rounded-xl bg-muted/50 p-5 text-center text-sm leading-6 text-muted-foreground">هنوز سفارشی یا تراکنشی برای این حساب ثبت نشده است.</p> : <div className="space-y-3">{filtered.map(e => <article key={e.id + e.title} className="rounded-xl border border-border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-bold">{e.title}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{fmtDate(e.date)} · {e.detail}</p><p className="mt-1 text-xs text-muted-foreground">{e.status}</p></div><p className={`shrink-0 font-extrabold tabular-nums ${e.amount < 0 ? "text-destructive" : "text-emerald-700"}`}>{e.amount < 0 ? "−" : "+"}{money(Math.abs(e.amount))}</p></div></article>)}</div>}
    </section>
    <p className="mt-4 rounded-xl border border-border bg-card p-4 text-xs leading-6 text-muted-foreground">گردش حساب از دفتر مالی ثبت‌شده می‌آید. تسویه‌های در انتظار از مانده قابل تسویه رزرو می‌شوند؛ وضعیت موفق فقط پس از انتقال واقعی وجه و ثبت شناسه پیگیری بانکی نمایش داده می‌شود.</p>
  </div></main>;
}
