import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api, tagNumber, timeAgo } from "../api.js";
import { useAuth } from "../auth.jsx";
import PhoneForm from "../components/PhoneForm.jsx";
import SignInPrompt from "../components/SignInPrompt.jsx";

function ClaimForm({ item, onSent }) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [needsPhone, setNeedsPhone] = useState(!user.phoneNumber);
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");

    try {
      const data = await api.createClaim(item.id, message);
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
      {error && (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      )}
      <label className="field">
        <span>Prove it</span>
        <textarea
          className="textarea"
          required
          minLength={10}
          maxLength={500}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Something only the owner would know: what is inside, a mark, a sticker, the lock-screen photo."
        />
        <small className="hint">The finder reads this and decides. Your number is not shared until they approve.</small>
      </label>
      <button className="btn btn--solid" type="submit" disabled={busy}>
        {busy ? "Sending…" : "Send claim"}
      </button>
    </form>
  );
}

function Matches({ id }) {
  const [matches, setMatches] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    setBusy(true);
    setError("");
    try {
      const data = await api.matches(id);
      setMatches(data.matches);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="panel">
      <h2>Possible matches</h2>
      <p style={{ marginBottom: 16 }}>
        We compare this report with found items near it, by description and by photo.
      </p>
      {error && (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      )}
      <button className="btn btn--solid" type="button" onClick={load} disabled={busy}>
        {busy ? "Checking…" : matches ? "Check again" : "Check for matches"}
      </button>

      {matches && matches.length === 0 && <p style={{ marginTop: 16 }}>Nothing close yet. Check back, new reports arrive daily.</p>}

      {matches?.map((match) => (
        <div className="match" key={match.item.id}>
          <p className="pct">{match.matchPercentage}%</p>
          <p>
            <b>
              {match.item.category} · No. {tagNumber(match.item.id)}
            </b>{" "}
            · {(match.distanceMeters / 1000).toFixed(1)} km away
          </p>
          {match.reason && <p>{match.reason}</p>}
          {match.photoReason && match.aiChecked && <p className="hint">Photo: {match.photoReason}</p>}
          <p style={{ marginTop: 10 }}>
            <Link className="btn btn--small" to={`/item/found/${match.item.id}`}>
              Open this report
            </Link>
          </p>
        </div>
      ))}
    </div>
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
  const alreadyClaimed = sent || item.myClaim;

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

          {item.status === "claimed" && (
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

          {user && item.isOwner && !found && <Matches id={item.id} />}

          {user && !item.isOwner && found && item.status === "open" && (
            alreadyClaimed ? (
              <div className="panel">
                <h2>Claim sent</h2>
                <p style={{ marginBottom: 16 }}>
                  The finder will read it and decide. We will show the result in your claims.
                </p>
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
    </div>
  );
}
