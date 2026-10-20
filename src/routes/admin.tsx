/* eslint-disable @typescript-eslint/no-explicit-any -- Dynamic queries target the audited production Supabase schema; generated client types are stale. */
import { createFileRoute, Link } from "@tanstack/react-router";
import React, { useEffect, useState } from 'react';
import { CheckCircle2, Eye, Package, ShieldAlert, Users, XCircle, Landmark, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth, type AppRole } from '@/lib/auth';
import { faNumber, pageHead } from '@/lib/marketplace';

export const Route = createFileRoute("/admin")({
  head: () => pageHead('پنل مدیریت', 'بررسی و تأیید درخواست‌های عضویت و بارهای اعلام‌شده در ترابار.'),
  component: AdminPage,
});

const roleLabels: Record<string, string> = { admin: 'مدیر', supplier: 'تأمین‌کننده', seller: 'بارفروش', bar_seller: 'بارفروش', buyer: 'خریدار' };
const qualityLabels: Record<string, string> = { premium: 'ویژه', standard: 'استاندارد', economy: 'اقتصادی', negotiated: 'توافقی' };

type MemberRequest = { id: string; member_id: string; role_code: string; approval_status: string; created_at: string; request_note?: string | null; members: { full_name: string; phone: string; city: string } | null };
type AdminOrder = { id: string; customer_name: string; customer_city: string; quantity: number; unit: string; price: number; total_price: number; status: string; payment_status: string; delivery_status: string; created_at: string };
type AdminPurchaseRequest = { id: string; product_type: string; quantity: number; quantity_unit: string; destination_city: string | null; quality_requirements: string | null; needed_by: string | null; notes: string | null; status: string; created_at: string };
type ManagerCandidate = { auth_user_id: string; full_name: string; city: string; role: string };
type CityManager = { id: string; auth_user_id: string; display_name: string; login_username: string; city: string; is_active: boolean };
type PendingLoad = { id: string; name: string; engine: string | null; quality: string | null; city: string; price: number; count: number | null; quantity: number; unit: string; status: string; created_at: string };
type SiteVisit = { id: string; user_id: string; route: string; visited_at: string; members: { full_name: string | null; phone: string | null; city: string | null } | null };
type SiteVisitSummary = { total_visits: number; unique_visitors: number; visits_last_24_hours: number; visitors_last_24_hours: number };
type AdminRating = { id: string; order_id: string; reviewer_member_id: string; target_type: string; score: number; review_text: string | null; created_at: string; messages: { id: string; sender_user_id: string; message: string; created_at: string }[] };
type AdminBankAccount = { id: string; member_id: string; bank_name: string; account_holder_name: string; iban: string; verification_status: string; members: { full_name: string; phone: string | null; city: string | null } | null };
type AdminFinanceTransaction = { id: string; member_id: string; order_id: string | null; transaction_type: string; amount: number; description: string; reference_code: string | null; transaction_date: string; payout_status: string; members: { full_name: string; phone: string | null } | null };

