// Abstract skyline + diagonal brand banner — evokes the real BMTC office
// building without needing the actual photo. Hidden below the md
// breakpoint (see .login-hero in globals.css) so the form stays the whole
// story on small screens.
export default function LoginHero() {
  return (
    <div className="login-hero">
      <svg
        viewBox="0 0 480 640"
        preserveAspectRatio="xMidYMax slice"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      >
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1c2a3a" />
            <stop offset="100%" stopColor="#101822" />
          </linearGradient>
          <linearGradient id="banner" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6d93b8" />
            <stop offset="100%" stopColor="#3d5b78" />
          </linearGradient>
        </defs>

        <rect width="480" height="640" fill="url(#sky)" />

        {/* faint blueprint grid */}
        <g stroke="#ffffff" strokeOpacity="0.045" strokeWidth="1">
          {Array.from({ length: 12 }).map((_, i) => (
            <line key={`v${i}`} x1={i * 40} y1="0" x2={i * 40} y2="640" />
          ))}
          {Array.from({ length: 16 }).map((_, i) => (
            <line key={`h${i}`} x1="0" y1={i * 40} x2="480" y2={i * 40} />
          ))}
        </g>

        {/* skyline */}
        <g fill="#28394d">
          <rect x="20" y="420" width="70" height="220" />
          <rect x="100" y="360" width="55" height="280" />
          <rect x="165" y="460" width="45" height="180" />
          <rect x="355" y="400" width="60" height="240" />
          <rect x="420" y="440" width="50" height="200" />
        </g>
        {/* the BMTC building, taller + brighter than its neighbors */}
        <rect x="215" y="270" width="130" height="370" fill="#324a63" />
        <g fill="#ffffff" fillOpacity="0.14">
          {Array.from({ length: 9 }).map((_, row) =>
            Array.from({ length: 5 }).map((_, col) => (
              <rect
                key={`w${row}-${col}`}
                x={228 + col * 22}
                y={288 + row * 34}
                width="14"
                height="20"
              />
            ))
          )}
        </g>

        {/* diagonal brand banner, echoing the real building photo */}
        <polygon points="0,60 210,0 480,0 480,120 60,640 0,640" fill="url(#banner)" fillOpacity="0.92" />
        <polygon points="0,60 210,0 232,0 22,640 0,640" fill="#ffffff" fillOpacity="0.08" />
      </svg>

      <div className="login-hero-content corner-marks">
        <div className="brand-wordmark" style={{ fontSize: 15, letterSpacing: 2, color: "#fff" }}>
          BMTC
        </div>
        <div
          className="brand-wordmark"
          style={{ fontSize: 12, letterSpacing: 1.5, color: "rgba(255,255,255,0.75)", marginTop: 2 }}
        >
          Estimation Control
        </div>
        <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.6)", lineHeight: 1.6, marginTop: 18, maxWidth: 260 }}>
          Al Bahri &amp; Al Mazroei Trading Co. — Quotation &amp; LPO Control, built for the way
          estimation actually runs.
        </p>
      </div>
    </div>
  );
}
