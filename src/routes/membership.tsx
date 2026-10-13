import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, Clock3, Send, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth, type AppRole } from '@/lib/auth';
import { cities, pageHead } from '@/lib/marketplace';

export const Route = createFileRoute("/membership")({
  head: () => pageHead('درخواست عضویت', 'درخواست عضویت به‌عنوان خریدار، تأمین‌کننده یا بارفروش در ترابار؛ پس از تأیید مدیر فعال می‌شود.'),
  component: MembershipPage,
});

const roleLabels: Record<AppRole, string> = { admin: 'مدیر', supplier: 'تأمین‌کننده (باغدار، کشاورز، سورتینگ)', seller: 'بارفروش / حجره‌دار میدان', buyer: 'خریدار' };
const statusLabels: Record<string, string> = { pending: 'در انتظار بررسی مدیر', approved: 'تأیید شده', rejected: 'رد شده' };

type Request = { id: string; requested_role: AppRole; status: string; reject_reason: string | null; created_at: string };

function MembershipPage() {
  const { user, loading } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [role, setRole] = useState<AppRole>('supplier');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState(cities[0]);
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  function refresh() {
    if (!user) return;
    supabase.from('member_requests').select('id, requested_role, status, reject_reason, created_at').order('created_at', { ascending: false })
      .then(({ data }) => setRequests((data ?? []) as Request[]));
  }
  useEffect(refresh, [user]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    setBusy(true);
    setError('');
    const { error: insertError } = await supabase.from('member_requests').insert({
      user_id: user.id, requested_role: role, full_name: fullName, phone, city, description,
    });
    if (insertError) setError('ثبت درخواست انجام نشد؛ دوباره تلاش کنید.');
    else { setSaved(true); refresh(); }
    setBusy(false);
  }

  if (loading) return <section className="py-16 text-center text-sm text-muted-foreground">در حال بارگذاری…</section>;

  if (!user) {
    return (
      <section className="bg-market-surface py-16"><div className="site-container max-w-md text-center">
        <h1 className="text-2xl font-extrabold">ابتدا وارد حساب شوید</h1>
        <p className="mt-3 text-sm text-muted-foreground">برای ثبت درخواست عضویت، ورود یا ثبت‌نام لازم است.</p>
        <Button asChild className="mt-6"><Link to="/auth">ورود / ثبت‌نام</Link></Button>
      </div></section>
    );
  }

  return (
    <section className="bg-market-surface py-12"><div className="site-container grid gap-8 lg:grid-cols-2">
      <div className="rounded-lg border border-border bg-card p-6 sm:p-8">
        <h1 className="text-2xl font-extrabold">درخواست عضویت</h1>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">نقش خود را انتخاب کنید؛ درخواست شما برای مدیر ارسال می‌شود و پس از تأیید، امکان‌های آن نقش (مانند اعلام بار) برایتان فعال می‌شود.</p>
        {saved ? (
          <div className="mt-6 text-center"><CheckCircle2 className="mx-auto mb-3 size-10 text-primary" /><p className="font-bold">درخواست شما ثبت شد</p><p className="mt-2 text-sm text-muted-foreground">نتیجه بررسی مدیر در همین صفحه نمایش داده می‌شود.</p></div>
        ) : (
          <form onSubmit={submit} className="mt-6 grid gap-4">
            <label className="field-label">نقش درخواستی
              <select className="field-input" value={role} onChange={e => setRole(e.target.value as AppRole)}>
                <option value="supplier">{roleLabels.supplier}</option>
                <option value="seller">{roleLabels.seller}</option>
                <option value="buyer">{roleLabels.buyer}</option>
              </select>
            </label>
            <label className="field-label">نام و نام خانوادگی<input required value={fullName} onChange={e => setFullName(e.target.value)} className="field-input" /></label>
            <div className="grid grid-cols-2 gap-3">
              <label className="field-label">شماره تماس<input required dir="ltr" value={phone} onChange={e => setPhone(e.target.value)} className="field-input text-left" placeholder="09…" /></label>
              <label className="field-label">شهر<select className="field-input" value={city} onChange={e => setCity(e.target.value)}>{cities.map(item => <option key={item}>{item}</option>)}</select></label>
            </div>
            <label className="field-label">توضیحات (اختیاری)<textarea value={description} onChange={e => setDescription(e.target.value)} className="field-input min-h-20 resize-y" placeholder="نوع فعالیت، محصولات، سابقه…" /></label>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" disabled={busy}><Send />{busy ? 'در حال ارسال…' : 'ارسال درخواست به مدیر'}</Button>
          </form>
        )}
      </div>
      <div className="rounded-lg border border-border bg-card p-6 sm:p-8">
        <h2 className="text-lg font-bold">درخواست‌های من</h2>
        {requests.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">هنوز درخواستی ثبت نکرده‌اید.</p> : (
          <ul className="mt-4 grid gap-3">
            {requests.map(request => (
              <li key={request.id} className="rounded-lg border border-border p-4 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <strong>{roleLabels[request.requested_role]}</strong>
                  <span className={`flex items-center gap-1 text-xs ${request.status === 'approved' ? 'text-primary' : request.status === 'rejected' ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {request.status === 'approved' ? <CheckCircle2 className="size-4" /> : request.status === 'rejected' ? <XCircle className="size-4" /> : <Clock3 className="size-4" />}
                    {statusLabels[request.status]}
                  </span>
                </div>
                {request.reject_reason && <p className="mt-2 text-xs text-destructive">دلیل رد: {request.reject_reason}</p>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div></section>
  );
}
