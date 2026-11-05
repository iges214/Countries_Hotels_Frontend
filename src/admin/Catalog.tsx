import { useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { BedDouble, ImagePlus, Plus, Trash2, Upload, Info } from "lucide-react";
import { ApiError } from "../api";
import { ErrorBox, Loading, Modal, Photo } from "../components";
import { useData } from "../hooks";
import {
  adminApi,
  type AdminRoom,
  type OfferingInput,
  type RoomInput,
} from "./api";
import { useAdmin } from "./context";
import {
  Badge,
  Card,
  EmptyState,
  Field,
  matches,
  money,
  PageTitle,
  SearchBox,
  Tabs,
  Toggle,
  useAction,
  useDirtyGuard,
  usePagination,
  validImage,
} from "./ui";

const categoryFor = (n: number) =>
  n >= 100 && n <= 200
    ? { name: "Normal", floor: 1 }
    : n >= 210 && n <= 300
      ? { name: "VIP", floor: 2 }
      : n >= 350 && n <= 400
        ? { name: "VVIP", floor: 3 }
        : n >= 480 && n <= 500
          ? { name: "Platinum", floor: 4 }
          : undefined;
const twin = (n: number) => n >= 160 && n <= 200;
const roomDefaults: RoomInput = {
  number: 100,
  description: "",
  bedType: "King",
  amenities: "Wi-Fi, Air conditioning, TV, Private bathroom",
  maxGuests: 2,
  sizeSquareMetres: 25,
  perNightRate: 0,
  isPublished: false,
  isOperational: true,
  isHoneymoonSuite: false,
};

export function Rooms() {
  const { branch, to } = useAdmin();
  const [params] = useSearchParams();
  const data = useData(
    () => (branch ? adminApi.rooms(branch.id) : Promise.resolve([])),
    [branch?.id],
  );
  const [state, setState] = useState(params.get("state") || "all");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [floor, setFloor] = useState("");
  const rooms = data.data || [];
  const filtered = rooms.filter(
    (r) =>
      (state === "all" ||
        (state === "published" && r.isPublished) ||
        (state === "draft" && !r.isPublished) ||
        (state === "maintenance" && !r.isOperational)) &&
      matches(`${r.number} ${r.description} ${r.bedType}`, search) &&
      (!category || r.category.toLowerCase() === category) &&
      (!floor || r.floor === Number(floor)),
  );
  const paged = usePagination(
    filtered,
    [state, search, category, floor].join(),
  );
  return (
    <>
      <PageTitle
        title="Rooms & pricing"
        description="Make every room ready for its next guest."
      >
        {branch && (
          <Link className="ad-btn gold" to={to("rooms/new")}>
            <Plus size={19} />
            Add room
          </Link>
        )}
      </PageTitle>
      <Tabs
        value={state}
        onChange={setState}
        items={[
          { value: "all", label: "All rooms", count: rooms.length },
          {
            value: "published",
            label: "Published",
            count: rooms.filter((r) => r.isPublished).length,
          },
          {
            value: "draft",
            label: "Drafts",
            count: rooms.filter((r) => !r.isPublished).length,
          },
          {
            value: "maintenance",
            label: "Maintenance",
            count: rooms.filter((r) => !r.isOperational).length,
          },
        ]}
      />
      <div className="ad-filterbar">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Search rooms"
        />
        <label className="ad-field">
          <span className="sr-only">Category</span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">All categories</option>
            {["Normal", "Vip", "Vvip", "Platinum"].map((c) => (
              <option key={c} value={c.toLowerCase()}>
                {c === "Normal" ? c : c.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
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
      </div>
      <ErrorBox error={data.error} retry={data.retry} />
      {data.loading ? (
        <Loading />
      ) : (
        !data.error && (
          <>
            <div className="ad-table-wrap">
              <table className="ad-table room-table">
                <thead>
                  <tr>
                    <th>Room</th>
                    <th>Category</th>
                    <th>Beds</th>
                    <th>Capacity</th>
                    <th>Nightly rate</th>
                    <th>Visibility</th>
                    <th>Operations</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.rows.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <div className="ad-room-cell">
                          <Photo
                            src={r.photos[0]?.url}
                            alt={"Room " + r.number}
                          />
                          <strong>{r.number}</strong>
                        </div>
                      </td>
                      <td>
                        {r.category === "Normal"
                          ? "Normal"
                          : r.category.toUpperCase()}
                        {r.isHoneymoonSuite && <small>Honeymoon suite</small>}
                      </td>
                      <td>{r.bedType}</td>
                      <td>{r.maxGuests} guests</td>
                      <td>
                        <strong>{money(r.perNightRate, r.currencyCode)}</strong>
                      </td>
                      <td>
                        <Badge tone={r.isPublished ? "green" : "gold"}>
                          {r.isPublished ? "Published" : "Draft"}
                        </Badge>
                      </td>
                      <td>
                        <Badge tone={r.isOperational ? "green" : "red"}>
                          {r.isOperational ? "Operational" : "Maintenance"}
                        </Badge>
                      </td>
                      <td>
                        <Link className="ad-btn small" to={to("rooms/" + r.id)}>
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!filtered.length && (
                <EmptyState
                  title={
                    rooms.length
                      ? "No matching rooms"
                      : "Your room inventory starts here"
                  }
                >
                  <p>
                    {rooms.length
                      ? "Try another search or filter."
                      : "Add the physical rooms in this branch, then upload bedroom and bathroom photos before publishing."}
                  </p>
                </EmptyState>
              )}
            </div>
            {paged.controls}
          </>
        )
      )}
    </>
  );
}

export function RoomEditor() {
  const { id } = useParams();
  const { branch, to } = useAdmin();
  const data = useData(
    () => (id && branch ? adminApi.rooms(branch.id) : Promise.resolve([])),
    [id, branch?.id],
  );
  if (!branch) return <EmptyState title="Choose a branch first" />;
  if (data.loading) return <Loading />;
  if (data.error) return <ErrorBox error={data.error} retry={data.retry} />;
  const room = data.data?.find((r) => r.id === Number(id));
  if (id && !room)
    return (
      <EmptyState title="Room not found">
        <Link to={to("rooms")}>Back to rooms</Link>
      </EmptyState>
    );
  return <RoomForm key={id || "new"} room={room} />;
}

function RoomForm({ room }: { room?: AdminRoom }) {
  const { branch, to, refreshBranches } = useAdmin();
  const navigate = useNavigate();
  const action = useAction();
  const initial: RoomInput = room
    ? {
        number: room.number,
        description: room.description,
        bedType: room.bedType,
        amenities: room.amenities,
        maxGuests: room.maxGuests,
        sizeSquareMetres: room.sizeSquareMetres,
        perNightRate: room.perNightRate,
        isPublished: room.isPublished,
        isOperational: room.isOperational,
        isHoneymoonSuite: room.isHoneymoonSuite,
      }
    : roomDefaults;
  const [form, setForm] = useState<RoomInput>(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const dirty = JSON.stringify(form) !== saved;
  useDirtyGuard(dirty);
  const set = <K extends keyof RoomInput>(key: K, value: RoomInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));
  const category = categoryFor(form.number);
  const hasPhotos =
    !!room?.photos.some((p) => p.kind === "Room") &&
    !!room.photos.some((p) => p.kind === "Bathroom");
  const cancel = (path: string) => {
    if (!dirty || window.confirm("Discard unsaved room changes?"))
      navigate(to(path));
  };
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await action.run(
          async () => {
            if (!category)
              throw new ApiError(
                400,
                "Choose a room number within a supported range.",
              );
            const result = await adminApi.saveRoom(branch!.id, room?.id, form);
            setSaved(JSON.stringify(form));
            refreshBranches();
            navigate(to("rooms/" + result.id), { replace: true });
          },
          room
            ? "Room changes saved."
            : "Room created. Add its photographs before publishing.",
        );
      }}
    >
      <PageTitle
        title={room ? "Edit room " + room.number : "Add a room"}
        description="A welcoming stay begins with the details."
      >
        <button
          type="button"
          className="ad-btn"
          onClick={() => cancel("rooms")}
        >
          Cancel
        </button>
        <button className="ad-btn green" disabled={action.busy}>
          {action.busy ? "Saving…" : "Save changes"}
        </button>
      </PageTitle>
      {action.feedback}
      <div className="ad-columns editor">
        <div className="ad-stack">
          <Card title="Room details">
            <div className="ad-note">
              <Info size={17} />
              Room number determines category and floor. Twin rooms: 160–200.
            </div>
            <div className="ad-form-grid three">
              <Field label="Room number">
                <input
                  required
                  type="number"
                  min={100}
                  max={500}
                  value={form.number}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    setForm((f) => ({
                      ...f,
                      number: n,
                      bedType: twin(n)
                        ? "Twin"
                        : f.bedType === "Twin"
                          ? "King"
                          : f.bedType,
                      isHoneymoonSuite: n >= 350 ? f.isHoneymoonSuite : false,
                    }));
                  }}
                />
              </Field>
              <Field label="Category">
                <input readOnly value={category?.name || "Invalid range"} />
              </Field>
              <Field label="Floor">
                <input readOnly value={category?.floor || "—"} />
              </Field>
            </div>
            <Field label="Description">
              <textarea
                required
                maxLength={2000}
                rows={4}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
              />
            </Field>
            <div className="ad-form-grid three">
              <Field label="Bed type">
                <select
                  value={form.bedType}
                  disabled={twin(form.number)}
                  onChange={(e) => set("bedType", e.target.value)}
                >
                  {[
                    "King",
                    "Queen",
                    "Double",
                    "Single",
                    ...(twin(form.number) ? ["Twin"] : []),
                  ].map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Guests">
                <input
                  required
                  type="number"
                  min={twin(form.number) ? 2 : 1}
                  max={10}
                  value={form.maxGuests}
                  onChange={(e) => set("maxGuests", Number(e.target.value))}
                />
              </Field>
              <Field label="Size (m²)">
                <input
                  required
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={form.sizeSquareMetres}
                  onChange={(e) =>
                    set("sizeSquareMetres", Number(e.target.value))
                  }
                />
              </Field>
            </div>
            <div className="ad-form-grid">
              <Field label={"Nightly rate (" + branch?.currencyCode + ")"}>
                <input
                  required
                  type="number"
                  min={0.01}
                  step="0.01"
                  value={form.perNightRate}
                  onChange={(e) => set("perNightRate", Number(e.target.value))}
                />
              </Field>
              <div className="ad-bed-note">
                <BedDouble />
                <div>
                  <strong>Bed layout</strong>
                  <small>
                    {twin(form.number)
                      ? "Two separate single beds"
                      : form.bedType + " bed"}
                  </small>
                </div>
              </div>
            </div>
            <Field label="Amenities" hint="Separate amenities with commas.">
              <textarea
                required
                maxLength={2000}
                rows={2}
                value={form.amenities}
                onChange={(e) => set("amenities", e.target.value)}
              />
            </Field>
          </Card>
          <Card title="Room photographs">
            {room ? (
              <>
                <div className="ad-photo-pair">
                  {["Room", "Bathroom"].map((kind) => (
                    <div key={kind}>
                      <Photo
                        src={room.photos.find((p) => p.kind === kind)?.url}
                        alt={kind + " photograph"}
                      />
                      <Badge>{kind === "Room" ? "Bedroom" : kind}</Badge>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  className="ad-btn"
                  onClick={() => {
                    if (
                      !dirty ||
                      window.confirm(
                        "Discard unsaved room changes and open photographs?",
                      )
                    )
                      navigate(to("images") + "&room=" + room.id);
                  }}
                >
                  <ImagePlus size={17} />
                  Manage photos
                </button>
              </>
            ) : (
              <p>
                Save this room as a draft, then add its bedroom and bathroom
                photographs in the image library.
              </p>
            )}
          </Card>
        </div>
        <div className="ad-stack">
          <Card title="Availability & visibility">
            <Toggle
              label="Published on website"
              description={
                hasPhotos
                  ? "Show this room on the public website"
                  : "Add bedroom and bathroom photos before publishing"
              }
              checked={form.isPublished}
              disabled={!hasPhotos}
              onChange={(v) => set("isPublished", v)}
            />
            <Toggle
              label="Operational"
              description="This room is ready to receive guests"
              checked={form.isOperational}
              onChange={(v) => set("isOperational", v)}
            />
            <Toggle
              label="Honeymoon suite"
              description="Available for VVIP and Platinum suites"
              checked={form.isHoneymoonSuite}
              disabled={![3, 4].includes(category?.floor || 0)}
              onChange={(v) => set("isHoneymoonSuite", v)}
            />
          </Card>
          <Card title="Room preview">
            <div className="ad-preview-image">
              <Photo src={room?.photos[0]?.url} alt={"Room " + form.number} />
            </div>
            <h3>
              Room {form.number} · {category?.name}
            </h3>
            <strong>
              {money(form.perNightRate, branch?.currencyCode)} / night
            </strong>
            <p>
              {form.description || "Add a description to introduce this room."}
            </p>
          </Card>
        </div>
      </div>
    </form>
  );
}

export function ImageLibrary() {
  const { branch, to } = useAdmin();
  const [params] = useSearchParams();
  const data = useData(
    () => (branch ? adminApi.rooms(branch.id) : Promise.resolve([])),
    [branch?.id],
  );
  const [roomId, setRoomId] = useState(params.get("room") || "");
  const [kind, setKind] = useState("all");
  const [selected, setSelected] = useState<number>();
  const [upload, setUpload] = useState(false);
  const [file, setFile] = useState<File>();
  const [uploadKind, setUploadKind] = useState("Room");
  const [caption, setCaption] = useState("");
  const [target, setTarget] = useState(params.get("room") || "");
  const action = useAction();
  const photos = (data.data || []).flatMap((r) =>
    r.photos.map((p) => ({ ...p, room: r })),
  );
  const filtered = photos.filter(
    (p) =>
      (!roomId || p.room.id === Number(roomId)) &&
      (kind === "all" || p.kind === kind),
  );
  const photo = photos.find((p) => p.id === selected);
  const [editCaption, setEditCaption] = useState("");
  const [editKind, setEditKind] = useState("Room");
  const [deleting, setDeleting] = useState(false);
  const paged = usePagination(filtered, roomId + kind, 9);
  return (
    <>
      <PageTitle
        title="Image library"
        description="Give guests a clear picture of their stay."
      >
        {branch && (
          <button
            className="ad-btn gold"
            disabled={!data.data?.length}
            onClick={() => {
              setTarget(roomId || String(data.data?.[0]?.id || ""));
              setUpload(true);
            }}
          >
            <Plus size={18} />
            Upload images
          </button>
        )}
      </PageTitle>
      <div className="ad-tabs">
        <button className="active">Room photos</button>
        <Link to={to("website")}>Hotel & hero</Link>
        <Link to={to("facilities")}>Facilities</Link>
      </div>
      <div className="ad-filterbar">
        <Field label="Room">
          <select
            value={roomId}
            onChange={(e) => {
              setRoomId(e.target.value);
              setSelected(undefined);
            }}
          >
            <option value="">All rooms</option>
            {data.data?.map((r) => (
              <option key={r.id} value={r.id}>
                Room {r.number}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Photo type">
          <select value={kind} onChange={(e) => setKind(e.target.value)}>
            <option value="all">All photographs</option>
            <option value="Room">Bedroom</option>
            <option value="Bathroom">Bathroom</option>
          </select>
        </Field>
        <p className="ad-fine">JPEG, PNG or WebP · maximum 5 MB per image</p>
      </div>
      <ErrorBox error={data.error} retry={data.retry} />
      {action.feedback}
      {data.loading ? (
        <Loading />
      ) : (
        <div className={"ad-columns " + (photo ? "editor" : "single")}>
          <div>
            <div className="ad-image-grid">
              {paged.rows.map((p) => (
                <button
                  className={
                    "ad-image-tile " + (photo?.id === p.id ? "selected" : "")
                  }
                  key={p.id}
                  onClick={() => {
                    setSelected(p.id);
                    setEditCaption(p.caption);
                    setEditKind(p.kind);
                  }}
                >
                  <Photo
                    src={p.url}
                    alt={
                      p.caption || p.kind + " photo of room " + p.room.number
                    }
                  />
                  <div>
                    <strong>
                      Room {p.room.number} ·{" "}
                      {p.kind === "Room" ? "Bedroom" : "Bathroom"}
                    </strong>
                    <small>{p.caption || "No caption"}</small>
                  </div>
                </button>
              ))}
            </div>
            {!filtered.length && (
              <Card>
                <EmptyState title="No photographs here yet">
                  <p>
                    Choose a room and upload bedroom and bathroom photographs.
                  </p>
                </EmptyState>
              </Card>
            )}
            {paged.controls}
          </div>
          {photo && (
            <Card title="Selected photograph">
              <div className="ad-preview-image">
                <Photo src={photo.url} alt={photo.caption || photo.kind} />
              </div>
              <p>
                <strong>Room {photo.room.number}</strong>
              </p>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await action.run(async () => {
                    await adminApi.photoDetails(
                      branch!.id,
                      photo.room.id,
                      photo.id,
                      editKind,
                      editCaption,
                    );
                    data.retry();
                  }, "Photograph details saved.");
                }}
              >
                <Field label="Photo type">
                  <select
                    value={editKind}
                    onChange={(e) => setEditKind(e.target.value)}
                  >
                    <option value="Room">Bedroom</option>
                    <option value="Bathroom">Bathroom</option>
                  </select>
                </Field>
                <Field label="Caption">
                  <input
                    maxLength={200}
                    value={editCaption}
                    onChange={(e) => setEditCaption(e.target.value)}
                  />
                </Field>
                <button className="ad-btn gold full" disabled={action.busy}>
                  Save details
                </button>
              </form>
              <button
                className="ad-btn danger full"
                disabled={action.busy}
                onClick={() => setDeleting(true)}
              >
                <Trash2 size={16} />
                Delete image
              </button>
            </Card>
          )}
        </div>
      )}
      {upload && (
        <Modal
          title="Upload a room photograph"
          onClose={() => !action.busy && setUpload(false)}
        >
          <div className="admin-app ad-modal-content">
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!file) return;
                const ok = await action.run(async () => {
                  validImage(file);
                  await adminApi.uploadPhoto(
                    branch!.id,
                    Number(target),
                    file,
                    uploadKind,
                    caption,
                  );
                  data.retry();
                }, "Photograph uploaded.");
                if (ok) {
                  setFile(undefined);
                  setCaption("");
                  setUpload(false);
                }
              }}
            >
              <Field label="Room">
                <select
                  required
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                >
                  {data.data?.map((r) => (
                    <option key={r.id} value={r.id}>
                      Room {r.number}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Photo type">
                <select
                  value={uploadKind}
                  onChange={(e) => setUploadKind(e.target.value)}
                >
                  <option value="Room">Bedroom</option>
                  <option value="Bathroom">Bathroom</option>
                </select>
              </Field>
              <Field label="Image file">
                <input
                  type="file"
                  required
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setFile(e.target.files?.[0])}
                />
              </Field>
              <Field label="Caption">
                <input
                  value={caption}
                  maxLength={200}
                  onChange={(e) => setCaption(e.target.value)}
                />
              </Field>
              {action.feedback}
              <button className="ad-btn gold" disabled={!file || action.busy}>
                <Upload size={17} />
                {action.busy ? "Uploading…" : "Upload photograph"}
              </button>
            </form>
          </div>
        </Modal>
      )}
      {deleting && photo && (
        <Modal
          title="Delete this photograph?"
          onClose={() => !action.busy && setDeleting(false)}
        >
          <div className="admin-app ad-modal-content">
            <p>
              This removes the photo from room {photo.room.number}. Published
              rooms must retain a bedroom and bathroom photo.
            </p>
            {action.feedback}
            <button
              className="ad-btn danger"
              disabled={action.busy}
              onClick={async () => {
                if (
                  await action.run(async () => {
                    await adminApi.deletePhoto(
                      branch!.id,
                      photo.room.id,
                      photo.id,
                    );
                    data.retry();
                  }, "Photograph removed.")
                ) {
                  setSelected(undefined);
                  setDeleting(false);
                }
              }}
            >
              Delete photograph
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

const kinds = [
  { value: "Meal", label: "Meals" },
  { value: "Pool", label: "Pool" },
  { value: "OutdoorActivity", label: "Activities" },
  { value: "Bar", label: "Bar" },
  { value: "Lounge", label: "Lounge" },
];
export function Facilities() {
  const { branch, to } = useAdmin();
  const data = useData(
    () => (branch ? adminApi.offerings(branch.id) : Promise.resolve([])),
    [branch?.id],
  );
  const [kind, setKind] = useState("all");
  const [visibility, setVisibility] = useState("");
  const [search, setSearch] = useState("");
  const offerings = (data.data || []).filter(
    (o) =>
      (kind === "all" || o.kind === kind) &&
      (!visibility || o.isPublished === (visibility === "published")) &&
      matches(o.name + " " + o.description, search),
  );
  const paged = usePagination(offerings, kind + visibility + search, 9);
  return (
    <>
      <PageTitle
        title="Kitchen & facilities"
        description="Keep your dining and leisure offerings up to date."
      >
        {branch && (
          <Link className="ad-btn gold" to={to("facilities/new")}>
            <Plus size={18} />
            Add offering
          </Link>
        )}
      </PageTitle>
      <Tabs
        value={kind}
        onChange={setKind}
        items={[{ value: "all", label: "All" }, ...kinds]}
      />
      <div className="ad-filterbar">
        <SearchBox
          value={search}
          onChange={setSearch}
          placeholder="Search offerings"
        />
        <label className="ad-field">
          <span className="sr-only">Visibility</span>
          <select
            value={visibility}
            onChange={(e) => setVisibility(e.target.value)}
          >
            <option value="">Visibility: All</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </label>
      </div>
      <ErrorBox error={data.error} retry={data.retry} />
      {data.loading ? (
        <Loading />
      ) : (
        <>
          <div className="ad-offering-grid">
            {paged.rows.map((o) => (
              <article className="ad-offering" key={o.id}>
                <Photo src={o.imageUrl} alt={o.name} />
                <div>
                  <Badge>
                    {kinds.find((k) => k.value === o.kind)?.label || o.kind}
                  </Badge>
                  <h3>{o.name}</h3>
                  <p>
                    {o.price != null
                      ? money(o.price, o.currencyCode)
                      : o.openingHours}
                  </p>
                  <div className="ad-card-heading">
                    <Badge tone={o.isPublished ? "green" : "gold"}>
                      {o.isPublished ? "Published" : "Draft"}
                    </Badge>
                    <Link
                      className="ad-btn small"
                      to={to("facilities/" + o.id)}
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {!offerings.length && (
            <Card>
              <EmptyState title="No offerings found">
                <p>
                  Add meals, pools, activities, bars and lounges to this branch.
                </p>
              </EmptyState>
            </Card>
          )}
          {paged.controls}
        </>
      )}
    </>
  );
}

export function FacilityEditor() {
  const { id } = useParams();
  const { branch, to } = useAdmin();
  const data = useData(
    () => (id && branch ? adminApi.offerings(branch.id) : Promise.resolve([])),
    [branch?.id, id],
  );
  if (!branch) return <EmptyState title="Choose a branch first" />;
  if (data.loading) return <Loading />;
  if (data.error) return <ErrorBox error={data.error} retry={data.retry} />;
  const offering = data.data?.find((o) => o.id === Number(id));
  if (id && !offering)
    return (
      <EmptyState title="Offering not found">
        <Link to={to("facilities")}>Back to facilities</Link>
      </EmptyState>
    );
  return (
    <OfferingForm
      key={id || "new"}
      id={offering?.id}
      initial={
        offering || {
          name: "",
          kind: "Meal",
          description: "",
          openingHours: "",
          price: null,
          imageUrl: "",
          isPublished: false,
        }
      }
    />
  );
}

function OfferingForm({
  id,
  initial,
}: {
  id?: number;
  initial: OfferingInput;
}) {
  const { branch, to } = useAdmin();
  const navigate = useNavigate();
  const action = useAction();
  const upload = useAction();
  const [form, setForm] = useState<OfferingInput>({
    name: initial.name,
    kind: initial.kind,
    description: initial.description,
    openingHours: initial.openingHours,
    price: initial.price,
    imageUrl: initial.imageUrl,
    isPublished: initial.isPublished,
  });
  const [baseline] = useState(JSON.stringify(form));
  const dirty = baseline !== JSON.stringify(form);
  useDirtyGuard(dirty);
  const [deleting, setDeleting] = useState(false);
  const set = <K extends keyof OfferingInput>(
    key: K,
    value: OfferingInput[K],
  ) => setForm((f) => ({ ...f, [key]: value }));
  return (
    <>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await action.run(async () => {
            await adminApi.saveOffering(branch!.id, id, form);
            navigate(to("facilities"));
          }, "Offering saved.");
        }}
      >
        <PageTitle
          title={id ? "Edit offering" : "Add offering"}
          description="Bring the best of your hotel to your guests."
        >
          <button
            type="button"
            className="ad-btn"
            onClick={() => {
              if (!dirty || window.confirm("Discard unsaved offering changes?"))
                navigate(to("facilities"));
            }}
          >
            Cancel
          </button>
          <button className="ad-btn gold" disabled={action.busy || upload.busy}>
            {action.busy ? "Saving…" : "Save changes"}
          </button>
        </PageTitle>
        {action.feedback}
        <div className="ad-columns editor">
          <div className="ad-stack">
            <Card title="Offering details">
              <Field label="Name">
                <input
                  required
                  maxLength={150}
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                />
              </Field>
              <Field label="Type">
                <select
                  value={form.kind}
                  onChange={(e) => set("kind", e.target.value)}
                >
                  {kinds.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Description">
                <textarea
                  required
                  maxLength={2000}
                  rows={4}
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                />
              </Field>
              <Field
                label={"Price (" + branch?.currencyCode + ")"}
                hint="Leave blank when pricing does not apply."
              >
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.price ?? ""}
                  onChange={(e) =>
                    set(
                      "price",
                      e.target.value === "" ? null : Number(e.target.value),
                    )
                  }
                />
              </Field>
              <Field label="Opening hours">
                <input
                  required
                  maxLength={300}
                  placeholder="e.g. Daily, 12:00–21:00"
                  value={form.openingHours}
                  onChange={(e) => set("openingHours", e.target.value)}
                />
              </Field>
            </Card>
            <Card title="Photograph">
              <div className="ad-preview-image">
                <Photo
                  src={form.imageUrl}
                  alt={form.name || "Offering photograph"}
                />
              </div>
              <Field label="Upload photograph">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={upload.busy}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    await upload.run(async () => {
                      validImage(file);
                      const result = await adminApi.uploadImage(
                        branch!.id,
                        file,
                      );
                      set("imageUrl", result.url);
                    }, "Photograph uploaded. Save the offering to publish this change.");
                    e.target.value = "";
                  }}
                />
              </Field>
              <Field
                label="Or image URL"
                hint="Use HTTPS or an uploaded /uploads/ path."
              >
                <input
                  maxLength={1000}
                  value={form.imageUrl}
                  onChange={(e) => set("imageUrl", e.target.value)}
                />
              </Field>
              {upload.feedback}
            </Card>
          </div>
          <div className="ad-stack">
            <Card title="Publication">
              <Field label="Branch">
                <input readOnly value={branch?.name} />
              </Field>
              <Toggle
                label="Published on website"
                description="Make this offering visible to guests"
                checked={form.isPublished}
                onChange={(v) => set("isPublished", v)}
              />
            </Card>
            <Card title="Guest preview">
              <div className="ad-preview-image">
                <Photo src={form.imageUrl} alt={form.name} />
              </div>
              <h3>{form.name || "Your offering"}</h3>
              {form.price != null && (
                <strong className="ad-gold">
                  {money(form.price, branch?.currencyCode)}
                </strong>
              )}
              <p>{form.description}</p>
              <small>{form.openingHours}</small>
            </Card>
            {id && (
              <button
                type="button"
                className="ad-btn danger full"
                onClick={() => setDeleting(true)}
              >
                <Trash2 size={16} />
                Delete offering
              </button>
            )}
          </div>
        </div>
      </form>
      {deleting && (
        <Modal
          title="Delete this offering?"
          onClose={() => !action.busy && setDeleting(false)}
        >
          <div className="admin-app ad-modal-content">
            <p>
              {form.name} will be removed from this branch and the public
              website.
            </p>
            {action.feedback}
            <button
              className="ad-btn danger"
              disabled={action.busy}
              onClick={() =>
                action.run(async () => {
                  await adminApi.deleteOffering(branch!.id, id!);
                  navigate(to("facilities"));
                }, "Offering deleted.")
              }
            >
              Delete offering
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
