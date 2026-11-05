import { useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  BedDouble,
  CalendarDays,
  Users,
  Mail,
  Building2,
  UtensilsCrossed,
  Settings2,
  ShieldCheck,
  LayoutDashboard,
  Image,
  ExternalLink,
  LogOut,
  Menu,
  X,
  MapPin,
  RefreshCw,
  ArrowRight,
} from "lucide-react";
import { api, ApiError, DEMO } from "../api";
import { ErrorBox } from "../components";
import { useHotel } from "../context";
import { useData } from "../hooks";
import { adminApi } from "./api";
import { AdminContext } from "./context";
import { Card, useAction } from "./ui";
import { Overview, Bookings, BookingDetails, Guests } from "./Reservations";
import {
  Rooms,
  RoomEditor,
  ImageLibrary,
  Facilities,
  FacilityEditor,
} from "./Catalog";
import {
  Branches,
  Website,
  Administrators,
  Account,
  Countries,
} from "./Settings";
import { Messages } from "./Messages";
import "./admin.css";

const navigation = [
  ["", "Overview", LayoutDashboard],
  ["rooms", "Rooms & pricing", BedDouble],
  ["images", "Image library", Image],
  ["bookings", "Bookings", CalendarDays],
  ["guests", "Guests", Users],
  ["messages", "Messages & emails", Mail],
  ["branches", "Branches", Building2],
  ["facilities", "Facilities", UtensilsCrossed],
  ["website", "Website settings", Settings2],
  ["administrators", "Administrators", ShieldCheck],
] as const;

function AdminLogin() {
  const { auth, requestSignOut } = useHotel();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const action = useAction();
  return (
    <div className="ad-login">
      <div className="ad-login-brand">
        <Building2 size={40} />
        <div className="ad-wordmark">IGES</div>
        <span>HOTEL & SUITES</span>
        <div className="ad-gold-rule" />
        <p>
          Thoughtful hospitality.
          <br />
          Every detail, taken care of.
        </p>
      </div>
      <div className="ad-login-form">
        <Card>
          <span className="ad-eyebrow">ADMINISTRATION</span>
          <h1>Welcome back.</h1>
          <p>Sign in to manage your hotel.</p>
          {auth && (
            <p>
              You are signed in.{" "}
              <button className="ad-text" onClick={() => navigate("/admin")}>
                Open dashboard
              </button>{" "}
              or{" "}
              <button className="ad-text" onClick={requestSignOut}>
                sign out
              </button>
              .
            </p>
          )}
          {DEMO && (
            <p className="ad-note">
              Open <a href="/admin/login">the live admin sign-in</a> to
              continue. Admin actions are unavailable in design preview.
            </p>
          )}
          {action.feedback}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await action.run(async () => {
                await api.login(email.trim(), password);
                setPassword("");
                navigate("/admin", { replace: true });
              }, "Signed in.");
            }}
          >
            <label className="ad-field">
              Email address
              <input
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="ad-field">
              Password
              <input
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <button className="ad-btn gold full" disabled={action.busy || DEMO}>
              {action.busy ? "Signing in…" : "Sign in to administration"}
              <ArrowRight size={17} />
            </button>
          </form>
          <p className="ad-login-note">
            Access is available to system administrators and assigned branch
            administrators.
          </p>
          <Link className="ad-text" to="/">
            ← Return to the hotel website
          </Link>
        </Card>
      </div>
    </div>
  );
}

