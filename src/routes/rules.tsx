import { createFileRoute } from '@tanstack/react-router';
import { InfoPage } from '@/components/info-page';
import { pageHead } from '@/lib/marketplace';
export const Route = createFileRoute('/rules')({ head: () => pageHead('قوانین و حریم خصوصی', 'اطلاعات قوانین، حریم خصوصی و محدودیت‌های نسخه نمایشی بازار ترابار.'), component: () => <InfoPage kind="rules" /> });