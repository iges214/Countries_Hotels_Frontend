import { chromium } from "@playwright/test";
const browser = await chromium.launch({ channel: "msedge", headless: true });
const booking = {
  id: 41,
  hotelId: 1,
  hotelName: "IGES · Isolated visual test branch",
  checkIn: "2027-04-10",
  checkOut: "2027-04-12",
  guests: 2,
  totalPrice: 110000.75,
  status: "Pending",
  createAt: "2026-11-02T08:00:00Z",
  rooms: 1,
  roomIds: [7],
  currencyCode: "NGN",
};
const branch = {
  id: 1,
  name: booking.hotelName,
  address: "Isolated visual fixture",
  city: "Warri",
  state: "Delta State",
  currencyCode: "NGN",
  timeZoneId: "Africa/Lagos",
};
const paginate = (data) => ({ data, metadata: { hasNext: false } });
for (const [device, width, height] of [
  ["desktop", 1440, 1000],
  ["mobile", 390, 844],
]) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.addInitScript(() =>
    sessionStorage.setItem(
      "iges.token",
      "x." +
        btoa(
          JSON.stringify({
            sub: "visual-fixture",
            name: "Visual fixture",
            exp: Math.floor(Date.now() / 1000) + 3600,
          }),
        ) +
        ".x",
    ),
  );
  await page.route("**/api/v1/**", (r) =>
    r.fulfill({
      json: r.request().url().includes("/bookings")
        ? paginate([booking])
        : r.request().url().includes("/branches")
          ? paginate([branch])
          : {
              name: "IGES Hotel and Suites",
              city: "Warri",
              state: "Delta State",
              country: "Nigeria",
            },
    }),
  );
  await page.goto("http://127.0.0.1:5173/booking/confirmation/1/41");
  await page
    .getByRole("heading", { name: "Your stay is on its way." })
    .waitFor();
  await page.screenshot({
    path: `verification/${device}-confirmation.png`,
    fullPage: true,
  });
  if (device === "desktop") {
    await page.emulateMedia({ media: "print" });
    await page.screenshot({
      path: "verification/confirmation-print.png",
      fullPage: true,
    });
  }
  await page.close();
}
await browser.close();
console.log(
  "Pending receipt visual fixtures captured at desktop/mobile and print layout.",
);
