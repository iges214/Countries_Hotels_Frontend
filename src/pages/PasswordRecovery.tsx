import { useState } from "react";
import { useLocation } from "react-router-dom";
import { api, DEMO, getSession, sameSession, setToken } from "../api";
import { ApiError } from "../api";
import { ErrorBox, Link } from "../components";
import { passwordErrors } from "../stay";

export function PasswordRecovery({ reset = false }: { reset?: boolean }) {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const emailFromLink = params.get("email") || "";
  const token = params.get("token") || "";
  const [email, setEmail] = useState(emailFromLink);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<unknown>();
  const [validation, setValidation] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || DEMO) return;
    setError(undefined);
    setValidation("");
    if (reset) {
      if (!token || !emailFromLink) {
        setError(new ApiError(400, "This password reset link is incomplete. Request a new link to continue."));
        return;
      }
      const passwordError = passwordErrors(password);
      if (passwordError) {
        setValidation(passwordError);
        return;
      }
      if (password !== confirmation) {
        setValidation("Your passwords do not match.");
        return;
      }
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setValidation("Enter a valid email address.");
      return;
    }

    setBusy(true);
    try {
      if (reset) {
        const session = getSession();
        await api.resetPassword(emailFromLink, token, password);
        if (session?.email?.toLowerCase() === emailFromLink.trim().toLowerCase() && sameSession(getSession(), session))
          setToken(null);
        setPassword("");
        setConfirmation("");
        setComplete(true);
      } else {
        await api.forgotPassword(email.trim());
        setSent(true);
      }
    } catch (cause) {
      setError(cause);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="container prose section-pad">
      <div className="eyebrow">ACCOUNT SUPPORT</div>
      <h1>{reset ? "Choose a new password." : "Let’s get you back in."}</h1>
      {DEMO && <p className="info-note">Password recovery is disabled in this design preview.</p>}
      {!reset && sent ? (
        <>
          <div className="info-note" role="status">
            If an account matches that email address, we’ve sent a password reset link. Check your inbox and spam folder.
          </div>
          <Link className="button" to="/login">Back to sign in</Link>
        </>
      ) : reset && complete ? (
        <>
          <div className="info-note" role="status">Your password has been changed. You can now sign in with your new password.</div>
          <Link className="button" to="/login">Sign in</Link>
        </>
      ) : reset && (!token || !emailFromLink) ? (
        <>
          <div role="alert" className="info-note">This password reset link is incomplete. Request a new link to continue.</div>
          <Link className="button" to="/forgot-password">Request a new link</Link>
        </>
      ) : (
        <>
          <p>{reset
            ? "Choose a new password for your account. The password reset link can only be used once."
            : "Enter the email address on your account. If it matches an account, we’ll email you a secure reset link."}</p>
          <ErrorBox error={error} />
          {validation && <div role="alert" className="field-summary">{validation}</div>}
          <form className="auth-form" onSubmit={submit} noValidate>
            {!reset && (
              <label className="form-field" htmlFor="recovery-email">Email address
                <input id="recovery-email" name="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} />
              </label>
            )}
            {reset && <>
              <label className="form-field" htmlFor="new-password">New password
                <input id="new-password" name="new-password" type="password" autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
              </label>
              <p className="fine-print">At least 6 characters, with uppercase and lowercase letters, a number and a symbol.</p>
              <label className="form-field" htmlFor="confirm-password">Confirm new password
                <input id="confirm-password" name="confirm-password" type="password" autoComplete="new-password" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
              </label>
            </>}
            <button className="button gold" type="submit" disabled={busy || DEMO}>
              {busy ? "Please wait…" : reset ? "Reset password" : "Send reset link"}
            </button>
          </form>
          <p>{reset && <><Link to="/forgot-password">Request a new link</Link>{" · "}</>}<Link to="/login">Back to sign in</Link></p>
        </>
      )}
    </section>
  );
}
