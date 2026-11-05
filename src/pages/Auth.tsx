import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { api, ApiError, DEMO, getSession, sameSession } from "../api";
import { adminApi } from "../admin/api";
import { useHotel } from "../context";
import { useImagery, useRooms } from "../hooks";
import { passwordErrors, safeReturn } from "../stay";
import {
  ArrowRight,
  ErrorBox,
  Link,
  Photo,
  StaySummary,
  Steps,
  useGo,
} from "../components";
export function Auth({ register = false }: { register?: boolean }) {
  const { stay, notify, auth } = useHotel();
  const photos = useImagery();
  const rooms = useRooms(stay, true);
  const go = useGo();
  const loc = useLocation();
  const requestedReturnTo = new URLSearchParams(loc.search).get("returnTo");
  const returnTo = safeReturn(requestedReturnTo);
  const [show, setShow] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [values, setValues] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmation: "",
  });
  const change = (name: keyof typeof values, value: string) =>
    setValues((v) => ({ ...v, [name]: value }));
  const field = (
    name: keyof typeof values,
    label: string,
    type = "text",
    autocomplete?: string,
  ) => (
    <label className="form-field" htmlFor={name}>
      {label}
      <div className="input-wrap">
        <input
          id={name}
          name={name}
          type={
            name === "password"
              ? show
                ? "text"
                : "password"
              : name === "confirmation"
                ? showConfirm
                  ? "text"
                  : "password"
                : type
          }
          autoComplete={autocomplete}
          value={values[name]}
          onChange={(e) => change(name, e.target.value)}
          maxLength={
            name === "firstName" || name === "lastName" ? 100 : undefined
          }
          aria-invalid={!!errors[name]}
          aria-describedby={
            errors[name]
              ? name + "-error"
              : name === "password" && register
                ? "password-hint"
                : undefined
          }
        />
        {(name === "password" || name === "confirmation") && (
          <button
            type="button"
            className="password-toggle"
            onClick={() =>
              name === "password"
                ? setShow(!show)
                : setShowConfirm(!showConfirm)
            }
            aria-label={
              (name === "password" ? show : showConfirm)
                ? "Hide " + label.toLowerCase()
                : "Show " + label.toLowerCase()
            }
          >
            {(name === "password" ? show : showConfirm) ? (
              <EyeOff size={18} />
            ) : (
              <Eye size={18} />
            )}
          </button>
        )}
      </div>
      {errors[name] && (
        <small className="field-error" id={name + "-error"}>
          {errors[name]}
        </small>
      )}
    </label>
  );
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const errs: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim()))
      errs.email = "Enter a valid email address.";
    if (!values.password) errs.password = "Enter your password.";
    if (register) {
      if (!values.firstName.trim()) errs.firstName = "Enter your first name.";
      if (!values.lastName.trim()) errs.lastName = "Enter your last name.";
      const passwordError = passwordErrors(values.password);
      if (passwordError) errs.password = passwordError;
      if (values.password !== values.confirmation)
        errs.confirmation = "Your passwords do not match.";
    }
    setErrors(errs);
    setError(undefined);
    if (Object.keys(errs).length) {
      document
        .querySelector<HTMLInputElement>('[aria-invalid="true"]')
        ?.focus();
      return;
    }
    setBusy(true);
    try {
      if (register) {
        await api.register({
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          email: values.email.trim(),
          password: values.password,
        });
        setValues((v) => ({ ...v, password: "", confirmation: "" }));
        notify(
          "Your account has been created. Sign in to continue with your selected stay.",
        );
        go("/login?returnTo=" + encodeURIComponent(returnTo), true);
      } else {
        await api.login(values.email.trim(), values.password);
        setValues((v) => ({ ...v, password: "" }));
        if (requestedReturnTo !== returnTo) {
          const session = getSession();
          try {
            await adminApi.me();
            if (sameSession(getSession(), session)) go("/admin", true);
            return;
          } catch (e) {
            if (!(e instanceof ApiError) || e.status !== 403) throw e;
            if (!sameSession(getSession(), session)) return;
          }
        }
        notify("Welcome back. Your selected stay is ready to review.");
        go(returnTo, true);
      }
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {stay.roomIds.length > 0 && <Steps step={2} />}
      <section className="auth-layout">
        <div className="auth-image">
          <Photo
            src={rooms.data?.[0]?.photos[0]?.url || photos.hero}
            alt="A welcoming hotel bedroom"
            eager
          />
          <div>
            <span className="eyebrow light">MAKE YOURSELF AT HOME</span>
            <h2>
              A warmer welcome.
              <br />
              Every time.
            </h2>
            <p>Your next chapter in Warri starts here.</p>
          </div>
        </div>
        <div className="auth-main">
          <div className="auth-form">
            <span className="eyebrow">
              {register ? "YOUR FIRST IGES STAY" : "GOOD TO HAVE YOU BACK"}
            </span>
            <h1>
              {register ? (
                <>
                  Your first stay
                  <br />
                  starts here.
                </>
              ) : (
                <>
                  Welcome
                  <br />
                  <em>back.</em>
                </>
              )}
            </h1>
            <p>
              {register
                ? "Create your account and take the next step towards your stay."
                : "Sign in to continue your stay or manage your reservations."}
            </p>
            {auth && (
              <p className="info-note">
                You’re already signed in.{" "}
                <Link to={returnTo}>Continue to your stay →</Link>
              </p>
            )}
            {DEMO && (
              <p className="info-note">
                Account submissions are disabled in this design preview. No
                account will be created.
              </p>
            )}
            <ErrorBox error={error} />
            {Object.keys(errors).length > 0 && (
              <div role="alert" className="field-summary">
                Please correct the highlighted fields below.
              </div>
            )}
            <form onSubmit={submit} noValidate>
              {register && (
                <div className="form-grid">
                  {field("firstName", "First name", "text", "given-name")}
                  {field("lastName", "Last name", "text", "family-name")}
                </div>
              )}
              {field("email", "Email address", "email", "email")}
              {field(
                "password",
                "Password",
                "password",
                register ? "new-password" : "current-password",
              )}
              {register ? (
                <>
                  <p className="fine-print" id="password-hint">
                    At least 6 characters, with uppercase and lowercase letters,
                    a number and a symbol.
                  </p>
                  {field(
                    "confirmation",
                    "Confirm password",
                    "password",
                    "new-password",
                  )}
                  <p className="fine-print">
                    Before creating your account, please review our{" "}
                    <Link to="/privacy">privacy information</Link> and{" "}
                    <Link to="/terms">booking policies</Link>.
                  </p>
                </>
              ) : (
                <Link className="forgot-link" to="/forgot-password">
                  Forgot your password?
                </Link>
              )}
              <button
                className="button gold w-full"
                type="submit"
                disabled={busy || DEMO}
              >
                {busy
                  ? "Please wait…"
                  : register
                    ? "Create account & continue"
                    : "Sign in & continue"}
                <ArrowRight size={17} />
              </button>
            </form>
            <div className="auth-switch">
              {register
                ? "Already booked with us?"
                : "Your first stay with us?"}{" "}
              <Link
                to={
                  (register ? "/login" : "/register") +
                  "?returnTo=" +
                  encodeURIComponent(returnTo)
                }
              >
                {register ? "Sign in" : "Create an account"}
              </Link>
            </div>
            <p className="fine-print inline">
              <LockKeyhole size={14} /> Your selected stay is preserved through
              sign-in.
            </p>
          </div>
        </div>
        {stay.roomIds.length > 0 && (
          <div className="auth-summary">
            <StaySummary rooms={rooms.data || []} />
          </div>
        )}
      </section>
    </>
  );
}
