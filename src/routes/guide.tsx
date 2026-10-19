import { createFileRoute } from '@tanstack/react-router';
import { InfoPage } from '@/components/info-page';
import { pageHead } from '@/lib/marketplace';
export const Route = createFileRoute('/guide')({ head: () => pageHead('راهنمای خرید و فروش', 'راهنمای جست‌وجوی بار، بررسی کیفیت و بسته‌بندی و محاسبه وزن و مبلغ سفارش در ترابار.', '/guide'), component: () => <InfoPage kind="guide" /> });