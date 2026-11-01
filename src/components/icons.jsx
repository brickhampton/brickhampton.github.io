// Line icons, drawn on a 24-unit grid like the mockup. Icons, not emoji.
const Line = ({ size = 16, sw = 2, children, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>{children}</svg>
);

export const ChevRight = p => <Line size={18} sw={2.2} className="chev" {...p}><path d="m9 6 6 6-6 6" /></Line>;
export const Back = p => <Line size={16} sw={2.4} {...p}><path d="m15 6-6 6 6 6" /></Line>;
export const Fwd = p => <Line size={16} sw={2.4} {...p}><path d="m9 6 6 6-6 6" /></Line>;
export const ChevDown = p => <Line size={16} sw={2.2} {...p}><path d="m6 9 6 6 6-6" /></Line>;
export const ChevUp = p => <Line size={16} sw={2.2} {...p}><path d="m6 15 6-6 6 6" /></Line>;
export const SmallChev = () => <Line size={12} sw={2.6} className="chev"><path d="m6 9 6 6 6-6" /></Line>;
export const Pencil = p => <Line {...p}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></Line>;
export const ShareIcon = p => <Line size={16} sw={2.2} {...p}><path d="M12 15V3M7 8l5-5 5 5" /><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" /></Line>;
export const Download = p => <Line size={20} sw={2.2} {...p}><path d="M12 4v11M7 10l5 5 5-5" /><path d="M5 20h14" /></Line>;
export const Dice = p => <Line size={20} sw={2} {...p}><rect x="4" y="4" width="16" height="16" rx="3.5" /><circle cx="8.5" cy="8.5" r="1.1" fill="currentColor" stroke="none" /><circle cx="15.5" cy="8.5" r="1.1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" /><circle cx="8.5" cy="15.5" r="1.1" fill="currentColor" stroke="none" /><circle cx="15.5" cy="15.5" r="1.1" fill="currentColor" stroke="none" /></Line>;
export const X = p => <Line sw={2.2} {...p}><path d="M6 6l12 12M18 6 6 18" /></Line>;
export const Lock = ({ size = 22 }) => <Line size={size}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></Line>;
export const Shield = () => <Line size={14} sw={2.4}><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6Z" /><path d="m9 12 2 2 4-4" /></Line>;
export const Plus = () => <Line sw={2.6}><path d="M12 5v14M5 12h14" /></Line>;
export const Gear = () => (
  <Line size={20}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></Line>
);
export const MoreIcon = () => <Line size={15} sw={2.2}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><path d="M17.5 14v7M14 17.5h7" /></Line>;

// Badge and tag icons (14px).
const B = ({ children, fill }) => fill
  ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">{children}</svg>
  : <Line size={14} sw={2.2}>{children}</Line>;
export const BIC = {
  flame: <B><path d="M12 22c4 0 7-2.7 7-6.6 0-3.1-2-5.4-3.6-7.1-.4 1.9-1.4 3-2.4 3.4.3-3.2-1.2-6.4-4-8.7.2 3.4-1.5 5.4-3 7.2C4.8 11.6 5 13.4 5 15.4 5 19.3 8 22 12 22z" /></B>,
  trophy: <B><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" /></B>,
  zap: <B><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></B>,
  target: <B><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /></B>,
  shield: <B><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /><path d="m9 12 2 2 4-4" /></B>,
  ball: <B><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3v18M5.6 5.6q5 6.4 0 12.8M18.4 5.6q-5 6.4 0 12.8" /></B>,
  up: <B><path d="M12 19V5M5 12l7-7 7 7" /></B>,
  boom: <B><path d="M12 2.5l1.9 4.6 4.3-2.7-1.1 4.9 4.9 1-4.2 2.7 3.2 3.9-5-.5-.4 5-3.6-3.5-3.6 3.5-.4-5-5 .5 3.2-3.9-4.2-2.7 4.9-1-1.1-4.9 4.3 2.7z" /></B>,
  bull: <B><path d="M3.5 4.5c0 3 2 4.5 4.5 4.5M20.5 4.5c0 3-2 4.5-4.5 4.5" /><path d="M8 9h8l-1 7.5a3 3 0 0 1-6 0z" /><path d="M10.5 16h3" /></B>,
  butter: <B><path d="M3 15 15 9l6 3-12 6z" /><path d="M3 15v2.5l6 3V18M21 12v2.5l-12 6" /><path d="M13 10.5v3.5" /></B>,
  pass: <B><path d="M4 12h14M12 6l6 6-6 6" /></B>,
  trend: <B><path d="M3 17l6-6 4 4 8-8M15 7h6v6" /></B>,
  iron: <B><path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12" /></B>,
  lock: <B><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></B>,
  layers: <B><path d="M12 3 2 8l10 5 10-5zM2 16l10 5 10-5" /></B>,
  check: <B><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></B>,
  knife: <B><rect x="2.5" y="12.5" width="14" height="6" rx="3" /><path d="M8 12.5 19 5l2 2.2-9 5.3" /><path d="M16.5 15.5h4.5" /><circle cx="6" cy="15.5" r=".9" fill="currentColor" /></B>,
  cookie: <B><path d="M20.5 12.5A8.5 8.5 0 1 1 11.5 3.5a3 3 0 0 0 4 4 3 3 0 0 0 5 5z" /><circle cx="8.5" cy="10" r="1" fill="currentColor" /><circle cx="12.5" cy="15.5" r="1" fill="currentColor" /><circle cx="8" cy="15" r=".8" fill="currentColor" /><circle cx="15.5" cy="12" r=".8" fill="currentColor" /></B>,
  money: <B><circle cx="12" cy="12" r="6" /><path d="M12 2v4M12 18v4M2 12h4M18 12h4" /></B>,
  burger: (
    <svg className="burger" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3.5 10.2C3.5 6.3 7.3 3.5 12 3.5s8.5 2.8 8.5 6.7c0 .5-.4.8-.9.8H4.4c-.5 0-.9-.3-.9-.8z" fill="#f0a84e" />
      <circle cx="9" cy="6.6" r=".7" fill="#fff3d6" /><circle cx="12.5" cy="5.6" r=".7" fill="#fff3d6" /><circle cx="15.6" cy="7.2" r=".7" fill="#fff3d6" />
      <path d="M3 12.1h18l-1.6 1.7-1.7-1.1-1.8 1.2-1.9-1.2-1.9 1.2-1.9-1.2-1.9 1.2-1.7-1.1L4.6 14z" fill="#79c56a" />
      <rect x="3.4" y="13.6" width="17.2" height="3.2" rx="1.6" fill="#7a3d20" />
      <path d="M3.6 17h16.8l-2.1 1.6H5.7z" fill="#f6cf45" />
      <path d="M3.8 18.3h16.4v.7c0 1.2-1 2-2.2 2H6c-1.2 0-2.2-.8-2.2-2z" fill="#e39a40" />
    </svg>
  ),
};

// Gold medal for a player's highs heading: blue and white ribbon, gold disc with a star.
export const MedalGold = () => (
  <svg className="gold-trophy" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
    <defs><linearGradient id="gm-g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#ffe08a" /><stop offset=".55" stopColor="#e9b949" /><stop offset="1" stopColor="#b9821f" /></linearGradient></defs>
    <path d="M6.5 1.5h4l2.6 7.2-3.3 1.4z" fill="#2f55d4" /><path d="M17.5 1.5h-4l-2.6 7.2 3.3 1.4z" fill="#e8ecf8" />
    <circle cx="12" cy="15" r="7.3" fill="url(#gm-g)" /><circle cx="12" cy="15" r="5.4" fill="none" stroke="#b9821f" strokeWidth="1" opacity=".7" />
    <path d="M12 11.6l1.05 2.15 2.35.33-1.7 1.65.4 2.35L12 16.97l-2.1 1.11.4-2.35-1.7-1.65 2.35-.33z" fill="#fff6d6" />
  </svg>
);
export const TrophyGold = () => (
  <svg className="gold-trophy" width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
    <defs><linearGradient id="gt-g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#ffe08a" /><stop offset=".55" stopColor="#e9b949" /><stop offset="1" stopColor="#b9821f" /></linearGradient></defs>
    <path d="M17 4h3v2.5a3.5 3.5 0 0 1-3.6 3.5M7 4H4v2.5A3.5 3.5 0 0 0 7.6 10" fill="none" stroke="#d9a63a" strokeWidth="2" strokeLinecap="round" />
    <path d="M7 3h10v6a5 5 0 0 1-10 0z" fill="url(#gt-g)" /><rect x="10.8" y="13.6" width="2.4" height="3.6" fill="#c9922c" /><rect x="7.5" y="17.2" width="9" height="3.3" rx="1" fill="url(#gt-g)" />
    <path d="M9.2 5.2v3.6" stroke="#fff6d6" strokeWidth="1.2" strokeLinecap="round" opacity=".8" />
  </svg>
);
export const BallArt = () => (
  <svg className="estate-art" viewBox="0 0 120 84" aria-hidden="true"><ellipse className="ea-shadow" cx="60" cy="76" rx="20" ry="4" fill="#000" opacity=".35" />
    <g className="ea-ball"><circle cx="60" cy="40" r="22" fill="#ee6018" /><path d="M38 40h44M60 18v44M44.5 24.5q11 15.5 0 31M75.5 24.5q-11 15.5 0 31" stroke="#2a1206" strokeWidth="2" fill="none" /></g></svg>
);
