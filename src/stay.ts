import type {
  Booking,
  BookingInput,
  Branch,
  CategoryKey,
  Room,
  Stay,
} from "./types";
export const categories: {
  key: CategoryKey;
  name: string;
  short: string;
  description: string;
  category: string;
  twin?: boolean;
}[] = [
  {
    key: "standard",
    name: "Standard / Normal Room",
    short: "Standard Room",
    description: "A welcoming space to settle in and feel at home.",
    category: "Normal",
    twin: false,
  },
  {
    key: "twin",
    name: "Twin Room",
    short: "Twin Room",
    description: "Two separate beds. A comfortable stay, shared.",
    category: "Normal",
    twin: true,
  },
  {
    key: "vip",
    name: "VIP Room",
    short: "VIP Room",
    description: "Room to slow down and make yourself comfortable.",
    category: "Vip",
  },
  {
    key: "vvip",
    name: "VVIP / Honeymoon Suite",
    short: "VVIP / Honeymoon Suite",
    description: "Discover our VVIP rooms and designated honeymoon suites.",
    category: "Vvip",
  },
];
export function today(timeZone = "Africa/Lagos") {
  const windowsZones: Record<string, string> = {
    "W. Central Africa Standard Time": "Africa/Lagos",
    UTC: "UTC",
    "GMT Standard Time": "Europe/London",
    "Eastern Standard Time": "America/New_York",
  };
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: windowsZones[timeZone] || timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  } catch {
    return "";
  }
}
export function addDays(date: string, n: number) {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export const nights = (start: string, end: string) =>
  Math.round((Date.parse(end) - Date.parse(start)) / 86400000);
export function initialStay(): Stay {
  try {
    const s = JSON.parse(
      sessionStorage.getItem(
        import.meta.env.DEV &&
          new URLSearchParams(location.search).get("demo") === "1"
          ? "iges.demo.stay"
          : "iges.stay",
      ) || "null",
    );
    if (
      s &&
      Number.isInteger(s.branchId) &&
      ["all", ...categories.map((c) => c.key)].includes(s.category) &&
      Array.isArray(s.roomIds) &&
      s.roomIds.every(
        (id: unknown) => Number.isInteger(id) && Number(id) > 0,
      ) &&
      !validateStay({ ...s, branchId: 1 }, undefined).length
    )
      return s;
  } catch {
    /* Invalid or unavailable storage. */
  }
  const d = today();
  return {
    branchId: 0,
    checkIn: addDays(d, 1),
    checkOut: addDays(d, 3),
    guests: 2,
    category: "all",
    roomIds: [],
  };
}
export function validDate(d: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(d) &&
    Number.isFinite(Date.parse(d)) &&
    new Date(d + "T12:00:00Z").toISOString().slice(0, 10) === d
  );
}
export function validateStay(s: Stay, branch?: Branch): string[] {
  const e: string[] = [];
  const localToday = today(branch?.timeZoneId);
  if (!localToday)
    e.push(
      "This branch has an unsupported time zone. Please contact management before booking.",
    );
  if (!s.branchId) e.push("Select a branch.");
  if (!validDate(s.checkIn) || s.checkIn < localToday)
    e.push(
      "Choose a check-in date that is today or later in the branch’s time zone.",
    );
  if (
    !validDate(s.checkOut) ||
    !Number.isFinite(nights(s.checkIn, s.checkOut)) ||
    nights(s.checkIn, s.checkOut) < 1 ||
    nights(s.checkIn, s.checkOut) > 365
  )
    e.push("Choose a check-out date 1–365 nights after check-in.");
  if (!Number.isInteger(s.guests) || s.guests < 1 || s.guests > 10)
    e.push("Choose between 1 and 10 guests.");
  return e;
}
export function matches(room: Room, key: Stay["category"]) {
  if (room.category.toLowerCase() === "platinum") return false;
  const c = categories.find((c) => c.key === key);
  return (
    !c ||
    (room.category.toLowerCase() === c.category.toLowerCase() &&
      (c.twin === undefined || room.isTwinRoom === c.twin))
  );
}
export function roomQuery(
  s: Stay,
  perRoomGuests = true,
): Record<string, string | number | boolean> {
  const q: Record<string, string | number | boolean> = {
    checkIn: s.checkIn,
    checkOut: s.checkOut,
    guests: perRoomGuests ? s.guests : 1,
  };
  const c = categories.find((c) => c.key === s.category);
  if (c) {
    q.category = c.category;
    if (c.twin !== undefined) q.isTwinRoom = c.twin;
  }
  return q;
}
export function money(amount: number, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
export function dateLabel(date: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date + "T12:00:00Z"));
}
export const safeReturn = (value: string | null) =>
  value &&
  /^\/(booking|my-bookings|profile)(\/|\?|$)/.test(value) &&
  !value.includes("\\")
    ? value
    : "/booking";
export function passwordErrors(p: string) {
  return p.length < 6 ||
    !/[a-z]/.test(p) ||
    !/[A-Z]/.test(p) ||
    !/[0-9]/.test(p) ||
    !/[^a-zA-Z0-9]/.test(p)
    ? "Use at least 6 characters, including an uppercase letter, a lowercase letter, a number and a symbol."
    : "";
}
export function storageSet(key: string, value: string | null) {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {
    /* In-memory operation remains available. */
  }
}
export function sameBooking(b: Booking, i: BookingInput) {
  return (
    b.hotelId === i.hotelId &&
    b.checkIn === i.checkIn &&
    b.checkOut === i.checkOut &&
    b.guests === i.guests &&
    b.roomIds.length === i.roomIds.length &&
    [...b.roomIds].sort((a, b) => a - b).join(",") ===
      [...i.roomIds].sort((a, b) => a - b).join(",")
  );
}
