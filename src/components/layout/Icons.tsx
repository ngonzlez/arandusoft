// Íconos SVG inline (estilo del prototipo: stroke 1.8, lineal)

const P = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const ICONS: Record<string, React.ReactNode> = {
  home: (
    <svg {...P}>
      <path d="M3 10.5L12 3l9 7.5" />
      <path d="M5 9.5V21h14V9.5" />
    </svg>
  ),
  users: (
    <svg {...P}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.8-3.2 3.4-5 6.5-5s5.7 1.8 6.5 5" />
      <path d="M16 4.6a3.5 3.5 0 010 6.8M18.5 15.2c1.6.7 2.7 2 3 4.3" />
    </svg>
  ),
  check: (
    <svg {...P}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
      <path d="M8 12.5l2.8 2.8L16.5 9" />
    </svg>
  ),
  calendar: (
    <svg {...P}>
      <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
      <path d="M3.5 10h17M8 2.8V6.5M16 2.8V6.5" />
    </svg>
  ),
  flag: (
    <svg {...P}>
      <path d="M5 21V4" />
      <path d="M5 4.5c4-2 7 2 12 0v9c-5 2-8-2-12 0" />
    </svg>
  ),
  clipboard: (
    <svg {...P}>
      <rect x="5" y="4" width="14" height="17" rx="2.5" />
      <path d="M9 4.2V3a1 1 0 011-1h4a1 1 0 011 1v1.2M9 10h6M9 14h6M9 18h3" />
    </svg>
  ),
  folder: (
    <svg {...P}>
      <path d="M3.5 6.5A2.5 2.5 0 016 4h4l2 2.5h6A2.5 2.5 0 0120.5 9v8.5A2.5 2.5 0 0118 20H6a2.5 2.5 0 01-2.5-2.5v-11z" />
    </svg>
  ),
  bell: (
    <svg {...P}>
      <path d="M18 9a6 6 0 10-12 0c0 5-2 6-2 6h16s-2-1-2-6" />
      <path d="M10 19a2 2 0 004 0" />
    </svg>
  ),
  chart: (
    <svg {...P}>
      <path d="M4 20V10M10 20V4M16 20v-7M21 20H3" />
    </svg>
  ),
  briefcase: (
    <svg {...P}>
      <rect x="3.5" y="7.5" width="17" height="13" rx="2.5" />
      <path d="M9 7.5V6a2 2 0 012-2h2a2 2 0 012 2v1.5M3.5 13h17" />
    </svg>
  ),
  logout: (
    <svg {...P}>
      <path d="M15 4H7a2 2 0 00-2 2v12a2 2 0 002 2h8" />
      <path d="M19 12H10M16 8.5L19.5 12 16 15.5" />
    </svg>
  ),
  search: (
    <svg {...P}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4-4" />
    </svg>
  ),
};
