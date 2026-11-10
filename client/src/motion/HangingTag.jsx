import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "./util.js";

const REST = 4.5; // degrees: where the tag settles
const clamp = (value, limit) => Math.max(-limit, Math.min(limit, value));

// A tag on a string, simulated as a damped pendulum.
// It drops in swinging, drifts in a light breeze, swings when the mouse brushes it,
// flicks when clicked or tapped, sways when the page scrolls, and swings when a
// child Stamp lands on it (the "thud" event).
export default function HangingTag({ children, drop = true }) {
  const root = useRef(null);

  useEffect(() => {
    const el = root.current;
    if (!el || prefersReducedMotion()) return undefined;

    const s = {
      theta: drop ? REST + 22 : REST,
      omega: 0,
      t: 0,
      last: performance.now(),
      visible: true,
      raf: 0,
      scroll: window.scrollY,
    };

    function frame(now) {
      const dt = Math.min((now - s.last) / 1000, 0.032);
      s.last = now;
      s.t += dt;

      const wind = 6 * Math.sin(s.t * 1.3) + 3 * Math.sin(s.t * 2.1);
      s.omega += (-16 * (s.theta - REST) - 1.2 * s.omega + wind) * dt;
      s.theta += s.omega * dt;
      el.style.transform = `rotate(${s.theta.toFixed(3)}deg)`;

      s.raf = s.visible ? requestAnimationFrame(frame) : 0;
    }

    function start() {
      if (!s.raf) {
        s.last = performance.now();
        s.raf = requestAnimationFrame(frame);
      }
    }

    function kick(amount) {
      s.omega += amount;
      start();
    }

    const onMove = (event) => {
      if (event.pointerType === "mouse") kick(clamp(event.movementX * 1.4, 10));
    };
    const onDown = (event) => {
      const box = el.getBoundingClientRect();
      kick(event.clientX > box.left + box.width / 2 ? 60 : -60);
    };
    const onScroll = () => {
      kick(clamp((window.scrollY - s.scroll) * 0.15, 8));
      s.scroll = window.scrollY;
    };
    const onThud = () => kick(26);

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("thud", onThud);
    window.addEventListener("scroll", onScroll, { passive: true });

    const observer = new IntersectionObserver(([entry]) => {
      s.visible = entry.isIntersecting;
      if (s.visible) start();
    });
    observer.observe(el);

    start();

    return () => {
      cancelAnimationFrame(s.raf);
      observer.disconnect();
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("thud", onThud);
      window.removeEventListener("scroll", onScroll);
    };
  }, [drop]);

  return (
    <div className="hang" ref={root}>
      {children}
    </div>
  );
}
