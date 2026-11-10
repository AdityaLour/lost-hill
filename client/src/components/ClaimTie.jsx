import { useEffect, useState } from "react";
import { tagNumber } from "../api.js";
import MatchTie from "../motion/MatchTie.jsx";

const key = (id) => `lh.tied.${id}`;

export function hasSeenTie(id) {
  try {
    return localStorage.getItem(key(id)) === "1";
  } catch {
    return false;
  }
}

// The lost tag and the found tag tied together, with APPROVED on the knot. It plays the first
// time you see an approved claim and is shown still after that.
export default function ClaimTie({ claim }) {
  const [seen] = useState(() => hasSeenTie(claim.id));

  useEffect(() => {
    const id = setTimeout(() => {
      try {
        localStorage.setItem(key(claim.id), "1");
      } catch {
        // Private mode: it just plays again next time.
      }
    }, 4000);
    return () => clearTimeout(id);
  }, [claim.id]);

  return (
    <MatchTie
      label="APPROVED"
      instant={seen}
      lost={{ number: claim.lost ? tagNumber(claim.lost.id) : "----", label: claim.lost ? claim.lost.category : "Owner" }}
      found={{ number: tagNumber(claim.item.id), label: claim.item.category }}
    />
  );
}
