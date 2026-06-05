'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Image from 'next/image';

// Shared phone icon — exact path + fill-rule from phone.svg
function PhoneIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      style={{ fillRule: 'evenodd', clipRule: 'evenodd', flexShrink: 0 } as React.CSSProperties}>
      <g transform="matrix(1,0,0,1,-18.0625,-18.061461)">
        <path style={{ fillRule: 'nonzero' } as React.CSSProperties}
          d="M19.9,44.5C22.1,50.4 25.4,55.9 30.2,61.8C36.1,68.9 43.3,74.5 51.4,78.4C54.5,79.9 58.7,81.6 63.3,81.9L64.1,81.9C67.2,81.9 69.8,80.8 71.8,78.6L71.9,78.5C72.6,77.6 73.4,76.9 74.3,76C74.9,75.4 75.5,74.9 76.1,74.3C78.8,71.5 78.8,68 76.1,65.3L68.6,57.8C67.3,56.5 65.8,55.8 64.2,55.8C62.6,55.8 61,56.5 59.7,57.8L55.3,62.2C54.9,62 54.5,61.8 54.1,61.6C53.6,61.4 53.1,61.1 52.7,60.9C48.7,58.3 45,55 41.5,50.7C39.7,48.5 38.6,46.6 37.7,44.7C38.8,43.7 39.9,42.6 41,41.5C41.4,41.1 41.8,40.7 42.2,40.3C45,37.5 45,34 42.2,31.2L38.5,27.5C38.1,27.1 37.7,26.6 37.2,26.2C36.4,25.4 35.5,24.5 34.7,23.7C33.4,22.4 31.9,21.7 30.3,21.7C28.7,21.7 27.2,22.4 25.8,23.7L21,28.4C19.3,30.1 18.3,32.2 18.1,34.6C17.9,37.5 18.5,40.7 19.9,44.5ZM21.4,34.8C21.5,33.2 22.2,31.8 23.3,30.6L27.9,26C28.6,25.3 29.4,25 30.1,25C30.8,25 31.6,25.4 32.3,26.1C33.1,26.9 33.9,27.7 34.8,28.5C35.2,28.9 39.8,33.5 39.8,33.5C41.3,35 41.3,36.5 39.8,38C39.4,38.4 39,38.8 38.6,39.2C37.5,40.4 36.4,41.5 35.2,42.5L35.1,42.6C34,43.7 34.2,44.7 34.5,45.4L34.5,45.5C35.5,47.8 36.8,50 38.9,52.6C42.6,57.2 46.6,60.8 50.9,63.5C51.4,63.8 52,64.1 52.6,64.4C53.1,64.6 53.6,64.9 54,65.1L54.1,65.2C54.5,65.4 54.9,65.5 55.3,65.5C56.3,65.5 57,64.8 57.2,64.6L61.8,60C62.5,59.3 63.3,58.9 64,58.9C64.9,58.9 65.7,59.5 66.1,60L73.6,67.5C75.4,69.3 74.6,71 73.6,72.1C73.1,72.7 72.5,73.2 71.9,73.7C71,74.5 70.1,75.4 69.3,76.4C67.9,77.9 66.2,78.6 64,78.6L63.4,78.6C59.3,78.3 55.5,76.7 52.7,75.4C45,71.7 38.2,66.4 32.6,59.6C28,54 24.9,48.8 22.8,43.3C21.6,40 21.1,37.4 21.4,34.8ZM51.3,31.1C51.4,30.2 52.3,29.6 53.2,29.8C57.5,30.5 61.3,32.5 64.4,35.6C67.5,38.7 69.5,42.6 70.2,46.8C70.3,47.7 69.8,48.5 68.9,48.7L68.6,48.7C67.8,48.7 67.2,48.1 67,47.4C66.4,43.8 64.7,40.5 62.1,37.9C59.5,35.3 56.2,33.6 52.6,33C51.8,32.8 51.2,31.9 51.3,31.1ZM78.7,46.8C77.6,40.4 74.6,34.6 70,30C65.4,25.4 59.6,22.4 53.2,21.3C52.3,21.2 51.7,20.3 51.9,19.4C52,18.5 52.9,17.9 53.8,18.1C60.8,19.3 67.3,22.6 72.4,27.7C77.5,32.8 80.8,39.2 82,46.3C82.1,47.2 81.6,48 80.7,48.2L80.4,48.2C79.5,48.1 78.8,47.6 78.7,46.8Z"/>
      </g>
    </svg>
  );
}
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

