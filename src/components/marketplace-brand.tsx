import { Sprout } from 'lucide-react';

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return <div className={`flex min-w-0 items-center gap-2.5 ${inverse ? 'text-primary-foreground' : 'text-primary'}`}>
    <span className={`grid size-11 shrink-0 place-items-center rounded-lg ${inverse ? 'bg-primary-foreground/10' : 'bg-primary/10'}`}><Sprout className="size-8" strokeWidth={1.8} /></span>
    <div className="min-w-0"><span className="block text-3xl font-extrabold leading-8">ترابار</span><span dir="ltr" className="block text-[10px] font-semibold leading-4">TERRABAR</span></div>
  </div>;
}