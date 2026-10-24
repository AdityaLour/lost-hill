import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { api, CATEGORIES } from "../api.js";
import { useAuth } from "../auth.jsx";
import LocationField from "../components/LocationField.jsx";
import SignInPrompt from "../components/SignInPrompt.jsx";

export function PostChooser() {
  return (
    <div className="page">
      <h1 className="page-title">What happened?</h1>
      <p className="lede">Pick one. It takes about a minute either way.</p>
      <div className="doors">
        <Link className="door door--solid" to="/post/lost">
          <p>You lost something</p>
          <h2>Lost</h2>
        </Link>
        <Link className="door" to="/post/found">
          <p>You found something</p>
          <h2>Found</h2>
        </Link>
      </div>
    </div>
  );
}

const today = () => new Date().toISOString().slice(0, 10);

export default function Post() {
  const { type } = useParams();
  const { user, ready } = useAuth();
  const navigate = useNavigate();

  const [category, setCategory] = useState("");
  const [details, setDetails] = useState("");
  const [date, setDate] = useState(today());
  const [place, setPlace] = useState(null);
  const [files, setFiles] = useState([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  if (type !== "lost" && type !== "found") return <Navigate to="/post" replace />;
  if (!ready) return null;

  const found = type === "found";

  if (!user) {
    return (
      <div className="page">
        <h1 className="page-title">{found ? "I found something" : "I lost something"}</h1>
        <SignInPrompt title="Sign in first">
          We use Google so every report belongs to a real person. That is how we keep the shelf honest.
        </SignInPrompt>
      </div>
    );
  }

  function pickFiles(event) {
    const chosen = Array.from(event.target.files).slice(0, 3);
    const tooBig = chosen.find((file) => file.size > 10 * 1024 * 1024);

    if (tooBig) {
      setError(`${tooBig.name} is over 10 MB. Choose a smaller photo.`);
      return;
    }

    setError("");
    setFiles(chosen);
  }

  async function submit(event) {
    event.preventDefault();
    setError("");

    if (!category) return setError("Pick a category.");
    if (!place) return setError("Choose where it was: use your location or search for a place.");
    if (found && files.length === 0) return setError("Add at least one photo so the owner can recognise it.");

    const form = new FormData();
    form.set("category", category);
    form.set("details", details);
    form.set("date", date);
    form.set("lat", place.lat);
    form.set("lng", place.lng);
    form.set("address", place.address);
    form.set("source", place.source);
    files.forEach((file) => form.append("images", file));

    setBusy(true);

    try {
      const data = await api.createItem(type, form);
      navigate(`/item/${type}/${data.item.id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <h1 className="page-title">{found ? "I found something" : "I lost something"}</h1>
      <p className="lede" style={{ marginBottom: 32 }}>
        {found
          ? "Describe it without giving away everything. Owners will have to prove what only they know."
          : "The more exact you are, the better the match: colour, brand, marks, what was inside."}
      </p>

      <form className="form" onSubmit={submit} noValidate>
        {error && (
          <p className="notice notice--error" role="alert">
            {error}
          </p>
        )}

        <fieldset className="chips">
          <legend className="legend">What is it?</legend>
          {CATEGORIES.map((name) => (
            <label className="chip" key={name}>
              <input type="radio" name="category" value={name} checked={category === name} onChange={() => setCategory(name)} />
              <span>{name}</span>
            </label>
          ))}
        </fieldset>

        <label className="field">
          <span>Describe it</span>
          <textarea
            className="textarea"
            required
            minLength={10}
            maxLength={1000}
            value={details}
            onChange={(event) => setDetails(event.target.value)}
            placeholder="Black leather wallet, a small tear near the zip, three cards and a bus pass."
          />
          <small className="hint">At least 10 characters. Do not include your phone number here.</small>
        </label>

        <label className="field">
          <span>{found ? "Date found" : "Date lost"}</span>
          <input className="input" type="date" required max={today()} value={date} onChange={(event) => setDate(event.target.value)} style={{ maxWidth: 240 }} />
        </label>

        <LocationField value={place} onChange={setPlace} />

        <label className="field">
          <span>
            Photos {found ? "(required)" : "(optional, but they help matching)"}
          </span>
          <input className="input" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={pickFiles} style={{ paddingTop: 12 }} />
          <small className="hint">Up to 3 photos, 10 MB each. JPG, PNG or WebP.</small>
          {previews.length > 0 && (
            <div className="previews">
              {previews.map((src, index) => (
                <img key={src} src={src} alt={`Selected photo ${index + 1}`} />
              ))}
            </div>
          )}
        </label>

        <button className="btn btn--solid" type="submit" disabled={busy}>
          {busy ? "Posting…" : "Post report"}
        </button>
      </form>
    </div>
  );
}
