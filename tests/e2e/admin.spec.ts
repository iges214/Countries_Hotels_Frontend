import { test, expect, type Page } from "@playwright/test";
import { branch, inventory, pageOf, token } from "./fixtures";

const current = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Lagos",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
const after = () => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 3);
  return d.toISOString().slice(0, 10);
};
async function adminFixture(
  page: Page,
  options: {
    system?: boolean;
    denied?: boolean;
    signedOut?: boolean;
    noBranches?: boolean;
  } = {},
) {
  const mutations: { path: string; method: string; body: unknown }[] = [];
  const rooms = inventory.map((r, i) => ({
    ...r,
    number: i === 1 ? 165 : r.number,
    isPublished: i !== 3,
    isOperational: i !== 2,
    photos: r.photos.map((p, k) => ({ ...p, id: r.id * 10 + k })),
  }));
  const bookings = [
    {
      id: 1048,
      hotelId: 1,
      guestName: "Ada Okoro",
      guestEmail: "ada.okoro@example.com",
      checkIn: current(),
      checkOut: after(),
      guests: 2,
      rooms: 1,
      totalPrice: 120000,
      currencyCode: "NGN",
      status: "Pending",
      createAt: new Date().toISOString(),
      updateAt: null,
      actualCheckInAt: null as string | null,
      actualCheckOutAt: null as string | null,
      expectedCheckoutAt: after() + "T11:00:00Z",
      assignments: [
        {
          roomId: 2,
          number: 165,
          category: "Normal",
          bedType: "Twin",
          maxGuests: 2,
          guests: null as number | null,
          nightlyRate: 40000,
        },
      ],
    },
  ];
  let website = {
    displayName: "IGES Hotel & Suites",
    heroImageUrl: "",
    publicEmail: "management@example.com",
    phone: "",
    privacyPolicy: "",
    bookingPolicy: "",
    checkoutTime: "12:00:00",
    contactPublished: false,
    privacyPublished: false,
    bookingPolicyPublished: false,
  };
  let messages = [
    {
      id: 1,
      senderName: "Ada Okoro",
      senderEmail: "ada.okoro@example.com",
      subject: "Late arrival for booking IG-1048",
      body: "Hello, I expect to arrive around 9 pm today. Please let me know if I need to do anything before arrival.",
      receivedAt: new Date().toISOString(),
      isRead: false,
      isArchived: false,
      channel: "Website message",
      replies: [],
    },
  ];
  let assignments: {
    id: number;
    userId: string;
    firstName: string;
    lastName: string;
    email: string;
  }[] = [];
  if (!options.signedOut)
    await page.addInitScript(
      (t) => sessionStorage.setItem("iges.token", t),
      token("admin"),
    );
  await page.route("https://example.test/**", (r) => r.abort());
  await page.route("**/api/v1/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname.replace("/api/v1", "");
    const method = req.method();
    const raw = req.postData();
    let value: any;
    try {
      value = raw ? JSON.parse(raw) : undefined;
    } catch {
      value = raw;
    }
    if (method !== "GET") mutations.push({ path, method, body: value });
    let body: unknown;
    let status = 200;
    if (path === "/auth/login") body = token("admin");
    else if (path === "/admin/me") {
      if (options.denied) {
        status = 403;
        body = { detail: "Access denied." };
      } else
        body = {
          id: "admin",
          firstName: "Sandra",
          lastName: "Example",
          email: "sandra@example.com",
          isSystemAdministrator: options.system !== false,
          branchIds: options.noBranches ? [] : [1],
        };
    } else if (path === "/hotel")
      body = { name: "IGES Hotel & Suites", roomCategories: [] };
    else if (path === "/branches") {
      if (method === "GET" && options.noBranches) body = pageOf([]);
      else if (method === "GET")
        body = pageOf([
          { ...branch, countryId: 1, perNightRate: 35000, totalRooms: 5 },
          {
            ...branch,
            id: 2,
            name: "Second branch",
            countryId: 1,
            perNightRate: 35000,
          },
        ]);
      else body = { ...value, id: 3 };
    } else if (path === "/countries")
      body = [
        { id: 1, name: "Nigeria", shortName: "NG" },
        { id: 2, name: "Zimbabwe", shortName: "ZW" },
        { id: 3, name: "United States", shortName: "US" },
      ];
    else if (path.endsWith("/admin/rooms")) body = pageOf(rooms);
    else if (path.endsWith("/admin/bookings")) body = pageOf(bookings);
    else if (path.endsWith("/admin/offerings"))
      body = pageOf([
        {
          id: 1,
          hotelId: 1,
          kind: "Meal",
          name: "Jollof rice & grilled chicken",
          description: "Smoky jollof rice with grilled chicken and salad.",
          openingHours: "12:00–21:00",
          price: 8500,
          imageUrl: "",
          currencyCode: "NGN",
          isPublished: true,
        },
      ]);
    else if (path.endsWith("/admin/website")) {
      if (method === "PUT") {
        website = value;
        status = 204;
      } else body = website;
    } else if (path.endsWith("/website"))
      body = {
        ...website,
        publicEmail: website.contactPublished ? website.publicEmail : "",
      };
    else if (path.endsWith("/admin/messages")) body = pageOf(messages);
    else if (path.endsWith("/admin/mail-status"))
      body = { replyConfigured: false, incomingEmailConnected: false };
    else if (path.endsWith("/admin/messages/1")) {
      messages = messages.map((m) => ({ ...m, ...value }));
      status = 204;
    } else if (path.endsWith("/admin/confirm")) {
      bookings[0].status = "Confirmed";
      status = 204;
    } else if (path.endsWith("/check-in")) {
      bookings[0].actualCheckInAt = new Date().toISOString();
      bookings[0].assignments[0].guests = value.rooms[0].guests;
      status = 204;
    } else if (path.endsWith("/check-out")) {
      bookings[0].actualCheckOutAt = new Date().toISOString();
      status = 204;
    } else if (path.endsWith("/admin/cancel")) {
      bookings[0].status = "Cancelled";
      status = 204;
    } else if (/\/rooms\/\d+\/photos$/.test(path))
      body = {
        id: 100,
        kind: "Room",
        url: "/uploads/test.png",
        caption: "Bedroom",
      };
    else if (/\/rooms\/\d+$/.test(path) && method === "PUT") {
      const room = rooms.find((r) => r.id === Number(path.split("/").at(-1)));
      Object.assign(room!, value);
      body = room;
    } else if (path.endsWith("/rooms") && method === "POST") {
      const r = { ...rooms[0], ...value, id: 99, photos: [] };
      rooms.push(r);
      body = r;
    } else if (path.endsWith("/admin/administrators")) {
      if (method === "POST") {
        assignments.push({
          id: 1,
          userId: "team",
          firstName: "Team",
          lastName: "Member",
          email: value.email,
        });
        body = { id: 1 };
      } else body = assignments;
    } else if (/\/administrators\/\d+$/.test(path) && method === "DELETE") {
      assignments = [];
      status = 204;
    } else if (path.endsWith("/offerings")) body = pageOf([]);
    else if (path.endsWith("/rooms")) body = pageOf(rooms);
    else {
      status = method === "GET" ? 404 : 204;
      body = { detail: "Not found" };
    }
    await route.fulfill(status === 204 ? { status } : { status, json: body });
  });
  return { mutations, bookings, rooms };
}

