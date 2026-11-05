import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
const files = await readdir("dist/assets");
assert(
  !files.some((f) => f.includes("demo-twin")),
  "Demo image must not be deployed",
);
for (const file of files.filter((f) => f.endsWith(".js"))) {
  const source = await readFile("dist/assets/" + file, "utf8");
  for (const sample of [
    "Illustrative room for design preview",
    "Warri · Preview branch",
    "photo-1611892440504",
  ])
    assert(!source.includes(sample), "Sample data must not be deployed");
}
const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.route("**/api/v1/**", (r) =>
  r.fulfill({ status: 503, json: { title: "Service unavailable" } }),
);
for (const path of [
  "/rooms/twin",
  "/booking",
  "/my-bookings/1/1",
  "/503",
  "/not-found",
]) {
  const response = await page.goto("http://127.0.0.1:4173" + path + "?demo=1");
  assert(response?.ok(), "Nested frontend route must serve the SPA");
  await page.locator("h1").waitFor();
  assert.equal(
    await page.locator(".demo-banner").count(),
    0,
    "Production must not activate preview",
  );
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "No mobile overflow",
  );
  if (path === "/booking")
    assert.equal(
      await page.locator("meta[name=robots]").getAttribute("content"),
      "noindex, nofollow",
    );
}
await page.goto("http://127.0.0.1:4173/rooms?demo=1");
await page.getByRole("alert").waitFor();
assert.equal(await page.locator(".category-card").count(), 4);
assert.equal(await page.locator(".category-card img").count(), 0);
await page.screenshot({
  path: "verification/production-unavailable-mobile.png",
  fullPage: true,
});
console.log(
  "Production checks passed: nested routes, no demo data/images or activation, no fake API fallback, sensitive robots metadata, mobile overflow.",
);
await browser.close();
