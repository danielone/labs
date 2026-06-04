'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';

interface AvatarProps {
  isSpeaking: boolean;
  audioLevel: number;
  bare?: boolean;
}

// Facial landmark positions as fractions of the display size.
// Tuned for this specific avatar image.
const L = {
  // Iris/pupil area only — smaller than the full eye socket
  leftEye:  { cx: 0.395, cy: 0.430, rx: 0.052, ry: 0.052 },
  rightEye: { cx: 0.605, cy: 0.430, rx: 0.052, ry: 0.052 },
  mouth:    { cx: 0.500, cy: 0.655, rx: 0.110 },
  skinTone: '#f0a882',
  mouthDark:'#3a1010',
  lowerLip: '#bf6f60',
};

function useAvatarCanvas(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  isSpeakingRef: React.RefObject<boolean>,
  audioLevelRef: React.RefObject<number>,
  size: number,
) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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

      // ── Lip / mouth animation ──────────────────────────────────────
      if (isSpeakingRef.current) {
        const lvl = audioLevelRef.current;
        // Map level → mouth gap (pixels).  Drive with a touch of randomness
        // so the motion looks more organic at steady tones.
        const jitter = 0.85 + 0.15 * Math.sin(now / 80);
        const gap = Math.min(lvl * 22 * jitter, 6); // max ~6 px

        if (gap > 0.8) {
          const cx  = L.mouth.cx  * size;
          const cy  = L.mouth.cy  * size;
          const rx  = L.mouth.rx  * size;
          const ry  = gap;

          // Dark mouth interior
          ctx.fillStyle = L.mouthDark;
          ctx.beginPath();
          ctx.ellipse(cx, cy + ry * 0.3, rx * 0.85, ry * 0.72, 0, 0, Math.PI * 2);
          ctx.fill();

          // Lower lip
          ctx.fillStyle = L.lowerLip;
          ctx.beginPath();
          ctx.ellipse(cx, cy + ry, rx * 0.75, Math.max(gap * 0.22, 1.5), 0, 0, Math.PI * 2);
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

export default function Avatar({ isSpeaking, audioLevel, bare = false }: AvatarProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isSpeakingRef = useRef(isSpeaking);
  const audioLevelRef = useRef(audioLevel);

  // Keep refs in sync without restarting the animation loop
  isSpeakingRef.current = isSpeaking;
  audioLevelRef.current = audioLevel;

  const size = bare ? 220 : 200;
  useAvatarCanvas(canvasRef, isSpeakingRef, audioLevelRef, size);

  const imageAndCanvas = (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <Image
        src="/avatar.png"
        alt="Skylar"
        width={size}
        height={size}
        priority
        style={{
          objectFit: bare ? 'contain' : 'cover',
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
      {/* Glow ring when speaking */}
      <div
        className="absolute rounded-full"
        style={{
          inset: '-8px',
          opacity: isSpeaking ? 0.45 + audioLevel * 0.4 : 0,
          boxShadow: '0 0 0 4px #dfdcd7, 0 0 28px 6px rgba(0,0,0,0.07)',
          transition: 'opacity 0.15s ease-out',
        }}
      />
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          overflow: 'hidden',
          border: isSpeaking ? '2px solid #b0aba5' : '2px solid #dfdcd7',
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
