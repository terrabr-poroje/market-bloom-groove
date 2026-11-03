import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const IPPANEL_SEND_URL = "https://edge.ippanel.com/v1/api/send";
const MAX_BODY_BYTES = 20_000;

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function normalizeIranianMobile(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const digits = value.replace(/\D/g, "");
  let normalized: string;
  if (digits.startsWith("0098")) normalized = `+${digits.slice(2)}`;
  else if (digits.startsWith("98")) normalized = `+${digits}`;
  else if (digits.startsWith("0")) normalized = `+98${digits.slice(1)}`;
  else if (digits.startsWith("9") && digits.length === 10) normalized = `+98${digits}`;
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

  if (!hookSecrets || !apiKey || !fromNumber) {
    console.error("SMS hook configuration is incomplete");
    return jsonError(500, "SMS provider is not configured");
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

  const message = `کد ورود ترابار: ${otp}`;
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
        message,
        params: { recipients: [recipient] },
      }),
      signal: controller.signal,
    });

    const providerResult = await providerResponse.json().catch(() => null) as
      | { meta?: { status?: boolean; message_code?: string }; data?: { message_outbox_ids?: unknown[] } }
      | null;

    if (!providerResponse.ok || providerResult?.meta?.status !== true) {
      console.error("IPPanel rejected SMS request", {
        httpStatus: providerResponse.status,
        messageCode: providerResult?.meta?.message_code ?? "unknown",
      });
      return jsonError(502, "SMS provider rejected the request");
    }

    return new Response("{}", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("IPPanel request failed", {
      reason: error instanceof Error && error.name === "AbortError" ? "timeout" : "network_error",
    });
    return jsonError(502, "SMS provider is temporarily unavailable");
  } finally {
    clearTimeout(timeout);
  }
});
