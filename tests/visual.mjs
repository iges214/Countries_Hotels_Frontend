import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const browser = await chromium.launch({ channel: "msedge", headless: true });
await mkdir("verification", { recursive: true });
for (const [device, width, height] of [
  ["desktop", 1440, 1000],
  ["mobile", 390, 844],
]) {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  for (const [name, path] of [
    ["home", "/"],
    ["rooms", "/rooms"],
    ["details", "/rooms/twin"],
    ["booking", "/booking"],
    ["register", "/register"],
    ["login", "/login"],
    ["kitchen", "/kitchen"],
    ["contact", "/contact"],
  ]) {
    if (process.argv.length > 2 && !process.argv.slice(2).includes(name))
      continue;
    await page.goto("http://127.0.0.1:5173" + path + "?demo=1");
    await page.locator("h1").waitFor();
    await page.waitForTimeout(1600);
    await page.evaluate(async () => {
      await Promise.all(
        [...document.images].map((i) => {
          i.loading = "eager";
          return i.decode().catch(() => {});
        }),
      );
    });
    await page.screenshot({
      path: `verification/${device}-${name}.png`,
      fullPage: true,
    });
    console.log(
      JSON.stringify({
        device,
        page: name,
        overflow: await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        images: await page.evaluate(
          () => [...document.images].filter((i) => i.naturalWidth > 0).length,
        ),
      }),
    );
  }
  await page.close();
}
await browser.close();