test("admin sign-in and access denial never expose private screens", async ({
  page,
}) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/admin\/login/);
  await expect(
    page.getByRole("heading", { name: "Welcome back." }),
  ).toBeVisible();
  await adminFixture(page, { denied: true });
  await page.goto("/admin");
  await expect(page.getByText("Access denied.", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Administration" }),
  ).toHaveCount(0);
});

for (const [account, system, denied, destination] of [
  ["system administrator", true, false, "/admin"],
  ["branch administrator", false, false, "/admin"],
  ["guest", false, true, "/booking"],
] as const) {
  test(`public sign-in routes a ${account} to ${destination}`, async ({
    page,
  }) => {
    await adminFixture(page, { system, denied, signedOut: true });
    await page.goto("/login");
    await page
      .getByLabel("Email address", { exact: true })
      .fill("staff@example.com");
    await page.getByLabel("Password", { exact: true }).fill("TestPassword1!");
    await page.getByRole("button", { name: "Sign in & continue" }).click();
    await expect(page).toHaveURL(new RegExp(`${destination}$`));
    if (denied) {
      await expect(
        page.getByRole("link", { name: "My bookings" }).first(),
      ).toBeVisible();
    } else {
      await expect(
        page.getByRole("navigation", { name: "Administration" }),
      ).toBeVisible();
    }
  });
}

