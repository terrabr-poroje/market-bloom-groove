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

const roleLabels: Record<string, string> = { admin: 'مدیر', supplier: 'تأمین‌کننده', seller: 'بارفروش', buyer: 'خریدار' };
const qualityLabels: Record<string, string> = { premium: 'ویژه', standard: 'استاندارد', economy: 'اقتصادی', negotiated: 'توافقی' };

type MemberRequest = { id: string; user_id: string; requested_role: AppRole; full_name: string; phone: string; city: string | null; description: string | null; status: string; created_at: string };
type PendingLoad = { id: string; product_name: string; variety: string | null; quality: string; city: string; price_per_kg: number; stock_packages: number; status: string; created_at: string };

function AdminPage() {
  const { user, loading, isAdmin } = useAuth();
  const [tab, setTab] = useState<'requests' | 'loads'>('requests');
  const [requests, setRequests] = useState<MemberRequest[]>([]);
  const [pendingLoads, setPendingLoads] = useState<PendingLoad[]>([]);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});

  function refresh() {
    supabase.from('member_requests').select('*').eq('status', 'pending').order('created_at', { ascending: false })
      .then(({ data }) => setRequests((data ?? []) as MemberRequest[]));
    supabase.from('loads').select('id, product_name, variety, quality, city, price_per_kg, stock_packages, status, created_at').eq('status', 'pending').order('created_at', { ascending: false })
      .then(({ data }) => setPendingLoads((data ?? []) as PendingLoad[]));
  }
  useEffect(() => { if (isAdmin) refresh(); }, [isAdmin]);

  async function approveRequest(request: MemberRequest) {
    await supabase.from('member_requests').update({ status: 'approved', reviewed_by: user!.id, reviewed_at: new Date().toISOString() }).eq('id', request.id);
    await supabase.from('user_roles').upsert({ user_id: request.user_id, role: request.requested_role }, { onConflict: 'user_id,role' });
    refresh();
  }
  async function rejectRequest(request: MemberRequest) {
    await supabase.from('member_requests').update({ status: 'rejected', reject_reason: rejectReason[request.id] || null, reviewed_by: user!.id, reviewed_at: new Date().toISOString() }).eq('id', request.id);
    refresh();
  }
  async function publishLoad(load: PendingLoad) {
    await supabase.from('loads').update({ status: 'published' }).eq('id', load.id);
    refresh();
  }
  async function rejectLoad(load: PendingLoad) {
    await supabase.from('loads').update({ status: 'rejected' }).eq('id', load.id);
    refresh();
  }

  if (loading) return <section className="py-16 text-center text-sm text-muted-foreground">در حال بارگذاری…</section>;
  if (!user || !isAdmin) {
    return (
      <section className="bg-market-surface py-16"><div className="site-container max-w-md text-center">
        <ShieldAlert className="mx-auto mb-4 size-12 text-warning" />
        <h1 className="text-2xl font-extrabold">دسترسی محدود به مدیران</h1>
        <p className="mt-3 text-sm text-muted-foreground">این بخش فقط برای مدیران ترابار فعال است.</p>
        <Button asChild className="mt-6"><Link to="/">بازگشت به بازار</Link></Button>
      </div></section>
    );
  }

  return (
    <section className="bg-market-surface py-12"><div className="site-container">
      <h1 className="text-2xl font-extrabold sm:text-3xl">پنل مدیریت ترابار</h1>
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
                <div><strong>{request.full_name}</strong><span className="mr-2 rounded bg-secondary px-2 py-0.5 text-xs">{roleLabels[request.requested_role]}</span></div>
                <span className="text-xs text-muted-foreground" dir="ltr">{request.phone}</span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{request.city}{request.description ? ` — ${request.description}` : ''}</p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={() => approveRequest(request)}><CheckCircle2 />تأیید عضویت</Button>
                <input className="field-input h-9 max-w-56 text-xs" placeholder="دلیل رد (اختیاری)" value={rejectReason[request.id] ?? ''} onChange={e => setRejectReason(prev => ({ ...prev, [request.id]: e.target.value }))} />
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
                <strong>{load.product_name} {load.variety}</strong>
                <span className="mr-2 rounded bg-secondary px-2 py-0.5 text-xs">{qualityLabels[load.quality]}</span>
                <p className="mt-1 text-xs text-muted-foreground">{load.city} · {faNumber(load.stock_packages)} بسته · هر کیلو {faNumber(load.price_per_kg)} تومان</p>
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
