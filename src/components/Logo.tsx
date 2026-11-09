// Brand mark: a car in profile on a rounded tile. Shared by the header, footer and favicon (src/app/icon.svg).
export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-label="Brand X" className="shrink-0">
      <defs>
        <linearGradient id="logo-tile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1b1d22" />
          <stop offset="1" stopColor="#0e6f78" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#logo-tile)" />
      <path d="M6.5 21.5v-1.8c0-1.3.9-2.2 2.2-2.5l3.1-.7 2.1-3.2c.5-.8 1.3-1.2 2.2-1.2h3.4c.9 0 1.7.4 2.3 1.1l2.2 2.7 1.7.5c1 .3 1.8 1.2 1.8 2.3v2.8" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10.5 21.5h11" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="10.2" cy="22.2" r="2.4" fill="#14161a" stroke="#fff" strokeWidth="1.5" />
      <circle cx="22.2" cy="22.2" r="2.4" fill="#14161a" stroke="#fff" strokeWidth="1.5" />
      <path d="M20 8.2c1.4.2 2.7.9 3.6 2" fill="none" stroke="#7fd3da" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
