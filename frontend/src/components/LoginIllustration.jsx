// Decorative artwork for the login screen (from the design canvas): a month card with
// checked-in days, a clock, a location pin, a check-in badge and a floating status pill.
// Colors come from theme tokens so it works in light and dark mode.

const COLS = [132, 158, 184, 210, 236];
const ROWS = [86, 112, 138, 164];
// c = checked in, n = next day, p = pending (dashed), w = work from home, e = empty
const GRID = ["ccccn", "ccpcc", "wccee", "eeeee"];

function Cell({ kind, x, y }) {
  const box = { x, y, width: 18, height: 18, rx: 5 };
  if (kind === "c") {
    return (
      <>
        <rect {...box} className="fill-accent" />
        <path
          d={`M${x + 5} ${y + 9.5}l3 3l5.5-6`}
          className="fill-none stroke-ill-check"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </>
    );
  }
  if (kind === "w") {
    return (
      <>
        <rect {...box} className="fill-teal" />
        <circle cx={x + 9} cy={y + 9} r="3" className="fill-ill-badge" />
      </>
    );
  }
  if (kind === "p") return <rect {...box} className="fill-none stroke-lavender" strokeWidth="1.4" strokeDasharray="3 2" />;
  return <rect {...box} className={kind === "n" ? "fill-ill-cell-next" : "fill-ill-cell"} />;
}

export function LoginIllustration({ className }) {
  const month = new Date().toLocaleDateString("en-IN", { month: "long", timeZone: "Asia/Kolkata" }).toUpperCase();

  return (
    <svg className={className} viewBox="0 0 340 250" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="login-ill-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#D9CCFF" />
          <stop offset="1" stopColor="#5EE6D0" />
        </linearGradient>
        <linearGradient id="login-ill-card" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="[stop-color:var(--ill-card-top)]" />
          <stop offset="1" className="[stop-color:var(--ill-card-bottom)]" />
        </linearGradient>
        <radialGradient id="login-ill-glow-teal" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="rgb(94 230 208 / 0.45)" />
          <stop offset="1" stopColor="rgb(94 230 208 / 0)" />
        </radialGradient>
        <radialGradient id="login-ill-glow-lavender" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="rgb(160 130 255 / 0.5)" />
          <stop offset="1" stopColor="rgb(160 130 255 / 0)" />
        </radialGradient>
      </defs>

      <ellipse cx="180" cy="128" rx="156" ry="98" className="stroke-ill-orbit" />
      <ellipse cx="180" cy="128" rx="112" ry="70" className="stroke-ill-orbit" strokeDasharray="2 6" />
      <circle cx="200" cy="120" r="110" fill="url(#login-ill-glow-lavender)" />
      <circle cx="272" cy="176" r="60" fill="url(#login-ill-glow-teal)" />

      {/* Month card */}
      <g>
        <rect x="118" y="42" width="150" height="150" rx="22" fill="url(#login-ill-card)" className="stroke-ill-card-stroke" />
        <rect x="148" y="34" width="6" height="16" rx="3" className="fill-lavender" />
        <rect x="232" y="34" width="6" height="16" rx="3" className="fill-lavender" />
        <text x="134" y="68" className="fill-ill-text" fontSize="11" fontWeight="600" letterSpacing="1.2">
          {month}
        </text>
        <circle cx="250" cy="64" r="3" className="fill-teal" />
        <line x1="130" y1="78" x2="256" y2="78" className="stroke-ill-orbit" />
        {GRID.map((row, r) => [...row].map((kind, c) => <Cell key={`${r}-${c}`} kind={kind} x={COLS[c]} y={ROWS[r]} />))}
      </g>

      {/* Clock */}
      <g className="motion-safe:animate-bob-slow [transform-box:fill-box]">
        <circle cx="94" cy="152" r="54" className="fill-ill-badge" stroke="url(#login-ill-ring)" strokeWidth="3" />
        <circle cx="94" cy="152" r="44" className="stroke-ill-track" strokeWidth="4" />
        <circle
          cx="94"
          cy="152"
          r="44"
          className="stroke-teal"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray="190 400"
          transform="rotate(-90 94 152)"
        />
        <line x1="94" y1="152" x2="94" y2="124" className="stroke-ill-hand" strokeWidth="3" strokeLinecap="round" />
        <line x1="94" y1="152" x2="114" y2="160" className="stroke-lavender" strokeWidth="3" strokeLinecap="round" />
        <circle cx="94" cy="152" r="4.5" className="fill-ill-hand" />
      </g>

      {/* Check-in badge */}
      <g className="motion-safe:animate-bob-alt [transform-box:fill-box]">
        <circle cx="274" cy="174" r="32" className="fill-ill-badge stroke-teal/55" />
        <path
          d="M260 182a14 14 0 0 1 28 0M263 188a11 11 0 0 1 22-3M267 192a7 7 0 0 1 14-4M274 170v14M266 166a12 12 0 0 1 16 0"
          className="stroke-teal"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>

      {/* Status pill */}
      <g className="motion-safe:animate-bob [transform-box:fill-box]">
        <rect x="178" y="6" width="142" height="30" rx="15" className="fill-ill-pill stroke-ill-pill-stroke" />
        <circle cx="194" cy="21" r="5" className="fill-success" />
        <text x="206" y="25" className="fill-ink" fontSize="11.5" fontWeight="500">
          Checked in · 09:12
        </text>
      </g>

      {/* Location pin */}
      <g className="motion-safe:animate-bob-slow [transform-box:fill-box]">
        <circle cx="40" cy="64" r="22" fill="url(#login-ill-glow-lavender)" />
        <path d="M40 46c-8 0-14 6-14 13 0 10 14 21 14 21s14-11 14-21c0-7-6-13-14-13z" className="fill-lavender" />
        <circle cx="40" cy="59" r="5" className="fill-ill-badge" />
      </g>

      <circle cx="316" cy="92" r="2" className="fill-ill-star" />
      <circle cx="22" cy="168" r="1.6" className="fill-ill-star" />
      <circle cx="150" cy="226" r="1.8" className="fill-ill-star" />
      <circle cx="62" cy="18" r="1.4" className="fill-ill-star" />
    </svg>
  );
}
