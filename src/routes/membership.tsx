/* eslint-disable @typescript-eslint/no-explicit-any -- Dynamic queries target the audited production Supabase schema; generated client types are stale. */
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, Clock3, Send, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth, type AppRole } from '@/lib/auth';
import { pageHead, provinces, provinceCities } from '@/lib/marketplace';
import { CityPicker } from '@/components/city-picker';

export const Route = createFileRoute("/membership")({
  head: () => pageHead('درخواست عضویت', 'درخواست عضویت به‌عنوان خریدار، تأمین‌کننده یا بارفروش در ترابار؛ پس از تأیید مدیر فعال می‌شود.'),
  component: MembershipPage,
});

const roleLabels: Record<AppRole, string> = { admin: 'مدیر', city_manager: 'مدیر شهری', supplier: 'تأمین‌کننده (باغدار، کشاورز، سورتینگ)', seller: 'بارفروش / حجره‌دار میدان', buyer: 'خریدار' };
const statusLabels: Record<string, string> = { pending: 'در انتظار بررسی مدیر', approved: 'تأیید شده', rejected: 'رد شده' };

type Request = { id: string; role_code: string; approval_status: string; created_at: string; request_note?: string | null };

// UI role labels are user-friendly; the production database requires bar_seller.
const roleToCode: Partial<Record<AppRole, string>> = { supplier: 'supplier', seller: 'bar_seller', buyer: 'buyer' };
const roleFromCode = (code: string): AppRole => code === 'bar_seller' ? 'seller' : code as AppRole;

