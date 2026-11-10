import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, tagNumber } from "../api.js";
import { useAuth } from "../auth.jsx";
import { hasSeenTie } from "../components/ClaimTie.jsx";
import BoardString from "../motion/BoardString.jsx";
import Shelf from "../motion/Shelf.jsx";
import Stamp from "../motion/Stamp.jsx";

const TYPES = [
  ["", "All"],
  ["found", "Found"],
  ["lost", "Lost"],
];
const PAGE = 16;

function Note({ label, rot, children, actions }) {
  return (
    <div className="note" style={{ "--rot": `${rot}deg` }}>
      <span className="tape" aria-hidden="true" />
      <p className="note-label">{label}</p>
      <p className="note-text">{children}</p>
      {actions && <div className="cta-row">{actions}</div>}
    </div>
  );
}

// The signed-in front page: what needs you, then a pinboard of everyone's reports.
// Your newest open lost report is pinned first and, when something matches it, tied to
// the best match with a string.
export default function Home() {
  const { user } = useAuth();
  const board = useRef(null);

  const [mine, setMine] = useState(null);
  const [claims, setClaims] = useState(null);
  const [top, setTop] = useState(null); // best match for your newest open lost report

  const [type, setType] = useState("");
  const [feed, setFeed] = useState(null);
  const [more, setMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let current = true;

    api
      .claims()
      .then((data) => current && setClaims(data))
      .catch(() => current && setClaims({ received: [], made: [] }));

    api
      .myItems()
      .then((data) => {
        if (!current) return;
        setMine(data.items);

        const lost = data.items.find((item) => item.type === "lost" && item.status === "open");
        if (!lost) return;

        // Cached pairs make this cheap. A failure just means no match note.
        api
          .matches(lost.id)
          .then((result) => current && result.matches[0] && setTop({ ...result.matches[0], lost }))
          .catch(() => {});
      })
      .catch(() => current && setMine([]));

    return () => {
      current = false;
    };
  }, []);

  useEffect(() => {
    let current = true;
    setFeed(null);
    setError("");

    api
      .items({ type, limit: PAGE })
      .then((data) => {
        if (!current) return;
        setFeed(data.items);
        setMore(data.items.length >= PAGE);
      })
      .catch((err) => current && setError(err.message));

    return () => {
      current = false;
    };
  }, [type]);

  const loadMore = useCallback(async () => {
    if (!feed || feed.length === 0) return;
    setLoadingMore(true);

    try {
      const data = await api.items({ type, limit: PAGE, before: feed[feed.length - 1].createdAt });
      const known = new Set(feed.map((item) => `${item.type}-${item.id}`));
      const fresh = data.items.filter((item) => !known.has(`${item.type}-${item.id}`));
      setFeed([...feed, ...fresh]);
      setMore(data.items.length >= PAGE && fresh.length > 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingMore(false);
    }
  }, [feed, type]);

  const first = user.name.split(" ")[0];
  const openMine = (mine || []).filter((item) => item.status === "open");
  const newestLost = openMine.find((item) => item.type === "lost");
  const waiting = claims ? claims.received.filter((claim) => claim.status === "pending") : [];
  const approved = claims ? claims.made.find((claim) => claim.status === "approved" && !hasSeenTie(claim.id)) : null;

  // Pinned first: your lost report, then its best match. Then everyone else's, without repeats.
  const pinned = [];
  if (type !== "found" && newestLost) pinned.push(newestLost);
  if (type !== "lost" && top && type === "") pinned.push(top.item);
  const skip = new Set([...openMine.map((item) => item.id), top ? top.item.id : ""]);
  const others = (feed || []).filter((item) => !skip.has(item.id));
  const tags = [...pinned, ...others];
  const tied = type === "" && newestLost && top && pinned.length === 2;

  const notes = [];
  if (waiting.length > 0) {
    const claim = waiting[0];
    notes.push(
      <Note key="waiting" label="WAITING ON YOU" rot={-1.2} actions={<Link className="btn btn--solid btn--small" to="/claims">Review</Link>}>
        <b>{claim.other.name}</b> says the {claim.item.category.toLowerCase()} is theirs: “{claim.message.slice(0, 70)}
        {claim.message.length > 70 ? "…" : ""}”
      </Note>,
    );
  }
  if (approved) {
    notes.push(
      <Note key="approved" label="APPROVED" rot={0.9} actions={<Link className="btn btn--solid btn--small" to="/claims">See the number</Link>}>
        <b>{approved.other.name}</b> says it is yours. The {approved.item.category.toLowerCase()} is on its way back.
      </Note>,
    );
  }
  if (top) {
    notes.push(
      <Note key="match" label="POTENTIAL FIND" rot={0.8} actions={<Link className="btn btn--solid btn--small" to={`/item/lost/${top.lost.id}`}>See potential finds</Link>}>
        <b>No. {tagNumber(top.lost.id)}</b> {top.lost.category}: a found {top.item.category.toLowerCase()} matches at {top.matchPercentage}%.
      </Note>,
    );
  }
  if (!user.phoneNumber) {
    notes.push(
      <Note key="phone" label="YOUR NUMBER" rot={-0.6} actions={<Link className="btn btn--small" to="/me">Add number</Link>}>
        <b>Not added yet.</b> It is shown only after you approve a claim.
      </Note>,
    );
  } else {
    notes.push(
      <Note key="reports" label="YOUR REPORTS" rot={-0.6} actions={<Link className="btn btn--small" to="/me">See all</Link>}>
        <b>{mine ? openMine.length : "…"} open.</b> Everything you posted is on your account page.
      </Note>,
    );
  }

  return (
    <>
      <section className="greeting" aria-labelledby="home-title">
        <div className="greeting-title">
          <h1 id="home-title">Hi, {first}.</h1>
          {waiting.length > 0 && (
            <Stamp delay={600} aria-hidden="true">
              {waiting.length} to answer
            </Stamp>
          )}
        </div>
        <div className="cta-row">
          <Link className="btn btn--solid" to="/post/lost">
            I lost something
          </Link>
          <Link className="btn" to="/post/found">
            I found something
          </Link>
        </div>
      </section>

      <section className="notes" aria-label="For you">
        {notes.slice(0, 3)}
      </section>

      <section className="section" aria-labelledby="board-title">
        <div className="feed-head">
          <h2 id="board-title">The board</h2>
          <div className="tabs" role="group" aria-label="Lost or found">
            {TYPES.map(([value, label]) => (
              <button key={label} type="button" aria-pressed={type === value} onClick={() => setType(value)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="notice notice--error" role="alert">
            {error}
          </p>
        )}
        {!feed && !error && <p role="status">Loading the board…</p>}

        {feed && tags.length === 0 && (
          <div className="empty">
            <h2>Quiet today</h2>
            <p>No open reports yet. Post yours so a match can find you.</p>
          </div>
        )}

        {feed && tags.length > 0 && (
          <div className="board" ref={board}>
            <Shelf board items={tags} mineIds={openMine.map((item) => item.id)} />
            {tied && <BoardString boardRef={board} label={`${top.matchPercentage}%`} />}
          </div>
        )}

        <div className="cta-row" style={{ marginTop: 32 }}>
          {more && (
            <button className="btn" type="button" disabled={loadingMore} onClick={loadMore}>
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          )}
          <Link className="btn" to="/browse">
            Search and filter
          </Link>
        </div>
      </section>
    </>
  );
}
