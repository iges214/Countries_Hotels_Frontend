import { expect, test } from "@playwright/test";
import { booking, mockApi, pageOf, seed } from "./fixtures";

test("the guest profile menu confirms sign-out and Cancel keeps the session", async ({
  page,
}) => {
  await mockApi(page);
  await seed(page, true);
  await page.route("**/api/v1/account/bookings?*", (route) =>
    route.fulfill({ json: pageOf([]) }),
  );
  await page.goto("/");
  const profile = page.getByRole("button", { name: "Profile", exact: true });
  await profile.click();
  await page.getByRole("link", { name: "View profile" }).click();
  await expect(page.getByRole("heading", { name: "My profile" })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  await page.setViewportSize({ width: 320, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "My bookings" })).toBeVisible();
  await page.getByRole("button", { name: "Close navigation" }).click();
  await profile.click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  const confirmation = page.getByRole("dialog", { name: "Sign out?" });
  await confirmation
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await expect(confirmation).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "My profile" })).toBeVisible();
  await profile.click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await confirmation.getByRole("button", { name: "Yes, sign out" }).click();
  await expect(profile).toHaveCount(0);
  await expect(
    page.getByText(
      "Sign in to view your profile and manage your reservations.",
    ),
  ).toBeVisible();
});

test("guest bookings separate history from current stays and lock checked-in reservations", async ({
  page,
}) => {
  await mockApi(page);
  await seed(page, true);
  const futureDate = new Date(Date.now() + 3 * 86_400_000)
    .toISOString()
    .slice(0, 10);
  const upcoming = {
    ...booking,
    checkIn: new Date(Date.now() + 86_400_000).toISOString().slice(0, 10),
    checkOut: futureDate,
    status: "Confirmed",
  };
  const checkedIn = {
    ...booking,
    id: 42,
    hotelId: 2,
    hotelName: "Second branch",
    checkIn: "2020-01-01",
    checkOut: "2020-01-03",
    status: "Confirmed",
    isCheckedIn: true,
  };
  const completed = {
    ...booking,
    id: 43,
    status: "Confirmed",
    isCheckedOut: true,
  };
  await page.route("**/api/v1/account/bookings?*", (route) =>
    route.fulfill({ json: pageOf([upcoming, checkedIn, completed]) }),
  );
  await page.route("**/api/v1/branches/2", (route) =>
    route.fulfill({ json: { id: 2, name: "Second branch" } }),
  );
  await page.route("**/api/v1/branches/2/bookings?*", (route) =>
    route.fulfill({ json: pageOf([checkedIn]) }),
  );
  await page.route("**/api/v1/branches/1/bookings?*", (route) =>
    route.fulfill({ json: pageOf([upcoming]) }),
  );
  await page.route("**/api/v1/branches/1/bookings/41/cancel", (route) => {
    upcoming.status = "Cancelled";
    return route.fulfill({ status: 204 });
  });
  await page.goto("/profile");
  const active = page.getByRole("region", {
    name: "Current and upcoming bookings",
  });
  const history = page.getByRole("region", { name: "Booking history" });
  await expect(active).toContainText("Booking #41");
  await expect(active).toContainText("Checked in");
  await expect(history).toContainText("Checked out");
  const inHouse = active.locator("article").filter({ hasText: "Booking #42" });
  await expect(
    inHouse.getByRole("link", { name: "Edit reservation" }),
  ).toHaveCount(0);
  await expect(
    inHouse.getByRole("link", { name: "Cancel reservation" }),
  ).toHaveCount(0);
  await expect(
    active.getByRole("link", { name: "Edit reservation" }),
  ).toHaveAttribute("href", "/my-bookings/1/41/edit");
  await active.getByRole("link", { name: "Cancel reservation" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel reservation", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Your reservation is cancelled." }),
  ).toBeVisible();
  await page.goto("/my-bookings/2/42/edit");
  await expect(
    page.getByRole("heading", { name: "This stay can no longer be edited" }),
  ).toBeVisible();
});

test("a guest can update personal details and change their password", async ({
  page,
}) => {
  await mockApi(page);
  await seed(page, true);
  await page.route("**/api/v1/account/bookings?*", (route) =>
    route.fulfill({ json: pageOf([]) }),
  );
  const account = {
    firstName: "Ada",
    lastName: "Okoro",
    email: "ada@example.com",
  };
  await page.route("**/api/v1/account", (route) => {
    if (route.request().method() === "PUT") {
      Object.assign(account, route.request().postDataJSON());
      return route.fulfill({ status: 204 });
    }
    return route.fulfill({ json: account });
  });
  await page.route("**/api/v1/account/password", (route) =>
    route.fulfill({ status: 204 }),
  );
  await page.goto("/profile");
  await page.getByRole("button", { name: "Personal details" }).click();
  await expect(page.getByLabel("Email address")).toHaveValue(account.email);
  await page.getByLabel("First name").fill("Adanna");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("status").filter({
    hasText: "Your profile details were saved.",
  })).toBeVisible();
  expect(account.firstName).toBe("Adanna");
  await page
    .getByRole("button", { name: "Change password", exact: true })
    .click();
  await page
    .getByLabel("Current password", { exact: true })
    .fill("OldPassword1!");
  await page.getByLabel("New password", { exact: true }).fill("NewPassword1!");
  await page
    .getByLabel("Confirm new password", { exact: true })
    .fill("DifferentPassword1!");
  await page.getByRole("button", { name: "Update password" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Your new passwords do not match.",
  );
  await page
    .getByLabel("Confirm new password", { exact: true })
    .fill("NewPassword1!");
  const request = page.waitForRequest(
    (r) => r.url().endsWith("/account/password") && r.method() === "POST",
  );
  await page.getByRole("button", { name: "Update password" }).click();
  expect((await request).postDataJSON()).toEqual({
    currentPassword: "OldPassword1!",
    newPassword: "NewPassword1!",
  });
  await expect(page).toHaveURL(/\/login\?returnTo=%2Fprofile$/);
  await expect(page.getByRole("status")).toContainText("Password updated.");
});
