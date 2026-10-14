import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpLeft, CheckCircle2, ClipboardList, Handshake, PackageCheck, Search, Sprout, Store, Tractor, Truck, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { pageHead } from '@/lib/marketplace';
import heroImage from '@/assets/market-hero.jpg';

export const Route = createFileRoute("/")({
  head: () => pageHead('بازار میوه و تره‌بار کرج و ایران', 'ترابار؛ بازار تخصصی خرید و فروش عمده و خرد میوه و تره‌بار. اتصال تأمین‌کنندگان، بارفروشان و خریداران.'),
  component: Index,
});

const roles = [
  { icon: Tractor, title: 'تأمین‌کنندگان', sub: 'باغدار، کشاورز و سورتینگ', text: 'محصول باغ و مزرعه خود را با مشخصات روشن به بازار معرفی کنید و با خریداران ارتباط بگیرید.', color: 'bg-accent text-primary' },
  { icon: Store, title: 'بارفروشان و حجره‌داران', sub: 'میادین میوه و تره‌بار', text: 'بارهای موجود در حجره را معرفی کنید و ویترین محصولات خود را در دسترس بازار قرار دهید.', color: 'bg-warning-soft text-warning' },
  { icon: Users, title: 'خریداران عمده و خرد', sub: 'فروشگاه، کسب‌وکار و مصرف‌کننده', text: 'بارها را بر اساس مبدأ، کیفیت، بسته‌بندی و قیمت بررسی کنید و انتخاب مناسب‌تری داشته باشید.', color: 'bg-info-soft text-info' },
];

const steps = [
  { icon: ClipboardList, title: 'اعلام بار یا درخواست', text: 'فروشنده بار را با مشخصات کامل اعلام می‌کند و خریدار نیاز خود را جست‌وجو می‌کند.' },
  { icon: Search, title: 'مقایسه و انتخاب', text: 'بارها بر اساس شهر، کیفیت، بسته‌بندی و قیمت شفاف مقایسه می‌شوند.' },
  { icon: Handshake, title: 'ثبت سفارش و پرداخت', text: 'سفارش مستقیم ثبت می‌شود؛ بارگیری و کارگری مبدأ با فروشنده و کرایه حمل با خریدار است.' },
  { icon: Truck, title: 'ارسال و تحویل', text: 'بار با هماهنگی طرفین ارسال و تحویل قطعی آن در مقصد تأیید می‌شود.' },
];

const buyerGroups = [
  { title: 'خریداران خرده', text: 'خرید در مقیاس کوچک از بارهای شهر خودتان.' },
  { title: 'خریداران عمده', text: 'خرید عمده از بارفروشان شهر با حداقل سفارش مشخص.' },
  { title: 'خریداران ویژه', text: 'دسترسی به بارهای شهر خود و شهرهای همجوار.' },
  { title: 'خریداران ویژه حرفه‌ای', text: 'بار مستقیم از تأمین‌کننده؛ ویژه اعضای تأییدشده.' },
];

