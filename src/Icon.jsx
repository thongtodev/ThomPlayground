import React from 'react';

const aliases = {
  '💣':'bomb','🩴':'slipper','⭕':'tic','⚡':'zap','🧩':'puzzle','🀄':'link','🎮':'gamepad',
  '🏆':'trophy','🏅':'medal','🚩':'flag','💎':'gem','🔥':'flame','👑':'crown','🚀':'rocket',
  '📚':'book','🔗':'link','🌟':'star','🦉':'eye','💯':'target','🌈':'sparkles','💡':'lightbulb',
  '🔀':'dice','🔒':'lock','♫':'music','♪':'music','⌂':'home','Ⅱ':'pause','✦':'sparkles','✳':'sparkles','◷':'clock','▧':'gallery','✂':'scissors','✓':'check',
  '✕':'close','×':'close','⏸️':'pause','⏸':'pause','⏰':'clock','⌛':'hourglass','🎯':'target',
  '📱':'smartphone','☝':'pointer','🛡️':'shield','🛡':'shield','💥':'bomb','🎉':'party','🏁':'flag',
  '📒':'book','🧠':'brain','🧩':'puzzle','＋':'plus','✖':'close','●':'circle','✧':'sparkles','✧':'sparkles'
};

function Shape({name}) {
  switch(name) {
    case 'home': return <><path d="m3 10 9-7 9 7"/><path d="M5 9.5V21h14V9.5M9 21v-7h6v7"/></>;
    case 'connect4': return <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/><circle cx="6" cy="6" r="1.4" fill="currentColor"/><circle cx="12" cy="12" r="1.4" fill="currentColor"/><circle cx="18" cy="18" r="1.4" fill="currentColor"/></>;
    case 'simon': case 'brain': return <><path d="M9 4a3 3 0 0 0-5 2 3 3 0 0 0-1 5 3 3 0 0 0 2 5 3 3 0 0 0 4 4h3V4H9Z"/><path d="M15 4a3 3 0 0 1 5 2 3 3 0 0 1 1 5 3 3 0 0 1-2 5 3 3 0 0 1-4 4h-3V4h3Z"/><path d="M9 8c2 0 2 2 0 3m6-3c-2 0-2 2 0 3M9 16c2 0 2-2 0-3m6 3c-2 0-2-2 0-3"/></>;
    case 'grid': return <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/></>;
    case 'hand': return <><path d="M8 12V5a2 2 0 0 1 4 0v6-3a2 2 0 0 1 4 0v4-2a2 2 0 0 1 4 0v5c0 4-2 7-6 7h-2c-2 0-3-1-4-3l-3-4a2 2 0 0 1 3-3l2 2"/></>;
    case 'layers': return <><path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/></>;
    case 'heart': return <><path d="M20.8 8.7c0 5-8.8 11-8.8 11s-8.8-6-8.8-11a4.7 4.7 0 0 1 8.8-2.3 4.7 4.7 0 0 1 8.8 2.3Z"/></>;
    case 'move': return <><path d="M12 2v20M2 12h20m-6-6 6 6-6 6M8 6 2 12l6 6"/></>;
    case 'gamepad': return <><path d="M7 8h10a4 4 0 0 1 3.8 2.8l1.1 4.1a3 3 0 0 1-4.8 3.1L14 16H10l-3.1 2a3 3 0 0 1-4.8-3.1l1.1-4.1A4 4 0 0 1 7 8Z"/><path d="M7 11v4M5 13h4"/><circle cx="16.5" cy="12" r=".8"/><circle cx="18.5" cy="14.5" r=".8"/></>;
    case 'bomb': return <><circle cx="11" cy="13" r="7"/><path d="m16 7 3-3m-1 0 3 1-1 3"/><path d="M8 10c1-1 2-1.5 3.5-1.5"/></>;
    case 'slipper': return <><path d="M8 3c-2 2-3.5 6-3.5 10.5 0 4.7 2.8 7.5 7.5 7.5s7.5-2.8 7.5-7.5C19.5 9 18 5 16 3"/><path d="M8 3c1.7 1.4 3 3.4 4 6 1-2.6 2.3-4.6 4-6"/><path d="M12 9v4"/></>;
    case 'tic': return <><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/><path d="m4.8 4.8 2.4 2.4m0-2.4L4.8 7.2"/><circle cx="18" cy="6" r="1.5"/></>;
    case 'zap': return <><path d="M13 2 4 14h7l-1 8 10-13h-7l1-7Z"/></>;
    case 'puzzle': return <><path d="M8 4.5A2.5 2.5 0 1 1 13 4.5V7h3a2 2 0 0 1 2 2v3h2.5a2.5 2.5 0 1 1 0 5H18v3a2 2 0 0 1-2 2h-3v-2.5a2.5 2.5 0 1 0-5 0V22H5a2 2 0 0 1-2-2v-3h2.5a2.5 2.5 0 1 0 0-5H3V9a2 2 0 0 1 2-2h3V4.5Z"/></>;
    case 'link': return <><path d="M10 13a5 5 0 0 0 7.1 0l3-3A5 5 0 0 0 13 2.9l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.1 0l-3 3A5 5 0 0 0 11 21.1l1.7-1.7"/></>;
    case 'trophy': return <><path d="M8 21h8m-4-4v4M7 4h10v5a5 5 0 0 1-10 0V4Z"/><path d="M7 6H4v2a4 4 0 0 0 4 4m9-6h3v2a4 4 0 0 1-4 4"/></>;
    case 'gallery': case 'image': return <><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></>;
    case 'volume': return <><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 9a5 5 0 0 1 0 6m3-9a9 9 0 0 1 0 12"/></>;
    case 'volume-off': return <><path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="m16 9 5 6m0-6-5 6"/></>;
    case 'play': return <><path d="m8 5 11 7-11 7V5Z"/></>;
    case 'pause': return <><path d="M8 5h3v14H8zM15 5h3v14h-3z"/></>;
    case 'rotate': return <><path d="M20 7v5h-5"/><path d="M19 12a7.5 7.5 0 1 0 1 4"/></>;
    case 'lock': return <><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>;
    case 'flag': return <><path d="M5 21V4"/><path d="M5 4c5-3 8 3 14 0v10c-6 3-9-3-14 0"/></>;
    case 'music': return <><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></>;
    case 'lightbulb': return <><path d="M9 18h6m-5 3h4m-2-19a7 7 0 0 0-4 12.7c.7.5 1 1.2 1 2.3h6c0-1.1.3-1.8 1-2.3A7 7 0 0 0 12 2Z"/></>;
    case 'dice': return <><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1"/><circle cx="16" cy="8" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="8" cy="16" r="1"/><circle cx="16" cy="16" r="1"/></>;
    case 'clock': return <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>;
    case 'check': return <><path d="m5 12 4 4L19 6"/></>;
    case 'close': return <><path d="m6 6 12 12M18 6 6 18"/></>;
    case 'medal': case 'award': return <><circle cx="12" cy="8" r="5"/><path d="m8.5 12-2 9 5.5-3 5.5 3-2-9"/></>;
    case 'crown': return <><path d="m3 7 5 4 4-7 4 7 5-4-2 12H5L3 7Z"/><path d="M5 21h14"/></>;
    case 'gem': return <><path d="m6 3 12 0 4 6-10 12L2 9l4-6Z"/><path d="m2 9 20 0M6 3l6 18 6-18"/></>;
    case 'flame': return <><path d="M12 22c4 0 7-3 7-7 0-4-3-7-5-11-1 4-3 5-4 6-1-2-1-3-1-5-3 3-5 7-5 10 0 4 3 7 8 7Z"/><path d="M12 22c-2-1-3-3-2-5 1-1 2-2 2-3 2 2 4 4 2 7"/></>;
    case 'rocket': return <><path d="M5 15c-2 0-3 2-3 5 3 0 5-1 5-3"/><path d="M12 16 8 12c1-5 5-9 13-10-1 8-5 12-9 13Z"/><path d="m13 7 4 4M8 12l-4 1 4 4 1-4"/></>;
    case 'book': return <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 0 4 22V5.5Z"/><path d="M4 6h13M8 8h8"/></>;
    case 'target': return <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>;
    case 'timer': return <><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 2h6M12 2v3"/></>;
    case 'users': return <><circle cx="9" cy="8" r="3"/><path d="M3 20v-1a6 6 0 0 1 12 0v1H3Z"/><path d="M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 5v1h-3"/></>;
    case 'chart': return <><path d="M4 20V10m6 10V4m6 16v-7m6 7H2"/></>;
    case 'list': return <><path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4" cy="6" r=".8"/><circle cx="4" cy="12" r=".8"/><circle cx="4" cy="18" r=".8"/></>;
    case 'folder': return <><path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z"/></>;
    case 'upload': return <><path d="M12 16V4m-5 5 5-5 5 5"/><path d="M4 16v4h16v-4"/></>;
    case 'scissors': return <><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="m8.5 8.5 12 12m-12-5 12-12"/></>;
    case 'settings': return <><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.2 2-2 2-2-1.2-.1-.1-1.5.6-.6 2.2h-3l-.6-2.2-1.5-.6-.1.1-2 1.2-2-2 1.2-2 .1-.1-.6-1.5-2.2-.6v-3l2.2-.6.6-1.5-.1-.1-1.2-2 2-2 2 1.2.1.1 1.5-.6.6-2.2h3l.6 2.2 1.5.6.1-.1 2-1.2 2 2-1.2 2-.1.1.6 1.5 2.2.6v3l-2.2.6-.6 1.5Z"/></>;
    case 'log-out': return <><path d="M10 17l5-5-5-5m5 5H3"/><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7"/></>;
    case 'microphone': return <><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2m-7 9v3m-4 0h8"/></>;
    case 'star': return <><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3Z"/></>;
    case 'sparkles': return <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z"/><path d="m19 15 .9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15ZM5 2l.7 1.8L7.5 4.5l-1.8.7L5 7l-.7-1.8-1.8-.7 1.8-.7L5 2Z"/></>;
    case 'eye': return <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></>;
    case 'trash': return <><path d="M3 6h18M8 6V4h8v2m-11 0 1 15h12l1-15M10 10v7m4-7v7"/></>;
    case 'edit': return <><path d="m4 16-.8 4.8L8 20l11-11-4-4L4 16Z"/><path d="m13.5 6.5 4 4"/></>;
    case 'save': return <><path d="M5 3h12l4 4v14H3V3h2Z"/><path d="M7 3v6h10V3M7 21v-7h10v7"/></>;
    case 'camera': return <><path d="M3 8h4l2-3h6l2 3h4v12H3V8Z"/><circle cx="12" cy="14" r="4"/></>;
    case 'hourglass': return <><path d="M6 2h12M6 22h12M7 2c0 5 2 7 5 10-3 3-5 5-5 10m10-20c0 5-2 7-5 10 3 3 5 5 5 10"/></>;
    case 'shield': return <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/></>;
    case 'party': return <><path d="m4 20 6-16 6 16H4Z"/><path d="m16 4 1-2m3 6 2-1M3 7 2 5"/></>;
    case 'alert': return <><path d="M12 3 2.8 20h18.4L12 3Z"/><path d="M12 9v4m0 3h.01"/></>;
    case 'pointer': return <><path d="m5 3 14 10-7 1-3 7L5 3Z"/></>;
    case 'smartphone': return <><rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 18h4"/></>;
    case 'plus': return <><path d="M12 5v14M5 12h14"/></>;
    case 'zoom-in': return <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5m-10.5-14v7m-3.5-3.5h7"/></>;
    case 'zoom-out': return <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5m-14-10h7"/></>;
    case 'circle': return <><circle cx="12" cy="12" r="7" fill="currentColor" stroke="none"/></>;
    default: return <><path d="m12 3 2 6 6 3-6 2-2 7-2-7-6-2 6-3 2-6Z"/></>;
  }
}

export const normalizeIconName = name => aliases[name] || name || 'sparkles';

export default function Icon({name='sparkles',size=20,className='',strokeWidth=1.9}) {
  const key=normalizeIconName(name);
  return <svg className={`ui-icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false"><Shape name={key}/></svg>;
}
