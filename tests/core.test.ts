import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  addDays,
  categories,
  matches,
  money,
  nights,
  passwordErrors,
  roomQuery,
  safeReturn,
  sameBooking,
  today,
  validateStay,
} from "../src/stay";
import type { Booking, BookingInput, Room, Stay } from "../src/types";
const stay: Stay = {
  branchId: 1,
  checkIn: addDays(today(), 5),
  checkOut: addDays(today(), 7),
  guests: 3,
  category: "standard",
  roomIds: [],
};
describe("hotel booking rules", () => {
  it("keeps the four public categories and maps Standard and Twin through supported filters", () => {
    expect(categories).toHaveLength(4);
    expect(roomQuery(stay)).toMatchObject({
      category: "Normal",
      isTwinRoom: false,
      guests: 3,
      checkIn: stay.checkIn,
      checkOut: stay.checkOut,
    });
    expect(roomQuery({ ...stay, category: "twin" })).toMatchObject({
      category: "Normal",
      isTwinRoom: true,
    });
    expect(roomQuery({ ...stay, category: "vip" }).category).toBe("Vip");
    expect(roomQuery({ ...stay, category: "vvip" }).category).toBe("Vvip");
  });
  it("excludes Platinum and does not conflate Twin and Normal", () => {
    expect(matches({ category: "Platinum" } as Room, "all")).toBe(false);
    expect(
      matches({ category: "Normal", isTwinRoom: true } as Room, "standard"),
    ).toBe(false);
    expect(
      matches({ category: "Normal", isTwinRoom: true } as Room, "twin"),
    ).toBe(true);
  });
  it("allows aggregate occupancy searches without requiring every room to fit the entire party", () =>
    expect(roomQuery(stay, false).guests).toBe(1));
  it("rejects missing branches, past dates, nonpositive durations, too-long stays and bad occupancy", () => {
    expect(validateStay(stay)).toEqual([]);
    expect(
      validateStay({
        ...stay,
        branchId: 0,
        guests: 0,
        checkIn: "2000-01-01",
        checkOut: "2000-01-01",
      }),
    ).toHaveLength(4);
    expect(
      validateStay({ ...stay, checkOut: addDays(stay.checkIn, 366) }),
    ).toHaveLength(1);
    expect(validateStay({ ...stay, guests: 1.5 })).toHaveLength(1);
  });
  it("counts nights across daylight-saving and year boundaries using calendar dates", () => {
    expect(nights("2027-03-27", "2027-03-29")).toBe(2);
    expect(addDays("2027-12-31", 1)).toBe("2028-01-01");
  });
  it("rejects impossible calendar dates and unsupported branch time zones without changing the zone", () => {
    expect(
      validateStay({ ...stay, checkIn: "2027-02-30" }).length,
    ).toBeGreaterThan(0);
    expect(
      validateStay(stay, {
        timeZoneId: "Invalid/Zone",
      } as import("../src/types").Branch),
    ).toContain(
      "This branch has an unsupported time zone. Please contact management before booking.",
    );
    expect(today("W. Central Africa Standard Time")).toBe(
      today("Africa/Lagos"),
    );
    expect(money(120.75, "NGN")).toContain("120.75");
  });
  it("enforces the current Identity password defaults", () => {
    expect(passwordErrors("Abc1!x")).toBe("");
    for (const p of ["abcdef", "Abcdef!", "ABCDE1!", "abcde1!", "Ab1!"])
      expect(passwordErrors(p)).not.toBe("");
  });
  it("permits only local booking and owner-booking return URLs", () => {
    expect(safeReturn("/my-bookings/1/4")).toBe("/my-bookings/1/4");
    for (const url of [
      "//evil.test",
      "https://evil.test",
      "/login",
      "/booking\\evil",
      "/booking.evil",
    ])
      expect(safeReturn(url)).toBe("/booking");
  });
  it("reconciles only the same branch, dates, occupancy and complete room selection", () => {
    const input: BookingInput = {
      hotelId: 1,
      checkIn: "2027-01-01",
      checkOut: "2027-01-03",
      guests: 3,
      rooms: 2,
      roomIds: [2, 1],
    };
    const b = { ...input, roomIds: [1, 2] } as Booking;
    expect(sameBooking(b, input)).toBe(true);
    expect(sameBooking({ ...b, hotelId: 2 }, input)).toBe(false);
    expect(sameBooking({ ...b, roomIds: [1, 3] }, input)).toBe(false);
    expect(sameBooking({ ...b, guests: 2 }, input)).toBe(false);
  });
});
describe("typed API boundaries", () => {
  beforeEach(() => {
    vi.resetModules();
    const storage = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      getItem: (k: string) => storage.get(k) || null,
      setItem: (k: string, v: string) => storage.set(k, v),
      removeItem: (k: string) => storage.delete(k),
    });
    vi.stubGlobal("location", { search: "" });
    vi.stubGlobal("window", new EventTarget());
  });
  it("follows pagination and sends explicit dates and filters", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: [{ id: 1 }], metadata: { hasNext: true } }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ data: [{ id: 2 }], metadata: { hasNext: false } }),
        ),
      );
    vi.stubGlobal("fetch", fetch);
    const { api } = await import("../src/api");
    expect(await api.rooms(stay)).toHaveLength(2);
    expect(fetch.mock.calls[0][0]).toContain("isTwinRoom=false");
    expect(fetch.mock.calls[1][0]).toContain("pageNumber=2");
  });
  it("preserves validation details and trace IDs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            detail: "Please review dates.",
            errors: { CheckIn: ["Invalid date"] },
            traceId: "trace-123",
          }),
          { status: 400 },
        ),
      ),
    );
    const { request } = await import("../src/api");
    await expect(request("/test")).rejects.toMatchObject({
      status: 400,
      traceId: "trace-123",
      errors: { CheckIn: ["Invalid date"] },
    });
  });
  it("sanitizes server failures and preserves rate-limit advice", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ detail: "private stack trace" }), {
            status: 500,
          }),
        )
        .mockResolvedValueOnce(
          new Response("{}", { status: 429, headers: { "Retry-After": "42" } }),
        ),
    );
    const { request } = await import("../src/api");
    await expect(request("/test")).rejects.toMatchObject({
      status: 500,
      message: expect.not.stringContaining("private"),
    });
    await expect(request("/test")).rejects.toMatchObject({
      status: 429,
      retryAfter: "42",
    });
  });
  it("never sends authenticated owner requests without a session", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    const { api } = await import("../src/api");
    await expect(api.bookings(1)).rejects.toMatchObject({ status: 401 });
    expect(fetch).not.toHaveBeenCalled();
  });
  it("handles a raw login token and removes it on sign out", async () => {
    const token =
      "x." +
      btoa(
        JSON.stringify({
          sub: "guest",
          name: "Guest",
          exp: Math.floor(Date.now() / 1000) + 60,
        }),
      ) +
      ".x";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(token)));
    const { api, getSession, setToken } = await import("../src/api");
    await api.login("guest@example.test", "example");
    expect(getSession()?.id).toBe("guest");
    expect(sessionStorage.getItem("iges.token")).toBe(token);
    setToken(null);
    expect(sessionStorage.getItem("iges.token")).toBeNull();
  });
});
