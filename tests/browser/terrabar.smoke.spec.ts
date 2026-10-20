import { expect, test } from "@playwright/test";

test("home renders and its main actions navigate to the expected routes", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", error => pageErrors.push(error.message));

  await page.goto("/");
  await expect(page.getByRole("heading", { name: /فروش عمده میوه و تره‌بار/ })).toBeVisible();

  await page.getByRole("link", { name: /ثبت‌نام \/ ورود/ }).click();
  await expect(page).toHaveURL(/\/auth(?:\?|$)/);
  await expect(page.getByRole("heading", { name: /ثبت‌نام در ترابار/ })).toBeVisible();

  await page.goto("/");
  await page.getByRole("link", { name: /اعلام بار/ }).click();
  await expect(page).toHaveURL(/\/announce$/);
  await expect(page.getByText(/اعلام بار/).first()).toBeVisible();

  await page.goto("/");
  await page.getByRole("link", { name: /درخواست بار/ }).click();
  await expect(page).toHaveURL(/\/requests$/);
  await expect(page.getByRole("heading", { name: /درخواست خرید/ })).toBeVisible();

  expect(pageErrors, "Uncaught browser JavaScript errors").toEqual([]);
});

test("city picker filters and selects a city on the signup page", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", error => pageErrors.push(error.message));

  await page.goto("/auth");
  await expect(page.getByRole("heading", { name: /ثبت‌نام در ترابار/ })).toBeVisible();

  const city = page.getByRole("combobox").last();
  await city.fill("تهران");
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.getByRole("option", { name: "تهران", exact: true }).click();
  await expect(city).toHaveValue("تهران");

  expect(pageErrors, "Uncaught browser JavaScript errors").toEqual([]);
});

test("protected marketplace routes render a useful unauthenticated state", async ({ page }) => {
  await page.goto("/announce");
  await expect(page.getByText(/ابتدا وارد حساب شوید|ورود به حساب|ورود \/ ثبت‌نام/).first()).toBeVisible();

  await page.goto("/requests");
  await expect(page.getByRole("heading", { name: /درخواست خرید/ })).toBeVisible();
  await expect(page.getByText(/وارد حساب|ثبت‌نام/).first()).toBeVisible();
});
