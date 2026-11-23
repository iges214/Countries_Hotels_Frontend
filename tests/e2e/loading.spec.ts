import { expect, test } from "@playwright/test";
import { mockApi, seed } from "./fixtures";

test("shows the loader before JavaScript and while the initial catalogue loads", async ({ page }) => {
  await seed(page);
  await mockApi(page);
  let releaseModule!: () => void;
  let releaseProfile!: () => void;
  const moduleReady = new Promise<void>((resolve) => { releaseModule = resolve; });
  const profileReady = new Promise<void>((resolve) => { releaseProfile = resolve; });
  await page.route((url) => url.pathname === "/src/main.tsx", async (route) => {
    await moduleReady;
    await route.continue();
  });
  await page.route("**/api/v1/hotel", async (route) => {
    await profileReady;
    await route.fallback();
  });
  try {
    await page.goto("/contact", { waitUntil: "commit" });
    await expect(page.locator(".site-loader")).toBeVisible();
    await expect(page.locator(".site-loader")).toContainText("Preparing your stay");
    await page.screenshot({ path: test.info().outputPath("startup-desktop.png") });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator(".site-loader__mark")).toHaveCSS("width", "82px");
    expect(await page.locator(".site-loader__mark").evaluate((mark) =>
      getComputedStyle(mark, "::before").animationName)).toBe("none");
    await page.screenshot({ path: test.info().outputPath("startup-mobile.png") });
    const profileRequest = page.waitForRequest("**/api/v1/hotel");
    releaseModule();
    await profileRequest;
    await expect(page.locator(".site-content")).toHaveAttribute("inert", "");
    await expect(page.locator(".site-loader")).toBeVisible();
    releaseProfile();
    await expect(page.locator(".site-loader")).toHaveCount(0);
    await expect(page.locator(".site-content")).not.toHaveAttribute("inert", "");
  } finally {
    releaseModule();
    releaseProfile();
  }
});

test("shows database request activity and clears it after failed requests", async ({ page }) => {
  await seed(page);
  await mockApi(page);
  await page.goto("/contact");
  await expect(page.locator(".site-loader")).toHaveCount(0);
  let finishRequests!: () => void;
  const responseReady = new Promise<void>((resolve) => { finishRequests = resolve; });
  await page.route("**/api/v1/branches/1/rooms?*", async (route) => {
    await responseReady;
    await route.fulfill({ status: 503, json: { title: "Unavailable" } });
  });
  try {
    await page.locator("header").getByRole("link", { name: "Rooms", exact: true }).click();
    await expect(page.locator(".request-loader__pill")).toBeVisible();
    await expect(page.locator(".site-loader")).toHaveCount(0);
    await expect(page.locator(".inline-loading").first()).toBeVisible();
    finishRequests();
    await expect(page.locator(".request-loader__pill")).toHaveCount(0);
    await expect(page.getByRole("alert").first()).toBeVisible();
  } finally {
    finishRequests();
  }
});