function AdminPage() {
  const { user, loading, isAdmin, roles } = useAuth();
  const canManage = isAdmin || roles.includes('city_manager');
  const [tab, setTab] = useState<'requests' | 'loads' | 'orders' | 'purchases' | 'managers' | 'reviews' | 'visits' | 'finance'>('requests');
  const [managerCandidates, setManagerCandidates] = useState<ManagerCandidate[]>([]);
  const [cityManagers, setCityManagers] = useState<CityManager[]>([]);
  const [activeCities, setActiveCities] = useState<string[]>([]);
  const [managerUserId, setManagerUserId] = useState('');
  const [managerName, setManagerName] = useState('');
  const [managerUsername, setManagerUsername] = useState('');
  const [managerCity, setManagerCity] = useState('');
  const [managerBusy, setManagerBusy] = useState(false);
  const [managerError, setManagerError] = useState('');
  const [managerNotice, setManagerNotice] = useState('');
  const [requests, setRequests] = useState<MemberRequest[]>([]);
  const [pendingLoads, setPendingLoads] = useState<PendingLoad[]>([]);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [purchaseRequests, setPurchaseRequests] = useState<AdminPurchaseRequest[]>([]);
  const [visitSummary, setVisitSummary] = useState<SiteVisitSummary | null>(null);
  const [recentVisits, setRecentVisits] = useState<SiteVisit[]>([]);
  const [ratings, setRatings] = useState<AdminRating[]>([]);
  const [ratingReplies, setRatingReplies] = useState<Record<string, string>>({});
  const [ratingReplyBusy, setRatingReplyBusy] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<AdminBankAccount[]>([]);
  const [financeTransactions, setFinanceTransactions] = useState<AdminFinanceTransaction[]>([]);
  const [payoutAmounts, setPayoutAmounts] = useState<Record<string, string>>({});
  const [payoutReferences, setPayoutReferences] = useState<Record<string, string>>({});
  const [financeBusy, setFinanceBusy] = useState(false);
  const [financeNotice, setFinanceNotice] = useState('');
  const [financeError, setFinanceError] = useState('');


  function refresh() {
    (supabase as any).from('member_roles')
      .select('id, member_id, role_code, approval_status, created_at, request_note, members!inner(full_name, phone, city)')
      .eq('approval_status', 'pending')
      .order('created_at', { ascending: false })
      .then(({ data }: { data: MemberRequest[] | null }) => setRequests(data ?? []));
    (supabase as any).from('loads')
      .select('id, name, engine, quality, city, price, count, quantity, unit, status, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .then(({ data }: { data: PendingLoad[] | null }) => setPendingLoads(data ?? []));
    (supabase as any).from('orders')
      .select('id, customer_name, customer_city, quantity, unit, price, total_price, status, payment_status, delivery_status, created_at')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }: { data: AdminOrder[] | null }) => setOrders(data ?? []));
    (supabase as any).from('purchase_requests')
      .select('id, product_type, quantity, quantity_unit, destination_city, quality_requirements, needed_by, notes, status, created_at')
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }: { data: AdminPurchaseRequest[] | null }) => setPurchaseRequests(data ?? []));
    if (isAdmin) {
      void (supabase as any).from('ratings')
        .select('id, order_id, reviewer_member_id, target_type, score, review_text, created_at')
        .order('created_at', { ascending: false }).limit(100)
        .then(async ({ data, error }: { data: Omit<AdminRating, 'messages'>[] | null; error: unknown }) => {
          if (error || !data) return;
          const ids = data.map(item => item.id);
          let messages: AdminRating['messages'] = [];
          if (ids.length) {
            const result = await (supabase as any).from('rating_messages')
              .select('id, rating_id, sender_user_id, message, created_at')
              .in('rating_id', ids).order('created_at', { ascending: true });
            if (!result.error && result.data) messages = result.data;
          }
          setRatings(data.map(item => ({ ...item, messages: messages.filter((message: any) => message.rating_id === item.id) })));
        });
    }
    if (isAdmin) {
      void (supabase as any).from('site_visit_summary').select('*').maybeSingle()
        .then(({ data, error }: { data: SiteVisitSummary | null; error: unknown }) => { if (!error) setVisitSummary(data); });
      void (supabase as any).from('site_visits')
        .select('id, user_id, route, visited_at, members(full_name, phone, city)')
        .order('visited_at', { ascending: false }).limit(100)
        .then(({ data, error }: { data: SiteVisit[] | null; error: unknown }) => { if (!error) setRecentVisits(data ?? []); });
      void (supabase as any).from('seller_bank_accounts')
        .select('id, member_id, bank_name, account_holder_name, iban, verification_status, members!inner(full_name, phone, city)')
        .order('created_at', { ascending: false })
        .then(({ data, error }: { data: AdminBankAccount[] | null; error: unknown }) => { if (!error) setBankAccounts(data ?? []); });
      void (supabase as any).from('seller_financial_transactions')
        .select('id, member_id, order_id, transaction_type, amount, description, reference_code, transaction_date, payout_status, members!inner(full_name, phone)')
        .order('transaction_date', { ascending: false }).limit(300)
        .then(({ data, error }: { data: AdminFinanceTransaction[] | null; error: unknown }) => { if (!error) setFinanceTransactions(data ?? []); });

      void supabase.functions.invoke('admin-manage-city-manager', { body: { action: 'list' } }).then(({ data, error }) => {
        if (error || !data) { setManagerError('فهرست مدیران شهر دریافت نشد.'); return; }
        setManagerCandidates((data.members ?? []) as ManagerCandidate[]);
        setCityManagers((data.managers ?? []) as CityManager[]);
        setActiveCities((data.cities ?? []).map((item: { city_name: string }) => item.city_name));
      });
    }
  }
  useEffect(() => { if (canManage) refresh(); }, [canManage]);

  async function sendRatingReply(ratingId: string) {
    const message = (ratingReplies[ratingId] ?? '').trim();
    if (!message || !user) return;
    setRatingReplyBusy(true);
    const { error } = await (supabase as any).from('rating_messages').insert({ rating_id: ratingId, sender_user_id: user.id, message });
    if (error) window.alert('ارسال پاسخ انجام نشد. دسترسی مدیر و اتصال دیتابیس را بررسی کنید.');
    else { setRatingReplies(current => ({ ...current, [ratingId]: '' })); refresh(); }
    setRatingReplyBusy(false);
  }

  async function approveRequest(request: MemberRequest) {
    const { error } = await (supabase as any).from('member_roles')
      .update({ approval_status: 'approved', approved_by: user!.id, approved_at: new Date().toISOString() })
      .eq('id', request.id);
    if (error) { window.alert('تأیید عضویت انجام نشد؛ دسترسی مدیر را بررسی کنید.'); return; }
    refresh();
  }
  async function rejectRequest(request: MemberRequest) {
    const { error } = await (supabase as any).from('member_roles')
      .update({ approval_status: 'rejected', approved_by: null, approved_at: null })
      .eq('id', request.id);
    if (error) { window.alert('رد درخواست انجام نشد؛ دسترسی مدیر را بررسی کنید.'); return; }
    refresh();
  }
  async function publishLoad(load: PendingLoad) {
    const { error } = await (supabase as any).from('loads').update({ status: 'active' }).eq('id', load.id);
    if (error) { window.alert('انتشار بار انجام نشد؛ دسترسی مدیر را بررسی کنید.'); return; }
    refresh();
  }
  async function rejectLoad(load: PendingLoad) {
    const { error } = await (supabase as any).from('loads').update({ status: 'rejected' }).eq('id', load.id);
    if (error) { window.alert('رد بار انجام نشد؛ دسترسی مدیر را بررسی کنید.'); return; }
    refresh();
  }
  async function saveCityManager(event: React.FormEvent) {
    event.preventDefault(); setManagerBusy(true); setManagerError(''); setManagerNotice('');
    const selected = managerCandidates.find(item => item.auth_user_id === managerUserId);
    if (!selected || !managerCity || !managerName.trim() || !managerUsername.trim()) { setManagerError('حساب، نام و نام کاربری و شهر را کامل انتخاب کنید.'); setManagerBusy(false); return; }
    const { data, error } = await supabase.functions.invoke('admin-manage-city-manager', { body: { action: 'assign', targetAuthUserId: managerUserId, city: managerCity, displayName: managerName.trim(), username: managerUsername.trim() } });
    if (error || data?.error) { setManagerError(data?.error ?? 'ثبت مدیر شهر انجام نشد.'); setManagerBusy(false); return; }
    setManagerNotice(data?.message ?? 'مدیر شهر ثبت شد.');
    const { data: refreshed } = await supabase.functions.invoke('admin-manage-city-manager', { body: { action: 'list' } });
    if (refreshed) { setManagerCandidates((refreshed.members ?? []) as ManagerCandidate[]); setCityManagers((refreshed.managers ?? []) as CityManager[]); setActiveCities((refreshed.cities ?? []).map((item: { city_name: string }) => item.city_name)); }
    setManagerBusy(false);
  }
  async function deactivateCityManager(manager: CityManager) {
    if (!window.confirm(`دسترسی مدیریتی ${manager.display_name} غیرفعال شود؟`)) return;
    const { data, error } = await supabase.functions.invoke('admin-manage-city-manager', { body: { action: 'deactivate', targetAuthUserId: manager.auth_user_id } });
    if (error || data?.error) { setManagerError(data?.error ?? 'غیرفعال‌سازی انجام نشد.'); return; }
    setManagerNotice(data?.message ?? 'مدیر شهر غیرفعال شد.');
    const { data: refreshed } = await supabase.functions.invoke('admin-manage-city-manager', { body: { action: 'list' } });
    if (refreshed) { setManagerCandidates((refreshed.members ?? []) as ManagerCandidate[]); setCityManagers((refreshed.managers ?? []) as CityManager[]); setActiveCities((refreshed.cities ?? []).map((item: { city_name: string }) => item.city_name)); }
  }
  async function updatePurchaseStatus(request: AdminPurchaseRequest, status: string) {
    const { error } = await (supabase as any).from('purchase_requests').update({ status }).eq('id', request.id);
    if (error) { window.alert('تغییر وضعیت درخواست خرید انجام نشد؛ محدوده شهر و دسترسی مدیر را بررسی کنید.'); return; }
    refresh();
  }
  async function verifyBankAccount(account: AdminBankAccount, status: 'verified' | 'rejected') {
    setFinanceBusy(true); setFinanceError(''); setFinanceNotice('');
    const { error } = await (supabase as any).from('seller_bank_accounts')
      .update({ verification_status: status, updated_at: new Date().toISOString() }).eq('id', account.id);
    if (error) setFinanceError('تغییر وضعیت حساب بانکی انجام نشد: ' + error.message);
    else { setFinanceNotice(status === 'verified' ? 'حساب بانکی تأیید شد.' : 'حساب بانکی رد شد.'); refresh(); }
    setFinanceBusy(false);
  }

  async function createSellerPayout(memberId: string) {
    const amount = Number(payoutAmounts[memberId] ?? '');
    if (!Number.isFinite(amount) || amount <= 0) { setFinanceError('مبلغ تسویه را به‌صورت عدد مثبت وارد کنید.'); return; }
    setFinanceBusy(true); setFinanceError(''); setFinanceNotice('');
    const { data, error } = await (supabase as any).rpc('terrabar_admin_create_payout', {
      p_member_id: memberId, p_amount: amount,
      p_reference_code: (payoutReferences[memberId] ?? '').trim() || null,
      p_description: 'تسویه فروشنده ثبت‌شده توسط مدیر کل'
    });
    if (error) setFinanceError('ثبت تسویه انجام نشد: ' + error.message);
    else {
      setFinanceNotice('درخواست تسویه در وضعیت «در انتظار» ثبت شد. پس از انتقال واقعی وجه، وضعیت را موفق کنید.');
      setPayoutAmounts(current => ({ ...current, [memberId]: '' }));
      refresh();
    }
    setFinanceBusy(false);
  }

  async function updateSellerPayout(tx: AdminFinanceTransaction, status: 'in_progress' | 'success' | 'failed') {
    if (status === 'success' && !window.confirm('آیا انتقال واقعی وجه به حساب بانکی فروشنده انجام شده و رسید یا شناسه انتقال را بررسی کرده‌اید؟ فقط در این صورت «موفق» را تأیید کنید.')) return;
    setFinanceBusy(true); setFinanceError(''); setFinanceNotice('');
    const { error } = await (supabase as any).rpc('terrabar_admin_update_payout_status', {
      p_transaction_id: tx.id, p_status: status, p_reference_code: (payoutReferences[tx.id] ?? '').trim() || tx.reference_code
    });
    if (error) setFinanceError('به‌روزرسانی تسویه انجام نشد: ' + error.message);
    else { setFinanceNotice('وضعیت تسویه به‌روزرسانی شد.'); refresh(); }
    setFinanceBusy(false);
  }


  if (loading) return <section className="py-16 text-center text-sm text-muted-foreground">در حال بارگذاری…</section>;
  if (!user || !canManage) {
    return (
      <section className="bg-market-surface py-16"><div className="site-container max-w-md text-center">
        <ShieldAlert className="mx-auto mb-4 size-12 text-warning" />
        <h1 className="text-2xl font-extrabold">دسترسی محدود به مدیران</h1>
        <p className="mt-3 text-sm text-muted-foreground">این بخش فقط برای مدیران ترابار فعال است.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3"><Button asChild><Link to="/admin-login">ورود مدیر ترابار</Link></Button><Button asChild variant="outline"><Link to="/">بازگشت به بازار</Link></Button></div>
      </div></section>
    );
  }

  return (
    <section className="bg-market-surface py-12"><div className="site-container">
      <h1 className="text-2xl font-extrabold sm:text-3xl">پنل مدیریت ترابار</h1>
      {!isAdmin && <p className="mt-2 text-sm text-muted-foreground">دسترسی شما فقط به درخواست‌ها و بارهای شهرهای تخصیص‌یافته محدود است.</p>}
      <div className="mt-6 flex flex-wrap gap-2 border-b border-border pb-3">
        <Button variant={tab === 'requests' ? 'default' : 'ghost'} onClick={() => setTab('requests')}><Users />عضویت ({faNumber(requests.length)})</Button>
        <Button variant={tab === 'loads' ? 'default' : 'ghost'} onClick={() => setTab('loads')}><Package />بارهای در انتظار تأیید ({faNumber(pendingLoads.length)})</Button>
        <Button variant={tab === 'orders' ? 'default' : 'ghost'} onClick={() => setTab('orders')}>سفارش‌ها ({faNumber(orders.length)})</Button>
        <Button variant={tab === 'purchases' ? 'default' : 'ghost'} onClick={() => setTab('purchases')}>درخواست‌های خرید ({faNumber(purchaseRequests.length)})</Button>
        {isAdmin && <Button variant={tab === 'managers' ? 'default' : 'ghost'} onClick={() => setTab('managers')}>مدیران شهر</Button>}
        {isAdmin && <Button variant={tab === 'reviews' ? 'default' : 'ghost'} onClick={() => setTab('reviews')}>نظرات خریداران ({faNumber(ratings.length)})</Button>}
        {isAdmin && <Button variant={tab === 'visits' ? 'default' : 'ghost'} onClick={() => setTab('visits')}><Eye />آمار بازدیدها</Button>}
        {isAdmin && <Button variant={tab === 'finance' ? 'default' : 'ghost'} onClick={() => setTab('finance')}><Wallet />حساب‌ها و تسویه فروشندگان</Button>}
      </div>

      {tab === 'requests' && (
        <div className="mt-6 grid gap-4">
          {requests.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">درخواست در انتظاری وجود ندارد.</p>}
          {requests.map(request => (
            <div key={request.id} className="rounded-lg border border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div><strong>{request.members?.full_name ?? 'نام ثبت نشده'}</strong><span className="mr-2 rounded bg-secondary px-2 py-0.5 text-xs">{(roleLabels[request.role_code] ?? request.role_code)}</span></div>
                <span className="text-xs text-muted-foreground" dir="ltr">{request.members?.phone ?? '—'}</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{request.members?.city ?? 'شهر ثبت نشده'}</p>
              {request.request_note && <p className="mt-3 rounded-md bg-muted p-3 text-sm leading-6"><strong>توضیح متقاضی:</strong> {request.request_note}</p>}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={() => approveRequest(request)}><CheckCircle2 />تأیید عضویت</Button>
                <Button size="sm" variant="outline" onClick={() => rejectRequest(request)}><XCircle />رد درخواست</Button>
              </div>
            </div>
          ))}
        </div>
      )}



      {tab === 'managers' && isAdmin && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-lg font-bold">تخصیص مدیر شهر</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">فقط حسابی را انتخاب کنید که قبلاً ثبت‌نام کرده و ایمیل آن تأیید شده باشد. مدیر شهر فقط به شهر تعیین‌شده دسترسی می‌گیرد.</p>
            <form className="mt-5 grid gap-4" onSubmit={saveCityManager}>
              <label className="field-label">حساب کاربری
                <select required className="field-input" value={managerUserId} onChange={event => { const item = managerCandidates.find(candidate => candidate.auth_user_id === event.target.value); setManagerUserId(event.target.value); if (item) { setManagerName(item.full_name); setManagerUsername(item.full_name); setManagerCity(item.city || activeCities[0] || ''); } }}>
                  <option value="">انتخاب کاربر ثبت‌نام‌شده</option>
                  {managerCandidates.map(item => <option key={item.auth_user_id} value={item.auth_user_id}>{item.full_name} — {item.city} ({item.role})</option>)}
                </select>
              </label>
              <label className="field-label">نام و نام خانوادگی مدیر<input required className="field-input" value={managerName} onChange={event => setManagerName(event.target.value)} /></label>
              <label className="field-label">نام کاربری ورود<input required className="field-input" value={managerUsername} onChange={event => setManagerUsername(event.target.value)} /></label>
              <label className="field-label">شهر تحت مدیریت<select required className="field-input" value={managerCity} onChange={event => setManagerCity(event.target.value)}><option value="">انتخاب شهر</option>{activeCities.map(city => <option key={city} value={city}>{city}</option>)}</select></label>
              {managerError && <p role="alert" className="text-sm text-destructive">{managerError}</p>}
              {managerNotice && <p role="status" className="text-sm text-primary">{managerNotice}</p>}
              <Button type="submit" disabled={managerBusy}>{managerBusy ? 'در حال ذخیره…' : 'ثبت / به‌روزرسانی مدیر شهر'}</Button>
            </form>
          </div>
          <div className="grid content-start gap-3">
            <h2 className="text-lg font-bold">فهرست مدیران شهر</h2>
            {cityManagers.length === 0 && <p className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">هنوز مدیر شهری تعریف نشده است.</p>}
            {cityManagers.map(manager => <div key={manager.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><strong>{manager.display_name || manager.login_username}</strong><p className="mt-1 text-sm text-muted-foreground">نام کاربری: {manager.login_username} · شهر: {manager.city}</p><p className="mt-1 text-xs">{manager.is_active ? 'فعال' : 'غیرفعال'}</p></div>
                {manager.is_active && <Button type="button" variant="outline" size="sm" onClick={() => void deactivateCityManager(manager)}>غیرفعال‌کردن</Button>}
              </div>
            </div>)}
          </div>
        </div>
      )}

      {tab === 'finance' && isAdmin && (
        <div className="mt-6 grid gap-6">
          <div>
            <h2 className="text-lg font-bold">حساب بانکی و تسویه فروشندگان</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">اطلاعات حساب فقط برای مدیر کل قابل مشاهده است. حساب بانکی را پس از بررسی تأیید کنید. وضعیت «موفق» فقط پس از انتقال واقعی وجه ثبت شود.</p>
          </div>
          {financeError && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{financeError}</p>}
          {financeNotice && <p role="status" className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900">{financeNotice}</p>}
          {bankAccounts.length === 0 && <p className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">هنوز حساب بانکی فروشنده‌ای ثبت نشده است.</p>}
          {bankAccounts.map(account => {
            const txs = financeTransactions.filter(tx => tx.member_id === account.member_id);
            const netCredits = txs.filter(tx => tx.transaction_type === 'receipt').reduce((sum, tx) => sum + Number(tx.amount), 0);
            const successfulPayouts = txs.filter(tx => tx.transaction_type === 'payout' && tx.payout_status === 'success').reduce((sum, tx) => sum + Number(tx.amount), 0);
            const reservedPayouts = txs.filter(tx => tx.transaction_type === 'payout' && ['pending', 'in_progress'].includes(tx.payout_status)).reduce((sum, tx) => sum + Number(tx.amount), 0);
            const adjustmentCredits = txs.filter(tx => tx.transaction_type === 'adjustment').reduce((sum, tx) => sum + Number(tx.amount), 0);
            const available = Math.max(0, netCredits + adjustmentCredits - successfulPayouts - reservedPayouts);
            return <article key={account.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><strong>{account.members?.full_name ?? 'عضو ترابار'}</strong><p className="mt-1 text-sm text-muted-foreground">{account.members?.phone ?? 'شماره ثبت نشده'} · {account.members?.city ?? 'شهر ثبت نشده'}</p></div>
                <span className="rounded-full bg-secondary px-3 py-1 text-xs">{account.verification_status === 'verified' ? 'حساب تأییدشده' : account.verification_status === 'rejected' ? 'حساب ردشده' : 'در انتظار بررسی'}</span>
              </div>
              <div className="mt-4 grid gap-2 rounded-lg bg-muted/50 p-3 text-sm">
                <p className="flex items-center gap-2"><Landmark className="size-4" />{account.bank_name} · صاحب حساب: {account.account_holder_name}</p>
                <p dir="ltr" className="text-right font-mono">{account.iban}</p>
                <p>اعتبار خالص فروش: {faNumber(netCredits)} تومان · تسویه موفق: {faNumber(successfulPayouts)} تومان · مانده قابل تسویه: {faNumber(available)} تومان</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {account.verification_status !== 'verified' && <Button size="sm" disabled={financeBusy} onClick={() => void verifyBankAccount(account, 'verified')}><CheckCircle2 />تأیید حساب بانکی</Button>}
                {account.verification_status !== 'rejected' && <Button size="sm" variant="outline" disabled={financeBusy} onClick={() => void verifyBankAccount(account, 'rejected')}><XCircle />رد حساب بانکی</Button>}
              </div>
              {account.verification_status === 'verified' && <div className="mt-4 grid gap-3 rounded-lg border border-border p-4 sm:grid-cols-[1fr_1fr_auto]">
                <label className="field-label">مبلغ تسویه<input className="field-input mt-1" inputMode="decimal" value={payoutAmounts[account.member_id] ?? ''} onChange={event => setPayoutAmounts(current => ({ ...current, [account.member_id]: event.target.value }))} placeholder="مبلغ" /></label>
                <label className="field-label">شناسه/مرجع بانکی<input className="field-input mt-1" value={payoutReferences[account.member_id] ?? ''} onChange={event => setPayoutReferences(current => ({ ...current, [account.member_id]: event.target.value }))} placeholder="پس از انتقال تکمیل شود" /></label>
                <div className="self-end"><Button disabled={financeBusy || available <= 0} onClick={() => void createSellerPayout(account.member_id)}>ثبت تسویه در انتظار</Button></div>
              </div>}
            </article>;
          })}
          <section className="grid gap-3">
            <h3 className="text-lg font-bold">درخواست‌ها و سوابق تسویه</h3>
            {financeTransactions.filter(tx => tx.transaction_type === 'payout').length === 0 && <p className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">تسویه‌ای ثبت نشده است.</p>}
            {financeTransactions.filter(tx => tx.transaction_type === 'payout').map(tx => <article key={tx.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><strong>{tx.members?.full_name ?? 'فروشنده'} · {faNumber(tx.amount)} تومان</strong><p className="mt-1 text-xs text-muted-foreground">{tx.description} · {tx.reference_code ? 'مرجع: ' + tx.reference_code : 'بدون شناسه بانکی'}</p><p className="mt-1 text-xs">وضعیت: {tx.payout_status === 'success' ? 'موفق' : tx.payout_status === 'failed' ? 'ناموفق' : tx.payout_status === 'in_progress' ? 'در حال انجام' : 'در انتظار'}</p><label className="mt-2 block text-xs">شناسه/رسید انتقال<input className="field-input mt-1" value={payoutReferences[tx.id] ?? tx.reference_code ?? ''} onChange={event => setPayoutReferences(current => ({ ...current, [tx.id]: event.target.value }))} placeholder="شماره پیگیری بانک" /></label></div>
                {tx.payout_status !== 'success' && <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" disabled={financeBusy} onClick={() => void updateSellerPayout(tx, 'in_progress')}>در حال انجام</Button>
                  <Button size="sm" disabled={financeBusy} onClick={() => void updateSellerPayout(tx, 'success')}>تأیید انتقال موفق</Button>
                  <Button size="sm" variant="outline" disabled={financeBusy} onClick={() => void updateSellerPayout(tx, 'failed')}>ناموفق</Button>
                </div>}
              </div>
            </article>)}
          </section>
          <section className="grid gap-3">
            <div>
              <h3 className="text-lg font-bold">دفتر گردش حساب همه اعضا</h3>
              <p className="mt-1 text-sm text-muted-foreground">این دفتر همان سوابقی را نشان می‌دهد که هر عضو در صفحه حساب مالی خود می‌بیند؛ کارمزد و تسویه به‌صورت کاهشی نمایش داده می‌شوند.</p>
            </div>
            {financeTransactions.length === 0 && <p className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">تراکنشی در دفتر مالی ثبت نشده است.</p>}
            {financeTransactions.map(tx => {
              const label = tx.transaction_type === 'receipt' ? 'اعتبار خالص فروش' : tx.transaction_type === 'commission' ? 'کارمزد ترابار (۵٪)' : tx.transaction_type === 'payout' ? 'واریز به حساب بانکی عضو' : 'اصلاح حساب';
              const isDebit = ['commission', 'payout'].includes(tx.transaction_type);
              const payoutLabel = tx.transaction_type !== 'payout' ? 'ثبت‌شده' : tx.payout_status === 'success' ? 'موفق' : tx.payout_status === 'failed' ? 'ناموفق' : tx.payout_status === 'in_progress' ? 'در حال انجام' : 'در انتظار';
              return <article key={tx.id} className="rounded-lg border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <strong>{tx.members?.full_name ?? 'عضو ترابار'} · {label}</strong>
                    <p className="mt-1 text-xs text-muted-foreground">{tx.members?.phone ?? 'شماره ثبت نشده'} · {new Date(tx.transaction_date).toLocaleString('fa-IR')} · وضعیت: {payoutLabel}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{tx.description}{tx.reference_code ? ' · شناسه پیگیری: ' + tx.reference_code : ''}</p>
                    {tx.order_id && <p className="mt-1 text-xs text-muted-foreground">شناسه سفارش: {tx.order_id}</p>}
                  </div>
                  <strong className={isDebit ? 'text-destructive' : 'text-emerald-700'}>{isDebit ? '−' : '+'}{faNumber(tx.amount)} تومان</strong>
                </div>
              </article>;
            })}
          </section>
        </div>
      )}

      {tab === 'reviews' && isAdmin && (
        <div className="mt-6 grid gap-4">
          <div><h2 className="text-lg font-bold">نظرات و پیگیری خریداران</h2><p className="mt-1 text-sm text-muted-foreground">نظرها فقط از سفارش‌های ثبت‌شده قابل ثبت‌اند. برای بررسی دقیق‌تر می‌توانید در همان گفت‌وگو به خریدار پیام بدهید.</p></div>
          {ratings.length === 0 && <p className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">هنوز نظری ثبت نشده است.</p>}
          {ratings.map(rating => (
            <div key={rating.id} className="rounded-lg border border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2"><strong>نظر سفارش {rating.order_id.slice(0, 8)}</strong><span className="text-amber-600">{"★".repeat(Math.max(0, Math.min(5, rating.score)))}{"☆".repeat(5 - Math.max(0, Math.min(5, rating.score)))} · {rating.score}/۵</span></div>
              <p className="mt-1 text-xs text-muted-foreground">شناسه عضو خریدار: {rating.reviewer_member_id} · {rating.target_type === 'load' ? 'درباره بار' : 'درباره فروشنده'} · {new Date(rating.created_at).toLocaleString('fa-IR')}</p>
              <p className="mt-3 whitespace-pre-wrap rounded-md bg-muted p-3 text-sm">{rating.review_text || 'توضیح متنی ثبت نشده است.'}</p>
              <div className="mt-4 grid gap-2">{rating.messages.map(message => <div key={message.id} className="rounded-md border border-border p-3"><p className="text-xs text-muted-foreground">{message.sender_user_id === user?.id ? 'پاسخ شما از طرف ترابار' : 'پیام دیگر در گفت‌وگو'} · {new Date(message.created_at).toLocaleString('fa-IR')}</p><p className="mt-1 whitespace-pre-wrap text-sm">{message.message}</p></div>)}</div>
              <form className="mt-4 grid gap-2" onSubmit={event => { event.preventDefault(); void sendRatingReply(rating.id); }}>
                <label className="field-label">ارسال پیام به خریدار<textarea className="field-input mt-1 resize-y" rows={2} maxLength={2000} value={ratingReplies[rating.id] ?? ''} onChange={event => setRatingReplies(current => ({ ...current, [rating.id]: event.target.value }))} placeholder="برای بررسی دقیق‌تر، سؤال یا پیگیری خود را بنویسید…" /></label>
                <div><Button type="submit" size="sm" disabled={ratingReplyBusy || !(ratingReplies[rating.id] ?? '').trim()}>ارسال پیام</Button></div>
              </form>
            </div>
          ))}
        </div>
      )}

      {tab === 'visits' && isAdmin && (
        <div className="mt-6 grid gap-5">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-border bg-card p-5"><p className="text-sm text-muted-foreground">کل بازدیدهای جست‌وجوی بار</p><p className="mt-2 text-2xl font-extrabold">{faNumber(visitSummary?.total_visits ?? 0)}</p></div>
            <div className="rounded-lg border border-border bg-card p-5"><p className="text-sm text-muted-foreground">کاربران واردشدهٔ یکتا</p><p className="mt-2 text-2xl font-extrabold">{faNumber(visitSummary?.unique_visitors ?? 0)}</p></div>
            <div className="rounded-lg border border-border bg-card p-5"><p className="text-sm text-muted-foreground">بازدید در ۲۴ ساعت اخیر</p><p className="mt-2 text-2xl font-extrabold">{faNumber(visitSummary?.visits_last_24_hours ?? 0)}</p></div>
            <div className="rounded-lg border border-border bg-card p-5"><p className="text-sm text-muted-foreground">کاربران یکتا در ۲۴ ساعت اخیر</p><p className="mt-2 text-2xl font-extrabold">{faNumber(visitSummary?.visitors_last_24_hours ?? 0)}</p></div>
          </div>
          <div>
            <h2 className="text-lg font-bold">آخرین بازدیدهای کاربران واردشده</h2>
            <p className="mt-1 text-xs leading-6 text-muted-foreground">فقط مدیر کل این فهرست را می‌بیند. برای هر بازدید، اطلاعات پروفایل ثبت‌شده نمایش داده می‌شود؛ IP یا اثرانگشت دستگاه ذخیره نمی‌شود.</p>
            <div className="mt-4 grid gap-3">
              {recentVisits.length === 0 && <p className="rounded-lg border border-border bg-card p-5 text-sm text-muted-foreground">هنوز بازدید ثبت‌شده‌ای وجود ندارد. پس از ورود کاربر و بازکردن جست‌وجوی بار، آمار اینجا نمایش داده می‌شود.</p>}
              {recentVisits.map(visit => (
                <div key={visit.id} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div><strong>{visit.members?.full_name || 'حساب بدون پروفایل عضو'}</strong><p className="mt-1 text-xs text-muted-foreground">{visit.members?.phone || 'شماره ثبت نشده'} · {visit.members?.city || 'شهر ثبت نشده'}</p></div>
                    <span className="text-xs text-muted-foreground">{new Date(visit.visited_at).toLocaleString('fa-IR')}</span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">بخش: جست‌وجوی بار · شناسه حساب: {visit.user_id.slice(0, 8)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'orders' && (
        <div className="mt-6 grid gap-4">
          {orders.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">سفارشی برای نمایش وجود ندارد.</p>}
          {orders.map(order => (
            <div key={order.id} className="rounded-lg border border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2"><strong>سفارش {order.id.slice(0, 8)}</strong><span className="rounded bg-secondary px-2 py-1 text-xs">{order.status}</span></div>
              <p className="mt-2 text-sm">خریدار: {order.customer_name} · شهر: {order.customer_city}</p>
              <p className="mt-1 text-sm">تعداد: {faNumber(order.quantity)} {order.unit} · قیمت واحد: {faNumber(order.price)} · مبلغ کل: {faNumber(order.total_price)} تومان</p>
              <p className="mt-1 text-xs text-muted-foreground">پرداخت: {order.payment_status} · تحویل: {order.delivery_status} · {new Date(order.created_at).toLocaleDateString('fa-IR')}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'purchases' && (
        <div className="mt-6 grid gap-4">
          {purchaseRequests.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">درخواست خریدی برای نمایش وجود ندارد.</p>}
          {purchaseRequests.map(request => (
            <div key={request.id} className="rounded-lg border border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2"><strong>{request.product_type} · {faNumber(request.quantity)} {request.quantity_unit}</strong><span className="rounded bg-secondary px-2 py-1 text-xs">{request.status}</span></div>
              <p className="mt-2 text-sm">شهر مقصد: {request.destination_city ?? 'ثبت نشده'} · کیفیت: {request.quality_requirements ?? 'توافقی'}{request.needed_by ? ` · تاریخ نیاز: ${request.needed_by}` : ''}</p>
              {request.notes && <p className="mt-1 text-sm text-muted-foreground">{request.notes}</p>}
              {['new', 'in_review', 'sourcing', 'offer_ready'].includes(request.status) && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {request.status === 'new' && <Button size="sm" onClick={() => updatePurchaseStatus(request, 'in_review')}>شروع بررسی</Button>}
                  {request.status === 'in_review' && <Button size="sm" onClick={() => updatePurchaseStatus(request, 'sourcing')}>شروع تأمین</Button>}
                  {request.status === 'sourcing' && <Button size="sm" onClick={() => updatePurchaseStatus(request, 'offer_ready')}>ثبت آماده‌بودن پیشنهاد</Button>}
                  <Button size="sm" variant="outline" onClick={() => updatePurchaseStatus(request, 'rejected')}>رد درخواست</Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'loads' && (
        <div className="mt-6 grid gap-4">
          {pendingLoads.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">بار در انتظار تأییدی وجود ندارد.</p>}
          {pendingLoads.map(load => (
            <div key={load.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-5">
              <div>
                <strong>{load.name} {load.engine}</strong>
                <span className="mr-2 rounded bg-secondary px-2 py-0.5 text-xs">{qualityLabels[load.quality ?? 'standard']}</span>
                <p className="mt-1 text-xs text-muted-foreground">{load.city} · {faNumber(load.count ?? load.quantity)} بسته · هر کیلو {faNumber(load.price)} تومان</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => publishLoad(load)}><CheckCircle2 />تأیید و انتشار</Button>
                <Button size="sm" variant="outline" onClick={() => rejectLoad(load)}><XCircle />رد</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div></section>
  );
}
