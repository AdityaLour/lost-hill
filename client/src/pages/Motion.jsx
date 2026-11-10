import { useState } from "react";
import HangingTag from "../motion/HangingTag.jsx";
import MatchTie from "../motion/MatchTie.jsx";
import Shelf from "../motion/Shelf.jsx";
import Stamp from "../motion/Stamp.jsx";
import ClaimTie from "../components/ClaimTie.jsx";

const NOW = Date.now();
const SAMPLE = [
  ["lost", "Wallet", "Brown leather wallet with a metro pass", "Central station"],
  ["found", "Phone", "Black phone, green case, cracked corner", "Park Street"],
  ["found", "Keys", "Three silver keys on a red lanyard", "Library, Block C"],
  ["lost", "Bag", "Navy backpack with a laptop sleeve", "Bus stand"],
  ["found", "Watch", "Steel watch with a black strap", "Market road"],
  ["lost", "Documents", "Blue folder with certificates", "Metro, Gate 2"],
].map(([type, category, details, address], index) => ({
  id: `66a0b0c0d0e0f0a0b0c0d${index}f${index}`,
  type,
  category,
  details,
  address,
  images: [],
  poster: { name: ["Riya", "Aman", "Neha", "Kabir", "Isha", "Dev"][index] },
  createdAt: new Date(NOW - (index + 1) * 3600 * 1000 * 5).toISOString(),
}));

function Block({ n, title, hint, children, onReplay }) {
  return (
    <section className="section motion-block" aria-labelledby={`m${n}`}>
      <div className="feed-head">
        <h2 id={`m${n}`}>
          {n}. {title}
        </h2>
        {onReplay && (
          <button className="btn btn--small" type="button" onClick={onReplay}>
            Replay
          </button>
        )}
      </div>
      <p className="hint" style={{ marginBottom: 24 }}>
        {hint}
      </p>
      {children}
    </section>
  );
}

// Preview of the four motion pieces. Not linked from the menu.
export default function Motion() {
  const [run, setRun] = useState({ tag: 0, stamp: 0, shelf: 0, tie: 0, approved: 0 });
  const again = (name) => () => setRun((r) => ({ ...r, [name]: r[name] + 1 }));

  return (
    <div className="page">
      <h1 className="page-title">Motion</h1>
      <p className="lede">Four pieces, each used on a real screen. Respects "reduce motion" in your system settings.</p>

      <Block n={1} title="Hanging tag" hint="Drops in swinging. Brush it with the mouse, click or tap it, or scroll the page." onReplay={again("tag")}>
        <div className="motion-stage">
          <HangingTag key={run.tag}>
            <div className="claim-tag-wrap">
              <div className="claim-tag tag-shape">
                <span className="hole" aria-hidden="true" />
                <p className="eyebrow">LOST HILL · CLAIM TAG</p>
                <p className="number">No.&nbsp;0417</p>
                <dl>
                  <div>
                    <dt>Item</dt>
                    <dd>Black wallet</dd>
                  </div>
                  <div>
                    <dt>Place</dt>
                    <dd>Central station</dd>
                  </div>
                </dl>
              </div>
            </div>
          </HangingTag>
        </div>
      </Block>

      <Block n={2} title="Stamp slam" hint="Lands with a ring of ink and a thud that shakes the card and swings the tag." onReplay={again("stamp")}>
        <div className="motion-stage motion-stage--stamp" key={run.stamp} data-thud>
          <Stamp big>Found</Stamp>
          <Stamp ink delay={500} style={{ fontSize: 48 }}>
            Approved
          </Stamp>
          <Stamp delay={1000} style={{ fontSize: 48 }}>
            Reply
          </Stamp>
        </div>
      </Block>

      <Block n={3} title="Tags pinned on" hint="Each tag settles at its own slight angle as it scrolls into view. Hover one to straighten it." onReplay={again("shelf")}>
        <Shelf key={run.shelf} items={SAMPLE} />
      </Block>

      <Block n={4} title="The tie" hint="When a match appears, a string pulls the lost tag to the found tag and ties them together." onReplay={again("tie")}>
        <MatchTie key={run.tie} percent={87} lost={{ number: "0417", label: "Wallet" }} found={{ number: "2291", label: "Wallet" }} />
      </Block>

      <Block n={5} title="Approved" hint="When a finder approves your claim, the same tie plays with APPROVED on the knot and the stamp slams. It plays the first time you see it, then stays still." onReplay={again("approved")}>
        <div key={run.approved} data-thud>
          <ClaimTie claim={{ id: `demo-${run.approved}-${Date.now()}`, lost: { id: "66a0b0c0d0e0f0a0b0c0d1f1", category: "Wallet" }, item: { id: "66a0b0c0d0e0f0a0b0c0d6f6", category: "Wallet" } }} />
          <Stamp delay={1600} style={{ marginTop: 16 }}>
            Approved
          </Stamp>
        </div>
      </Block>
    </div>
  );
}
