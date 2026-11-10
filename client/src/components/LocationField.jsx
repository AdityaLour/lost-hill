import { useEffect, useId, useRef, useState } from "react";

// Picks a place two ways: the browser's location, or live suggestions while typing
// (Photon, an OpenStreetMap search built for type-ahead). Nominatim is used only to
// turn GPS coordinates into an address, once per tap.

const PHOTON = "https://photon.komoot.io/api/";
const MIN_CHARS = 3;
const WAIT_MS = 300;

function labelFor(properties) {
  const street = [properties.street, properties.housenumber].filter(Boolean).join(" ");
  const parts = [properties.name, street, properties.district, properties.city, properties.state, properties.country];
  return [...new Set(parts.filter(Boolean))].join(", ");
}

export default function LocationField({ value, onChange, error }) {
  const listId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [active, setActive] = useState(-1);
  const [status, setStatus] = useState("");
  const cache = useRef(new Map());
  const skipNext = useRef(false);

  useEffect(() => {
    // Picking a suggestion sets the text, which must not trigger another search.
    if (skipNext.current) {
      skipNext.current = false;
      return undefined;
    }

    const text = query.trim();
    setActive(-1);

    if (text.length < MIN_CHARS) {
      setResults([]);
      setStatus("");
      return undefined;
    }

    if (cache.current.has(text)) {
      setResults(cache.current.get(text));
      setStatus("");
      return undefined;
    }

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setStatus("Searching…");

      try {
        const response = await fetch(`${PHOTON}?q=${encodeURIComponent(text)}&limit=6&lang=en`, {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("search failed");

        const data = await response.json();
        const places = (data.features || [])
          .map((feature) => ({
            id: `${feature.properties.osm_type}${feature.properties.osm_id}`,
            lng: feature.geometry.coordinates[0],
            lat: feature.geometry.coordinates[1],
            label: labelFor(feature.properties),
          }))
          .filter((place) => place.label);

        cache.current.set(text, places);
        setResults(places);
        setStatus(places.length ? "" : "No places found. Try a nearby landmark or the area name.");
      } catch (error) {
        if (error.name !== "AbortError") {
          setStatus("Place search is not reachable right now. Use your location instead.");
        }
      }
    }, WAIT_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  function choose(place) {
    skipNext.current = true;
    setQuery(place.label);
    setResults([]);
    setActive(-1);
    onChange({ lat: place.lat, lng: place.lng, address: place.label, source: "search" });
  }

  function onKeyDown(event) {
    if (event.key === "ArrowDown" && results.length) {
      event.preventDefault();
      setActive((index) => (index + 1) % results.length);
    } else if (event.key === "ArrowUp" && results.length) {
      event.preventDefault();
      setActive((index) => (index <= 0 ? results.length - 1 : index - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (results.length) choose(results[active >= 0 ? active : 0]);
    } else if (event.key === "Escape") {
      setResults([]);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setStatus("This browser cannot share its location. Type a place instead.");
      return;
    }

    setStatus("Finding you…");

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        let address = `Near ${coords.latitude.toFixed(3)}, ${coords.longitude.toFixed(3)}`;

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.latitude}&lon=${coords.longitude}`,
          );
          const data = await response.json();
          if (data.display_name) address = data.display_name;
        } catch {
          // Keep the coordinates-only label.
        }

        skipNext.current = true;
        setQuery("");
        setResults([]);
        onChange({ lat: coords.latitude, lng: coords.longitude, address, source: "gps" });
        setStatus("");
      },
      () => setStatus("Location was blocked. Type a place instead."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <fieldset className="chips" style={{ display: "block" }}>
      <legend className="legend">Where was it?</legend>

      <button className="btn btn--small" type="button" onClick={useMyLocation}>
        Use my location
      </button>

      <div className="combo" style={{ marginTop: 12 }}>
        <label className="sr-only" htmlFor="place">
          Search for a place
        </label>
        <div className="search">
          <input
            id="place"
            className="input"
            type="text"
            role="combobox"
            autoComplete="off"
            aria-invalid={Boolean(error)}
            aria-expanded={results.length > 0}
            aria-controls={listId}
            aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
            placeholder="Start typing a station, street, café, area…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
          />
        </div>

        {results.length > 0 && (
          <ul className="places places--live" id={listId} role="listbox">
            {results.map((place, index) => (
              <li key={place.id} id={`${listId}-${index}`} role="option" aria-selected={index === active}>
                <button
                  type="button"
                  className={index === active ? "is-active" : ""}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => choose(place)}
                >
                  {place.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {status && (
        <p className="hint" role="status">
          {status}
        </p>
      )}

      {error && (
        <small className="field-error" role="alert">
          {error}
        </small>
      )}

      {value && <p className="picked">Selected: {value.address}</p>}
    </fieldset>
  );
}
