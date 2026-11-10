import { useEffect } from "react";
import { prefersReducedMotion, useInView } from "./util.js";

// A rubber stamp that slams onto the page when it scrolls into view: it drops in large,
// lands with a ring of ink, shakes whatever it sits on and sets a hanging tag swinging.
export default function Stamp({ children, ink = false, big = false, delay = 0, className = "", style, ...rest }) {
  const [ref, seen] = useInView({ threshold: 0.6 });
  const still = prefersReducedMotion();

  useEffect(() => {
    if (!seen || still) return undefined;

    const el = ref.current;
    const id = setTimeout(() => {
      const target = el.closest("[data-thud]") || el.parentElement;
      if (!target) return;

      target.animate(
        [
          { transform: "translate(0, 0)" },
          { transform: "translate(2px, 4px)" },
          { transform: "translate(-2px, -1px)" },
          { transform: "translate(1px, 1px)" },
          { transform: "translate(0, 0)" },
        ],
        { duration: 300, easing: "ease-out" },
      );
      target.dispatchEvent(new CustomEvent("thud", { bubbles: true }));
    }, delay + 310);

    return () => clearTimeout(id);
  }, [seen, still, delay, ref]);

  const state = still ? "" : seen ? "stamp--slam" : "stamp--wait";

  return (
    <span
      ref={ref}
      className={`stamp ${ink ? "stamp--ink" : ""} ${big ? "stamp--big" : ""} ${state} ${className}`}
      style={{ "--delay": `${delay}ms`, ...style }}
      {...rest}
    >
      {children}
    </span>
  );
}
