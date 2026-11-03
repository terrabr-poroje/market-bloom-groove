# برنامه اتصال OTP موبایل ترابار به IPPanel Edge v1 (فقط بررسی، بدون اجرا)

## وضعیت فعلی (بررسی‌شده، بدون تغییر)
- صفحه `/auth` هم‌اکنون از `signInWithOtp({ phone })` و `verifyOtp({ phone, token, type: "sms" })` استفاده می‌کند؛ شماره با `normalizeIranPhone` به قالب `+98...` تبدیل می‌شود. این کد دست نمی‌خورد.
- AGENTS.md: منطق داخلی با server function، ورودی‌های عمومی/Webhook با server route زیر `src/routes/api/public/*`؛ Edge Function جدید ممنوع.
- در مخزن فقط دو تابع `admin-login` و `admin-manage-city-manager` هست؛ `free-sms` و `free-sms-setup-check` در کد مخزن نیستند (احتمالاً فقط روی backend مستقرند).
- Secret با نام `IPPANEL_API_KEY` در فهرست Secretهای قابل‌مشاهده من دیده نشد؛ قبل از اجرا باید وجودش تأیید شود.
- `supabase/config.toml` هیچ تنظیم SMS یا hook ندارد. تنظیم زنده‌ی provider/hook در Auth با ابزارهای فقط‌خواندنی من قابل خواندن نیست؛ وضعیت آن **تأییدنشده** است.

## واقعیت فنی
- OTP داخلی Auth را نمی‌توان با یک فراخوانی ساده API جایگزین کرد. تنها راه حفظ `signInWithOtp/verifyOtp` این است که Auth خودش کد را بسازد و برای ارسال، **Send SMS Hook** (نوع HTTP) را صدا بزند.
- Hook نوع HTTP درخواست امضاشده (Standard Webhooks) با `user.phone` و `sms.otp` می‌فرستد و انتظار پاسخ 200 دارد.
- ابزارهای پیکربندی Auth در دسترس من (configure_auth) گزینه فعال‌سازی hook ندارند. پس اینکه Lovable Cloud اجازه ثبت Send SMS Hook بدهد **قطعی نیست**؛ گام اول اجرا، بررسی همین مورد است.

## گزینه الف (ترجیحی، اگر Hook قابل فعال‌سازی باشد)
1. Server route `src/routes/api/public/auth/send-sms.ts` (نه Edge Function).
2. تأیید امضای Webhook با Secret جدید `SEND_SMS_HOOK_SECRET` (مقدار را خود Auth/کاربر می‌دهد)؛ بدون امضای معتبر → 401.
3. فراخوانی `POST https://edge.ippanel.com/v1/api/send` با هدر `Authorization: <IPPANEL_API_KEY>` (بدون Bearer)، بدنه:
   `{ sending_type: "pattern", from_number, code: <کد پترن>, recipients: ["+98..."], params: { <نام متغیر>: otp } }`
4. فقط یک گیرنده، timeout، عدم لاگ OTP/کلید، بازگرداندن خطای استاندارد hook در صورت شکست.
5. ثبت آدرس route منتشرشده به‌عنوان Send SMS Hook در Auth (نیازمند تأیید صریح شما و انتشار).

## گزینه ب (اگر Hook در دسترس نباشد)
OTP سفارشی: server function کد می‌سازد، hash آن را با انقضا و محدودیت تلاش در جدول جدید نگه می‌دارد، با IPPanel می‌فرستد و پس از تأیید، نشست کاربر را سمت سرور می‌سازد. این یعنی تغییر کد `/auth`، جدول جدید (migration) و منطق auth — همه نیازمند تأیید جداگانه؛ تا تأیید نشود اجرا نمی‌شود.

## موارد لازم از شما
- شماره فرستنده مجاز (`from_number`) در پنل IPPanel.
- کد پترن تأییدشده (`code`) و متن پترن.
- نام دقیق متغیر placeholder (مثلاً `code` یا `otp`).
- تأیید وجود Secret `IPPANEL_API_KEY` (یا افزودن آن در Project Settings → Secrets).
- یک شماره موبایل آزمایشی.
- تأیید انتخاب گزینه الف یا ب پس از بررسی امکان Hook.

## طرح تست (بدون ارسال تا تأیید نهایی)
1. حالت dry-run: route فقط بدنه درخواست IPPanel را (بدون کلید و OTP) می‌سازد و برمی‌گرداند؛ هیچ پیامکی ارسال نمی‌شود.
2. تست امضای نامعتبر → 401؛ شماره غیرمجاز → رد.
3. allowlist یک شماره آزمایشی: تا تأیید نهایی هر شماره دیگر ارسال نمی‌شود.
4. پس از تأیید شما: یک ارسال واقعی به شماره آزمایشی، ورود با `verifyOtp` در `/auth`، بررسی نشست.
5. سپس برداشتن allowlist با تأیید جداگانه.

## پاک‌سازی پیشنهادی (فقط پس از جایگزینی کامل و تأیید شما)
- حذف `free-sms` و `free-sms-setup-check`. سایر توابع، داده‌ها و تنظیمات دست‌نخورده می‌مانند.

## آنچه در این مرحله انجام نشده
هیچ فایل، Secret، تنظیم Auth، دیتابیس یا Edge Function تغییر نکرد؛ هیچ merge، deploy یا انتشار انجام نشد.
