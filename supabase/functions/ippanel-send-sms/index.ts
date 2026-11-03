import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const IPPANEL_SEND_URL = "https://edge.ippanel.com/v1/api/send";
const MAX_BODY_BYTES = 20_000;

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function jsonOk(): Response {
  return new Response("{}", {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function normalizeIranianMobile(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const digits = value.replace(/\D/g, "");
  let normalized: string;
  if (digits.startsWith("0098")) normalized = \`+\${digits.slice(2)}\`;
  else if (digits.startsWith("98")) normalized = \`+\${digits}\`;
  else if (digits.startsWith("0")) normalized = \`+98\${digits.slice(1)}\`;
  else if (digits.startsWith("9") && digits.length === 10) normalized = \`+98\${digits}\`;
  else return null;
  return /^\+989\d{9}$/.test(normalized) ? normalized : null;
}

function verifyHook(payload: string, headers: Headers, secretList: string): unknown {
  const candidates = secretList.split("|").map((item) => item.trim()).filter(Boolean);
  if (candidates.length === 0) throw new Error("Hook signing secret is missing");

  let lastError: unknown;
  for (const candidate of candidates) {
    const base64Secret = candidate.startsWith("v1,whsec_")
      ? candidate.slice("v1,whsec_".length)
      : candidate;
    try {
      const webhook = new Webhook(base64Secret);
      return webhook.verify(payload, Object.fromEntries(headers.entries()));
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error("Webhook signature verification failed");
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return jsonError(405, "Method not allowed");

  const declaredLength = Number(req.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_BODY_BYTES) return jsonError(413, "Payload too large");

  const payload = await req.text();
  if (new TextEncoder().encode(payload).byteLength > MAX_BODY_BYTES) {
    return jsonError(413, "Payload too large");
  }

  const hookSecrets = Deno.env.get("SEND_SMS_HOOK_SECRETS") ?? "";
  const apiKey = Deno.env.get("IPPANEL_API_KEY") ?? "";
  const fromNumber = normalizeIranianMobile(Deno.env.get("IPPANEL_FROM_NUMBER"));
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const webhookId = req.headers.get("webhook-id");

  if (!hookSecrets || !apiKey || !fromNumber || !supabaseUrl || !serviceRoleKey) {
    console.error("SMS hook configuration is incomplete");
    return jsonError(500, "SMS provider is not configured");
  }
  if (!webhookId || webhookId.length > 200) {
    return jsonError(400, "Missing or invalid webhook ID");
  }

  let event: { user?: { phone?: unknown }; sms?: { otp?: unknown } };
  try {
    event = verifyHook(payload, req.headers, hookSecrets) as typeof event;
  } catch {
    return jsonError(401, "Invalid webhook signature");
  }

  const recipient = normalizeIranianMobile(event?.user?.phone);
  const otp = typeof event?.sms?.otp === "string" ? event.sms.otp : "";
  if (!recipient || !/^\d{4,8}$/.test(otp)) {
    return jsonError(400, "Invalid SMS hook payload");
  }

  const db = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Claim this signed delivery once. A duplicate webhook ID is never sent twice.
  const { error: claimError } = await db.from("sms_hook_events").insert({
    webhook_id: webhookId,
    status: "processing",
  });

  if (claimError) {
    if (claimError.code === "23505") {
      const { data: existing, error: readError } = await db
        .from("sms_hook_events")
        .select("status")
        .eq("webhook_id", webhookId)
        .maybeSingle();

      if (readError) {
        console.error("Could not read SMS idempotency record");
        return jsonError(503, "SMS request status is temporarily unavailable");
      }
      if (existing?.status === "sent") return jsonOk();
      return jsonError(503, "This SMS request is already being processed or previously failed");
    }

    console.error("Could not claim SMS webhook event", { code: claimError.code ?? "unknown" });
    return jsonError(503, "Could not register SMS request");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const providerResponse = await fetch(IPPANEL_SEND_URL, {
      method: "POST",
      headers: {
        "Authorization": apiKey,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        sending_type: "webservice",
        from_number: fromNumber,
        message: \`کد ورود ترابار: \${otp}\`,
        params: { recipients: [recipient] },
      }),
      signal: controller.signal,
    });

    const providerResult = await providerResponse.json().catch(() => null) as
      | { meta?: { status?: boolean; message_code?: string }; data?: { message_outbox_ids?: unknown[] } }
      | null;

    if (!providerResponse.ok || providerResult?.meta?.status !== true) {
      const errorCode = providerResult?.meta?.message_code ?? \`http_\${providerResponse.status}\`;
      await db.from("sms_hook_events").update({
        status: "failed",
        error_code: String(errorCode).slice(0, 80),
        updated_at: new Date().toISOString(),
      }).eq("webhook_id", webhookId);

      console.error("IPPanel rejected SMS request", {
        httpStatus: providerResponse.status,
        messageCode: errorCode,
      });
      return jsonError(502, "SMS provider rejected the request");
    }

    const { error: updateError } = await db.from("sms_hook_events").update({
      status: "sent",
      provider_message_ids: providerResult?.data?.message_outbox_ids ?? null,
      updated_at: new Date().toISOString(),
      error_code: null,
    }).eq("webhook_id", webhookId);

    if (updateError) {
      console.error("Provider accepted SMS but idempotency status update failed");
      return jsonError(503, "SMS accepted but request status could not be saved");
    }

    return jsonOk();
  } catch (error) {
    await db.from("sms_hook_events").update({
      status: "failed",
      error_code: error instanceof Error && error.name === "AbortError" ? "timeout" : "network_error",
      updated_at: new Date().toISOString(),
    }).eq("webhook_id", webhookId);

    console.error("IPPanel request failed", {
      reason: error instanceof Error && error.name === "AbortError" ? "timeout" : "network_error",
    });
    return jsonError(502, "SMS provider is temporarily unavailable");
  } finally {
    clearTimeout(timeout);
  }
});
