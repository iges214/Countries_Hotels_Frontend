import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Link as RouterLink,
  NavLink,
  useLocation,
  useNavigate,
  type LinkProps,
} from "react-router-dom";
import {
  ArrowRight,
  ArrowUpRight,
  BedDouble,
  CalendarDays,
  Check,
  ChevronDown,
  MapPin,
  Menu,
  MoveUpRight,
  Users,
  X,
  AlertCircle,
  RefreshCw,
  Maximize,
  Wifi,
  ShieldCheck,
  UtensilsCrossed,
  Mail,
  Phone,
  Camera,
} from "lucide-react";
import { ApiError, DEMO, mediaUrl } from "./api";
import { useHotel } from "./context";
import { HeroCarousel, type HeroSlide } from "./HeroCarousel";
import {
  addDays,
  categories,
  dateLabel,
  money,
  nights,
  today,
  validateStay,
} from "./stay";
import type { Room, Stay } from "./types";
export {
  ArrowRight,
  ArrowUpRight,
  BedDouble,
  CalendarDays,
  Check,
  ChevronDown,
  MapPin,
  Users,
  Maximize,
  Wifi,
  ShieldCheck,
  UtensilsCrossed,
  Mail,
  Phone,
  Camera,
};
export function Link({ to, ...props }: LinkProps) {
  let dest = to;
  if (DEMO && typeof to === "string" && to.startsWith("/"))
    dest = to + (to.includes("?") ? "&" : "?") + "demo=1";
  return <RouterLink to={dest} {...props} />;
}
export function useGo() {
  const navigate = useNavigate();
  return (to: string, replace = false) =>
    navigate(to + (DEMO ? (to.includes("?") ? "&" : "?") + "demo=1" : ""), {
      replace,
    });
}
export function Logo() {
  return (
    <Link to="/" className="brand" aria-label="IGES Hotel and Suites home">
      <svg viewBox="0 0 48 64" aria-hidden="true">
        <path d="M24 3 12 18v35l12 8 12-8V18ZM24 3v58M12 18l12 8 12-8M5 32v20l7 5m31-25v20l-7 5M18 12l6 4 6-4" />
      </svg>
      <span>
        IGES<small>HOTEL &amp; SUITES</small>
      </span>
    </Link>
  );
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const titleId = useId();
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const d = ref.current!;
    d.showModal();
    const onCancel = (e: Event) => {
      e.preventDefault();
      closeRef.current();
    };
    d.addEventListener("cancel", onCancel);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      d.removeEventListener("cancel", onCancel);
      d.close();
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, []);
  return createPortal(
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={titleId}
      onClick={(e) => {
        if (e.target !== e.currentTarget) return;
        const bounds = e.currentTarget.getBoundingClientRect();
        if (e.clientX < bounds.left || e.clientX > bounds.right ||
            e.clientY < bounds.top || e.clientY > bounds.bottom) onClose();
      }}
    >
      <button
        className="icon-button dialog-close"
        aria-label="Close dialog"
        onClick={onClose}
      >
        <X />
      </button>
      <div className="eyebrow">IGES HOTEL &amp; SUITES</div>
      <h2 id={titleId}>{title}</h2>
      {children}
    </dialog>,
    document.body,
  );
}
export function Header() {
  const { stay, setStay, branches, auth, requestSignOut } = useHotel();
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileMenu = useRef<HTMLDivElement>(null);
  const profileButton = useRef<HTMLButtonElement>(null);
  const profileMenuId = useId();
  const [branchChange, setBranchChange] = useState<number>();
  const location = useLocation();
  useEffect(() => {
    setOpen(false);
    setProfileOpen(false);
  }, [location.pathname, auth?.id]);
  useEffect(() => {
    if (!profileOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (!profileMenu.current?.contains(event.target as Node))
        setProfileOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (
        event.key === "Escape" &&
        profileMenu.current?.contains(document.activeElement)
      ) {
        setProfileOpen(false);
        profileButton.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [profileOpen]);
  const change = (id: number) => {
    if (stay.roomIds.length) setBranchChange(id);
    else setStay({ ...stay, branchId: id, roomIds: [] });
  };
  return (
    <>
      <header className="header">
        <div className="nav-wrap">
          <Logo />
          <nav
            className={open ? "nav-links open" : "nav-links"}
            aria-label="Main navigation"
          >
            {[
              ["/", "Home"],
              ["/rooms", "Rooms"],
              ["/kitchen", "Kitchen"],
            ].map(([to, label]) => (
              <NavLink
                key={to}
                end={to === "/"}
                to={DEMO ? to + "?demo=1" : to}
              >
                {label}
              </NavLink>
            ))}
            <Link to="/contact" className="mobile-only">
              Contact
            </Link>
            {auth && (
              <Link to="/my-bookings" className="compact-account-link">
                My bookings
              </Link>
            )}
            <label className="mobile-only mobile-branch">
              Select branch
              <select
                aria-label="Mobile branch"
                value={stay.branchId}
                onChange={(e) => change(Number(e.target.value))}
              >
                {!branches.length && <option value="0">Select a branch</option>}
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          </nav>
          <div className="nav-actions">
            <label className="branch-select">
              <MapPin size={16} />
              <span className="sr-only">Select branch</span>
              <select
                aria-label="Navigation branch"
                value={stay.branchId}
                onChange={(e) => change(Number(e.target.value))}
              >
                {!branches.length && <option value="0">Select branch</option>}
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} />
            </label>
            {auth ? (
              <div className="account-nav">
                <Link to="/my-bookings">My bookings</Link>
                <div className="profile-nav" ref={profileMenu}>
                  <button
                    className="profile-toggle"
                    type="button"
                    ref={profileButton}
                    aria-expanded={profileOpen}
                    aria-controls={profileMenuId}
                    onClick={() => setProfileOpen((visible) => !visible)}
                  >
                    Profile <ChevronDown size={14} aria-hidden="true" />
                  </button>
                  <div
                    className="profile-dropdown"
                    id={profileMenuId}
                    hidden={!profileOpen}
                  >
                    <Link to="/profile" onClick={() => setProfileOpen(false)}>
                      View profile
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        profileButton.current?.focus();
                        requestSignOut();
                      }}
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Link className="sign-in" to="/login">
                <Users size={17} /> Sign in
              </Link>
            )}
            <Link className="button gold nav-book" to="/booking">
              Book a stay <ArrowUpRight size={15} />
            </Link>
            <button
              className="icon-button mobile-toggle"
              onClick={() => setOpen(!open)}
              aria-expanded={open}
              aria-label={open ? "Close navigation" : "Open navigation"}
            >
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </header>
      {branchChange !== undefined && (
        <Modal
          title="Change your branch?"
          onClose={() => setBranchChange(undefined)}
        >
          <p>
            Your dates and guests will be kept. Your selected rooms will be
            cleared because rooms belong to a specific branch.
          </p>
          <div className="button-row">
            <button
              className="button outline"
              onClick={() => setBranchChange(undefined)}
            >
              Keep branch
            </button>
            <button
              className="button"
              onClick={() => {
                setStay({ ...stay, branchId: branchChange, roomIds: [] });
                setBranchChange(undefined);
              }}
            >
              Change branch
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
export function Footer() {
  const { profile } = useHotel();
  return (
    <footer className="footer">
      <div className="container footer-main">
        <div>
          <Logo />
          <p>
            A warmer welcome.
            <br />A stay to remember.
          </p>
        </div>
        <div>
          <h3>Explore IGES</h3>
          <Link to="/">Home</Link>
          <Link to="/rooms">Rooms &amp; suites</Link>
          <Link to="/kitchen">Kitchen &amp; hospitality</Link>
        </div>
        <div>
          <h3>Your stay</h3>
          <Link to="/booking">Plan your stay</Link>
          <Link to="/my-bookings">My bookings</Link>
          <Link to="/contact">Contact management</Link>
        </div>
        <div>
          <h3>Find your way here</h3>
          <p className="inline">
            <MapPin size={17} />
            {profile?.city || "Warri"}, {profile?.state || "Delta State"}
            <br />
            {profile?.country || "Nigeria"}
          </p>
          <Link className="footer-contact" to="/contact">
            Get in touch <MoveUpRight size={16} />
          </Link>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>
          © {new Date().getFullYear()} IGES Hotel &amp; Suites. All rights
          reserved.
        </span>
        <div>
          <Link to="/privacy">Privacy policy</Link>
          <Link to="/terms">Terms &amp; booking policies</Link>
          <Link to="/admin">Hotel administration</Link>
        </div>
        <span>A warmer stay, always.</span>
      </div>
    </footer>
  );
}
export function ErrorBox({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  if (!error) return null;
  const e =
    error instanceof ApiError
      ? error
      : new ApiError(500, "Something went wrong. Please try again.");
  return (
    <div role="alert" className="error-box">
      <AlertCircle size={22} />
      <div>
        <strong>
          {e.status === 0
            ? "Connection interrupted"
            : e.status === 503
              ? "Temporarily unavailable"
              : e.status === 429
                ? "Please wait a moment"
                : e.status === 403
                  ? "Access denied"
                  : "We couldn’t complete that request"}
        </strong>
        <p>{e.message}</p>
        {Object.entries(e.errors).length > 0 && (
          <ul>
            {Object.values(e.errors)
              .flat()
              .map((s, i) => (
                <li key={i}>{s}</li>
              ))}
          </ul>
        )}
        {e.retryAfter && <small>Try again after {e.retryAfter} seconds.</small>}
        {e.traceId && <small>Support reference: {e.traceId}</small>}
        {retry && (
          <button className="text-button" onClick={retry}>
            <RefreshCw size={14} /> Try again
          </button>
        )}
      </div>
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <CalendarDays size={32} />
      <h3>{title}</h3>
      {children}
    </div>
  );
}
export function Loading({ cards = 3 }: { cards?: number }) {
  return (
    <div
      className="skeleton-grid"
      role="status"
      aria-label="Loading hotel information"
    >
      {Array.from({ length: cards }, (_, i) => (
        <div className="skeleton" key={i} />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}
export function Photo({
  src,
  alt,
  className = "",
  eager = false,
}: {
  src?: string;
  alt: string;
  className?: string;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const url = mediaUrl(src);
  return url && !failed ? (
    <img
      className={className}
      src={url}
      width="1600"
      height="1000"
      fetchPriority={eager ? "high" : undefined}
      sizes="(max-width: 560px) 100vw, (max-width: 900px) 50vw, 800px"
      srcSet={
        url.startsWith("https://images.unsplash.com/")
          ? [480, 800, 1600]
              .map((w) => url.replace(/w=\d+/, "w=" + w) + " " + w + "w")
              .join(",")
          : undefined
      }
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailed(true)}
    />
  ) : (
    <div
      role="img"
      aria-label={alt + " — photograph not yet available"}
      className={"photo-fallback " + className}
    >
      <BedDouble size={38} />
      <span>Photography to come</span>
    </div>
  );
}
export function Hero({
  eyebrow,
  title,
  description,
  image,
  slides,
  children,
  compact = false,
}: {
  eyebrow: string;
  title: ReactNode;
  description: string;
  image?: string;
  slides?: HeroSlide[];
  children?: ReactNode;
  compact?: boolean;
}) {
  const backdrop = <Photo src={image} alt="Hotel photograph" className="hero-photo" eager />;
  return (
    <section className={"hero " + (compact ? "hero-compact" : "")}>
      {slides?.length ? (
        <HeroCarousel key={JSON.stringify(slides)} slides={slides} fallback={backdrop} />
      ) : backdrop}
      <div className="hero-shade" />
      <div className="container hero-content">
        <div className="eyebrow light">
          {eyebrow}
          <i />
        </div>
        <h1>{title}</h1>
        <p>{description}</p>
        {children}
      </div>
      <div className="hero-note">
        WARRI, DELTA STATE <span>—</span> NIGERIA
      </div>
    </section>
  );
}
export function SectionTitle({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        <div className="eyebrow">
          {eyebrow}
          <i />
        </div>
        <h2>{title}</h2>
      </div>
      {children}
    </div>
  );
}
export function StaySearch({
  onSearch,
  showCategory = false,
  compact = false,
}: {
  onSearch: (s: Stay) => void;
  showCategory?: boolean;
  compact?: boolean;
}) {
  const { stay, setStay, branches, branch } = useHotel();
  const [value, setValue] = useState(stay);
  const [errors, setErrors] = useState<string[]>([]);
  const [pending, setPending] = useState<Stay>();
  useEffect(() => {
    setValue(stay);
  }, [stay]);
  function apply(s: Stay) {
    setStay(s);
    onSearch(s);
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    const next = { ...value, roomIds: [] };
    const errors = validateStay(
      next,
      branches.find((b) => b.id === next.branchId),
    );
    setErrors(errors);
    if (errors.length) return;
    if (stay.roomIds.length && value.branchId !== stay.branchId) {
      setPending(next);
      return;
    }
    apply(next);
  }
  const field = (key: keyof Stay, v: string | number) =>
    setValue({ ...value, [key]: v });
  return (
    <>
      <form
        onSubmit={submit}
        className={"search-panel " + (compact ? "compact" : "")}
        noValidate
      >
        <div className="search-fields">
          <label>
            <MapPin />
            <span>
              Branch
              <select
                value={value.branchId}
                onChange={(e) => field("branchId", Number(e.target.value))}
              >
                {!branches.length && <option value="0">Select a branch</option>}
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </span>
          </label>
          <label>
            <CalendarDays />
            <span>
              Check-in
              <input
                aria-label="Check-in"
                type="date"
                min={today(
                  branches.find((b) => b.id === value.branchId)?.timeZoneId,
                )}
                value={value.checkIn}
                onChange={(e) => field("checkIn", e.target.value)}
                aria-invalid={errors.some((e) => e.includes("check-in"))}
              />
            </span>
          </label>
          <label>
            <CalendarDays />
            <span>
              Check-out
              <input
                aria-label="Check-out"
                type="date"
                min={
                  value.checkIn
                    ? addDays(value.checkIn, 1)
                    : today(branch?.timeZoneId)
                }
                value={value.checkOut}
                onChange={(e) => field("checkOut", e.target.value)}
                aria-invalid={errors.some((e) => e.includes("check-out"))}
              />
            </span>
          </label>
          <label>
            <Users />
            <span>
              Guests
              <select
                value={value.guests}
                onChange={(e) => field("guests", Number(e.target.value))}
              >
                {Array.from({ length: 10 }, (_, i) => (
                  <option key={i} value={i + 1}>
                    {i + 1} {i === 0 ? "guest" : "guests"}
                  </option>
                ))}
              </select>
            </span>
          </label>
          {showCategory && (
            <label>
              <BedDouble />
              <span>
                Category
                <select
                  value={value.category}
                  onChange={(e) => field("category", e.target.value)}
                >
                  <option value="all">All categories</option>
                  {categories.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.short}
                    </option>
                  ))}
                </select>
              </span>
            </label>
          )}
          <button className="button" type="submit">
            Check availability <ArrowRight size={17} />
          </button>
        </div>
        {errors.length > 0 && (
          <div className="field-summary" role="alert">
            <strong>Please review your stay</strong>
            {errors.map((e) => (
              <p key={e}>{e}</p>
            ))}
          </div>
        )}
      </form>
      {pending && (
        <Modal
          title="Change your branch?"
          onClose={() => setPending(undefined)}
        >
          <p>
            Your selected rooms will be cleared. Your dates and guest count will
            be kept.
          </p>
          <div className="button-row">
            <button
              className="button outline"
              onClick={() => setPending(undefined)}
            >
              Keep selection
            </button>
            <button
              className="button"
              onClick={() => {
                apply(pending);
                setPending(undefined);
              }}
            >
              Change branch
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
export function RoomSpecs({ room }: { room: Room }) {
  return (
    <div className="room-specs">
      <span>
        <BedDouble />
        {room.isTwinRoom ? "2 separate beds" : room.bedType + " bed"}
      </span>
      <span>
        <Users />
        {room.maxGuests} guests
      </span>
      <span>
        <Maximize />
        {room.sizeSquareMetres} m²
      </span>
      <span>Floor {room.floor}</span>
    </div>
  );
}
export function CategoryCard({
  category,
  rooms,
  loaded,
}: {
  category: (typeof categories)[number];
  rooms: Room[];
  loaded: boolean;
}) {
  const { stay, setStay } = useHotel();
  const matching = rooms.filter(
    (r) =>
      r.category.toLowerCase() === category.category.toLowerCase() &&
      (category.twin === undefined || r.isTwinRoom === category.twin),
  );
  const room = [...matching].sort((a, b) => a.perNightRate - b.perNightRate)[0];
  const go = useGo();
  const availability = () => {
    setStay({ ...stay, category: category.key, roomIds: [] });
    go("/booking");
  };
  return (
    <article className="category-card">
      <Link to={"/rooms/" + category.key} className="card-photo">
        <Photo
          src={room?.photos.find((p) => p.kind === "Room")?.url}
          alt={
            category.key === "twin"
              ? "Twin room with two separate beds"
              : category.short
          }
        />
        <span className="card-index">
          0{categories.indexOf(category) + 1} /{" "}
          {category.key === "vvip" ? "SUITES" : "ROOMS"}
        </span>
      </Link>
      <div className="card-body">
        <div className="card-top">
          <h3>
            <Link to={"/rooms/" + category.key}>{category.short}</Link>
          </h3>
          {room ? (
            <div className="rate">
              <small>
                {DEMO ? "Illustrative rate from" : "Available from"}
              </small>
              <strong>
                {money(
                  Math.min(...matching.map((r) => r.perNightRate)),
                  room.currencyCode,
                )}
              </strong>
              <span>/ night</span>
            </div>
          ) : (
            <small>
              {loaded
                ? "No priced rooms for this search"
                : "Choose your stay to see rates"}
            </small>
          )}
        </div>
        <p>{category.description}</p>
        {room ? (
          <RoomSpecs room={room} />
        ) : (
          <p className="muted">
            Specifications are shown on each published room.
          </p>
        )}
        <div className="card-actions">
          <Link className="button outline" to={"/rooms/" + category.key}>
            View details <ArrowUpRight size={15} />
          </Link>
          <button className="button gold" onClick={availability}>
            Check availability
          </button>
        </div>
      </div>
    </article>
  );
}
export function Platinum() {
  return (
    <section className="platinum">
      <div className="container platinum-inner">
        <div>
          <div className="eyebrow light">A LITTLE MORE EXCEPTIONAL</div>
          <h2>Platinum Suite</h2>
          <p>
            Our Platinum Suite is also available. Please contact management for
            availability and booking.
          </p>
          <Link
            to="/contact?subject=platinum"
            className="button outline light-border"
          >
            Contact management <ArrowUpRight size={16} />
          </Link>
        </div>
        <div className="platinum-art" aria-hidden="true">
          <span>IV</span>
          <i />
          <small>THE PLATINUM EXPERIENCE</small>
        </div>
      </div>
    </section>
  );
}
export function Steps({ step = 1 }: { step?: number }) {
  return (
    <ol className="steps container" aria-label="Booking progress">
      {["Availability", "Guest account", "Review", "Reservation"].map(
        (s, i) => (
          <li
            key={s}
            className={
              i + 1 === step ? "active" : i + 1 < step ? "complete" : ""
            }
            aria-current={i + 1 === step ? "step" : undefined}
          >
            <span>{i + 1 < step ? <Check size={15} /> : i + 1}</span>
            {s}
          </li>
        ),
      )}
    </ol>
  );
}
export function StaySummary({
  rooms,
  children,
}: {
  rooms: Room[];
  children?: ReactNode;
}) {
  const { stay, branch } = useHotel();
  const selected = rooms.filter((r) => stay.roomIds.includes(r.id));
  const count = nights(stay.checkIn, stay.checkOut);
  return (
    <aside className="stay-summary">
      <div className="eyebrow">YOUR ESCAPE, AT A GLANCE</div>
      <h2>Your stay</h2>
      {selected[0] && (
        <Photo
          src={selected[0].photos.find((p) => p.kind === "Room")?.url}
          alt={"Selected room " + selected[0].number}
          className="summary-photo"
        />
      )}
      <p className="inline">
        <MapPin size={16} />
        {branch?.name || "Select a branch"}
      </p>
      <dl>
        <div>
          <dt>Check-in</dt>
          <dd>{dateLabel(stay.checkIn)}</dd>
        </div>
        <div>
          <dt>Check-out</dt>
          <dd>{dateLabel(stay.checkOut)}</dd>
        </div>
        <div>
          <dt>Duration</dt>
          <dd>
            {count} {count === 1 ? "night" : "nights"}
          </dd>
        </div>
        <div>
          <dt>Guests</dt>
          <dd>{stay.guests}</dd>
        </div>
        {selected.map((r) => (
          <div key={r.id}>
            <dt>Room {r.number}</dt>
            <dd>
              {money(r.perNightRate, r.currencyCode)} × {count}
            </dd>
          </div>
        ))}
      </dl>
      <div className="summary-total">
        <span>Estimated total</span>
        <strong>
          {selected.length
            ? money(
                selected.reduce((n, r) => n + r.perNightRate, 0) * count,
                branch?.currencyCode,
              )
            : "—"}
        </strong>
      </div>
      <p className="fine-print">
        {DEMO
          ? "Illustrative prices. Reservations are disabled in design preview."
          : "The server calculates your final total. No payment is collected here. Your selection does not hold a room."}
      </p>
      {children}
    </aside>
  );
}
export function Gallery({ room }: { room: Room }) {
  const [photo, setPhoto] = useState<number>();
  const galleryPhotos = [...room.photos].sort((a, b) =>
    a.kind === b.kind ? a.id - b.id : a.kind === "Room" ? -1 : 1,
  );
  return (
    <>
      <div className="gallery">
        <button
          className="gallery-main"
          onClick={() => setPhoto(0)}
          aria-label="Open bedroom gallery"
        >
          <Photo
            src={galleryPhotos[0]?.url}
            alt={galleryPhotos[0]?.caption || "Room " + room.number}
            eager
          />
          <span>
            <Camera size={15} /> View photos
          </span>
        </button>
        <div className="gallery-side">
          {galleryPhotos.slice(1, 3).map((p, i) => (
            <button
              key={p.id}
              onClick={() => setPhoto(i + 1)}
              aria-label={"Open " + p.kind + " photo"}
            >
              <Photo src={p.url} alt={p.caption || p.kind} />
              <span>{p.kind}</span>
            </button>
          ))}
        </div>
      </div>
      {photo !== undefined && (
        <Modal
          title={"Room " + room.number + " · " + galleryPhotos[photo].kind}
          onClose={() => setPhoto(undefined)}
        >
          <Photo
            className="lightbox-photo"
            src={galleryPhotos[photo].url}
            alt={galleryPhotos[photo].caption || galleryPhotos[photo].kind}
          />
          <p>{galleryPhotos[photo].caption}</p>
          <div className="button-row">
            <button
              className="button outline"
              onClick={() =>
                setPhoto(
                  (photo - 1 + galleryPhotos.length) % galleryPhotos.length,
                )
              }
            >
              Previous
            </button>
            <span>
              {photo + 1} / {galleryPhotos.length}
            </span>
            <button
              className="button"
              onClick={() => setPhoto((photo + 1) % galleryPhotos.length)}
            >
              Next
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
