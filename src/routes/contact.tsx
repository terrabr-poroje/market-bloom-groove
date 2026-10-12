import { createFileRoute } from '@tanstack/react-router';
import { InfoPage } from '@/components/info-page';
import { pageHead } from '@/lib/marketplace';
export const Route = createFileRoute('/contact')({ head: () => pageHead('تماس با ترابار', 'اطلاعات ارتباط با بازار میوه و تره‌بار ترابار در کرج و ایران و وضعیت پشتیبانی.'), component: () => <InfoPage kind="contact" /> });