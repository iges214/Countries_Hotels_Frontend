import { useEffect, useRef, useState } from "react";
import {
  useBeforeUnload,
  useBlocker,
  useLocation,
  useParams,
} from "react-router-dom";
import { Printer, CalendarDays } from "lucide-react";
import { api, ApiError, DEMO } from "../api";
import { useHotel } from "../context";
import { useData, useRooms } from "../hooks";
import { dateLabel, money, nights, today, validateStay } from "../stay";
import type { Booking, Room, Stay } from "../types";
import {
  ArrowRight,
  Check,
  Empty,
  ErrorBox,
  Link,
  Loading,
  Modal,
  Photo,
  Steps,
  useGo,
} from "../components";
export function RequireAccount({ children }: { children: React.ReactNode }) {
  const { auth } = useHotel();
  if (!auth)
    return (
      <section className="container prose section-pad">
        <div className="eyebrow">YOUR PRIVATE GUEST SPACE</div>
        <h1>Your stays, together.</h1>
        <p>Sign in to view your profile and manage your reservations.</p>
        <div className="button-row">
          <Link
            className="button"
            to={"/login?returnTo=" + encodeURIComponent(location.pathname)}
          >
            Sign in <ArrowRight size={15} />
          </Link>
          <Link
            className="button outline"
            to={"/register?returnTo=" + encodeURIComponent(location.pathname)}
          >
            Create account
          </Link>
        </div>
        {DEMO && <p>Guest accounts are unavailable in design preview.</p>}
      </section>
    );
  return <>{children}</>;
}
export function MyBookings() {
  return (
    <RequireAccount>
      <BookingList />
    </RequireAccount>
  );
}
function BookingList() {
  const { stay, branch, auth } = useHotel();
  const bookings = useData(
    () => (stay.branchId ? api.bookings(stay.branchId) : Promise.resolve([])),
    [stay.branchId, auth?.id],
  );
  const [status, setStatus] = useState("All");
  const shown = bookings.data?.filter(
    (b) => status === "All" || b.status === status,
  );
  return (
    <section className="container section-pad bookings-page">
      <div className="eyebrow">YOUR IGES GUEST SPACE</div>
      <h1>A collection of stays.</h1>
      <p>
        Reservations for {branch?.name || "your selected branch"}. Choose a
        branch in the navigation to see its bookings.
      </p>
      <div className="menu-controls">
        <div role="group" aria-label="Filter bookings">
          {["All", "Pending", "Confirmed", "Cancelled"].map((s) => (
            <button
              className={"filter-chip " + (status === s ? "selected" : "")}
              key={s}
              onClick={() => setStatus(s)}
              aria-pressed={status === s}
            >
              {s}
            </button>
          ))}
        </div>
        <Link className="button outline" to="/booking">
          Plan another stay <ArrowRight size={16} />
        </Link>
      </div>
      <ErrorBox error={bookings.error} retry={bookings.retry} />
      {bookings.loading ? <Loading /> : <BookingCards bookings={shown || []} />}
      {!bookings.loading && !bookings.error && !shown?.length && (
        <Empty title="Your next memory is waiting.">
          <p>
            No {status === "All" ? "" : status.toLowerCase() + " "}reservations
            for this branch.
          </p>
          <Link className="button gold" to="/booking">
            Find your next stay <ArrowRight size={16} />
          </Link>
        </Empty>
      )}
    </section>
  );
}

function canChangeBooking(booking: Booking) {
  return (
    booking.status !== "Cancelled" &&
    !booking.isCheckedIn &&
    !booking.isCheckedOut
  );
}

function bookingStatus(booking: Booking) {
  if (booking.isCheckedOut) return "Checked out";
  if (booking.isCheckedIn) return "Checked in";
  return booking.status;
}

