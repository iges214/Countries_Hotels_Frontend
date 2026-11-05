import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, Search, Inbox } from "lucide-react";
import { ErrorBox } from "../components";
import { ApiError } from "../api";

export function PageTitle({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="ad-page-title">
      <div>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      <div className="ad-actions">{children}</div>
    </div>
  );
}
export function Card({
  title,
  children,
  className = "",
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={"ad-card " + className}>
      {title && <h2>{title}</h2>}
      {children}
    </section>
  );
}
export function Badge({
  children,
  tone = "",
}: {
  children: ReactNode;
  tone?: string;
}) {
  return <span className={"ad-badge " + tone}>{children}</span>;
}
export function BookingStatus({ status }: { status: string }) {
  return (
    <Badge
      tone={
        status === "Confirmed"
          ? "green"
          : status === "Cancelled"
            ? "red"
            : "gold"
      }
    >
      {status}
    </Badge>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="ad-field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="ad-toggle-row">
      <span>
        <strong>{label}</strong>
        {description && <small>{description}</small>}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span className="ad-switch" aria-hidden="true" />
    </label>
  );
}
export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="ad-empty">
      <Inbox size={30} />
      <h3>{title}</h3>
      {children}
    </div>
  );
}
export function SearchBox({
  value,
  onChange,
  placeholder = "Search",
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  label?: string;
}) {
  return (
    <label className="ad-search">
      <Search size={18} />
      <span className="sr-only">{label || placeholder}</span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
export function Tabs({
  items,
  value,
  onChange,
}: {
  items: { value: string; label: string; count?: number }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="ad-tabs" aria-label="Filter">
      {items.map((t) => (
        <button
          key={t.value}
          className={value === t.value ? "active" : ""}
          aria-pressed={value === t.value}
          onClick={() => onChange(t.value)}
        >
          {t.label}
          {t.count !== undefined && <span>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}
export function usePagination<T>(items: T[], key: string, size = 8) {
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [key]);
  const pages = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(page, pages);
  const controls = (
    <div className="ad-pagination">
      <span>
        {items.length
          ? `Showing ${(current - 1) * size + 1}–${Math.min(current * size, items.length)} of ${items.length}`
          : "0 results"}
      </span>
      <div>
        <button
          aria-label="Previous page"
          disabled={current <= 1}
          onClick={() => setPage(current - 1)}
        >
          <ChevronLeft size={17} />
        </button>
        <span>
          Page {current} of {pages}
        </span>
        <button
          aria-label="Next page"
          disabled={current >= pages}
          onClick={() => setPage(current + 1)}
        >
          <ChevronRight size={17} />
        </button>
      </div>
    </div>
  );
  return { rows: items.slice((current - 1) * size, current * size), controls };
}
export function useAction() {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [success, setSuccess] = useState("");
  async function run(
    action: () => Promise<unknown>,
    message = "Changes saved.",
  ) {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setError(undefined);
    setSuccess("");
    try {
      await action();
      setSuccess(message);
      return true;
    } catch (e) {
      setError(
        e instanceof Error
          ? e
          : new ApiError(500, "The action could not be completed."),
      );
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return {
    busy,
    run,
    error,
    success,
    feedback: (
      <>
        <ErrorBox error={error} />
        {success && (
          <div className="ad-success" role="status">
            {success}
          </div>
        )}
      </>
    ),
  };
}
export const money = (amount: number, currency = "NGN") =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
export const date = (value: string, zone = "Africa/Lagos", time = false) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: zone,
    ...(time ? ({ hour: "2-digit", minute: "2-digit" } as const) : {}),
  }).format(
    new Date(
      value.length === 10
        ? value + "T12:00:00Z"
        : /Z$|[+-]\d\d:\d\d$/.test(value)
          ? value
          : value + "Z",
    ),
  );
export const today = (zone = "Africa/Lagos") =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: zone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export const inHouse = (b: {
  actualCheckInAt: string | null;
  actualCheckOutAt: string | null;
  status: string;
}) => !!b.actualCheckInAt && !b.actualCheckOutAt && b.status !== "Cancelled";
export const matches = (value: string, search: string) =>
  value.toLocaleLowerCase().includes(search.toLocaleLowerCase().trim());
export function validImage(file: File) {
  if (file.size > 5 * 1024 * 1024)
    throw new ApiError(400, "Choose an image smaller than 5 MB.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new ApiError(400, "Choose a JPEG, PNG or WebP image.");
}
export function useDirtyGuard(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);
}
