import type {
  AuthSession,
  Booking,
  BookingInput,
  Branch,
  GuestAccount,
  Offering,
  Page,
  Profile,
  Room,
  Stay,
} from "./types";
import { roomQuery, storageSet } from "./stay";
const origin = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
export const DEMO =
  import.meta.env.DEV &&
  new URLSearchParams(location.search).get("demo") === "1";
let session: AuthSession | null = null;
let lastInteraction = 0;
let sentInteraction = 0;
let lastRefreshAttempt = 0;
let refreshInFlight: { id: string; promise: Promise<void> } | undefined;

export function sameSession(a: AuthSession | null, b: AuthSession | null) {
  return a === b || !!(a?.renewal && a.renewal.id === b?.renewal?.id && a.id === b.id);
}

export function parseSession(token: string): AuthSession {
  const part = token.split(".")[1];
  const claims = JSON.parse(
    new TextDecoder().decode(
      Uint8Array.from(atob(part.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
        c.charCodeAt(0),
      ),
    ),
  );
  if (!claims.sub || !claims.exp) throw new Error("Invalid session response.");
  return {
    token,
    id: claims.sub,
    name: claims.name || "Guest",
    expires: claims.exp * 1000,
    renewal:
      typeof claims.session_id === "string" &&
      Number.isFinite(claims.idle_until) &&
      Number.isFinite(claims.session_until)
        ? {
            id: claims.session_id,
            idleUntil: claims.idle_until * 1000,
            sessionUntil: claims.session_until * 1000,
          }
        : undefined,
  };
}
try {
  const token = sessionStorage.getItem("iges.token");
  if (token && !DEMO) {
    const s = parseSession(token);
    if (s.renewal || s.expires > Date.now()) session = s;
    else storageSet("iges.token", null);
  }
} catch {
  storageSet("iges.token", null);
}
export const getSession = () => session;
export function setToken(token: string | null) {
  const next = token ? parseSession(token) : null;
  if (!sameSession(session, next)) {
    lastInteraction = sentInteraction = 0;
    lastRefreshAttempt = Date.now();
  }
  session = next;
  storageSet("iges.token", token);
  window.dispatchEvent(new Event("iges:auth"));
}
const sessionHeaders = { "X-IGES-Session": "1" };
const sessionPath = (id: string) => "/auth/session/" + encodeURIComponent(id);

async function withSessionLock<T>(id: string, action: () => Promise<T>): Promise<T> {
  return navigator.locks
    ? await navigator.locks.request("iges.auth." + id, action)
    : action();
}

function expireSession() {
  setToken(null);
  window.dispatchEvent(new Event("iges:expired"));
}

export function renewSession(): Promise<void> {
  const current = session;
  const id = current?.renewal?.id;
  if (!id || !current) return Promise.resolve();
  if (refreshInFlight?.id === id) return refreshInFlight.promise;

  const promise = withSessionLock(id, async () => {
    if (!sameSession(current, session)) return;
    lastRefreshAttempt = Date.now();
    const interaction = lastInteraction;
    const activity = interaction > sentInteraction && Date.now() - interaction <= 60_000;
    try {
      const token = await request<string>(sessionPath(id) + "/refresh", {
        method: "POST",
        headers: sessionHeaders,
        body: JSON.stringify({ activity }),
      });
      if (!sameSession(current, session)) return;
      if (!sameSession(current, parseSession(token)))
        throw new ApiError(500, "The hotel service returned an invalid session.");
      if (activity) sentInteraction = interaction;
      setToken(token);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401 && sameSession(current, session))
        expireSession();
      throw error;
    }
  }).finally(() => {
    if (refreshInFlight?.promise === promise) refreshInFlight = undefined;
  });
  refreshInFlight = { id, promise };
  return promise;
}

export function recordSessionActivity(event: Event) {
  if (!event.isTrusted || document.hidden || !session?.renewal) return;
  lastInteraction = Date.now();
  const elapsed = lastInteraction - lastRefreshAttempt;
  if (elapsed >= 120_000 || (elapsed >= 10_000 && session.expires - lastInteraction <= 60_000))
    void renewSession().catch(() => {});
}

export async function endSession(current: AuthSession, clear: () => void) {
  const id = current.renewal?.id;
  if (!id) {
    if (sameSession(current, session)) clear();
    return;
  }
  await withSessionLock(id, async () => {
    if (!sameSession(current, session)) return;
    await request(sessionPath(id) + "/logout", {
      method: "POST",
      headers: { ...sessionHeaders, Authorization: "Bearer " + session!.token },
    });
    if (sameSession(current, session)) clear();
  });
}
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors: Record<string, string[]> = {},
    public traceId?: string,
    public retryAfter?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
export function mediaUrl(url?: string) {
  if (!url) return "";
  if (
    (url.startsWith("/assets/") ||
      (import.meta.env.DEV && url.startsWith("/src/assets/"))) &&
    !url.includes("..") &&
    !url.includes("\\")
  )
    return url;
  if (url.startsWith("/uploads/") && !url.includes("..") && !url.includes("\\"))
    return origin + url;
  if (/^https:\/\//i.test(url)) return url;
  return "";
}
export async function request<T>(
  path: string,
  options: RequestInit = {},
  auth = false,
): Promise<T> {
  if (!auth) return send<T>(path, options);
  const current = session;
  if (current?.renewal && current.expires - Date.now() <= 30_000)
    await renewSession();
  if (!session || !sameSession(current, session) || session.expires <= Date.now()) {
    if (sameSession(current, session)) expireSession();
    throw new ApiError(401, "Your session has expired. Sign in to continue.");
  }

  const requested = session;
  try {
    return await send<T>(path, options, requested.token);
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401 || !sameSession(requested, session))
      throw error;
    if (!requested.renewal) {
      expireSession();
      throw error;
    }
    if (session === requested) await renewSession();
    // Only retry reads. The caller decides whether to resubmit a write.
    if ((!options.method || options.method === "GET") && session && sameSession(requested, session))
      return send<T>(path, options, session.token);
    throw error;
  }
}