test("the system administrator can use the workspace before creating a branch", async ({
  page,
}) => {
  await adminFixture(page, { noBranches: true });
  await page.goto("/admin");
  await expect(page.getByLabel("Current branch")).toBeDisabled();
  await expect(page.getByText("No branches yet")).toBeAttached();
  await expect(
    page.getByRole("link", { name: "Set up your first location" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Administrators", exact: true }).click();
  await expect(
    page.getByRole("row", {
      name: /Sandra Example.*System administrator.*All branches/,
    }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Assign access" })).toHaveCount(
    0,
  );
  await page.getByRole("link", { name: "Manage hotel locations" }).click();
  await expect(page.getByRole("button", { name: "Add branch" })).toBeVisible();
});

test("branch setup detects time zones and accepts numbers without a leading zero", async ({
  page,
}) => {
  const { mutations } = await adminFixture(page, { noBranches: true });
  await page.goto("/admin/branches");
  await page.getByRole("button", { name: "Add branch" }).click();
  const country = page.getByRole("combobox", { name: "Country", exact: true });
  const zone = page.getByLabel(/^Time zone/);
  const rooms = page.getByLabel(/^Operational rooms/);
  const rate = page.getByLabel(/^Legacy branch nightly rate/);
  await expect(zone).toBeDisabled();
  await country.selectOption({ label: "Nigeria" });
  await expect(zone).toHaveValue("Africa/Lagos");
  await expect(zone.locator("option:checked")).toContainText("WAT (UTC+1)");
  await country.selectOption({ label: "Zimbabwe" });
  await expect(zone.locator("option:checked")).toContainText("CAT (UTC+2)");
  await country.selectOption({ label: "United States" });
  await page.getByLabel("City", { exact: true }).fill("Springfield");
  await expect(zone).toHaveValue("");
  await page.getByLabel("State", { exact: true }).fill("Illinois");
  await expect(zone).toHaveValue("America/Chicago");
  await page.getByLabel("State", { exact: true }).fill("Oregon");
  await expect(zone).toHaveValue("America/Los_Angeles");
  await expect(rooms).toHaveValue("");
  await expect(rate).toHaveValue("");
  await rooms.pressSequentially("12");
  await rate.pressSequentially("125.50");
  await expect(rooms).toHaveValue("12");
  await expect(rate).toHaveValue("125.50");
  await page.getByLabel("Branch name", { exact: true }).fill("Springfield");
  await page.getByLabel("Address", { exact: true }).fill("123 Main Street");
  await page.getByRole("button", { name: "Save branch" }).click();
  await expect
    .poll(
      () =>
        mutations.find(
          ({ path, method }) => path === "/branches" && method === "POST",
        )?.body,
    )
    .toMatchObject({
      countryId: 3,
      timeZoneId: "America/Los_Angeles",
      totalRooms: 12,
      perNightRate: 125.5,
    });
});

test("admin sign-out can be cancelled and requires confirmation from the account page", async ({
  page,
}) => {
  await adminFixture(page);
  await page.goto("/admin");
  const nav = page.getByRole("navigation", { name: "Administration" });
  await expect(nav).toBeVisible();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Sign out?" });
  const offset = await dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return Math.max(Math.abs(rect.left + rect.width / 2 - innerWidth / 2),
      Math.abs(rect.top + rect.height / 2 - innerHeight / 2));
  });
  expect(offset).toBeLessThan(2);
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(nav).toBeVisible();
  await page
    .getByRole("link", { name: "My account", exact: true })
    .first()
    .click();
  await page
    .getByRole("main")
    .getByRole("button", { name: "Sign out", exact: true })
    .click();
  await dialog.getByRole("button", { name: "Yes, sign out" }).click();
  await expect(page).toHaveURL(/\/admin\/login$/);
  await expect(nav).toHaveCount(0);
});

test("booking confirmation, recorded check-in, guest list and checkout work together", async ({
  page,
}) => {
  const fixture = await adminFixture(page);
  await page.goto("/admin/bookings/1048?branch=1");
  await page
    .getByRole("button", { name: "Confirm booking", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Check in guest" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Check in guest" }).click();
  await page.getByRole("button", { name: "Confirm check-in" }).click();
  await expect(
    page.getByRole("button", { name: "Record checkout" }),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Administration" })
    .getByRole("link", { name: "Guests", exact: true })
    .click();
  await expect(page.locator(".ad-table")).toContainText("Ada Okoro");
  await expect(page.locator(".ad-table")).toContainText("165");
  await page.getByRole("link", { name: "View stay" }).click();
  await page.getByRole("button", { name: "Record checkout" }).click();
  await page.getByRole("button", { name: "Confirm checkout" }).click();
  await page
    .getByRole("navigation", { name: "Administration" })
    .getByRole("link", { name: "Guests", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "No current stays" }),
  ).toBeVisible();
  expect(
    fixture.mutations.filter((m) => m.path.endsWith("/check-in")),
  ).toHaveLength(1);
  expect(
    fixture.mutations.filter((m) => m.path.endsWith("/check-out")),
  ).toHaveLength(1);
});

test("room edits use the selected branch and file uploads are multipart", async ({
  page,
}) => {
  const fixture = await adminFixture(page);
  await page.goto("/admin/rooms/2?branch=2");
  await expect(page.getByLabel("Current branch")).toHaveValue("2");
  await page.getByLabel("Nightly rate (NGN)", { exact: true }).fill("45000");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect
    .poll(() =>
      fixture.mutations.some(
        (m) =>
          m.path === "/branches/2/rooms/2" &&
          (m.body as any).perNightRate === 45000,
      ),
    )
    .toBeTruthy();
  await page.goto("/admin/images?branch=2&room=2");
  await page.getByRole("button", { name: "Upload images" }).click();
  await page.getByLabel("Image file", { exact: true }).setInputFiles({
    name: "bedroom.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==",
      "base64",
    ),
  });
  const request = page.waitForRequest(
    (r) =>
      r.url().endsWith("/branches/2/rooms/2/photos") && r.method() === "POST",
  );
  await page
    .getByRole("button", { name: "Upload photograph", exact: true })
    .click();
  expect((await request).headers()["content-type"]).toContain(
    "multipart/form-data",
  );
});

test("a branch admin can publish five photos and the homepage slides through them", async ({ page }) => {
  const fixture = await adminFixture(page, { system: false });
  const roomUpload = "/uploads/hero-room.png";
  await page.route("**/api/v1/branches/1/images", async (route) => {
    expect(route.request().headers()["content-type"]).toContain("multipart/form-data");
    await route.fulfill({ json: { url: roomUpload } });
  });
  const image = '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"><rect width="1600" height="900" fill="#244940"/></svg>';
  await page.route("**/uploads/hero-*.png", (route) =>
    route.fulfill({ contentType: "image/svg+xml", body: image }),
  );
  const photos = {
    heroImageUrl: "/uploads/hero-exterior.png",
    heroRoomImageUrl: roomUpload,
    heroKitchenImageUrl: "/uploads/hero-kitchen.png",
    heroBarImageUrl: "/uploads/hero-bar.png",
    heroPoolImageUrl: "/uploads/hero-pool.png",
  };
  await page.goto("/admin/website?branch=1");
  const slot = page.getByLabel("Hero slide");
  const url = page.getByLabel("Or image URL");
  for (const [key, value] of Object.entries(photos)) {
    await slot.selectOption(key);
    if (key === "heroRoomImageUrl") {
      await page.getByLabel("Upload hero photograph").setInputFiles({
        name: "room.png",
        mimeType: "image/png",
        buffer: Buffer.from("test image"),
      });
      await expect(url).toHaveValue(value);
    } else await url.fill(value);
  }
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText(/Website settings saved/)).toBeVisible();
  expect(fixture.mutations.find((mutation) => mutation.path.endsWith("/admin/website"))?.body)
    .toMatchObject(photos);

  await page.clock.install();
  await page.goto("/");
  const controls = page.getByRole("group", { name: "Hotel photos" });
  await expect(controls).toContainText("1 / 5");
  await expect(page.locator(".hero-slide.current")).toHaveAttribute("src", photos.heroImageUrl);
  await page.clock.fastForward(6600);
  await expect(controls).toContainText("2 / 5");
  await expect(page.locator(".hero-slide.current")).toHaveClass(/entering/);
  await expect(page.locator(".hero-slide.leaving")).toHaveAttribute("src", photos.heroImageUrl);
  await controls.getByRole("button", { name: "Previous hotel photo" }).click();
  await expect(controls).toContainText("1 / 5");
  await controls.getByRole("button", { name: "Previous hotel photo" }).click();
  await expect(controls).toContainText("5 / 5");
  await page.clock.fastForward(6600);
  await expect(controls).toContainText("5 / 5");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await expect(controls.getByRole("button", { name: "Play photo slideshow" })).toBeVisible();
  await page.clock.fastForward(6600);
  await expect(controls).toContainText("1 / 5");
});

