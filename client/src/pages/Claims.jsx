import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, tagNumber, timeAgo } from "../api.js";
import { useAuth } from "../auth.jsx";
import ClaimTie from "../components/ClaimTie.jsx";
import PhoneForm from "../components/PhoneForm.jsx";
import SignInPrompt from "../components/SignInPrompt.jsx";
import Stamp from "../motion/Stamp.jsx";

function Claim({ claim, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [needsPhone, setNeedsPhone] = useState(false);

  async function decide(action) {
    setBusy(true);
    setError("");

    try {
      await api.decideClaim(claim.id, action);
      onChanged();
    } catch (err) {
      if (err.code === "PHONE_REQUIRED") setNeedsPhone(true);
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const isFinder = claim.role === "finder";
  const stamp = { pending: "Waiting", approved: "Approved", rejected: "Declined" }[claim.status];

  return (
    <article className="claim" data-thud>
      <div className="claim-head">
        <div>
          <h3 style={{ fontSize: 32 }}>
            <Link to={`/item/found/${claim.item.id}`} style={{ textDecoration: "none" }}>
              {claim.item.category} · No. {tagNumber(claim.item.id)}
            </Link>
          </h3>
          <p className="hint">
            {isFinder ? `${claim.other.name} says it is theirs` : `Sent to ${claim.other.name}`} · {timeAgo(claim.createdAt)}
          </p>
        </div>
        <Stamp key={claim.status} ink={claim.status !== "approved"} style={{ fontSize: 20, borderWidth: 3 }}>
          {stamp}
        </Stamp>
      </div>

      {claim.status === "approved" && <ClaimTie claim={claim} />}

      <blockquote>{claim.message}</blockquote>

      {error && (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      )}

      {needsPhone && (
        <div className="panel" style={{ marginBottom: 16 }}>
          <PhoneForm submitLabel="Save number" onSaved={() => setNeedsPhone(false)} />
        </div>
      )}

      {isFinder && claim.status === "pending" && (
        <div className="cta-row">
          <button className="btn btn--solid btn--small" type="button" disabled={busy} onClick={() => decide("approve")}>
            Approve and share numbers
          </button>
          <button className="btn btn--small" type="button" disabled={busy} onClick={() => decide("reject")}>
            Decline
          </button>
        </div>
      )}

      {claim.status === "approved" && claim.contact && (
        <div className="contact">
          <p>
            {isFinder ? "The owner" : "The finder"}: {claim.contact.name}
          </p>
          {claim.contact.phone ? (
            <a href={`tel:${claim.contact.phone.replace(/[^\d+]/g, "")}`}>{claim.contact.phone}</a>
          ) : (
            <p>No number on file. Ask them to add one in their account.</p>
          )}
        </div>
      )}
    </article>
  );
}

export default function Claims() {
  const { user, ready } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api
      .claims()
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  if (!ready) return null;

  if (!user) {
    return (
      <div className="page">
        <h1 className="page-title">Claims</h1>
        <SignInPrompt title="Sign in to see your claims" />
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">Claims</h1>
      <p className="lede" style={{ marginBottom: 32 }}>
        Phone numbers are shared only after a finder approves a claim, and only between those two people.
      </p>

      {error && (
        <p className="notice notice--error" role="alert">
          {error}
        </p>
      )}
      {!data && !error && <p role="status">Loading…</p>}

      {data && (
        <div className="list-grid">
          <section aria-labelledby="received">
            <h2 id="received" style={{ fontSize: 48, marginBottom: 16 }}>
              On items you found
            </h2>
            {data.received.length === 0 && <p>No one has claimed your finds yet.</p>}
            {data.received.map((claim) => (
              <Claim key={claim.id} claim={claim} onChanged={load} />
            ))}
          </section>

          <section aria-labelledby="made">
            <h2 id="made" style={{ fontSize: 48, marginBottom: 16 }}>
              Claims you sent
            </h2>
            {data.made.length === 0 && (
              <p>
                You have not claimed anything. <Link to="/browse?type=found">Browse found items</Link>.
              </p>
            )}
            {data.made.map((claim) => (
              <Claim key={claim.id} claim={claim} onChanged={load} />
            ))}
          </section>
        </div>
      )}
    </div>
  );
}
