const SVG_START = '<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" class="art-svg"><rect width="64" height="64" rx="16" fill="var(--chip)"/>';
const SVG_END = '</svg>';

export const ART_PRESETS = {
  burger: SVG_START +
    '<path d="M14 28c0-8 8-12 18-12s18 4 18 12H14z" fill="#d99343"/>' +
    '<circle cx="25" cy="21" r="1.2" fill="#fff" opacity=".8"/>' +
    '<circle cx="33" cy="19" r="1.2" fill="#fff" opacity=".8"/>' +
    '<circle cx="39" cy="22" r="1.2" fill="#fff" opacity=".8"/>' +
    '<path d="M12 30c3 2 6 0 10 2s8 0 11 2 7 0 11 2 6-1 8-2v3H12v-7z" fill="#58a04b"/>' +
    '<rect x="13" y="34" width="38" height="5" rx="2.5" fill="#e8a838"/>' +
    '<rect x="14" y="38" width="36" height="7" rx="3.5" fill="#6f3c1b"/>' +
    '<path d="M14 47h36c0 6-7 8-18 8s-18-2-18-8z" fill="#d99343"/>' +
    SVG_END,

  pizza: SVG_START +
    '<path d="M14 18c11-4 25-4 36 0l-18 36L14 18z" fill="#f4b242"/>' +
    '<path d="M13 18c11-4 27-4 38 0 1 2-2 4-5 4-10-3-18-3-28 0-3 0-6-2-5-4z" fill="#c97c28"/>' +
    '<circle cx="26" cy="28" r="3.2" fill="#b93828"/>' +
    '<circle cx="37" cy="30" r="3" fill="#b93828"/>' +
    '<circle cx="32" cy="40" r="2.8" fill="#b93828"/>' +
    '<circle cx="32" cy="25" r="1.8" fill="#4d8c3f"/>' +
    '<circle cx="28" cy="36" r="1.8" fill="#4d8c3f"/>' +
    SVG_END,

  espresso: SVG_START +
    '<ellipse cx="32" cy="50" rx="20" ry="4" fill="var(--line)"/>' +
    '<path d="M18 28h28v11a14 14 0 0 1-28 0V28z" fill="#8d5b3b"/>' +
    '<path d="M46 31h4a5 5 0 0 1 0 10h-4" fill="none" stroke="#8d5b3b" stroke-width="3" stroke-linecap="round"/>' +
    '<ellipse cx="32" cy="28" rx="14" ry="4" fill="#c48a58"/>' +
    '<path d="M26 18c-2-3 2-6 0-9M32 18c-2-3 2-6 0-9M38 18c-2-3 2-6 0-9" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" opacity=".7"/>' +
    SVG_END,

  iced: SVG_START +
    '<path d="M40 8l-6 22" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/>' +
    '<path d="M20 18h24l-3 36H23L20 18z" fill="#6d462a"/>' +
    '<rect x="25" y="24" width="8" height="8" rx="2" fill="#fff" opacity=".5"/>' +
    '<rect x="31" y="34" width="8" height="8" rx="2" fill="#fff" opacity=".4"/>' +
    '<path d="M19 18h26" stroke="var(--line)" stroke-width="2"/>' +
    SVG_END,

  pastry: SVG_START +
    '<path d="M10 40c2-14 13-22 22-22s20 8 22 22c-5 2-8-2-12-3-7-3-13-3-20 0-4 1-7 5-12 3z" fill="#e09d52"/>' +
    '<path d="M24 22l-2 14M32 20v16M40 22l2 14" stroke="#ad6b24" stroke-width="2.5" stroke-linecap="round"/>' +
    SVG_END,

  traditional: SVG_START +
    '<ellipse cx="32" cy="48" rx="22" ry="7" fill="var(--line)"/>' +
    '<ellipse cx="32" cy="44" rx="20" ry="6" fill="#dfcfbd"/>' +
    '<circle cx="32" cy="34" r="10" fill="#913b24"/>' +
    '<circle cx="26" cy="32" r="3.5" fill="#4d7c3f"/>' +
    '<circle cx="37" cy="36" r="3.5" fill="#d97f26"/>' +
    '<circle cx="33" cy="28" r="2.5" fill="#f4cf65"/>' +
    '<path d="M14 38c2-4 7-6 10-4M40 38c3-4 8-3 10 0" stroke="#cbb29a" stroke-width="3" stroke-linecap="round"/>' +
    SVG_END,

  plate: SVG_START +
    '<ellipse cx="32" cy="48" rx="22" ry="6" fill="var(--line)"/>' +
    '<path d="M16 42h32a16 16 0 0 0-32 0z" fill="var(--accent)"/>' +
    '<circle cx="32" cy="24" r="3" fill="var(--accent)"/>' +
    '<rect x="14" y="42" width="36" height="3" rx="1.5" fill="var(--accent-hover, var(--accent))"/>' +
    SVG_END,
};

