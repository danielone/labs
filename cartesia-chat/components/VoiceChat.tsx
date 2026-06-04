'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Avatar from './Avatar';
import AudioBars from './AudioBars';
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

export default function VoiceChat() {
  const [callState, setCallState] = useState<CallState>('idle');
  const [agentSpeaking, setAgentSpeaking] = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [agentLevel, setAgentLevel] = useState(0);
  const [userLevel, setUserLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
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

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <SFBackground />

      <div
        className="relative z-10 flex flex-col items-center gap-6 p-8 rounded-3xl"
        style={{
          background: 'rgba(10, 20, 50, 0.55)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid rgba(100, 160, 255, 0.18)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
          width: '360px',
          maxWidth: '95vw',
        }}
      >
        {/* Header */}
        <div className="text-center">
          <h1 className="text-white text-xl font-semibold tracking-wide">Skylar</h1>
          <p className="text-blue-300 text-sm mt-0.5 opacity-80">AI Voice Companion</p>
        </div>

        {/* Avatar */}
        <div className="relative">
          <Avatar isSpeaking={agentSpeaking} audioLevel={agentLevel} />
          {isActive && (
            <div
              className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap"
              style={{
                background: 'rgba(10,20,50,0.85)',
                border: '1px solid rgba(100,160,255,0.3)',
                color: agentSpeaking ? '#7dd3fc' : '#94a3b8',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: agentSpeaking ? '#38bdf8' : '#64748b',
                  animation: agentSpeaking ? 'blink 0.8s ease-in-out infinite' : 'none',
                }}
              />
              {agentSpeaking ? 'Speaking…' : 'Listening'}
            </div>
          )}
        </div>

        {/* Agent audio bars */}
        <div className="w-full space-y-1">
          <p className="text-xs text-blue-300 font-medium text-center opacity-70">Skylar</p>
          <div
            className="rounded-xl overflow-hidden px-2 py-2"
            style={{
              background: 'rgba(14, 30, 70, 0.6)',
              border: '1px solid rgba(56, 189, 248, 0.15)',
            }}
          >
            <AudioBars analyser={agentAnalyser} color="agent" isActive={agentSpeaking} barCount={28} height={52} />
          </div>
        </div>

        {/* Divider */}
        <div className="flex items-center w-full gap-3">
          <div className="flex-1 h-px" style={{ background: 'rgba(100,130,180,0.2)' }} />
          <span className="text-xs text-slate-500">You</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(100,130,180,0.2)' }} />
        </div>

        {/* User audio bars */}
        <div className="w-full">
          <div
            className="rounded-xl overflow-hidden px-2 py-2 transition-all duration-200"
            style={{
              background: 'rgba(40, 10, 70, 0.45)',
              border: userSpeaking ? '1px solid rgba(192, 132, 252, 0.4)' : '1px solid rgba(192, 132, 252, 0.12)',
            }}
          >
            <AudioBars analyser={userAnalyser} color="user" isActive={userSpeaking} barCount={28} height={40} />
          </div>
        </div>

        {/* Timer */}
        {isActive && (
          <p className="text-slate-400 text-sm tabular-nums">{formatDuration(duration)}</p>
        )}

        {/* Error */}
        {error && <p className="text-red-400 text-sm text-center px-2">{error}</p>}

        {/* CTA */}
        {callState === 'idle' || callState === 'ending' ? (
          <button
            onClick={startCall}
            disabled={callState === 'ending'}
            className="w-full py-3.5 rounded-2xl text-white font-semibold text-sm transition-all duration-200 active:scale-95"
            style={{
              background:
                callState === 'ending'
                  ? 'rgba(30,60,120,0.4)'
                  : 'linear-gradient(135deg, #1e6fa8 0%, #1d4ed8 100%)',
              boxShadow: callState === 'ending' ? 'none' : '0 4px 24px rgba(30,111,168,0.5)',
            }}
          >
            {callState === 'ending' ? 'Ending…' : 'Start Conversation'}
          </button>
        ) : callState === 'connecting' ? (
          <div className="flex items-center gap-2 text-blue-300 text-sm">
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Connecting…
          </div>
        ) : (
          <button
            onClick={endCall}
            className="w-full py-3.5 rounded-2xl text-white font-semibold text-sm transition-all duration-200 active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)',
              boxShadow: '0 4px 24px rgba(127,29,29,0.4)',
            }}
          >
            End Call
          </button>
        )}

        <p className="text-slate-600 text-xs">
          Powered by <span className="text-slate-500 font-medium">Cartesia</span>
        </p>
      </div>

      <style jsx global>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
