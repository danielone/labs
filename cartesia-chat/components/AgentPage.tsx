'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import VoiceChat from './VoiceChat';
import WidgetBaseColorPicker from './WidgetBaseColorPicker';

type MainTab = 'configuration' | 'design' | 'metrics' | 'calls' | 'settings';

// ── Icon components ──────────────────────────────────────────────────────────
// Stroke-based icon (Lucide-style) — used in UI chrome (breadcrumbs, buttons, etc.)
const Icon = ({ children, size = 16 }: { children: React.ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    {children}
  </svg>
);

// Fill-based Streamline icon — used in sidebar nav (exact paths from play.cartesia.ai)
const NavIcon = ({ children, size = 16 }: { children: React.ReactNode; size?: number }) => (
  <svg width={size} height={size} viewBox="-2.4 -2.4 28.8 28.8"
    xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }} aria-hidden="true">
    {children}
  </svg>
);

// Stroke icons — used in UI chrome (breadcrumbs, code block, deploy panel, etc.)
const icons = {
  heart:       <><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></>,
  externalLink:<><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></>,
  github:      <><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"/></>,
  chevronRight:<><polyline points="9 18 15 12 9 6"/></>,
  copy:        <><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></>,
  deployed:    <><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></>,
  image:       <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m3 15 5-5 4 4 3-3 6 6"/><circle cx="8.5" cy="8.5" r="1.5"/></>,
};

// Streamline fill icons — exact paths copied from play.cartesia.ai sidebar
const navIcons = {
  tts:       <path fill="currentColor" fillRule="evenodd" d="M1 1h22v19H11.384l-4.608 2.85-1.526.944V20H1zm10 4v11h2V5zM7 7v7h2V7zm8 7V7h2v7z" clipRule="evenodd"/>,
  stt:       <path fill="currentColor" fillRule="evenodd" d="M3.5 0h7.937v7.031a3.969 3.969 0 0 1-7.937 0zm3 14.434C2.848 13.945 0 10.823 0 7.03h2C2 10.045 4.473 12.5 7.5 12.5a5.5 5.5 0 0 0 2.962-.865l1.076 1.686c-.9.575-1.933.965-3.038 1.113V16.5h-2zm10-5.955h-1.044l-.363.98-5 13.5L12.907 24l1.563-4.222h5.06l1.563 4.222 2.814-1.042-5-13.5-.363-.98zm1.919 8.3L17 12.95l-1.419 3.83zM20.5 2.5h-4v-2h6v4H24v1L21.5 8 19 5.5v-1h1.5z" clipRule="evenodd"/>,
  agents:    <path fill="currentColor" fillRule="evenodd" d="M23 2.5h-3.724V1h-2v1.5h-3.77v8H23zm-7.477 3.082v2h2v-2zm3.5 2v-2h2v2zM9.602 23V5.796h2V23zM5.3 20.61V8.187h2V20.61zM1 10.576v7.646h2v-7.646zM18.204 12.5v5.721h2V12.5zm-4.301 0v8.11h2V12.5z" clipRule="evenodd"/>,
  metrics:   <path fill="currentColor" fillRule="evenodd" d="M3.223 3.223a10.999 10.999 0 0 1 16.839 14.01l3.935 3.935-2.829 2.829-3.934-3.935A11 11 0 0 1 3.222 3.222M11 3a7.999 7.999 0 1 0 0 15.998A7.999 7.999 0 0 0 11 3m3.882 5.013L11.8 11.096l-1.601-1.604-.707-.708-.708.708-3.08 3.08 1.414 1.414 2.373-2.372 1.6 1.603.708.708.708-.707 3.79-3.79z" clipRule="evenodd"/>,
  brain:     <path fill="currentColor" fillRule="evenodd" d="M4.88 5.023a3.049 3.049 0 0 1 6.097 0v5.885a3.04 3.04 0 0 1-3.039 3.039v2c1.142 0 2.195-.38 3.04-1.02v4.05a3.049 3.049 0 1 1-6.098 0v-.197a3.02 3.02 0 0 1 .822-1.88l-1.454-1.373q-.366.388-.646.848A4.98 4.98 0 0 1 1.01 12a4.98 4.98 0 0 1 2.576-4.365 5.04 5.04 0 0 0 4.333 2.464v-2A3.04 3.04 0 0 1 4.88 5.16v-.138m14.197 0a3.049 3.049 0 1 0-6.097 0v5.885a3.04 3.04 0 0 0 3.04 3.039v2a5 5 0 0 1-3.04-1.02v4.05a3.049 3.049 0 0 0 6.097 0v-.197a3.02 3.02 0 0 0-.822-1.88l1.455-1.373q.366.388.645.848A4.98 4.98 0 0 0 22.948 12a4.98 4.98 0 0 0-2.576-4.365 5.04 5.04 0 0 1-4.332 2.464v-2a3.04 3.04 0 0 0 3.037-2.938v-.138" clipRule="evenodd"/>,
  phone:     <path fill="currentColor" fillRule="evenodd" d="m12.59 16.587 1.5-2.513.395-.66.739.21 6.441 1.84.82.235-.102.846-.626 5.227-.111.932-.937-.052a20.5 20.5 0 0 1-8.978-2.631c-1.572-.893-3.051-2.009-4.39-3.348s-2.455-2.817-3.347-4.39a20.5 20.5 0 0 1-2.632-8.978l-.051-.936.931-.112 5.227-.626.846-.101.234.82 1.84 6.44.212.74-.66.394-2.513 1.5a18.6 18.6 0 0 0 2.327 2.835c.884.884 1.835 1.66 2.836 2.328" clipRule="evenodd"/>,
  voiceLib:  <path fill="currentColor" fillRule="evenodd" d="M1 1v22h5.5v-3h4v-4h2.956l-3.369-8.759A9.74 9.74 0 0 0 1 1m20 14.5c0-2.262-.907-4.533-2.74-6.275l1.377-1.45C21.873 9.899 23 12.695 23 15.5s-1.127 5.601-3.363 7.725l-1.378-1.45C20.093 20.033 21 17.762 21 15.5m-4.168 0c0-1.25-.5-2.506-1.52-3.475l1.377-1.45c1.422 1.35 2.143 3.134 2.143 4.925s-.721 3.574-2.143 4.925l-1.377-1.45c1.02-.97 1.52-2.226 1.52-3.475" clipRule="evenodd"/>,
  personAdd: <path fill="currentColor" fillRule="evenodd" d="M9 0a5 5 0 1 0 0 9.998A5 5 0 0 0 9 0m2 15v4.998H0v-5.672l.35-.3.65.76-.65-.76.003-.002.004-.004.012-.01a3 3 0 0 1 .156-.122c.102-.077.246-.18.434-.3a11 11 0 0 1 1.647-.864C4.053 12.104 6.186 11.5 9 11.5c2.568 0 4.57.503 6 1.062V15zm9-2h-3v4h-4v3h4v4h3v-4h4v-3h-4z" clipRule="evenodd"/>,
  star:      <path fill="currentColor" d="m18.364 12.496 1.377 2.362 2.553.786 1.588.489-1.175 1.174-1.646 1.645.57 2.852.38 1.908-1.772-.8-2.739-1.237-2.74 1.236-1.772.8.381-1.907.57-2.852-1.646-1.645-1.175-1.174 1.588-.488 2.552-.787 1.378-2.362.864-1.48zM9 11.5c2.231 0 4.035.38 5.407.847l-.483.83-6.569 2.021 4.414 4.413-.078.387H0v-5.672l.35-.3.65.76c-.65-.758-.65-.76-.65-.76l.003-.003.004-.004.012-.01a3 3 0 0 1 .156-.121c.102-.077.246-.18.434-.301.376-.242.925-.554 1.647-.863C4.053 12.104 6.186 11.5 9 11.5M9 0a5 5 0 1 1 0 9.998A5 5 0 0 1 9 0"/>,
  translate: <path fill="currentColor" fillRule="evenodd" d="M6 .5V2H0v3h1.427a9.2 9.2 0 0 0 .946 3.074c.616 1.187 1.484 2.204 2.556 3.121q-.305.183-.608.347c-1.186.644-2.151.958-2.821.958v3c1.433 0 2.938-.607 4.253-1.321A22 22 0 0 0 7.5 13.115c.936.626 1.924 1.204 2.898 1.63l1.204-2.747a14 14 0 0 1-1.531-.803c1.072-.917 1.94-1.934 2.556-3.121.493-.951.803-1.97.946-3.074H15V2H9V.5zm-.964 6.192A6 6 0 0 1 4.462 5h6.076a6 6 0 0 1-.574 1.692c-.46.887-1.176 1.71-2.23 2.54l-.234.183q-.118-.09-.235-.183c-1.053-.83-1.769-1.653-2.229-2.54M15.6 8.5h-1.048l-.36.984-4.401 12-.516 1.408 2.816 1.033.517-1.408 1.005-2.742h5.974l1.006 2.742.516 1.408 2.817-1.033-.517-1.408-4.4-12-.361-.984zm2.887 8.275h-3.774L16.6 11.63z" clipRule="evenodd"/>,
  spark:     <path fill="currentColor" d="M12.134 22.95h-2.5V5.744h2.5zm-4.3-2.39h-2.5V8.135h2.5zm8.6 0h-2.5V9.09h2.5zM3.533 18.17h-2.5v-7.646h2.5zm17.205 0h-2.5v-6.69h2.5zM19.257.22a4.225 4.225 0 0 0 4.023 4.024l.22.006v1.5A4.23 4.23 0 0 0 19.25 10h-1.5l-.006-.22A4.23 4.23 0 0 0 13.5 5.75v-1.5l.22-.006A4.23 4.23 0 0 0 17.75 0h1.5z"/>,
  book:      <path fill="currentColor" fillRule="evenodd" d="M2.125 5a4 4 0 0 1 4-4h16v17.494h-2V21h1.75v2H5.378a3.253 3.253 0 0 1-3.243-3h-.01zm16 13.494H5.378a1.253 1.253 0 1 0 0 2.506h12.747zM6.89 3.744h2.445l.226.689 1.99 6.081-1.9.622-.42-1.28H6.995l-.42 1.28-1.9-.622 1.99-6.081zm.76 4.111h.927l-.464-1.417zm10.229.174h1v2.016l-.274.289-2.49 2.637h2.81v2h-5.547v-2.016l.273-.289 2.49-2.637h-2.763v-2z" clipRule="evenodd"/>,
  key:       <path fill="currentColor" fillRule="evenodd" d="M17.789.492h5.656V6.73l-.995.005-1.142.006-.005 1.142-.005.99-.99.005-1.142.005-.006 1.142-.002.412-.291.29-3.247 3.248.31 3.422.043.467-.33.331-4.95 4.95-.708.707-.707-.707-8.485-8.486-.707-.707.707-.707 4.95-4.95.33-.33.467.042 3.423.31L17.496.786zM9.468 13.928l-.708-.707-.707.707-.542.542-.708.707.708.708.542.542.707.708.708-.708.542-.542.707-.707-.707-.708z" clipRule="evenodd"/>,
  card:      <path fill="currentColor" fillRule="evenodd" d="M1 2.5H0V7h24V2.5zm-1 18V11h24v10.5H0zM15 18h4v-2h-4z" clipRule="evenodd"/>,
  signal:    <path fill="currentColor" fillRule="evenodd" d="M16.75 1v18h5.5V1zm-7.5 18V9h5.5v10zm-7.5 0v-4h5.5v4zM1 23h22v-2H1z" clipRule="evenodd"/>,
  docs:      <path fill="currentColor" fillRule="evenodd" d="M1 2H0v18h9a2 2 0 0 1 2 2V3a4.98 4.98 0 0 0-3-1zm12 1v19a2 2 0 0 1 2-2h9V2h-8a4.98 4.98 0 0 0-3 1" clipRule="evenodd"/>,
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
  { id: 'design',        label: 'Widget' },
  { id: 'metrics',       label: 'Metrics' },
  { id: 'calls',         label: 'Calls' },
  { id: 'settings',      label: 'Settings' },
];

