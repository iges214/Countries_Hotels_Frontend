// Production replacement: sample catalogue and imagery are deliberately absent.
import type { Branch, Offering, Profile, Room } from "./types";
export const branches: Branch[] = [];
export const offerings: Offering[] = [];
export const photos: Record<string, string> = {};
export const profile: Profile = undefined as never;
export function findRooms(): Room[] {
  throw new Error("Design preview is unavailable in production.");
}
export function findRoom(): Room {
  throw new Error("Design preview is unavailable in production.");
}
