import { describe, expect, it } from "vitest";
import { handleCloudflareAuthRequest } from "@/lib/cloudflare-auth.server";

describe("Cloudflare D1 auth API routing", () => {
  it("leaves ordinary application routes to the TanStack server", async () => {
    const response = await handleCloudflareAuthRequest(new Request("https://preview.terrabar.ir/"), { DB: {} });
    expect(response).toBeNull();
  });

  it("returns a clear unavailable response when D1 is not bound", async () => {
    const response = await handleCloudflareAuthRequest(
      new Request("https://preview.terrabar.ir/auth/v1/otp", { method: "POST" }),
      {},
    );
    expect(response?.status).toBe(503);
    await expect(response?.json()).resolves.toMatchObject({ msg: "Cloudflare D1 is not configured." });
  });

  it("handles preflight requests without touching auth tables", async () => {
    const response = await handleCloudflareAuthRequest(
      new Request("https://preview.terrabar.ir/auth/v1/otp", { method: "OPTIONS" }),
      { DB: {} },
    );
    expect(response?.status).toBe(200);
    await expect(response?.json()).resolves.toEqual({});
  });
});
