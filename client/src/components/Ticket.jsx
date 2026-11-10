import { Link } from "react-router-dom";
import { tagNumber, timeAgo } from "../api.js";

// One report as a small kraft claim tag.
export default function Ticket({ item, pin = false, mine = false }) {
  const found = item.type === "found";

  return (
    <div className="ticket-wrap">
      <Link className="ticket tag-shape" to={`/item/${item.type}/${item.id}`}>
        <span className="hole" aria-hidden="true" />
        {pin && <span className="pin" aria-hidden="true" />}
        <div className="ticket-top">
          <span className="number">No.&nbsp;{tagNumber(item.id)}</span>
          <span className={`stamp ${found ? "" : "stamp--ink"}`}>{found ? "Found" : "Lost"}</span>
        </div>
        <h3>{item.category}</h3>
        <p className="details">{item.details}</p>
        {item.images[0] && (
          <img className="thumb" src={item.images[0]} alt={`Photo of the ${item.category.toLowerCase()}`} loading="lazy" />
        )}
        <p className="meta">
          {item.address}
          <br />
          {timeAgo(item.createdAt)}
          {mine ? " · yours" : item.poster ? ` · by ${item.poster.name}` : ""}
        </p>
      </Link>
      {mine && (
        <span className="stamp stamp--ink yours" aria-hidden="true">
          Yours
        </span>
      )}
    </div>
  );
}
