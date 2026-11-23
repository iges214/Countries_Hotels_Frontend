import { test, expect } from "@playwright/test";

test.skip(process.env.IGES_REAL_BACKEND_TESTS !== "1", "Requires the isolated ApiHarness on port 5199.");

test("real backend recovery follows the emailed route, revokes old access and permits the new password", async ({ page, request }) => {
  test.setTimeout(90000);
  const origin = "http://127.0.0.1:5199";
  const email = `recover-${Date.now()}@example.test`;
  expect((await request.post(origin + "/api/v1/auth/register", {
    data: { firstName: "Recovery", lastName: "Guest", email, password: "OriginalPassword1!" },
  })).status()).toBe(200);
  await page.route("https://example.com/**", (route) => route.abort());
  await page.route("**/api/v1/**", async (route) => {
    const response = await route.fetch({ url: route.request().url().replace("http://127.0.0.1:5173", origin) });
    await route.fulfill({ response });
  });
  // Sign in through the browser so its scoped HttpOnly refresh cookie accompanies
  // the access token, just as it does for a real returning guest.
  await page.goto("/login?returnTo=%2Fprofile");
  await expect(page.locator(".site-loader")).toHaveCount(0);
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("OriginalPassword1!");
  await page.getByRole("button", { name: "Sign in & continue" }).click();
  await expect(page).toHaveURL(/\/profile$/);
  const oldToken = (await page.evaluate(() => sessionStorage.getItem("iges.token")))!;
  await page.goto("/forgot-password");
  await expect(page.locator(".site-loader")).toHaveCount(0);
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByRole("button", { name: "Send reset link", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "If an account matches" })).toBeVisible();
  const captured = await request.get(origin + "/harness/reset-link?email=" + encodeURIComponent(email));
  expect(captured.status()).toBe(200);
  const { link } = await captured.json();
  expect(new URL(link).pathname).toBe("/reset-password");
  await page.goto(link);
  await expect(page.locator(".site-loader")).toHaveCount(0);
  await page.getByLabel("New password", { exact: true }).fill("RecoveredPassword1!");
  await page.getByLabel("Confirm new password").fill("RecoveredPassword1!");
  await page.getByRole("button", { name: "Reset password", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Your password has been changed." })).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem("iges.token"))).toBeNull();
  expect((await request.get(origin + "/api/v1/account", { headers: { Authorization: "Bearer " + oldToken } })).status()).toBe(401);
  await page.getByRole("main").getByRole("link", { name: "Sign in", exact: true }).click();
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("RecoveredPassword1!");
  await page.getByRole("button", { name: "Sign in & continue" }).click();
  await expect(page).toHaveURL(/\/booking$/);
  expect(await page.evaluate(() => sessionStorage.getItem("iges.token"))).toBeTruthy();
});
