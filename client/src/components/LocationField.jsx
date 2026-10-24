import { useState } from "react";

// Picks a place two ways: the browser's location, or a typed search (OpenStreetMap Nominatim).
// Searches only run when the person presses the button, to respect Nominatim's usage policy.
export default function LocationField({ value, onChange }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("");

  function useMyLocation() {
    if (!navigator.geolocation) {
      setStatus("This browser cannot share its location. Search for a place instead.");
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

        onChange({ lat: coords.latitude, lng: coords.longitude, address, source: "gps" });
        setStatus("");
      },
      () => setStatus("Location was blocked. Search for a place instead."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function search(event) {
    event.preventDefault();
    if (!query.trim()) return;

    setStatus("Searching…");
    setResults([]);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(query)}`,
      );
      const data = await response.json();
      setResults(data);
      setStatus(data.length ? "" : "No places found. Try a nearby landmark or the area name.");
    } catch {
      setStatus("Place search is not reachable right now. Use your location instead.");
    }
  }

  return (
    <fieldset className="chips" style={{ display: "block" }}>
      <legend className="legend">Where was it?</legend>

      <button className="btn btn--small" type="button" onClick={useMyLocation}>
        Use my location
      </button>

      <div role="search" style={{ marginTop: 12 }}>
        <label className="sr-only" htmlFor="place">
          Search for a place
        </label>
        <div className="search">
          <input
            id="place"
            className="input"
            type="search"
            placeholder="Station, street, café, area…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && search(event)}
          />
          <button className="btn btn--solid" type="button" onClick={search}>
            Search
          </button>
        </div>
      </div>

      {status && (
        <p className="hint" role="status">
          {status}
        </p>
      )}

      {results.length > 0 && (
        <ul className="places">
          {results.map((place) => (
            <li key={place.place_id}>
              <button
                type="button"
                onClick={() => {
                  onChange({ lat: Number(place.lat), lng: Number(place.lon), address: place.display_name, source: "search" });
                  setResults([]);
                }}
              >
                {place.display_name}
              </button>
            </li>
          ))}
        </ul>
      )}

      {value && <p className="picked">Selected: {value.address}</p>}
    </fieldset>
  );
}