function Index() {
  return (
    <>
      <section className="market-hero relative isolate overflow-hidden bg-footer text-primary-foreground">
        <img src={heroImage} alt="بار تازه پرتقال، گوجه و سبزیجات در بازار میوه و تره‌بار" width={1920} height={1024} fetchPriority="high" className="hero-image absolute inset-0 -z-20 h-full w-full object-cover" /><div className="hero-shade absolute inset-0 -z-10" />
        <div className="site-container"><div className="hero-copy mr-auto max-w-[570px] py-16 sm:py-20"><span className="mb-5 inline-flex items-center gap-2 text-sm text-hero-muted"><span className="size-2 rounded-full bg-hero-mark" />بازاری تازه برای کسب‌وکار شما</span><h1 className="text-4xl font-extrabold leading-[1.55] sm:text-5xl">ترابار<span className="mt-1 block text-3xl font-bold leading-[1.65] sm:text-4xl">بازار میوه و تره‌بار ایران</span></h1><p className="mt-5 max-w-md text-sm leading-8 text-hero-muted sm:text-base">از باغ و مزرعه تا میدان و فروشگاه؛<br />بار مناسب را پیدا کنید، شفاف مقایسه کنید و مستقیم معامله کنید.</p><div className="mt-8 flex flex-wrap gap-3"><Button asChild size="lg"><Link to="/requests"><Search />مشاهده بارهای فعال</Link></Button><Button asChild size="lg" variant="outline" className="border-primary-foreground/30 bg-transparent text-primary-foreground"><Link to="/announce">اعلام بار<ArrowUpLeft /></Link></Button></div><div className="mt-7 flex flex-wrap gap-x-6 gap-y-3 text-xs text-hero-muted"><span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-hero-mark" />مشخصات شفاف بار</span><span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-hero-mark" />ارتباط با فروشنده</span><span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-hero-mark" />عمده و خرد</span></div></div></div>
      </section>
      <section className="border-t border-border bg-background py-12 sm:py-16"><div className="site-container"><div className="text-center"><p className="mb-3 flex items-center justify-center gap-2 text-xs font-semibold text-primary"><Sprout className="size-4" />یک بازار، برای همه حلقه‌های زنجیره</p><h2 className="text-2xl font-extrabold sm:text-3xl">شما کجای این بازار هستید؟</h2><p className="mt-4 text-sm text-muted-foreground">از تولید تا خرید؛ ترابار نقطه اتصال کسب‌وکار شماست.</p></div><div className="mt-10 grid gap-8 md:grid-cols-3">
        {roles.map(role => <div key={role.title} className="role-item border-t border-border pt-6"><div className={`mb-5 grid size-12 place-items-center rounded-lg ${role.color}`}><role.icon className="size-6" strokeWidth={1.7} /></div><h3 className="text-lg font-bold">{role.title}</h3><p className="mt-2 text-xs font-medium text-primary">{role.sub}</p><p className="mt-4 text-sm leading-8 text-muted-foreground">{role.text}</p></div>)}
      </div></div></section>
      <section className="border-t border-border bg-market-surface py-12 sm:py-16"><div className="site-container"><div className="text-center"><p className="mb-3 flex items-center justify-center gap-2 text-xs font-semibold text-primary"><PackageCheck className="size-4" />چهار گروه خریدار</p><h2 className="text-2xl font-extrabold sm:text-3xl">برای هر خرید، یک مسیر مناسب</h2></div><div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {buyerGroups.map(group => <div key={group.title} className="rounded-lg border border-border bg-background p-5"><h3 className="font-bold">{group.title}</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">{group.text}</p></div>)}
      </div></div></section>
      <section className="border-t border-border bg-background py-12 sm:py-16"><div className="site-container"><div className="text-center"><p className="mb-3 flex items-center justify-center gap-2 text-xs font-semibold text-primary"><Handshake className="size-4" />مسیر معامله در ترابار</p><h2 className="text-2xl font-extrabold sm:text-3xl">از اعلام بار تا تحویل، در چهار گام</h2></div><div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => <div key={step.title} className="border-t border-border pt-6"><div className="mb-4 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-accent text-primary"><step.icon className="size-5" strokeWidth={1.7} /></span><span className="text-xs font-bold text-muted-foreground">گام {['یک', 'دو', 'سه', 'چهار'][index]}</span></div><h3 className="font-bold">{step.title}</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">{step.text}</p></div>)}
      </div><div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row"><p className="text-xs leading-6 text-muted-foreground">آماده شروع هستید؟ بارهای فعال بازار را ببینید یا بار خود را اعلام کنید.</p><Button asChild variant="link" className="px-0"><Link to="/guide">آشنایی با مسیر معامله<ArrowUpLeft /></Link></Button></div></div></section>
    </>
  );
}
