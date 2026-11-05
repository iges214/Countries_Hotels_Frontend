import { test, expect } from "@playwright/test";
import { branch, mockApi, pageOf, seed } from "./fixtures";
test("changing branches confirms clearing a selected room, including through mobile navigation", async ({
  page,
}) => {
  await seed(page);
  await mockApi(page);
  await page.route("**/api/v1/branches?**", (r) =>
    r.fulfill({
      json: pageOf([branch, { ...branch, id: 2, name: "Second test branch" }]),
    }),
  );
  await page.goto("/booking");
  await page
    .getByRole("button", { name: "Select room", exact: true })
    .first()
    .click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByLabel("Mobile branch", { exact: true }).selectOption("2");
  await expect(page.getByRole("dialog")).toContainText(
    "Your selected rooms will be cleared",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Keep branch", exact: true })
    .click();
  await expect(page.getByLabel("Mobile branch", { exact: true })).toHaveValue(
    "1",
  );
  await page.getByLabel("Mobile branch", { exact: true }).selectOption("2");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Change branch", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => JSON.parse(sessionStorage.getItem("iges.stay")!).roomIds,
    ),
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => JSON.parse(sessionStorage.getItem("iges.stay")!).branchId,
    ),
  ).toBe(2);
});
test("development preview isolates the live token and stay draft and makes no API requests", async ({
  page,
}) => {
  await seed(page, true);
  await mockApi(page);
  let calls = 0;
  page.on("request", (r) => {
    if (r.url().includes("/api/v1/")) calls++;
  });
  await page.goto("/booking?demo=1");
  await expect(page.locator(".demo-banner")).toBeVisible();
  await expect(page.locator(".available-room")).toHaveCount(6);
  await expect(page.locator(".sign-in")).toBeVisible();
  await page
    .getByRole("button", { name: "Select room", exact: true })
    .first()
    .click();
  expect(
    await page.evaluate(
      () => JSON.parse(sessionStorage.getItem("iges.stay")!).roomIds,
    ),
  ).toEqual([]);
  expect(
    await page.evaluate(
      () => JSON.parse(sessionStorage.getItem("iges.demo.stay")!).roomIds,
    ),
  ).toEqual([1]);
  expect(
    await page.evaluate(() => sessionStorage.getItem("iges.token")),
  ).toBeTruthy();
  await page.goto("/my-bookings?demo=1");
  await expect(
    page.getByRole("heading", { name: "Your stays, together." }),
  ).toBeVisible();
  expect(calls).toBe(0);
});
