/* eslint-disable @typescript-eslint/no-explicit-any -- Dynamic queries target the audited production Supabase schema; generated client types are stale. */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from 'react';
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
type PendingLoad = { id: string; name: string; engine: string | null; quality: string | null; city: string; price: number; count: number | null; quantity: number; unit: string; status: string; created_at: string };

function AdminPage() {
  const { user, loading, isAdmin, roles } = useAuth();
  const canManage = isAdmin || roles.includes('city_manager');
  const [tab, setTab] = useState<'requests' | 'loads'>('requests');
  const [requests, setRequests] = useState<MemberRequest[]>([]);
  const [pendingLoads, setPendingLoads] = useState<PendingLoad[]>([]);

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

  if (loading) return <section className="py-16 text-center text-sm text-muted-foreground">در حال بارگذاری…</section>;
  if (!user || !canManage) {
    return (
      <section className="bg-market-surface py-16"><div className="site-container max-w-md text-center">
        <ShieldAlert className="mx-auto mb-4 size-12 text-warning" />
        <h1 className="text-2xl font-extrabold">دسترسی محدود به مدیران</h1>
        <p className="mt-3 text-sm text-muted-foreground">این بخش فقط برای مدیران ترابار فعال است.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3"><Button asChild><Link to="/auth">ورود مدیر ترابار</Link></Button><Button asChild variant="outline"><Link to="/">بازگشت به بازار</Link></Button></div>
      </div></section>
    );
  }

  return (
    <section className="bg-market-surface py-12"><div className="site-container">
      <h1 className="text-2xl font-extrabold sm:text-3xl">پنل مدیریت ترابار</h1>
      {!isAdmin && <p className="mt-2 text-sm text-muted-foreground">دسترسی شما فقط به درخواست‌ها و بارهای شهرهای تخصیص‌یافته محدود است.</p>}
      <div className="mt-6 flex gap-2 border-b border-border">
        <Button variant={tab === 'requests' ? 'default' : 'ghost'} onClick={() => setTab('requests')}><Users />درخواست‌های عضویت ({faNumber(requests.length)})</Button>
        <Button variant={tab === 'loads' ? 'default' : 'ghost'} onClick={() => setTab('loads')}><Package />بارهای در انتظار تأیید ({faNumber(pendingLoads.length)})</Button>
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
