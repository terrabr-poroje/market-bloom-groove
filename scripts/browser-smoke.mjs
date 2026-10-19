import { chromium, webkit } from "playwright";

const baseURL = process.env.BROWSER_TEST_BASE_URL ?? "http://127.0.0.1:8787";
const routes = ["/", "/auth", "/announce", "/requests"];
const failures = [];
const results = [];
const engines = [
  { name: "chromium", type: chromium },
  { name: "webkit", type: webkit },
];

function watchPage(page, label) {
  page.on("pageerror", (error) => failures.push(`[${label}] uncaught JS: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") {
      failures.push(`[${label}] console error: ${message.text()}`);
    }
  });
  page.on("requestfailed", (request) => {
    const url = request.url();
    const failure = request.failure()?.errorText ?? "unknown";
    // Browsers report intentional document-navigation cancellations as failed
    // requests. Those are not asset failures and should not mask real errors.
    if (
      url.startsWith(baseURL) &&
      /\.(?:m?js|css)(?:\?|$)/i.test(url) &&
      !/cancelled|canceled|aborted/i.test(failure)
    ) {
      failures.push(`[${label}] asset failed: ${url} — ${failure}`);
    }
  });
}

async function checkVisibleContent(page) {
  await page.locator("body").waitFor({ state: "visible" });
  await page.waitForFunction(() => (document.body?.innerText?.trim().length ?? 0) > 30);
}

for (const engine of engines) {
  const browser = await engine.type.launch({ headless: true });
  try {
    for (const viewport of [
      { name: "mobile", width: 390, height: 844 },
      { name: "desktop", width: 1365, height: 900 },
    ]) {
      const label = `${engine.name}/${viewport.name}`;
      const context = await browser.newContext({
        viewport: { width: viewport.width, height: viewport.height },
        deviceScaleFactor: 1,
      });

      // Each route gets an isolated page so one route's navigation cannot
      // cancel another route's JavaScript chunks and create false failures.
      for (const route of routes) {
        const page = await context.newPage();
        page.setDefaultTimeout(12000);
        watchPage(page, label);
        const started = Date.now();
        try {
          const response = await page.goto(new URL(route, baseURL).href, { waitUntil: "domcontentloaded" });
          if (!response || response.status() !== 200) {
            failures.push(`[${label}] ${route}: expected HTTP 200, got ${response?.status() ?? "no response"}`);
            continue;
          }
          await checkVisibleContent(page);
          let visibleMs = Date.now() - started;

          if (route === "/") {
            await page.getByRole("heading", { name: /بازار میوه و تره.?بار ایران/ }).waitFor({ state: "visible" });
            await page.getByRole("link", { name: /شروع همکاری/ }).waitFor({ state: "visible" });
            await page.getByRole("link", { name: /جست.?وجوی بار/ }).first().waitFor({ state: "visible" });
            visibleMs = Date.now() - started;
            const headers = response.headers();
            console.log(
              `INFO ${label} homepage headers: cf-cache-status=${headers["cf-cache-status"] ?? "n/a"}, age=${headers.age ?? "n/a"}, cache-control=${headers["cache-control"] ?? "n/a"}, etag=${headers.etag ?? "n/a"}`,
            );
          }

          results.push({ engine: engine.name, viewport: viewport.name, route, status: response.status(), visibleMs });
          console.log(`PASS ${label} ${route}: HTTP ${response.status()}, visible in ${visibleMs}ms`);
        } catch (error) {
          failures.push(`[${label}] ${route}: page stayed blank or expected content was not visible — ${error.message}`);
        } finally {
          await page.close();
        }
      }

      // Exercise menu hydration and client navigation on a dedicated page.
      const menuPage = await context.newPage();
      menuPage.setDefaultTimeout(12000);
      watchPage(menuPage, `${label}/menu`);
      try {
        const response = await menuPage.goto(new URL("/", baseURL).href, { waitUntil: "domcontentloaded" });
        if (!response || response.status() !== 200) throw new Error("Homepage did not return HTTP 200 for menu test.");
        await menuPage.getByRole("heading", { name: /بازار میوه و تره.?بار ایران/ }).waitFor({ state: "visible" });
        await menuPage.getByRole("button", { name: "باز کردن منو" }).click();
        await menuPage.locator("#terrabar-main-menu").waitFor({ state: "visible" });
        await menuPage.locator("#terrabar-main-menu").getByRole("link", { name: "ثبت‌نام / ورود" }).click();
        await menuPage.waitForURL("**/auth");
        await menuPage.getByRole("heading", { name: /ورود|ثبت.?نام/ }).first().waitFor({ state: "visible" }).catch(async () => {
          await checkVisibleContent(menuPage);
        });
        console.log(`PASS ${label} menu opens and navigates to /auth`);
      } catch (error) {
        failures.push(`[${label}] menu navigation/hydration failed: ${error.message}`);
      } finally {
        await menuPage.close();
      }

      // Repeated homepage loads use a separate page from menu navigation.
      const reloadPage = await context.newPage();
      reloadPage.setDefaultTimeout(12000);
      watchPage(reloadPage, `${label}/reload`);
      try {
        for (let reload = 1; reload <= 5; reload++) {
          const started = Date.now();
          const response = await reloadPage.goto(new URL("/", baseURL).href, { waitUntil: "domcontentloaded" });
          if (!response || response.status() !== 200) {
            failures.push(`[${label}] homepage reload ${reload}: HTTP ${response?.status() ?? "no response"}`);
            continue;
          }
          await reloadPage.getByRole("heading", { name: /بازار میوه و تره.?بار ایران/ }).waitFor({ state: "visible" });
          const visibleMs = Date.now() - started;
          if (visibleMs > 12000) failures.push(`[${label}] homepage reload ${reload}: visible content took ${visibleMs}ms`);
          console.log(`PASS ${label} homepage reload ${reload}: visible in ${visibleMs}ms`);
        }
      } catch (error) {
        failures.push(`[${label}] repeated homepage loading failed: ${error.message}`);
      } finally {
        await reloadPage.close();
      }

      await context.close();
    }
  } finally {
    await browser.close();
  }
}

if (failures.length) {
  console.error("\nBrowser checks failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log("\nPASS: Chromium and WebKit rendered key Terrabar routes at mobile and desktop sizes, with working menu navigation and repeated homepage loads.");
}
