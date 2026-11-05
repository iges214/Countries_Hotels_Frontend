import { allPages, request } from "../api";
import type { Branch, Offering, Room } from "../types";

export interface AdminAccess {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isSystemAdministrator: boolean;
  branchIds: number[];
}
export interface AdminRoom extends Room {
  isPublished: boolean;
  isOperational: boolean;
}
export interface AdminOffering extends Offering {
  isPublished: boolean;
}
export interface AdminBranch extends Branch {
  countryId: number;
  perNightRate: number;
  browserTimeZoneId?: string;
}
export interface Assignment {
  roomId: number;
  number: number;
  category: string;
  bedType: string;
  maxGuests: number;
  guests: number | null;
  nightlyRate: number;
}
export interface AdminBooking {
  id: number;
  hotelId: number;
  guestName: string;
  guestEmail: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
  totalPrice: number;
  currencyCode: string;
  status: string;
  createAt: string;
  updateAt: string | null;
  actualCheckInAt: string | null;
  actualCheckOutAt: string | null;
  expectedCheckoutAt: string;
  assignments: Assignment[];
}
export interface WebsiteSettings {
  displayName: string;
  heroImageUrl: string;
  heroRoomImageUrl?: string;
  heroKitchenImageUrl?: string;
  heroBarImageUrl?: string;
  heroPoolImageUrl?: string;
  publicEmail: string;
  phone: string;
  privacyPolicy: string;
  bookingPolicy: string;
  contactPublished: boolean;
  privacyPublished: boolean;
  bookingPolicyPublished: boolean;
  checkoutTime: string;
}
export interface HotelMessage {
  id: number;
  senderName: string;
  senderEmail: string;
  subject: string;
  body: string;
  receivedAt: string;
  isRead: boolean;
  isArchived: boolean;
  channel: string;
  replies: {
    id: string;
    body: string;
    createdAt: string;
    deliveryStatus: string;
  }[];
}
export interface Administrator {
  id: number;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
}
export interface Country {
  id: number;
  name: string;
  shortName: string;
}
export type RoomInput = Pick<
  AdminRoom,
  | "number"
  | "description"
  | "bedType"
  | "amenities"
  | "maxGuests"
  | "sizeSquareMetres"
  | "perNightRate"
  | "isPublished"
  | "isOperational"
  | "isHoneymoonSuite"
>;
export type OfferingInput = Pick<
  AdminOffering,
  | "kind"
  | "name"
  | "description"
  | "imageUrl"
  | "openingHours"
  | "price"
  | "isPublished"
>;
export type BranchInput = Pick<
  AdminBranch,
  | "name"
  | "address"
  | "city"
  | "state"
  | "countryId"
  | "currencyCode"
  | "timeZoneId"
  | "rating"
  | "perNightRate"
  | "totalRooms"
>;
const base = (branch: number) => `/branches/${branch}`;
const send = <T>(path: string, method: string, value?: unknown) =>
  request<T>(
    path,
    { method, ...(value === undefined ? {} : { body: JSON.stringify(value) }) },
    true,
  );