export function BookingCards({
  bookings,
  actions = false,
}: {
  bookings: Booking[];
  actions?: boolean;
}) {
  return (
    <div className="booking-list">
      {bookings.map((b) => (
        <article key={b.id} className="booking-list-card">
          <div className="booking-list-date">
            <CalendarDays />
            <strong>{dateLabel(b.checkIn)}</strong>
            <span>{nights(b.checkIn, b.checkOut)} nights</span>
          </div>
          <div>
            <span className={"status-badge " + b.status.toLowerCase()}>
              {bookingStatus(b) === "Pending"
                ? "Pending · Awaiting confirmation"
                : bookingStatus(b)}
            </span>
            <h3>{b.hotelName}</h3>
            <p>
              Booking #{b.id} · {b.guests} guests · {b.rooms} rooms
            </p>
            <p>
              {dateLabel(b.checkIn)} — {dateLabel(b.checkOut)}
            </p>
          </div>
          <div>
            <strong>{money(b.totalPrice, b.currencyCode)}</strong>
            <Link
              className="text-link"
              to={`/my-bookings/${b.hotelId}/${b.id}`}
            >
              View reservation <ArrowUp />
            </Link>
            {actions && canChangeBooking(b) && (
              <div className="profile-booking-actions">
                <Link
                  className="text-link"
                  to={`/my-bookings/${b.hotelId}/${b.id}/edit`}
                >
                  Edit reservation
                </Link>
                <Link
                  className="text-link danger"
                  to={`/my-bookings/${b.hotelId}/${b.id}`}
                  state={{ cancelReservation: true }}
                >
                  Cancel reservation
                </Link>
              </div>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
function ArrowUp() {
  return <span aria-hidden="true">↗</span>;
}
export function BookingDetails({
  confirmation = false,
}: {
  confirmation?: boolean;
}) {
  const { branchId, bookingId } = useParams();
  const { auth } = useHotel();
  return (
    <RequireAccount>
      <OwnerBooking
        key={`${auth?.id}:${branchId}:${bookingId}`}
        branchId={Number(branchId)}
        bookingId={Number(bookingId)}
        confirmation={confirmation}
      />
    </RequireAccount>
  );
}
function OwnerBooking({
  branchId,
  bookingId,
  confirmation,
}: {
  branchId: number;
  bookingId: number;
  confirmation: boolean;
}) {
  const { auth, notify } = useHotel();
  const data = useData(async () => {
    const bookings = await api.bookings(branchId);
    const b = bookings.find((b) => b.id === bookingId);
    if (!b)
      throw new ApiError(
        404,
        "This reservation could not be found in your account for this branch.",
      );
    return b;
  }, [branchId, bookingId, auth?.id]);
  const location = useLocation();
  const [cancel, setCancel] = useState(
    location.state?.cancelReservation === true,
  );
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState<unknown>();
  const [uncertain, setUncertain] = useState(false);
  const b = data.data;
  async function cancelBooking() {
    if (busyRef.current || !b || !canChangeBooking(b)) return;
    busyRef.current = true;
    setBusy(true);
    setError(undefined);
    try {
      await api.cancel(branchId, bookingId);
      notify(
        "Your reservation has been cancelled. Its rooms have been released.",
      );
      data.retry();
      setCancel(false);
    } catch (e) {
      setError(e);
      if (e instanceof ApiError && e.status === 409) {
        setCancel(false);
        data.retry();
      } else if (e instanceof ApiError && (e.status === 0 || e.status >= 500)) {
        setUncertain(true);
        try {
          const current = (await api.bookings(branchId)).find(
            (x) => x.id === bookingId,
          );
          if (current?.status === "Cancelled") {
            data.setData(current);
            notify("Cancellation verified in your account.");
            setError(undefined);
            setUncertain(false);
            setCancel(false);
          }
        } catch {
          /* Keep the uncertain state. */
        }
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      {confirmation && <Steps step={4} />}
      <section
        className={
          "container section-pad receipt-page " +
          (confirmation ? "confirmation" : "")
        }
      >
        <ErrorBox error={data.error} retry={data.retry} />
        {data.loading ? (
          <Loading cards={1} />
        ) : b ? (
          <>
            <div className="receipt-intro">
              <div className="receipt-icon">
                <Check />
              </div>
              <div className="eyebrow">
                {confirmation
                  ? "YOUR RESERVATION HAS BEEN RECEIVED"
                  : "YOUR IGES RESERVATION"}
              </div>
              <h1>
                {b.isCheckedOut
                  ? "Your stay is complete."
                  : b.isCheckedIn
                    ? "You’re checked in."
                    : b.status === "Confirmed"
                      ? "Your stay is confirmed."
                      : b.status === "Cancelled"
                        ? "Your reservation is cancelled."
                        : "Your stay is on its way."}
              </h1>
              <p>
                {b.isCheckedOut
                  ? "Thank you for staying with us."
                  : b.isCheckedIn
                    ? "Your stay is in progress. Contact the hotel if you need help."
                    : b.status === "Pending"
                      ? "Awaiting confirmation from the hotel. Your reservation is currently Pending."
                      : b.status === "Confirmed"
                        ? "The hotel has confirmed your reservation. We look forward to welcoming you."
                        : "This reservation has been cancelled and its rooms released."}
              </p>
            </div>
            <div className="receipt">
              <div className="receipt-top">
                <div>
                  <div className="eyebrow">RESERVATION REFERENCE</div>
                  <h2>#{b.id}</h2>
                </div>
                <span className={"status-badge " + b.status.toLowerCase()}>
                  {bookingStatus(b)}
                </span>
              </div>
              <h2>{b.hotelName}</h2>
              <div className="receipt-grid">
                <div>
                  <span>Check-in</span>
                  <strong>{dateLabel(b.checkIn)}</strong>
                </div>
                <div>
                  <span>Check-out</span>
                  <strong>{dateLabel(b.checkOut)}</strong>
                </div>
                <div>
                  <span>Guests</span>
                  <strong>{b.guests} guests</strong>
                </div>
                <div>
                  <span>Length of stay</span>
                  <strong>{nights(b.checkIn, b.checkOut)} nights</strong>
                </div>
                <div>
                  <span>Physical room IDs</span>
                  <strong>
                    {b.roomIds.length
                      ? b.roomIds.join(", ")
                      : "Legacy booking — contact the hotel"}
                  </strong>
                </div>
                <div>
                  <span>Number of rooms</span>
                  <strong>{b.rooms}</strong>
                </div>
                <div>
                  <span>Payment</span>
                  <strong>Not collected on this website</strong>
                </div>
                <div>
                  <span>Created</span>
                  <strong>{dateLabel(b.createAt.slice(0, 10))}</strong>
                </div>
              </div>
              <div className="receipt-total">
                <span>Total · {b.currencyCode}</span>
                <strong>{money(b.totalPrice, b.currencyCode)}</strong>
              </div>
              <p className="fine-print">
                Total and reservation status supplied by the hotel service.
                Payment status is not provided by this API. A reservation
                receipt is not a payment receipt.
              </p>
            </div>
            <ErrorBox error={error} />
            {uncertain && (
              <div className="info-note">
                <p>
                  The cancellation outcome is uncertain. Refresh this
                  reservation and check its status before trying again.
                </p>
                <button
                  className="button outline"
                  onClick={() => {
                    data.retry();
                    setUncertain(false);
                  }}
                >
                  Refresh reservation
                </button>
              </div>
            )}
            <div className="button-row receipt-actions">
              <button className="button gold" onClick={() => window.print()}>
                <Printer size={17} /> Print / Save PDF
              </button>
              <Link className="button outline" to="/my-bookings">
                My bookings
              </Link>
              {canChangeBooking(b) && (
                <>
                  <Link
                    className="text-link"
                    to={`/my-bookings/${branchId}/${bookingId}/edit`}
                  >
                    Edit reservation <ArrowUp />
                  </Link>
                  <button
                    className="text-button danger"
                    disabled={busy || uncertain}
                    onClick={() => setCancel(true)}
                  >
                    Cancel reservation
                  </button>
                </>
              )}
            </div>
            {(b.isCheckedIn || b.isCheckedOut) && (
              <p className="center info-note">
                This reservation can no longer be changed online after check-in.
              </p>
            )}
            <p className="center fine-print">
              Need a little help? <Link to="/contact">Contact management</Link>.
            </p>
            {cancel && canChangeBooking(b) && (
              <Modal
                title="Cancel this reservation?"
                onClose={() => {
                  if (!busy) setCancel(false);
                }}
              >
                <p>
                  Booking #{b.id} · {b.hotelName}
                  <br />
                  {dateLabel(b.checkIn)} — {dateLabel(b.checkOut)}
                </p>
                <p>
                  Cancellation changes the status to Cancelled and releases the
                  reserved rooms. Cancelled bookings cannot be edited. No
                  payments or refunds are processed by this website, and
                  financial cancellation terms have not been supplied by the
                  hotel.
                </p>
                <ErrorBox error={error} />
                <div className="button-row">
                  <button
                    className="button outline"
                    disabled={busy}
                    onClick={() => setCancel(false)}
                  >
                    Keep reservation
                  </button>
                  <button
                    className="button danger-button"
                    disabled={busy || uncertain}
                    onClick={cancelBooking}
                  >
                    {busy ? "Cancelling…" : "Cancel reservation"}
                  </button>
                </div>
              </Modal>
            )}
          </>
        ) : null}
      </section>
    </>
  );
}
export function BookingEdit() {
  const { branchId, bookingId } = useParams();
  const { auth } = useHotel();
  return (
    <RequireAccount>
      <LoadEdit
        key={`${auth?.id}:${branchId}:${bookingId}`}
        branchId={Number(branchId)}
        bookingId={Number(bookingId)}
      />
    </RequireAccount>
  );
}
function LoadEdit({
  branchId,
  bookingId,
}: {
  branchId: number;
  bookingId: number;
}) {
  const data = useData(async () => {
    const [bookings, branch] = await Promise.all([
      api.bookings(branchId),
      api.branch(branchId),
    ]);
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking)
      throw new ApiError(
        404,
        "This reservation could not be found in your account.",
      );
    return { booking, branch };
  }, [branchId, bookingId]);
  return (
    <section className="container section-pad edit-page">
      <Link className="text-link" to={`/my-bookings/${branchId}/${bookingId}`}>
        ← Back to reservation
      </Link>
      <h1>Fine-tune your stay.</h1>
      <ErrorBox error={data.error} retry={data.retry} />
      {data.loading ? (
        <Loading cards={1} />
      ) : data.data ? (
        data.data.booking.status === "Cancelled" ? (
          <Empty title="This reservation is cancelled">
            <p>
              Cancelled reservations cannot be edited. Please make a new
              reservation.
            </p>
            <Link className="button" to="/booking">
              Plan a new stay
            </Link>
          </Empty>
        ) : !canChangeBooking(data.data.booking) ? (
          <Empty title="This stay can no longer be edited">
            <p>
              Please contact the hotel if you need help with this reservation.
            </p>
            <Link className="button" to="/contact">
              Contact the hotel
            </Link>
          </Empty>
        ) : (
          <EditForm booking={data.data.booking} branch={data.data.branch} />
        )
      ) : null}
    </section>
  );
}
function EditForm({
  booking,
  branch,
}: {
  booking: Booking;
  branch: import("../types").Branch;
}) {
  const [s, setS] = useState<Stay>({
    branchId: booking.hotelId,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    guests: booking.guests,
    category: "all",
    roomIds: booking.roomIds,
  });
  const [replace, setReplace] = useState(false);
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [confirm, setConfirm] = useState(false);
  const [done, setDone] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const { notify } = useHotel();
  const go = useGo();
  const rooms = useRooms(s, true);
  const dirty =
    !done &&
    (s.checkIn !== booking.checkIn ||
      s.checkOut !== booking.checkOut ||
      s.guests !== booking.guests ||
      s.roomIds.join(",") !== booking.roomIds.join(","));
  const blocker = useBlocker(dirty && !busy);
  useBeforeUnload((e) => {
    if (dirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
  const selected = rooms.data?.filter((r) => s.roomIds.includes(r.id)) || [];
  const estimate = replace
    ? selected.reduce((n, r) => n + r.perNightRate, 0) *
      nights(s.checkIn, s.checkOut)
    : (booking.totalPrice / nights(booking.checkIn, booking.checkOut)) *
      nights(s.checkIn, s.checkOut);
  useEffect(() => {
    if (done) go(`/my-bookings/${booking.hotelId}/${booking.id}`, true);
  }, [done]);
  async function save() {
    if (lock.current || uncertain) return;
    const errors = validateStay(s, branch);
    if (!s.roomIds.length) errors.push("Select at least one room.");
    if (replace && selected.reduce((n, r) => n + r.maxGuests, 0) < s.guests)
      errors.push("The replacement rooms need enough capacity for all guests.");
    if (errors.length) {
      setError(new ApiError(400, errors.join(" ")));
      setConfirm(false);
      return;
    }
    lock.current = true;
    setBusy(true);
    setError(undefined);
    try {
      if (replace) {
        const current = await Promise.all(
          s.roomIds.map((id) => api.room(s, id)),
        );
        if (
          current.some(
            (r) =>
              r.perNightRate !==
              selected.find((x) => x.id === r.id)?.perNightRate,
          )
        ) {
          rooms.retry();
          setConfirm(false);
          throw new ApiError(
            409,
            "A replacement room rate changed. Review current rooms and charges before saving.",
          );
        }
      }
      await api.update(booking.hotelId, booking.id, {
        checkIn: s.checkIn,
        checkOut: s.checkOut,
        guests: s.guests,
        rooms: s.roomIds.length,
        roomIds: s.roomIds,
      });
      notify(
        "Your reservation has been updated. Review the server total and status.",
      );
      setDone(true);
    } catch (e) {
      setError(e);
      setConfirm(false);
      if (e instanceof ApiError && (e.status === 0 || e.status >= 500)) {
        setUncertain(true);
        try {
          const current = (await api.bookings(booking.hotelId)).find(
            (b) => b.id === booking.id,
          );
          if (
            current &&
            current.checkIn === s.checkIn &&
            current.checkOut === s.checkOut &&
            current.guests === s.guests &&
            [...current.roomIds].sort().join(",") ===
              [...s.roomIds].sort().join(",")
          ) {
            notify("Your updated reservation was verified in your account.");
            setDone(true);
          }
        } catch {
          /* A manual review is required. */
        }
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <p>
        Booking #{booking.id} · {branch.name}. Existing quoted rates are
        retained when you keep all booked rooms. The hotel checks availability
        when you save.
      </p>
      <ErrorBox error={error} />
      {uncertain && (
        <div className="error-box">
          <p>
            The update outcome is uncertain. Open the reservation details and
            review the current server dates, rooms and total before editing
            again. No automatic retry will be made.
          </p>
          <Link
            className="button outline"
            to={`/my-bookings/${booking.hotelId}/${booking.id}`}
          >
            Review server reservation
          </Link>
        </div>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setConfirm(true);
        }}
        className="edit-form"
      >
        <div className="form-grid">
          <label className="form-field">
            Check-in
            <input
              type="date"
              min={today(branch.timeZoneId)}
              value={s.checkIn}
              onChange={(e) =>
                setS({
                  ...s,
                  checkIn: e.target.value,
                  roomIds: replace ? [] : s.roomIds,
                })
              }
              required
            />
          </label>
          <label className="form-field">
            Check-out
            <input
              type="date"
              value={s.checkOut}
              onChange={(e) =>
                setS({
                  ...s,
                  checkOut: e.target.value,
                  roomIds: replace ? [] : s.roomIds,
                })
              }
              required
            />
          </label>
          <label className="form-field">
            Guests
            <input
              type="number"
              min="1"
              max="10"
              value={s.guests}
              onChange={(e) => setS({ ...s, guests: Number(e.target.value) })}
              required
            />
          </label>
        </div>
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={replace}
            onChange={(e) => {
              setReplace(e.target.checked);
              setS({ ...s, roomIds: e.target.checked ? [] : booking.roomIds });
            }}
          />
          Replace all booked rooms with a new selection
        </label>
        {!replace ? (
          <div className="info-note">
            <p>
              Keeping physical room IDs:{" "}
              {booking.roomIds.join(", ") ||
                "No assigned rooms on this legacy reservation. Select replacements to continue."}
              <br />
              Your reserved rooms are hidden from public availability searches.
              Their availability and total capacity are checked by the booking
              service when you save.
            </p>
          </div>
        ) : (
          <>
            <p>
              Replacement searches show rooms available to the public. Your
              current reserved rooms are excluded. Partial replacements with
              retained rooms are not offered because the API does not expose
              each retained room’s quoted rate.
            </p>
            <ErrorBox error={rooms.error} retry={rooms.retry} />
            {rooms.loading ? (
              <Loading cards={2} />
            ) : (
              rooms.data?.map((r) => (
                <label className="replacement-room" key={r.id}>
                  <input
                    type="checkbox"
                    checked={s.roomIds.includes(r.id)}
                    onChange={(e) =>
                      setS({
                        ...s,
                        roomIds: e.target.checked
                          ? [...s.roomIds, r.id]
                          : s.roomIds.filter((id) => id !== r.id),
                      })
                    }
                  />
                  <span>
                    Room {r.number} · {r.bedType} · {r.maxGuests} guests
                  </span>
                  <strong>
                    {money(r.perNightRate, r.currencyCode)} / night
                  </strong>
                </label>
              ))
            )}
          </>
        )}
        <h3>
          Estimated total:{" "}
          {Number.isFinite(estimate)
            ? money(estimate, booking.currencyCode)
            : "Choose valid dates"}
        </h3>
        <p className="fine-print">
          The server returns the authoritative total after saving. No payment is
          taken here.
        </p>
        <div className="button-row">
          <button
            className="button gold"
            disabled={busy || uncertain || !dirty || !s.roomIds.length}
            type="submit"
          >
            Review changes <ArrowRight size={16} />
          </button>
          <Link
            className="button outline"
            to={`/my-bookings/${booking.hotelId}/${booking.id}`}
          >
            Leave edit
          </Link>
        </div>
      </form>
      {confirm && (
        <Modal
          title="Save your updated stay?"
          onClose={() => {
            if (!busy) setConfirm(false);
          }}
        >
          <p>
            {s.checkIn} — {s.checkOut} · {s.guests} guests
            <br />
            Physical room IDs: {s.roomIds.join(", ")}
          </p>
          <h3>Estimated total: {money(estimate, booking.currencyCode)}</h3>
          <p>
            Availability will be checked when you save. The server supplies the
            updated total and status.
          </p>
          <div className="button-row">
            <button
              className="button outline"
              disabled={busy}
              onClick={() => setConfirm(false)}
            >
              Keep editing
            </button>
            <button
              className="button gold"
              disabled={busy || uncertain}
              onClick={save}
            >
              {busy ? "Saving…" : "Save changes"}
            </button>
          </div>
        </Modal>
      )}
      {blocker.state === "blocked" && (
        <Modal
          title="Leave your changes behind?"
          onClose={() => blocker.reset()}
        >
          <p>
            Your unsaved changes will be lost. Your existing server reservation
            will stay as it is.
          </p>
          <div className="button-row">
            <button className="button" onClick={() => blocker.reset()}>
              Keep editing
            </button>
            <button
              className="button outline"
              onClick={() => blocker.proceed()}
            >
              Discard changes
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