function AdminWorkspace() {
  const { auth, requestSignOut, expired, closeExpired } = useHotel();
  const loc = useLocation();
  const [params, setParams] = useSearchParams();
  const [menu, setMenu] = useState(false);
  const identity = useData(adminApi.me, [auth?.id]);
  const branchData = useData(adminApi.branches, [auth?.id]);
  const access = identity.data;
  const branches = (branchData.data || []).filter(
    (b) => access?.isSystemAdministrator || access?.branchIds.includes(b.id),
  );
  const branchId = Number(params.get("branch"));
  const branch = branches.find((b) => b.id === branchId) || branches[0];
  const to = (path = "") =>
    "/admin" +
    (path ? "/" + path : "") +
    (branch ? "?branch=" + branch.id : "");
  useEffect(() => setMenu(false), [loc.pathname]);
  useEffect(() => {
    if (expired) closeExpired();
  }, [expired, closeExpired]);
  if (!auth) return <Navigate to="/admin/login" replace />;
  if (identity.loading || branchData.loading)
    return (
      <div className="admin-app ad-loading" role="status">
        <RefreshCw className="ad-spin" />
        <p>Opening your workspace…</p>
      </div>
    );
  if (identity.error || branchData.error || !access)
    return (
      <div className="admin-app ad-access">
        <Card title="Administration access">
          <ErrorBox
            error={identity.error || branchData.error}
            retry={() => {
              identity.retry();
              branchData.retry();
            }}
          />
          <p>
            Use a system administrator account or an account assigned to a hotel
            branch.
          </p>
          <button className="ad-btn" onClick={requestSignOut}>
            Sign in with another account
          </button>
          <Link className="ad-text" to="/">
            Return to website
          </Link>
        </Card>
      </div>
    );
  const name =
    [access.firstName, access.lastName].filter(Boolean).join(" ") ||
    access.email ||
    "Administrator";
  return (
    <AdminContext.Provider
      value={{
        access,
        branches,
        branch,
        to,
        refreshAccess: identity.retry,
        refreshBranches: branchData.retry,
      }}
    >
      <div className="admin-app">
        <a className="skip-link" href="#admin-main">
          Skip to dashboard
        </a>
        {menu && (
          <button
            className="ad-scrim"
            aria-label="Close navigation"
            onClick={() => setMenu(false)}
          />
        )}
        <aside className={"ad-sidebar " + (menu ? "open" : "")}>
          <Link to={to()} className="ad-brand">
            <Building2 size={28} />
            <span className="ad-wordmark">IGES</span>
            <span>HOTEL & SUITES</span>
            <i />
            <small>ADMINISTRATION</small>
          </Link>
          <nav aria-label="Administration">
            {navigation.map(([path, label, Icon]) => (
              <NavLink
                key={path}
                to={to(path)}
                end={!path}
                className={({ isActive }) =>
                  isActive ||
                  (!path && loc.pathname.replace(/\/$/, "") === "/admin")
                    ? "active"
                    : ""
                }
              >
                <Icon size={20} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
          <div className="ad-profile">
            <span className="ad-avatar">{name[0]?.toUpperCase()}</span>
            <div>
              <strong>{name}</strong>
              <small>
                {access.isSystemAdministrator
                  ? "System administrator"
                  : "Branch administrator"}
              </small>
              <Link to={to("account")}>My account</Link>
            </div>
          </div>
        </aside>
        <div className="ad-workspace">
          <header className="ad-topbar">
            <button
              className="ad-icon ad-menu"
              aria-label={menu ? "Close navigation" : "Open navigation"}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X /> : <Menu />}
            </button>
            <label className="ad-branch-select">
              <MapPin size={17} />
              <span className="sr-only">Current branch</span>
              <select
                value={branch?.id || ""}
                disabled={!branches.length}
                onChange={(e) => setParams({ branch: e.target.value })}
              >
                {!branches.length && (
                  <option value="">
                    {access.isSystemAdministrator
                      ? "No branches yet"
                      : "No assigned branches"}
                  </option>
                )}
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <span className="ad-live">
              <i />
              LIVE WORKSPACE
            </span>
            <div className="ad-top-actions">
              <Link to="/" className="ad-btn subtle">
                View website <ExternalLink size={16} />
              </Link>
              <Link
                className="ad-icon"
                to={to("messages")}
                aria-label="Open messages"
              >
                <Mail size={21} />
              </Link>
              <button
                className="ad-icon"
                aria-label="Sign out"
                onClick={requestSignOut}
              >
                <LogOut size={20} />
              </button>
              <Link
                to={to("account")}
                className="ad-avatar"
                aria-label="My account"
              >
                {name[0]?.toUpperCase()}
              </Link>
            </div>
          </header>
          <main id="admin-main" className="ad-main" tabIndex={-1}>
            <div className="ad-breadcrumb">
              Administration <span>/</span>{" "}
              {navigation.find(
                ([path]) => path && loc.pathname.startsWith("/admin/" + path),
              )?.[1] ||
                (loc.pathname.includes("account") ? "My account" : "Overview")}
            </div>
            <div key={(branch?.id || 0) + access.id}>
              <Routes>
                <Route index element={<Overview />} />
                <Route path="rooms" element={<Rooms />} />
                <Route path="rooms/new" element={<RoomEditor key="new" />} />
                <Route path="rooms/:id" element={<RoomEditor />} />
                <Route path="images" element={<ImageLibrary />} />
                <Route path="bookings" element={<Bookings />} />
                <Route path="bookings/:id" element={<BookingDetails />} />
                <Route path="guests" element={<Guests />} />
                <Route path="messages" element={<Messages />} />
                <Route path="branches" element={<Branches />} />
                <Route path="countries" element={<Countries />} />
                <Route path="facilities" element={<Facilities />} />
                <Route
                  path="facilities/new"
                  element={<FacilityEditor key="new" />}
                />
                <Route path="facilities/:id" element={<FacilityEditor />} />
                <Route path="website" element={<Website />} />
                <Route path="administrators" element={<Administrators />} />
                <Route path="account" element={<Account />} />
                <Route
                  path="*"
                  element={
                    <Card title="Page not found">
                      <Link to={to()}>Return to overview →</Link>
                    </Card>
                  }
                />
              </Routes>
            </div>
            <footer className="ad-footer">
              <span>
                IGES Hotel & Suites <i>·</i> {branch?.name || "Administration"}
              </span>
              <span>Made for a warmer welcome.</span>
            </footer>
          </main>
        </div>
      </div>
    </AdminContext.Provider>
  );
}
export function AdminApp() {
  return (
    <div className="admin-root">
      <Routes>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/*" element={<AdminWorkspace />} />
      </Routes>
    </div>
  );
}
