'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';
import Avatar from './Avatar';
import SFBackground from './SFBackground';
import {
  SAMPLE_RATE,
  float32ToInt16,
  int16ToFloat32,
  base64ToArrayBuffer,
  arrayBufferToBase64,
  getRmsLevel,
} from '@/lib/audio';

type CallState = 'idle' | 'connecting' | 'active' | 'ending';

interface TokenResponse {
  token: string;
  agentId: string;
  version: string;
}

// Cartesia-style 4-bar wave indicator
// speaking=true → #004e23 (Cartesia brand), speaking=false → #309d4b
function WaveBars({ speaking }: { speaking: boolean }) {
  const color = speaking ? '#004e23' : '#abd49e';
  const bars = [
    { anim: 'bar-pulse-a', delay: '0ms',   dur: '1.8s', init: '22%' },
    { anim: 'bar-pulse-b', delay: '200ms', dur: '1.6s', init: '18%' },
    { anim: 'bar-pulse-c', delay: '100ms', dur: '2.0s', init: '28%' },
    { anim: 'bar-pulse-d', delay: '300ms', dur: '1.7s', init: '25%' },
  ];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '14px' }}>
      {bars.map((b, i) => (
        <div
          key={i}
          style={{
            width: '2.5px',
            height: b.init,
            background: color,
            borderRadius: '2px',
            animation: `${b.anim} ${b.dur} cubic-bezier(.45,0,.55,1) ${b.delay} infinite`,
          }}
        />
      ))}
    </div>
  );
}

