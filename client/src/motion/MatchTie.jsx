import { prefersReducedMotion, useInView } from "./util.js";

const SLACK = "M110 34 C 190 190, 450 190, 530 34";
const TAUT = "M126 34 C 200 120, 440 120, 514 34";

function TagFace({ x, label, number, kind }) {
  const points = `${x + 28},10 ${x + 132},10 ${x + 160},38 ${x + 160},180 ${x},180 ${x},38`;

  return (
    <>
      <polygon points={points} fill="#c9a468" stroke="#8e6f3c" strokeWidth="2" />
      <circle cx={x + 80} cy="34" r="10" fill="#e9e2d0" stroke="#8e6f3c" strokeWidth="3" />
      <text x={x + 80} y="84" textAnchor="middle" className="tie-kind">
        {kind}
      </text>
      <text x={x + 80} y="130" textAnchor="middle" className="tie-number">
        {number}
      </text>
      <text x={x + 80} y="162" textAnchor="middle" className="tie-label">
        {label}
      </text>
    </>
  );
}

// Two tags tied together by a string. The string draws from one hole to the other,
// pulls both tags toward each other, and a label with the score pops onto the knot.
export default function MatchTie({ percent, label, lost, found, instant = false }) {
  const [ref, seen] = useInView({ threshold: 0.5 });
  const still = prefersReducedMotion() || instant;
  const text = label ?? `${percent}%`;
  const wide = text.length > 5;
  const boxW = wide ? 176 : 128;

  return (
    <div ref={ref} className="tie" role="img" aria-label={`${label ? label : `${percent}% match`}: lost No. ${lost.number} and found No. ${found.number}`}>
      {(seen || still) && (
        <svg viewBox="0 0 640 190" aria-hidden="true" className={still ? "tie-svg tie-svg--still" : "tie-svg"}>
          <g>
            {!still && <animateTransform attributeName="transform" type="translate" from="0 0" to="16 0" begin="1.1s" dur="0.4s" fill="freeze" calcMode="spline" keySplines="0.3 0 0.2 1" keyTimes="0;1" />}
            <g transform={still ? "translate(16 0)" : undefined}>
              <TagFace x={30} {...lost} kind="LOST" />
            </g>
          </g>
          <g>
            {!still && <animateTransform attributeName="transform" type="translate" from="0 0" to="-16 0" begin="1.1s" dur="0.4s" fill="freeze" calcMode="spline" keySplines="0.3 0 0.2 1" keyTimes="0;1" />}
            <g transform={still ? "translate(-16 0)" : undefined}>
              <TagFace x={450} {...found} kind="FOUND" />
            </g>
          </g>

          <path d={still ? TAUT : SLACK} pathLength="1" className="tie-string">
            {!still && <animate attributeName="d" from={SLACK} to={TAUT} begin="1.1s" dur="0.4s" fill="freeze" calcMode="spline" keySplines="0.3 0 0.2 1" keyTimes="0;1" />}
          </path>

          <g className="tie-badge">
            <rect x={320 - boxW / 2} y="72" width={boxW} height="52" fill="#f3eedf" stroke="#1b1a17" strokeWidth="3" />
            <text x="320" y="111" textAnchor="middle" className="tie-percent" style={wide ? { fontSize: 30, letterSpacing: "0.04em" } : undefined}>
              {text}
            </text>
          </g>
        </svg>
      )}
    </div>
  );
}
