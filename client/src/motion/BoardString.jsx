import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "./util.js";

const RISE = 90;

// A string from the hole of the first tag on the board to the hole of the second, with the
// match score tied on. Only drawn when both tags sit side by side in the same row.
export default function BoardString({ boardRef, label }) {
  const [shape, setShape] = useState(null);
  const sized = useRef("");

  function measure() {
    const board = boardRef.current;
    if (!board) return;

    const [a, b] = board.querySelectorAll(".shelf--board > li");
    if (!a || !b || b.offsetLeft <= a.offsetLeft || Math.abs(b.offsetTop - a.offsetTop) > 160) {
      setShape(null);
      return;
    }

    const ax = a.offsetLeft + a.offsetWidth / 2;
    const ay = a.offsetTop + 27;
    const bx = b.offsetLeft + b.offsetWidth / 2;
    const by = b.offsetTop + 27;
    const key = [ax, ay, bx, by, board.offsetWidth, board.offsetHeight].join();

    if (key === sized.current) return;
    sized.current = key;
    setShape({ ax, ay, bx, by, w: board.offsetWidth, h: board.offsetHeight });
  }

  useLayoutEffect(measure);

  useEffect(() => {
    const board = boardRef.current;
    if (!board || !("ResizeObserver" in window)) return undefined;

    const observer = new ResizeObserver(measure);
    observer.observe(board);
    window.addEventListener("resize", measure);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  if (!shape) return null;

  const { ax, ay, bx, by, w, h } = shape;
  const bxm = (ax + bx) / 2;
  const bym = (ay + by) / 2 - 0.75 * RISE;
  const still = prefersReducedMotion();

  return (
    <svg className={still ? "board-string board-string--still" : "board-string"} width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={`${label} match, tied to your report`}>
      <path d={`M${ax} ${ay} C ${ax} ${ay - RISE}, ${bx} ${by - RISE}, ${bx} ${by}`} pathLength="1" />
      <g transform={`translate(${bxm} ${bym}) rotate(-3)`}>
        <g className="board-string-badge">
          <rect x="-54" y="-24" width="108" height="48" />
          <text x="0" y="12" textAnchor="middle">
            {label}
          </text>
        </g>
      </g>
    </svg>
  );
}
