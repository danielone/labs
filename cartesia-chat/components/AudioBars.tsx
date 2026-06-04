'use client';

import { useRef, useEffect } from 'react';

interface AudioBarsProps {
  analyser: AnalyserNode | null;
  color: 'agent' | 'user';
  isActive: boolean;
  barCount?: number;
  height?: number;
}

export default function AudioBars({
  analyser,
  color,
  isActive,
  barCount = 32,
  height = 48,
}: AudioBarsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const smoothedRef = useRef<Float32Array>(new Float32Array(barCount).fill(0));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const agentGradient = () => {
      const g = ctx.createLinearGradient(0, height, 0, 0);
      g.addColorStop(0, '#1e6fa8');
      g.addColorStop(0.5, '#38bdf8');
      g.addColorStop(1, '#7dd3fc');
      return g;
    };

    const userGradient = () => {
      const g = ctx.createLinearGradient(0, height, 0, 0);
      g.addColorStop(0, '#9333ea');
      g.addColorStop(0.5, '#c084fc');
      g.addColorStop(1, '#f0abfc');
      return g;
    };

    const draw = () => {
      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      let freqData: Uint8Array<ArrayBuffer> | null = null;
      if (analyser && isActive) {
        freqData = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
        analyser.getByteFrequencyData(freqData);
      }

      const barW = W / barCount;
      const gap = 2;
      const smoothing = 0.3;

      for (let i = 0; i < barCount; i++) {
        let rawValue = 0;
        if (freqData) {
          // Map bar to frequency range (focus on voice frequencies)
          const freqIndex = Math.floor((i / barCount) * (freqData.length * 0.4));
          rawValue = freqData[freqIndex] / 255;
        }

        // Smooth over time
        smoothedRef.current[i] =
          smoothedRef.current[i] * (1 - smoothing) + rawValue * smoothing;

        const barHeight = Math.max(2, smoothedRef.current[i] * H * 0.9);
        const x = i * barW + gap / 2;
        const y = H - barHeight;
        const w = barW - gap;

        ctx.fillStyle = color === 'agent' ? agentGradient() : userGradient();
        ctx.beginPath();
        ctx.roundRect(x, y, w, barHeight, [2, 2, 0, 0]);
        ctx.fill();

        // Reflection
        ctx.save();
        ctx.globalAlpha = 0.12;
        ctx.fillStyle = color === 'agent' ? '#38bdf8' : '#c084fc';
        ctx.beginPath();
        ctx.roundRect(x, H, w, barHeight * 0.25, [0, 0, 2, 2]);
        ctx.fill();
        ctx.restore();
      }

      // Idle animation (slow pulse when inactive)
      if (!isActive) {
        const t = Date.now() / 1000;
        for (let i = 0; i < barCount; i++) {
          smoothedRef.current[i] *= 0.92;
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [analyser, color, isActive, barCount, height]);

  return (
    <div
      className="relative w-full"
      style={{ height: height + 'px' }}
    >
      <canvas
        ref={canvasRef}
        width={320}
        height={height}
        className="w-full h-full"
        style={{ imageRendering: 'crisp-edges' }}
      />
    </div>
  );
}