test("website publication, administrator assignment and message state persist through requests", async ({
  page,
}) => {
  const fixture = await adminFixture(page);
  await page.goto("/admin/website?branch=1");
  await page
    .getByLabel("Public email", { exact: true })
    .fill("hello@example.com");
  await page.getByRole("switch", { name: "Publish contact details" }).check();
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect
    .poll(() =>
      fixture.mutations.some(
        (m) =>
          m.path.endsWith("/admin/website") && (m.body as any).contactPublished,
      ),
    )
    .toBeTruthy();
  await page.goto("/admin/administrators?branch=1");
  await page.getByLabel("Account email").fill("team@example.com");
  await page.getByRole("button", { name: "Assign access" }).click();
  await expect(page.locator(".ad-table")).toContainText("team@example.com");
  await page.getByRole("button", { name: "Revoke", exact: true }).click();
  await page
    .getByRole("button", { name: "Revoke access", exact: true })
    .click();
  await expect(page.locator(".ad-table")).not.toContainText("team@example.com");
  await page.goto("/admin/messages?branch=1");
  await expect(page.getByRole("button", { name: "Send reply" })).toBeDisabled();
  await page.getByRole("button", { name: "Mark as read" }).click();
  await expect(page.getByRole("button", { name: "Mark unread" })).toBeVisible();
  await page.getByRole("button", { name: "Archive", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "No messages here" }),
  ).toBeVisible();
});

