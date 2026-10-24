import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api, CATEGORIES } from "../api.js";
import Ticket from "../components/Ticket.jsx";

const TYPES = [
  ["", "All"],
  ["found", "Found"],
  ["lost", "Lost"],
];

export default function Browse() {
  const [params, setParams] = useSearchParams();
  const type = params.get("type") || "";
  const category = params.get("category") || "";
  const q = params.get("q") || "";
  const near = params.get("near") || "";

  const [draft, setDraft] = useState(q);
  const [items, setItems] = useState(null);
  const [error, setError] = useState("");
  const [geoMessage, setGeoMessage] = useState("");

  useEffect(() => {
    let current = true;
    setItems(null);
    setError("");

    api
      .items({ type, category, q, near, limit: 48 })
      .then((data) => current && setItems(data.items))
      .catch((err) => current && setError(err.message));

    return () => {
      current = false;
    };
  }, [type, category, q, near]);

  function update(changes) {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next, { replace: true });
  }

  function toggleNear() {
    if (near) return update({ near: "" });

    if (!navigator.geolocation) return setGeoMessage("This browser cannot share its location.");

    setGeoMessage("Finding you…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setGeoMessage("");
        update({ near: `${coords.latitude.toFixed(4)},${coords.longitude.toFixed(4)}` });
      },
      () => setGeoMessage("Location was blocked."),
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">The shelf</h1>
      <p className="lede">Every open report, newest first. Open one to claim it, or to see the matches for your own.</p>

      <div className="filters">
        <div className="tabs" role="group" aria-label="Lost or found">
          {TYPES.map(([value, label]) => (
            <button key={label} type="button" aria-pressed={type === value} onClick={() => update({ type: value })}>
              {label}
            </button>
          ))}
        </div>

        <label className="field">
          <span>Category</span>
          <select className="select" value={category} onChange={(event) => update({ category: event.target.value })}>
            <option value="">Any</option>
            {CATEGORIES.map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
        </label>

        <form
          className="field grow"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            update({ q: draft.trim() });
          }}
        >
          <label htmlFor="shelf-q">
            <span>Search</span>
          </label>
          <div className="search">
            <input
              id="shelf-q"
              className="input"
              type="search"
              placeholder="wallet, keys, station…"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <button className="btn btn--solid" type="submit">
              Search
            </button>
          </div>
        </form>

        <button className="btn" type="button" aria-pressed={Boolean(near)} onClick={toggleNear}>
          {near ? "Near me: on" : "Near me"}
        </button>
      </div>

      {geoMessage && (
        <p className="hint" role="status">
          {geoMessage}
        </p>
      )}
      {error && (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      )}
      {!items && !error && <p role="status">Loading the shelf…</p>}

      {items && items.length === 0 && (
        <div className="empty">
          <h2>Nothing here yet</h2>
          <p style={{ marginBottom: 20 }}>No open reports match. Post yours, so a match can find you.</p>
          <div className="cta-row">
            <Link className="btn btn--solid" to="/post/lost">
              I lost something
            </Link>
            <Link className="btn" to="/post/found">
              I found something
            </Link>
          </div>
        </div>
      )}

      {items && items.length > 0 && (
        <ul className="shelf">
          {items.map((item) => (
            <li key={`${item.type}-${item.id}`}>
              <Ticket item={item} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