export default function VoiceChat() {
  const [widgetExpanded, setWidgetExpanded] = useState(false);
  const [callState, setCallState] = useState<CallState>('idle');
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [agentLevel, setAgentLevel] = useState(0);
  const [userLevel, setUserLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [showScene, setShowScene] = useState(true);
  const [toggleHovered, setToggleHovered] = useState(false);
  // State (not ref) so AudioBars re-renders when they become available
  const [agentAnalyser, setAgentAnalyser] = useState<AnalyserNode | null>(null);
  const [userAnalyser, setUserAnalyser] = useState<AnalyserNode | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const scriptNodeRef = useRef<ScriptProcessorNode | null>(null);
  const nextPlayTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const levelRafRef = useRef<number>(0);
  const agentSilenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userSilenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep analyser refs in sync with state for use inside callbacks
  const agentAnalyserRef = useRef<AnalyserNode | null>(null);
  const userAnalyserRef = useRef<AnalyserNode | null>(null);
  // Track every scheduled source so we can stop them instantly on end
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  // Oscillators used in test mode (kept for cleanup compat, no longer populated)
  const testOscsRef = useRef<OscillatorNode[]>([]);
  // Cycling timeout for test mode
  const testCycleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const pollLevels = useCallback(() => {
    if (agentAnalyserRef.current) {
      const level = getRmsLevel(agentAnalyserRef.current);
      setAgentLevel(level);
      if (level > 0.01) {
        setAgentSpeaking(true);
        if (agentSilenceTimerRef.current) clearTimeout(agentSilenceTimerRef.current);
        agentSilenceTimerRef.current = setTimeout(() => setAgentSpeaking(false), 400);
      }
    }
    if (userAnalyserRef.current) {
      const level = getRmsLevel(userAnalyserRef.current);
      setUserLevel(level);
      if (level > 0.015) {
        setUserSpeaking(true);
        if (userSilenceTimerRef.current) clearTimeout(userSilenceTimerRef.current);
        userSilenceTimerRef.current = setTimeout(() => setUserSpeaking(false), 400);
      }
    }
    levelRafRef.current = requestAnimationFrame(pollLevels);
  }, []);

  const playAgentAudio = useCallback((base64Data: string) => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    try {
      const arrayBuf = base64ToArrayBuffer(base64Data);
      const int16 = new Int16Array(arrayBuf);
      if (int16.length === 0) return;

      const float32 = int16ToFloat32(int16);
      const audioBuf = ctx.createBuffer(1, float32.length, ctx.sampleRate);
      audioBuf.copyToChannel(float32, 0);

      if (!agentAnalyserRef.current) {
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.8;
        // Connect once — additional connect() calls stack up parallel outputs
        analyser.connect(ctx.destination);
        agentAnalyserRef.current = analyser;
        setAgentAnalyser(analyser);
      }

      const source = ctx.createBufferSource();
      source.buffer = audioBuf;
      source.connect(agentAnalyserRef.current);

      activeSourcesRef.current.add(source);
      source.onended = () => activeSourcesRef.current.delete(source);

      const startAt = Math.max(ctx.currentTime, nextPlayTimeRef.current);
      source.start(startAt);
      nextPlayTimeRef.current = startAt + audioBuf.duration;
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  }, []);

  const cleanupResources = useCallback(() => {
    cancelAnimationFrame(levelRafRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    if (agentSilenceTimerRef.current) clearTimeout(agentSilenceTimerRef.current);
    if (userSilenceTimerRef.current) clearTimeout(userSilenceTimerRef.current);

    // Stop every scheduled audio buffer immediately
    activeSourcesRef.current.forEach((s) => { try { s.stop(); } catch {} });
    activeSourcesRef.current.clear();

    // Stop test-mode oscillators (legacy, usually empty now)
    testOscsRef.current.forEach((o) => { try { o.stop(); } catch {} });
    testOscsRef.current = [];
    if (testCycleTimerRef.current) { clearTimeout(testCycleTimerRef.current); testCycleTimerRef.current = null; }

    if (scriptNodeRef.current) {
      scriptNodeRef.current.onaudioprocess = null;
      try { scriptNodeRef.current.disconnect(); } catch {}
      scriptNodeRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (wsRef.current) {
      // Null ALL handlers so none fire after cleanup
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }
    if (audioCtxRef.current) {
      // suspend() silences output immediately; close() frees resources
      audioCtxRef.current.suspend().catch(() => {});
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }

    agentAnalyserRef.current = null;
    userAnalyserRef.current = null;
    setAgentAnalyser(null);
    setUserAnalyser(null);
    nextPlayTimeRef.current = 0;
  }, []);

  const endCall = useCallback(() => {
    setCallState('ending');
    cleanupResources();
    setAgentSpeaking(false);
    setUserSpeaking(false);
    setAgentLevel(0);
    setUserLevel(0);
    setTimeout(() => setCallState('idle'), 300);
  }, [cleanupResources]);

  const startTestMode = useCallback(() => {
    setError(null);
    setCallState('active');
    setDuration(0);
    timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);

    // Phase sequence: agent speaks → brief pause → user speaks → brief pause → repeat
    const phases: Array<{ agentOn: boolean; userOn: boolean; ms: number }> = [
      { agentOn: true,  userOn: false, ms: 3500 },
      { agentOn: false, userOn: false, ms: 600  },
      { agentOn: false, userOn: true,  ms: 2500 },
      { agentOn: false, userOn: false, ms: 600  },
    ];
    let phaseIdx = 0;

    // Local refs so the rAF closure always has current phase without re-creating
    const agentOnRef = { current: false };
    const userOnRef  = { current: false };

    const schedulePhase = () => {
      const p = phases[phaseIdx % phases.length];
      agentOnRef.current = p.agentOn;
      userOnRef.current  = p.userOn;
      setAgentSpeaking(p.agentOn);
      setUserSpeaking(p.userOn);
      phaseIdx++;
      testCycleTimerRef.current = setTimeout(schedulePhase, p.ms);
    };
    schedulePhase();

    // rAF loop: generate synthetic audio levels so avatar lip / glow animations run
    const frame = () => {
      const t = performance.now() / 1000;
      if (agentOnRef.current) {
        const lvl = 0.35 + 0.3 * Math.abs(Math.sin(t * 7.3)) * Math.abs(Math.cos(t * 4.1));
        setAgentLevel(lvl);
      } else {
        setAgentLevel(0);
      }
      if (userOnRef.current) {
        const lvl = 0.3 + 0.28 * Math.abs(Math.sin(t * 6.1 + 0.8));
        setUserLevel(lvl);
      } else {
        setUserLevel(0);
      }
      levelRafRef.current = requestAnimationFrame(frame);
    };
    levelRafRef.current = requestAnimationFrame(frame);
  }, []);

  const startMicCapture = useCallback(
    (scriptNode: ScriptProcessorNode, ws: WebSocket, streamId: string) => {
      scriptNode.onaudioprocess = (event) => {
        if (ws.readyState !== WebSocket.OPEN) return;
        const float32 = event.inputBuffer.getChannelData(0);
        const int16 = float32ToInt16(float32);
        const payload = arrayBufferToBase64(int16.buffer as ArrayBuffer);
        ws.send(JSON.stringify({
          event: 'media_input',
          stream_id: streamId,
          media: { payload },
        }));
      };
    },
    []
  );

  const startCall = useCallback(async () => {
    setError(null);
    setCallState('connecting');

    try {
      const res = await fetch('/api/token');
      if (!res.ok) throw new Error('Failed to get token');
      const { token, agentId, version } = (await res.json()) as TokenResponse;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      micStreamRef.current = stream;

      // Use default sample rate (44100) matching pcm_44100 protocol
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      nextPlayTimeRef.current = ctx.currentTime;

      // User mic analyser
      const uAnalyser = ctx.createAnalyser();
      uAnalyser.fftSize = 256;
      uAnalyser.smoothingTimeConstant = 0.8;
      userAnalyserRef.current = uAnalyser;
      setUserAnalyser(uAnalyser);

      const micSource = ctx.createMediaStreamSource(stream);
      micSource.connect(uAnalyser);

      // ScriptProcessorNode for mic capture
      const bufferSize = 4096;
      const scriptNode = ctx.createScriptProcessor(bufferSize, 1, 1);
      scriptNodeRef.current = scriptNode;
      uAnalyser.connect(scriptNode);
      scriptNode.connect(ctx.destination);

      // Connect to Cartesia Line agent
      const wsUrl = `wss://agents.cartesia.ai/agents/stream/${agentId}?cartesia_version=${version}&access_token=${token}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.binaryType = 'arraybuffer';

      let streamId = '';

      ws.onopen = () => {
        ws.send(JSON.stringify({
          event: 'start',
          stream_id: '',
          config: { input_format: 'pcm_44100' },
        }));
      };

      ws.onmessage = (event) => {
        if (typeof event.data === 'string') {
          try {
            const msg = JSON.parse(event.data as string) as {
              event: string;
              stream_id?: string;
              media?: { payload: string };
            };

            if (msg.event === 'ack') {
              streamId = msg.stream_id ?? '';
              setCallState('active');
              startMicCapture(scriptNode, ws, streamId);
              setDuration(0);
              timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
              levelRafRef.current = requestAnimationFrame(pollLevels);
            } else if (msg.event === 'media_output' && msg.media?.payload) {
              playAgentAudio(msg.media.payload);
            } else if (msg.event === 'clear') {
              nextPlayTimeRef.current = ctx.currentTime;
              setAgentSpeaking(false);
            }
          } catch {
            // non-JSON, ignore
          }
        }
      };

      ws.onerror = () => {
        setError('Connection error. Please try again.');
        setCallState('ending');
        cleanupResources();
        setTimeout(() => setCallState('idle'), 300);
      };

      ws.onclose = (ev) => {
        // Only handle unexpected closes
        if (wsRef.current === ws) {
          const reason = ev.reason || 'Call disconnected.';
          setError(reason);
          setCallState('ending');
          cleanupResources();
          setTimeout(() => setCallState('idle'), 300);
        }
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      cleanupResources();
      setCallState('idle');
    }
  }, [playAgentAudio, pollLevels, startMicCapture, cleanupResources]);

  useEffect(() => () => cleanupResources(), [cleanupResources]);

  const formatDuration = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const isActive = callState === 'active';

  // Compact scene / avatar heights for the expanded widget
  const SCENE_H = 168; // 60% of 280
  const AVATAR_BARE = 168;

  return (
    <>
      {/* Fixed bottom-right widget */}
      <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000 }}>

        {/* ── COLLAPSED WIDGET (75% of original) ── */}
        {!widgetExpanded && (
          <div
            style={{
              width: 216,
              background: '#fdfdfc',
              border: '1px solid #dfdcd7',
              borderRadius: 15,
              boxShadow: '0 8px 40px rgba(0,0,0,0.13), 0 2px 8px rgba(0,0,0,0.06)',
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 9,
            }}
          >
            {/* Avatar + label row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{
                width: 39, height: 39, borderRadius: '50%', overflow: 'hidden',
                border: '2px solid #dfdcd7', background: '#f1f0ec', flexShrink: 0,
              }}>
                <Image src="/avatar.png" alt="Skylar" width={39} height={39}
                  style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: '#39342f' }}>Need help?</span>
            </div>

            {/* Start button */}
            <button
              onClick={() => { setWidgetExpanded(true); startCall(); }}
              style={{
                background: '#171715',
                color: '#ffffff',
                border: 'none',
                borderRadius: 999,
                padding: '8px 14px',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#2a2826'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#171715'; }}
            >
              {/* Phone icon */}
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012 .18h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
              </svg>
              Start Conversation
            </button>
          </div>
        )}

        {/* ── EXPANDED CALL CARD ── */}
        {widgetExpanded && (
          <div className="relative flex flex-col items-center">

            {/* View toggle — outside top-right */}
            <div
              style={{
                position: 'absolute', top: 30, right: -43,
                display: 'flex', flexDirection: 'column',
                border: '1px solid #dfdcd7', background: '#f9f9f8',
                opacity: toggleHovered ? 1 : 0.6,
                transition: 'opacity 0.2s ease',
              }}
              onMouseEnter={() => setToggleHovered(true)}
              onMouseLeave={() => setToggleHovered(false)}
            >
              {([
                { scene: true,  title: 'Scene view',
                  icon: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m3 15 5-5 4 4 3-3 6 6"/><circle cx="8.5" cy="8.5" r="1.5"/></> },
                { scene: false, title: 'Avatar view',
                  icon: <><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></> },
              ] as const).map(({ scene, title, icon }, i, arr) => {
                const isSceneActive = showScene === scene;
                return (
                  <button key={title} onClick={() => setShowScene(scene)} title={title}
                    style={{
                      padding: '9px 10px', border: 'none',
                      borderBottom: i < arr.length - 1 ? '1px solid #dfdcd7' : 'none',
                      background: isSceneActive ? '#f1f0ec' : 'transparent',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={e => { if (!isSceneActive) e.currentTarget.style.background = '#f1f0ec'; }}
                    onMouseLeave={e => { if (!isSceneActive) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                      stroke="#3A342F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {icon}
                    </svg>
                  </button>
                );
              })}
            </div>

            {/* Card */}
            <div
              className="flex flex-col items-center gap-4 rounded-3xl"
              style={{
                background: '#fdfdfc',
                border: '1px solid #dfdcd7',
                boxShadow: '0 8px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
                width: 360,
                padding: 20,
              }}
            >
              {/* Header row with minimize button */}
              <div className="flex items-start justify-between w-full">
                <div className="flex-1 text-center">
                  <h1 className="text-base font-semibold tracking-wide" style={{ color: '#39342f' }}>Skylar</h1>
                  <p className="text-xs mt-0.5" style={{ color: '#7c7770' }}>AI Voice Companion</p>
                </div>
                {/* Minimize / collapse button */}
                <button
                  onClick={() => { if (callState === 'active') endCall(); setWidgetExpanded(false); }}
                  title="Minimize"
                  style={{
                    width: 28, height: 28, borderRadius: 8, border: '1px solid #dfdcd7',
                    background: '#f1f0ec', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#dfdcd7'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f1f0ec'; }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7c7770"
                    strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="17 11 12 6 7 11"/><polyline points="17 18 12 13 7 18"/>
                  </svg>
                </button>
              </div>

              {/* Avatar area */}
              {showScene ? (
                <div className="relative w-full overflow-hidden rounded-xl"
                  style={{ height: SCENE_H }}>
                  <Image src="/coworking-bg.jpg" alt="Office" fill priority
                    style={{ objectFit: 'cover', objectPosition: 'center' }} />
                  <div className="absolute bottom-0 left-1/2" style={{ transform: 'translateX(-50%)' }}>
                    <Avatar isSpeaking={agentSpeaking} audioLevel={agentLevel} bare bareSize={AVATAR_BARE} />
                  </div>
                  {isActive && (
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap"
                      style={{ background: 'rgba(253,253,252,0.9)', backdropFilter: 'blur(8px)',
                        border: '1px solid #dfdcd7', color: '#39342f' }}>
                      <WaveBars speaking={agentSpeaking} />
                      {agentSpeaking ? 'Speaking…' : 'Listening…'}
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <Avatar isSpeaking={agentSpeaking} audioLevel={agentLevel} />
                  {isActive && (
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap"
                      style={{ background: '#f1f0ec', border: '1px solid #dfdcd7', color: '#39342f' }}>
                      <WaveBars speaking={agentSpeaking} />
                      {agentSpeaking ? 'Speaking…' : 'Listening…'}
                    </div>
                  )}
                </div>
              )}

              {/* Timer */}
              {isActive && (
                <p className="text-xs tabular-nums" style={{ color: '#7c7770' }}>{formatDuration(duration)}</p>
              )}

              {/* Error */}
              {error && <p className="text-red-600 text-xs text-center px-2">{error}</p>}

              {/* CTA */}
              {callState === 'idle' || callState === 'ending' ? (
                <button
                  onClick={startCall}
                  disabled={callState === 'ending'}
                  className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all duration-150 active:scale-95"
                  style={{
                    background: callState === 'ending' ? '#c4c0bb' : '#004e23',
                    color: '#ffffff', border: '1px solid transparent',
                    cursor: callState === 'ending' ? 'default' : 'pointer',
                  }}
                  onMouseEnter={e => { if (callState !== 'ending') e.currentTarget.style.background = 'rgba(0,78,35,0.82)'; }}
                  onMouseLeave={e => { if (callState !== 'ending') e.currentTarget.style.background = '#004e23'; }}
                >
                  {callState === 'ending' ? 'Ending…' : 'Start Conversation'}
                </button>
              ) : callState === 'connecting' ? (
                <div className="flex items-center gap-2 text-sm" style={{ color: '#7c7770' }}>
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Connecting…
                </div>
              ) : (
                <button
                  onClick={endCall}
                  className="w-full py-2.5 rounded-xl font-semibold text-sm transition-all duration-150 active:scale-95"
                  style={{ background: '#f9f9f8', border: '1px solid #dfdcd7', color: '#e7000b', cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f1f0ec'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#f9f9f8'; }}
                >
                  End Call
                </button>
              )}

              <p className="text-xs" style={{ color: '#b0aba5' }}>
                Powered by{' '}
                <a href="http://cartesia.ai/" target="_blank" rel="noopener noreferrer" style={{ color: '#7c7770' }}>
                  Cartesia
                </a>
              </p>
            </div>

            {/* Preview animations */}
            {callState === 'idle' && (
              <button
                onClick={startTestMode}
                className="text-xs underline underline-offset-2 transition-colors duration-150"
                style={{ color: '#c4c0bb', marginTop: 10, cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#7c7770'; }}
                onMouseLeave={e => { e.currentTarget.style.color = '#c4c0bb'; }}
              >
                Preview animations
              </button>
            )}
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes bar-pulse-a { 0%, 100% { height: 22% } 40%  { height: 85% } 65%  { height: 40% } }
        @keyframes bar-pulse-b { 0%, 100% { height: 18% } 50%  { height: 100% } }
        @keyframes bar-pulse-c { 0%, 100% { height: 28% } 25%  { height: 55% } 60%  { height: 92% } 82% { height: 35% } }
        @keyframes bar-pulse-d { 0%, 100% { height: 25% } 35%  { height: 70% } 75%  { height: 50% } }
      `}</style>
    </>
  );
}
