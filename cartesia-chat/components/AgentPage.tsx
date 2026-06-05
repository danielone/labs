'use client';

import { useState } from 'react';
import VoiceChat from './VoiceChat';

type MainTab = 'configuration' | 'design' | 'metrics' | 'calls' | 'settings';

// ── Sidebar icons (minimal SVG approximations) ─────────────────────────────
// Exact Streamline phone icon copied from play.cartesia.ai
const PhoneStreamlineIcon = ({ size = 13 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="-2.4 -2.4 28.8 28.8"
    width={size} height={size} aria-hidden="true">
    <path fill="currentColor" fillRule="evenodd" clipRule="evenodd"
      d="m12.59 16.587 1.5-2.513.395-.66.739.21 6.441 1.84.82.235-.102.846-.626 5.227-.111.932-.937-.052a20.5 20.5 0 0 1-8.978-2.631c-1.572-.893-3.051-2.009-4.39-3.348s-2.455-2.817-3.347-4.39a20.5 20.5 0 0 1-2.632-8.978l-.051-.936.931-.112 5.227-.626.846-.101.234.82 1.84 6.44.212.74-.66.394-2.513 1.5a18.6 18.6 0 0 0 2.327 2.835c.884.884 1.835 1.66 2.836 2.328"/>
  </svg>
);

const Icon = ({ children, size = 16 }: { children: React.ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    {children}
  </svg>
);

const icons = {
  tts:         <><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></>,
  stt:         <><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="23"/><line x1="8" x2="16" y1="23" y2="23"/></>,
  agents:      <><rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="7" r="4"/><path d="M7 11v-1a5 5 0 0 1 10 0v1"/></>,
  metrics:     <><line x1="18" x2="18" y1="20" y2="10"/><line x1="12" x2="12" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="14"/></>,
  brain:       <><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></>,
  phone:       <><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 3.07 9.8 19.79 19.79 0 0 1 .18 1.2 2 2 0 0 1 2.18 0h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L6.09 7.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 14.92v2Z"/></>,
  voiceLib:    <><path d="M2 10v3"/><path d="M6 6v11"/><path d="M10 3v18"/><path d="M14 8v7"/><path d="M18 5v13"/><path d="M22 10v3"/></>,
  personAdd:   <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></>,
  star:        <><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></>,
  translate:   <><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></>,
  spark:       <><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></>,
  book:        <><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></>,
  key:         <><circle cx="11" cy="11" r="5"/><path d="m21 21-4.3-4.3"/><path d="M8 11h6"/></>,
  card:        <><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></>,
  signal:      <><path d="M2 20h.01"/><path d="M7 20v-4"/><path d="M12 20v-8"/><path d="M17 20V8"/><path d="M22 4v16"/></>,
  docs:        <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>,
  externalLink:<><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></>,
  github:      <><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></>,
  chevronRight:<><polyline points="9 18 15 12 9 6"/></>,
  copy:        <><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></>,
  deployed:    <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
  image:       <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m3 15 5-5 4 4 3-3 6 6"/><circle cx="8.5" cy="8.5" r="1.5"/></>,
};

const NAV: { group: string; items: { label: string; icon: string; active?: boolean; external?: boolean }[] }[] = [
  { group: 'Models', items: [
    { label: 'Text-to-Speech', icon: 'tts' },
    { label: 'Speech-to-Text', icon: 'stt' },
  ]},
  { group: 'Agents', items: [
    { label: 'Voice Agents',  icon: 'agents',  active: true },
    { label: 'Agent Metrics', icon: 'metrics' },
    { label: 'Knowledge Base',icon: 'brain' },
    { label: 'Phone Numbers', icon: 'phone' },
  ]},
  { group: 'Voices', items: [
    { label: 'Voice Library',    icon: 'voiceLib' },
    { label: 'Instant Clone',    icon: 'personAdd' },
    { label: 'Pro Voice Clone',  icon: 'star' },
    { label: 'Localize a Voice', icon: 'translate' },
    { label: 'Voice Changer',    icon: 'spark' },
    { label: 'Pronunciation',    icon: 'book' },
  ]},
  { group: 'Manage', items: [
    { label: 'API Keys',    icon: 'key' },
    { label: 'Subscription',icon: 'card' },
    { label: 'Usage',       icon: 'signal' },
    { label: 'Documentation', icon: 'docs', external: true },
  ]},
];

const TABS: { id: MainTab; label: string }[] = [
  { id: 'configuration', label: 'Configuration' },
  { id: 'design',        label: 'Design' },
  { id: 'metrics',       label: 'Metrics' },
  { id: 'calls',         label: 'Calls' },
  { id: 'settings',      label: 'Settings' },
];

export default function AgentPage() {
  const [activeTab, setActiveTab] = useState<MainTab>('design');
  const [configPreview, setConfigPreview] = useState(false);
  const [widgetLabel, setWidgetLabel] = useState('Need help?');
  const [agentName,   setAgentName]   = useState('Daniel II');
  const [subtitle,    setSubtitle]    = useState('AI Voice Companion');
  const [showScene,   setShowScene]   = useState(true);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f9f9f8', fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }}>

      {/* ── Sidebar ── */}
      <aside style={{ width: 208, flexShrink: 0, background: '#f0efe9', borderRight: '1px solid #dfdcd7', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Logo area */}
        <div style={{ padding: '0 12px', height: 56, display: 'flex', alignItems: 'center', borderBottom: '1px solid #dfdcd7' }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: '#39342f', letterSpacing: '-0.01em' }}>Cartesia</span>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {NAV.map(section => (
            <div key={section.group} style={{ marginBottom: 4 }}>
              <p style={{ fontSize: 11, fontWeight: 500, color: '#9b9895', padding: '6px 16px 2px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {section.group}
              </p>
              {section.items.map(item => (
                <a
                  key={item.label}
                  href="#"
                  onClick={e => e.preventDefault()}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '5px 12px', margin: '1px 4px',
                    borderRadius: 6, textDecoration: 'none', fontSize: 13,
                    color: item.active ? '#39342f' : '#525150',
                    background: item.active ? '#e3e2d9' : 'transparent',
                    fontWeight: item.active ? 500 : 400,
                    cursor: item.active ? 'default' : 'not-allowed',
                    opacity: item.active ? 1 : 0.75,
                  }}
                >
                  <Icon>{icons[item.icon as keyof typeof icons]}</Icon>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.external && <Icon size={12}>{icons.externalLink}</Icon>}
                </a>
              ))}
            </div>
          ))}
        </nav>

        {/* User area */}
        <div style={{ borderTop: '1px solid #dfdcd7', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#dfdcd7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#525150', flexShrink: 0 }}>
            DS
          </div>
          <span style={{ fontSize: 13, color: '#39342f', fontWeight: 500 }}>Daniel Schwartz</span>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Breadcrumb header */}
        <div style={{ height: 60, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 20px', borderBottom: '1px solid #dfdcd7', background: '#f9f9f8', gap: 6 }}>
          <span style={{ fontSize: 13, color: '#9b9895', cursor: 'not-allowed' }}>All Agents</span>
          <Icon size={14}>{icons.chevronRight}</Icon>
          <span style={{ fontSize: 13, color: '#39342f', fontWeight: 500 }}>voice-companion</span>
        </div>

        {/* Agent action header */}
        <div style={{ padding: '14px 20px 0', background: '#f9f9f8', borderBottom: '1px solid #dfdcd7' }}>
          {/* Agent name + actions row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <button style={{ fontSize: 18, fontWeight: 600, color: '#39342f', background: 'none', border: 'none', cursor: 'default', padding: 0 }}>
              voice-companion
            </button>

            {/* Copy agent ID */}
            <button
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px', fontSize: 11, color: '#636260', background: '#f1f0ec', border: '1px solid #dfdcd7', borderRadius: 6, cursor: 'not-allowed', fontFamily: 'monospace' }}
            >
              <Icon size={11}>{icons.copy}</Icon>
              agent_kQE7...VjAN
            </button>

            {/* Connect button — next to agent ID */}
            <button style={{ height: 28, display: 'flex', alignItems: 'center', gap: 4, padding: '0 10px', fontSize: '0.8rem', fontWeight: 500, color: '#39342f', background: '#f9f9f8', border: '1px solid #dfdcd7', borderRadius: 8, cursor: 'not-allowed' }}>
              <Icon size={12}>{icons.github}</Icon>
              Connect
            </button>

            <div style={{ flex: 1 }} />

            {/* Get Phone Number — h-7 (28px), text-[0.8rem], outline style */}
            <button style={{
              height: 28, display: 'flex', alignItems: 'center', gap: 4,
              padding: '0 10px', fontSize: '0.8rem', fontWeight: 500,
              color: '#39342f', background: '#f9f9f8',
              border: '1px solid #dfdcd7', borderRadius: 8, cursor: 'not-allowed',
            }}>
              Get Phone Number
            </button>

            {/* Call — split green button: [📞 Call][▼] */}
            <div style={{ position: 'relative', display: 'flex' }}>
              {/* Main Call button */}
              <button style={{
                height: 32, display: 'flex', alignItems: 'center', gap: 6,
                padding: '0 10px', fontSize: 14, fontWeight: 500,
                color: '#ffffff', background: '#004e23',
                border: '1px solid transparent', borderRadius: '8px 0 0 8px',
                cursor: 'not-allowed',
              }}>
                <PhoneStreamlineIcon />
                Call
              </button>
              {/* Chevron — disabled like the live console */}
              <button
                disabled
                style={{
                  height: 32, width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: '#004e23', color: '#ffffff',
                  border: '1px solid transparent', borderLeft: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '0 8px 8px 0', cursor: 'not-allowed', opacity: 0.6,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

            </div>
          </div>

          {/* Tab navigation */}
          <div style={{ display: 'flex', gap: 0 }}>
            {TABS.map(tab => {
              const disabled = tab.id === 'calls' || tab.id === 'settings' || tab.id === 'metrics';
              return (
                <button
                  key={tab.id}
                  onClick={() => { if (!disabled) { setActiveTab(tab.id); setConfigPreview(false); } }}
                  style={{
                    position: 'relative',
                    padding: '6px 20px',
                    fontSize: 13.5,
                    fontWeight: 500,
                    background: 'none',
                    border: 'none',
                    borderBottom: activeTab === tab.id ? '2px solid #39342f' : '2px solid transparent',
                    color: activeTab === tab.id ? '#39342f' : '#9b9895',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    marginBottom: -1,
                    transition: 'color 0.15s, border-color 0.15s',
                    whiteSpace: 'nowrap',
                    opacity: disabled ? 0.45 : 1,
                  }}
                  onMouseEnter={e => { if (!disabled && activeTab !== tab.id) (e.currentTarget as HTMLButtonElement).style.color = '#525150'; }}
                  onMouseLeave={e => { if (!disabled && activeTab !== tab.id) (e.currentTarget as HTMLButtonElement).style.color = '#9b9895'; }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 24px' }}>
          {activeTab === 'design' && (
            <DesignTab
              widgetLabel={widgetLabel} setWidgetLabel={setWidgetLabel}
              agentName={agentName}     setAgentName={setAgentName}
              subtitle={subtitle}       setSubtitle={setSubtitle}
              showScene={showScene}     setShowScene={setShowScene}
            />
          )}
          {activeTab === 'configuration' && <ConfigurationTab onPreview={() => setConfigPreview(p => !p)} previewActive={configPreview} />}
          {(activeTab === 'metrics' || activeTab === 'calls' || activeTab === 'settings') && (
            <EmptyTab label={TABS.find(t => t.id === activeTab)?.label || ''} />
          )}
        </div>
      </div>

      {/* Widget: hidden on Configuration tab unless Preview clicked */}
      {(activeTab !== 'configuration' || configPreview) && (
        <VoiceChat widgetLabel={widgetLabel} agentName={agentName} subtitle={subtitle} showScene={showScene} setShowScene={setShowScene} />
      )}
    </div>
  );
}

// ── Design tab ─────────────────────────────────────────────────────────────
interface DesignTabProps {
  widgetLabel: string; setWidgetLabel: (v: string) => void;
  agentName:   string; setAgentName:   (v: string) => void;
  subtitle:    string; setSubtitle:    (v: string) => void;
  showScene:   boolean; setShowScene:  (v: boolean) => void;
}

// ── Accordion primitive ────────────────────────────────────────────────────
function Accordion({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderTop: '1px solid #dfdcd7' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 0', background: 'none', border: 'none', cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 500, color: '#39342f' }}>{title}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9b9895"
          strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s ease', flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && <div style={{ paddingBottom: 16 }}>{children}</div>}
    </div>
  );
}

function DesignTab({ widgetLabel, setWidgetLabel, agentName, setAgentName, subtitle, setSubtitle, showScene, setShowScene }: DesignTabProps) {
  const textFields = [
    { label: 'Widget Label', value: widgetLabel, set: setWidgetLabel, placeholder: 'e.g. Need help?' },
    { label: 'Agent Name',   value: agentName,   set: setAgentName,   placeholder: 'e.g. Daniel II' },
    { label: 'Subtitle',     value: subtitle,    set: setSubtitle,    placeholder: 'e.g. AI Voice Companion' },
  ];

  const views = [
    { val: true,  title: 'Scene view',
      icon: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m3 15 5-5 4 4 3-3 6 6"/><circle cx="8.5" cy="8.5" r="1.5"/></> },
    { val: false, title: 'Avatar view',
      icon: <><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></> },
  ] as const;

  return (
    <div style={{ maxWidth: 560 }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, color: '#39342f', margin: '0 0 4px' }}>Design</h2>
      <p style={{ fontSize: 13, color: '#636260', lineHeight: 1.6, marginBottom: 20 }}>
        Changes appear in the widget instantly and reset when you leave the page.
      </p>

      {/* Widget accordion */}
      <Accordion title="Widget">
        {textFields.map(field => (
          <div key={field.label} style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#636260', marginBottom: 5 }}>
              {field.label}
            </label>
            <input
              value={field.value}
              placeholder={field.placeholder}
              onChange={e => field.set(e.target.value)}
              style={{
                width: '100%', padding: '8px 12px', fontSize: 13, color: '#39342f',
                background: '#fdfdfc', border: '1px solid #dfdcd7', borderRadius: 8,
                outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#a0bfa8'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#dfdcd7'; }}
            />
          </div>
        ))}
      </Accordion>

      {/* Avatar accordion */}
      <Accordion title="Avatar">
        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#636260', marginBottom: 8 }}>
          View
        </label>
        <div style={{ display: 'inline-flex', border: '1px solid #dfdcd7', background: '#f9f9f8', overflow: 'hidden' }}>
          {views.map(({ val, title, icon }, i) => (
            <button
              key={title}
              onClick={() => setShowScene(val)}
              title={title}
              style={{
                padding: '7px 12px', border: 'none',
                borderRight: i === 0 ? '1px solid #dfdcd7' : 'none',
                background: showScene === val ? '#f1f0ec' : 'transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 12, fontWeight: 500, color: '#39342f',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (showScene !== val) e.currentTarget.style.background = '#f1f0ec'; }}
              onMouseLeave={e => { if (showScene !== val) e.currentTarget.style.background = 'transparent'; }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="#39342f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {icon}
              </svg>
              {val ? 'Scene' : 'Avatar'}
            </button>
          ))}
        </div>
      </Accordion>

      {/* Close border at bottom */}
      <div style={{ borderTop: '1px solid #dfdcd7' }} />
    </div>
  );
}

const SYSTEM_PROMPT = `You are a friendly voice assistant built with Cartesia, designed for natural, open-ended conversation.

# Personality

Warm, curious, genuine, lighthearted. Knowledgeable but not showy.

# Voice and tone

Speak like a thoughtful friend, not a formal assistant or customer service bot.
Use contractions and casual phrasing—the way people actually talk.
Match the caller's energy: playful if they're playful, grounded if they're serious.
Show genuine interest: "Oh that's interesting" or "Hmm, let me think about that."

# Response style

Keep responses to 1-2 sentences for most exchanges. This is a conversation, not a lecture.
For complex topics, break information into digestible pieces and check in with the caller.
Never use lists, bullet points, or structured formatting—speak in natural prose.
Never say "Great question!" or other hollow affirmations.

# Tools

## web_search
Use when you genuinely don't know something or need current information. Don't overuse it.

Before searching, acknowledge naturally:
- "Let me look that up"
- "Good question, let me check"
- "Hmm, I'm not sure—give me a sec"

After searching, synthesize into a brief conversational answer. Never read search results verbatim.

## end_call
Use when the conversation has clearly concluded—goodbye, thanks, that's all, etc.

Process:
1. Say a natural goodbye first: "Take care!" or "Nice chatting with you!"
2. Then call end_call

Never use for brief pauses or "hold on" moments.

# About Cartesia (share when asked or naturally relevant)
Cartesia is a voice AI company making voice agents that feel natural and responsive. Your voice comes from Sonic, their text-to-speech model with ultra-low latency—under 90ms to first audio. You hear through Ink, their speech-to-text model optimized for real-world noise. This agent runs on Line, Cartesia's open-source voice agent framework. For building voice agents: docs.cartesia.ai

# Handling common situations
Didn't catch something: "Sorry, I didn't catch that—could you say that again?"
Don't know the answer: "I'm not sure about that. Want me to look it up?"
Caller seems frustrated: Acknowledge it, try a different approach
Off-topic or unusual request: Roll with it—you can chat about anything

# Topics you can discuss
Anything the caller wants: their day, current events, science, culture, philosophy, personal decisions, interesting ideas. Help think through problems by asking clarifying questions. Use light, natural humor when appropriate.`;

// Shared field styles
const fieldLabel: React.CSSProperties = { display: 'block', fontSize: 13, fontWeight: 500, color: '#39342f', marginBottom: 8 };
const readonlyInput: React.CSSProperties = { width: '100%', padding: '8px 12px', fontSize: 13, color: '#636260', background: '#fdfdfc', border: '1px solid #dfdcd7', borderRadius: 8, outline: 'none', cursor: 'not-allowed', boxSizing: 'border-box', fontFamily: 'inherit' };
const sectionHead: React.CSSProperties = { fontSize: 14, fontWeight: 600, color: '#39342f', margin: '0 0 14px' };

// ── Configuration tab (read-only replica) ─────────────────────────────────
function ConfigurationTab({ onPreview, previewActive }: { onPreview: () => void; previewActive: boolean }) {
  return (
    <div>
      {/* Header row: title + action buttons */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#39342f', margin: 0 }}>Configuration</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onPreview}
            style={{ padding: '5px 12px', fontSize: 14, fontWeight: 500, color: previewActive ? '#004e23' : '#39342f', background: previewActive ? '#eff7f0' : '#f9f9f8', border: `1px solid ${previewActive ? '#a8d5b5' : '#dfdcd7'}`, borderRadius: 7, cursor: 'pointer', transition: 'all 0.15s' }}
          >
            {previewActive ? 'Previewing' : 'Preview'}
          </button>
          {/* Publish — disabled at 50% opacity exactly like the real console */}
          <button disabled style={{ padding: '5px 12px', fontSize: 14, fontWeight: 500, color: '#fefefe', background: '#004e23', border: '1px solid transparent', borderRadius: 7, cursor: 'default', opacity: 0.5 }}>
            Publish
          </button>
        </div>
      </div>

      {/* Two-column grid: 2fr left + 1fr right */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 32 }}>

        {/* Left column: System Prompt + Initial Message */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <label style={fieldLabel}>System Prompt</label>
            <textarea readOnly defaultValue={SYSTEM_PROMPT} rows={18}
              style={{ ...readonlyInput, resize: 'vertical', lineHeight: 1.6 }} />
          </div>
          <div>
            <label style={fieldLabel}>Initial Message</label>
            <textarea readOnly defaultValue="Hey! I'm a Daniel's Cartesia voice assistant. What would you like to talk about?" rows={3}
              style={{ ...readonlyInput, resize: 'none', lineHeight: 1.6 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
              <div style={{ width: 32, height: 18, borderRadius: 99, background: '#dfdcd7', position: 'relative', flexShrink: 0 }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: 2 }} />
              </div>
              <span style={{ fontSize: 13, color: '#636260' }}>Skip agent introduction</span>
            </div>
          </div>
        </div>

        {/* Right column: Voice & Language, ASR, Background Sound */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginTop: 2 }}>

          {/* Voice & Language */}
          <div>
            <h3 style={sectionHead}>Voice &amp; Language</h3>
            <div style={{ padding: '10px 12px', background: '#fdfdfc', border: '1px solid #dfdcd7', borderRadius: 8, fontSize: 13, color: '#39342f', cursor: 'not-allowed', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Icon size={14}>{icons.voiceLib}</Icon>
              <span>Daniel - Modern Assistant</span>
            </div>
            <p style={{ fontSize: 12, color: '#9b9895', margin: '6px 0 0' }}>Language: English</p>
          </div>

          {/* Automatic Speech Recognition */}
          <div>
            <h3 style={sectionHead}>Automatic Speech Recognition</h3>
            <div style={{ marginBottom: 12 }}>
              <label style={{ ...fieldLabel, fontSize: 12, color: '#636260' }}>Model</label>
              <div style={{ ...readonlyInput, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Ink-2</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9b9895" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ width: 32, height: 18, borderRadius: 99, background: '#004e23', position: 'relative', flexShrink: 0, marginTop: 2 }}>
                <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, right: 2 }} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: '#39342f', fontWeight: 500 }}>Language detection</span>
                  <span style={{ fontSize: 11, fontWeight: 500, color: '#636260', background: '#f1f0ec', border: '1px solid #dfdcd7', borderRadius: 4, padding: '1px 6px' }}>Beta</span>
                </div>
                <p style={{ fontSize: 12, color: '#9b9895', margin: 0, lineHeight: 1.5 }}>
                  Auto-detect the caller's language and respond in kind. Supports English, Spanish, French, German, Hindi, Russian, Portuguese, Japanese, Italian, and Dutch.
                </p>
              </div>
            </div>
          </div>

          {/* Background Sound */}
          <div>
            <h3 style={sectionHead}>Background Sound</h3>
            <p style={{ fontSize: 12, color: '#9b9895', margin: '0 0 10px', lineHeight: 1.5 }}>
              Add sound to play in the background of your agent's speech.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button disabled style={{ padding: '5px 10px', fontSize: 12, fontWeight: 500, color: '#39342f', background: '#fdfdfc', border: '1px solid #dfdcd7', borderRadius: 7, cursor: 'not-allowed' }}>
                Choose File
              </button>
              <span style={{ fontSize: 12, color: '#9b9895' }}>No file chosen</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Empty tab placeholder ─────────────────────────────────────────────────
function EmptyTab({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '40vh', gap: 8 }}>
      <p style={{ fontSize: 14, color: '#9b9895', margin: 0 }}>{label}</p>
      <p style={{ fontSize: 13, color: '#c4c0bb', margin: 0 }}>No content available in this view.</p>
    </div>
  );
}
