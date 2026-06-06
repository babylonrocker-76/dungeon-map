const GOLD = '#c9a227';
const IVORY = '#f5edd8';
const SHADOW = '#2a1810';
const GLOW = '#ffe9a8';

function Icon({ id, children }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <defs>
        <linearGradient id={`${id}-fill`} x1="16" y1="6" x2="16" y2="26" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fffaf0" />
          <stop offset="1" stopColor="#d4c4a0" />
        </linearGradient>
        <linearGradient id={`${id}-gold`} x1="10" y1="8" x2="22" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor={GLOW} />
          <stop offset="1" stopColor={GOLD} />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="13.5" stroke={`url(#${id}-gold)`} strokeWidth="0.6" opacity="0.45" />
      {children}
    </svg>
  );
}

const ICONS = {
  fighter: (
    <Icon id="fighter">
      <path d="M11 7v18" stroke={`url(#fighter-gold)`} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M11 15h9" stroke={IVORY} strokeWidth="2" strokeLinecap="round" />
      <path d="M18 10l5 5.5-5 5.5" stroke={IVORY} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7.5 11h4.5v12H7.5z" fill={`url(#fighter-fill)`} stroke={SHADOW} strokeWidth="0.8" />
      <circle cx="9.75" cy="9" r="2.2" fill={`url(#fighter-fill)`} stroke={SHADOW} strokeWidth="0.6" />
    </Icon>
  ),
  wizard: (
    <Icon id="wizard">
      <path d="M16 5L25 24H7L16 5z" fill="#4a3080" stroke={`url(#wizard-gold)`} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M16 5v5" stroke={IVORY} strokeWidth="1.2" />
      <circle cx="16" cy="4" r="1.5" fill={GLOW} stroke={SHADOW} strokeWidth="0.5" />
      <path d="M12 20h8" stroke={GOLD} strokeWidth="1" strokeLinecap="round" opacity="0.8" />
      <path d="M14 14l2 3 2-3" stroke={IVORY} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
    </Icon>
  ),
  rogue: (
    <Icon id="rogue">
      <path d="M9 23L23 9" stroke={`url(#rogue-gold)`} strokeWidth="2" strokeLinecap="round" />
      <path d="M19 7l6 6-2.5 2.5-6-6L19 7z" fill={`url(#rogue-fill)`} stroke={SHADOW} strokeWidth="0.8" />
      <path d="M7 21l4 4" stroke={IVORY} strokeWidth="2" strokeLinecap="round" />
      <circle cx="8.5" cy="24.5" r="1.5" fill={GOLD} />
    </Icon>
  ),
  cleric: (
    <Icon id="cleric">
      <circle cx="16" cy="16" r="9" stroke={`url(#cleric-gold)`} strokeWidth="1.5" />
      <path d="M16 10v12M12 14h8" stroke={IVORY} strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="16" cy="8" r="2" fill={GLOW} stroke={SHADOW} strokeWidth="0.5" />
    </Icon>
  ),
  ranger: (
    <Icon id="ranger">
      <path d="M7 25c5-12 11-16 18-14" stroke={`url(#ranger-gold)`} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M22 9l4 4-9 12-5 1.5 1.5-5 9-12.5z" fill={`url(#ranger-fill)`} stroke={SHADOW} strokeWidth="0.8" />
      <path d="M6 26h5" stroke={IVORY} strokeWidth="2" strokeLinecap="round" />
    </Icon>
  ),
  bard: (
    <Icon id="bard">
      <path d="M12 24V11a5 5 0 0110 0v13" stroke={`url(#bard-gold)`} strokeWidth="1.5" fill="none" />
      <ellipse cx="12" cy="24" rx="4" ry="2.5" fill="#6b3080" stroke={IVORY} strokeWidth="0.8" />
      <path d="M19 10c1.5 2 3 3.5 6 4" stroke={GLOW} strokeWidth="1.2" strokeLinecap="round" />
      <circle cx="24" cy="14" r="1.2" fill={GOLD} />
    </Icon>
  ),
  paladin: (
    <Icon id="paladin">
      <path d="M10 6h12v14c0 3.5-2.5 6-6 7-3.5-1-6-3.5-6-7V6z" fill={`url(#paladin-fill)`} stroke={`url(#paladin-gold)`} strokeWidth="1.2" />
      <path d="M16 11v7M13 14.5h6" stroke={SHADOW} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M16 4v2" stroke={GOLD} strokeWidth="1.5" strokeLinecap="round" />
    </Icon>
  ),
  barbarian: (
    <Icon id="barbarian">
      <path d="M9 8l5 18" stroke={`url(#barbarian-gold)`} strokeWidth="2.8" strokeLinecap="round" />
      <path d="M9 8L5 5M9 8L8 3M9 8l4-3" stroke={IVORY} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M18 11l7-2.5-2.5 7-7 2.5 2.5-7z" fill="#8b3030" stroke={IVORY} strokeWidth="0.8" />
    </Icon>
  ),
  druid: (
    <Icon id="druid">
      <path d="M16 27V12" stroke="#5a8a40" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 12C9 7 7 2 11 2s6 4 5 10M16 12c7-5 9-10 5-10s-6 4-5 10" fill="#4a7a38" stroke={IVORY} strokeWidth="0.9" />
      <circle cx="16" cy="7" r="2.5" fill="#8ecf6a" stroke={SHADOW} strokeWidth="0.5" />
    </Icon>
  ),
  warlock: (
    <Icon id="warlock">
      <circle cx="16" cy="17" r="8" stroke={`url(#warlock-gold)`} strokeWidth="1.3" />
      <circle cx="16" cy="17" r="4" fill="#4a1860" stroke={IVORY} strokeWidth="0.8" />
      <circle cx="16" cy="17" r="1.5" fill={GLOW} />
      <path d="M16 6v4M11 7l2 3M21 7l-2 3" stroke={GOLD} strokeWidth="1.2" strokeLinecap="round" />
    </Icon>
  ),
  monk: (
    <Icon id="monk">
      <circle cx="16" cy="16" r="9" stroke={`url(#monk-gold)`} strokeWidth="1.3" />
      <path d="M16 8a8 8 0 010 16 4 4 0 000-16z" fill={`url(#monk-fill)`} stroke={SHADOW} strokeWidth="0.6" />
      <path d="M13 16c0-1.5 1.5-2.5 3-2.5s3 1 3 2.5" stroke={SHADOW} strokeWidth="1" strokeLinecap="round" fill="none" />
    </Icon>
  ),
  sorcerer: (
    <Icon id="sorcerer">
      <path d="M16 6c4 5 7 10 7 15a7 7 0 01-14 0c0-5 3-10 7-15z" fill="#d05018" stroke={`url(#sorcerer-gold)`} strokeWidth="1" />
      <path d="M13 18l3 5 3-5" fill={GLOW} stroke={SHADOW} strokeWidth="0.4" />
      <circle cx="16" cy="14" r="2" fill="#fff8c0" stroke={SHADOW} strokeWidth="0.4" />
    </Icon>
  ),
  goblin: (
    <Icon id="goblin">
      <ellipse cx="16" cy="17" rx="8" ry="9" fill="#5a8a38" stroke={IVORY} strokeWidth="1" />
      <path d="M9 11L7 6M23 11l2-5" stroke={IVORY} strokeWidth="1.5" strokeLinecap="round" />
      <ellipse cx="12.5" cy="16" rx="2" ry="2.5" fill={SHADOW} />
      <ellipse cx="19.5" cy="16" rx="2" ry="2.5" fill={SHADOW} />
      <path d="M12 21c2 2 6 2 8 0" stroke={SHADOW} strokeWidth="1.2" strokeLinecap="round" fill="none" />
    </Icon>
  ),
  orc: (
    <Icon id="orc">
      <rect x="9" y="10" width="14" height="14" rx="3" fill="#3d5a2a" stroke={IVORY} strokeWidth="1" />
      <path d="M7 13h3v4H7zM22 13h3v4h-3z" fill={`url(#orc-fill)`} stroke={SHADOW} strokeWidth="0.5" />
      <rect x="12" y="15" width="3" height="2.5" rx="0.5" fill={SHADOW} />
      <rect x="17" y="15" width="3" height="2.5" rx="0.5" fill={SHADOW} />
      <path d="M13 21h6" stroke={SHADOW} strokeWidth="1.8" strokeLinecap="round" />
    </Icon>
  ),
  skeleton: (
    <Icon id="skeleton">
      <circle cx="16" cy="12" r="6.5" fill="#e0d8c8" stroke={IVORY} strokeWidth="1" />
      <ellipse cx="13.5" cy="11.5" rx="1.5" ry="2" fill={SHADOW} />
      <ellipse cx="18.5" cy="11.5" rx="1.5" ry="2" fill={SHADOW} />
      <path d="M13.5 15.5h5" stroke={SHADOW} strokeWidth="1" />
      <path d="M11 20h10v7H11z" fill="#d0c8b8" stroke={IVORY} strokeWidth="0.8" />
      <path d="M16 20v7M13 23h6" stroke={SHADOW} strokeWidth="0.7" />
    </Icon>
  ),
  zombie: (
    <Icon id="zombie">
      <circle cx="16" cy="12" r="6.5" fill="#6a7a58" stroke={IVORY} strokeWidth="1" />
      <circle cx="13" cy="11" r="1.5" fill={SHADOW} />
      <circle cx="19" cy="12" r="1.2" fill={SHADOW} />
      <path d="M12 16c2 1 5 0 6-1" stroke={SHADOW} strokeWidth="1" fill="none" />
      <path d="M10 20h12v7H10z" fill="#5a6a48" stroke={IVORY} strokeWidth="0.8" />
      <path d="M13 23h6" stroke="#8b3030" strokeWidth="1" />
    </Icon>
  ),
  wolf: (
    <Icon id="wolf">
      <path d="M7 20c3-7 7-10 12-8.5 3.5 1.5 6 5.5 5 9.5s-5 6-9 5-6-4-5-7.5" fill="#7a7a88" stroke={IVORY} strokeWidth="1" />
      <path d="M9 12L6 8M11 10L8 5" stroke={IVORY} strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="18" cy="15" r="1.5" fill={SHADOW} />
      <path d="M20 18l4 2.5" stroke={IVORY} strokeWidth="1.5" strokeLinecap="round" />
    </Icon>
  ),
  spider: (
    <Icon id="spider">
      <ellipse cx="16" cy="14" rx="5" ry="6" fill="#1e1212" stroke={IVORY} strokeWidth="1" />
      <path d="M11 11L6 6M21 11l5-5M10 15H5M22 15h5M11 19l-4 5M21 19l4 5M12 22l-1.5 6M20 22l1.5 6" stroke={IVORY} strokeWidth="1.1" strokeLinecap="round" />
      <circle cx="13.5" cy="13" r="1.2" fill="#cc3030" />
      <circle cx="18.5" cy="13" r="1.2" fill="#cc3030" />
    </Icon>
  ),
  dragon: (
    <Icon id="dragon">
      <path d="M6 22c5-9 11-12 18-9 2.5 1.2 4 4 3 7.5s-4 5.5-8 4.5-7-3.5-6-7.5" fill="#7a1818" stroke={`url(#dragon-gold)`} strokeWidth="1" />
      <path d="M23 10l5-5-1.5 6" fill={IVORY} stroke={SHADOW} strokeWidth="0.6" />
      <circle cx="18" cy="15" r="1.8" fill={GLOW} stroke={SHADOW} strokeWidth="0.4" />
      <path d="M8 20l-3 4" stroke={IVORY} strokeWidth="1.3" strokeLinecap="round" />
    </Icon>
  ),
  demon: (
    <Icon id="demon">
      <path d="M10 9l2.5-5 3.5 3.5L19.5 4 22 9" stroke={IVORY} strokeWidth="1.3" strokeLinecap="round" fill="none" />
      <path d="M8 12c0 9 4.5 13 8 13s8-4 8-13H8z" fill="#4a0818" stroke={`url(#demon-gold)`} strokeWidth="1" />
      <ellipse cx="12.5" cy="17" rx="1.8" ry="2.5" fill="#ff5050" />
      <ellipse cx="19.5" cy="17" rx="1.8" ry="2.5" fill="#ff5050" />
    </Icon>
  ),
  npc: (
    <Icon id="npc">
      <circle cx="16" cy="10" r="4" fill={`url(#npc-fill)`} stroke={SHADOW} strokeWidth="0.7" />
      <path d="M8 27c0-6 3.5-9.5 8-9.5s8 3.5 8 9.5" fill={`url(#npc-fill)`} stroke={SHADOW} strokeWidth="0.8" />
      <path d="M8 27h16" stroke={`url(#npc-gold)`} strokeWidth="0.8" opacity="0.6" />
    </Icon>
  ),
  boss: (
    <Icon id="boss">
      <path d="M7 21h18l-2.5-6H9.5L7 21z" fill={`url(#boss-gold)`} stroke={SHADOW} strokeWidth="0.8" />
      <path d="M10 15V11h12v4" stroke={IVORY} strokeWidth="1.2" fill="none" />
      <circle cx="16" cy="8" r="2.5" fill={GLOW} stroke={SHADOW} strokeWidth="0.6" />
      <path d="M12 8h8" stroke={SHADOW} strokeWidth="0.8" />
    </Icon>
  ),
  chest: (
    <Icon id="chest">
      <rect x="7" y="14" width="18" height="11" rx="1.5" fill="#7a4a18" stroke={`url(#chest-gold)`} strokeWidth="1" />
      <path d="M7 14h18v4H7z" fill="#9a6020" stroke={IVORY} strokeWidth="0.5" />
      <rect x="13.5" y="16.5" width="5" height="3.5" rx="0.5" fill={GOLD} stroke={SHADOW} strokeWidth="0.5" />
      <path d="M7 14c0-4 3.5-6.5 9-6.5s9 2.5 9 6.5" stroke={IVORY} strokeWidth="1.2" fill="none" />
    </Icon>
  ),
  trap: (
    <Icon id="trap">
      <path d="M6 24h20" stroke="#6b4a20" strokeWidth="2" strokeLinecap="round" />
      <path d="M11 24V13l5-7 5 7v11" stroke={`url(#trap-gold)`} strokeWidth="1.6" strokeLinejoin="round" fill="none" />
      <circle cx="16" cy="16" r="2.5" fill="#cc3030" stroke={IVORY} strokeWidth="0.8" />
      <path d="M9 19h14" stroke={GOLD} strokeWidth="0.8" strokeDasharray="2 2" opacity="0.7" />
    </Icon>
  ),
  campfire: (
    <Icon id="campfire">
      <path d="M8 24h16" stroke="#5a3a18" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M16 24c0-10 5-14 0-19-5 5 0 9 0 19z" fill="#d84810" stroke={GLOW} strokeWidth="0.9" />
      <path d="M13 18c1.5-4 3-6 3-8" stroke="#ffe060" strokeWidth="1.3" strokeLinecap="round" />
    </Icon>
  ),
  shrine: (
    <Icon id="shrine">
      <path d="M6 24h20" stroke={IVORY} strokeWidth="1.5" strokeLinecap="round" />
      <path d="M9 24V13h14v11" stroke={IVORY} strokeWidth="1.2" fill="none" />
      <path d="M6 13h20L16 5 6 13z" stroke={`url(#shrine-gold)`} strokeWidth="1.5" strokeLinejoin="round" fill="none" />
      <circle cx="16" cy="17" r="2.5" fill={GLOW} stroke={SHADOW} strokeWidth="0.5" />
    </Icon>
  ),
  'marker-red': (
    <Icon id="mr"><circle cx="16" cy="16" r="9" fill="#b82828" stroke={IVORY} strokeWidth="1.5" /></Icon>
  ),
  'marker-blue': (
    <Icon id="mb"><circle cx="16" cy="16" r="9" fill="#2858a8" stroke={IVORY} strokeWidth="1.5" /></Icon>
  ),
  'marker-green': (
    <Icon id="mg"><circle cx="16" cy="16" r="9" fill="#288848" stroke={IVORY} strokeWidth="1.5" /></Icon>
  ),
  'marker-yellow': (
    <Icon id="my"><circle cx="16" cy="16" r="9" fill="#a88818" stroke={IVORY} strokeWidth="1.5" /></Icon>
  ),
  'marker-purple': (
    <Icon id="mp"><circle cx="16" cy="16" r="9" fill="#6838a0" stroke={IVORY} strokeWidth="1.5" /></Icon>
  ),
  'marker-white': (
    <Icon id="mw"><circle cx="16" cy="16" r="9" fill="#e8e0d0" stroke={SHADOW} strokeWidth="1.5" /></Icon>
  ),
};

const FALLBACK = (
  <Icon id="fb">
    <circle cx="16" cy="16" r="8" fill={IVORY} stroke={SHADOW} strokeWidth="1" />
    <text x="16" y="20" textAnchor="middle" fontSize="11" fill={SHADOW} fontWeight="bold">?</text>
  </Icon>
);

export default function TokenIcon({ type, className }) {
  return (
    <span className={className}>
      {ICONS[type] || FALLBACK}
    </span>
  );
}
