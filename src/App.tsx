import { Component, useEffect, useState, type ReactNode } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { X, WifiOff } from "lucide-react";
import { ErrorBox, Header, Footer, Link, Modal } from "./components";
import { endSession } from "./api";
import { useHotel } from "./context";
import {
  Home,
  Rooms,
  CategoryDetails,
  Kitchen,
  Contact,
  Policy,
  CapabilityPage,
  StatusPage,
  NotFound,
} from "./pages/Discover";
import { Auth } from "./pages/Auth";
import { BookingPage } from "./pages/Booking";
import { MyBookings, BookingDetails, BookingEdit } from "./pages/MyBookings";
import { AdminApp } from "./admin/AdminApp";
import { GuestProfile } from "./pages/GuestProfile";
class PageBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <StatusPage code={500} /> : this.props.children;
  }
}
function Metadata() {
  const { pathname } = useLocation();
  useEffect(() => {
    const titles: Record<string, string> = {
      "/": "A warmer stay in Warri",
      "/rooms": "Rooms & suites",
      "/kitchen": "Kitchen & hospitality",
      "/contact": "Contact management",
      "/booking": "Plan your stay",
      "/login": "Welcome back",
      "/register": "Create your guest account",
      "/my-bookings": "My bookings",
      "/profile": "My profile",
      "/privacy": "Privacy information",
      "/terms": "Terms & booking policies",
    };
    const title = pathname.startsWith("/admin")
      ? "Administration"
      : titles[pathname] ||
        (pathname.startsWith("/rooms/")
          ? "Explore your room"
          : pathname.startsWith("/my-bookings/")
            ? "Your reservation"
            : pathname.startsWith("/booking/confirmation/")
              ? "Reservation received"
              : "Guest information");
    document.title = title + " | IGES Hotel & Suites";
    const desc = document.querySelector('meta[name="description"]');
    desc?.setAttribute(
      "content",
      title +
        ". Discover IGES Hotel and Suites in Warri, Delta State, Nigeria.",
    );
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement("meta");
      robots.name = "robots";
      document.head.appendChild(robots);
    }
    robots.content =
      /^\/(admin|booking|my-bookings|profile|login|register|forgot-password|reset-password|verify-email|resend-verification|403|500|503|offline)/.test(
        pathname,
      )
        ? "noindex, nofollow"
        : "index, follow";
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}
function SignOutConfirmation() {
  const { auth, signOutRequested } = useHotel();
  return auth && signOutRequested ? <SignOutDialog /> : null;
}

function SignOutDialog() {
  const { auth, cancelSignOut, logout } = useHotel();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const close = () => {
    if (!busy) cancelSignOut();
  };
  return (
    <Modal title="Sign out?" onClose={close}>
      <p>Are you sure you want to sign out?</p>
      <ErrorBox error={error} />
      <div className="button-row">
        <button className="button outline" onClick={close} disabled={busy} autoFocus>
          Cancel
        </button>
        <button className="button" disabled={busy} onClick={async () => {
          if (!auth) return;
          setBusy(true);
          setError(undefined);
          try {
            await endSession(auth, logout);
          } catch (error) {
            setError(error);
          } finally {
            setBusy(false);
          }
        }}>
          Yes, sign out
        </button>
      </div>
    </Modal>
  );
}
export default function App() {
  const loc = useLocation();
  const { notice, notify, expired, closeExpired, auth } = useHotel();
  const [offline, setOffline] = useState(!navigator.onLine);
  useEffect(() => {
    const disconnected = () => setOffline(true);
    const connected = () => {
      setOffline(false);
      notify(
        "Connection restored. You can retry your search. Reservation submissions are never retried automatically.",
      );
    };
    window.addEventListener("offline", disconnected);
    window.addEventListener("online", connected);
    return () => {
      window.removeEventListener("offline", disconnected);
      window.removeEventListener("online", connected);
    };
  }, []);
  if (loc.pathname === "/admin" || loc.pathname.startsWith("/admin/"))
    return (
      <>
        <Metadata />
        <PageBoundary key={auth?.id || "admin-guest"}>
          <AdminApp />
        </PageBoundary>
        <SignOutConfirmation />
      </>
    );
  return (
    <>
      <Metadata />
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <div className="utility-bar">
        <div className="container">
          <span>WARRI, DELTA STATE · NIGERIA</span>
          <span>A warmer stay, always.</span>
        </div>
      </div>
      <Header />
      {offline && (
        <div className="offline-banner" role="status">
          <WifiOff size={17} />
          You’re offline. Your selected stay is saved in this tab. Reconnect
          before continuing.
        </div>
      )}
      <main id="main" tabIndex={-1}>
        <PageBoundary
          key={
            loc.pathname === "/login"
              ? "/login"
              : loc.pathname + (auth?.id || "guest")
          }
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/rooms" element={<Rooms />} />
            <Route path="/rooms/:category" element={<CategoryDetails />} />
            <Route path="/booking" element={<BookingPage />} />
            <Route
              path="/booking/confirmation/:branchId/:bookingId"
              element={<BookingDetails confirmation />}
            />
            <Route
              path="/register"
              element={<Auth register key="register" />}
            />
            <Route path="/login" element={<Auth key="login" />} />
            <Route path="/kitchen" element={<Kitchen />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/privacy" element={<Policy type="privacy" />} />
            <Route path="/terms" element={<Policy type="terms" />} />
            <Route path="/my-bookings" element={<MyBookings />} />
            <Route path="/profile" element={<GuestProfile />} />
            <Route
              path="/my-bookings/:branchId/:bookingId"
              element={<BookingDetails />}
            />
            <Route
              path="/my-bookings/:branchId/:bookingId/edit"
              element={<BookingEdit />}
            />
            {[
              "/forgot-password",
              "/reset-password",
              "/reset-success",
              "/verify-email",
              "/verification-expired",
              "/resend-verification",
            ].map((p) => (
              <Route key={p} path={p} element={<CapabilityPage />} />
            ))}
            <Route path="/403" element={<StatusPage code={403} />} />
            <Route path="/500" element={<StatusPage code={500} />} />
            <Route path="/503" element={<StatusPage code={503} />} />
            <Route path="/maintenance" element={<StatusPage code={503} />} />
            <Route path="/offline" element={<StatusPage code={0} />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </PageBoundary>
      </main>
      <Footer />
      <SignOutConfirmation />
      {notice && (
        <div className="toast" role="status">
          <span>{notice}</span>
          <button onClick={() => notify("")} aria-label="Dismiss notification">
            <X size={16} />
          </button>
        </div>
      )}
      {expired && (
        <Modal title="Let’s sign you back in." onClose={closeExpired}>
          <p>
            Your session has expired. Your non-sensitive stay draft is saved in
            this tab. Sign in again to continue.
          </p>
          <div className="button-row">
            <Link
              className="button"
              to={
                "/login?returnTo=" +
                encodeURIComponent(
                  loc.pathname.startsWith("/my-bookings") ||
                    loc.pathname === "/profile"
                    ? loc.pathname
                    : "/booking",
                )
              }
              onClick={closeExpired}
            >
              Sign in again
            </Link>
            <button className="button outline" onClick={closeExpired}>
              Keep browsing
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
