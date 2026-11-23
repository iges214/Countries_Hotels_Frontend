import { test, expect } from "@playwright/test";
import { mockApi, seed } from "./fixtures";

test.beforeEach(async ({ page }) => { await seed(page); await mockApi(page); });

test("the legacy reset-success URL provides guidance without claiming a completed reset", async ({ page }) => {
  await page.goto("/reset-success");
  await expect(page.getByRole("heading", { name: "Finish your password reset." })).toBeVisible();
  await expect(page.getByText("A success confirmation appears only after", { exact: false })).toBeVisible();
  await expect(page.getByText("Your password has been changed.", { exact: false })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Reset password", exact: true })).toHaveAttribute("href", "/forgot-password");
});

test("recovery validates email, sends one anonymous request and displays a neutral confirmation", async ({ page }) => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => { release = resolve; });
  const requests: { body: unknown; authorization: string | undefined }[] = [];
  await page.route("**/auth/forgot-password", async (route) => {
    requests.push({ body: route.request().postDataJSON(), authorization: route.request().headers().authorization });
    await pending;
    await route.fulfill({ status: 204 });
  });
  await page.goto("/forgot-password");
  await page.getByLabel("Email address", { exact: true }).fill("invalid");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByRole("alert")).toHaveText("Enter a valid email address.");
  expect(requests).toHaveLength(0);
  await page.getByLabel("Email address", { exact: true }).fill(" guest+reset@example.test ");
  try {
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByRole("button", { name: "Please wait…" })).toBeDisabled();
    await expect.poll(() => requests.length).toBe(1);
    expect(requests[0]).toEqual({ body: { email: "guest+reset@example.test" }, authorization: undefined });
  } finally { release(); }
  await expect(page.getByRole("status").filter({ hasText: "If an account matches" })).toContainText("Check your inbox and spam folder.");
  await expect(page.getByRole("link", { name: "Back to sign in" })).toBeVisible();
});

test("reset validates passwords, preserves encoded tokens and clears only the reset owner's local session", async ({ page }) => {
  const session = "x." + Buffer.from(JSON.stringify({ sub: "owner", email: "guest+reset@example.test", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url") + ".x";
  await page.addInitScript((value) => {
    if (!sessionStorage.getItem("recovery.seeded")) {
      sessionStorage.setItem("iges.token", value);
      sessionStorage.setItem("recovery.seeded", "1");
    }
  }, session);
  const requests: unknown[] = [];
  await page.route("**/auth/reset-password", async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({ status: 204 });
  });
  const token = "protected+token/with=padding";
  await page.goto("/reset-password?" + new URLSearchParams({ email: "guest+reset@example.test", token }));
  await page.getByLabel("New password", { exact: true }).fill("weak");
  await page.getByLabel("Confirm new password").fill("weak");
  await page.getByRole("button", { name: "Reset password", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  expect(requests).toHaveLength(0);
  await page.getByLabel("New password", { exact: true }).fill("RecoveredPassword1!");
  await page.getByRole("button", { name: "Reset password", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText("Your passwords do not match.");
  expect(requests).toHaveLength(0);
  await page.getByLabel("Confirm new password").fill("RecoveredPassword1!");
  await page.getByRole("button", { name: "Reset password", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Your password has been changed." })).toBeVisible();
  expect(requests).toEqual([{ email: "guest+reset@example.test", token, newPassword: "RecoveredPassword1!" }]);
  expect(await page.evaluate(() => sessionStorage.getItem("iges.token"))).toBeNull();
  await page.getByRole("main").getByRole("link", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText("You’re already signed in.")).toHaveCount(0);
});

test("rejected and incomplete reset links offer a new link without claiming success", async ({ page }) => {
  const requests: unknown[] = [];
  await page.route("**/auth/reset-password", async (route) => {
    requests.push(route.request().postDataJSON());
    await route.fulfill({ status: 400, json: { detail: "The reset link is invalid or has expired." } });
  });
  await page.goto("/reset-password?email=guest%40example.test");
  await expect(page.getByRole("alert")).toContainText("incomplete");
  await expect(page.getByRole("button", { name: "Reset password", exact: true })).toHaveCount(0);
  expect(requests).toHaveLength(0);
  await page.goto("/reset-password?email=guest%40example.test&token=malformed");
  await page.getByLabel("New password", { exact: true }).fill("RecoveredPassword1!");
  await page.getByLabel("Confirm new password").fill("RecoveredPassword1!");
  await page.getByRole("button", { name: "Reset password", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("invalid or has expired");
  await expect(page.getByRole("status").filter({ hasText: "Your password has been changed." })).toHaveCount(0);
  await page.getByRole("link", { name: "Request a new link" }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);
});