export default function AgentPage() {
  const [activeTab, setActiveTab] = useState<MainTab>('design');
  const [configPreview, setConfigPreview] = useState(false);
  const [widgetLabel,    setWidgetLabel]    = useState('Need help?');
  const [agentName,      setAgentName]      = useState('Daniel II');
  const [subtitle,       setSubtitle]       = useState('AI Voice Companion');
  const [startBtnLabel,  setStartBtnLabel]  = useState('Start Conversation');
  const [showScene,   setShowScene]   = useState(true);
  const [avatarSource, setAvatarSource] = useState<'favorites' | 'library' | 'custom'>('favorites');
  const [selectedAvatar, setSelectedAvatar] = useState<'/avatar.png' | '/monster.svg'>('/avatar.png');
  const [selectedBg, setSelectedBg] = useState<'/coworking-bg.jpg' | '/bg2.jpg'>('/coworking-bg.jpg');
  const [bgSource, setBgSource] = useState<'favorites' | 'library' | 'custom'>('favorites');
  const [widgetBase, setWidgetBase] = useState('#fdfdfc');
  const [widgetBorderColor, setWidgetBorderColor] = useState('#dfdcd7');
  const [widgetPromptTextColor, setWidgetPromptTextColor] = useState('#39342f');
  const [agentNameColor,  setAgentNameColor]  = useState('#39342f');
  const [agentTitleColor, setAgentTitleColor] = useState('#7c7770');
  const [startBtnBg,        setStartBtnBg]        = useState('#004e23');
  const [startBtnText,      setStartBtnText]      = useState('#ffffff');
  const [startBtnHoverBg,   setStartBtnHoverBg]   = useState('#003a1a');
  const [startBtnHoverText, setStartBtnHoverText] = useState('#ffffff');
  const [avatarBorderColor, setAvatarBorderColor] = useState('#dfdcd7');
  const [avatarHaloColor,   setAvatarHaloColor]   = useState('#abd49e');
  const [widgetExpanded,    setWidgetExpanded]    = useState(false);

  // Auto-switch helpers: wrap a setter so it also flips the widget view when
  // the changed setting is only visible in one state.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toCollapsed = <T,>(setter: (v: T) => void) => (v: T): void => { setter(v); setWidgetExpanded(false); };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const toExpanded  = <T,>(setter: (v: T) => void) => (v: T): void => { setter(v); setWidgetExpanded(true);  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f9f9f8', fontFamily: 'var(--font-geist-sans), system-ui, sans-serif' }}>

      {/* ── Sidebar ── */}
      <aside style={{ width: 208, flexShrink: 0, background: '#f0efe9', borderRight: '1px solid #dfdcd7', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Logo area */}
        <div style={{ padding: '0 16px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
          <svg height="20" viewBox="0 0 579 83" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Cartesia" style={{ display: 'block', width: 'auto' }}>
            <path d="M533.321 73.5189H512.402V69.1647H517.986L540.42 8.11005H550.927L573.172 69.1647H578.946V73.5189H552.253V69.1647H561.34L554.619 50.3277H530.765L524.139 69.1647H533.321V73.5189ZM532.185 46.068H553.199C545.343 23.634 543.828 19.0904 542.787 15.7774C541.746 18.9958 540.136 23.634 532.185 46.068Z" fill="#004e23"/>
            <path d="M509.259 73.5189H483.512V69.1647H490.896V12.4643H483.512V8.11005H509.259V12.4643H501.876V69.1647H509.259V73.5189Z" fill="#004e23"/>
            <path d="M425.863 53.6412H435.708V54.8717C435.708 65.0001 441.292 70.301 451.894 70.301C463.159 70.301 467.797 65.4734 467.797 58.2794C467.797 51.8426 465.241 48.4349 454.071 46.2578L444.511 44.3646C432.963 42.1875 428.04 36.9813 428.04 25.9063C428.04 15.6832 434.761 6.97461 453.125 6.97461C469.69 6.97461 476.695 13.2221 476.695 25.433V26.2849H467.418V25.433C467.418 16.8191 464.2 11.2342 452.935 11.2342C441.198 11.2342 437.79 17.103 437.79 23.3505C437.79 29.4086 440.63 33.2896 450.285 35.1828L460.129 37.0759C473.003 39.5371 477.925 44.1753 477.925 55.4397C477.925 68.6918 467.986 74.6553 451.705 74.6553C433.53 74.6553 425.863 67.1773 425.863 54.5877V53.6412Z" fill="#004e23"/>
            <path d="M345.828 73.5189H320.081V69.1647H327.464V12.4643H311.514L309.811 23.8233H302.333L304.462 8.11005H361.541L363.67 23.8233H356.287L354.584 12.4643H338.444V69.1647H345.828V73.5189Z" fill="#004e23"/>
            <path d="M193.568 73.5189H172.649V69.1647H178.234L200.668 8.11005H211.175L233.42 69.1647H239.194V73.5189H212.5V69.1647H221.587L214.867 50.3277H191.013L184.387 69.1647H193.568V73.5189ZM192.433 46.068H213.447C205.59 23.634 204.075 19.0904 203.034 15.7774C201.993 18.9958 200.384 23.634 192.433 46.068Z" fill="#004e23"/>
            <path d="M172.479 51.464V51.9373C172.479 65.0001 164.433 74.6553 145.88 74.6553C125.623 74.6553 115.968 64.0536 115.968 40.673C115.968 17.5763 127.516 6.97461 146.448 6.97461C164.244 6.97461 172.479 15.7778 172.479 30.5445V31.1125H162.066V30.5445C162.066 20.2268 159.132 11.3289 146.448 11.3289C134.426 11.3289 127.421 19.4695 127.421 40.5783C127.421 65.7574 136.225 70.2064 146.258 70.2064C157.333 70.2064 162.256 63.4856 162.256 52.032V51.464H172.479Z" fill="#004e23"/>
            <path d="M418.784 23.8233H411.401L409.271 12.4643H386.459V37.3596H400.171V30.072H405.765V49.2489H400.171V41.7138H386.459V69.1646H412.158L413.862 56.7645H421.15L419.021 73.5188H368.095V69.1646H375.478V12.4643H368.095V8.11005H416.654L418.784 23.8233Z" fill="#004e23"/>
            <path fillRule="evenodd" clipRule="evenodd" d="M266.645 8.11005C271.946 8.11005 277.815 8.39407 281.791 9.05667C291.162 10.5712 295.422 16.5348 295.422 26.0006C295.422 34.8037 291.825 40.0099 283.022 43.0389L297.409 69.1646H302.258V54.3422H307.852V73.5192L287.281 73.5188L272.609 45.027C270.527 45.2163 268.35 45.3106 266.362 45.3106H260.777V69.1646H268.823V73.5188H242.413V69.1646H249.796V12.4643H242.413V8.11005H266.645ZM260.777 40.862H267.781C272.23 40.862 276.017 40.1994 278.383 38.7796C282.17 36.6971 284.063 32.6265 284.063 26.3791C284.063 19.0904 281.601 15.3988 276.585 13.6949C274.691 13.0324 270.621 12.4643 267.498 12.4643H260.777V40.862Z" fill="#004e23"/>
            <path d="M90.2305 28.6346V51.252H78.884L77.3952 49.2162L73.8254 44.3359L71.3948 41.0131L67.2397 35.3331L68.4962 41.0131L70.3121 49.2162L70.7621 51.252L72.128 57.4193L73.8254 65.0923L73.9427 65.6224L75.7575 73.8243L77.5734 82.0274H51.9513L50.1354 73.8243L49.2162 69.6692L48.3207 65.6224L46.5048 57.4193L45.14 51.252L43.7753 57.4193L41.9594 65.6224L41.0143 69.8936L40.1447 73.8243L38.3288 82.0274H12.6571L14.473 73.8243L16.2381 65.8446V65.8434L16.405 65.7216L16.5415 65.6224L24.6081 59.7213L27.756 57.4193L32.8112 53.721L36.1869 51.252H0V28.6346H24.4728L24.6081 28.0256L25.3649 24.6081L27.1797 16.405L28.9956 8.20195L30.8103 0H59.4201L61.2349 8.20195L61.615 9.91858L57.4193 12.9875L52.7465 16.405L49.2162 18.9879L41.5331 24.6081L41.0143 24.9871L36.0279 28.6346H90.2305Z" fill="#004e23"/>
          </svg>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '16px 8px', display: 'flex', flexDirection: 'column', gap: 24 }}>
          {NAV.map(section => (
            <div key={section.group}>
              <p style={{ fontSize: 12, fontWeight: 500, color: '#525150', paddingLeft: 12, marginTop: 0, marginBottom: 8 }}>
                {section.group}
              </p>
              {section.items.map(item => (
                <a
                  key={item.label}
                  href="#"
                  onClick={e => e.preventDefault()}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '4px 8px 4px 12px',
                    borderRadius: 6, textDecoration: 'none', fontSize: 14,
                    color: item.active ? '#39342f' : '#525150',
                    background: item.active ? '#e3e2d9' : 'transparent',
                    fontWeight: item.active ? 500 : 400,
                    cursor: 'default',
                  }}
                  onMouseEnter={e => { if (!item.active) { e.currentTarget.style.background = '#e3e2d9'; e.currentTarget.style.color = '#39342f'; } }}
                  onMouseLeave={e => { if (!item.active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#525150'; } }}
                >
                  <NavIcon>{navIcons[item.icon as keyof typeof navIcons]}</NavIcon>
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
                <NavIcon size={13}>{navIcons.phone}</NavIcon>
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
              widgetLabel={widgetLabel}               setWidgetLabel={toCollapsed(setWidgetLabel)}
              widgetPromptTextColor={widgetPromptTextColor} setWidgetPromptTextColor={toCollapsed(setWidgetPromptTextColor)}
              agentName={agentName}                   setAgentName={toExpanded(setAgentName)}
              subtitle={subtitle}                     setSubtitle={toExpanded(setSubtitle)}
              agentNameColor={agentNameColor}         setAgentNameColor={toExpanded(setAgentNameColor)}
              agentTitleColor={agentTitleColor}       setAgentTitleColor={toExpanded(setAgentTitleColor)}
              avatarHaloColor={avatarHaloColor}       setAvatarHaloColor={toExpanded(setAvatarHaloColor)}
              showScene={showScene}                   setShowScene={toExpanded(setShowScene)}
              selectedAvatar={selectedAvatar}         setSelectedAvatar={setSelectedAvatar}
              selectedBg={selectedBg}                 setSelectedBg={toExpanded(setSelectedBg)}
              startBtnLabel={startBtnLabel}           setStartBtnLabel={setStartBtnLabel}
              avatarSource={avatarSource}             setAvatarSource={setAvatarSource}
              bgSource={bgSource}                     setBgSource={setBgSource}
              widgetBase={widgetBase}                 setWidgetBase={setWidgetBase}
              widgetBorderColor={widgetBorderColor}   setWidgetBorderColor={setWidgetBorderColor}
              startBtnBg={startBtnBg}                 setStartBtnBg={setStartBtnBg}
              startBtnText={startBtnText}             setStartBtnText={setStartBtnText}
              startBtnHoverBg={startBtnHoverBg}       setStartBtnHoverBg={setStartBtnHoverBg}
              startBtnHoverText={startBtnHoverText}   setStartBtnHoverText={setStartBtnHoverText}
              avatarBorderColor={avatarBorderColor}   setAvatarBorderColor={setAvatarBorderColor}
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
        <VoiceChat widgetLabel={widgetLabel} agentName={agentName} subtitle={subtitle} startBtnLabel={startBtnLabel} showScene={showScene} setShowScene={setShowScene} avatarSrc={selectedAvatar} sceneBg={selectedBg} widgetBase={widgetBase} widgetBorderColor={widgetBorderColor} widgetPromptTextColor={widgetPromptTextColor} agentNameColor={agentNameColor} agentTitleColor={agentTitleColor} startBtnBg={startBtnBg} startBtnText={startBtnText} startBtnHoverBg={startBtnHoverBg} startBtnHoverText={startBtnHoverText} avatarBorderColor={avatarBorderColor} avatarHaloColor={avatarHaloColor} widgetExpanded={widgetExpanded} setWidgetExpanded={setWidgetExpanded} />
      )}
    </div>
  );
}

// ── Tooltip ───────────────────────────────────────────────────────────────
function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%',
          transform: 'translateX(-50%)',
          background: '#2b2a27', color: '#f5f5f4',
          fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap',
          padding: '4px 8px', borderRadius: 6,
          pointerEvents: 'none', zIndex: 100,
          boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
        }}>
          {text}
          {/* Arrow */}
          <div style={{
            position: 'absolute', top: '100%', left: '50%',
            transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '4px solid transparent',
            borderRight: '4px solid transparent',
            borderTop: '4px solid #2b2a27',
          }} />
        </div>
      )}
    </div>
  );
}

