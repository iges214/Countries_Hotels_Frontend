import { useRef, useState } from "react";
import { request, DEMO } from "../api";
import { useHotel } from "../context";
import { ErrorBox } from "../components";

export function ContactMessage() {
  const { branch } = useHotel();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<unknown>();
  const [form, setForm] = useState({
    senderName: "",
    senderEmail: "",
    subject:
      new URLSearchParams(location.search).get("subject") === "platinum"
        ? "Platinum Suite enquiry"
        : "",
    body: "",
  });
  if (sent)
    return (
      <div className="info-note" role="status">
        <div>
          <h3>Your message has been received.</h3>
          <p>
            The hotel team will review your enquiry. A reservation is only
            created through the booking service.
          </p>
        </div>
      </div>
    );
  return (
    <form
      className="contact-message-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!branch || lock.current) return;
        lock.current = true;
        setBusy(true);
        setError(undefined);
        try {
          await request(`/branches/${branch.id}/messages`, {
            method: "POST",
            body: JSON.stringify(form),
          });
          setSent(true);
        } catch (e) {
          setError(e);
        } finally {
          lock.current = false;
          setBusy(false);
        }
      }}
    >
      <h3>Send us a message</h3>
      <p>For questions about your visit, dining or a special stay.</p>
      <ErrorBox error={error} />
      <div className="form-grid">
        <label className="form-field">
          Your name
          <input
            required
            maxLength={100}
            autoComplete="name"
            value={form.senderName}
            onChange={(e) => setForm({ ...form, senderName: e.target.value })}
          />
        </label>
        <label className="form-field">
          Email address
          <input
            required
            type="email"
            maxLength={254}
            autoComplete="email"
            value={form.senderEmail}
            onChange={(e) => setForm({ ...form, senderEmail: e.target.value })}
          />
        </label>
      </div>
      <label className="form-field">
        Subject
        <input
          required
          maxLength={200}
          value={form.subject}
          onChange={(e) => setForm({ ...form, subject: e.target.value })}
        />
      </label>
      <label className="form-field">
        Message
        <textarea
          required
          maxLength={10000}
          rows={5}
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
        />
      </label>
      <button className="button gold" disabled={busy || !branch || DEMO}>
        {busy ? "Sending…" : "Send message"}
      </button>
      <p className="fine-print">
        Your name, email and message are shared with the hotel team. Please
        avoid sending payment details or sensitive documents.
      </p>
    </form>
  );
}
