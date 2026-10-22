export const CheckIcon = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 8.5l3 3 7-7" /></svg>
);

export const DrumIcon = ({ size = 13, spin = false }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    <rect x="2" y="1.5" width="12" height="13" rx="3" />
    <circle cx="8" cy="9" r="3.4" />
    {spin && (
      <g data-motion="" style={{ transformOrigin: '8px 9px', animation: 'hl-spin 2.4s linear infinite' }}>
        <circle cx="8" cy="6.6" r="1" fill="currentColor" stroke="none" />
      </g>
    )}
  </svg>
);

export const WrenchIcon = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

export const LogoIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    <rect x="2" y="1.5" width="12" height="13" rx="3" />
    <circle cx="8" cy="9" r="3.4" />
    <circle cx="4.6" cy="4.3" r=".6" fill="currentColor" />
  </svg>
);

export const ClockIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);

export const HourglassIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 3h12M6 21h12M8 3v2.5c0 2 4 4 4 6.5 0 2.5-4 4.5-4 6.5V21M16 3v2.5c0 2-4 4-4 6.5 0 2.5 4 4.5 4 6.5V21" />
  </svg>
);

export const BellIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
  </svg>
);

export const Chevrons = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#23224A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 6l6 6-6 6M13 6l6 6-6 6" /></svg>
);