// ── Design tab ─────────────────────────────────────────────────────────────
interface DesignTabProps {
  widgetLabel:   string;   setWidgetLabel:   (v: string) => void;
  agentName:     string;   setAgentName:     (v: string) => void;
  subtitle:      string;   setSubtitle:      (v: string) => void;
  startBtnLabel: string;   setStartBtnLabel: (v: string) => void;
  showScene:     boolean;  setShowScene:     (v: boolean) => void;
  avatarSource:    'favorites' | 'library' | 'custom';
  setAvatarSource: (v: 'favorites' | 'library' | 'custom') => void;
  selectedAvatar:    '/avatar.png' | '/monster.svg';
  setSelectedAvatar: (v: '/avatar.png' | '/monster.svg') => void;
  selectedBg:        '/coworking-bg.jpg' | '/bg2.jpg';
  setSelectedBg:     (v: '/coworking-bg.jpg' | '/bg2.jpg') => void;
  bgSource:          'favorites' | 'library' | 'custom';
  setBgSource:       (v: 'favorites' | 'library' | 'custom') => void;
  widgetBase:              string;
  setWidgetBase:           (v: string) => void;
  widgetBorderColor:       string;
  setWidgetBorderColor:    (v: string) => void;
  widgetPromptTextColor:   string;
  setWidgetPromptTextColor:(v: string) => void;
  agentNameColor:          string;
  setAgentNameColor:       (v: string) => void;
  agentTitleColor:         string;
  setAgentTitleColor:      (v: string) => void;
  startBtnBg:              string;
  setStartBtnBg:           (v: string) => void;
  startBtnText:            string;
  setStartBtnText:         (v: string) => void;
  startBtnHoverBg:         string;
  setStartBtnHoverBg:      (v: string) => void;
  startBtnHoverText:       string;
  setStartBtnHoverText:    (v: string) => void;
  avatarBorderColor:       string;
  setAvatarBorderColor:    (v: string) => void;
  avatarHaloColor:         string;
  setAvatarHaloColor:      (v: string) => void;
}

