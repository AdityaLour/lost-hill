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

function FieldError({ message }) {
  return message ? (
    <small className="field-error" role="alert">
      {message}
    </small>
  ) : null;
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
  const [errors, setErrors] = useState({}); // { category, details, date, place, photo, form }
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
      setFiles([]);
      event.target.value = "";
      fail({ photo: `${tooBig.name} is over 10 MB. Choose a smaller photo.` });
      return;
    }

    clear("photo");
    setFiles(chosen);
  }

  const clear = (name) => setErrors((current) => (current[name] ? { ...current, [name]: undefined } : current));

  // Shows every problem next to its field and jumps to the first one.
  function fail(next) {
    setErrors(next);

    const first = ["category", "details", "date", "place", "photo"].find((name) => next[name]);
    if (first) {
      const target = document.getElementById(`field-${first}`);
      target?.scrollIntoView({ behavior: "smooth", block: "center" });
      target?.querySelector?.("input, textarea")?.focus({ preventScroll: true });
    }
  }

  async function submit(event) {
    event.preventDefault();

    const problems = {};
    if (!category) problems.category = "Pick what it is.";
    if (details.trim().length < 10) problems.details = "Write at least 10 characters: colour, brand, marks, what was inside.";
    if (!date || date > today()) problems.date = "Choose a date that is not in the future.";
    if (!place) problems.place = "Choose where it was: type a place and pick a suggestion, or use your location.";
    if (found && files.length === 0) problems.photo = "Add at least one photo so the owner can recognise it.";

    if (Object.keys(problems).length) return fail(problems);

    setErrors({});

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
      const map = { category: "category", details: "details", date: "date", location: "place", address: "place", photo: "photo" };
      const messages = {
        category: "Pick what it is.",
        details: "Write at least 10 characters.",
        date: "Check the date.",
        place: "Choose where it was.",
        photo: "Add at least one photo.",
      };
      const next = {};
      (err.fields || []).forEach((name) => {
        if (map[name]) next[map[name]] = messages[map[name]];
      });

      if (Object.keys(next).length) fail(next);
      else setErrors({ form: err.message });
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
        <fieldset className="chips" id="field-category" aria-invalid={Boolean(errors.category)}>
          <legend className="legend">What is it?</legend>
          {CATEGORIES.map((name) => (
            <label className="chip" key={name}>
              <input type="radio" name="category" value={name} checked={category === name} onChange={() => { setCategory(name); clear("category"); }} />
              <span>{name}</span>
            </label>
          ))}
          <FieldError message={errors.category} />
        </fieldset>

        <label className="field" id="field-details">
          <span>Describe it</span>
          <textarea
            className="textarea"
            maxLength={1000}
            aria-invalid={Boolean(errors.details)}
            value={details}
            onChange={(event) => { setDetails(event.target.value); clear("details"); }}
            placeholder="Black leather wallet, a small tear near the zip, three cards and a bus pass."
          />
          <small className="hint">At least 10 characters. Do not include your phone number here.</small>
          <FieldError message={errors.details} />
        </label>

        <label className="field" id="field-date">
          <span>{found ? "Date found" : "Date lost"}</span>
          <input className="input" type="date" max={today()} aria-invalid={Boolean(errors.date)} value={date} onChange={(event) => { setDate(event.target.value); clear("date"); }} style={{ maxWidth: 240 }} />
          <FieldError message={errors.date} />
        </label>

        <div id="field-place">
          <LocationField value={place} onChange={(next) => { setPlace(next); clear("place"); }} error={errors.place} />
        </div>

        <label className="field" id="field-photo">
          <span>
            Photos {found ? "(required)" : "(optional, but they help matching)"}
          </span>
          <input className="input" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={pickFiles} style={{ paddingTop: 12 }} />
          <small className="hint">Up to 3 photos, 10 MB each. JPG, PNG or WebP.</small>
          <FieldError message={errors.photo} />
          {previews.length > 0 && (
            <div className="previews">
              {previews.map((src, index) => (
                <img key={src} src={src} alt={`Selected photo ${index + 1}`} />
              ))}
            </div>
          )}
        </label>

        {errors.form && (
          <p className="notice notice--error" role="alert">
            {errors.form}
          </p>
        )}

        <button className="btn btn--solid" type="submit" disabled={busy}>
          {busy ? "Posting…" : "Post report"}
        </button>
      </form>
    </div>
  );
}
