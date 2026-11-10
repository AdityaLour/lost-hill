import { useEffect, useRef } from "react";
import Ticket from "../components/Ticket.jsx";
import { prefersReducedMotion } from "./util.js";

// Resting angle per report, from its id: tags pinned by hand are never perfectly straight.
const tilt = (id) => ((parseInt(id.slice(-2), 16) % 9) - 4) * 0.25;

// A grid of tags that pin themselves onto the board as they scroll into view.
export default function Shelf({ items, board = false, mineIds = [] }) {
  const list = useRef(null);

  useEffect(() => {
    const cards = [...list.current.children].filter((li) => !li.dataset.in);

    if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
      cards.forEach((li) => {
        li.dataset.in = "1";
        li.dataset.done = "1";
      });
      return undefined;
    }

    let order = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        order = 0;
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const li = entry.target;
          li.style.setProperty("--i", String(order++ % 8));
          li.dataset.in = "1";
          observer.unobserve(li);
          // Once it has landed, hover should respond without the entrance delay.
          setTimeout(() => {
            li.dataset.done = "1";
          }, 1100);
        }
      },
      { threshold: 0.12 },
    );

    cards.forEach((li) => observer.observe(li));
    return () => observer.disconnect();
  }, [items]);

  return (
    <ul className={board ? "shelf shelf--board" : "shelf"} ref={list}>
      {items.map((item) => (
        <li key={`${item.type}-${item.id}`} style={{ "--tilt": `${tilt(item.id) * (board ? 2 : 1)}deg` }}>
          <Ticket item={item} pin={board} mine={mineIds.includes(item.id)} />
        </li>
      ))}
    </ul>
  );
}
