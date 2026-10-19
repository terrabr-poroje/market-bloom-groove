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

      try {
        await page.locator("body").waitFor({ state: "visible" });
        await page.waitForFunction(() => {
          const text = document.body?.innerText?.trim() ?? "";
          return text.length > 30;
        });
        if (route === "/") {
          await page.getByRole("heading", { name: /بازار میوه و تره.?بار ایران/ }).waitFor({ state: "visible" });
          await page.getByRole("link", { name: /شروع همکاری/ }).waitFor({ state: "visible" });
          await page.getByRole("link", { name: /جست.?وجوی بار/ }).first().waitFor({ state: "visible" });
        }
      } catch (error) {
        failures.push(`[${viewport.name}] ${route}: page stayed blank or expected content was not visible — ${error.message}`);
      }

      const elapsedMs = Date.now() - started;
      results.push({ viewport: viewport.name, route, status: response.status(), elapsedMs });
      if (elapsedMs > 12000) {
        failures.push(`[${viewport.name}] ${route}: visible content took ${elapsedMs}ms (limit 12000ms)`);
      }
    }
    await page.close();
  }
} finally {
  await browser.close();
}

for (const result of results) {
  console.log(`PASS ${result.viewport} ${result.route}: HTTP ${result.status}, visible content in ${result.elapsedMs}ms`);
}
if (failures.length) {
  console.error("\nBrowser checks failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("\nPASS: browser rendered the homepage and key routes at mobile and desktop sizes with no JavaScript or same-origin JS/CSS loading errors.");
}