async function send<T>(path: string, options: RequestInit, token?: string): Promise<T> {
  if (DEMO && options.method && options.method !== "GET")
    throw new ApiError(
      400,
      "Design preview only. Account and reservation submissions are disabled. Switch to the live site to continue.",
    );
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    options.method ? 30000 : 20000,
  );
  try {
    const response = await fetch(origin + "/api/v1" + path, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        ...(options.body && !(options.body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),
        ...(token ? { Authorization: "Bearer " + token } : {}),
        ...options.headers,
      },
    });
    const raw = await response.text();
    let data;
    try {
      data = raw ? JSON.parse(raw) : undefined;
    } catch {
      data = raw;
    }
    if (!response.ok) {
      const fallback: Record<number, string> = {
        400: "Please check your details.",
        401: "Please sign in to continue.",
        403: "You do not have access to this resource.",
        404: "This item could not be found or is unavailable for your dates.",
        409: "This request conflicts with the current availability. Please review your selection.",
        429: "Too many requests. Please wait before trying again.",
        500: "The hotel service encountered a problem. Please try again shortly.",
        503: "The hotel service is temporarily unavailable. Please try again shortly.",
      };
      throw new ApiError(
        response.status,
        response.status >= 500
          ? fallback[response.status] || fallback[500]
          : data?.detail ||
              data?.message ||
              data?.error ||
              (typeof data === "string" && data.length < 400 ? data : null) ||
              fallback[response.status] ||
              "The request could not be completed.",
        data?.errors || {},
        data?.traceId,
        response.headers.get("Retry-After") || data?.retryAfter?.toString(),
      );
    }
    return data as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError(
      0,
      controller.signal.aborted
        ? "The request timed out. The service may still have received your request."
        : "We could not reach the hotel service. Check your connection and try again.",
    );
  } finally {
    clearTimeout(timer);
  }
}
export function query(
  params: Record<string, string | number | boolean | undefined>,
) {
  return new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)]),
  ).toString();
}
export async function allPages<T>(
  path: string,
  params: Record<string, string | number | boolean> = {},
  auth = false,
): Promise<T[]> {
  const result: T[] = [];
  let page = 1;
  while (true) {
    const r = await request<Page<T>>(
      path + "?" + query({ ...params, pageNumber: page, pageSize: 50 }),
      {},
      auth,
    );
    if (!Array.isArray(r?.data) || !r.metadata)
      throw new ApiError(500, "The service returned an unexpected response.");
    result.push(...r.data);
    if (!r.metadata.hasNext) break;
    if (++page > 1000)
      throw new ApiError(
        500,
        "The catalogue is too large to load. Please contact the hotel.",
      );
  }
  return result;
}
export const api = {
  profile: async (): Promise<Profile> =>
    DEMO ? (await import("./demo")).profile : request("/hotel"),
  branches: async (): Promise<Branch[]> =>
    DEMO ? (await import("./demo")).branches : allPages("/branches"),
  branch: async (id: number): Promise<Branch> =>
    DEMO
      ? (await import("./demo")).branches.find((b) => b.id === id)!
      : request("/branches/" + id),
  rooms: async (s: Stay, multiple = false): Promise<Room[]> =>
    DEMO
      ? (await import("./demo")).findRooms(s, multiple)
      : allPages(`/branches/${s.branchId}/rooms`, roomQuery(s, !multiple)),
  room: async (s: Stay, id: number): Promise<Room> =>
    DEMO
      ? (await import("./demo")).findRoom(id)
      : request(
          `/branches/${s.branchId}/rooms/${id}?` +
            query({ ...roomQuery({ ...s, category: "all" }, false) }),
        ),
  offerings: async (id: number): Promise<Offering[]> =>
    DEMO
      ? (await import("./demo")).offerings.filter((o) => o.hotelId === id)
      : allPages(`/branches/${id}/offerings`),
  bookings: (id: number) =>
    allPages<Booking>(
      `/branches/${id}/bookings`,
      { sortDescending: true },
      true,
    ),
  accountBookings: () => allPages<Booking>("/account/bookings", {}, true),
  account: () => request<GuestAccount>("/account", {}, true),
  updateAccount: (names: Pick<GuestAccount, "firstName" | "lastName">) =>
    request<void>(
      "/account",
      { method: "PUT", body: JSON.stringify(names) },
      true,
    ),
  changePassword: (currentPassword: string, newPassword: string) =>
    request<void>(
      "/account/password",
      {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      },
      true,
    ),
  login: async (email: string, password: string) => {
    const token = await request<string>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setToken(token);
  },
  register: (value: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) =>
    request("/auth/register", { method: "POST", body: JSON.stringify(value) }),
  create: (input: BookingInput) =>
    request<Booking>(
      `/branches/${input.hotelId}/bookings`,
      { method: "POST", body: JSON.stringify(input) },
      true,
    ),
  update: (
    branchId: number,
    id: number,
    input: Omit<BookingInput, "hotelId">,
  ) =>
    request<Booking>(
      `/branches/${branchId}/bookings/${id}`,
      { method: "PUT", body: JSON.stringify(input) },
      true,
    ),
  cancel: (branchId: number, id: number) =>
    request<void>(
      `/branches/${branchId}/bookings/${id}/cancel`,
      { method: "POST" },
      true,
    ),
};
