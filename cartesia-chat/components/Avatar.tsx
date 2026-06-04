'use client';

interface AvatarProps {
  isSpeaking: boolean;
  audioLevel: number; // 0–1
}

export default function Avatar({ isSpeaking, audioLevel }: AvatarProps) {
  const mouthOpen = isSpeaking ? Math.min(audioLevel * 18, 10) : 0;
  const pulseScale = isSpeaking ? 1 + audioLevel * 0.03 : 1;

  return (
    <div className="relative flex items-center justify-center">
      {/* Glow ring when speaking */}
      <div
        className="absolute inset-0 rounded-full transition-opacity duration-200"
        style={{
          opacity: isSpeaking ? 0.6 : 0,
          boxShadow: '0 0 40px 10px rgba(100, 180, 255, 0.5)',
        }}
      />

      <svg
        viewBox="0 0 240 280"
        width="240"
        height="280"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          transform: `scale(${pulseScale})`,
          transition: 'transform 0.08s ease-out',
          filter: 'drop-shadow(0 8px 32px rgba(0,0,0,0.5))',
        }}
      >
        <defs>
          {/* Office window / SF view gradient */}
          <linearGradient id="windowGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1a3a7a" />
            <stop offset="60%" stopColor="#2e5f9e" />
            <stop offset="100%" stopColor="#c9855a" />
          </linearGradient>
          {/* Skin tone */}
          <linearGradient id="skinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f5c9a5" />
            <stop offset="100%" stopColor="#e8a87c" />
          </linearGradient>
          {/* Hair */}
          <linearGradient id="hairGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#2c1810" />
            <stop offset="100%" stopColor="#1a0e08" />
          </linearGradient>
          {/* Blazer */}
          <linearGradient id="blazerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e3a5f" />
            <stop offset="100%" stopColor="#12253e" />
          </linearGradient>
          {/* Shirt */}
          <linearGradient id="shirtGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f0f4f8" />
            <stop offset="100%" stopColor="#dde4ec" />
          </linearGradient>
          <clipPath id="cardClip">
            <rect x="0" y="0" width="240" height="280" rx="20" />
          </clipPath>
        </defs>

        {/* Card background — office with SF view */}
        <rect x="0" y="0" width="240" height="280" rx="20" fill="#0d1b35" clipPath="url(#cardClip)" />

        {/* Window behind figure */}
        <rect x="20" y="10" width="200" height="150" rx="8" fill="url(#windowGrad)" opacity="0.85" />
        {/* Window frame cross */}
        <line x1="120" y1="10" x2="120" y2="160" stroke="#0d1b35" strokeWidth="3" opacity="0.5" />
        <line x1="20" y1="80" x2="220" y2="80" stroke="#0d1b35" strokeWidth="3" opacity="0.5" />
        {/* Tiny skyline in window */}
        <rect x="55" y="105" width="8" height="45" fill="#0a1525" opacity="0.7" />
        <rect x="68" y="115" width="6" height="35" fill="#0a1525" opacity="0.6" />
        <rect x="78" y="100" width="10" height="50" fill="#0a1525" opacity="0.8" />
        <polygon points="78,100 83,100 88,92" fill="#0a1525" opacity="0.8" />
        <rect x="155" y="108" width="8" height="42" fill="#0a1525" opacity="0.7" />
        <rect x="168" y="118" width="6" height="32" fill="#0a1525" opacity="0.6" />
        <rect x="178" y="103" width="10" height="47" fill="#0a1525" opacity="0.75" />

        {/* Desk surface */}
        <rect x="0" y="220" width="240" height="60" rx="0" fill="#1a2a3e" />
        <rect x="0" y="218" width="240" height="6" rx="2" fill="#253a52" />

        {/* Body / Blazer */}
        <path
          d="M40 280 L40 200 Q50 170 80 160 L120 175 L160 160 Q190 170 200 200 L200 280 Z"
          fill="url(#blazerGrad)"
        />
        {/* Lapels */}
        <path d="M100 160 L120 175 L105 200 L90 165 Z" fill="#16304f" />
        <path d="M140 160 L120 175 L135 200 L150 165 Z" fill="#16304f" />
        {/* Shirt / blouse */}
        <path d="M105 200 L120 175 L135 200 L120 215 Z" fill="url(#shirtGrad)" />
        {/* Blazer detail lines */}
        <path d="M80 162 Q70 180 65 210" fill="none" stroke="#16304f" strokeWidth="1.5" />
        <path d="M160 162 Q170 180 175 210" fill="none" stroke="#16304f" strokeWidth="1.5" />

        {/* Neck */}
        <rect x="108" y="148" width="24" height="20" rx="8" fill="url(#skinGrad)" />

        {/* Head */}
        <ellipse cx="120" cy="115" rx="42" ry="48" fill="url(#skinGrad)" />

        {/* Hair — sleek updo */}
        <ellipse cx="120" cy="80" rx="42" ry="25" fill="url(#hairGrad)" />
        <path
          d="M78 95 Q70 75 78 60 Q90 45 120 42 Q150 45 162 60 Q170 75 162 95"
          fill="url(#hairGrad)"
        />
        {/* Hair bun */}
        <circle cx="120" cy="50" r="14" fill="url(#hairGrad)" />
        <ellipse cx="120" cy="50" rx="12" ry="10" fill="#3d2012" />
        {/* Hair wisps */}
        <path d="M78 90 Q72 100 76 115" fill="none" stroke="#2c1810" strokeWidth="3" strokeLinecap="round" />
        <path d="M162 90 Q168 100 164 115" fill="none" stroke="#2c1810" strokeWidth="3" strokeLinecap="round" />

        {/* Ears */}
        <ellipse cx="78" cy="115" rx="7" ry="9" fill="#e8a87c" />
        <ellipse cx="162" cy="115" rx="7" ry="9" fill="#e8a87c" />
        {/* Small earrings */}
        <circle cx="78" cy="122" r="3" fill="#c9a227" />
        <circle cx="162" cy="122" r="3" fill="#c9a227" />

        {/* Eyebrows */}
        <path
          d="M97 98 Q106 94 112 97"
          fill="none"
          stroke="#2c1810"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d="M128 97 Q134 94 143 98"
          fill="none"
          stroke="#2c1810"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Eyes */}
        <ellipse cx="104" cy="108" rx="9" ry="9" fill="white" />
        <ellipse cx="136" cy="108" rx="9" ry="9" fill="white" />
        {/* Iris */}
        <circle cx="104" cy="108" r="5.5" fill="#4a3020" />
        <circle cx="136" cy="108" r="5.5" fill="#4a3020" />
        {/* Pupil */}
        <circle cx="104" cy="108" r="3" fill="#1a0a00" />
        <circle cx="136" cy="108" r="3" fill="#1a0a00" />
        {/* Eye shine */}
        <circle cx="106" cy="106" r="1.5" fill="white" opacity="0.9" />
        <circle cx="138" cy="106" r="1.5" fill="white" opacity="0.9" />
        {/* Upper eyelid line */}
        <path
          d="M95 104 Q104 100 113 104"
          fill="none"
          stroke="#2c1810"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path
          d="M127 104 Q136 100 145 104"
          fill="none"
          stroke="#2c1810"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Nose */}
        <path
          d="M116 112 Q112 124 108 128 Q116 132 120 130 Q124 132 132 128 Q128 124 124 112"
          fill="none"
          stroke="#d4956e"
          strokeWidth="1.5"
          strokeLinecap="round"
        />

        {/* Mouth — animates with audioLevel */}
        <path
          d={
            mouthOpen > 1
              ? `M 106 140 Q 120 ${140 + mouthOpen} 134 140 Q 120 ${140 + mouthOpen * 1.5} 106 140`
              : `M 106 140 Q 120 147 134 140`
          }
          fill={mouthOpen > 1 ? '#2a0a0a' : 'none'}
          stroke={mouthOpen > 1 ? 'none' : '#c0786a'}
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Upper lip */}
        <path
          d="M 106 140 Q 112 136 120 138 Q 128 136 134 140"
          fill="none"
          stroke="#c0786a"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {/* Teeth when speaking */}
        {mouthOpen > 2 && (
          <path
            d={`M 109 140 Q 120 ${140 + mouthOpen * 0.6} 131 140`}
            fill="white"
            opacity="0.9"
          />
        )}

        {/* Subtle cheek blush */}
        <ellipse cx="93" cy="125" rx="12" ry="7" fill="#e8a87c" opacity="0.3" />
        <ellipse cx="147" cy="125" rx="12" ry="7" fill="#e8a87c" opacity="0.3" />

        {/* Card edge glow when speaking */}
        {isSpeaking && (
          <rect
            x="1"
            y="1"
            width="238"
            height="278"
            rx="19"
            fill="none"
            stroke="rgba(100,180,255,0.4)"
            strokeWidth="2"
          />
        )}
      </svg>
    </div>
  );
}
