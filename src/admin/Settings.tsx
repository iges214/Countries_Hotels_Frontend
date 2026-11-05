import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Building2,
  Check,
  ExternalLink,
  LockKeyhole,
  LogOut,
  MapPin,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import { ApiError, getSession, sameSession } from "../api";
import { ErrorBox, Loading, Modal, Photo } from "../components";
import { useHotel } from "../context";
import { useData } from "../hooks";
import { passwordErrors } from "../stay";
import {
  adminApi,
  type AdminBranch,
  type BranchInput,
  type Country,
  type WebsiteSettings,
} from "./api";
import { useAdmin } from "./context";
import {
  Badge,
  Card,
  EmptyState,
  Field,
  PageTitle,
  Toggle,
  useAction,
  useDirtyGuard,
  validImage,
} from "./ui";

type BranchDraft = Omit<BranchInput, "perNightRate" | "totalRooms"> & {
  perNightRate: string;
  totalRooms: string;
};

const branchDefaults: BranchDraft = {
  name: "",
  address: "",
  city: "",
  state: "",
  countryId: 0,
  currencyCode: "NGN",
  timeZoneId: "",
  rating: 4.5,
  perNightRate: "",
  totalRooms: "",
};
export function Branches() {
  const { branches, branch, access, to, refreshBranches } = useAdmin();
  const countries = useData(adminApi.countries, []);
  const [editing, setEditing] = useState<AdminBranch | "new">();
  const [deleting, setDeleting] = useState<AdminBranch>();
  const action = useAction();
  return (
    <>
      <PageTitle
        title="Hotel branches"
        description="One brand. Thoughtful hospitality at every location."
      >
        {access.isSystemAdministrator && (
          <>
            <Link className="ad-btn" to={to("countries")}>
              Manage countries
            </Link>
            <button className="ad-btn gold" onClick={() => setEditing("new")}>
              <Plus size={18} />
              Add branch
            </button>
          </>
        )}
      </PageTitle>
      {action.feedback}
      <div className={"ad-columns " + (editing ? "" : "single")}>
        <div className="ad-stack">
          {branches.map((b) => (
            <Card
              key={b.id}
              className={b.id === branch?.id ? "ad-selected-branch" : ""}
            >
              <div className="ad-branch-card">
                <div className="ad-branch-symbol">
                  <Building2 size={40} />
                  <span>IGES</span>
                </div>
                <div>
                  <h2>{b.name}</h2>
                  <p>
                    <MapPin size={15} />
                    {[b.city, b.state, b.countryName]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  <small>
                    {b.currencyCode} · {b.timeZoneId}
                  </small>
                  <small>{b.totalRooms} operational rooms</small>
                  <small>{b.address}</small>
                </div>
                <div className="ad-stack">
                  <button
                    className="ad-btn small"
                    onClick={() => setEditing(b)}
                  >
                    Edit branch
                  </button>
                  {access.isSystemAdministrator && (
                    <button
                      className="ad-icon danger"
                      aria-label={"Delete " + b.name}
                      onClick={() => setDeleting(b)}
                    >
                      <Trash2 size={17} />
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
          {!branches.length && (
            <Card>
              <EmptyState title="Add your first branch">
                <p>
                  Create the branch details, then add its physical room
                  inventory.
                </p>
              </EmptyState>
            </Card>
          )}
        </div>
        {editing && (
          <BranchForm
            key={editing === "new" ? "new" : editing.id}
            branch={editing === "new" ? undefined : editing}
            countries={countries.data || []}
            countryError={countries.error}
            countriesLoading={countries.loading}
            retryCountries={countries.retry}
            canManageCountries={access.isSystemAdministrator}
            onClose={() => setEditing(undefined)}
            onSaved={() => {
              setEditing(undefined);
              refreshBranches();
            }}
          />
        )}
      </div>
      {deleting && (
        <Modal
          title="Delete this branch?"
          onClose={() => !action.busy && setDeleting(undefined)}
        >
          <div className="admin-app ad-modal-content">
            <p>
              {deleting.name} can only be removed when it has no rooms,
              offerings, reservations, messages or assigned administrators.
            </p>
            {action.feedback}
            <button
              className="ad-btn danger"
              disabled={action.busy}
              onClick={async () => {
                if (
                  await action.run(async () => {
                    await adminApi.deleteBranch(deleting.id);
                    refreshBranches();
                  }, "Branch deleted.")
                )
                  setDeleting(undefined);
              }}
            >
              Delete branch
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function BranchForm({
  branch,
  countries,
  countryError,
  countriesLoading,
  retryCountries,
  canManageCountries,
  onClose,
  onSaved,
}: {
  branch?: AdminBranch;
  countries: Country[];
  countryError: unknown;
  countriesLoading: boolean;
  retryCountries: () => void;
  canManageCountries: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { to } = useAdmin();
  const action = useAction();
  const [form, setForm] = useState<BranchDraft>(
    branch
      ? {
          name: branch.name,
          address: branch.address,
          city: branch.city,
          state: branch.state,
          countryId: branch.countryId,
          currencyCode: branch.currencyCode,
          timeZoneId: branch.timeZoneId,
          rating: branch.rating,
          perNightRate: branch.perNightRate ? String(branch.perNightRate) : "",
          totalRooms: branch.totalRooms ? String(branch.totalRooms) : "",
        }
      : branchDefaults,
  );
  const [baseline] = useState(JSON.stringify(form));
  const dirty = baseline !== JSON.stringify(form);
  useDirtyGuard(dirty);
  const set = <K extends keyof BranchDraft>(key: K, value: BranchDraft[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const setLocation = <K extends "countryId" | "state" | "city">(
    key: K,
    value: BranchDraft[K],
  ) =>
    setForm((f) =>
      f[key] === value ? f : { ...f, [key]: value, timeZoneId: "" },
    );
  const selectedCountry = countries.find((c) => c.id === form.countryId);
  const zoneData = useData(() => import("./branchTimeZones"), []);
  const country = zoneData.data?.countryTimeZones(
    selectedCountry?.shortName || "",
    selectedCountry?.name ||
      (form.countryId === branch?.countryId ? branch.countryName : ""),
  );
  const zones = country?.timezones ?? [];
  const lookupCity = zones.length > 1 && Boolean(form.city.trim());
  const cities = useData(
    () => (lookupCity ? import("city-timezones") : Promise.resolve(undefined)),
    [lookupCity],
  );
  const detectedZone =
    zones.length === 1
      ? zones[0]
      : country && lookupCity && cities.data && zoneData.data
        ? zoneData.data.findCityTimeZone(
            cities.data.findFromIsoCode(country.id),
            zones,
            form.city,
            form.state,
          )
        : "";
  const timeZoneId = form.timeZoneId || detectedZone;
  const zoneOptions = [
    ...new Set([
      ...(zones.length
        ? zones
        : form.countryId && !zoneData.loading
          ? ["UTC", ...Intl.supportedValuesOf("timeZone")]
          : []),
      ...(timeZoneId ? [timeZoneId] : []),
    ]),
  ];
  return (
    <Card title={branch ? "Edit " + branch.name : "New branch"}>
      <ErrorBox error={countryError} retry={retryCountries} />
      {!countriesLoading && !countryError && !countries.length && !branch && (
        <p className="ad-note">
          The country catalogue is empty.
          {canManageCountries && (
            <Link to={to("countries")}>Add a country</Link>
          )}
        </p>
      )}
      {action.feedback}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (
            await action.run(
              () =>
                adminApi.saveBranch(branch?.id, {
                  ...form,
                  timeZoneId,
                  totalRooms: Number(form.totalRooms),
                  perNightRate: Number(form.perNightRate),
                }),
              "Branch saved.",
            )
          )
            onSaved();
        }}
      >
        <Field label="Branch name">
          <input
            required
            maxLength={100}
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </Field>
        <Field label="Address">
          <input
            required
            maxLength={150}
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
          />
        </Field>
        <div className="ad-form-grid">
          <Field label="Country">
            <select
              required
              value={form.countryId || ""}
              onChange={(e) => setLocation("countryId", Number(e.target.value))}
            >
              <option value="">
                {countriesLoading ? "Loading countries…" : "Choose country"}
              </option>
              {[...countries]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              {branch && !countries.some((c) => c.id === branch.countryId) && (
                <option value={branch.countryId}>{branch.countryName}</option>
              )}
            </select>
          </Field>
          <Field label="State">
            <input
              maxLength={100}
              value={form.state}
              onChange={(e) => setLocation("state", e.target.value)}
            />
          </Field>
          <Field label="City">
            <input
              maxLength={100}
              value={form.city}
              onChange={(e) => setLocation("city", e.target.value)}
            />
          </Field>
          <Field label="Currency">
            <input
              required
              pattern="[A-Z]{3}"
              maxLength={3}
              value={form.currencyCode}
              onChange={(e) =>
                set("currencyCode", e.target.value.toUpperCase())
              }
            />
          </Field>
        </div>
        <Field
          label="Time zone"
          hint={
            !form.timeZoneId && detectedZone
              ? "Automatically selected from the branch location."
              : "Enter the branch location to detect its time zone, or choose one manually."
          }
        >
          <select
            required
            disabled={!form.countryId || zoneData.loading}
            value={timeZoneId}
            onChange={(e) => set("timeZoneId", e.target.value)}
          >
            <option value="" disabled>
              {!form.countryId
                ? "Choose country first"
                : zoneData.loading
                  ? "Loading time zones…"
                  : "Choose time zone"}
            </option>
            {zoneOptions.map((zone) => (
              <option key={zone} value={zone}>
                {zoneData.data?.timeZoneLabel(zone) ?? zone}
              </option>
            ))}
          </select>
        </Field>
        <div className="ad-form-grid">
          <Field label="Rating">
            <input
              required
              type="number"
              min={1}
              max={5}
              step="0.1"
              value={form.rating}
              onChange={(e) => set("rating", Number(e.target.value))}
            />
          </Field>
          <Field
            label="Operational rooms"
            hint="Kept in sync when you manage physical rooms."
          >
            <input
              type="number"
              min={0}
              max={100000}
              readOnly={!!branch?.totalRooms}
              placeholder="0"
              value={form.totalRooms}
              onChange={(e) => set("totalRooms", e.target.value)}
            />
          </Field>
        </div>
        <Field
          label="Legacy branch nightly rate"
          hint="Physical room rates determine new reservation totals."
        >
          <input
            type="number"
            min={0}
            step="0.01"
            placeholder="0"
            value={form.perNightRate}
            onChange={(e) => set("perNightRate", e.target.value)}
          />
        </Field>
        <div className="ad-actions">
          <button
            className="ad-btn gold"
            disabled={action.busy || !form.countryId || !timeZoneId}
          >
            Save branch
          </button>
          <button
            type="button"
            className="ad-btn"
            onClick={() => {
              if (!dirty || window.confirm("Discard unsaved branch changes?"))
                onClose();
            }}
          >
            Cancel
          </button>
        </div>
      </form>
      {branch && (
        <p className="ad-note">
          <ShieldCheck size={18} />
          <Link to={to("administrators")}>
            Manage branch administrator access →
          </Link>
        </p>
      )}
    </Card>
  );
}

export function Website() {
  const { branch } = useAdmin();
  const data = useData(
    () => (branch ? adminApi.website(branch.id) : Promise.resolve(undefined)),
    [branch?.id],
  );
  if (!branch) return <EmptyState title="Choose a branch first" />;
  if (data.loading) return <Loading />;
  if (data.error) return <ErrorBox error={data.error} retry={data.retry} />;
  return data.data ? <WebsiteForm key={branch.id} initial={data.data} /> : null;
}
const heroSlots = {
  heroImageUrl: "Hotel exterior",
  heroRoomImageUrl: "Guest room",
  heroKitchenImageUrl: "Kitchen",
  heroBarImageUrl: "Bar",
  heroPoolImageUrl: "Pool",
} as const;
type HeroSlot = keyof typeof heroSlots;

function WebsiteForm({ initial }: { initial: WebsiteSettings }) {
  const { branch } = useAdmin();
  const hotel = useHotel();
  const [form, setForm] = useState(initial);
  const [heroSlot, setHeroSlot] = useState<HeroSlot>("heroImageUrl");
  const action = useAction();
  const upload = useAction();
  const [baseline, setBaseline] = useState(JSON.stringify(initial));
  useDirtyGuard(JSON.stringify(form) !== baseline);
  const set = <K extends keyof WebsiteSettings>(
    key: K,
    value: WebsiteSettings[K],
  ) => setForm((f) => ({ ...f, [key]: value }));
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await action.run(async () => {
          await adminApi.saveWebsite(branch!.id, form);
          setBaseline(JSON.stringify(form));
          hotel.reload();
        }, "Website settings saved. Published details are now available on the public website.");
      }}
    >
      <PageTitle
        title="Website settings"
        description="Make the public website feel like your hotel."
      >
        <a href="/" target="_blank" rel="noreferrer" className="ad-btn">
          Preview website <ExternalLink size={16} />
        </a>
        <button className="ad-btn gold" disabled={action.busy || upload.busy}>
          {action.busy ? "Saving…" : "Save changes"}
        </button>
      </PageTitle>
      {action.feedback}
      <div className="ad-columns">
        <div className="ad-stack">
          <Card title="Hotel details">
            <p>Basic information shown on your public website.</p>
            <Field label="Display name">
              <input
                required
                maxLength={100}
                value={form.displayName}
                onChange={(e) => set("displayName", e.target.value)}
              />
            </Field>
            <div className="ad-form-grid">
              <Field label="City">
                <input readOnly value={branch?.city} />
              </Field>
              <Field label="State">
                <input readOnly value={branch?.state} />
              </Field>
            </div>
            <Field
              label={"Expected checkout time (" + branch?.timeZoneId + ")"}
            >
              <input
                required
                type="time"
                value={form.checkoutTime.slice(0, 5)}
                onChange={(e) => set("checkoutTime", e.target.value + ":00")}
              />
            </Field>
            <p className="ad-fine">
              Used to identify overdue in-house stays. Location details are
              edited under Branches.
            </p>
          </Card>
          <Card title="Contact details">
            <p>How guests can reach your hotel.</p>
            <Field label="Public email">
              <input
                type="email"
                maxLength={254}
                value={form.publicEmail}
                onChange={(e) => set("publicEmail", e.target.value)}
              />
            </Field>
            <Field label="Phone">
              <input
                type="tel"
                maxLength={30}
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="Enter verified hotel phone number"
              />
            </Field>
            <Toggle
              label="Publish contact details"
              description="Show these contact details on the website"
              checked={form.contactPublished}
              onChange={(v) => set("contactPublished", v)}
            />
          </Card>
        </div>
        <div className="ad-stack">
          <Card title="Homepage hero carousel">
            <p>Choose a photo for each slide. The homepage plays the photos in the order shown below.</p>
            <Field label="Hero slide">
              <select value={heroSlot} onChange={(e) => setHeroSlot(e.target.value as HeroSlot)} disabled={upload.busy}>
                {Object.entries(heroSlots).map(([key, label], index) => (
                  <option key={key} value={key}>
                    {index + 1}. {label}{form[key as HeroSlot] ? " · Photo set" : ""}
                  </option>
                ))}
              </select>
            </Field>
            <div className="ad-preview-image wide">
              <Photo src={form[heroSlot]} alt={heroSlots[heroSlot]} />
            </div>
            <Field label="Upload hero photograph">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={upload.busy}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  await upload.run(async () => {
                    validImage(file);
                    const result = await adminApi.uploadImage(branch!.id, file);
                    set(heroSlot, result.url);
                  }, "Hero image uploaded. Save changes to use it on the website.");
                  e.target.value = "";
                }}
              />
            </Field>
            <Field label="Or image URL">
              <input
                maxLength={1000}
                placeholder="https://…"
                value={form[heroSlot] ?? ""}
                onChange={(e) => set(heroSlot, e.target.value)}
              />
            </Field>
            {form[heroSlot] && (
              <button type="button" className="ad-btn small" disabled={upload.busy} onClick={() => set(heroSlot, "")}>
                Clear this photo
              </button>
            )}
            <p className="ad-fine">Empty guest room, bar and pool slots can use published photos from the branch catalog. Save changes to publish your edits.</p>
            {upload.feedback}
          </Card>
          <Card title="Policies">
            <Field label="Booking & cancellation">
              <textarea
                rows={5}
                maxLength={20000}
                value={form.bookingPolicy}
                onChange={(e) => set("bookingPolicy", e.target.value)}
              />
            </Field>
            <Toggle
              label="Publish booking policy"
              checked={form.bookingPolicyPublished}
              onChange={(v) => set("bookingPolicyPublished", v)}
            />
            <Field label="Privacy policy">
              <textarea
                rows={5}
                maxLength={20000}
                value={form.privacyPolicy}
                onChange={(e) => set("privacyPolicy", e.target.value)}
              />
            </Field>
            <Toggle
              label="Publish privacy policy"
              checked={form.privacyPublished}
              onChange={(v) => set("privacyPublished", v)}
            />
            <p className="ad-fine">
              Only approved, published policies appear on the public website.
            </p>
          </Card>
        </div>
      </div>
    </form>
  );
}

export function Administrators() {
  const { access, branch, to } = useAdmin();
  const data = useData(
    () => (branch ? adminApi.administrators(branch.id) : Promise.resolve([])),
    [branch?.id],
  );
  const [email, setEmail] = useState("");
  const [revoke, setRevoke] = useState<number>();
  const action = useAction();
  return (
    <>
      <PageTitle
        title="Administrator access"
        description="System administrators oversee all hotel locations and manage staff access by branch."
      />
      <div className="ad-columns editor">
        <Card
          title={
            branch
              ? `Administration team · ${branch.name}`
              : "Administration team"
          }
        >
          <ErrorBox error={data.error} retry={data.retry} />
          {data.loading ? (
            <Loading />
          ) : (
            <div className="ad-table-wrap">
              <table className="ad-table">
                <thead>
                  <tr>
                    <th>Team member</th>
                    <th>Access level</th>
                    <th>Branch</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {access.isSystemAdministrator && (
                    <tr>
                      <td>
                        <strong>
                          {access.firstName} {access.lastName}
                        </strong>
                        <small>{access.email}</small>
                      </td>
                      <td>System administrator</td>
                      <td>All branches</td>
                      <td>
                        <Badge tone="green">Your account</Badge>
                      </td>
                    </tr>
                  )}
                  {data.data?.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <strong>
                          {a.firstName} {a.lastName}
                        </strong>
                        <small>{a.email}</small>
                      </td>
                      <td>Branch administrator</td>
                      <td>{branch?.name}</td>
                      <td>
                        {access.isSystemAdministrator ? (
                          <button
                            className="ad-btn small danger"
                            onClick={() => setRevoke(a.id)}
                          >
                            Revoke
                          </button>
                        ) : (
                          <Badge tone="green">Active</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!data.data?.length && !access.isSystemAdministrator && (
                <EmptyState title="No branch assignments found" />
              )}
            </div>
          )}
        </Card>
        <Card title="Assign branch administrator">
          {access.isSystemAdministrator && branch ? (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await action.run(async () => {
                  await adminApi.assign(branch.id, email.trim());
                  setEmail("");
                  data.retry();
                }, "Branch administrator assigned.");
              }}
            >
              <p>
                Choose an existing registered account to manage {branch.name}.
              </p>
              <Field label="Account email">
                <input
                  required
                  type="email"
                  autoComplete="off"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Field label="Branch">
                <input readOnly value={branch.name} />
              </Field>
              <Field label="Role">
                <input readOnly value="Branch administrator" />
              </Field>
              <div className="ad-permissions">
                {[
                  "Manage rooms & photos",
                  "Manage reservations & guest stays",
                  "Manage facilities & website",
                  "Read and reply to branch messages",
                ].map((p) => (
                  <div key={p}>
                    <Check size={17} />
                    {p}
                  </div>
                ))}
              </div>
              {action.feedback}
              <button className="ad-btn gold full" disabled={action.busy}>
                Assign access
              </button>
            </form>
          ) : access.isSystemAdministrator ? (
            <>
              <p>Set up your first location before assigning staff to it.</p>
              <Link className="ad-btn" to={to("branches")}>
                Manage hotel locations
              </Link>
            </>
          ) : (
            <div className="ad-note">
              <LockKeyhole size={20} />A system administrator manages branch
              access assignments.
            </div>
          )}
          <p className="ad-fine">
            A branch assignment gives a registered staff member access to that
            location. System administrator access is granted separately by the
            server operator.
          </p>
        </Card>
      </div>
      {revoke !== undefined && (
        <Modal
          title="Revoke branch access?"
          onClose={() => !action.busy && setRevoke(undefined)}
        >
          <div className="admin-app ad-modal-content">
            <p>
              This account will lose administrator access to {branch?.name}.
              Their guest account and reservations are retained.
            </p>
            {action.feedback}
            <button
              className="ad-btn danger"
              disabled={action.busy}
              onClick={async () => {
                if (
                  await action.run(async () => {
                    await adminApi.revoke(branch!.id, revoke);
                    data.retry();
                  }, "Branch access revoked.")
                )
                  setRevoke(undefined);
              }}
            >
              Revoke access
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

export function Account() {
  const { access, branches, refreshAccess } = useAdmin();
  const { logout, auth, requestSignOut } = useHotel();
  const navigate = useNavigate();
  const [first, setFirst] = useState(access.firstName);
  const [last, setLast] = useState(access.lastName);
  const profile = useAction();
  const password = useAction();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [show, setShow] = useState(false);
  return (
    <>
      <PageTitle
        title="My account"
        description="Your details and account security."
      />
      <div className="ad-columns">
        <div className="ad-stack">
          <Card title="Profile">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await profile.run(async () => {
                  await adminApi.saveAccount(first.trim(), last.trim());
                  refreshAccess();
                }, "Profile saved.");
              }}
            >
              <div className="ad-account-heading">
                <span className="ad-avatar large">{first[0] || "A"}</span>
                <span>
                  {access.isSystemAdministrator
                    ? "System administrator"
                    : "Branch administrator"}
                </span>
              </div>
              <div className="ad-form-grid">
                <Field label="First name">
                  <input
                    required
                    maxLength={100}
                    autoComplete="given-name"
                    value={first}
                    onChange={(e) => setFirst(e.target.value)}
                  />
                </Field>
                <Field label="Last name">
                  <input
                    required
                    maxLength={100}
                    autoComplete="family-name"
                    value={last}
                    onChange={(e) => setLast(e.target.value)}
                  />
                </Field>
              </div>
              <Field
                label="Email"
                hint="Your account email is managed separately."
              >
                <input readOnly type="email" value={access.email} />
              </Field>
              {profile.feedback}
              <button className="ad-btn gold" disabled={profile.busy}>
                Save profile
              </button>
            </form>
          </Card>
          <Card title="Change password">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await password.run(async () => {
                  const issue = passwordErrors(next);
                  if (issue) throw new ApiError(400, issue);
                  if (next !== confirmation)
                    throw new ApiError(400, "Your new passwords do not match.");
                  const session = getSession();
                  await adminApi.password(current, next);
                  setCurrent("");
                  setNext("");
                  setConfirmation("");
                  if (sameSession(getSession(), session)) {
                    logout();
                    navigate("/admin/login");
                  }
                }, "Password updated. Sign in with your new password.");
              }}
            >
              <Field label="Current password">
                <input
                  required
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                />
              </Field>
              <Field
                label="New password"
                hint="At least 6 characters with uppercase, lowercase, a number and a symbol."
              >
                <input
                  required
                  type={show ? "text" : "password"}
                  autoComplete="new-password"
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                />
              </Field>
              <Field label="Confirm new password">
                <input
                  required
                  type={show ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                />
              </Field>
              <label className="ad-check">
                <input
                  type="checkbox"
                  checked={show}
                  onChange={(e) => setShow(e.target.checked)}
                />
                Show passwords
              </label>
              {password.feedback}
              <button className="ad-btn gold" disabled={password.busy}>
                Update password
              </button>
            </form>
          </Card>
        </div>
        <div className="ad-stack">
          <Card title="Your access">
            <Badge tone="green">
              {access.isSystemAdministrator
                ? "System administrator"
                : "Branch administrator"}
            </Badge>
            <dl className="ad-details">
              <dt>Scope</dt>
              <dd>
                {access.isSystemAdministrator
                  ? "All branches"
                  : branches.map((b) => b.name).join(", ")}
              </dd>
            </dl>
            <div className="ad-permissions">
              <div>
                <Check size={17} />
                Manage hotel rooms and photographs
              </div>
              <div>
                <Check size={17} />
                Manage reservations and guest stays
              </div>
              <div>
                <Check size={17} />
                Manage facilities and website content
              </div>
            </div>
          </Card>
          <Card title="Session">
            <Badge tone="green">Signed in on this browser</Badge>
            {auth?.renewal ? (
              <dl className="ad-details">
                <dt>Inactivity deadline</dt>
                <dd>{sessionDate(auth.renewal.idleUntil)} WAT</dd>
                <dt>Maximum session ends</dt>
                <dd>{sessionDate(auth.renewal.sessionUntil)} WAT</dd>
              </dl>
            ) : <p className="ad-fine">
              Session expires{" "}
              {auth ? sessionDate(auth.expires) : ""}{" "}
              WAT.
            </p>}
            <button className="ad-btn" onClick={requestSignOut}>
              <LogOut size={17} />
              Sign out
            </button>
          </Card>
        </div>
      </div>
    </>
  );
}

function sessionDate(time: number) {
  return new Date(time).toLocaleString("en-GB", {
    timeZone: "Africa/Lagos",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function Countries() {
  const { access, to } = useAdmin();
  const data = useData(adminApi.countries, []);
  const action = useAction();
  const [editing, setEditing] = useState<Country | "new">();
  const [name, setName] = useState("");
  const [short, setShort] = useState("");
  const [deleting, setDeleting] = useState<Country>();
  if (!access.isSystemAdministrator)
    return <EmptyState title="System administrator access required" />;
  return (
    <>
      <PageTitle
        title="Countries"
        description="Manage the country catalogue used by hotel branches."
      >
        <Link className="ad-btn" to={to("branches")}>
          ← Back to branches
        </Link>
        <button
          className="ad-btn gold"
          onClick={() => {
            setEditing("new");
            setName("");
            setShort("");
          }}
        >
          <Plus size={18} />
          Add country
        </button>
      </PageTitle>
      <ErrorBox error={data.error} retry={data.retry} />
      {action.feedback}
      {data.loading ? (
        <Loading />
      ) : (
        <Card>
          <div className="ad-table-wrap">
            <table className="ad-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Short name</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {data.data?.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.shortName}</td>
                    <td>
                      <div className="ad-actions">
                        <button
                          className="ad-btn small"
                          onClick={() => {
                            setEditing(c);
                            setName(c.name);
                            setShort(c.shortName);
                          }}
                        >
                          Edit
                        </button>
                        <button
                          className="ad-icon danger"
                          aria-label={"Delete " + c.name}
                          onClick={() => setDeleting(c)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {editing && (
        <Modal
          title={editing === "new" ? "Add country" : "Edit country"}
          onClose={() => !action.busy && setEditing(undefined)}
        >
          <div className="admin-app ad-modal-content">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (
                  await action.run(async () => {
                    await adminApi.saveCountry(
                      editing === "new" ? undefined : editing.id,
                      name.trim(),
                      short.trim(),
                    );
                    data.retry();
                  }, "Country saved.")
                )
                  setEditing(undefined);
              }}
            >
              <Field label="Name">
                <input
                  required
                  maxLength={100}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
              <Field label="Short name">
                <input
                  required
                  maxLength={10}
                  value={short}
                  onChange={(e) => setShort(e.target.value)}
                />
              </Field>
              {action.feedback}
              <button className="ad-btn gold" disabled={action.busy}>
                Save country
              </button>
            </form>
          </div>
        </Modal>
      )}
      {deleting && (
        <Modal
          title="Delete country?"
          onClose={() => !action.busy && setDeleting(undefined)}
        >
          <div className="admin-app ad-modal-content">
            <p>
              {deleting.name} can only be removed if it has no hotel branches.
            </p>
            {action.feedback}
            <button
              className="ad-btn danger"
              disabled={action.busy}
              onClick={async () => {
                if (
                  await action.run(async () => {
                    await adminApi.deleteCountry(deleting.id);
                    data.retry();
                  }, "Country deleted.")
                )
                  setDeleting(undefined);
              }}
            >
              Delete country
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