export const UI_ICONS = {
  menu: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
  reviews: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  appearance: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>',
  settings: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  sun: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
  moon: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
  starFilled: '<svg viewBox="0 0 24 24" width="16" height="16" fill="#f59e0b" stroke="#f59e0b" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  starEmpty: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--muted)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  clock: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  mapPin: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
  phone: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>',
  whatsapp: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.99.59 3.93 1.71 5.58L2 22l4.67-1.78a9.88 9.88 0 0 0 5.37 1.56h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.64-1.03-5.13-2.9-7-1.87-1.87-4.36-2.87-7.02-2.87zm5.79 14.07c-.24.68-1.39 1.3-1.92 1.38-.49.08-1.12.11-3.23-.76-2.45-1.02-4.04-3.52-4.16-3.69-.12-.16-1-1.33-1-2.54 0-1.21.63-1.8.85-2.05.23-.24.49-.31.66-.31.17 0 .34 0 .49.01.16.01.37-.06.58.44.22.52.74 1.8.81 1.93.07.14.11.3.02.48-.09.18-.14.29-.28.45-.14.16-.3.35-.42.47-.14.14-.29.29-.12.58.16.29.73 1.21 1.57 1.95 1.08.96 1.99 1.26 2.28 1.4.29.14.46.12.63-.08.17-.2.74-.86.94-1.16.2-.29.4-.24.68-.14.28.1.77.84 2.18.96.41.12.68.18.78.35.1.17.1.98-.14 1.66z"/></svg>',
  externalLink: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>',
  trash: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  eye: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeOff: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',
  edit: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
  copy: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  arrowUp: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="18 15 12 9 6 15"/></svg>',
  arrowDown: '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>',
  plus: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
  lock: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  check: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>',
  bold: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/></svg>',
  italic: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>',
  heading2: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6v12M14 6v12M4 12h10M18 18h4c0-2-1-3-2-4s2-2 2-4-2-4-4-4"/></svg>',
  heading3: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6v12M14 6v12M4 12h10M18 8a2 2 0 0 1 2-2h2v4h-2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2h-4"/></svg>',
  quote: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 21c3 0 7-1 7-8V5c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2 0 4-1 6-2 8zM15 21c3 0 7-1 7-8V5c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2 0 4-1 6-2 8z"/></svg>',
  listBullet: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>',
  listNumbered: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4M4 14h2.5c.8 0 1.5.7 1.5 1.5S7.3 17 6.5 17H4v3h4"/></svg>',
  link: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>'
};

export const CATEGORY_SVGS = {
  burger: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11c0-4 4-7 9-7s9 3 9 7H3z"/><path d="M4 18h16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z"/><path d="M2 14c2 1 4 0 6 1s4 0 6 1 4 0 6 1 4 0 4-1"/></svg>',
  pizza: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21L3 6a18.8 18.8 0 0 1 18 0l-9 15z"/><circle cx="12" cy="11" r="1.5" fill="currentColor"/><circle cx="10" cy="15" r="1" fill="currentColor"/><circle cx="14" cy="15" r="1" fill="currentColor"/></svg>',
  coffee: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>',
  drinks: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 8h1a4 4 0 0 1 0 8h-1"/><path d="M5 2h14l-2 18H7L5 2z"/><line x1="6" y1="8" x2="18" y2="8"/></svg>',
  pastry: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 16c1-6 6-10 8-10s7 4 8 10c-2 1-4 0-6-1s-4 0-6 1-3 1-4 0z"/><line x1="9" y1="10" x2="8" y2="15"/><line x1="12" y1="9" x2="12" y2="15"/><line x1="15" y1="10" x2="16" y2="15"/></svg>',
  traditional: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><ellipse cx="12" cy="16" rx="9" ry="4"/><path d="M6 15c0-4 3-7 6-7s6 3 6 7"/><circle cx="12" cy="8" r="1.5" fill="currentColor"/></svg>',
  plate: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><ellipse cx="12" cy="18" rx="9" ry="3"/><path d="M5 17c0-5 3.5-9 7-9s7 4 7 9"/><circle cx="12" cy="6" r="1.5" fill="currentColor"/></svg>'
};

