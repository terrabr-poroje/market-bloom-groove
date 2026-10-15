import marketImage from '@/assets/market-hero.jpg';
import appleImage from '@/assets/apples.jpg';
import tomatoImage from '@/assets/tomatoes.jpg';
import onionImage from '@/assets/onions.jpg';

export const cities = ['کرج', 'تهران', 'شیراز', 'اصفهان', 'ارومیه', 'جیرفت', 'مراغه', 'ساری'];
export const qualities = ['ویژه', 'استاندارد', 'اقتصادی', 'توافقی'] as const;
export type Quality = typeof qualities[number];
export type Load = { id: string | number; memberId?: string; saleType?: string; createdAt?: string; isSample?: boolean; product: string; variety: string; category: string; quality: Quality; city: string; province: string; weight: number; stock: number; minimum: number; price: number; ready: string; validity: string; seller: string; sellerType: string; image: string };
export const loads: Load[] = [
  { id: 1, isSample: true, product: 'پرتقال', variety: 'تامسون شمال', category: 'میوه', quality: 'ویژه', city: 'ساری', province: 'مازندران', weight: 10, stock: 240, minimum: 20, price: 48000, ready: 'آماده بارگیری', validity: '۲۴ ساعت', seller: 'باغ مرکبات شمال', sellerType: 'باغدار و تأمین‌کننده', image: marketImage },
  { id: 2, isSample: true, product: 'سیب', variety: 'سرخ مراغه', category: 'میوه', quality: 'استاندارد', city: 'مراغه', province: 'آذربایجان شرقی', weight: 12, stock: 180, minimum: 15, price: 42000, ready: 'آماده بارگیری', validity: '۴۸ ساعت', seller: 'سورتینگ سبز مراغه', sellerType: 'سورتینگ و بسته‌بندی', image: appleImage },
  { id: 3, isSample: true, product: 'گوجه‌فرنگی', variety: 'بوته‌ای ۸۳۲۰', category: 'صیفی‌جات', quality: 'اقتصادی', city: 'جیرفت', province: 'کرمان', weight: 15, stock: 320, minimum: 20, price: 18500, ready: 'آماده از فردا', validity: '۳۶ ساعت', seller: 'کشاورزی دشت جیرفت', sellerType: 'کشاورز و تأمین‌کننده', image: tomatoImage },
  { id: 4, isSample: true, product: 'پیاز', variety: 'زرد دست‌چین', category: 'صیفی‌جات', quality: 'توافقی', city: 'اصفهان', province: 'اصفهان', weight: 20, stock: 400, minimum: 10, price: 22000, ready: 'آماده بارگیری', validity: '۷۲ ساعت', seller: 'بارفروشی بهار', sellerType: 'بارفروش و حجره‌دار', image: onionImage },
];
export const faNumber = (value: number) => new Intl.NumberFormat('fa-IR').format(value);
export const calculateOrder = (load: Pick<Load, 'weight' | 'price'>, count: number) => ({ weight: count * load.weight, total: count * load.weight * load.price });
export function pageHead(title: string, description: string) {
  return { meta: [{ title: `${title} | ترابار TERRABAR` }, { name: 'description', content: description }, { property: 'og:title', content: `${title} | ترابار TERRABAR` }, { property: 'og:description', content: description }, { property: 'og:type', content: 'website' }, { name: 'twitter:card', content: 'summary_large_image' }] };
}