import { useId, type CSSProperties } from 'react';

interface CuravonWordmarkProps {
  className?: string;
}

interface CuravonIconProps {
  size?: number;
  className?: string;
  compact?: boolean;
}

interface CuravonBrandLockupProps {
  className?: string;
  iconSize?: number;
  compact?: boolean;
}

function CuravonIconGraphic() {
  const badgeGradientId = useId();
  const highlightGradientId = useId();
  const shadowFilterId = useId();
  const tealGradientId = useId();
  const ringPath = 'M60 20.5A30 30 0 1 0 79.4 54.2';

  return (
    <>
      <defs>
        <linearGradient id={badgeGradientId} x1="8" y1="92" x2="92" y2="8" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFF6EE" stopOpacity="0.95" />
          <stop offset="52%" stopColor="#F8FCFA" stopOpacity="0.92" />
          <stop offset="100%" stopColor="#EAF7F4" stopOpacity="0.9" />
        </linearGradient>
        <linearGradient id={highlightGradientId} x1="12" y1="16" x2="88" y2="84" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.72" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={tealGradientId} x1="20" y1="20" x2="80" y2="80" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#2F7E8A" />
          <stop offset="55%" stopColor="#3EBFA3" />
          <stop offset="100%" stopColor="#8EDCCB" />
        </linearGradient>
        <filter id={shadowFilterId} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#2F7E8A" floodOpacity="0.14" />
        </filter>
      </defs>
      <g filter={`url(#${shadowFilterId})`}>
        <rect
          x="8"
          y="8"
          width="84"
          height="84"
          rx="24"
          fill={`url(#${badgeGradientId})`}
          stroke="rgba(142, 220, 203, 0.45)"
          strokeWidth="1.5"
        />
        <rect
          x="12"
          y="12"
          width="76"
          height="76"
          rx="20"
          fill={`url(#${highlightGradientId})`}
        />
      </g>
      <path
        className="curavon-icon-ring"
        d={ringPath}
        fill="none"
        stroke={`url(#${tealGradientId})`}
        strokeWidth="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        className="curavon-icon-ring-highlight"
        d={ringPath}
        fill="none"
        stroke="rgba(255, 255, 255, 0.24)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle className="curavon-icon-care-seed" cx="50" cy="42" r="4" fill="var(--care-seed)" />
      <path
        className="curavon-icon-pulse"
        d="M34 55 C40 55 42 55 45 50 C48 45 51 65 55 58 C58 53 62 55 67 55"
        fill="none"
        stroke="#2F7E8A"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g className="curavon-icon-arrow" transform="translate(86 28) rotate(22) scale(-0.78 0.78)">
        <path
          d="M0 0L0 20L7 15L10 24L12 22L9 14L17 14Z"
          fill={`url(#${tealGradientId})`}
          stroke={`url(#${tealGradientId})`}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </g>
    </>
  );
}

export function CuravonWordmark({ className = '' }: CuravonWordmarkProps) {
  return (
    <span className={`curavon-wordmark ${className}`.trim()} aria-label="Curavon">
      <span className="curavon-wordmark-cura">Cura</span>
      <span className="curavon-wordmark-von">von</span>
    </span>
  );
}

export function CuravonIcon({ size = 36, className = '', compact = false }: CuravonIconProps) {
  const iconStyle = { ['--curavon-icon-size' as string]: `${size}px` } as CSSProperties;

  return (
    <span className={`curavon-icon ${compact ? 'curavon-icon--compact' : ''} ${className}`.trim()} style={iconStyle}>
      <svg
        className="curavon-icon-svg"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="Curavon app icon"
      >
        <CuravonIconGraphic />
      </svg>
    </span>
  );
}

export function CuravonBrandLockup({
  className = '',
  iconSize = 36,
  compact = false,
}: CuravonBrandLockupProps) {
  return (
    <span className={`curavon-brand-lockup ${compact ? 'curavon-brand-lockup--compact' : ''} ${className}`.trim()}>
      <CuravonIcon size={iconSize} compact={compact} />
      <CuravonWordmark />
    </span>
  );
}
