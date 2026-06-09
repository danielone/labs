'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';

interface AvatarProps {
  isSpeaking: boolean;
  audioLevel: number;
  bare?: boolean;
  bareSize?: number; // override default 220
  avatarSrc?: string; // override default /avatar.png
  avatarBorderColor?: string;  // idle border colour
  speakingHaloColor?: string;  // speaking border + halo animation colour
}

// Convert #rrggbb → "r, g, b" for use in rgba() CSS vars
function hexToRgb(hex: string): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r}, ${g}, ${b}`;
}

// Facial landmark positions as fractions of the display size.
// Tuned for this specific avatar image.
const L = {
  // Iris/pupil area only — smaller than the full eye socket
  leftEye:  { cx: 0.395, cy: 0.440, rx: 0.052, ry: 0.052 },
  rightEye: { cx: 0.605, cy: 0.440, rx: 0.052, ry: 0.052 },
  mouth:    { cx: 0.500, cy: 0.655, rx: 0.100 },
  skinTone: '#f0a882',
  mouthDark:'#8b3520',
  lowerLip: '#bf6f60',
};

function useAvatarCanvas(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  isSpeakingRef: React.RefObject<boolean>,
  audioLevelRef: React.RefObject<number>,
  size: number,
  avatarSrc: string,
) {
  // Eye blink and mouth animation disabled — canvas overlay unused
  useEffect(() => { /* no-op */ }, [size]);
}

export default function Avatar({ isSpeaking, audioLevel, bare = false, bareSize = 220, avatarSrc = '/avatar.png', avatarBorderColor = '#dfdcd7', speakingHaloColor = '#abd49e' }: AvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isSpeakingRef = useRef(isSpeaking);
  const audioLevelRef = useRef(audioLevel);

  // Keep refs in sync without restarting the animation loop
  isSpeakingRef.current = isSpeaking;
  audioLevelRef.current = audioLevel;

  const size = bare ? bareSize : 200;
  useAvatarCanvas(canvasRef, isSpeakingRef, audioLevelRef, size, avatarSrc);

  const imageAndCanvas = (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <Image
        src={avatarSrc}
        alt="Skylar"
        width={size}
        height={size}
        priority
        style={{
          objectFit: bare ? 'contain' : (!bare && avatarSrc === '/monster.svg' ? 'contain' : 'cover'),
          objectPosition: (!bare && avatarSrc === '/monster.svg') ? 'center 60%' : 'center',
          width: '100%',
          height: '100%',
          display: 'block',
          ...(bare ? { mixBlendMode: 'multiply' as const } : {}),
        }}
      />
      {/* Canvas sits exactly on top of the image, pointer-events off */}
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
        }}
      />
    </div>
  );

  if (bare) {
    return imageAndCanvas;
  }

  return (
    <div className="relative flex items-center justify-center">
      {/* Subtle pulse halo when speaking — single box-shadow ring, no scale */}
      <div
        className="absolute rounded-full"
        style={{
          inset: 0,
          pointerEvents: 'none',
          opacity: isSpeaking ? 1 : 0,
          transition: 'opacity 0.4s ease-out',
          animation: isSpeaking ? 'avatar-halo-pulse 2s infinite' : 'none',
          ['--halo-color-start' as string]: `rgba(${hexToRgb(speakingHaloColor)}, 0.4)`,
          ['--halo-color-end'   as string]: `rgba(${hexToRgb(speakingHaloColor)}, 0)`,
        }}
      />
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          overflow: 'hidden',
          border: `2px solid ${isSpeaking ? speakingHaloColor : avatarBorderColor}`,
          boxShadow: isSpeaking
            ? '0 8px 32px rgba(0,0,0,0.12)'
            : '0 4px 16px rgba(0,0,0,0.07)',
          transition: 'border-color 0.2s, box-shadow 0.2s',
          background: '#f1f0ec',
        }}
      >
        {imageAndCanvas}
      </div>
    </div>
  );
}
