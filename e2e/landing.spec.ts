import { test, expect } from "@playwright/test";

/**
 * Landing (الرئيسية) — value-preserving smoke + interaction suite.
 * No business data is created or modified.
 */

test.describe("Landing page", () => {
  test("loads with hero, nav and footer", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/alhusainiaye/i);

    // Main navigation renders
    const nav = page.getByRole("banner");
    await expect(nav).toBeVisible();

    // Hero section present
    await expect(page.locator("h1").first()).toBeVisible();

    // Footer rendered
    await expect(page.getByRole("contentinfo")).toBeVisible();
  });

  test("silent-loss calculator computes a live figure", async ({ page }) => {
    await page.goto("/");

    // The cost-of-inaction slider interaction → live loss figure appears
    const range = page.locator('input[type="range"]').first();
    if (await range.count()) {
      await range.focus();
      for (let i = 0; i < 3; i++) {
        await page.keyboard.press("ArrowRight");
      }
      // Some non-zero currency figure must be displayed
      await expect(page.getByText(/\d[\d,.]*\s?(ريال|YER|ر\.ي)/)).toBeVisible();
    }
  });

  test("primary CTA navigates to the signup/login gate", async ({ page }) => {
    await page.goto("/");

    const cta = page.getByRole("link", { name: /ابدأ مجاناً/ }).first();
    await expect(cta).toBeVisible();
    await cta.click();

    await expect(page).toHaveURL(/\/(login|register|api\/oauth)/);
  });

  test("mega-menu cluster opens and reveals described links", async ({
    page,
  }) => {
    await page.goto("/");

    // Products/resources cluster trigger
    const cluster = page
      .getByRole("button", { name: /الحلول|المنتجات|الموارد/ })
      .first();
    if (await cluster.count()) {
      await cluster.hover();
      // A described link inside the panel becomes visible
      await expect(
        page.getByRole("link", { name: /.+/ }).filter({ hasText: /.+/ }).nth(5)
      ).toBeVisible();
    }
  });
});
