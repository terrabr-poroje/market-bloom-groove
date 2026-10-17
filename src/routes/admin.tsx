/* eslint-disable @typescript-eslint/no-explicit-any -- Dynamic queries target the audited production Supabase schema; generated client types are stale. */
import { createFileRoute, Link } from "@tanstack/react-router";
import React, { useEffect, useState } from 'react';
import { CheckCircle2, Package, ShieldAlert, Users, XCircle } from 'lucide-react';
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

type MemberRequest = { id: string; member_id: string; role_code: string; approval_status: string; created_at: string; members: { full_name: string; phone: string; city: string } | null };
type AdminOrder = { id: string; customer_name: string; customer_city: string; quantity: number; unit: string; price: number; total_price: number; status: string; payment_status: string; delivery_status: string; created_at: string };
type AdminPurchaseRequest = { id: string; product_type: string; quantity: number; quantity_unit: string; destination_city: string | null; quality_requirements: string | null; needed_by: string | null; notes: string | null; status: string; created_at: string };
type ManagerCandidate = { auth_user_id: string; full_name: string; city: string; role: string };
type CityManager = { id: string; auth_user_id: string; display_name: string; login_username: string; city: string; is_active: boolean };
type PendingLoad = { id: string; name: string; engine: string | null; quality: string | null; city: string; price: number; count: number | null; quantity: number; unit: string; status: string; created_at: string };

function AdminPage() {
  const { user, loading, isAdmin, roles } = useAuth();
  const canManage = isAdmin || roles.includes('city_manager');
  const [tab, setTab] = useState<'requests' | 'loads' | 'orders' | 'purchases' | 'managers'>('requests');
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

  function refresh() {
    (supabase as any).from('member_roles')
      .select('id, member_id, role_code, approval_status, created_at, members!inner(full_name, phone, city)')
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
      void supabase.functions.invoke('admin-manage-city-manager', { body: { action: 'list' } }).then(({ data, error }) => {
        if (error || !data) { setManagerError('فهرست مدیران شهر دریافت نشد.'); return; }
        setManagerCandidates((data.members ?? []) as ManagerCandidate[]);
        setCityManagers((data.managers ?? []) as CityManager[]);
        setActiveCities((data.cities ?? []).map((item: { city_name: string }) => item.city_name));
      });
    }
  }
  useEffect(() => { if (canManage) refresh(); }, [canManage]);

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
