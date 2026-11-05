import { test, expect } from "@playwright/test";
import { booking, inventory, mockApi, pageOf, seed, token } from "./fixtures";
test.beforeEach(async ({ page }) => {
  await seed(page);
  await mockApi(page);
});
test("public browsing has four categories, correct Standard/Twin filters, and enquiry-only Platinum", async ({
  page,
}) => {
  const calls: string[] = [];
  page.on("request", (r) => {
    if (r.url().includes("/rooms?")) calls.push(r.url());
  });
  await page.goto("/rooms");
  await expect(page.locator(".category-card")).toHaveCount(4);
  expect(
    calls.some(
      (u) => u.includes("category=Normal") && u.includes("isTwinRoom=false"),
    ),
  ).toBeTruthy();
  expect(
    calls.some(
      (u) => u.includes("category=Normal") && u.includes("isTwinRoom=true"),
    ),
  ).toBeTruthy();
  await expect(page.locator(".platinum")).not.toContainText(
    "Check availability",
  );
  await page
    .locator(".platinum")
    .getByRole("link", { name: "Contact management" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Enquire about Platinum." }),
  ).toBeVisible();
  await expect(
    page.getByText("Direct contact details are being prepared."),
  ).toBeVisible();
});
test("only genuinely designated suites carry the Honeymoon label", async ({
  page,
}) => {
  await page.goto("/booking");
  const ordinary = page
    .locator(".available-room")
    .filter({
      has: page.getByRole("heading", { name: "Room 350", exact: true }),
    });
  await expect(ordinary).not.toContainText("HONEYMOON SUITE");
  const honeymoon = page
    .locator(".available-room")
    .filter({
      has: page.getByRole("heading", { name: "Room 351", exact: true }),
    });
  await expect(honeymoon).toContainText("HONEYMOON SUITE");
  await expect(page.locator(".available-room")).toHaveCount(5);
});
test("selected stay survives registration and login and submits once, showing authoritative Pending total", async ({
  page,
}) => {
  let created = false;
  let postCount = 0;
  await page.route("**/api/v1/branches/1/bookings**", async (r) => {
    if (r.request().method() === "POST") {
      postCount++;
      const p = r.request().postDataJSON();
      expect(p).toMatchObject({
        hotelId: 1,
        rooms: 1,
        roomIds: [1],
        guests: 2,
      });
      created = true;
      await r.fulfill({ json: { ...booking, totalPrice: 112000 } });
    } else
      await r.fulfill({
        json: pageOf(created ? [{ ...booking, totalPrice: 112000 }] : []),
      });
  });
  await page.goto("/booking");
  await page
    .getByRole("button", { name: "Select room", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Continue to review" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Have you booked with us before?",
  );
  await page
    .getByRole("dialog")
    .getByRole("link", { name: "First time? Create account" })
    .click();
  await page.getByLabel("First name", { exact: true }).fill("Test");
  await page.getByLabel("Last name", { exact: true }).fill("Guest");
  await page
    .getByLabel("Email address", { exact: true })
    .fill("test@example.test");
  await page.getByLabel("Password", { exact: true }).fill("Test123!");
  await page.getByLabel("Confirm password", { exact: true }).fill("Test123!");
  await page.getByRole("button", { name: "Create account & continue" }).click();
  await expect(page).toHaveURL(/login/);
  await page
    .getByLabel("Email address", { exact: true })
    .fill("test@example.test");
  await page.getByLabel("Password", { exact: true }).fill("Test123!");
  await page.getByRole("button", { name: "Sign in & continue" }).click();
  await expect(page).toHaveURL(/\/booking$/);
  await expect(
    page.getByRole("button", { name: "Selected", exact: true }),
  ).toHaveCount(1);
  await page.getByRole("button", { name: "Continue to review" }).click();
  await expect(
    page.getByRole("heading", { name: "Make sure it feels right." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Submit reservation", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Submit reservation", exact: true })
    .click();
  await expect(page).toHaveURL(/confirmation\/1\/41/);
  await expect(
    page.getByRole("heading", { name: "Your stay is on its way." }),
  ).toBeVisible();
  await expect(page.locator(".receipt-total")).toContainText("112,000");
  await expect(page.locator(".status-badge")).toHaveText("Pending");
  expect(postCount).toBe(1);
  await expect(
    page.getByRole("button", { name: "Print / Save PDF" }),
  ).toBeVisible();
});
test("availability conflicts refresh selection and offer alternatives", async ({
  page,
}) => {
  await page.addInitScript(
    (t) => sessionStorage.setItem("iges.token", t),
    token(),
  );
  let gone = false;
  await page.route("**/api/v1/branches/1/rooms/1?**", async (r) => {
    if (gone)
      await r.fulfill({
        status: 404,
        json: { detail: "Room is not available for this stay." },
      });
    else await r.fulfill({ json: inventory[0] });
  });
  await page.goto("/booking");
  await page
    .getByRole("button", { name: "Select room", exact: true })
    .first()
    .click();
  gone = true;
  await page.getByRole("button", { name: "Continue to review" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Let’s find another space.",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Explore alternatives" })
    .click();
  await expect(page.locator(".available-rooms")).toBeVisible();
});
test("price changes require review before any reservation mutation", async ({
  page,
}) => {
  await page.addInitScript(
    (t) => sessionStorage.setItem("iges.token", t),
    token(),
  );
  await page.route("**/api/v1/branches/1/rooms/1?**", (r) =>
    r.fulfill({ json: { ...inventory[0], perNightRate: 60000 } }),
  );
  await page.goto("/booking");
  await page
    .getByRole("button", { name: "Select room", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Continue to review" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Your room rate has changed.",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Review updated charges" })
    .click();
  await expect(page.locator(".summary-total")).toContainText("120,000");
});
test("uncertain reservation is reconciled through owner list without retrying the mutation", async ({
  page,
}) => {
  await page.addInitScript(
    (t) => sessionStorage.setItem("iges.token", t),
    token(),
  );
  let count = 0;
  await page.route("**/api/v1/branches/1/bookings**", async (r) => {
    if (r.request().method() === "POST") {
      count++;
      await r.abort("failed");
    } else await r.fulfill({ json: pageOf(count ? [booking] : []) });
  });
  await page.goto("/booking");
  await page
    .getByRole("button", { name: "Select room", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Continue to review" }).click();
  await page
    .getByRole("button", { name: "Submit reservation", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Submit reservation", exact: true })
    .click();
  await expect(page).toHaveURL(/confirmation\/1\/41/);
  expect(count).toBe(1);
});
test("owner details preserve status, cancel releases rooms, and foreign IDs are unavailable", async ({
  page,
}) => {
  await page.addInitScript(
    (t) => sessionStorage.setItem("iges.token", t),
    token(),
  );
  let cancelled = false;
  await page.route("**/api/v1/branches/1/bookings**", async (r) => {
    if (r.request().url().endsWith("/cancel")) {
      cancelled = true;
      await r.fulfill({ status: 204 });
    } else
      await r.fulfill({
        json: pageOf([
          { ...booking, status: cancelled ? "Cancelled" : "Confirmed" },
        ]),
      });
  });
  await page.goto("/my-bookings/1/41");
  await expect(
    page.getByRole("heading", { name: "Your stay is confirmed." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Cancel reservation", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText(
    "releases the reserved rooms",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel reservation", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your reservation is cancelled." }),
  ).toBeVisible();
  await page.goto("/my-bookings/1/999");
  await expect(page.getByRole("alert")).toContainText(
    "could not be found in your account",
  );
  await expect(page.locator(".receipt")).toHaveCount(0);
});
test("editing has an unsaved-changes dialog and sends owner update with explicit room IDs", async ({
  page,
}) => {
  await page.addInitScript(
    (t) => sessionStorage.setItem("iges.token", t),
    token(),
  );
  let changed = booking;
  await page.route("**/api/v1/branches/1/bookings**", async (r) => {
    if (r.request().method() === "PUT") {
      const p = r.request().postDataJSON();
      expect(p.roomIds).toEqual([1]);
      changed = { ...booking, ...p, totalPrice: 165000 };
      await r.fulfill({ json: changed });
    } else await r.fulfill({ json: pageOf([changed]) });
  });
  await page.goto("/my-bookings/1/41/edit");
  await page.getByLabel("Check-out", { exact: true }).fill("2027-04-13");
  await page.getByRole("link", { name: "Leave edit", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText(
    "Leave your changes behind?",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Keep editing" })
    .click();
  await page.getByRole("button", { name: "Review changes" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save changes" })
    .click();
  await expect(page).toHaveURL(/my-bookings\/1\/41$/);
  await expect(page.locator(".receipt-total")).toContainText("165,000");
});
test("session expiry preserves draft; failure states and honest recovery remain accessible", async ({
  page,
}) => {
  await page.addInitScript(
    (t) => sessionStorage.setItem("iges.token", t),
    token(),
  );
  await page.route("**/api/v1/branches/1/bookings**", (r) =>
    r.fulfill({ status: 401, json: { detail: "Unauthorized" } }),
  );
  await page.goto("/my-bookings");
  await expect(page.getByRole("dialog")).toContainText(
    "Your session has expired",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Keep browsing" })
    .click();
  expect(
    await page.evaluate(
      () => JSON.parse(sessionStorage.getItem("iges.stay")!).checkIn,
    ),
  ).toBe("2027-04-10");
  for (const route of [
    "/403",
    "/500",
    "/503",
    "/offline",
    "/unknown-route",
    "/forgot-password",
    "/verify-email",
  ]) {
    await page.goto(route);
    await expect(page.locator("h1")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Send reset email", exact: true }),
    ).toHaveCount(0);
  }
  await page.goto("/forgot-password");
  await expect(
    page.getByRole("heading", {
      name: "Online account recovery is not available yet.",
    }),
  ).toBeVisible();
});
test("500/503/network and rate limits remain visible and never fall back to fake rooms", async ({
  page,
}) => {
  for (const status of [500, 503, 429]) {
    await page.route("**/api/v1/branches/1/rooms?**", (r) =>
      r.fulfill({
        status,
        json: { detail: "Backend unavailable" },
        headers: status === 429 ? { "Retry-After": "60" } : {},
      }),
    );
    await page.goto("/booking");
    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page.locator(".available-room")).toHaveCount(0);
  }
  await page.route("**/api/v1/branches/1/rooms?**", (r) => r.abort());
  await page.goto("/booking");
  await expect(page.getByRole("alert")).toContainText("could not reach");
  await page.evaluate(() => window.dispatchEvent(new Event("offline")));
  await expect(page.locator(".offline-banner")).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(
    page.getByRole("status").filter({ hasText: "Connection restored" }),
  ).toBeVisible();
});
test("primary pages reflow at phone, tablet and desktop widths, with accessible mobile controls", async ({
  page,
}) => {
  test.setTimeout(90_000);
  for (const path of [
    "/",
    "/rooms",
    "/rooms/twin",
    "/booking",
    "/login",
    "/register",
    "/kitchen",
    "/contact",
    "/privacy",
    "/terms",
  ]) {
    await page.goto(path);
    await expect(page.locator("h1")).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    for (const width of [320, 390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect.soft(scrollWidth, `${path} at ${width}px`).toBeLessThanOrEqual(width);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/rooms/twin");
  await page.getByRole("button", { name: "Open bedroom gallery" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const offset = await dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return Math.max(Math.abs(rect.left + rect.width / 2 - innerWidth / 2),
      Math.abs(rect.top + rect.height / 2 - innerHeight / 2));
  });
  expect(offset).toBeLessThan(2);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Open bedroom gallery" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .locator("nav")
    .getByRole("link", { name: "Kitchen", exact: true })
    .click();
  await expect(page).toHaveURL(/kitchen/);
});
