import { useRef, useState } from "react";
import { api, ApiError, getSession, sameSession } from "../api";
import {
  ArrowRight,
  Empty,
  ErrorBox,
  Link,
  Loading,
  useGo,
} from "../components";
import { useHotel } from "../context";
import { useData } from "../hooks";
import { passwordErrors, today } from "../stay";
import type { Booking } from "../types";
import { BookingCards, RequireAccount } from "./MyBookings";

const sections = ["Bookings", "Personal details", "Change password"] as const;

export function GuestProfile() {
  return (
    <RequireAccount>
      <ProfileDashboard />
    </RequireAccount>
  );
}

function ProfileDashboard() {
  const [section, setSection] = useState<(typeof sections)[number]>("Bookings");
  return (
    <section className="container section-pad guest-profile">
      <div className="eyebrow">YOUR IGES GUEST SPACE</div>
      <h1>My profile</h1>
      <p>Manage your stays and account details in one place.</p>
      <nav className="menu-controls" aria-label="Profile sections">
        <div className="profile-sections">
          {sections.map((item) => (
            <button
              key={item}
              className={"filter-chip " + (section === item ? "selected" : "")}
              aria-pressed={section === item}
              onClick={() => setSection(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <Link className="button outline" to="/booking">
          Plan another stay <ArrowRight size={16} />
        </Link>
      </nav>
      {section === "Bookings" && <ProfileBookings />}
      {section === "Personal details" && <PersonalDetails />}
      {section === "Change password" && <ChangePassword />}
    </section>
  );
}

function isActiveBooking(booking: Booking) {
  if (booking.status === "Cancelled" || booking.isCheckedOut) return false;
  return (
    booking.isCheckedIn ||
    booking.checkOut > (today(booking.timeZoneId) || today())
  );
}

function ProfileBookings() {
  const { auth } = useHotel();
  const data = useData(api.accountBookings, [auth?.id]);
  if (data.loading) return <Loading />;
  if (data.error) return <ErrorBox error={data.error} retry={data.retry} />;
  const bookings = data.data || [];
  const active = bookings.filter(isActiveBooking);
  const history = bookings.filter((booking) => !isActiveBooking(booking));
  return (
    <>
      <section
        className="profile-booking-section"
        aria-labelledby="active-bookings"
      >
        <h2 id="active-bookings">Current and upcoming bookings</h2>
        {active.length ? (
          <BookingCards bookings={active} actions />
        ) : (
          <Empty title="No active reservations">
            <Link className="text-link" to="/booking">
              Find your next stay <ArrowRight size={16} />
            </Link>
          </Empty>
        )}
      </section>
      <section
        className="profile-booking-section"
        aria-labelledby="booking-history"
      >
        <h2 id="booking-history">Booking history</h2>
        {history.length ? (
          <BookingCards bookings={history} />
        ) : (
          <p>No past or cancelled reservations yet.</p>
        )}
      </section>
    </>
  );
}

function PersonalDetails() {
  const { auth, notify } = useHotel();
  const account = useData(api.account, [auth?.id]);
  const [error, setError] = useState<unknown>();
  const [saving, setSaving] = useState(false);
  if (account.loading) return <Loading cards={1} />;
  if (account.error)
    return <ErrorBox error={account.error} retry={account.retry} />;
  if (!account.data) return null;
  return (
    <form
      className="profile-form"
      onSubmit={async (event) => {
        event.preventDefault();
        if (saving) return;
        const fields = new FormData(event.currentTarget);
        setSaving(true);
        setError(undefined);
        try {
          await api.updateAccount({
            firstName: String(fields.get("firstName")).trim(),
            lastName: String(fields.get("lastName")).trim(),
          });
          notify("Your profile details were saved.");
        } catch (err) {
          setError(err);
        } finally {
          setSaving(false);
        }
      }}
    >
      <h2>Personal details</h2>
      <ErrorBox error={error} />
      <div className="form-grid">
        <label className="form-field">
          First name
          <input
            name="firstName"
            required
            maxLength={100}
            autoComplete="given-name"
            defaultValue={account.data.firstName}
          />
        </label>
        <label className="form-field">
          Last name
          <input
            name="lastName"
            required
            maxLength={100}
            autoComplete="family-name"
            defaultValue={account.data.lastName}
          />
        </label>
      </div>
      <label className="form-field">
        Email address
        <input type="email" readOnly value={account.data.email} />
      </label>
      <button className="button gold" disabled={saving}>
        {saving ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}

function ChangePassword() {
  const { logout, notify } = useHotel();
  const go = useGo();
  const [error, setError] = useState<unknown>();
  const [saving, setSaving] = useState(false);
  const requestPending = useRef(false);
  return (
    <form
      className="profile-form"
      onSubmit={async (event) => {
        event.preventDefault();
        if (requestPending.current) return;
        const fields = new FormData(event.currentTarget);
        const current = String(fields.get("currentPassword"));
        const next = String(fields.get("newPassword"));
        const issue = passwordErrors(next);
        if (issue || next !== fields.get("confirmation")) {
          setError(
            new ApiError(400, issue || "Your new passwords do not match."),
          );
          return;
        }
        const session = getSession();
        requestPending.current = true;
        setSaving(true);
        setError(undefined);
        try {
          await api.changePassword(current, next);
          if (sameSession(getSession(), session)) {
            logout();
            notify("Password updated. Sign in again with your new password.");
            go("/login?returnTo=%2Fprofile", true);
          }
        } catch (err) {
          setError(err);
        } finally {
          requestPending.current = false;
          setSaving(false);
        }
      }}
    >
      <h2>Change password</h2>
      <p>After updating your password, sign in again to continue.</p>
      <ErrorBox error={error} />
      <label className="form-field">
        Current password
        <input
          name="currentPassword"
          required
          type="password"
          autoComplete="current-password"
        />
      </label>
      <label className="form-field">
        New password
        <input
          name="newPassword"
          required
          type="password"
          autoComplete="new-password"
          aria-describedby="guest-password-rules"
        />
      </label>
      <p className="fine-print" id="guest-password-rules">
        Use at least 6 characters with uppercase, lowercase, a number and a
        symbol.
      </p>
      <label className="form-field">
        Confirm new password
        <input
          name="confirmation"
          required
          type="password"
          autoComplete="new-password"
        />
      </label>
      <button className="button gold" disabled={saving}>
        {saving ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}
