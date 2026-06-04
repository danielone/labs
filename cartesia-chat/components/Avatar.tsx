'use client';

import Image from 'next/image';

interface AvatarProps {
  isSpeaking: boolean;
  audioLevel: number; // 0–1
  bare?: boolean;     // scene view: no frame, white bg blended out
}

export default function Avatar({ isSpeaking, audioLevel, bare = false }: AvatarProps) {
  const pulseScale = isSpeaking ? 1 + audioLevel * 0.04 : 1;

  if (bare) {
    return (
      <div
        style={{
          transform: `scale(${pulseScale})`,
          transition: 'transform 0.08s ease-out',
          width: 220,
          height: 220,
        }}
      >
        <Image
          src="/avatar.png"
          alt="Skylar"
          width={220}
          height={220}
          priority
          style={{
            objectFit: 'contain',
            width: '100%',
            height: '100%',
            // multiply blends white pixels away against the background
            mixBlendMode: 'multiply',
          }}
        />
      </div>
    );
  }

  return (
    <div className="relative flex items-center justify-center">
      {/* Glow ring when speaking */}
      <div
        className="absolute rounded-full"
        style={{
          inset: '-8px',
          borderRadius: '50%',
          opacity: isSpeaking ? 0.5 + audioLevel * 0.4 : 0,
          boxShadow: '0 0 0 4px #dfdcd7, 0 0 32px 8px rgba(0,0,0,0.08)',
          transition: 'opacity 0.15s ease-out',
        }}
      />

      {/* Framed avatar */}
      <div
        style={{
          width: 200,
          height: 200,
          borderRadius: '50%',
          overflow: 'hidden',
          border: isSpeaking ? '2px solid #b0aba5' : '2px solid #dfdcd7',
          boxShadow: isSpeaking
            ? '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)'
            : '0 4px 16px rgba(0,0,0,0.07)',
          transform: `scale(${pulseScale})`,
          transition: 'transform 0.08s ease-out, border-color 0.2s, box-shadow 0.2s',
          background: '#f1f0ec',
        }}
      >
        <Image
          src="/avatar.png"
          alt="Skylar"
          width={200}
          height={200}
          priority
          style={{ objectFit: 'cover', width: '100%', height: '100%' }}
        />
      </div>
    </div>
  );
}
