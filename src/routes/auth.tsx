import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from 'react';
import { CheckCircle2, LogIn, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { pageHead } from '@/lib/marketplace';

export const Route = createFileRoute("/auth")({
  head: () => pageHead('ورود و ثبت‌نام', 'ورود یا ساخت حساب کاربری در ترابار؛ بازار میوه و تره‌بار ایران.'),
  component: AuthPage,
});

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    if (mode === 'signup') {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
      });
      if (signUpError) setError('ثبت‌نام انجام نشد؛ ایمیل یا رمز عبور را بررسی کنید.');
      else setDone(true);
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) setError('ورود انجام نشد؛ ایمیل یا رمز عبور نادرست است.');
      else navigate({ to: '/' });
    }
    setBusy(false);
  }

  if (!loading && user) {
    return (
      <section className="bg-market-surface py-16"><div className="site-container max-w-md text-center">
        <CheckCircle2 className="mx-auto mb-4 size-12 text-primary" />
        <h1 className="text-2xl font-extrabold">به ترابار خوش آمدید</h1>
        <p className="mt-3 text-sm text-muted-foreground">شما وارد حساب خود شده‌اید.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button asChild><Link to="/membership">درخواست عضویت</Link></Button>
          <Button asChild variant="outline"><Link to="/">بازگشت به بازار</Link></Button>
        </div>
      </div></section>
    );
  }

  if (done) {
    return (
      <section className="bg-market-surface py-16"><div className="site-container max-w-md text-center">
        <CheckCircle2 className="mx-auto mb-4 size-12 text-primary" />
        <h1 className="text-2xl font-extrabold">ایمیل تأیید ارسال شد</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">برای فعال‌شدن حساب، روی پیوندی که به ایمیل شما ارسال شد بزنید و سپس وارد شوید.</p>
        <Button className="mt-6" onClick={() => { setDone(false); setMode('login'); }}>رفتن به ورود</Button>
      </div></section>
    );
  }

  return (
    <section className="bg-market-surface py-12 sm:py-16"><div className="site-container max-w-md">
      <div className="rounded-lg border border-border bg-card p-6 sm:p-8">
        <h1 className="text-2xl font-extrabold">{mode === 'login' ? 'ورود به ترابار' : 'ثبت‌نام در ترابار'}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{mode === 'login' ? 'با ایمیل و رمز عبور وارد حساب خود شوید.' : 'حساب بسازید؛ سپس درخواست عضویت به‌عنوان خریدار، تأمین‌کننده یا بارفروش ثبت کنید.'}</p>
        <form onSubmit={submit} className="mt-6 grid gap-4">
          {mode === 'signup' && <label className="field-label">نام و نام خانوادگی<input required value={fullName} onChange={e => setFullName(e.target.value)} className="field-input" placeholder="مثلاً امیر قهرمانی" /></label>}
          <label className="field-label">ایمیل<input required type="email" dir="ltr" value={email} onChange={e => setEmail(e.target.value)} className="field-input text-left" placeholder="you@example.com" /></label>
          <label className="field-label">رمز عبور<input required type="password" dir="ltr" minLength={6} value={password} onChange={e => setPassword(e.target.value)} className="field-input text-left" placeholder="حداقل ۶ کاراکتر" /></label>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={busy}>{mode === 'login' ? <LogIn /> : <UserPlus />}{busy ? 'در حال انجام…' : mode === 'login' ? 'ورود' : 'ساخت حساب'}</Button>
        </form>
        <Button variant="link" className="mt-4 w-full" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}>
          {mode === 'login' ? 'حساب ندارید؟ ثبت‌نام کنید' : 'حساب دارید؟ وارد شوید'}
        </Button>
      </div>
    </div></section>
  );
}
