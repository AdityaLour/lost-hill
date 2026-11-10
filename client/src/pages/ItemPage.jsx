import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { api, tagNumber, timeAgo } from "../api.js";
import { useAuth } from "../auth.jsx";
import PhoneForm from "../components/PhoneForm.jsx";
import SignInPrompt from "../components/SignInPrompt.jsx";
import MatchTie from "../motion/MatchTie.jsx";
import Stamp from "../motion/Stamp.jsx";

function ClaimForm({ item, onSent }) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [needsPhone, setNeedsPhone] = useState(!user.phoneNumber);
  const [busy, setBusy] = useState(false);
  const [params] = useSearchParams();
  const [lostItems, setLostItems] = useState([]);
  const [lostId, setLostId] = useState(params.get("lost") || "");

  // Which of your own lost reports is this? The claim then ties the two tags together.
  useEffect(() => {
    api
      .myItems()
      .then((data) => {
        const open = data.items.filter((entry) => entry.type === "lost" && entry.status === "open");
        setLostItems(open);
        setLostId((current) => (current || (open.length === 1 ? open[0].id : "")));
      })
      .catch(() => {});
  }, []);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const data = await api.createClaim(item.id, message, lostId || undefined);
      onSent(data.claim);
    } catch (err) {
      if (err.code === "PHONE_REQUIRED") setNeedsPhone(true);
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (needsPhone) {
    return (
      <div className="panel">
        <h2>One thing first</h2>
        <p style={{ marginBottom: 18 }}>
          Add your phone number so the finder can reach you if they approve your claim.
        </p>
        <PhoneForm submitLabel="Save and continue" onSaved={() => setNeedsPhone(false)} />
      </div>
    );
  }

  return (
    <form className="panel" onSubmit={submit}>
      <h2>This is mine</h2>
      {lostItems.length > 0 && (
        <label className="field">
          <span>Which of your lost reports is this?</span>
          <select className="select" value={lostId} onChange={(event) => setLostId(event.target.value)}>
            <option value="">None of them</option>
            {lostItems.map((entry) => (
              <option key={entry.id} value={entry.id}>
                No. {tagNumber(entry.id)} · {entry.category} · {entry.address.split(",")[0]}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="field">
        <span>Prove it</span>
        <textarea
          className="textarea"
          required
          minLength={10}
          maxLength={500}
          value={message}
          onChange={(event) => { setMessage(event.target.value); setError(""); }}
          placeholder="Something only the owner would know: what is inside, a mark, a sticker, the lock-screen photo."
        />
        <small className="hint">The finder reads this and decides. Your number is not shared until they approve.</small>
        {error && (
          <small className="field-error" role="alert">
            {error}
          </small>
        )}
      </label>
      <button className="btn btn--solid" type="submit" disabled={busy}>
        {busy ? "Sending…" : "Send claim"}
      </button>
    </form>
  );
}

function Finds({ id, category }) {
  const [matches, setMatches] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [round, setRound] = useState(0); // new value each check, so the tie animation replays

  const load = useCallback(async () => {
    setBusy(true);
    setError("");
    try {
      const data = await api.matches(id);
      setMatches(data.matches);
      setRound((n) => n + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }, [id]);

  // Opening your lost report shows what might be yours. Pairs already checked are cached.
  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="finds" aria-labelledby="finds-title">
      <div className="feed-head">
        <h2 id="finds-title">Potential finds</h2>
        <button className="btn" type="button" onClick={load} disabled={busy}>
          {busy ? "Checking…" : "Check again"}
        </button>
      </div>
      <p className="lede" style={{ marginBottom: 28 }}>
        Found items near this report that could be yours, best match first. Open one to claim it.
      </p>

      {error && (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      )}
      {!matches && !error && <p role="status">Looking for matches…</p>}
      {matches && matches.length === 0 && <p>Nothing close yet. New reports arrive daily, and this page checks again each time you open it.</p>}

      {matches && matches.length > 0 && (
        <ul className="finds-list">
          {matches.map((match, index) => (
            <li className="find" key={`${match.item.id}-${round}`}>
              <MatchTie
                percent={match.matchPercentage}
                lost={{ number: tagNumber(id), label: category }}
                found={{ number: tagNumber(match.item.id), label: match.item.category }}
              />
              <div className="find-body">
                {match.item.images[0] && (
                  <img className="find-photo" src={match.item.images[0]} alt={`Photo of the found ${match.item.category.toLowerCase()}`} loading="lazy" />
                )}
                <div>
                  <p>
                    <b>{index === 0 ? "Best match · " : ""}{match.item.category} · No. {tagNumber(match.item.id)}</b>
                  </p>
                  <p className="hint">
                    {match.item.address} · {(match.distanceMeters / 1000).toFixed(1)} km away
                  </p>
                  <p style={{ margin: "8px 0" }}>{match.item.details}</p>
                  {match.reason && <p className="hint">{match.reason}</p>}
                </div>
              </div>
              <Link className="btn btn--solid btn--small" to={`/item/found/${match.item.id}?lost=${id}`}>
                Is this mine? Open it
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function ItemPage() {
  const { type, id } = useParams();
  const { user, ready } = useAuth();
  const [item, setItem] = useState(null);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!ready) return;
    setItem(null);
    api
      .item(type, id)
      .then((data) => setItem(data.item))
      .catch((err) => setError(err.message));
  }, [type, id, ready, user?.id]);

  if (error) {
    return (
      <div className="page">
        <h1 className="page-title">Not found</h1>
        <p className="lede" style={{ marginBottom: 20 }}>
          This report does not exist, or it was closed.
        </p>
        <Link className="btn" to="/browse">
          Back to the shelf
        </Link>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="page">
        <p role="status">Loading…</p>
      </div>
    );
  }

  const found = item.type === "found";

  return (
    <div className="page">
      <p style={{ marginBottom: 12 }}>
        <Link to="/browse">← The shelf</Link>
      </p>

      <div className="item">
        <div className="photos">
          {item.images.length > 0 ? (
            item.images.map((src, index) => (
              <img key={src} src={src} alt={`${item.category} photo ${index + 1}`} loading={index ? "lazy" : "eager"} />
            ))
          ) : (
            <div className="no-photo">No photo with this report</div>
          )}
        </div>

        <div>
          <span className={`stamp ${found ? "" : "stamp--ink"}`}>{found ? "Found" : "Lost"}</span>
          <h1 className="page-title" style={{ marginTop: 18 }}>
            No.&nbsp;{tagNumber(item.id)}
          </h1>
          <p style={{ fontSize: 18 }}>{item.details}</p>

          <dl className="facts">
            <div>
              <dt>Item</dt>
              <dd>{item.category}</dd>
            </div>
            <div>
              <dt>Place</dt>
              <dd>{item.address}</dd>
            </div>
            <div>
              <dt>{found ? "Found" : "Lost"}</dt>
              <dd>{new Date(item.date).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</dd>
            </div>
            <div>
              <dt>Posted</dt>
              <dd>
                {timeAgo(item.createdAt)}
                {item.poster ? ` by ${item.poster.name}` : ""}
              </dd>
            </div>
          </dl>

          {item.status === "claimed" && item.myClaim?.status !== "approved" && (
            <p className="notice">This item has been claimed and handed back.</p>
          )}

          {!user && item.status !== "claimed" && (
            <SignInPrompt title={found ? "Is this yours?" : "Did you find it?"}>
              {found
                ? "Sign in with Google to send a claim. Your phone number stays hidden until the finder approves."
                : "Sign in with Google to post what you found and get matched."}
            </SignInPrompt>
          )}

          {user && item.isOwner && found && (
            <div className="panel">
              <h2>Your report</h2>
              <p style={{ marginBottom: 16 }}>
                {item.pendingClaims
                  ? `${item.pendingClaims} claim${item.pendingClaims === 1 ? "" : "s"} waiting for you.`
                  : "No claims yet. You will see them here."}
              </p>
              <Link className="btn btn--solid" to="/claims">
                Open claims
              </Link>
            </div>
          )}

          {user && !item.isOwner && found && item.myClaim && (
            <div className="panel">
              <div className="panel-head">
                <h2>{{ pending: "Claim sent", approved: "It is yours", rejected: "Not this time" }[item.myClaim.status]}</h2>
                <Stamp key={item.myClaim.status} ink={item.myClaim.status !== "approved"} delay={200} aria-hidden="true">
                  {{ pending: "Waiting", approved: "Approved", rejected: "Declined" }[item.myClaim.status]}
                </Stamp>
              </div>
              <p style={{ marginBottom: 16 }}>
                {item.myClaim.status === "approved"
                  ? "The finder approved your claim. Their number is in your claims."
                  : item.myClaim.status === "rejected"
                    ? "The finder declined this claim."
                    : "The finder will read it and decide. We will show the result in your claims."}
              </p>
              <Link className="btn" to="/claims">
                View my claims
              </Link>
            </div>
          )}

          {user && !item.isOwner && found && !item.myClaim && item.status === "open" && (
            sent ? (
              <div className="panel">
                <div className="panel-head">
                  <h2>Claim sent</h2>
                  <Stamp ink delay={200} aria-hidden="true">
                    Waiting
                  </Stamp>
                </div>
                <p style={{ marginBottom: 16 }}>The finder will read it and decide. We will show the result in your claims.</p>
                <Link className="btn" to="/claims">
                  View my claims
                </Link>
              </div>
            ) : (
              <ClaimForm item={item} onSent={() => setSent(true)} />
            )
          )}

          {user && !item.isOwner && !found && (
            <div className="panel">
              <h2>Found it?</h2>
              <p style={{ marginBottom: 16 }}>
                Post a found report with a photo. If it matches, the owner will send you a claim.
              </p>
              <Link className="btn btn--solid" to="/post/found">
                I found something
              </Link>
            </div>
          )}
        </div>
      </div>

      {user && item.isOwner && !found && <Finds id={item.id} category={item.category} />}
    </div>
  );
}