export function getCategoryIcon(indicator = "", className = "category-icon-svg") {
  const s = String(indicator || "").toLowerCase();
  let svg = CATEGORY_SVGS.plate;
  if (s.includes("burger") || s.includes("🍔")) svg = CATEGORY_SVGS.burger;
  else if (s.includes("pizza") || s.includes("🍕")) svg = CATEGORY_SVGS.pizza;
  else if (s.includes("coffee") || s.includes("espresso") || s.includes("☕")) svg = CATEGORY_SVGS.coffee;
  else if (s.includes("drink") || s.includes("iced") || s.includes("beverage") || s.includes("🥤")) svg = CATEGORY_SVGS.drinks;
  else if (s.includes("pastry") || s.includes("dessert") || s.includes("croissant") || s.includes("🥐") || s.includes("🍰")) svg = CATEGORY_SVGS.pastry;
  else if (s.includes("traditional") || s.includes("tibs") || s.includes("combo") || s.includes("🍛") || s.includes("🍲")) svg = CATEGORY_SVGS.traditional;
  
  if (className) {
    return svg.replace('<svg ', `<svg class="${className}" `);
  }
  return svg;
}

export function renderStarRating(rating = 5, size = 16) {
  const full = Math.max(1, Math.min(5, Math.round(Number(rating) || 5)));
  let html = '<div class="star-rating" style="display:inline-flex;gap:2px;align-items:center;">';
  for (let i = 1; i <= 5; i++) {
    const isFilled = i <= full;
    html += isFilled
      ? UI_ICONS.starFilled.replace('width="16"', `width="${size}"`).replace('height="16"', `height="${size}"`)
      : UI_ICONS.starEmpty.replace('width="16"', `width="${size}"`).replace('height="16"', `height="${size}"`);
  }
  html += '</div>';
  return html;
}

export function getIllustration(item = {}, categoryName = "") {
  const name = String(item.name?.en || item.name || "").toLowerCase();
  const cat = String(categoryName || "").toLowerCase();

  if (name.includes("burger") || cat.includes("burger")) return ART_PRESETS.burger;
  if (name.includes("pizza") || cat.includes("pizza")) return ART_PRESETS.pizza;
  if (name.includes("tibs") || name.includes("combo") || cat.includes("traditional") || cat.includes("meal")) return ART_PRESETS.traditional;
  if (name.includes("croissant") || name.includes("muffin") || name.includes("toast") || name.includes("bread") || cat.includes("pastry") || cat.includes("bakery")) return ART_PRESETS.pastry;
  if (name.includes("iced") || name.includes("cold") || name.includes("shake") || name.includes("juice") || name.includes("smoothie")) return ART_PRESETS.iced;
  if (name.includes("espresso") || name.includes("coffee") || name.includes("macchiato") || name.includes("latte") || name.includes("cappuccino") || cat.includes("coffee") || cat.includes("hot drink")) return ART_PRESETS.espresso;
  return ART_PRESETS.plate;
}

