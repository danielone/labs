'use client';

export default function SFBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Sky gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(180deg, #0d1b3e 0%, #1a3a6e 35%, #2e5f9e 60%, #c9855a 80%, #e8a06a 100%)',
        }}
      />

      {/* Stars */}
      {[...Array(40)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            width: Math.random() * 2 + 1 + 'px',
            height: Math.random() * 2 + 1 + 'px',
            top: Math.random() * 55 + '%',
            left: Math.random() * 100 + '%',
            opacity: Math.random() * 0.7 + 0.3,
            animation: `twinkle ${Math.random() * 3 + 2}s ease-in-out infinite`,
            animationDelay: Math.random() * 3 + 's',
          }}
        />
      ))}

      {/* Animated clouds */}
      <svg
        className="absolute top-0 left-0 w-full h-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="blur1">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" />
          </filter>
        </defs>

        {/* Cloud 1 */}
        <g opacity="0.25" filter="url(#blur1)">
          <animateTransform
            attributeName="transform"
            type="translate"
            from="-300 0"
            to="1740 0"
            dur="55s"
            repeatCount="indefinite"
          />
          <ellipse cx="200" cy="100" rx="90" ry="30" fill="white" />
          <ellipse cx="250" cy="90" rx="60" ry="22" fill="white" />
          <ellipse cx="150" cy="105" rx="55" ry="20" fill="white" />
        </g>

        {/* Cloud 2 */}
        <g opacity="0.18" filter="url(#blur1)">
          <animateTransform
            attributeName="transform"
            type="translate"
            from="-500 30"
            to="1940 30"
            dur="80s"
            repeatCount="indefinite"
          />
          <ellipse cx="500" cy="130" rx="120" ry="35" fill="white" />
          <ellipse cx="560" cy="115" rx="80" ry="28" fill="white" />
          <ellipse cx="430" cy="135" rx="70" ry="25" fill="white" />
        </g>

        {/* Cloud 3 */}
        <g opacity="0.15" filter="url(#blur1)">
          <animateTransform
            attributeName="transform"
            type="translate"
            from="1440 20"
            to="-300 20"
            dur="70s"
            repeatCount="indefinite"
          />
          <ellipse cx="900" cy="80" rx="100" ry="28" fill="white" />
          <ellipse cx="960" cy="68" rx="65" ry="22" fill="white" />
          <ellipse cx="840" cy="85" rx="60" ry="20" fill="white" />
        </g>

        {/* Bay water */}
        <path
          d="M0 780 Q360 760 720 775 Q1080 790 1440 765 L1440 900 L0 900 Z"
          fill="#0d2040"
          opacity="0.85"
        />
        {/* Water shimmer */}
        <path
          d="M0 790 Q180 782 360 787 Q540 792 720 786 Q900 780 1080 786 Q1260 792 1440 784"
          fill="none"
          stroke="#1a4a8a"
          strokeWidth="2"
          opacity="0.5"
        />

        {/* Golden Gate Bridge */}
        <g opacity="0.6">
          {/* Left tower */}
          <rect x="260" y="610" width="18" height="160" fill="#c0392b" rx="2" />
          <rect x="250" y="605" width="38" height="15" fill="#c0392b" rx="2" />
          {[620, 640, 660, 680, 700, 720, 740, 755].map((y, i) => (
            <rect key={i} x="255" y={y} width="28" height="5" fill="#a93226" rx="1" />
          ))}
          {/* Right tower */}
          <rect x="420" y="620" width="18" height="150" fill="#c0392b" rx="2" />
          <rect x="410" y="615" width="38" height="15" fill="#c0392b" rx="2" />
          {[630, 650, 670, 690, 710, 730, 750, 765].map((y, i) => (
            <rect key={i} x="415" y={y} width="28" height="5" fill="#a93226" rx="1" />
          ))}
          {/* Cables */}
          <path d="M269 610 Q350 700 429 620" fill="none" stroke="#c0392b" strokeWidth="2.5" opacity="0.8" />
          <path d="M220 770 Q350 630 480 780" fill="none" stroke="#c0392b" strokeWidth="3" />
          {/* Vertical cable hanger lines */}
          {[240, 260, 280, 300, 320, 340, 360, 380, 400, 420, 440, 460].map((x, i) => {
            const progress = (x - 220) / 260;
            const cableY = 770 + -140 * 4 * progress * (1 - progress);
            return (
              <line
                key={i}
                x1={x}
                y1={cableY}
                x2={x}
                y2={778}
                stroke="#c0392b"
                strokeWidth="1"
                opacity="0.7"
              />
            );
          })}
          {/* Road deck */}
          <rect x="210" y="775" width="280" height="8" fill="#7f8c8d" rx="1" />
        </g>

        {/* SF Skyline */}
        {/* Salesforce Tower */}
        <rect x="680" y="520" width="35" height="250" fill="#1a2a4a" opacity="0.9" rx="2" />
        <polygon points="680,520 715,520 697,490" fill="#1a2a4a" opacity="0.9" />
        {/* Bay Bridge */}
        <rect x="780" y="750" width="4" height="30" fill="#4a5568" opacity="0.6" />
        <rect x="870" y="750" width="4" height="30" fill="#4a5568" opacity="0.6" />
        <path d="M760 760 Q825 740 900 760" fill="none" stroke="#4a5568" strokeWidth="2" opacity="0.6" />
        {/* Buildings cluster */}
        <rect x="720" y="600" width="25" height="170" fill="#152238" opacity="0.85" rx="1" />
        <rect x="750" y="630" width="20" height="140" fill="#1a2a4a" opacity="0.85" rx="1" />
        <rect x="775" y="660" width="30" height="110" fill="#152238" opacity="0.8" rx="1" />
        <rect x="810" y="680" width="22" height="90" fill="#1a2a4a" opacity="0.75" rx="1" />
        <rect x="840" y="700" width="18" height="70" fill="#152238" opacity="0.7" rx="1" />
        <rect x="863" y="715" width="25" height="55" fill="#1a2a4a" opacity="0.7" rx="1" />
        <rect x="893" y="725" width="20" height="45" fill="#152238" opacity="0.65" rx="1" />
        <rect x="918" y="730" width="30" height="40" fill="#1a2a4a" opacity="0.65" rx="1" />
        {/* Building windows (glowing) */}
        {[...Array(12)].map((_, i) => (
          <rect
            key={i}
            x={720 + Math.floor(i % 3) * 8 + 3}
            y={610 + Math.floor(i / 3) * 25}
            width="4"
            height="8"
            fill="#ffd700"
            opacity="0.4"
            rx="0.5"
          />
        ))}
        {[...Array(8)].map((_, i) => (
          <rect
            key={i}
            x={750 + Math.floor(i % 2) * 8 + 3}
            y={640 + Math.floor(i / 2) * 30}
            width="4"
            height="8"
            fill="#ffd700"
            opacity="0.35"
            rx="0.5"
          />
        ))}
      </svg>

      {/* Foreground fog/mist */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32"
        style={{
          background: 'linear-gradient(180deg, transparent 0%, rgba(10,20,50,0.4) 100%)',
        }}
      />

      <style jsx global>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @keyframes cloudDrift {
          from { transform: translateX(-200px); }
          to { transform: translateX(1640px); }
        }
      `}</style>
    </div>
  );
}