export const adminApi = {
  me: () => request<AdminAccess>("/admin/me", {}, true),
  branches: async () =>
    (await allPages<AdminBranch>("/branches")).map((b) => ({
      ...b,
      timeZoneId: b.browserTimeZoneId || b.timeZoneId,
    })),
  rooms: (b: number) => allPages<AdminRoom>(base(b) + "/admin/rooms", {}, true),
  offerings: (b: number) =>
    allPages<AdminOffering>(base(b) + "/admin/offerings", {}, true),
  bookings: (b: number) =>
    allPages<AdminBooking>(base(b) + "/admin/bookings", {}, true),
  saveRoom: (b: number, id: number | undefined, input: RoomInput) =>
    send<AdminRoom>(
      base(b) + "/rooms" + (id ? "/" + id : ""),
      id ? "PUT" : "POST",
      input,
    ),
  saveOffering: (b: number, id: number | undefined, input: OfferingInput) =>
    send<AdminOffering>(
      base(b) + "/offerings" + (id ? "/" + id : ""),
      id ? "PUT" : "POST",
      input,
    ),
  deleteOffering: (b: number, id: number) =>
    send<void>(base(b) + "/offerings/" + id, "DELETE"),
  saveBranch: (id: number | undefined, input: BranchInput) =>
    send<AdminBranch>("/branches" + (id ? "/" + id : ""), id ? "PUT" : "POST", {
      ...input,
      ...(id ? { id } : {}),
    }),
  deleteBranch: (id: number) => send<void>(base(id), "DELETE"),
  confirm: (b: number, id: number) =>
    send<void>(base(b) + `/bookings/${id}/admin/confirm`, "PUT"),
  cancel: (b: number, id: number) =>
    send<void>(base(b) + `/bookings/${id}/admin/cancel`, "POST"),
  checkIn: (
    b: number,
    id: number,
    rooms: { roomId: number; guests: number }[],
  ) =>
    send<void>(base(b) + `/admin/bookings/${id}/check-in`, "POST", { rooms }),
  checkOut: (b: number, id: number) =>
    send<void>(base(b) + `/admin/bookings/${id}/check-out`, "POST"),
  uploadPhoto: (
    b: number,
    roomId: number,
    file: File,
    kind: string,
    caption: string,
  ) => {
    const data = new FormData();
    data.append("file", file);
    data.append("kind", kind);
    data.append("caption", caption);
    return request(
      base(b) + `/rooms/${roomId}/photos`,
      { method: "POST", body: data },
      true,
    );
  },
  uploadImage: (b: number, file: File) => {
    const data = new FormData();
    data.append("file", file);
    return request<{ url: string }>(
      base(b) + "/images",
      { method: "POST", body: data },
      true,
    );
  },
  photoDetails: (
    b: number,
    roomId: number,
    photoId: number,
    kind: string,
    caption: string,
  ) =>
    send<void>(base(b) + `/rooms/${roomId}/photos/${photoId}`, "PUT", {
      kind,
      caption,
    }),
  deletePhoto: (b: number, roomId: number, photoId: number) =>
    send<void>(base(b) + `/rooms/${roomId}/photos/${photoId}`, "DELETE"),
  website: (b: number) =>
    request<WebsiteSettings>(base(b) + "/admin/website", {}, true),
  saveWebsite: (b: number, data: WebsiteSettings) =>
    send<void>(base(b) + "/admin/website", "PUT", data),
  administrators: (b: number) =>
    request<Administrator[]>(base(b) + "/admin/administrators", {}, true),
  assign: (b: number, email: string) =>
    send(base(b) + "/admin/administrators", "POST", { email }),
  revoke: (b: number, id: number) =>
    send(base(b) + "/admin/administrators/" + id, "DELETE"),
  saveAccount: (firstName: string, lastName: string) =>
    send<void>("/admin/account", "PUT", { firstName, lastName }),
  password: (currentPassword: string, newPassword: string) =>
    send<void>("/admin/password", "POST", { currentPassword, newPassword }),
  messages: (b: number) =>
    allPages<HotelMessage>(base(b) + "/admin/messages", {}, true),
  messageState: (b: number, id: number, isRead: boolean, isArchived: boolean) =>
    send<void>(base(b) + "/admin/messages/" + id, "PUT", {
      isRead,
      isArchived,
    }),
  mailStatus: (b: number) =>
    request<{ replyConfigured: boolean; incomingEmailConnected: boolean }>(
      base(b) + "/admin/mail-status",
      {},
      true,
    ),
  reply: (b: number, id: number, body: string, requestId: string) =>
    send<{ deliveryStatus: string }>(
      base(b) + `/admin/messages/${id}/replies`,
      "POST",
      { body, requestId },
    ),
  countries: () => request<Country[]>("/countries", {}, true),
  saveCountry: (id: number | undefined, name: string, shortName: string) =>
    send("/countries" + (id ? "/" + id : ""), id ? "PUT" : "POST", {
      name,
      shortName,
      ...(id ? { id } : {}),
    }),
  deleteCountry: (id: number) => send("/countries/" + id, "DELETE"),
};