export function renderMarkdown(md = "") {
  if (!md || typeof md !== "string") return "";

  // 1. Escape raw HTML tags to prevent XSS
  let text = md.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));

  // 2. Normalize CRLF
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const parseImage = (rawAlt, url) => {
    let altText = rawAlt || "";
    let align = "center";
    if (altText.includes("|")) {
      const parts = altText.split("|");
      altText = parts[0].trim();
      align = parts[1].trim().toLowerCase();
    } else if (altText.includes("#")) {
      const parts = altText.split("#");
      altText = parts[0].trim();
      align = parts[1].trim().toLowerCase();
    }
    if (!["left", "right", "center"].includes(align)) {
      align = "center";
    }
    const captionHtml = altText ? `<figcaption>${altText}</figcaption>` : "";
    return `<figure class="md-figure align-${align}"><img src="${url}" alt="${altText}" loading="lazy" />${captionHtml}</figure>`;
  };

  const formatInline = (str) => {
    return str
      // Images: ![alt](url)
      .replace(/!\[([^\]]*)\]\(((?:https?:\/\/|\/|data:)[^\s)]+)\)/g, (_m, alt, url) => parseImage(alt, url))
      // Bold
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/__(.+?)__/g, "<strong>$1</strong>")
      // Italic
      .replace(/\*([^*]+?)\*/g, "<em>$1</em>")
      .replace(/_([^_]+?)_/g, "<em>$1</em>")
      // Links: [text](url) where url is http(s), mailto, tel, or relative path
      .replace(/\[([^\]]+)\]\(((?:https?:\/\/|\/|mailto:|tel:)[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  };

  const lines = text.split("\n");
  const html = [];
  let inUl = false;
  let inOl = false;
  let inQuote = false;
  let quoteBuffer = [];

  const flushQuote = () => {
    if (inQuote) {
      html.push(`<blockquote><p>${quoteBuffer.map(formatInline).join("<br/>")}</p></blockquote>`);
      quoteBuffer = [];
      inQuote = false;
    }
  };

  const flushLists = () => {
    if (inUl) { html.push("</ul>"); inUl = false; }
    if (inOl) { html.push("</ol>"); inOl = false; }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      flushQuote();
      flushLists();
      continue;
    }

    // Image block: ![alt|align](url)
    const imgBlockMatch = line.match(/^!\[([^\]]*)\]\(((?:https?:\/\/|\/|data:)[^\s)]+)\)$/);
    if (imgBlockMatch) {
      flushQuote();
      flushLists();
      html.push(parseImage(imgBlockMatch[1], imgBlockMatch[2]));
      continue;
    }

    // Blockquote
    if (line.startsWith("&gt;") || line.startsWith(">")) {
      flushLists();
      const content = line.replace(/^(&gt;|>)\s?/, "");
      inQuote = true;
      quoteBuffer.push(content);
      continue;
    } else {
      flushQuote();
    }

    // Headings
    if (line.startsWith("### ")) {
      flushLists();
      html.push(`<h3>${formatInline(line.slice(4))}</h3>`);
      continue;
    }
    if (line.startsWith("## ")) {
      flushLists();
      html.push(`<h2>${formatInline(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith("# ")) {
      flushLists();
      html.push(`<h1>${formatInline(line.slice(2))}</h1>`);
      continue;
    }

    // Unordered List
    const ulMatch = line.match(/^[-*]\s+(.+)/);
    if (ulMatch) {
      if (inOl) { html.push("</ol>"); inOl = false; }
      if (!inUl) { html.push("<ul>"); inUl = true; }
      html.push(`<li>${formatInline(ulMatch[1])}</li>`);
      continue;
    }

    // Ordered List
    const olMatch = line.match(/^\d+\.\s+(.+)/);
    if (olMatch) {
      if (inUl) { html.push("</ul>"); inUl = false; }
      if (!inOl) { html.push("<ol>"); inOl = true; }
      html.push(`<li>${formatInline(olMatch[1])}</li>`);
      continue;
    }

    // Regular paragraph line
    flushLists();
    html.push(`<p>${formatInline(line)}</p>`);
  }

  flushQuote();
  flushLists();

  return html.join("\n");
}

export function htmlToMarkdown(html = "") {
  if (!html || typeof html !== "string") return "";

  if (typeof document !== "undefined") {
    const temp = document.createElement("div");
    temp.innerHTML = html;

    function processNode(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.nodeValue || "";
      }
      if (node.nodeType !== Node.ELEMENT_NODE) {
        return "";
      }

      const tag = node.tagName.toLowerCase();
      const childText = Array.from(node.childNodes).map(processNode).join("");

      switch (tag) {
        case "h1":
          return `\n\n# ${childText.trim()}\n\n`;
        case "h2":
          return `\n\n## ${childText.trim()}\n\n`;
        case "h3":
          return `\n\n### ${childText.trim()}\n\n`;
        case "strong":
        case "b":
          return childText.trim() ? `**${childText}**` : "";
        case "em":
        case "i":
          return childText.trim() ? `*${childText}*` : "";
        case "blockquote": {
          const lines = childText.trim().split("\n").map(l => l.trim()).filter(Boolean);
          return `\n\n${lines.map(l => `> ${l.replace(/^>\s*/, "")}`).join("\n")}\n\n`;
        }
        case "ul": {
          const lis = Array.from(node.querySelectorAll(":scope > li"));
          const items = lis.map(li => `- ${Array.from(li.childNodes).map(processNode).join("").trim()}`).filter(Boolean);
          return `\n\n${items.join("\n")}\n\n`;
        }
        case "ol": {
          const lis = Array.from(node.querySelectorAll(":scope > li"));
          const items = lis.map((li, idx) => `${idx + 1}. ${Array.from(li.childNodes).map(processNode).join("").trim()}`).filter(Boolean);
          return `\n\n${items.join("\n")}\n\n`;
        }
        case "li":
          return childText.trim();
        case "p":
        case "div": {
          const trimmed = childText.trim();
          return trimmed ? `\n\n${trimmed}\n\n` : "";
        }
        case "a": {
          const href = node.getAttribute("href") || "#";
          return `[${childText.trim() || href}](${href})`;
        }
        case "figure": {
          const img = node.querySelector("img");
          if (!img) return childText;
          const src = img.getAttribute("src") || "";
          const figcap = node.querySelector("figcaption");
          const alt = (figcap ? figcap.textContent : img.getAttribute("alt")) || "";
          let align = "center";
          if (node.classList.contains("align-left")) align = "left";
          else if (node.classList.contains("align-right")) align = "right";
          return `\n\n![${alt}|${align}](${src})\n\n`;
        }
        case "img": {
          if (node.closest("figure")) return "";
          const src = node.getAttribute("src") || "";
          const alt = node.getAttribute("alt") || "";
          let align = "center";
          if (node.classList.contains("align-left")) align = "left";
          else if (node.classList.contains("align-right")) align = "right";
          return `\n\n![${alt}|${align}](${src})\n\n`;
        }
        case "br":
          return "\n";
        default:
          return childText;
      }
    }

    const raw = Array.from(temp.childNodes).map(processNode).join("");
    return raw
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  return html
    .replace(/<figure[^>]*class="[^"]*align-(left|right|center)[^"]*"[^>]*><img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>.*?<\/figure>/gi, "\n\n![$3|$1]($2)\n\n")
    .replace(/<figure[^>]*><img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>.*?<\/figure>/gi, "\n\n![$2|center]($1)\n\n")
    .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi, "\n\n![$2|center]($1)\n\n")
    .replace(/<h1>(.*?)<\/h1>/gi, "# $1\n\n")
    .replace(/<h2>(.*?)<\/h2>/gi, "## $1\n\n")
    .replace(/<h3>(.*?)<\/h3>/gi, "### $1\n\n")
    .replace(/<strong>(.*?)<\/strong>/gi, "**$1**")
    .replace(/<b>(.*?)<\/b>/gi, "**$1**")
    .replace(/<em>(.*?)<\/em>/gi, "*$1*")
    .replace(/<i>(.*?)<\/i>/gi, "*$1*")
    .replace(/<blockquote><p>(.*?)<\/p><\/blockquote>/gi, "> $1\n\n")
    .replace(/<blockquote>(.*?)<\/blockquote>/gi, "> $1\n\n")
    .replace(/<li>(.*?)<\/li>/gi, "- $1\n")
    .replace(/<ul>|<\/ul>|<ol>|<\/ol>/gi, "\n")
    .replace(/<p>(.*?)<\/p>/gi, "$1\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<a\s+(?:[^>]*?\s+)?href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function computeOpenStatus(schedule = [], timeZone = "Africa/Addis_Ababa") {
  if (!Array.isArray(schedule) || !schedule.length) {
    return { isOpen: true, text: "Open Now · Closes at 10:00 PM", statusClass: "open" };
  }

  const tz = timeZone || "Africa/Addis_Ababa";
  const now = new Date();
  let currentDayName = "Monday";
  let currentHour = 12;
  let currentMin = 0;

  try {
    const dtf = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "long",
      hour: "numeric",
      minute: "numeric",
      hour12: false
    });
    const parts = dtf.formatToParts(now);
    const getPart = (type) => parts.find((p) => p.type === type)?.value;
    currentDayName = getPart("weekday") || "Monday";
    currentHour = parseInt(getPart("hour"), 10) % 24;
    currentMin = parseInt(getPart("minute"), 10) || 0;
  } catch {
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    currentDayName = dayNames[now.getUTCDay()];
    currentHour = (now.getUTCHours() + 3) % 24;
    currentMin = now.getUTCMinutes();
  }

  const currentTimeVal = currentHour * 60 + currentMin;

  function parseTime(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  }

  function formatTime12h(timeStr) {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return `${h12}:${String(m || 0).padStart(2, "0")} ${period}`;
  }

  const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const todayIndex = dayOrder.indexOf(currentDayName);
  const todayConfig = schedule.find((d) => d.day === currentDayName);

  // Check if yesterday had late-night/overnight hours extending past midnight into today
  const yesterdayIndex = (todayIndex + 6) % 7;
  const yesterdayName = dayOrder[yesterdayIndex];
  const yesterdayConfig = schedule.find((d) => d.day === yesterdayName);

  if (yesterdayConfig && yesterdayConfig.isOpen) {
    const yOpen = parseTime(yesterdayConfig.open);
    const yClose = parseTime(yesterdayConfig.close);
    if (yClose < yOpen && currentTimeVal < yClose) {
      return {
        isOpen: true,
        text: `Open Now · Closes at ${formatTime12h(yesterdayConfig.close)}`,
        statusClass: "open"
      };
    }
  }

  // Next opening day & time helper
  function getNextOpeningText() {
    for (let offset = 1; offset <= 7; offset++) {
      const nextIdx = (todayIndex + offset) % 7;
      const nextDayName = dayOrder[nextIdx];
      const nextConfig = schedule.find((d) => d.day === nextDayName);
      if (nextConfig && nextConfig.isOpen) {
        const timeStr = formatTime12h(nextConfig.open);
        if (offset === 1) {
          return `Closed · Opens Tomorrow at ${timeStr}`;
        }
        return `Closed · Opens ${nextConfig.short || nextConfig.day} at ${timeStr}`;
      }
    }
    return "Temporarily Closed";
  }

  if (!todayConfig || !todayConfig.isOpen) {
    return {
      isOpen: false,
      text: getNextOpeningText(),
      statusClass: "closed"
    };
  }

  const openVal = parseTime(todayConfig.open);
  const closeVal = parseTime(todayConfig.close);

  // Standard same-day opening hours (e.g. 08:00 to 22:00)
  if (closeVal > openVal) {
    if (currentTimeVal >= openVal && currentTimeVal < closeVal) {
      return {
        isOpen: true,
        text: `Open Now · Closes at ${formatTime12h(todayConfig.close)}`,
        statusClass: "open"
      };
    }
    if (currentTimeVal < openVal) {
      return {
        isOpen: false,
        text: `Closed · Opens at ${formatTime12h(todayConfig.open)}`,
        statusClass: "closed"
      };
    }
    return {
      isOpen: false,
      text: getNextOpeningText(),
      statusClass: "closed"
    };
  }

  // Overnight hours (e.g. 18:00 to 02:00)
  if (closeVal < openVal) {
    if (currentTimeVal >= openVal) {
      return {
        isOpen: true,
        text: `Open Now · Closes at ${formatTime12h(todayConfig.close)}`,
        statusClass: "open"
      };
    }
    return {
      isOpen: false,
      text: `Closed · Opens at ${formatTime12h(todayConfig.open)}`,
      statusClass: "closed"
    };
  }

  // 24 hours open
  return {
    isOpen: true,
    text: "Open 24 Hours",
    statusClass: "open"
  };
}

