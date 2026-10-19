import { chromium } from "playwright";

const baseURL = process.env.BROWSER_TEST_BASE_URL ?? "http://127.0.0.1:8787";
const routes = ["/", "/auth", "/announce", "/requests"];
const failures = [];
const results = [];

const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of [
    { name: "mobile", width: 390, height: 844 },
    { name: "desktop", width: 1365, height: 900 },
  ]) {
    const page = await browser.newPage({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1,
    });
    page.setDefaultTimeout(12000);

    page.on("pageerror", (error) => failures.push(`[${viewport.name}] uncaught JS: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error") {
        failures.push(`[${viewport.name}] console error: ${message.text()}`);
      }
    });
    page.on("requestfailed", (request) => {
      const url = request.url();
      if (url.startsWith(baseURL) && /\.(?:m?js|css)(?:\?|$)/i.test(url)) {
        failures.push(`[${viewport.name}] asset failed: ${url} — ${request.failure()?.errorText ?? "unknown"}`);
      }
    });

    for (const route of routes) {
      const started = Date.now();
      const response = await page.goto(new URL(route, baseURL).href, { waitUntil: "domcontentloaded" });
      if (!response || response.status() !== 200) {
        failures.push(`[${viewport.name}] ${route}: expected HTTP 200, got ${response?.status() ?? "no response"}`);
        continue;
      }

      let visibleMs = Date.now() - started;
      try {
        await page.locator("body").waitFor({ state: "visible" });
        await page.waitForFunction(() => {
          const text = document.body?.innerText?.trim() ?? "";
          return text.length > 30;
        });
        if (route === "/") {
          await page.getByRole("heading", { name: /بازار میوه و تره.?بار ایران/ }).waitFor({ state: "visible" });
          visibleMs = Date.now() - started;
          await page.getByRole("link", { name: /شروع همکاری/ }).waitFor({ state: "visible" });
          await page.getByRole("link", { name: /جست.?وجوی بار/ }).first().waitFor({ state: "visible" });

          // Prove client-side hydration by exercising the menu, not only SSR HTML.
          await page.getByRole("button", { name: "باز کردن منو" }).click();
          await page.locator("#terrabar-main-menu").waitFor({ state: "visible" });
          await page.getByRole("link", { name: "ثبت‌نام / ورود" }).first().click();
          await page.waitForURL("**/auth");

          // Revisit the homepage to catch intermittent first-load / stale-asset failures.
          const homeHeaders = response.headers();
          console.log(
            `INFO ${viewport.name} homepage headers: cf-cache-status=${homeHeaders["cf-cache-status"] ?? "n/a"}, age=${homeHeaders.age ?? "n/a"}, cache-control=${homeHeaders["cache-control"] ?? "n/a"}, etag=${homeHeaders.etag ?? "n/a"}`,
          );

          // Repeat reloads to expose intermittent stale assets or first-load failures.
          for (let reload = 1; reload <= 5; reload++) {
            const reloadStarted = Date.now();
            const reloadResponse = await page.goto(new URL("/", baseURL).href, { waitUntil: "domcontentloaded" });
            if (!reloadResponse || reloadResponse.status() !== 200) {
              failures.push(`[${viewport.name}] homepage reload ${reload}: HTTP ${reloadResponse?.status() ?? "no response"}`);
              continue;
            }
            await page.getByRole("heading", { name: /بازار میوه و تره.?بار ایران/ }).waitFor({ state: "visible" });
            console.log(`PASS ${viewport.name} homepage reload ${reload}: visible in ${Date.now() - reloadStarted}ms`);
          }
        }
      } catch (error) {
        failures.push(`[${viewport.name}] ${route}: page stayed blank or expected content was not visible — ${error.message}`);
      }

      const elapsedMs = Date.now() - started;
      results.push({ viewport: viewport.name, route, status: response.status(), visibleMs, elapsedMs });
      if (visibleMs > 12000) {
        failures.push(`[${viewport.name}] ${route}: visible content took ${visibleMs}ms (limit 12000ms)`);
      }
    }
    await page.close();
  }
} finally {
  await browser.close();
}

for (const result of results) {
  console.log(`PASS ${result.viewport} ${result.route}: HTTP ${result.status}, visible in ${result.visibleMs}ms (full checks ${result.elapsedMs}ms)`);
}
if (failures.length) {
  console.error("\nBrowser checks failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("\nPASS: browser rendered the homepage and key routes at mobile and desktop sizes with no JavaScript or same-origin JS/CSS loading errors.");
}
