import { useEffect, useRef, useState } from "react";
import { api, ApiError, DEMO } from "../api";
import { useHotel } from "../context";
import { useImagery, useRooms } from "../hooks";
import {
  dateLabel,
  matches,
  money,
  nights,
  sameBooking,
  storageSet,
  validateStay,
} from "../stay";
import type { Booking, BookingInput, Room } from "../types";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Empty,
  ErrorBox,
  Gallery,
  Hero,
  Link,
  Loading,
  Modal,
  Photo,
  RoomSpecs,
  StaySearch,
  StaySummary,
  Steps,
  useGo,
} from "../components";
interface Attempt {
  userId: string;
  input: BookingInput;
  baseline: number[];
  started: number;
}
export function BookingPage() {
  const { stay, setStay, branch, auth, notify, catalogError, reload, website } =
    useHotel();
  const rooms = useRooms(stay, true);
  const photos = useImagery();
  const go = useGo();
  const [stage, setStage] = useState<"choose" | "review">("choose");
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [dialog, setDialog] = useState<
    "account" | "submit" | "conflict" | "price" | undefined
  >();
  const [inspect, setInspect] = useState<Room>();
  const [attempt, setAttempt] = useState<Attempt | null>(() => {
    try {
      const a = JSON.parse(sessionStorage.getItem("iges.attempt") || "null");
      return a?.userId === auth?.id ? a : null;
    } catch {
      return null;
    }
  });
  const [reconciled, setReconciled] = useState(false);
  const [reconcileMessage, setReconcileMessage] = useState("");
  const [reviewRooms, setReviewRooms] = useState<Room[]>([]);
  const selected = (stage === "review" ? reviewRooms : rooms.data || []).filter(
    (r) => stay.roomIds.includes(r.id),
  );
  const total =
    selected.reduce((n, r) => n + r.perNightRate, 0) *
    nights(stay.checkIn, stay.checkOut);
  const capacity = selected.reduce((n, r) => n + r.maxGuests, 0);
  useEffect(() => {
    setStage("choose");
    setReviewRooms([]);
    setError(undefined);
  }, [stay.branchId, stay.checkIn, stay.checkOut, stay.guests, stay.category]);
  useEffect(() => {
    if (
      rooms.loading ||
      !rooms.data ||
      rooms.error ||
      !stay.roomIds.length ||
      attempt
    )
      return;
    const missing = stay.roomIds.some(
      (id) => !rooms.data!.some((r) => r.id === id),
    );
    if (missing) {
      setStay({
        ...stay,
        roomIds: stay.roomIds.filter((id) =>
          rooms.data!.some((r) => r.id === id),
        ),
      });
      setDialog("conflict");
    }
  }, [rooms.data, rooms.loading]);
  useEffect(() => {
    if (attempt && auth?.id === attempt.userId) void reconcile(attempt);
  }, [auth?.id]);
  function select(room: Room) {
    setStay({
      ...stay,
      roomIds: stay.roomIds.includes(room.id)
        ? stay.roomIds.filter((id) => id !== room.id)
        : [...stay.roomIds, room.id],
    });
    setStage("choose");
    setError(undefined);
  }
  function selectionErrors() {
    const errors = validateStay(stay, branch);
    if (!selected.length) errors.push("Select at least one physical room.");
    if (selected.length > 100) errors.push("Select no more than 100 rooms.");
    if (capacity < stay.guests)
      errors.push(
        "Select enough rooms to accommodate all " + stay.guests + " guests.",
      );
    if (new Set(stay.roomIds).size !== stay.roomIds.length)
      errors.push("Each selected room must be distinct.");
    if (
      selected.some(
        (r) =>
          r.hotelId !== stay.branchId ||
          r.category.toLowerCase() === "platinum",
      )
    )
      errors.push("Choose rooms in this branch from an online category.");
    return errors;
  }
  async function revalidate(): Promise<Room[]> {
    return Promise.all(stay.roomIds.map((id) => api.room(stay, id)));
  }
  async function review() {
    const errors = selectionErrors();
    if (errors.length) {
      setError(new ApiError(400, errors.join(" ")));
      return;
    }
    if (!auth) {
      setDialog("account");
      return;
    }
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(undefined);
    try {
      const current = await revalidate();
      if (
        current.some(
          (r) =>
            r.hotelId !== stay.branchId ||
            r.category.toLowerCase() === "platinum",
        ) ||
        current.reduce((n, r) => n + r.maxGuests, 0) < stay.guests
      )
        throw new ApiError(
          409,
          "The selected rooms no longer meet this stay’s requirements.",
        );
      const changed = current.some(
        (r) =>
          r.perNightRate !== selected.find((s) => s.id === r.id)?.perNightRate,
      );
      setReviewRooms(current);
      setStage("review");
      if (changed) setDialog("price");
      window.scrollTo({ top: 250, behavior: "smooth" });
    } catch (e) {
      setError(e);
      if (e instanceof ApiError && (e.status === 404 || e.status === 409)) {
        rooms.retry();
        setDialog("conflict");
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  function saveAttempt(a: Attempt | null) {
    setAttempt(a);
    storageSet("iges.attempt", a ? JSON.stringify(a) : null);
  }
  async function reconcile(a = attempt) {
    if (!a || auth?.id !== a.userId) return;
    setBusy(true);
    setError(undefined);
    try {
      const bookings = await api.bookings(a.input.hotelId);
      const matches = bookings.filter(
        (b) => !a.baseline.includes(b.id) && sameBooking(b, a.input),
      );
      setReconciled(true);
      if (matches.length === 1) {
        saveAttempt(null);
        notify("Your reservation was found in your account.");
        go(
          `/booking/confirmation/${matches[0].hotelId}/${matches[0].id}`,
          true,
        );
      } else
        setReconcileMessage(
          matches.length > 1
            ? "More than one matching reservation was found. Please inspect My Bookings and contact management before submitting again."
            : "No new matching reservation is visible yet. The previous request may still be processing. Recheck your bookings or contact management before making another reservation.",
        );
    } catch (e) {
      setError(e);
      setReconciled(false);
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    if (busyRef.current || attempt || !auth) return;
    busyRef.current = true;
    setBusy(true);
    setError(undefined);
    setDialog(undefined);
    let mutationStarted = false;
    let currentAttempt: Attempt | null = null;
    try {
      const current = await revalidate();
      if (
        current.some(
          (r) =>
            r.hotelId !== stay.branchId ||
            r.category.toLowerCase() === "platinum",
        ) ||
        current.reduce((n, r) => n + r.maxGuests, 0) < stay.guests
      )
        throw new ApiError(
          409,
          "Your room selection no longer meets the booking requirements.",
        );
      if (
        current.some(
          (r) =>
            r.perNightRate !==
            reviewRooms.find((s) => s.id === r.id)?.perNightRate,
        )
      ) {
        setReviewRooms(current);
        setDialog("price");
        return;
      }
      const input: BookingInput = {
        hotelId: stay.branchId,
        checkIn: stay.checkIn,
        checkOut: stay.checkOut,
        guests: stay.guests,
        rooms: stay.roomIds.length,
        roomIds: [...stay.roomIds],
      };
      const baseline = await api.bookings(input.hotelId);
      currentAttempt = {
        userId: auth.id,
        input,
        baseline: baseline.map((b) => b.id),
        started: Date.now(),
      };
      saveAttempt(currentAttempt);
      mutationStarted = true;
      const result = await api.create(input);
      saveAttempt(null);
      setStay({ ...stay, roomIds: [] });
      notify("Your reservation has been received. Check its status below.");
      go(`/booking/confirmation/${result.hotelId}/${result.id}`, true);
    } catch (e) {
      setError(e);
      const uncertain =
        mutationStarted &&
        (!(e instanceof ApiError) || e.status === 0 || e.status >= 500);
      if (uncertain && currentAttempt) {
        await reconcile(currentAttempt);
      } else {
        saveAttempt(null);
        if (e instanceof ApiError && (e.status === 404 || e.status === 409)) {
          setStage("choose");
          rooms.retry();
          setDialog("conflict");
        }
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }
  return (
    <>
      <Hero
        eyebrow="BOOK YOUR STAY"
        title={
          <>
            A stay worth
            <br />
            <em>looking forward to.</em>
          </>
        }
        description="Choose your dates. Find your room. Make it yours."
        image={
          website?.heroImageUrl ||
          import.meta.env.VITE_HOTEL_HERO_IMAGE ||
          rooms.data?.[0]?.photos[0]?.url ||
          photos.hero
        }
        compact
      />
      <Steps step={stage === "review" ? 3 : 1} />
      <div className="container booking-container">
        <StaySearch
          showCategory
          onSearch={() => {
            setStage("choose");
            rooms.retry();
          }}
        />
        <ErrorBox
          error={catalogError || error || rooms.error}
          retry={catalogError ? reload : rooms.error ? rooms.retry : undefined}
        />
        {attempt && (
          <section className="reconcile-panel" role="status">
            <h2>Let’s check your reservation first.</h2>
            <p>
              The last submission has an uncertain outcome. Another submission
              is blocked to help prevent duplicate reservations.
            </p>
            <p>{reconcileMessage}</p>
            <div className="button-row">
              <button
                className="button"
                disabled={busy}
                onClick={() => reconcile()}
              >
                {busy ? "Checking…" : "Recheck my reservations"}
              </button>
              <Link className="button outline" to="/my-bookings">
                Open My Bookings
              </Link>
              <Link className="text-link" to="/contact">
                Contact management
              </Link>
            </div>
            {reconciled && (
              <p className="fine-print">
                No automatic retry will be made. If management confirms no
                reservation was created, you can clear this attempt.
              </p>
            )}
            {reconciled && (
              <button
                className="text-button"
                onClick={() => setDialog("submit")}
              >
                Management confirmed no booking — clear attempt
              </button>
            )}
          </section>
        )}
        <div className="booking-columns">
          <div>
            {stage === "review" ? (
              <section className="review-panel">
                <div className="eyebrow">ONE LAST LOOK</div>
                <h2>Make sure it feels right.</h2>
                <p>
                  Signed in as {auth?.name}. Review the rooms, dates and
                  estimated charges before submitting your reservation.
                </p>
                {reviewRooms.map((r) => (
                  <div className="review-room" key={r.id}>
                    <Photo src={r.photos[0]?.url} alt={"Room " + r.number} />
                    <div>
                      <h3>
                        Room {r.number}
                        {r.isHoneymoonSuite ? " · Honeymoon suite" : ""}
                      </h3>
                      <RoomSpecs room={r} />
                      <p>{money(r.perNightRate, r.currencyCode)} / night</p>
                    </div>
                  </div>
                ))}
                <div className="info-note">
                  <div>
                    <h3>A reservation, with clarity.</h3>
                    <p>
                      The server will calculate your final total and return the
                      booking status. A Pending reservation is awaiting
                      confirmation. No payment is collected on this website.
                    </p>
                    <Link to="/terms" className="text-link">
                      Review booking &amp; cancellation information{" "}
                      <ArrowUpRight size={14} />
                    </Link>
                  </div>
                </div>
                <button
                  className="button outline"
                  disabled={busy}
                  onClick={() => setStage("choose")}
                >
                  Back to room selection
                </button>
              </section>
            ) : (
              <>
                <div className="section-heading">
                  <div>
                    <div className="eyebrow">FIND YOUR PERFECT FIT</div>
                    <h2>Available rooms.</h2>
                  </div>
                  <span className="muted">
                    {rooms.data?.filter((r) => matches(r, stay.category))
                      .length || 0}{" "}
                    physical rooms
                  </span>
                </div>
                <p className="fine-print">
                  {dateLabel(stay.checkIn)} — {dateLabel(stay.checkOut)} ·{" "}
                  {stay.guests} guests · Select multiple rooms when needed. Room
                  capacities add together.
                </p>
                {rooms.loading ? (
                  <Loading cards={2} />
                ) : (
                  <div className="available-rooms">
                    {rooms.data
                      ?.filter((r) => matches(r, stay.category))
                      .map((room) => (
                        <article
                          key={room.id}
                          className={
                            "available-room " +
                            (stay.roomIds.includes(room.id)
                              ? "is-selected"
                              : "")
                          }
                        >
                          <button
                            className="available-photo"
                            aria-label={"Inspect room " + room.number}
                            onClick={async () => {
                              try {
                                setInspect(await api.room(stay, room.id));
                              } catch (e) {
                                setError(e);
                                if (e instanceof ApiError && e.status === 404) {
                                  rooms.retry();
                                  setDialog("conflict");
                                }
                              }
                            }}
                          >
                            <Photo
                              src={
                                room.photos.find((p) => p.kind === "Room")?.url
                              }
                              alt={
                                room.isTwinRoom
                                  ? "Room " +
                                    room.number +
                                    " with two separate beds"
                                  : "Room " + room.number
                              }
                            />
                            <span>View room &amp; bathroom ↗</span>
                          </button>
                          <div className="available-body">
                            <div className="eyebrow">
                              {room.category.toUpperCase()}
                              {room.isHoneymoonSuite
                                ? " · HONEYMOON SUITE"
                                : ""}
                            </div>
                            <h3>Room {room.number}</h3>
                            <RoomSpecs room={room} />
                            <p>{room.description}</p>
                            <div className="available-bottom">
                              <span className="rate">
                                <strong>
                                  {money(room.perNightRate, room.currencyCode)}
                                </strong>
                                <small>
                                  / night{DEMO ? " · illustrative" : ""}
                                </small>
                              </span>
                              <button
                                aria-pressed={stay.roomIds.includes(room.id)}
                                className={
                                  "button " +
                                  (stay.roomIds.includes(room.id)
                                    ? ""
                                    : "outline")
                                }
                                disabled={!!attempt || busy}
                                onClick={() => select(room)}
                              >
                                {stay.roomIds.includes(room.id) ? (
                                  <>
                                    Selected <Check size={15} />
                                  </>
                                ) : (
                                  "Select room"
                                )}
                              </button>
                            </div>
                          </div>
                        </article>
                      ))}
                  </div>
                )}
                {!rooms.loading && !rooms.error && !rooms.data?.length && (
                  <Empty title="A different date might be the one.">
                    <p>
                      No published rooms are available for this search. Try
                      other dates, another category or a different branch.
                    </p>
                    <Link className="text-link" to="/rooms">
                      Explore all categories <ArrowRight size={15} />
                    </Link>
                  </Empty>
                )}
              </>
            )}
            {!auth && stay.roomIds.length > 0 && (
              <section className="guest-prompt">
                <h3>Have you booked with us before?</h3>
                <p>Your selected stay will follow you through sign-in.</p>
                <div className="button-row">
                  <Link className="button" to="/login?returnTo=%2Fbooking">
                    Yes, sign in
                  </Link>
                  <Link
                    className="button outline"
                    to="/register?returnTo=%2Fbooking"
                  >
                    First time? Create account
                  </Link>
                </div>
              </section>
            )}
          </div>
          <StaySummary
            rooms={stage === "review" ? reviewRooms : rooms.data || []}
          >
            <button
              className="button gold w-full"
              disabled={
                busy ||
                !!attempt ||
                !selected.length ||
                capacity < stay.guests ||
                DEMO ||
                rooms.loading
              }
              onClick={stage === "review" ? () => setDialog("submit") : review}
            >
              {busy
                ? "Checking your stay…"
                : stage === "review"
                  ? "Submit reservation"
                  : "Continue to review"}
              <ArrowRight size={16} />
            </button>
            {selected.length > 0 && capacity < stay.guests && (
              <p className="field-error">
                Select more rooms for {stay.guests} guests. Current capacity:{" "}
                {capacity}.
              </p>
            )}
            {DEMO && (
              <p className="fine-print">
                Switch to the live site to sign in and reserve.
              </p>
            )}
          </StaySummary>
        </div>
      </div>
      {dialog === "account" && (
        <Modal
          title="Have you booked with us before?"
          onClose={() => setDialog(undefined)}
        >
          <p>
            Sign in or create an account to review your selected stay. Your
            dates, branch, guests and rooms will be kept.
          </p>
          <div className="button-row">
            <Link className="button" to="/login?returnTo=%2Fbooking">
              Yes, sign in
            </Link>
            <Link className="button outline" to="/register?returnTo=%2Fbooking">
              First time? Create account
            </Link>
          </div>
        </Modal>
      )}
      {dialog === "submit" && (
        <Modal
          title={
            attempt
              ? "Clear the uncertain attempt?"
              : "Ready to request your stay?"
          }
          onClose={() => setDialog(undefined)}
        >
          {attempt ? (
            <>
              <p>
                Only clear this after checking your account and confirming with
                management that no reservation was created. Clearing this record
                does not cancel any server reservation.
              </p>
              <button
                className="button"
                onClick={() => {
                  saveAttempt(null);
                  setReconciled(false);
                  setDialog(undefined);
                  rooms.retry();
                }}
              >
                I have checked — clear attempt
              </button>
            </>
          ) : (
            <>
              <p>
                {branch?.name}
                <br />
                {dateLabel(stay.checkIn)} — {dateLabel(stay.checkOut)}
                <br />
                {stay.guests} guests · Rooms{" "}
                {stay.roomIds
                  .map((id) => selected.find((r) => r.id === id)?.number)
                  .join(", ")}
              </p>
              <h3>Estimated total: {money(total, branch?.currencyCode)}</h3>
              <p>
                Your final total and status will come from the hotel service. No
                payment will be taken here.
              </p>
              <div className="button-row">
                <button
                  className="button outline"
                  onClick={() => setDialog(undefined)}
                >
                  Keep reviewing
                </button>
                <button
                  className="button gold"
                  disabled={busy}
                  onClick={submit}
                >
                  Submit reservation <ArrowRight size={16} />
                </button>
              </div>
            </>
          )}
        </Modal>
      )}
      {dialog === "conflict" && (
        <Modal
          title="Let’s find another space."
          onClose={() => setDialog(undefined)}
        >
          <p>
            A selected room may no longer be available for your dates. The
            current room list has been refreshed. Please choose an alternative
            room, another category or different dates.
          </p>
          <button
            className="button"
            onClick={() => {
              setDialog(undefined);
              setStage("choose");
              rooms.retry();
            }}
          >
            Explore alternatives <ArrowRight size={16} />
          </button>
        </Modal>
      )}
      {dialog === "price" && (
        <Modal
          title="Your room rate has changed."
          onClose={() => setDialog(undefined)}
        >
          <p>
            The latest published rates have been loaded. Please review the
            updated estimate before continuing. No reservation has been
            submitted.
          </p>
          <button className="button" onClick={() => setDialog(undefined)}>
            Review updated charges
          </button>
        </Modal>
      )}
      {inspect && (
        <Modal
          title={
            "Room " +
            inspect.number +
            (inspect.isHoneymoonSuite ? " · Honeymoon suite" : "")
          }
          onClose={() => setInspect(undefined)}
        >
          <Gallery room={inspect} />
          <p>{inspect.description}</p>
          <RoomSpecs room={inspect} />
          <p>{inspect.amenities}</p>
          <p>{money(inspect.perNightRate, inspect.currencyCode)} / night</p>
        </Modal>
      )}
    </>
  );
}
