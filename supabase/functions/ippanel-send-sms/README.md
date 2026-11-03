# IPPanel SMS Auth Hook (staged)

This function is intended to receive the Supabase Auth **Send SMS** HTTP hook and forward the OTP to IPPanel's Edge API.

## Required Supabase Edge Function secrets

Set these in Supabase Dashboard → Edge Functions → Secrets. Never commit their values:

- `IPPANEL_API_KEY`: the KPanel/IPPanel API token already held by the project.
- `IPPANEL_FROM_NUMBER`: the approved sender number in E.164 format (for Terrabar, expected `+9890000145`, only if still assigned and enabled).
- `SEND_SMS_HOOK_SECRETS`: the complete Standard Webhooks secret generated for the Supabase Auth Send SMS hook, e.g. `v1,whsec_<base64>`.

The function verifies the signed webhook before reading the phone or OTP. It does not log phone numbers, OTPs, API keys, or response bodies.

## Hook URL

After deployment, the endpoint will be:

`https://gznsxqeyhnuzglliijzz.supabase.co/functions/v1/ippanel-send-sms`

Configure Authentication → Hooks → Send SMS → HTTP endpoint with that URL and the matching Standard Webhooks secret.

## Important rollout notes

- This source is staged in GitHub only. It has **not** been deployed and the Auth Hook has **not** been enabled.
- Deploying the function and enabling the Auth Hook are separate production changes and must be reviewed first.
- Before enabling, confirm phone sign-in is enabled and SMS auto-confirm is off.
- The function currently has no durable deduplication store. A retried identical webhook could send the same OTP SMS twice. Add a persistent webhook-id idempotency mechanism before treating this as production-ready.
- Do not delete or modify the legacy `free-sms` functions as part of this rollout.
- A successful IPPanel API response confirms provider acceptance, not handset delivery.
