export interface Page<T> {
  data: T[];
  metadata: {
    currentPage: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}
export interface Branch {
  id: number;
  name: string;
  address: string;
  rating: number;
  countryName: string;
  city: string;
  state: string;
  currencyCode: string;
  timeZoneId: string;
  totalRooms: number;
  brandName: string;
}
export interface Profile {
  name: string;
  rating: number;
  city: string;
  state: string;
  country: string;
  roomCategories: {
    name: string;
    floor: number;
    firstRoom: number;
    lastRoom: number;
  }[];
}
export interface Photo {
  id: number;
  kind: string;
  url: string;
  caption: string;
}
export interface Room {
  id: number;
  hotelId: number;
  number: number;
  category: string;
  floor: number;
  description: string;
  bedType: string;
  amenities: string;
  maxGuests: number;
  sizeSquareMetres: number;
  perNightRate: number;
  currencyCode: string;
  photos: Photo[];
  isTwinRoom: boolean;
  isHoneymoonSuite: boolean;
}
export interface Offering {
  id: number;
  hotelId: number;
  kind: string;
  name: string;
  description: string;
  imageUrl: string;
  openingHours: string;
  price: number | null;
  currencyCode: string;
}
export interface Booking {
  id: number;
  hotelId: number;
  hotelName: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
  status: string;
  createAt: string;
  updateAt: string | null;
  rooms: number;
  roomIds: number[];
  currencyCode: string;
  isCheckedIn?: boolean;
  isCheckedOut?: boolean;
  timeZoneId?: string;
}
export interface GuestAccount {
  firstName: string;
  lastName: string;
  email: string;
}
export type CategoryKey = "standard" | "twin" | "vip" | "vvip";
export interface Stay {
  branchId: number;
  checkIn: string;
  checkOut: string;
  guests: number;
  category: CategoryKey | "all";
  roomIds: number[];
}
export interface BookingInput {
  hotelId: number;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
  roomIds: number[];
}
export interface AuthSession {
  token: string;
  id: string;
  name: string;
  expires: number;
  renewal?: { id: string; idleUntil: number; sessionUntil: number };
}