// ── Accordion primitive ────────────────────────────────────────────────────
function Accordion({ title, defaultOpen = true, headerRight, children }: { title: string; defaultOpen?: boolean; headerRight?: React.ReactNode; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderTop: '1px solid #dfdcd7' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '12px 0' }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            flex: 1, display: 'flex', alignItems: 'center',
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9b9895"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s ease', flexShrink: 0, marginRight: 8 }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#39342f' }}>{title}</span>
        </button>
        {open && headerRight}
      </div>
      {open && <div style={{ paddingBottom: 16 }}>{children}</div>}
    </div>
  );
}

const EXPRESSIVENESS_STEPS = [
  { label: 'Zen',              file: 'zen.svg'             },
  { label: 'Calm',             file: 'calm.svg'            },
  { label: 'Neutral',          file: 'neutral.svg'         },
  { label: 'Expressive',       file: 'expressive.svg'      },
  { label: 'Excited',          file: 'excited.svg'         },
  { label: 'Energetic',        file: 'energetic.svg'       },
  { label: 'Highly Emotional', file: 'highly-emotional.svg'},
] as const;

// ── HTML syntax highlighting ───────────────────────────────────────────────
type HtmlTokType = 'punct' | 'tagname' | 'attrname' | 'attrval' | 'text';
interface HtmlTok { type: HtmlTokType; value: string }

