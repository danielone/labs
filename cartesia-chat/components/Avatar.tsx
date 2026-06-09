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
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Skip all canvas overlays (eye blink + mouth animation disabled)
    return;

    // Blink state machine
    let phase: 'open' | 'closing' | 'holding' | 'opening' = 'open';
    let phaseT = 0;
    let nextBlink = 2000 + Math.random() * 3500;
    let lastNow = performance.now();
    let raf = 0;

    const draw = (now: number) => {
      const dt = Math.min(now - lastNow, 50);
      lastNow = now;
      ctx.clearRect(0, 0, size, size);

      // ── Blink timing ──────────────────────────────────────────────
      phaseT += dt;
      let lidProgress = 0; // 0 = eye open, 1 = eye fully closed

      if (phase === 'open') {
        if (phaseT >= nextBlink) { phase = 'closing'; phaseT = 0; }
      } else if (phase === 'closing') {
        lidProgress = Math.min(phaseT / 65, 1);
        if (lidProgress >= 1) { phase = 'holding'; phaseT = 0; }
      } else if (phase === 'holding') {
        lidProgress = 1;
        if (phaseT >= 40) { phase = 'opening'; phaseT = 0; }
      } else {
        lidProgress = 1 - Math.min(phaseT / 90, 1);
        if (lidProgress <= 0) {
          phase = 'open'; phaseT = 0;
          nextBlink = 2000 + Math.random() * 4500;
        }
      }

      // ── Draw eyelids (opacity fade over fixed iris ellipse) ───────
      if (lidProgress > 0.02) {
        ctx.globalAlpha = lidProgress;
        ctx.fillStyle = L.skinTone;
        for (const eye of [L.leftEye, L.rightEye]) {
          ctx.beginPath();
          ctx.ellipse(
            eye.cx * size, eye.cy * size,
            eye.rx * size, eye.ry * size,
            0, 0, Math.PI * 2,
          );
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // ── Lip / mouth animation (speaking only) ─────────────────────
      if (isSpeakingRef.current) {
        const lvl = audioLevelRef.current;
        const jitter = 0.8 + 0.2 * Math.sin(now / 80);
        const gap = Math.min(lvl * 55 * jitter, 14);

        if (gap > 0.8) {
          const cx = L.mouth.cx * size;
          const cy = L.mouth.cy * size;
          const rx = L.mouth.rx * size;

          ctx.fillStyle = L.mouthDark;
          ctx.beginPath();
          ctx.ellipse(cx, cy + gap * 0.3, rx * 0.825, gap * 0.36, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = L.lowerLip;
          ctx.beginPath();
          ctx.ellipse(cx, cy + gap, rx * 0.75, Math.max(gap * 0.22, 1.5), 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size]); // only re-run if size changes; state accessed via refs
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
