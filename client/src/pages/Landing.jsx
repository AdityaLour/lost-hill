import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, tagNumber, timeAgo } from "../api.js";
import Ticket from "../components/Ticket.jsx";

// Shown on the tag until a real found report exists.
const SAMPLE = { number: "0417", item: "Black wallet", place: "Central station", when: "2 hours ago" };

export default function Landing() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    api
      .items({ limit: 6 })
      .then((data) => setRecent(data.items))
      .catch(() => setRecent([]));
  }, []);

  const latestFound = recent.find((item) => item.type === "found");
  const tag = latestFound
    ? {
        number: tagNumber(latestFound.id),
        item: latestFound.category,
        place: latestFound.address.split(",")[0],
        when: timeAgo(latestFound.createdAt),
      }
    : SAMPLE;

  function search(event) {
    event.preventDefault();
    navigate(query.trim() ? `/browse?q=${encodeURIComponent(query.trim())}` : "/browse");
  }

  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <div>
          <h1 id="hero-title">
            Someone
            <br />
            may have
            <br />
            found it.
          </h1>
          <p className="lede">
            Post what you lost or found. Every report gets a number and is checked against the rest. Your phone number
            stays hidden until you say yes.
          </p>
          <div className="cta-row">
            <Link className="btn btn--solid" to="/post/lost">
              I lost something
            </Link>
            <Link className="btn" to="/post/found">
              I found something
            </Link>
          </div>

          <div className="steps">
            <p>
              <b>01 POST</b>What it is, where, a photo.
            </p>
            <p>
              <b>02 MATCH</b>We compare it to every report.
            </p>
            <p>
              <b>03 CLAIM</b>You approve who gets in touch.
            </p>
          </div>
        </div>

        <div className="hang">
          <div className="claim-tag-wrap">
            <div className="claim-tag tag-shape">
              <span className="hole" aria-hidden="true" />
              <p className="eyebrow">LOST HILL · CLAIM TAG</p>
              <p className="number">No.&nbsp;{tag.number}</p>
              <dl>
                <div>
                  <dt>Item</dt>
                  <dd>{tag.item}</dd>
                </div>
                <div>
                  <dt>Place</dt>
                  <dd>{tag.place}</dd>
                </div>
                <div>
                  <dt>When</dt>
                  <dd>{tag.when}</dd>
                </div>
              </dl>
              <form onSubmit={search} role="search">
                <label className="legend" htmlFor="tag-search">
                  Search the shelf
                </label>
                <div className="search">
                  <input
                    id="tag-search"
                    className="input"
                    type="search"
                    placeholder="wallet, keys, bag…"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                  <button className="btn btn--solid" type="submit">
                    Search
                  </button>
                </div>
              </form>
              {!latestFound && <p className="sample">Example tag</p>}
            </div>
            <span className="stamp stamp--big" aria-hidden="true">
              Found
            </span>
          </div>
        </div>
      </section>

      {recent.length > 0 && (
        <section className="section" aria-labelledby="shelf-title">
          <h2 id="shelf-title">On the shelf now</h2>
          <ul className="shelf">
            {recent.map((item) => (
              <li key={`${item.type}-${item.id}`}>
                <Ticket item={item} />
              </li>
            ))}
          </ul>
          <p style={{ marginTop: 28 }}>
            <Link className="btn" to="/browse">
              See every report
            </Link>
          </p>
        </section>
      )}

      <section className="section" id="how" aria-labelledby="how-title">
        <h2 id="how-title">How it works</h2>
        <ol className="how">
          <li>
            <span className="n">01</span>
            <h3>Post it</h3>
            <p>
              Say what it is, where you lost or found it and add a photo. Finders must add a photo so owners can tell
              items apart.
            </p>
          </li>
          <li>
            <span className="n">02</span>
            <h3>We match it</h3>
            <p>
              Lost reports are compared with found ones nearby, by description and by photo, and the likeliest matches
              come first.
            </p>
          </li>
          <li>
            <span className="n">03</span>
            <h3>You approve</h3>
            <p>
              An owner sends a claim describing something only they would know. The finder approves, and only then do
              you both see each other's number.
            </p>
          </li>
        </ol>
      </section>
    </>
  );
}
