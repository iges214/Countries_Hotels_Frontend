import { test, expect } from "@playwright/test";
test.skip(
  process.env.IGES_REAL_BACKEND_TESTS !== "1",
  "Opt in with IGES_REAL_BACKEND_TESTS=1 and the isolated ApiHarness running.",
);
test("real supplied backend: register, sign in, reserve, enforce ownership, edit and cancel", async ({
  page,
  request,
}) => {
  test.setTimeout(90000);
  await expect
    .poll(
      async () => {
        try {
          return (
            await request.get("http://127.0.0.1:5199/harness/ready")
          ).ok();
        } catch {
          return false;
        }
      },
      { timeout: 30000, intervals: [1000] },
    )
    .toBeTruthy();
  const email = `browser-${Date.now()}@example.test`;
  const password = "BrowserTest123!";
  await page.route("https://example.com/**", (r) => r.abort());
  await page.route("**/api/v1/**", async (r) => {
    const url = r
      .request()
      .url()
      .replace("http://127.0.0.1:5173", "http://127.0.0.1:5199");
    const response = await r.fetch({ url });
    await r.fulfill({ response });
  });
  await page.goto("/booking");
  await expect(
    page.getByRole("button", { name: "Select room", exact: true }),
  ).toHaveCount(5);
  await page
    .getByRole("button", { name: "Select room", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Continue to review" }).click();
  await page
    .getByRole("dialog")
    .getByRole("link", { name: "First time? Create account" })
    .click();
  await page.getByLabel("First name", { exact: true }).fill("Browser");
  await page.getByLabel("Last name", { exact: true }).fill("Guest");
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByLabel("Confirm password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create account & continue" }).click();
  await expect(page).toHaveURL(/login/);
  await page.getByLabel("Email address", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in & continue" }).click();
  await expect(page).toHaveURL(/\/booking$/);
  const beforeRenewal = await page.evaluate(() => sessionStorage.getItem("iges.token"));
  const refreshCookie = () => page.context().cookies().then((cookies) =>
    cookies.find((cookie) => cookie.name === "iges.refresh"),
  );
  const initialCookie = await refreshCookie();
  expect(initialCookie).toMatchObject({ secure: true, httpOnly: true, sameSite: "Strict" });
  await page.clock.install();
  await page.clock.fastForward(3 * 60_000);
  await page.keyboard.press("Tab");
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem("iges.token"))).not.toBe(beforeRenewal);
  expect((await refreshCookie())?.value).not.toBe(initialCookie?.value);
  await page.getByRole("button", { name: "Continue to review" }).click();
  await page
    .getByRole("button", { name: "Submit reservation", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Submit reservation", exact: true })
    .click();
  await expect(page).toHaveURL(/confirmation\/1\/\d+/);
  await expect(page.locator(".status-badge")).toHaveText("Pending");
  await expect(page.locator(".receipt-total")).toContainText("200");
  const bookingId = Number(new URL(page.url()).pathname.split("/").at(-1));
  const ownerToken = await page.evaluate(() =>
    sessionStorage.getItem("iges.token"),
  );
  const ownerResponse = await request.get(
    "http://127.0.0.1:5199/api/v1/branches/1/bookings",
    { headers: { Authorization: "Bearer " + ownerToken } },
  );
  const owned = (await ownerResponse.json()).data;
  expect(owned).toHaveLength(1);
  const created = owned[0];
  // A second actual account must see neither the reservation nor its data.
  const otherEmail = `other-${Date.now()}@example.test`;
  expect(
    (
      await request.post("http://127.0.0.1:5199/api/v1/auth/register", {
        data: {
          firstName: "Other",
          lastName: "Guest",
          email: otherEmail,
          password,
        },
      })
    ).ok(),
  ).toBeTruthy();
  const otherLogin = await request.post(
    "http://127.0.0.1:5199/api/v1/auth/login",
    { data: { email: otherEmail, password } },
  );
  const otherToken = await otherLogin.text();
  const otherHeaders = {
    Authorization: "Bearer " + otherToken.replace(/^"|"$/g, ""),
  };
  const otherList = await request.get(
    "http://127.0.0.1:5199/api/v1/branches/1/bookings",
    { headers: otherHeaders },
  );
  expect((await otherList.json()).data).toEqual([]);
  expect(
    (
      await request.post(
        `http://127.0.0.1:5199/api/v1/branches/1/bookings/${bookingId}/cancel`,
        { headers: otherHeaders },
      )
    ).status(),
  ).toBe(404);
  await page.goto(`/my-bookings/1/${bookingId}/edit`);
  const checkout = new Date(created.checkOut + "T12:00:00Z");
  checkout.setUTCDate(checkout.getUTCDate() + 1);
  await page
    .getByLabel("Check-out", { exact: true })
    .fill(checkout.toISOString().slice(0, 10));
  await page.getByRole("button", { name: "Review changes" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save changes" })
    .click();
  await expect(page).toHaveURL(new RegExp(`my-bookings/1/${bookingId}$`));
  await expect(page.locator(".receipt-total")).toContainText("300");
  await page
    .getByRole("button", { name: "Cancel reservation", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel reservation", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your reservation is cancelled." }),
  ).toBeVisible();
  const released = await request.get(
    `http://127.0.0.1:5199/api/v1/branches/1/rooms?checkIn=${created.checkIn}&checkOut=${created.checkOut}&guests=2`,
  );
  expect(
    (await released.json()).data.some(
      (r: { id: number }) => r.id === created.roomIds[0],
    ),
  ).toBeTruthy();
  await page.screenshot({
    path: "verification/real-backend-cancelled.png",
    fullPage: true,
  });
});