interface VoiceChatProps {
  widgetLabel?: string;
  agentName?:   string;
  subtitle?:    string;
  showScene?:   boolean;
  setShowScene?: (v: boolean) => void;
  avatarSrc?:   string;
}

export default function VoiceChat({
  widgetLabel  = 'Need help?',
  agentName    = 'Daniel II',
  subtitle     = 'AI Voice Companion',
  showScene:   showSceneProp,
  setShowScene: setShowSceneProp,
  avatarSrc    = '/avatar.png',
}: VoiceChatProps = {}) {
  const [widgetExpanded, setWidgetExpanded] = useState(false);
  const [callState, setCallState] = useState<CallState>('idle');
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [agentLevel, setAgentLevel] = useState(0);
  const [userLevel, setUserLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  // Use prop-controlled values when provided (from Design tab), else internal state
  const [showSceneInternal, setShowSceneInternal] = useState(true);
  const showScene   = showSceneProp   !== undefined ? showSceneProp   : showSceneInternal;
  const setShowScene = setShowSceneProp !== undefined ? setShowSceneProp : setShowSceneInternal;
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

        {/* ── COLLAPSED WIDGET (82.5% of original) ── */}
        {!widgetExpanded && (
          <div
            style={{
              width: 238,
              background: '#fdfdfc',
              border: '1px solid #dfdcd7',
              borderRadius: 17,
              boxShadow: '0 8px 40px rgba(0,0,0,0.13), 0 2px 8px rgba(0,0,0,0.06)',
              padding: 13,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            {/* Avatar + label row + expand button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 43, height: 43, borderRadius: '50%', overflow: 'hidden',
                border: '2px solid #dfdcd7', background: '#f1f0ec', flexShrink: 0,
              }}>
                <Image src={avatarSrc} alt="Skylar" width={43} height={43}
                  style={{ objectFit: 'cover', width: '100%', height: '100%' }} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#39342f', flex: 1 }}>{widgetLabel}</span>
              {/* Expand button — opens card without starting a call */}
              <button
                onClick={() => setWidgetExpanded(true)}
                title="Expand"
                style={{
                  width: 26, height: 26, borderRadius: 7, border: '1px solid #dfdcd7',
                  background: '#f1f0ec', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#dfdcd7'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f1f0ec'; }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#7c7770"
                  strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="7 13 12 8 17 13"/><polyline points="7 19 12 14 17 19"/>
                </svg>
              </button>
            </div>

            {/* Start button */}
            <button
              onClick={() => { setWidgetExpanded(true); startCall(); }}
              style={{
                background: '#004e23',
                color: '#ffffff',
                border: 'none',
                borderRadius: 12,
                padding: '9px 15px',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,78,35,0.82)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#004e23'; }}
            >
              <PhoneIcon size={12} />
              Start Conversation
            </button>
          </div>
        )}

        {/* ── EXPANDED CALL CARD ── */}
        {widgetExpanded && (
          <div className="relative flex flex-col items-center">

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
                  <h1 className="text-base font-semibold tracking-wide" style={{ color: '#39342f' }}>{agentName}</h1>
                  <p className="text-xs mt-0.5" style={{ color: '#7c7770' }}>{subtitle}</p>
                </div>
                {/* Minimize — only when call is not active */}
                {callState === 'idle' && <button
                  onClick={() => { setWidgetExpanded(false); }}
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
                    <polyline points="7 6 12 11 17 6"/><polyline points="7 13 12 18 17 13"/>
                  </svg>
                </button>}
              </div>

              {/* Avatar area */}
              {showScene ? (
                <div className="relative w-full overflow-hidden rounded-xl"
                  style={{ height: SCENE_H }}>
                  <Image src="/coworking-bg.jpg" alt="Office" fill priority
                    style={{ objectFit: 'cover', objectPosition: 'center' }} />
                  <div className="absolute bottom-0 left-1/2" style={{ transform: 'translateX(-50%)' }}>
                    <Avatar isSpeaking={agentSpeaking} audioLevel={agentLevel} bare bareSize={AVATAR_BARE} avatarSrc={avatarSrc} />
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
                  <Avatar isSpeaking={agentSpeaking} audioLevel={agentLevel} avatarSrc={avatarSrc} />
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
                    color: '#ffffff', border: 'none',
                    cursor: callState === 'ending' ? 'default' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  }}
                  onMouseEnter={e => { if (callState !== 'ending') e.currentTarget.style.background = 'rgba(0,78,35,0.82)'; }}
                  onMouseLeave={e => { if (callState !== 'ending') e.currentTarget.style.background = '#004e23'; }}
                >
                  {callState !== 'ending' && <PhoneIcon size={13} />}
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