test("branch administrators see only assigned branches and cannot grant access", async ({
  page,
}) => {
  await adminFixture(page, { system: false });
  await page.goto("/admin/administrators?branch=2");
  await expect(page.getByLabel("Current branch").locator("option")).toHaveCount(
    1,
  );
  await expect(page.getByLabel("Current branch")).toHaveValue("1");
  await expect(page.getByRole("button", { name: "Assign access" })).toHaveCount(
    0,
  );
});

test("admin screens render at desktop and mobile sizes", async ({ page }) => {
  test.setTimeout(120000);
  await adminFixture(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const [path, name] of [
    ["", "overview"],
    ["rooms", "rooms"],
    ["rooms/2", "room-editor"],
    ["images", "images"],
    ["bookings", "bookings"],
    ["bookings/1048", "booking-details"],
    ["guests", "guests"],
    ["branches", "branches"],
    ["facilities", "facilities"],
    ["facilities/1", "facility-editor"],
    ["website", "website"],
    ["administrators", "administrators"],
    ["account", "account"],
    ["messages", "messages"],
  ]) {
    await page.goto("/admin/" + path + "?branch=1");
    await expect(page.locator(".ad-page-title h1")).toBeVisible();
    await expect(page.locator(".skeleton")).toHaveCount(0);
    await page.screenshot({
      path: `verification/admin-${name}.png`,
      fullPage: true,
    });
    for (const width of [390, 768]) {
      await page.setViewportSize({ width, height: 900 });
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect.soft(scrollWidth, `admin ${name} at ${width}px`).toBeLessThanOrEqual(width);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/admin?branch=1");
  await expect(
    page.getByRole("heading", { name: "A good day starts here." }),
  ).toBeVisible();
  await page.screenshot({
    path: "verification/admin-mobile.png",
    fullPage: true,
  });
  const overflow = await page.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
    elements: [...document.querySelectorAll("body *")]
      .filter(
        (e) =>
          e.getBoundingClientRect().right > innerWidth + 1 &&
          e.getBoundingClientRect().left >= 0,
      )
      .map((e) => ({
        tag: e.tagName,
        class: e.className,
        width: Math.round(e.getBoundingClientRect().width),
      }))
      .slice(0, 12),
  }));
  expect(overflow.scroll, JSON.stringify(overflow)).toBeLessThanOrEqual(
    overflow.width,
  );
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("navigation", { name: "Administration" })
    .getByRole("link", { name: "Rooms & pricing" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Rooms & pricing" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
