import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Coffee, Clock, Leaf, Waves, Armchair } from "lucide-react";
import { api, DEMO, ApiError, mediaUrl } from "../api";
import { useHotel } from "../context";
import { useData, useImagery, useRooms } from "../hooks";
import { categories, money, validateStay } from "../stay";
import {
  ArrowRight,
  ArrowUpRight,
  CategoryCard,
  Empty,
  ErrorBox,
  Gallery,
  Hero,
  Link,
  Loading,
  Photo,
  Platinum,
  RoomSpecs,
  SectionTitle,
  StaySearch,
  UtensilsCrossed,
  useGo,
} from "../components";
import type { Room } from "../types";
import { ContactMessage } from "./ContactMessage";
export function Home() {
  const { stay, setStay, catalogError, reload, branch, website } = useHotel();
  const photos = useImagery();
  const rooms = useRooms(stay, false, true);
  const offerings = useData(
    () => (stay.branchId ? api.offerings(stay.branchId) : Promise.resolve([])),
    [stay.branchId],
  );
  const go = useGo();
  const roomPhoto = rooms.data?.[0]?.photos.find((photo) => photo.kind === "Room")?.url;
  const offeringPhoto = (kind: string) => offerings.data?.find((item) => item.kind === kind && item.imageUrl)?.imageUrl;
  const slideUrls = new Set<string>();
  const slides = [
    { label: "Hotel exterior", src: website?.heroImageUrl || import.meta.env.VITE_HOTEL_HERO_IMAGE || photos.lobby },
    { label: "Guest room", src: website?.heroRoomImageUrl || roomPhoto || photos.hero },
    { label: "Kitchen", src: website?.heroKitchenImageUrl || photos.kitchen },
    { label: "Bar", src: website?.heroBarImageUrl || offeringPhoto("Bar") },
    { label: "Pool", src: website?.heroPoolImageUrl || offeringPhoto("Pool") || photos.pool },
  ].flatMap(({ label, src }) => {
    const url = mediaUrl(src);
    if (!url || slideUrls.has(url)) return [];
    slideUrls.add(url);
    return [{ label, src: url }];
  });
  return (
    <>
      <Hero
        eyebrow={
          "WELCOME TO " +
          (website?.displayName || "IGES HOTEL & SUITES").toUpperCase()
        }
        title={
          <>
            A warm welcome.
            <br />
            <em>A memorable stay.</em>
          </>
        }
        description="Find your own kind of comfort in the heart of Warri."
        slides={slides}
      >
        <Link to="/rooms" className="button gold">
          Explore our rooms <ArrowRight size={17} />
        </Link>
      </Hero>
      <div className="container floating-search">
        <StaySearch onSearch={() => go("/booking")} />
      </div>
      <section className="container welcome-section" id="welcome">
        <div className="welcome-copy">
          <div className="eyebrow">
            MAKE YOURSELF AT HOME
            <i />
          </div>
          <h2>
            A little closer
            <br />
            to feeling at home.
          </h2>
          <p>
            Business brings you here. A getaway gives you a reason to linger.
            Whatever brings you to Warri, find a space that feels like yours at
            IGES Hotel &amp; Suites.
          </p>
          <p className="muted">
            Choose your branch, explore the rooms, and let your next stay begin.
          </p>
          <Link className="text-link" to="/contact">
            Get to know IGES <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="welcome-images">
          <Photo
            src={
              rooms.data?.find((r) => r.category.toLowerCase() === "vvip")
                ?.photos[0]?.url || photos.vvip
            }
            alt="A comfortable hotel suite"
          />
          <Photo
            src={
              offerings.data?.find((o) => o.kind === "Lounge")?.imageUrl ||
              photos.lobby
            }
            alt="Hotel hospitality"
          />
          <span className="welcome-stamp">
            A WARMER
            <br />
            <strong>stay.</strong>
            <br />
            WARRI, NIGERIA
          </span>
        </div>
      </section>
      <section className="room-section section-pad">
        <div className="container">
          <SectionTitle
            eyebrow="ROOMS & SUITES"
            title="Comfort, in every detail."
          >
            <Link className="text-link" to="/rooms">
              Discover all rooms <ArrowRight size={17} />
            </Link>
          </SectionTitle>
          <ErrorBox
            error={catalogError || rooms.error}
            retry={catalogError ? reload : rooms.retry}
          />
          {rooms.loading ? (
            <Loading cards={4} />
          ) : (
            <div className="room-grid home-room-grid">
              {categories.map((c) => (
                <CategoryCard
                  key={c.key}
                  category={c}
                  rooms={rooms.data || []}
                  loaded={!!rooms.data && !rooms.error}
                />
              ))}
            </div>
          )}
        </div>
      </section>
      <section className="container section-pad">
        <SectionTitle eyebrow="MORE TO YOUR STAY" title="Time well spent." />
        <div className="service-grid">
          {[
            { icon: Waves, kind: "Pool", title: "A slower kind of day" },
            { icon: Armchair, kind: "Lounge", title: "Space to unwind" },
            {
              icon: UtensilsCrossed,
              kind: "Meal",
              title: "Something to savour",
            },
          ].map(({ icon: Icon, kind, title }) => {
            const item = offerings.data?.find((o) => o.kind === kind);
            return (
              <Link
                to={"/kitchen?kind=" + kind}
                className="service-item"
                key={kind}
              >
                <span className="service-icon">
                  <Icon />
                </span>
                <h3>{item?.name || title}</h3>
                <p>
                  {item
                    ? item.description
                    : "Explore published hospitality information for your selected branch."}
                </p>
                <span className="text-link">
                  Explore <ArrowUpRight size={15} />
                </span>
              </Link>
            );
          })}
        </div>
        {branch && (
          <p className="fine-print">
            Facilities, hours and access are branch-specific. Check the
            published listings for your stay.
          </p>
        )}
      </section>
      <section className="kitchen-teaser">
        <div className="container">
          <div className="kitchen-teaser-copy">
            <div className="eyebrow">
              AT THE TABLE
              <i />
            </div>
            <h2>
              Good food.
              <br />
              <em>Warm company.</em>
            </h2>
            <p>
              Discover what’s on the menu, from the first taste to the last
              conversation.
            </p>
            <Link className="button gold" to="/kitchen">
              Explore the kitchen <ArrowRight size={17} />
            </Link>
          </div>
          <Photo
            src={
              offerings.data?.find((o) => o.kind === "Meal")?.imageUrl ||
              photos.food
            }
            alt="Dining inspiration"
          />
        </div>
      </section>
      <Platinum />
    </>
  );
}
export function Rooms() {
  const { stay, catalogError, reload, website } = useHotel();
  const rooms = useRooms(stay, false, true);
  const photos = useImagery();
  const go = useGo();
  return (
    <>
      <Hero
        eyebrow="ROOMS & SUITES"
        title={
          <>
            Find your kind
            <br />
            of comfort.
          </>
        }
        description="From a place to rest to a little more room to indulge. Find the space that fits your stay."
        image={
          website?.heroImageUrl ||
          import.meta.env.VITE_HOTEL_HERO_IMAGE ||
          rooms.data?.[0]?.photos[0]?.url ||
          photos.hero
        }
        compact
      />
      <div className="container floating-search">
        <StaySearch onSearch={() => rooms.retry()} />
      </div>
      <section className="container section-pad rooms-main">
        <SectionTitle eyebrow="OUR ROOMS" title="Choose your space.">
          <p>
            Four ways to make yourself at home.
            <br />
            One warm IGES welcome.
          </p>
        </SectionTitle>
        <div className="search-context">
          <span>
            Rates and rooms for {stay.checkIn} — {stay.checkOut}
          </span>
          <button className="text-button" onClick={() => go("/booking")}>
            Build a multi-room stay <ArrowUpRight size={14} />
          </button>
        </div>
        <ErrorBox
          error={catalogError || rooms.error}
          retry={catalogError ? reload : rooms.retry}
        />
        {rooms.loading ? (
          <Loading cards={4} />
        ) : (
          <div className="room-grid">
            {categories.map((c) => (
              <CategoryCard
                key={c.key}
                category={c}
                rooms={rooms.data || []}
                loaded={!rooms.error && !!stay.branchId}
              />
            ))}
          </div>
        )}
        <p className="fine-print category-footnote">
          VVIP rooms are labelled “Honeymoon suite” only when designated by the
          hotel. Rates depend on the branch, dates and available physical rooms.
        </p>
      </section>
      <Platinum />
    </>
  );
}
export function CategoryDetails() {
  const { category } = useParams();
  const config = categories.find((c) => c.key === category);
  if (!config) return <NotFound />;
  return <CategoryContent category={config} />;
}
function CategoryContent({
  category,
}: {
  category: (typeof categories)[number];
}) {
  const { stay, setStay, branch, catalogError, reload } = useHotel();
  const s = { ...stay, category: category.key };
  const rooms = useRooms(s);
  const [selected, setSelected] = useState<number>();
  const [inspectError, setInspectError] = useState<unknown>();
  const [inspecting, setInspecting] = useState(false);
  const [detail, setDetail] = useState<Room>();
  const go = useGo();
  useEffect(() => {
    setSelected(undefined);
    setDetail(undefined);
    setInspectError(undefined);
  }, [category.key, stay.branchId, stay.checkIn, stay.checkOut, stay.guests]);
  const current =
    detail || rooms.data?.find((r) => r.id === selected) || rooms.data?.[0];
  async function inspect(id: number) {
    setInspecting(true);
    setInspectError(undefined);
    try {
      const actual = await api.room(s, id);
      setSelected(id);
      setDetail(actual);
    } catch (e) {
      setInspectError(e);
      setDetail(undefined);
      rooms.retry();
    } finally {
      setInspecting(false);
    }
  }
  return (
    <>
      <div className="container breadcrumbs">
        <Link to="/rooms">Rooms &amp; suites</Link>
        <span>/</span>
        <span>{category.short}</span>
      </div>
      <section className="container details-heading">
        <div>
          <div className="eyebrow">YOUR SPACE TO UNWIND</div>
          <h1>{category.short}</h1>
          <p>{category.description}</p>
        </div>
        <span className="location-pill">
          {branch?.name || "Select your branch"}
        </span>
      </section>
      <div className="container">
        <StaySearch
          showCategory={false}
          onSearch={(v) => setStay({ ...v, category: category.key })}
        />
        <ErrorBox
          error={catalogError || rooms.error || inspectError}
          retry={catalogError ? reload : rooms.retry}
        />
        {rooms.loading ? (
          <Loading cards={2} />
        ) : current ? (
          <>
            <div className="physical-room-heading">
              <label>
                Inspect a physical room
                <select
                  disabled={inspecting}
                  value={current.id}
                  onChange={(e) => inspect(Number(e.target.value))}
                >
                  {rooms.data?.map((r) => (
                    <option key={r.id} value={r.id}>
                      Room {r.number}
                      {r.isHoneymoonSuite ? " · Honeymoon suite" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <span>{rooms.data?.length} available for your dates</span>
            </div>
            <Gallery room={current} />
            <div className="details-columns section-pad">
              <div>
                <div className="eyebrow">
                  ROOM {current.number} · {current.category.toUpperCase()}
                </div>
                <h2>
                  {current.isHoneymoonSuite
                    ? "A designated honeymoon suite."
                    : "Make yourself comfortable."}
                </h2>
                <p>{current.description}</p>
                <RoomSpecs room={current} />
                <h3>Amenities in this room</h3>
                <div className="amenities">
                  {current.amenities
                    .split(/[,;\n]/)
                    .filter(Boolean)
                    .map((a, i) => (
                      <span key={i}>
                        <CheckMark />
                        {a.trim()}
                      </span>
                    ))}
                </div>
                <div className="info-note">
                  <Coffee />
                  <div>
                    <h3>A note on breakfast</h3>
                    <p>
                      The current room data does not specify breakfast
                      inclusions. Please check with management before assuming
                      breakfast is included.
                    </p>
                    <Link className="text-link" to="/kitchen">
                      Explore the kitchen <ArrowRight size={15} />
                    </Link>
                  </div>
                </div>
              </div>
              <aside className="stay-summary">
                <div className="eyebrow">YOUR NEXT STAY</div>
                <h2>
                  {money(current.perNightRate, current.currencyCode)}{" "}
                  <small>/ night</small>
                </h2>
                <p>
                  Room {current.number} · {branch?.name}
                </p>
                <p>
                  {stay.checkIn} → {stay.checkOut}
                  <br />
                  {stay.guests} guests
                </p>
                <button
                  disabled={inspecting}
                  className="button gold w-full"
                  onClick={() => {
                    setStay({ ...s, roomIds: [current.id] });
                    go("/booking");
                  }}
                >
                  Select this room <ArrowRight size={16} />
                </button>
                <p className="fine-print">
                  Availability is checked again before reservation. Selecting a
                  room does not hold it.
                </p>
                <Link className="text-link" to="/terms">
                  Booking &amp; cancellation information
                </Link>
              </aside>
            </div>
          </>
        ) : (
          !rooms.error && (
            <Empty title="No rooms to inspect for this stay">
              <p>
                Try different dates, fewer guests per room, or explore another
                category. For several guests, the booking page supports multiple
                rooms.
              </p>
              <Link className="button" to="/booking">
                Explore available rooms <ArrowRight size={16} />
              </Link>
            </Empty>
          )
        )}
      </div>
      <Platinum />
    </>
  );
}
function CheckMark() {
  return (
    <span aria-hidden="true" className="check-mark">
      ✓
    </span>
  );
}
export function Kitchen() {
  const { stay, branch, catalogError, reload } = useHotel();
  const photos = useImagery();
  const data = useData(
    () => (stay.branchId ? api.offerings(stay.branchId) : Promise.resolve([])),
    [stay.branchId],
  );
  const [kind, setKind] = useState(
    new URLSearchParams(location.search).get("kind") || "All",
  );
  const [search, setSearch] = useState("");
  const list = data.data?.filter(
    (o) =>
      (kind === "All" || o.kind === kind) &&
      `${o.name} ${o.description}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <Hero
        eyebrow="IGES KITCHEN & HOSPITALITY"
        title={
          <>
            Good food.
            <br />
            <em>Warm company.</em>
          </>
        }
        description="Discover the flavours and little moments that make a stay."
        image={
          data.data?.find((o) => o.kind === "Meal")?.imageUrl || photos.kitchen
        }
        compact
      >
        <a className="button gold" href="#menu">
          Explore the menu <ArrowRight size={16} />
        </a>
      </Hero>
      <section className="container section-pad">
        <SectionTitle
          eyebrow="A TASTE OF YOUR STAY"
          title="Something to savour."
        >
          <p>
            Published menus and hospitality
            <br />
            for {branch?.name || "your selected branch"}.
          </p>
        </SectionTitle>
        <div className="menu-controls">
          <div role="group" aria-label="Filter hospitality listings">
            {["All", "Meal", "Pool", "OutdoorActivity", "Bar", "Lounge"].map(
              (k) => (
                <button
                  className={"filter-chip " + (kind === k ? "selected" : "")}
                  aria-pressed={kind === k}
                  key={k}
                  onClick={() => setKind(k)}
                >
                  {
                    (
                      {
                        All: "All",
                        Meal: "The kitchen",
                        Pool: "Pool",
                        OutdoorActivity: "Activities",
                        Bar: "Bar",
                        Lounge: "Lounge",
                      } as Record<string, string>
                    )[k]
                  }
                </button>
              ),
            )}
          </div>
          <label className="search-menu">
            <span className="sr-only">Search menu and hospitality</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find a dish or experience…"
            />
          </label>
        </div>
        <div id="menu">
          <ErrorBox
            error={catalogError || data.error}
            retry={catalogError ? reload : data.retry}
          />
          {data.loading ? (
            <Loading cards={4} />
          ) : (
            <div className="menu-grid">
              {list?.map((o) => (
                <article className="menu-card" key={o.id}>
                  <Photo src={o.imageUrl} alt={o.name} />
                  <div className="eyebrow">
                    {o.kind.replace(/([a-z])([A-Z])/g, "$1 $2")}
                  </div>
                  <h3>{o.name}</h3>
                  <p>{o.description}</p>
                  <p className="fine-print inline">
                    <Clock size={14} />
                    {o.openingHours}
                  </p>
                  <strong>
                    {o.price !== null
                      ? money(o.price, o.currencyCode)
                      : "Ask about access & pricing"}
                  </strong>
                </article>
              ))}
            </div>
          )}
          {!data.loading && !data.error && !list?.length && (
            <Empty title="No published listings to show">
              <p>
                Try another filter or branch. Menus and service information are
                maintained by each branch.
              </p>
            </Empty>
          )}
        </div>
        <div className="breakfast-note">
          <Coffee size={38} />
          <div>
            <div className="eyebrow">BREAKFAST, MADE CLEAR</div>
            <h3>Good mornings start with the details.</h3>
            <p>
              Breakfast inclusions are not specified in the current room
              catalogue. Confirm your room’s inclusions and any dietary needs
              with management.
            </p>
          </div>
        </div>
        <div className="service-grid">
          {[
            {
              icon: Clock,
              title: "Dining hours",
              text: "See each published listing for the branch’s actual service hours.",
            },
            {
              icon: UtensilsCrossed,
              title: "Kitchen enquiries",
              text: "Menus are available for discovery. Ask the branch directly about dining arrangements.",
            },
            {
              icon: Leaf,
              title: "Dietary needs",
              text: "Speak with management about ingredients and allergies before dining.",
            },
          ].map(({ icon: Icon, title, text }) => (
            <div className="info-card" key={title}>
              <Icon />
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
        <div className="center">
          <Link className="button gold" to="/contact?subject=dining">
            Ask about dining <ArrowUpRight size={16} />
          </Link>
        </div>
      </section>
    </>
  );
}
export function Contact() {
  const { branch, website } = useHotel();
  const params = new URLSearchParams(location.search);
  const phone = (
    website ? website.phone : import.meta.env.VITE_HOTEL_PHONE || ""
  ).trim();
  const email = (
    website ? website.publicEmail : import.meta.env.VITE_HOTEL_EMAIL || ""
  ).trim();
  const validPhone = /^\+?[0-9 ()-]{7,24}$/.test(phone);
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  return (
    <section className="container contact-page section-pad">
      <div className="eyebrow">LET’S MAKE YOU WELCOME</div>
      <h1>
        {params.get("subject") === "platinum"
          ? "Enquire about Platinum."
          : "A conversation starts here."}
      </h1>
      <p className="lead">
        For a special stay, a dining enquiry, or a little help planning your
        visit, speak with IGES management.
      </p>
      <div className="contact-grid">
        <div className="contact-feature">
          <span className="eyebrow light">IGES HOTEL & SUITES</span>
          <h2>
            Your next stay.
            <br />A personal touch.
          </h2>
          <p>{branch?.name || "Warri, Delta State"}</p>
          <p>
            {branch?.address || "Choose a branch to see its published address."}
          </p>
          <p className="fine-print">{branch?.timeZoneId || "Africa/Lagos"}</p>
        </div>
        <div className="contact-options">
          <h2>Contact management</h2>
          {validPhone && (
            <a
              className="contact-method"
              href={"tel:" + phone.replace(/[^+\d]/g, "")}
            >
              <strong>Call the hotel</strong>
              <span>{phone} ↗</span>
            </a>
          )}
          {validEmail && (
            <a
              className="contact-method"
              href={
                "mailto:" +
                email +
                "?subject=" +
                encodeURIComponent(
                  params.get("subject") === "platinum"
                    ? "Platinum Suite enquiry"
                    : "IGES Hotel enquiry",
                )
              }
            >
              <strong>Email management</strong>
              <span>{email} ↗</span>
            </a>
          )}
          {!validPhone && !validEmail && (
            <div className="info-note">
              <div>
                <h3>Direct contact details are being prepared.</h3>
                <p>
                  A verified management phone number or email has not yet been
                  supplied for this website. Please contact the hotel through an
                  existing verified channel or visit the published branch
                  address.
                </p>
                <p>
                  Online Platinum enquiries will be available once the hotel
                  supplies these details.
                </p>
              </div>
            </div>
          )}
          <p>
            Platinum Suite availability and reservations are handled by
            management.
          </p>
          <Link className="text-link" to="/rooms">
            Explore our other rooms <ArrowRight size={16} />
          </Link>
          <ContactMessage key={branch?.id} />
        </div>
      </div>
    </section>
  );
}
export function Policy({ type }: { type: "privacy" | "terms" }) {
  const { website } = useHotel();
  const content = website
    ? type === "privacy"
      ? website.privacyPolicy
      : website.bookingPolicy
    : type === "privacy"
      ? import.meta.env.VITE_PRIVACY_POLICY
      : import.meta.env.VITE_BOOKING_POLICY;
  return (
    <section className="container prose section-pad">
      <div className="eyebrow">YOUR STAY, WITH CLARITY</div>
      <h1>
        {type === "privacy"
          ? "Privacy information."
          : "Terms & booking policies."}
      </h1>
      {content ? (
        <div className="policy-copy">{content}</div>
      ) : (
        <>
          <div className="info-note">
            <div>
              <h3>Hotel policy pending publication</h3>
              <p>
                {type === "privacy"
                  ? "The hotel has not yet supplied its approved privacy policy, retention periods, privacy contact or data-rights procedure."
                  : "The hotel has not yet supplied binding terms, check-in/check-out times, cancellation charges, refund terms or no-show policies."}{" "}
                Please request the applicable information from management before
                proceeding.
              </p>
            </div>
          </div>
          <h2>
            {type === "privacy"
              ? "How this website works"
              : "What the reservation service supports"}
          </h2>
          {type === "privacy" ? (
            <>
              <p>
                Your name and email are submitted to the hotel’s account service
                when you register. Your stay, guest count and room selections
                are submitted when you reserve.
              </p>
              <p>
                Your sign-in token and a non-sensitive stay draft are kept in
                this tab’s session storage. The token is removed when you sign
                out or the session expires. No analytics, advertising trackers
                or payment collection are included.
              </p>
              <p>
                In the labelled development preview only, illustrative images
                load from Unsplash. These images are excluded from the live
                experience.
              </p>
            </>
          ) : (
            <>
              <p>
                Available rooms can be requested for explicit dates. The server
                calculates totals in the branch’s currency and returns the
                reservation status. Pending means awaiting confirmation.
              </p>
              <p>
                Cancellation changes the reservation status to Cancelled and
                releases its rooms. This service does not process payments or
                refunds. No financial cancellation terms have been supplied.
              </p>
              <p>
                Saved selections do not hold rooms. The hotel rechecks
                availability when a reservation is submitted.
              </p>
            </>
          )}
          <Link className="button outline" to="/contact">
            Contact management <ArrowUpRight size={16} />
          </Link>
        </>
      )}
    </section>
  );
}
export function CapabilityPage() {
  return (
    <section className="container prose section-pad">
      <div className="eyebrow">ACCOUNT SUPPORT</div>
      <h1>Let’s get you back in.</h1>
      <div className="info-note">
        <div>
          <h3>Online account recovery is not available yet.</h3>
          <p>
            Online password recovery and email verification are not supported by
            the current hotel service. No reset or verification email has been
            sent.
          </p>
        </div>
      </div>
      <p>
        If you remember your password, return to sign in. Otherwise contact
        management using a verified channel for account assistance.
      </p>
      <div className="button-row">
        <Link className="button" to="/login">
          Back to sign in
        </Link>
        <Link className="button outline" to="/contact">
          Contact management
        </Link>
      </div>
    </section>
  );
}
export function StatusPage({ code = 404 }: { code?: number }) {
  const details: Record<number, [string, string]> = {
    404: [
      "A little off the beaten path.",
      "We couldn’t find that page. Let’s help you find your way back.",
    ],
    403: [
      "This space is private.",
      "Your account does not have access to this resource. Sign in to the appropriate account or return to your bookings.",
    ],
    500: [
      "A pause in your plans.",
      "Something unexpected happened. Please try again in a moment.",
    ],
    503: [
      "We’ll be back with you shortly.",
      "The hotel service is temporarily unavailable. Your saved stay will be here when you return.",
    ],
    0: [
      "Let’s reconnect.",
      "You appear to be offline. Check your connection, then try again.",
    ],
  };
  const [title, text] = details[code] || details[404];
  return (
    <section className="container status-page">
      <div className="status-number">{code || "OFFLINE"}</div>
      <div className="eyebrow">IGES HOTEL & SUITES</div>
      <h1>{title}</h1>
      <p>{text}</p>
      <div className="button-row">
        <Link className="button" to="/">
          Back to home <ArrowRight size={16} />
        </Link>
        <button className="button outline" onClick={() => location.reload()}>
          Try again
        </button>
        {code === 403 && (
          <Link to="/my-bookings" className="text-link">
            My bookings
          </Link>
        )}
      </div>
    </section>
  );
}
export const NotFound = () => <StatusPage code={404} />;