export function generateHoursSummary(schedule = []) {
  if (!Array.isArray(schedule) || !schedule.length) return "Mon - Sun | 8:00 AM - 10:00 PM";
  const openDays = schedule.filter(d => d.isOpen);
  if (openDays.length === 0) return "Temporarily Closed";

  function formatTime12h(timeStr) {
    if (!timeStr) return "";
    const [h, m] = timeStr.split(":").map(Number);
    const period = h >= 12 ? "PM" : "AM";
    const hours12 = h % 12 || 12;
    return `${hours12}:${String(m || 0).padStart(2, "0")} ${period}`;
  }

  const allSame = openDays.length === 7 && openDays.every(d => d.open === openDays[0].open && d.close === openDays[0].close);
  if (allSame) {
    return `Mon - Sun | ${formatTime12h(openDays[0].open)} - ${formatTime12h(openDays[0].close)}`;
  }

  // Group consecutive days with identical open status and times
  const groups = [];
  let currentGroup = null;

  for (const day of schedule) {
    const key = day.isOpen ? `${day.open}-${day.close}` : "closed";
    if (currentGroup && currentGroup.key === key) {
      currentGroup.days.push(day);
    } else {
      currentGroup = { key, isOpen: day.isOpen, open: day.open, close: day.close, days: [day] };
      groups.push(currentGroup);
    }
  }

  const parts = groups
    .filter(g => g.isOpen)
    .map(g => {
      const dayRange = g.days.length === 1
        ? (g.days[0].short || g.days[0].day)
        : `${g.days[0].short || g.days[0].day} - ${g.days[g.days.length - 1].short || g.days[g.days.length - 1].day}`;
      return `${dayRange} | ${formatTime12h(g.open)} - ${formatTime12h(g.close)}`;
    });

  return parts.length ? parts.join(" · ") : "Weekly Hours Available";
}

