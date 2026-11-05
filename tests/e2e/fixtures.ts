import type { Page } from "@playwright/test";
export const branch = {
  id: 1,
  name: "Warri branch",
  address: "Test address, Warri",
  rating: 4.5,
  countryName: "Nigeria",
  city: "Warri",
  state: "Delta State",
  currencyCode: "NGN",
  timeZoneId: "Africa/Lagos",
  totalRooms: 8,
  brandName: "IGES Hotel and Suites",
};
export const room = (
  id = 1,
  number = 100,
  extra: Record<string, unknown> = {},
) => ({
  id,
  hotelId: 1,
  number,
  category:
    number < 201
      ? "Normal"
      : number < 301
        ? "Vip"
        : number < 401
          ? "Vvip"
          : "Platinum",
  floor: number < 201 ? 1 : number < 301 ? 2 : 3,
  description: "A published room with a private bathroom.",
  bedType: number === 160 ? "Twin" : "King",
  amenities: "Wi-Fi, Air conditioning",
  maxGuests: 2,
  sizeSquareMetres: 28,
  perNightRate: 55000,
  currencyCode: "NGN",
  photos: [
    {
      id: 1,
      kind: "Room",
      url: "https://example.test/room.jpg",
      caption: "Bedroom",
    },
    {
      id: 2,
      kind: "Bathroom",
      url: "https://example.test/bathroom.jpg",
      caption: "Bathroom",
    },
  ],
  isTwinRoom: number === 160,
  isHoneymoonSuite: false,
  ...extra,
});
export const inventory = [
  room(),
  room(2, 160),
  room(3, 210),
  room(4, 350),
  room(5, 351, { isHoneymoonSuite: true }),
  room(6, 480),
];
export const booking = {
  id: 41,
  hotelId: 1,
  hotelName: branch.name,
  checkIn: "2027-04-10",
  checkOut: "2027-04-12",
  guests: 2,
  totalPrice: 110000,
  status: "Pending",
  createAt: "2026-11-02T08:00:00Z",
  updateAt: null,
  rooms: 1,
  roomIds: [1],
  currencyCode: "NGN",
};
export const token = (id = "owner") =>
  "x." +
  Buffer.from(
    JSON.stringify({
      sub: id,
      name: "Test Guest",
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  ).toString("base64url") +
  ".x";
export const pageOf = (data: unknown[]) => ({
  data,
  metadata: {
    currentPage: 1,
    pageSize: 50,
    totalCount: data.length,
    totalPages: 1,
    hasNext: false,
    hasPrevious: false,
  },
});
export async function seed(page: Page, auth = false) {
  await page.addInitScript(
    ({ auth, token }) => {
      sessionStorage.setItem(
        "iges.stay",
        JSON.stringify({
          branchId: 1,
          checkIn: "2027-04-10",
          checkOut: "2027-04-12",
          guests: 2,
          category: "all",
          roomIds: [],
        }),
      );
      if (auth) sessionStorage.setItem("iges.token", token);
    },
    { auth, token: token() },
  );
}
export async function mockApi(page: Page) {
  await page.route("https://example.test/**", (r) => r.abort());
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    let body: unknown;
    if (path === "/api/v1/hotel")
      body = {
        name: "IGES Hotel and Suites",
        city: "Warri",
        state: "Delta State",
        country: "Nigeria",
        rating: 4.5,
        roomCategories: [],
      };
    else if (path === "/api/v1/branches") body = pageOf([branch]);
    else if (path.endsWith("/offerings")) body = pageOf([]);
    else if (path.endsWith("/rooms")) {
      body = pageOf(
        inventory.filter(
          (r) =>
            (!url.searchParams.has("category") ||
              r.category === url.searchParams.get("category")) &&
            (!url.searchParams.has("isTwinRoom") ||
              r.isTwinRoom === (url.searchParams.get("isTwinRoom") === "true")),
        ),
      );
    } else if (/\/rooms\/\d+$/.test(path))
      body = inventory.find((r) => r.id === Number(path.split("/").at(-1)));
    else if (path.endsWith("/bookings")) body = pageOf([]);
    else if (path === "/api/v1/auth/login") body = token();
    else if (path === "/api/v1/auth/register")
      body = { id: "owner", email: "test@example.test", role: "User" };
    else if (path === "/api/v1/branches/1") body = branch;
    else {
      await route.fulfill({ status: 404, json: { detail: "Not found" } });
      return;
    }
    await route.fulfill({ json: body });
  });
}
