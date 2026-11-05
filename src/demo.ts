import twinPhoto from "./assets/demo-twin.png";
// Explicit development preview fixtures. Never used after a failed API call or in production.
import type { Branch, Offering, Profile, Room, Stay } from "./types";
import { matches } from "./stay";
const image = (id: string, w = 1600) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=85`;
export const photos = {
  hero: image("photo-1611892440504-42a792e24d32"),
  standard: image("photo-1611892440504-42a792e24d32"),
  twin: twinPhoto,
  vip: image("photo-1591088398332-8a7791972843"),
  vvip: image("photo-1566665797739-1674de7a421a"),
  lobby: image("photo-1566073771259-6a8506099945"),
  bathroom: image("photo-1620626011761-996317b8d101"),
  kitchen: image("photo-1414235077428-338989a2e8c0"),
  food: image("photo-1547592180-85f173990554"),
  breakfast: image("photo-1533089860892-a7c6f0a88666"),
  pool: image("photo-1576013551627-0cc20b96c2a7"),
};
export const profile: Profile = {
  name: "IGES Hotel and Suites",
  rating: 4.5,
  city: "Warri",
  state: "Delta State",
  country: "Nigeria",
  roomCategories: [
    { name: "Normal", floor: 1, firstRoom: 100, lastRoom: 200 },
    { name: "VIP", floor: 2, firstRoom: 210, lastRoom: 300 },
    { name: "VVIP", floor: 3, firstRoom: 350, lastRoom: 400 },
    { name: "Platinum", floor: 4, firstRoom: 480, lastRoom: 500 },
  ],
};
export const branches: Branch[] = [
  {
    id: 1,
    name: "Warri · Preview branch",
    address: "Illustrative branch — address to be supplied",
    city: "Warri",
    state: "Delta State",
    countryName: "Nigeria",
    currencyCode: "NGN",
    timeZoneId: "Africa/Lagos",
    totalRooms: 6,
    rating: 4.5,
    brandName: profile.name,
  },
];
export const rooms: Room[] = [
  {
    id: 1,
    number: 100,
    category: "Normal",
    bedType: "Queen",
    sizeSquareMetres: 28,
    perNightRate: 55000,
    isTwinRoom: false,
    isHoneymoonSuite: false,
    photo: photos.standard,
  },
  {
    id: 2,
    number: 160,
    category: "Normal",
    bedType: "Twin",
    sizeSquareMetres: 28,
    perNightRate: 55000,
    isTwinRoom: true,
    isHoneymoonSuite: false,
    photo: photos.twin,
  },
  {
    id: 3,
    number: 210,
    category: "Vip",
    bedType: "King",
    sizeSquareMetres: 38,
    perNightRate: 85000,
    isTwinRoom: false,
    isHoneymoonSuite: false,
    photo: photos.vip,
  },
  {
    id: 4,
    number: 211,
    category: "Vip",
    bedType: "King",
    sizeSquareMetres: 38,
    perNightRate: 90000,
    isTwinRoom: false,
    isHoneymoonSuite: false,
    photo: photos.standard,
  },
  {
    id: 5,
    number: 350,
    category: "Vvip",
    bedType: "King",
    sizeSquareMetres: 55,
    perNightRate: 120000,
    isTwinRoom: false,
    isHoneymoonSuite: true,
    photo: photos.vvip,
  },
  {
    id: 6,
    number: 351,
    category: "Vvip",
    bedType: "King",
    sizeSquareMetres: 48,
    perNightRate: 110000,
    isTwinRoom: false,
    isHoneymoonSuite: false,
    photo: photos.vip,
  },
].map((r) => ({
  ...r,
  hotelId: 1,
  floor: r.category === "Normal" ? 1 : r.category === "Vip" ? 2 : 3,
  description:
    "Illustrative room for design preview. Warm finishes, generous natural light and a private bathroom.",
  amenities: "Wi-Fi, Air conditioning, Television, Private bathroom, Work desk",
  maxGuests: 2,
  currencyCode: "NGN",
  photos: [
    {
      id: r.id * 2,
      kind: "Room",
      url: r.photo,
      caption: r.isTwinRoom
        ? "Illustrative twin bedroom with two separate beds"
        : "Illustrative bedroom",
    },
    {
      id: r.id * 2 + 1,
      kind: "Bathroom",
      url: photos.bathroom,
      caption: "Illustrative bathroom",
    },
  ],
}));
export const findRooms = (s: Stay, multiple = false) =>
  rooms.filter(
    (r) =>
      r.hotelId === s.branchId &&
      matches(r, s.category) &&
      (multiple || r.maxGuests >= s.guests),
  );
export function findRoom(id: number) {
  const r = rooms.find((r) => r.id === id);
  if (!r) throw new Error("Preview room not found.");
  return r;
}
export const offerings: Offering[] = [
  {
    id: 1,
    hotelId: 1,
    kind: "Meal",
    name: "A taste of the kitchen",
    description:
      "Illustrative menu item. Actual dishes, cuisines and service information will be published by the selected branch.",
    imageUrl: photos.food,
    openingHours: "Preview hours — confirm with the hotel",
    price: 7500,
    currencyCode: "NGN",
  },
  {
    id: 2,
    hotelId: 1,
    kind: "Meal",
    name: "A leisurely breakfast",
    description:
      "Illustrative breakfast. Breakfast inclusion has not been confirmed for any room or rate.",
    imageUrl: photos.breakfast,
    openingHours: "Preview hours — confirm with the hotel",
    price: 6500,
    currencyCode: "NGN",
  },
  {
    id: 3,
    hotelId: 1,
    kind: "Pool",
    name: "Take a moment to unwind",
    description:
      "Illustrative pool listing. Confirm facilities and access with your branch.",
    imageUrl: photos.pool,
    openingHours: "Contact the branch for hours",
    price: null,
    currencyCode: "NGN",
  },
  {
    id: 4,
    hotelId: 1,
    kind: "Lounge",
    name: "Stay a little longer",
    description: "Illustrative lounge listing for the design preview.",
    imageUrl: photos.kitchen,
    openingHours: "Contact the branch for hours",
    price: null,
    currencyCode: "NGN",
  },
];
