import { createFileRoute } from '@tanstack/react-router';
import { InfoPage } from '@/components/info-page';
import { pageHead } from '@/lib/marketplace';
export const Route = createFileRoute('/about')({ head: () => pageHead('درباره ترابار', 'آشنایی با بازار تخصصی ترابار و ارتباط تأمین‌کنندگان، بارفروشان و خریداران میوه و تره‌بار.', '/about'), component: () => <InfoPage kind="about" /> });