import { useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";

// The phone number is a plain profile field. It is not verified, and it is only
// shown to the other person after a claim is approved.
export default function PhoneForm({ onSaved, submitLabel = "Save number" }) {
  const { user, setUser } = useAuth();
  const [value, setValue] = useState(user?.phoneNumber || "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const data = await api.savePhone(value);
      setUser(data.user);
      onSaved?.(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <label className="field">
        <span>Phone number</span>
        <input
          className="input"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+91 98765 43210"
          value={value}
          aria-invalid={Boolean(error)}
          onChange={(event) => { setValue(event.target.value); setError(""); }}
        />
        <small className="hint">
          We do not verify it. It is shown only to the other person, and only after the finder approves a claim.
        </small>
        {error && (
          <small className="field-error" role="alert">
            {error}
          </small>
        )}
      </label>
      <button className="btn btn--solid" type="submit" disabled={busy}>
        {busy ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
