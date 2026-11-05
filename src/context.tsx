import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, DEMO, getSession, recordSessionActivity, renewSession, sameSession, setToken, request } from "./api";
import type { WebsiteSettings } from "./admin/api";
import { initialStay, storageSet } from "./stay";
import type { AuthSession, Branch, Profile, Stay } from "./types";
interface Context {
  stay: Stay;
  setStay: (s: Stay) => void;
  branches: Branch[];
  branch?: Branch;
  profile?: Profile;
  website?: WebsiteSettings;
  loading: boolean;
  catalogError: unknown;
  reload: () => void;
  auth: AuthSession | null;
  logout: () => void;
  signOutRequested: boolean;
  requestSignOut: () => void;
  cancelSignOut: () => void;
  notice: string;
  notify: (text: string) => void;
  expired: boolean;
  closeExpired: () => void;
}
const HotelContext = createContext<Context>(null!);
export function HotelProvider({ children }: { children: ReactNode }) {
  const [stay, updateStay] = useState(initialStay);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [profile, setProfile] = useState<Profile>();
  const [website, setWebsite] = useState<WebsiteSettings>();
  const [loading, setLoading] = useState(true);
  const [catalogError, setError] = useState<unknown>();
  const [version, setVersion] = useState(0);
  const [auth, setAuth] = useState(getSession);
  const [signOutRequested, setSignOutRequested] = useState(false);
  const [notice, notify] = useState("");
  const [expired, setExpired] = useState(false);
  const setStay = (s: Stay) => {
    updateStay(s);
    storageSet(DEMO ? "iges.demo.stay" : "iges.stay", JSON.stringify(s));
  };
  useEffect(() => {
    let active = true;
    setWebsite(undefined);
    if (stay.branchId && !DEMO)
      request<WebsiteSettings>(`/branches/${stay.branchId}/website`)
        .then((w) => {
          if (active) setWebsite(w);
        })
        .catch(() => {});
    return () => {
      active = false;
    };
  }, [stay.branchId, version]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(undefined);
    Promise.all([api.branches(), api.profile()])
      .then(([b, p]) => {
        if (!active) return;
        setBranches(b);
        setProfile(p);
        updateStay((s) => {
          const next = {
            ...s,
            branchId: b.some((b) => b.id === s.branchId)
              ? s.branchId
              : b[0]?.id || 0,
            roomIds: b.some((b) => b.id === s.branchId) ? s.roomIds : [],
          };
          storageSet(
            DEMO ? "iges.demo.stay" : "iges.stay",
            JSON.stringify(next),
          );
          return next;
        });
      })
      .catch((e) => {
        if (active) setError(e);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [version]);
  useEffect(() => {
    let previous = getSession();
    const onAuth = () => {
      const next = getSession();
      if (!sameSession(previous, next)) setSignOutRequested(false);
      previous = next;
      setAuth(next);
    };
    const onExpired = () => setExpired(true);
    window.addEventListener("iges:auth", onAuth);
    window.addEventListener("iges:expired", onExpired);
    return () => {
      window.removeEventListener("iges:auth", onAuth);
      window.removeEventListener("iges:expired", onExpired);
    };
  }, []);
  useEffect(() => {
    const events = ["pointerdown", "pointermove", "keydown", "wheel"];
    for (const event of events)
      window.addEventListener(event, recordSessionActivity, { passive: true, capture: true });
    return () => {
      for (const event of events) window.removeEventListener(event, recordSessionActivity, true);
    };
  }, []);
  useEffect(() => {
    if (!auth) return;
    const deadline = auth.renewal
      ? Math.min(auth.renewal.idleUntil, auth.renewal.sessionUntil) + 1000
      : auth.expires;
    const timer = setTimeout(
      () => {
        if (getSession() !== auth) return;
        if (auth.renewal) {
          void renewSession().catch(() => {});
          return;
        }
        setToken(null);
        setExpired(true);
      },
      Math.max(0, deadline - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [auth]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => notify(""), 6500);
    return () => clearTimeout(timer);
  }, [notice]);
  return (
    <HotelContext.Provider
      value={{
        stay,
        setStay,
        branches,
        branch: branches.find((b) => b.id === stay.branchId),
        profile,
        website,
        loading,
        catalogError,
        reload: () => setVersion((v) => v + 1),
        auth,
        signOutRequested,
        requestSignOut: () => setSignOutRequested(true),
        cancelSignOut: () => setSignOutRequested(false),
        logout: () => {
          setToken(null);
          storageSet("iges.attempt", null);
          notify("You have signed out.");
        },
        notice,
        notify,
        expired,
        closeExpired: () => setExpired(false),
      }}
    >
      {DEMO && (
        <div className="demo-banner">
          DESIGN PREVIEW{" "}
          <span>
            Illustrative photos, rooms and rates · reservations disabled
          </span>
          <a href="/">Switch to live site ↗</a>
        </div>
      )}
      {children}
    </HotelContext.Provider>
  );
}
export const useHotel = () => useContext(HotelContext);
