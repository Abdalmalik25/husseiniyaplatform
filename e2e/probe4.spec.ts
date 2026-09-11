import { test } from "@playwright/test";

test("probe accounting buttons", async ({ page }) => {
  const username = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;
  test.skip(
    !username || !password,
    "E2E_USERNAME / E2E_PASSWORD not provided — skipped"
  );
  await page.goto("/login");
  await page.getByLabel(/اسم المستخدم|username/i).fill(username!);
  await page.getByLabel(/كلمة المرور|password/i).fill(password!);
  await page.getByRole("button", { name: /دخول|sign in|تسجيل/i }).click();
  await page.waitForURL("**/app", { timeout: 30000 });
  await page.goto("/accounting");
  await page.waitForTimeout(10000);
  const btns = await page.getByRole("button").allInnerTexts();
  console.log(
    `PROBE buttons(${btns.length})=[${btns.slice(0, 25).join(" | ")}]`
  );
  const links = await page.getByRole("link").allInnerTexts();
  console.log(
    `PROBE links(${links.length})=[${links.slice(0, 25).join(" | ")}]`
  );
});