function MembershipPage() {
  const { user, loading } = useAuth();
  const [requests, setRequests] = useState<Request[]>([]);
  const [role, setRole] = useState<AppRole>('supplier');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [province, setProvince] = useState('البرز');
  const [city, setCity] = useState('کرج');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [resubmitNotes, setResubmitNotes] = useState<Record<string, string>>({});

  function refresh() {
    if (!user) return;
    (supabase as any).from('member_roles').select('id, role_code, approval_status, created_at, request_note, members!inner(auth_user_id)').eq('members.auth_user_id', user.id).order('created_at', { ascending: false })
      .then(({ data }: { data: unknown }) => setRequests((data ?? []) as unknown as Request[]));
  }
  useEffect(refresh, [user]);

  async function resubmitRole(request: Request) {
    if (!user || request.approval_status !== 'rejected') return;
    const note = (resubmitNotes[request.id] ?? '').trim();
    if (!note) { setError('برای درخواست مجدد، لطفاً یک توضیح کوتاه بنویسید.'); return; }
    if (note.length > 500) { setError('متن توضیح حداکثر ۵۰۰ نویسه باشد.'); return; }
    setBusy(true);
    setError('');
    const { error: updateError } = await (supabase as any)
      .from('member_roles')
      .update({ approval_status: 'pending', approved_by: null, approved_at: null, request_note: note })
      .eq('id', request.id)
      .eq('approval_status', 'rejected');
    if (updateError) {
      setError('ارسال مجدد انجام نشد. لطفاً دوباره تلاش کنید یا با مدیر تماس بگیرید.');
    } else {
      setResubmitNotes(current => ({ ...current, [request.id]: '' }));
      refresh();
    }
    setBusy(false);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    if (!province.trim() || !city.trim()) { setError("استان و شهر محل فعالیت را انتخاب کنید."); return; }
    setBusy(true);
    setError('');
    // Create or reuse the caller's member profile in the production schema.
    const { data: existingMember, error: lookupError } = await (supabase as any)
      .from('members').select('id').eq('auth_user_id', user.id).maybeSingle();

    if (lookupError) {
      setError('بررسی پروفایل انجام نشد؛ کمی بعد دوباره تلاش کنید.');
      setBusy(false);
      return;
    }

    let memberId = existingMember?.id;
    if (!memberId) {
      const { data: newMember, error: memberInsertError } = await (supabase as any)
        .from('members')
        .insert({ auth_user_id: user.id, full_name: fullName.trim(), phone: phone.trim(), city, role, verification_status: 'pending', products: description.trim() || null })
        .select('id')
        .single();
      if (memberInsertError || !newMember) {
        setError('ساخت پروفایل انجام نشد؛ اطلاعات را بررسی کنید یا با مدیر تماس بگیرید.');
        setBusy(false);
        return;
      }
      memberId = newMember.id;
    }

    const requestedRoleCode = roleToCode[role] ?? role;
    const { data: existingRequest, error: requestLookupError } = await (supabase as any)
      .from('member_roles')
      .select('id, approval_status')
      .eq('member_id', memberId)
      .eq('role_code', requestedRoleCode)
      .maybeSingle();

    if (requestLookupError) {
      setError('بررسی درخواست قبلی انجام نشد؛ کمی بعد دوباره تلاش کنید.');
      setBusy(false);
      return;
    }

    if (existingRequest?.approval_status === 'rejected') {
      const { error: resubmitError } = await (supabase as any)
        .from('member_roles')
        .update({ approval_status: 'pending', approved_by: null, approved_at: null })
        .eq('id', existingRequest.id)
        .eq('approval_status', 'rejected');
      if (resubmitError) {
        setError('ارسال دوباره درخواست انجام نشد؛ کمی بعد تلاش کنید.');
      } else {
        setSaved(true);
        refresh();
      }
    } else if (existingRequest) {
      setError(existingRequest.approval_status === 'approved'
        ? 'این نقش قبلاً تأیید شده است.'
        : 'درخواست این نقش قبلاً ثبت شده و در انتظار بررسی است.');
    } else {
      const { error: roleInsertError } = await (supabase as any).from('member_roles').insert({
        member_id: memberId,
        role_code: requestedRoleCode,
        approval_status: 'pending',
        approved_by: null,
        approved_at: null,
      });
      if (roleInsertError) {
        setError(roleInsertError.code === '23505' ? 'این درخواست نقش قبلاً ثبت شده است.' : 'ثبت درخواست عضویت انجام نشد؛ دوباره تلاش کنید.');
      } else {
        setSaved(true);
        refresh();
      }
    }
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
            <label className="field-label">شماره تماس<input required dir="ltr" value={phone} onChange={e => setPhone(e.target.value)} className="field-input text-left" placeholder="09…" /></label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="field-label"><label htmlFor="membership-province">استان محل فعالیت</label><CityPicker value={province} onChange={value => { setProvince(value); setCity(""); }} id="membership-province" options={provinces} placeholder="جست‌وجوی استان…" /></div>
              <div className="field-label"><label htmlFor="membership-city">شهر محل فعالیت</label><CityPicker value={city} onChange={setCity} id="membership-city" options={provinceCities[province] ?? []} disabled={!province} placeholder={province ? "جست‌وجو و انتخاب شهر همین استان…" : "ابتدا استان را انتخاب کنید…"} /></div>
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
                  <strong>{(roleLabels[roleFromCode(request.role_code)] ?? request.role_code)}</strong>
                  <span className={`flex items-center gap-1 text-xs ${request.approval_status === 'approved' ? 'text-primary' : request.approval_status === 'rejected' ? 'text-destructive' : 'text-muted-foreground'}`}>
                    {request.approval_status === 'approved' ? <CheckCircle2 className="size-4" /> : request.approval_status === 'rejected' ? <XCircle className="size-4" /> : <Clock3 className="size-4" />}
                    {statusLabels[request.approval_status]}
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">تاریخ درخواست: {new Date(request.created_at).toLocaleDateString('fa-IR')}</p>
                {request.request_note && <p className="mt-2 rounded bg-muted p-2 text-sm">توضیح ثبت‌شده: {request.request_note}</p>}
                {request.approval_status === 'rejected' && (
                  <div className="mt-3 grid gap-2">
                    <label className="field-label">توضیح کوتاه برای درخواست مجدد
                      <textarea value={resubmitNotes[request.id] ?? ''} onChange={e => setResubmitNotes(current => ({ ...current, [request.id]: e.target.value }))} maxLength={500} className="field-input min-h-20 resize-y" placeholder="مثلاً: اطلاعات فعالیت خود را تکمیل کرده‌ام؛ لطفاً درخواست را دوباره بررسی کنید." />
                    </label>
                    <Button type="button" disabled={busy} onClick={() => resubmitRole(request)}><Send className="size-4" />{busy ? 'در حال ارسال…' : 'ارسال درخواست مجدد'}</Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div></section>
  );
}
