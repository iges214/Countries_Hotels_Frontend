import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowDownToLine,
  ArrowRight,
  BedDouble,
  CalendarDays,
  Check,
  Clock,
  Image,
  Users,
  Wrench,
} from "lucide-react";
import { ErrorBox, Loading, Modal, Photo } from "../components";
import { useData } from "../hooks";
import { adminApi, type AdminBooking, type AdminRoom } from "./api";
import { useAdmin } from "./context";
import {
  Badge,
  BookingStatus,
  Card,
  date,
  EmptyState,
  Field,
  inHouse,
  matches,
  money,
  PageTitle,
  SearchBox,
  Tabs,
  today,
  useAction,
  usePagination,
} from "./ui";

function BookingTable({ bookings }: { bookings: AdminBooking[] }) {
  const { to, branch } = useAdmin();
  return (
    <div className="ad-table-wrap">
      <table className="ad-table">
        <thead>
          <tr>
            <th>Reference</th>
            <th>Guest</th>
            <th>Room</th>
            <th>Stay dates</th>
            <th>Guests</th>
            <th>Booking total</th>
            <th>Status</th>
            <th>
              <span className="sr-only">Action</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {bookings.map((b) => (
            <tr key={b.id}>
              <td>
                <strong>IG-{b.id}</strong>
              </td>
              <td>
                <strong>{b.guestName || "Guest"}</strong>
                <small>{b.guestEmail}</small>
              </td>
              <td>
                {b.assignments.map((a) => a.number).join(", ") || "Unassigned"}
              </td>
              <td>
                {date(b.checkIn, branch?.timeZoneId)}
                <small>to {date(b.checkOut, branch?.timeZoneId)}</small>
              </td>
              <td>{b.guests}</td>
              <td className="ad-nowrap">
                {money(b.totalPrice, b.currencyCode)}
              </td>
              <td>
                <BookingStatus status={b.status} />
                {inHouse(b) && <small>Checked in</small>}
                {b.actualCheckOutAt && <small>Checked out</small>}
              </td>
              <td>
                <Link className="ad-btn small" to={to("bookings/" + b.id)}>
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {bookings.length === 0 && (
        <EmptyState title="No matching reservations">
          <p>Reservations will appear here when guests book a stay.</p>
        </EmptyState>
      )}
    </div>
  );
}

export function Overview() {
  const { access, branch, to } = useAdmin();
  const data = useData<[AdminBooking[], AdminRoom[]]>(
    () =>
      branch
        ? Promise.all([adminApi.bookings(branch.id), adminApi.rooms(branch.id)])
        : Promise.resolve([[], []]),
    [branch?.id],
  );
  const [day, setDay] = useState(today(branch?.timeZoneId));
  if (!branch)
    return (
      <>
        <PageTitle
          title="A good day starts here."
          description="Your hotel at a glance."
        />
        <Card>
          <EmptyState title="Welcome to your administration workspace">
            {access.isSystemAdministrator ? (
              <>
                <p>
                  You’re signed in as a system administrator with access to all
                  hotel locations. Add your first location, even if you operate
                  a single hotel, to manage its rooms, reservations and branch
                  administrators.
                </p>
                <Link className="ad-btn gold" to={to("branches")}>
                  Set up your first location <ArrowRight size={16} />
                </Link>
              </>
            ) : (
              <p>
                No assigned locations are available. Contact a system
                administrator to review your branch access.
              </p>
            )}
          </EmptyState>
        </Card>
      </>
    );
  if (data.loading) return <Loading />;
  const [bookings, rooms] = data.data || [[], []];
  const arrivals = bookings.filter(
    (b) => b.checkIn === day && b.status !== "Cancelled",
  );
  const departures = bookings.filter(
    (b) => b.checkOut === day && b.status !== "Cancelled",
  );
  const pending = bookings.filter((b) => b.status === "Pending");
  const reservedIds = new Set(
    bookings
      .filter(
        (b) =>
          b.status !== "Cancelled" &&
          !b.actualCheckOutAt &&
          ((b.checkIn <= day && b.checkOut > day) ||
            (inHouse(b) && day <= today(branch.timeZoneId))),
      )
      .flatMap((b) => b.assignments.map((a) => a.roomId)),
  );
  const available = rooms.filter(
    (r) => r.isOperational && r.isPublished && !reservedIds.has(r.id),
  );
  const missing = rooms.filter(
    (r) =>
      !r.photos.some((p) => p.kind === "Room") ||
      !r.photos.some((p) => p.kind === "Bathroom"),
  );
  const maintenance = rooms.filter((r) => !r.isOperational);
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(day + "T12:00:00Z");
    d.setUTCDate(d.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    return {
      day: key,
      label: d.toLocaleDateString("en-GB", {
        weekday: "short",
        timeZone: "UTC",
      }),
      arrivals: bookings.filter(
        (b) => b.checkIn === key && b.status !== "Cancelled",
      ).length,
      stays: bookings.filter(
        (b) =>
          b.actualCheckInAt &&
          todayOf(b.actualCheckInAt, branch.timeZoneId) === key,
      ).length,
    };
  });
  const max = Math.max(4, ...week.flatMap((d) => [d.arrivals, d.stays]));
  return (
    <>
      <PageTitle
        title="A good day starts here."
        description="Your hotel at a glance."
      >
        <label className="ad-date">
          <CalendarDays size={17} />
          <span className="sr-only">Overview date</span>
          <input
            type="date"
            value={day}
            onChange={(e) => e.target.value && setDay(e.target.value)}
          />
        </label>
      </PageTitle>
      <ErrorBox error={data.error} retry={data.retry} />
      {!data.error && (
        <>
          <div className="ad-stats">
            {[
              ["Arrivals", arrivals.length, CalendarDays],
              ["Departures", departures.length, ArrowRight],
              ["Pending bookings", pending.length, Clock],
              ["Available rooms", available.length, BedDouble],
            ].map(([label, value, Icon], i) => {
              const StatIcon = Icon as typeof BedDouble;
              return (
                <Card key={i}>
                  <div className="ad-stat-icon">
                    {rooms[i]?.photos[0] ? (
                      <Photo src={rooms[i].photos[0].url} alt="" />
                    ) : (
                      <StatIcon size={26} />
                    )}
                  </div>
                  <div>
                    <span>
                      {String(label)}
                      {i < 2 && (
                        <small>
                          {" "}
                          ·{" "}
                          {day === today(branch.timeZoneId)
                            ? "today"
                            : date(day, branch.timeZoneId)}
                        </small>
                      )}
                    </span>
                    <strong>{String(value)}</strong>
                  </div>
                </Card>
              );
            })}
          </div>
          <div className="ad-columns overview">
            <Card title="This week’s reservations">
              <div
                className="ad-chart"
                role="img"
                aria-label={week
                  .map(
                    (d) =>
                      `${d.label}: ${d.arrivals} arrivals, ${d.stays} recorded check-ins`,
                  )
                  .join(". ")}
              >
                <div className="ad-chart-scale">
                  <span>{max}</span>
                  <span>{Math.round(max / 2)}</span>
                  <span>0</span>
                </div>
                <div className="ad-chart-columns">
                  {week.map((d) => (
                    <div className="ad-chart-column" key={d.day}>
                      <div className="ad-chart-bars">
                        <i
                          style={{
                            height: `${Math.max(1, (d.arrivals / max) * 100)}%`,
                          }}
                        />
                        <i
                          style={{
                            height: `${Math.max(1, (d.stays / max) * 100)}%`,
                          }}
                        />
                      </div>
                      <span>{d.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="ad-chart-legend">
                <span>
                  <i />
                  Scheduled arrivals
                </span>
                <span>
                  <i />
                  Recorded check-ins
                </span>
              </div>
            </Card>
            <Card title="Needs your attention">
              <div className="ad-attention">
                {[
                  [
                    CalendarDays,
                    pending.length,
                    "bookings awaiting confirmation",
                    "Confirm bookings",
                    "bookings?status=Pending",
                  ],
                  [
                    Image,
                    missing.length,
                    "rooms missing photos",
                    "Add photos",
                    "images",
                  ],
                  [
                    Wrench,
                    maintenance.length,
                    "rooms under maintenance",
                    "View rooms",
                    "rooms?state=maintenance",
                  ],
                ].map(([Icon, count, text, label, path], i) => {
                  const RowIcon = Icon as typeof Image;
                  const [p, q] = String(path).split("?");
                  return (
                    <Link key={i} to={to(p) + (q ? "&" + q : "")}>
                      <span className="ad-attention-icon">
                        <RowIcon size={22} />
                      </span>
                      <span>
                        <strong>{String(count)}</strong> {String(text)}
                      </span>
                      <span className="ad-text">
                        {String(label)} <ArrowRight size={14} />
                      </span>
                    </Link>
                  );
                })}
              </div>
            </Card>
          </div>
          <Card>
            <div className="ad-card-heading">
              <h2>
                {day === today(branch.timeZoneId)
                  ? "Today’s arrivals"
                  : "Scheduled arrivals"}
              </h2>
              <Link className="ad-btn gold" to={to("bookings")}>
                View bookings <ArrowRight size={16} />
              </Link>
            </div>
            <BookingTable bookings={arrivals.slice(0, 5)} />
          </Card>
          <p className="ad-fine">
            Availability reflects physical room assignments. Legacy bookings
            without assigned rooms may further reduce sellable capacity.
          </p>
        </>
      )}
    </>
  );
}
const todayOf = (value: string, zone: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value.endsWith("Z") ? value : value + "Z"));

export function Bookings() {
  const { branch } = useAdmin();
  const [params] = useSearchParams();
  const data = useData(
    () => (branch ? adminApi.bookings(branch.id) : Promise.resolve([])),
    [branch?.id],
  );
  const [status, setStatus] = useState(params.get("status") || "all");
  const [search, setSearch] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [arrivals, setArrivals] = useState(false);
  const rows = (data.data || []).filter(
    (b) =>
      (status === "all" || b.status === status) &&
      matches(
        `${b.guestName} ${b.guestEmail} IG-${b.id} ${b.assignments.map((a) => a.number).join(" ")}`,
        search,
      ) &&
      (!start || b.checkOut > start) &&
      (!end || b.checkIn <= end) &&
      (!arrivals || b.checkIn === today(branch?.timeZoneId)),
  );
  const paged = usePagination(
    rows,
    [status, search, start, end, arrivals].join(),
  );
  function exportBookings() {
    const escape = (v: unknown) =>
      '"' +
      String(v ?? "")
        .replace(/^[=+@-]/, "'$&")
        .replace(/"/g, '""') +
      '"';
    const csv = [
      [
        "Reference",
        "Guest",
        "Email",
        "Rooms",
        "Check-in",
        "Check-out",
        "Guests",
        "Total",
        "Currency",
        "Status",
      ],
      ...rows.map((b) => [
        "IG-" + b.id,
        b.guestName,
        b.guestEmail,
        b.assignments.map((a) => a.number).join(" / "),
        b.checkIn,
        b.checkOut,
        b.guests,
        b.totalPrice,
        b.currencyCode,
        b.status,
      ]),
    ]
      .map((r) => r.map(escape).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "iges-bookings-" + today(branch?.timeZoneId) + ".csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <>
      <PageTitle title="Bookings" description="Keep every stay organised.">
        <button
          className="ad-btn"
          onClick={exportBookings}
          disabled={!rows.length}
        >
          <ArrowDownToLine size={17} />
          Export CSV
        </button>
        <button
          className={"ad-btn " + (arrivals ? "green" : "gold")}
          onClick={() => setArrivals(!arrivals)}
        >
          <CalendarDays size={18} />
          {arrivals ? "Show all dates" : "View today’s arrivals"}
        </button>
      </PageTitle>
      <Tabs
        value={status}
        onChange={setStatus}
        items={["all", "Pending", "Confirmed", "Cancelled"].map((s) => ({
          value: s,
          label: s === "all" ? "All bookings" : s,
          count: (data.data || []).filter((b) => s === "all" || b.status === s)
            .length,
        }))}
      />
      <div className="ad-filterbar">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Search guest, room or reference"
        />
        <Field label="Stay from">
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
          />
        </Field>
        <Field label="Stay through">
          <input
            type="date"
            min={start}
            value={end}
            onChange={(e) => setEnd(e.target.value)}
          />
        </Field>
      </div>
      <ErrorBox error={data.error} retry={data.retry} />
      {data.loading ? (
        <Loading />
      ) : (
        !data.error && (
          <>
            <BookingTable bookings={paged.rows} />
            {paged.controls}
          </>
        )
      )}
    </>
  );
}

export function BookingDetails() {
  const { id } = useParams();
  const { branch, to } = useAdmin();
  const action = useAction();
  const data = useData<[AdminBooking[], AdminRoom[]]>(
    () =>
      branch
        ? Promise.all([adminApi.bookings(branch.id), adminApi.rooms(branch.id)])
        : Promise.resolve([[], []]),
    [branch?.id, id],
  );
  const b = data.data?.[0].find((b) => b.id === Number(id));
  const [confirm, setConfirm] = useState<"cancel" | "check-in" | "check-out">();
  const [counts, setCounts] = useState<Record<number, number>>({});
  if (data.loading) return <Loading />;
  if (data.error) return <ErrorBox error={data.error} retry={data.retry} />;
  if (!b || !branch)
    return (
      <EmptyState title="Reservation not found">
        <Link className="ad-btn" to={to("bookings")}>
          Back to bookings
        </Link>
      </EmptyState>
    );
  const nights = Math.round(
    (Date.parse(b.checkOut) - Date.parse(b.checkIn)) / 86400000,
  );
  const active = inHouse(b);
  const completed = !!b.actualCheckOutAt;
  const canChange = !active && !completed && b.status !== "Cancelled";
  const canCheckIn =
    canChange &&
    b.status === "Confirmed" &&
    today(branch.timeZoneId) >= b.checkIn &&
    today(branch.timeZoneId) < b.checkOut &&
    b.assignments.length === b.rooms;
  const run = (fn: () => Promise<unknown>, message: string) =>
    action.run(async () => {
      await fn();
      data.retry();
    }, message);
  function startCheckIn() {
    let remaining = b!.guests;
    const initial: Record<number, number> = {};
    b!.assignments.forEach((a) => {
      const count = Math.min(a.maxGuests, Math.max(0, remaining));
      initial[a.roomId] = count;
      remaining -= count;
    });
    setCounts(initial);
    setConfirm("check-in");
  }
  return (
    <>
      <PageTitle
        title={"Reservation IG-" + b.id}
        description="A little care in every detail."
      >
        <Link className="ad-btn" to={to("bookings")}>
          ← Back to bookings
        </Link>
        {b.status === "Pending" && canChange && (
          <button
            className="ad-btn gold"
            disabled={action.busy}
            onClick={() =>
              run(() => adminApi.confirm(branch.id, b.id), "Booking confirmed.")
            }
          >
            <Check size={18} />
            Confirm booking
          </button>
        )}
        {canCheckIn && (
          <button className="ad-btn gold" onClick={startCheckIn}>
            Check in guest
          </button>
        )}
        {active && (
          <button
            className="ad-btn gold"
            onClick={() => setConfirm("check-out")}
          >
            Record checkout
          </button>
        )}
      </PageTitle>
      {action.feedback}
      <div className="ad-status-line">
        <BookingStatus status={b.status} />
        {active && <Badge tone="green">Checked in</Badge>}
        {completed && <Badge>Checked out</Badge>}
      </div>
      <div className="ad-columns">
        <div className="ad-stack">
          <Card title="Stay details">
            <dl className="ad-details">
              <dt>Check-in</dt>
              <dd>{date(b.checkIn, branch.timeZoneId)}</dd>
              <dt>Check-out</dt>
              <dd>{date(b.checkOut, branch.timeZoneId)}</dd>
              <dt>Length of stay</dt>
              <dd>
                {nights} night{nights !== 1 && "s"}
              </dd>
              <dt>Guests</dt>
              <dd>
                {b.guests} in {b.rooms} room{b.rooms !== 1 && "s"}
              </dd>
              <dt>Branch</dt>
              <dd>{branch.name}</dd>
            </dl>
          </Card>
          <Card title="Reserved rooms">
            {b.assignments.length === 0 ? (
              <p>
                This legacy reservation has no physical room assignments. Guest
                self-service must assign rooms before check-in.
              </p>
            ) : (
              b.assignments.map((a) => {
                const r = data.data?.[1].find((r) => r.id === a.roomId);
                return (
                  <div className="ad-reserved-room" key={a.roomId}>
                    <Photo src={r?.photos[0]?.url} alt={"Room " + a.number} />
                    <div>
                      <h3>Room {a.number}</h3>
                      <p>
                        {a.category.toUpperCase()} · {a.bedType}
                        <br />
                        {a.guests != null
                          ? a.guests + " guests in this room"
                          : "Up to " + a.maxGuests + " guests"}
                      </p>
                      <small>Booked nightly rate</small>
                      <strong>{money(a.nightlyRate, b.currencyCode)}</strong>
                    </div>
                  </div>
                );
              })
            )}
          </Card>
          <Card title="Guest">
            <div className="ad-person">
              <span className="ad-avatar">{(b.guestName || "G")[0]}</span>
              <div>
                <strong>{b.guestName || "Guest"}</strong>
                <small>{b.guestEmail || "No email on record"}</small>
              </div>
            </div>
          </Card>
        </div>
        <div className="ad-stack">
          <Card title="Booking total">
            <p>
              {nights} nights · {b.rooms} room{b.rooms !== 1 && "s"}
            </p>
            <div className="ad-total">
              <span>Total</span>
              <strong>{money(b.totalPrice, b.currencyCode)}</strong>
            </div>
            <p className="ad-fine">
              Reservation amount. Payment collection and refunds are managed
              separately.
            </p>
          </Card>
          <Card title="Booking history">
            <div className="ad-timeline">
              <p>
                <i />
                <strong>Reservation received</strong>
                <small>{date(b.createAt, branch.timeZoneId, true)}</small>
              </p>
              <p>
                <i />
                <strong>
                  {b.status === "Pending" ? "Awaiting confirmation" : b.status}
                </strong>
                {b.updateAt && (
                  <small>
                    Last updated {date(b.updateAt, branch.timeZoneId, true)}
                  </small>
                )}
              </p>
              {b.actualCheckInAt && (
                <p>
                  <i />
                  <strong>Guest checked in</strong>
                  <small>
                    {date(b.actualCheckInAt, branch.timeZoneId, true)}
                  </small>
                </p>
              )}
              {b.actualCheckOutAt && (
                <p>
                  <i />
                  <strong>Guest checked out</strong>
                  <small>
                    {date(b.actualCheckOutAt, branch.timeZoneId, true)}
                  </small>
                </p>
              )}
            </div>
          </Card>
          {canChange && (
            <button
              className="ad-btn danger full"
              disabled={action.busy}
              onClick={() => setConfirm("cancel")}
            >
              Cancel booking
            </button>
          )}
        </div>
      </div>
      {confirm && (
        <Modal
          title={
            confirm === "cancel"
              ? "Cancel this reservation?"
              : confirm === "check-in"
                ? "Check in this guest"
                : "Record guest checkout?"
          }
          onClose={() => !action.busy && setConfirm(undefined)}
        >
          <div className="admin-app ad-modal-content">
            {confirm === "cancel" ? (
              <p>
                IG-{b.id} will be cancelled and its reserved rooms released.
                This action does not process a refund.
              </p>
            ) : confirm === "check-out" ? (
              <p>
                Record the actual departure time for {b.guestName}. This stay
                will leave the in-house guest list.
              </p>
            ) : (
              <>
                <p>
                  Confirm the number of guests in each reserved room. The total
                  must equal {b.guests}.
                </p>
                {b.assignments.map((a) => (
                  <Field
                    label={"Room " + a.number + " · capacity " + a.maxGuests}
                    key={a.roomId}
                  >
                    <input
                      type="number"
                      min={0}
                      max={a.maxGuests}
                      value={counts[a.roomId] ?? 0}
                      onChange={(e) =>
                        setCounts({
                          ...counts,
                          [a.roomId]: Number(e.target.value),
                        })
                      }
                    />
                  </Field>
                ))}
                <p>
                  Assigned: {Object.values(counts).reduce((a, n) => a + n, 0)}{" "}
                  of {b.guests}
                </p>
              </>
            )}
            {action.feedback}
            <div className="ad-actions">
              <button
                className="ad-btn"
                disabled={action.busy}
                onClick={() => setConfirm(undefined)}
              >
                Keep reservation
              </button>
              <button
                className={
                  "ad-btn " + (confirm === "cancel" ? "danger" : "gold")
                }
                disabled={
                  action.busy ||
                  (confirm === "check-in" &&
                    (Object.values(counts).reduce((a, n) => a + n, 0) !==
                      b.guests ||
                      b.assignments.some(
                        (a) =>
                          !Number.isInteger(counts[a.roomId]) ||
                          counts[a.roomId] < 0 ||
                          counts[a.roomId] > a.maxGuests,
                      )))
                }
                onClick={async () => {
                  const ok = await run(
                    () =>
                      confirm === "cancel"
                        ? adminApi.cancel(branch.id, b.id)
                        : confirm === "check-out"
                          ? adminApi.checkOut(branch.id, b.id)
                          : adminApi.checkIn(
                              branch.id,
                              b.id,
                              b.assignments.map((a) => ({
                                roomId: a.roomId,
                                guests: counts[a.roomId],
                              })),
                            ),
                    confirm === "cancel"
                      ? "Booking cancelled."
                      : confirm === "check-in"
                        ? "Guest checked in."
                        : "Checkout recorded.",
                  );
                  if (ok) setConfirm(undefined);
                }}
              >
                {action.busy
                  ? "Saving…"
                  : confirm === "cancel"
                    ? "Cancel reservation"
                    : confirm === "check-in"
                      ? "Confirm check-in"
                      : "Confirm checkout"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

export function Guests() {
  const { branch, to } = useAdmin();
  const data = useData(
    () => (branch ? adminApi.bookings(branch.id) : Promise.resolve([])),
    [branch?.id],
  );
  const [search, setSearch] = useState("");
  const [floor, setFloor] = useState("");
  const [checkout, setCheckout] = useState("");
  const stays = (data.data || []).filter(inHouse);
  const rows = stays
    .flatMap((b) => b.assignments.map((a) => ({ booking: b, assignment: a })))
    .filter(
      ({ booking: b, assignment: a }) =>
        matches(
          `${b.guestName} ${b.guestEmail} IG-${b.id} ${a.number}`,
          search,
        ) &&
        (!floor ||
          (a.number < 201
            ? "1"
            : a.number < 301
              ? "2"
              : a.number < 401
                ? "3"
                : "4") === floor) &&
        (!checkout || b.checkOut === checkout),
    );
  const paged = usePagination(rows, [search, floor, checkout].join());
  return (
    <>
      <PageTitle
        title="Guests"
        description="Currently checked in at the hotel."
      >
        <Badge tone="gold">In-house only</Badge>
        <Link className="ad-btn" to={to("bookings")}>
          View all bookings <ArrowRight size={16} />
        </Link>
      </PageTitle>
      <div className="ad-stats three">
        {[
          ["In-house guests", stays.reduce((s, b) => s + b.guests, 0), Users],
          [
            "Occupied rooms",
            stays.reduce((s, b) => s + b.assignments.length, 0),
            BedDouble,
          ],
          [
            "Checking out today",
            stays.filter((b) => b.checkOut === today(branch?.timeZoneId))
              .length,
            CalendarDays,
          ],
        ].map(([label, value, Icon], i) => {
          const StatIcon = Icon as typeof Users;
          return (
            <Card key={i}>
              <div className="ad-stat-icon">
                <StatIcon size={28} />
              </div>
              <div>
                <span>{String(label)}</span>
                <strong>{String(value)}</strong>
              </div>
            </Card>
          );
        })}
      </div>
      <div className="ad-filterbar">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Search guest, room or booking"
        />
        <label className="ad-field">
          <span className="sr-only">Floor</span>
          <select value={floor} onChange={(e) => setFloor(e.target.value)}>
            <option value="">All floors</option>
            {[1, 2, 3, 4].map((f) => (
              <option key={f} value={f}>
                Floor {f}
              </option>
            ))}
          </select>
        </label>
        <Field label="Expected checkout">
          <input
            type="date"
            value={checkout}
            onChange={(e) => setCheckout(e.target.value)}
          />
        </Field>
      </div>
      <ErrorBox error={data.error} retry={data.retry} />
      {data.loading ? (
        <Loading />
      ) : (
        !data.error && (
          <Card title="Current stays">
            <div className="ad-table-wrap">
              <table className="ad-table">
                <thead>
                  <tr>
                    <th>Booking guest</th>
                    <th>Booking</th>
                    <th>Room</th>
                    <th>Guests in room</th>
                    <th>Checked in</th>
                    <th>Expected checkout</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.rows.map(({ booking: b, assignment: a }) => (
                    <tr key={b.id + ":" + a.roomId}>
                      <td>
                        <strong>{b.guestName || "Guest"}</strong>
                        <Badge tone="green">Checked in</Badge>
                        {Date.parse(
                          b.expectedCheckoutAt +
                            (/Z$/.test(b.expectedCheckoutAt) ? "" : "Z"),
                        ) < Date.now() && (
                          <Badge tone="red">Checkout overdue</Badge>
                        )}
                      </td>
                      <td>IG-{b.id}</td>
                      <td>
                        {a.number} · {a.bedType}
                      </td>
                      <td>{a.guests ?? "Unrecorded"}</td>
                      <td>
                        {date(b.actualCheckInAt!, branch?.timeZoneId, true)}
                      </td>
                      <td>
                        {date(b.expectedCheckoutAt, branch?.timeZoneId, true)}
                      </td>
                      <td>
                        <Link className="ad-text" to={to("bookings/" + b.id)}>
                          View stay →
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!rows.length && (
                <EmptyState title="No current stays">
                  <p>
                    Confirmed reservations appear here after you record their
                    check-in.
                  </p>
                </EmptyState>
              )}
            </div>
            {paged.controls}
          </Card>
        )
      )}
    </>
  );
}