function tokenizeHTML(src: string): HtmlTok[] {
  const out: HtmlTok[] = [];
  let i = 0;
  while (i < src.length) {
    if (src[i] === '<') {
      out.push({ type: 'punct', value: '<' }); i++;
      if (i < src.length && src[i] === '/') { out.push({ type: 'punct', value: '/' }); i++; }
      const s = i;
      while (i < src.length && /[\w-]/.test(src[i])) i++;
      if (i > s) out.push({ type: 'tagname', value: src.slice(s, i) });
    } else if (src[i] === '/' && i + 1 < src.length && src[i + 1] === '>') {
      out.push({ type: 'punct', value: '/>' }); i += 2;
    } else if (src[i] === '>') {
      out.push({ type: 'punct', value: '>' }); i++;
    } else if (src[i] === '=') {
      out.push({ type: 'punct', value: '=' }); i++;
    } else if (src[i] === '"' || src[i] === "'") {
      const q = src[i]; let v = q; i++;
      while (i < src.length && src[i] !== q) { v += src[i]; i++; }
      v += q; if (i < src.length) i++;
      out.push({ type: 'attrval', value: v });
    } else if (/\s/.test(src[i])) {
      let v = '';
      while (i < src.length && /\s/.test(src[i])) { v += src[i]; i++; }
      out.push({ type: 'text', value: v });
    } else {
      const s = i;
      while (i < src.length && !/[\s<>='"\/]/.test(src[i])) i++;
      const v = src.slice(s, i);
      const before = src.slice(0, s);
      const inTag = before.lastIndexOf('<') > before.lastIndexOf('>');
      out.push({ type: inTag ? 'attrname' : 'text', value: v });
    }
  }
  return out;
}

const TOK_COLOR: Record<HtmlTokType, string> = {
  punct:   '#6e7781',
  tagname: '#79c0ff',
  attrname:'#e3b341',
  attrval: '#a8dabc',
  text:    '#c9d1d9',
};

// ── Code block ────────────────────────────────────────────────────────────
function CodeBlock({ code, copyText }: { code: string; copyText: string }) {
  const [copied, setCopied] = useState(false);
  const lines = code.split('\n');
  const LINE_H = 22;
  const MAX_LINES = 3;

  const handleCopy = () => {
    navigator.clipboard.writeText(copyText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  return (
    <div style={{
      background: '#161b22', borderRadius: 8, border: '1px solid #30363d',
      overflow: 'hidden', position: 'relative',
      fontFamily: '"SF Mono","Fira Code","Geist Mono",monospace', fontSize: 11.5,
    }}>
      {/* Copy button */}
      <button
        onClick={handleCopy}
        style={{
          position: 'absolute', top: 8, right: 8, zIndex: 2,
          padding: '3px 8px', background: '#21262d',
          color: '#8b949e', border: '1px solid #30363d',
          borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: 4, transition: 'all 0.15s',
          fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
        }}
        onMouseEnter={e => { if (!copied) { e.currentTarget.style.background = '#30363d'; e.currentTarget.style.color = '#c9d1d9'; } }}
        onMouseLeave={e => { if (!copied) { e.currentTarget.style.background = '#21262d'; e.currentTarget.style.color = '#8b949e'; } }}
      >
        {copied ? (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        ) : (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>
          </svg>
        )}
        {copied ? 'Copied!' : 'Copy'}
      </button>
      {/* Lines */}
      <div style={{
        overflowY: lines.length > MAX_LINES ? 'auto' : 'hidden',
        overflowX: 'auto',
        maxHeight: MAX_LINES * LINE_H + 24, padding: '12px 0',
      }}>
        {lines.map((line, li) => (
          <div key={li} style={{ display: 'flex', lineHeight: `${LINE_H}px`, minWidth: 'max-content' }}>
            <div style={{
              width: 36, flexShrink: 0, textAlign: 'right', paddingRight: 14,
              color: '#4a525a', userSelect: 'none', fontSize: 11,
            }}>
              {li + 1}
            </div>
            <div style={{ flex: 1, paddingRight: 56, whiteSpace: 'pre' }}>
              {tokenizeHTML(line).map((tok, ti) => (
                <span key={ti} style={{ color: TOK_COLOR[tok.type] }}>{tok.value}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Embed snippet — formatted for display (4 lines) and raw for copy
const EMBED_CODE_DISPLAY = [
  '<cartesia-aiagent agent-id="agent_kQE7BPvD2NN1NYeT68VjAN">',
  '</cartesia-aiagent>',
  '<script src="https://unpkg.com/@cartesia/cartesia-widget-embed"',
  '  async type="text/javascript"></script>',
].join('\n');

const EMBED_CODE_COPY = '<cartesia-aiagent agent-id="agent_kQE7BPvD2NN1NYeT68VjAN"></cartesia-aiagent><script src="https://unpkg.com/@cartesia/cartesia-widget-embed" async type="text/javascript"></script>';

// ── Deploy panel (non-modal dialog) ───────────────────────────────────────
function DeployPanel({
  onClose, position, excludeRef,
}: {
  onClose: () => void;
  position: { top: number; right: number };
  excludeRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const [mode, setMode] = useState<'embed' | 'sdk'>('embed');
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        (!excludeRef.current || !excludeRef.current.contains(e.target as Node))
      ) onClose();
    };
    const tid = setTimeout(() => document.addEventListener('mousedown', handle), 0);
    return () => { clearTimeout(tid); document.removeEventListener('mousedown', handle); };
  }, [onClose, excludeRef]);

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed', top: position.top, right: position.right,
        /* Never wider than the space between the sidebar edge + 20px content padding and the right anchor */
        width: 817, maxWidth: `calc(100vw - ${position.right}px - 229px)`,
        zIndex: 1100,
        fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
      }}
    >
      {/* Upward caret — points to the Deploy button above */}
      <div style={{
        position: 'absolute', top: -6, right: 40,
        width: 13, height: 13, background: '#ffffff',
        borderLeft: '1px solid #dfdcd7', borderTop: '1px solid #dfdcd7',
        transform: 'rotate(45deg)',
      }} />
      {/* Panel — scrolls vertically if viewport is short */}
      <div style={{
        background: '#ffffff', border: '1px solid #dfdcd7', borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
        overflowX: 'hidden', overflowY: 'auto',
        maxHeight: 440,
      }}>
      {/* ── Title row ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '20px 20px 0' }}>
        <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1a1a18', margin: 0, lineHeight: 1.2 }}>
          Deploy to Your Website
        </h2>
        {/* Close — plain X matching app icon style */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
            fontSize: 15, color: '#7c7770', lineHeight: 1, marginTop: -1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 4, transition: 'color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = '#39342f'; }}
          onMouseLeave={e => { e.currentTarget.style.color = '#7c7770'; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* ── Mode toggle ── */}
      <div style={{ padding: '14px 20px 0' }}>
        <div style={{
          display: 'inline-flex', border: '1px solid #dfdcd7',
          borderRadius: 8, overflow: 'hidden', background: '#f9f9f8',
        }}>
          {(['embed', 'sdk'] as const).map((m, i, arr) => {
            const isDisabled = m === 'sdk';
            return (
              <button
                key={m}
                onClick={isDisabled ? undefined : () => setMode(m)}
                style={{
                  padding: '7px 18px', border: 'none',
                  borderRight: i < arr.length - 1 ? '1px solid #dfdcd7' : 'none',
                  borderRadius: i === 0 ? '7px 0 0 7px' : '0 7px 7px 0',
                  background: mode === m ? '#f1f0ec' : '#ffffff',
                  color: '#39342f',
                  fontSize: 12, fontWeight: mode === m ? 500 : 400,
                  cursor: isDisabled ? 'default' : 'pointer',
                  transition: 'background 0.15s',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={isDisabled ? undefined : (e => { if (mode !== m) e.currentTarget.style.background = '#f1f0ec'; })}
                onMouseLeave={isDisabled ? undefined : (e => { if (mode !== m) e.currentTarget.style.background = '#ffffff'; })}
              >
                {m === 'embed' ? 'Embed Code' : 'SDK'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div style={{ borderTop: '1px solid #dfdcd7', margin: '16px 0 0' }} />

      {/* ── Body: two columns ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 1fr' }}>

        {/* Left — Setup */}
        <div style={{ padding: '20px 20px 24px', borderRight: '1px solid #dfdcd7', minWidth: 0 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a18', margin: '0 0 12px' }}>Setup</h3>

          {/* Quickstart button */}
          <button
            type="button"
            onClick={() => {}}
            style={{
              width: '100%', display: 'flex', overflow: 'hidden',
              border: '1px solid #dfdcd7', borderRadius: 8, background: '#ffffff',
              padding: 0, cursor: 'pointer', textAlign: 'left',
              transition: 'border-color 0.15s, background 0.15s',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#dfdcd7';
              e.currentTarget.style.background = '#fbfaf9';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#dfdcd7';
              e.currentTarget.style.background = '#ffffff';
            }}
          >
            {/* Brand green square with play icon */}
            <div style={{
              width: 60, flexShrink: 0, background: '#004e23', minHeight: 60,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="white"
                strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
            </div>
            {/* Content */}
            <div style={{ padding: '10px 12px' }}>
              <div style={{
                fontSize: 10, fontWeight: 600, color: '#9b9895',
                letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 5,
              }}>
                Quickstart
              </div>
              <p style={{ fontSize: 12.5, color: '#39342f', margin: 0, lineHeight: 1.5 }}>
                Learn how to embed the AI Agent on your website.
              </p>
            </div>
          </button>

          {/* Additional Resources */}
          <div style={{ marginTop: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a18', margin: '0 0 10px' }}>
              Additional Resources
            </h3>
            {[
              'Deploying AI Agents Guide',
              'Agents Showcase Examples',
            ].map(label => (
              <div key={label} style={{ marginBottom: 6 }}>
                <a
                  href="#"
                  onClick={e => e.preventDefault()}
                  style={{ fontSize: 13, color: '#39342f', textDecoration: 'none', cursor: 'not-allowed', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline'; }}
                  onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none'; }}
                >
                  {label}
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                    <polyline points="15 3 21 3 21 9"/>
                    <line x1="10" y1="14" x2="21" y2="3"/>
                  </svg>
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Embed Code or SDK */}
        <div style={{ padding: '20px 20px 24px', minWidth: 0, overflow: 'hidden' }}>
          {mode === 'embed' ? (
            <>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a18', margin: '0 0 8px' }}>Embed code</h3>
              <p style={{ fontSize: 12.5, color: '#636260', margin: '0 0 12px', lineHeight: 1.55 }}>
                Add the following code snippet to pages where you want to display this AI Agent&apos;s widget:
              </p>
              <CodeBlock code={EMBED_CODE_DISPLAY} copyText={EMBED_CODE_COPY} />
            </>
          ) : (
            <>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#1a1a18', margin: '0 0 8px' }}>SDK</h3>
              <p style={{ fontSize: 12.5, color: '#636260', margin: '0 0 12px', lineHeight: 1.55 }}>
                Use the Cartesia SDK to integrate a voice agent into your application programmatically.
              </p>
              <p style={{ fontSize: 12.5, color: '#c4c0bb', margin: 0 }}>SDK documentation coming soon.</p>
            </>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

function DesignTab({ widgetLabel, setWidgetLabel, agentName, setAgentName, subtitle, setSubtitle, startBtnLabel, setStartBtnLabel, showScene, setShowScene, avatarSource, setAvatarSource, selectedAvatar, setSelectedAvatar, selectedBg, setSelectedBg, bgSource, setBgSource, widgetBase, setWidgetBase, widgetBorderColor, setWidgetBorderColor, widgetPromptTextColor, setWidgetPromptTextColor, agentNameColor, setAgentNameColor, agentTitleColor, setAgentTitleColor, startBtnBg, setStartBtnBg, startBtnText, setStartBtnText, startBtnHoverBg, setStartBtnHoverBg, startBtnHoverText, setStartBtnHoverText, avatarBorderColor, setAvatarBorderColor, avatarHaloColor, setAvatarHaloColor }: DesignTabProps) {
  const [expressivenessStep, setExpressivenessStep] = useState(3); // default: Expressive
  const [deployOpen, setDeployOpen] = useState(false);
  const [panelPos, setPanelPos] = useState({ top: 0, right: 0 });
  const deployBtnRef = useRef<HTMLButtonElement>(null);

  const handleDeploy = () => {
    if (deployBtnRef.current) {
      const rect = deployBtnRef.current.getBoundingClientRect();
      setPanelPos({ top: rect.bottom + 16, right: window.innerWidth - rect.right });
    }
    setDeployOpen(o => !o);
  };

  const textFields = [
    { label: 'Widget Prompt', value: widgetLabel,   set: setWidgetLabel,   placeholder: 'e.g. Need help?' },
    { label: 'Agent Name',   value: agentName,     set: setAgentName,     placeholder: 'e.g. Daniel II' },
    { label: 'Agent Subtitle', value: subtitle,    set: setSubtitle,      placeholder: 'e.g. AI Voice Companion' },
    { label: 'Start Button', value: startBtnLabel, set: setStartBtnLabel, placeholder: 'e.g. Start Conversation' },
  ];

  const views = [
    { val: true,  title: 'Scene view',
      icon: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="m3 15 5-5 4 4 3-3 6 6"/><circle cx="8.5" cy="8.5" r="1.5"/></> },
    { val: false, title: 'Avatar view',
      icon: <><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></> },
  ] as const;

  return (
    <div>
      {/* Full-width header row — matches Configuration tab layout */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, color: '#39342f', margin: 0 }}>Widget</h2>
        <button
          ref={deployBtnRef}
          onClick={handleDeploy}
          style={{
            height: 32,
            background: deployOpen ? '#eff7f0' : '#004e23',
            color: deployOpen ? '#004e23' : '#ffffff',
            border: deployOpen ? '1px solid #a8d5b5' : '1px solid transparent',
            borderRadius: 8, padding: '0 14px',
            fontSize: 14, fontWeight: 600, cursor: 'pointer',
            transition: 'background 0.15s ease, color 0.15s ease, border-color 0.15s ease',
          }}
          onMouseEnter={e => { if (!deployOpen) e.currentTarget.style.background = '#003a1a'; }}
          onMouseLeave={e => { if (!deployOpen) e.currentTarget.style.background = '#004e23'; }}
        >
          Deploy
        </button>
      </div>

      {/* Instruction text — spans ~75% of the tab content area */}
      <p style={{ fontSize: 13, color: '#636260', lineHeight: 1.6, marginBottom: 20, maxWidth: '75%' }}>
        Support users to interact with this voice agent directly from a website. Here you can customize the widget for the agent as best for your users and the design of your site, and then deploy to your website.
      </p>

      {/* Constrained content — accordions keep current width */}
      <div style={{ maxWidth: 560 }}>

      {/* Avatar accordion */}
      <Accordion title="Avatar" headerRight={
        <button style={{
          padding: '5px 12px', border: '1px solid #dfdcd7', borderRadius: 8,
          background: '#f9f9f8', cursor: 'not-allowed',
          fontSize: 12, fontWeight: 500, color: '#39342f',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <NavIcon size={12}>{navIcons.book}</NavIcon>
          Library
        </button>
      }>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#636260', marginBottom: 8 }}>
          Image
        </label>
        {/* Source toggle */}
        <div style={{ display: 'inline-flex', border: '1px solid #dfdcd7', background: '#f9f9f8', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
          {([
            { src: 'favorites' as const, label: 'Favorites', iconKey: 'heart' },
            { src: 'custom'    as const, label: 'Custom',    iconKey: 'image' },
          ]).map(({ src, label, iconKey }, i, arr) => {
            const isActive = avatarSource === src;
            const disabled = src !== 'favorites';
            const borderR = i === 0 ? '8px 0 0 8px' : i === arr.length - 1 ? '0 8px 8px 0' : '0';
            return (
              <button key={src} onClick={() => !disabled && setAvatarSource(src)}
                style={{
                  padding: '7px 14px', border: 'none',
                  borderRight: i < arr.length - 1 ? '1px solid #dfdcd7' : 'none',
                  borderRadius: borderR,
                  background: isActive ? '#f1f0ec' : 'transparent',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  fontSize: 12, fontWeight: 500, color: '#39342f',
                  transition: 'background 0.15s',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
                onMouseEnter={e => { if (!disabled && !isActive) e.currentTarget.style.background = '#f1f0ec'; }}
                onMouseLeave={e => { if (!disabled && !isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <Icon size={12}>{icons[iconKey as keyof typeof icons]}</Icon>
                {label}
              </button>
            );
          })}
        </div>

        {/* Favorites image grid — shown when avatarSource === 'favorites' */}
        {avatarSource === 'favorites' && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {([
              { src: '/avatar.png'   as '/avatar.png' | '/monster.svg', tooltip: 'Sam the Designer' },
              { src: '/monster.svg'  as '/avatar.png' | '/monster.svg', tooltip: 'Monster Mash'     },
            ]).map(({ src, tooltip }) => {
              const isSelected = selectedAvatar === src;
              return (
                <Tooltip key={src} text={tooltip}>
                  <div
                    onClick={() => setSelectedAvatar(src)}
                    style={{
                      width: 80, height: 80, flexShrink: 0,
                      borderRadius: 8,
                      border: isSelected ? '2px solid #004e23' : '1px solid #dfdcd7',
                      background: '#ffffff',
                      cursor: 'pointer',
                      overflow: 'hidden',
                      position: 'relative',
                      transition: 'border-color 0.15s',
                      boxSizing: 'border-box',
                    }}
                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.borderColor = '#b0d4bb'; }}
                    onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.borderColor = '#dfdcd7'; }}
                  >
                    <Image src={src} alt={tooltip} fill
                      style={{ objectFit: 'contain', padding: 4 }} />
                  </div>
                </Tooltip>
              );
            })}
          </div>
        )}

        {/* ── Background ── */}
        <div style={{ marginTop: 20 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#636260', marginBottom: 8 }}>
            Background Scene
          </label>
          {/* Source toggle */}
          <div style={{ display: 'inline-flex', border: '1px solid #dfdcd7', background: '#f9f9f8', borderRadius: 8, overflow: 'hidden', marginBottom: 16 }}>
            {([
              { src: 'favorites' as const, label: 'Favorites', iconKey: 'heart' },
              { src: 'custom'    as const, label: 'Custom',    iconKey: 'image' },
            ]).map(({ src, label, iconKey }, i, arr) => {
              const isActive = bgSource === src;
              const disabled = src !== 'favorites';
              const borderR = i === 0 ? '8px 0 0 8px' : i === arr.length - 1 ? '0 8px 8px 0' : '0';
              return (
                <button key={src} onClick={() => !disabled && setBgSource(src)}
                  style={{
                    padding: '7px 14px', border: 'none',
                    borderRight: i < arr.length - 1 ? '1px solid #dfdcd7' : 'none',
                    borderRadius: borderR,
                    background: isActive ? '#f1f0ec' : 'transparent',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    fontSize: 12, fontWeight: 500, color: '#39342f',
                    transition: 'background 0.15s',
                    display: 'flex', alignItems: 'center', gap: 5,
                  }}
                  onMouseEnter={e => { if (!disabled && !isActive) e.currentTarget.style.background = '#f1f0ec'; }}
                  onMouseLeave={e => { if (!disabled && !isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  <Icon size={12}>{icons[iconKey as keyof typeof icons]}</Icon>
                  {label}
                </button>
              );
            })}
          </div>

          {bgSource === 'favorites' && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {([
                { src: '/coworking-bg.jpg' as '/coworking-bg.jpg' | '/bg2.jpg', tooltip: 'Green office' },
                { src: '/bg2.jpg'          as '/coworking-bg.jpg' | '/bg2.jpg', tooltip: 'Startup loft' },
              ]).map(({ src, tooltip }) => {
                const isSelected = selectedBg === src;
                return (
                  <Tooltip key={src} text={tooltip}>
                    <div onClick={() => setSelectedBg(src)}
                      style={{
                        width: 160, height: 128, flexShrink: 0,
                        borderRadius: 8,
                        border: isSelected ? '2px solid #004e23' : '1px solid #dfdcd7',
                        background: '#ffffff',
                        cursor: 'pointer',
                        overflow: 'hidden',
                        position: 'relative',
                        transition: 'border-color 0.15s',
                        boxSizing: 'border-box',
                      }}
                      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.borderColor = '#b0d4bb'; }}
                      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLDivElement).style.borderColor = '#dfdcd7'; }}
                    >
                      <Image src={src} alt={tooltip} fill style={{ objectFit: 'cover' }} />
                    </div>
                  </Tooltip>
                );
              })}
            </div>
          )}
        </div>
      </Accordion>

      {/* Widget accordion */}
      <Accordion title="Display Text">
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

      {/* Display Settings accordion */}
      <Accordion title="Widget & Avatar Styles">
        {/* Widget Style */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#636260', marginBottom: 8 }}>
            Widget Style
          </label>
          <div style={{ display: 'inline-grid', gridTemplateColumns: '1fr 1fr', border: '1px solid #dfdcd7', background: '#f9f9f8', borderRadius: 8, overflow: 'hidden' }}>
            {([
              { key: 'compact', label: 'Compact', disabled: true  },
              { key: 'full',    label: 'Full',    disabled: false },
            ] as const).map(({ key, label, disabled }, i, arr) => {
              const isActive = key === 'full'; // Full is always selected
              const borderR = i === 0 ? '8px 0 0 8px' : i === arr.length - 1 ? '0 8px 8px 0' : '0';
              return (
                <button key={key}
                  style={{
                    padding: '7px 14px', border: 'none',
                    borderRight: i < arr.length - 1 ? '1px solid #dfdcd7' : 'none',
                    borderRadius: borderR,
                    background: isActive ? '#f1f0ec' : 'transparent',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    fontSize: 12, fontWeight: 500, color: '#39342f',
                    textAlign: 'center',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (!disabled && !isActive) e.currentTarget.style.background = '#f1f0ec'; }}
                  onMouseLeave={e => { if (!disabled && !isActive) e.currentTarget.style.background = 'transparent'; }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Avatar Size */}
        <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#636260', marginBottom: 8 }}>
          Avatar Size
        </label>
        <div style={{ display: 'inline-flex', border: '1px solid #dfdcd7', background: '#f9f9f8', borderRadius: 8, overflow: 'hidden' }}>
          {views.map(({ val, title, icon }, i, arr) => {
            const isActive = showScene === val;
            const borderR = i === 0 ? '8px 0 0 8px' : i === arr.length - 1 ? '0 8px 8px 0' : '0';
            return (
              <button key={title} onClick={() => setShowScene(val)} title={title}
                style={{
                  padding: '7px 12px', border: 'none',
                  borderRight: i < arr.length - 1 ? '1px solid #dfdcd7' : 'none',
                  borderRadius: borderR,
                  background: isActive ? '#f1f0ec' : 'transparent',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 12, fontWeight: 500, color: '#39342f',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f1f0ec'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                  stroke="#39342f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {icon}
                </svg>
                {val ? 'Avatar & Scene' : 'Avatar Only'}
              </button>
            );
          })}
        </div>

        {/* Avatar expressiveness slider */}
        {(() => {
          const pct = (expressivenessStep / (EXPRESSIVENESS_STEPS.length - 1)) * 100;
          const step = EXPRESSIVENESS_STEPS[expressivenessStep];
          return (
            <div style={{ marginTop: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#636260', marginBottom: 14 }}>
                Avatar Expressiveness
              </label>

              {/* Track + thumb */}
              <div style={{ position: 'relative', height: 24, marginBottom: 6 }}>
                {/* Background track — inset 8px each side to align with thumb centre */}
                <div style={{
                  position: 'absolute', left: 8, right: 8,
                  top: '50%', transform: 'translateY(-50%)',
                  height: 6, borderRadius: 3, background: '#dfdcd7',
                  pointerEvents: 'none',
                }}>
                  {/* Gradient fill */}
                  <div style={{
                    position: 'absolute', left: 0, top: 0, bottom: 0,
                    borderRadius: 3,
                    background: 'linear-gradient(to right, #abd49e, #004e23)',
                    width: `${pct}%`,
                    transition: 'width 0.1s ease',
                    pointerEvents: 'none',
                  }} />
                </div>
                {/* Native range — transparent track/thumb handled by CSS */}
                <input
                  type="range"
                  min={0}
                  max={EXPRESSIVENESS_STEPS.length - 1}
                  step={1}
                  value={expressivenessStep}
                  onChange={e => setExpressivenessStep(Number(e.target.value))}
                  className="expr-slider"
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', margin: 0, padding: 0 }}
                />
              </div>

              {/* Step markers */}
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: 8, paddingRight: 8, marginBottom: 12 }}>
                {EXPRESSIVENESS_STEPS.map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: 2, height: 5,
                      background: i <= expressivenessStep ? '#abd49e' : '#dfdcd7',
                      borderRadius: 1,
                      transition: 'background 0.15s',
                    }}
                  />
                ))}
              </div>

              {/* Selected step label */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/mood/${step.file}`}
                  width={18}
                  height={18}
                  alt=""
                  style={{ display: 'block', opacity: 0.77, flexShrink: 0, marginTop: '2px' }}
                />
                <span style={{ fontSize: 12, color: '#39342f' }}>{step.label}</span>
              </div>
            </div>
          );
        })()}

      </Accordion>

      {/* Display Colors accordion */}
      <Accordion
        title="Display Colors"
        headerRight={
          <button
            type="button"
            onClick={() => { setWidgetBase('#fdfdfc'); setWidgetBorderColor('#dfdcd7'); setWidgetPromptTextColor('#39342f'); setAgentNameColor('#39342f'); setAgentTitleColor('#7c7770'); setStartBtnBg('#004e23'); setStartBtnText('#ffffff'); setStartBtnHoverBg('#003a1a'); setStartBtnHoverText('#ffffff'); setAvatarBorderColor('#dfdcd7'); setAvatarHaloColor('#abd49e'); }}
            style={{
              background: 'none', border: 'none', padding: '0 0 0 8px',
              fontSize: 12, fontWeight: 500, color: '#9b9895',
              cursor: 'pointer', flexShrink: 0,
              fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = '#39342f'; }}
            onMouseLeave={e => { e.currentTarget.style.color = '#9b9895'; }}
          >
            Reset All
          </button>
        }
      >
        <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
          {/* Column 1 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <WidgetBaseColorPicker
              label="Widget Base"
              value={widgetBase}
              onChange={setWidgetBase}
              onReset={widgetBase !== '#fdfdfc' ? () => setWidgetBase('#fdfdfc') : undefined}
            />
            <WidgetBaseColorPicker
              label="Widget Border"
              value={widgetBorderColor}
              onChange={setWidgetBorderColor}
              onReset={widgetBorderColor !== '#dfdcd7' ? () => setWidgetBorderColor('#dfdcd7') : undefined}
            />
            <WidgetBaseColorPicker
              label="Widget Prompt Text"
              value={widgetPromptTextColor}
              onChange={setWidgetPromptTextColor}
              onReset={widgetPromptTextColor !== '#39342f' ? () => setWidgetPromptTextColor('#39342f') : undefined}
            />
            <WidgetBaseColorPicker
              label="Agent Name"
              value={agentNameColor}
              onChange={setAgentNameColor}
              onReset={agentNameColor !== '#39342f' ? () => setAgentNameColor('#39342f') : undefined}
            />
            <WidgetBaseColorPicker
              label="Agent Title"
              value={agentTitleColor}
              onChange={setAgentTitleColor}
              onReset={agentTitleColor !== '#7c7770' ? () => setAgentTitleColor('#7c7770') : undefined}
            />
            <WidgetBaseColorPicker
              label="Avatar Border"
              value={avatarBorderColor}
              onChange={setAvatarBorderColor}
              onReset={avatarBorderColor !== '#dfdcd7' ? () => setAvatarBorderColor('#dfdcd7') : undefined}
            />
            <WidgetBaseColorPicker
              label="Avatar Border - Speaking Halo"
              value={avatarHaloColor}
              onChange={setAvatarHaloColor}
              onReset={avatarHaloColor !== '#abd49e' ? () => setAvatarHaloColor('#abd49e') : undefined}
            />
          </div>
          {/* Column 2 — Start Button */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <WidgetBaseColorPicker
              label="Start Button"
              value={startBtnBg}
              onChange={setStartBtnBg}
              onReset={startBtnBg !== '#004e23' ? () => setStartBtnBg('#004e23') : undefined}
            />
            <WidgetBaseColorPicker
              label="Start Button - Text"
              value={startBtnText}
              onChange={setStartBtnText}
              onReset={startBtnText !== '#ffffff' ? () => setStartBtnText('#ffffff') : undefined}
            />
            <WidgetBaseColorPicker
              label="Start Button - Hover"
              value={startBtnHoverBg}
              onChange={setStartBtnHoverBg}
              onReset={startBtnHoverBg !== '#003a1a' ? () => setStartBtnHoverBg('#003a1a') : undefined}
            />
            <WidgetBaseColorPicker
              label="Start Button - Hover State Text"
              value={startBtnHoverText}
              onChange={setStartBtnHoverText}
              onReset={startBtnHoverText !== '#ffffff' ? () => setStartBtnHoverText('#ffffff') : undefined}
            />
          </div>
        </div>
      </Accordion>

      {/* Close border at bottom */}
      <div style={{ borderTop: '1px solid #dfdcd7' }} />
      </div>{/* end constrained content */}

      {/* Deploy panel — position: fixed, floats above page content */}
      {deployOpen && (
        <DeployPanel
          onClose={() => setDeployOpen(false)}
          position={panelPos}
          excludeRef={deployBtnRef}
        />
      )}
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
const readonlyInput: React.CSSProperties = { width: '100%', padding: '8px 12px', fontSize: 13, color: '#39342f', background: '#fdfdfc', border: '1px solid #dfdcd7', borderRadius: 8, outline: 'none', cursor: 'not-allowed', boxSizing: 'border-box', fontFamily: 'inherit' };
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
              <NavIcon size={14}>{navIcons.voiceLib}</NavIcon>
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
