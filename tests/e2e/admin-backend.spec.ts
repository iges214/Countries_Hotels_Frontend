import { test, expect } from "@playwright/test";
import { createHmac } from "node:crypto";
test.skip(
  process.env.IGES_REAL_BACKEND_TESTS !== "1",
  "Requires the isolated ApiHarness on port 5199.",
);

test("admin dashboard uses real backend room, booking, stay, website and message endpoints", async ({
  page,
  request,
}) => {
  test.setTimeout(120000);
  const origin = "http://127.0.0.1:5199";
  const segment = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  // Only valid in the isolated test host. Never use this signing key in a real deployment.
  const unsigned =
    segment({ alg: "HS256", typ: "JWT" }) +
    "." +
    segment({
      sub: "guest",
      name: "Test Administrator",
      "http://schemas.microsoft.com/ws/2008/06/identity/claims/role":
        "Administrator",
      iss: "NoName_Hotel",
      aud: "NoName_HotelClient",
      exp: Math.floor(Date.now() / 1000) + 1800,
    });
  const token =
    unsigned +
    "." +
    createHmac("sha256", "IGES-Tests-Only-Signing-Key-At-Least-32-Bytes!")
      .update(unsigned)
      .digest("base64url");
  const headers = { Authorization: "Bearer " + token };
  const email = `admin-flow-${Date.now()}@example.test`;
  expect(
    (
      await request.post(origin + "/api/v1/auth/register", {
        data: {
          firstName: "Admin",
          lastName: "Flow Guest",
          email,
          password: "BrowserTest123!",
        },
      })
    ).ok(),
  ).toBeTruthy();
  const login = await request.post(origin + "/api/v1/auth/login", {
    data: { email, password: "BrowserTest123!" },
  });
  const guestToken = (await login.text()).replace(/^"|"$/g, "");
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const checkout = new Date(day + "T12:00:00Z");
  checkout.setUTCDate(checkout.getUTCDate() + 2);
  const created = await request.post(origin + "/api/v1/branches/1/bookings", {
    headers: { Authorization: "Bearer " + guestToken },
    data: {
      hotelId: 1,
      checkIn: day,
      checkOut: checkout.toISOString().slice(0, 10),
      guests: 2,
      rooms: 1,
      roomIds: [3],
    },
  });
  expect(created.ok(), await created.text()).toBeTruthy();
  const booking = await created.json();
  await page.addInitScript(
    (t) => sessionStorage.setItem("iges.token", t),
    token,
  );
  await page.route("https://example.com/**", (r) => r.abort());
  await page.route("**/api/v1/**", async (route) => {
    const response = await route.fetch({
      url: route.request().url().replace("http://127.0.0.1:5173", origin),
    });
    await route.fulfill({ response });
  });
  await page.goto(`/admin/bookings/${booking.id}?branch=1`);
  await expect(
    page.getByRole("heading", { name: "Reservation IG-" + booking.id }),
  ).toBeVisible();
  await expect(page.getByText(email, { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Confirm booking", exact: true })
    .click();
  await page.getByRole("button", { name: "Check in guest" }).click();
  await page.getByRole("button", { name: "Confirm check-in" }).click();
  await expect(
    page.getByRole("button", { name: "Record checkout" }),
  ).toBeVisible();
  await page
    .getByRole("navigation")
    .getByRole("link", { name: "Guests", exact: true })
    .click();
  await expect(page.locator(".ad-table")).toContainText("Admin Flow Guest");
  await expect(page.locator(".ad-table")).toContainText("160");
  await page.getByRole("link", { name: "View stay" }).click();
  await page.getByRole("button", { name: "Record checkout" }).click();
  await page.getByRole("button", { name: "Confirm checkout" }).click();
  await expect(page.getByText("Checked out", { exact: true })).toBeVisible();
  await page.goto("/admin/rooms/3?branch=1");
  await page.getByLabel("Nightly rate (NGN)", { exact: true }).fill("125");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  const rooms = await request.get(origin + "/api/v1/branches/1/admin/rooms", {
    headers,
  });
  await expect
    .poll(
      async () =>
        (
          await (
            await request.get(origin + "/api/v1/branches/1/admin/rooms", {
              headers,
            })
          ).json()
        ).data.find((r: any) => r.id === 3).perNightRate,
    )
    .toBe(125);
  expect(rooms.ok()).toBeTruthy();
  await page.goto("/admin/website?branch=1");
  await page
    .getByLabel("Public email", { exact: true })
    .fill("hotel@example.test");
  await page.getByRole("switch", { name: "Publish contact details" }).check();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect
    .poll(
      async () =>
        (
          await (
            await request.get(origin + "/api/v1/branches/1/website")
          ).json()
        ).publicEmail,
    )
    .toBe("hotel@example.test");
  const enquiry = await request.post(origin + "/api/v1/branches/1/messages", {
    data: {
      senderName: "Browser Enquiry",
      senderEmail: email,
      subject: "Dining enquiry",
      body: "Is dinner available after 8 pm?",
    },
  });
  expect(enquiry.status()).toBe(202);
  await page.goto("/admin/messages?branch=1");
  await expect(
    page.getByRole("heading", { name: "Dining enquiry" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mark as read" }).click();
  await expect(page.getByRole("button", { name: "Mark unread" })).toBeVisible();
});
