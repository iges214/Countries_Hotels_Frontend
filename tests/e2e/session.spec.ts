import { expect, test } from "@playwright/test";
import { mockApi, pageOf } from "./fixtures";

const id = "61f6a4f9-d404-4fea-ab97-f7c98f57f0ec";
const path = "/api/v1/auth/session/" + id;
const hour = 3600;

function token(expires: number, idleUntil: number, sessionUntil: number) {
  return "x." + Buffer.from(JSON.stringify({
    sub: "owner",
    name: "Test Guest",
    exp: expires,
    session_id: id,
    idle_until: idleUntil,
    session_until: sessionUntil,
  })).toString("base64url") + ".x";
}

test("renewal restores an expired access token and keeps the profile open during activity", async ({ page }) => {
  const now = Math.floor(Date.now() / 1000);
  const absolute = now + 24 * hour;
  const first = token(now + 600, now + 6 * hour, absolute);
  const second = token(now + 900, now + 6 * hour + 180, absolute);
  await page.clock.install({ time: now * 1000 });
  await mockApi(page);
  await page.addInitScript((jwt) => sessionStorage.setItem("iges.token", jwt),
    token(now - 60, now + 6 * hour, absolute));

  const activity: boolean[] = [];
  await page.route("**" + path + "/refresh", async (route) => {
    activity.push(route.request().postDataJSON().activity);
    expect(route.request().headers()["x-iges-session"]).toBe("1");
    await route.fulfill({ json: activity.length === 1 ? first : second });
  });
  await page.route("**/api/v1/account/bookings?*", (route) => {
    expect(route.request().headers().authorization).toBe("Bearer " + first);
    return route.fulfill({ json: pageOf([]) });
  });
  let signedOut = 0;
  await page.route("**" + path + "/logout", (route) => {
    signedOut++;
    expect(route.request().headers().authorization).toBe("Bearer " + second);
    return route.fulfill({ status: 204 });
  });

  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "No active reservations" })).toBeVisible();
  expect(activity).toEqual([false]);
  const profile = page.getByRole("button", { name: "Profile", exact: true });
  await profile.click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  const confirmation = page.getByRole("dialog", { name: "Sign out?" });
  await page.clock.fastForward(180_000);
  await page.keyboard.press("Tab");
  await expect.poll(() => activity).toEqual([false, true]);
  await expect.poll(() => page.evaluate(() => sessionStorage.getItem("iges.token"))).toBe(second);
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole("button", { name: "Cancel" }).click();
  expect(signedOut).toBe(0);
  await expect(page.getByRole("heading", { name: "My profile" })).toBeVisible();
  await profile.click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await confirmation.getByRole("button", { name: "Yes, sign out" }).click();
  await expect(profile).toHaveCount(0);
  expect(signedOut).toBe(1);
});

test("an idle tab checks its deadline without extending inactivity", async ({ page }) => {
  const now = Math.floor(Date.now() / 1000);
  await page.clock.install({ time: now * 1000 });
  await mockApi(page);
  await page.addInitScript((jwt) => sessionStorage.setItem("iges.token", jwt),
    token(now + 600, now + 6 * hour, now + 24 * hour));
  const activity: boolean[] = [];
  await page.route("**" + path + "/refresh", async (route) => {
    activity.push(route.request().postDataJSON().activity);
    await route.fulfill({ status: 401 });
  });
  await page.goto("/");
  const profile = page.getByRole("button", { name: "Profile", exact: true });
  await expect(profile).toBeVisible();
  await page.clock.fastForward(5 * hour * 1000);
  await expect(profile).toBeVisible();
  expect(activity).toEqual([]);
  await page.clock.fastForward(hour * 1000 + 2000);
  await expect(profile).toHaveCount(0);
  expect(activity).toEqual([false]);
});
