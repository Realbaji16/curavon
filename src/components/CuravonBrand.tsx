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
  const outerGradientId = useId();
  const forwardGradientId = useId();

  return (
    <span className={`curavon-icon ${compact ? 'curavon-icon--compact' : ''} ${className}`.trim()} style={iconStyle}>
      <span className="curavon-icon-badge" aria-hidden="true">
        <svg
          className="curavon-icon-svg"
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          role="img"
          aria-label="Curavon icon"
        >
          <defs>
            <linearGradient id={outerGradientId} x1="16" y1="12" x2="54" y2="52" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#2E8B87" />
              <stop offset="58%" stopColor="#3EBFA3" />
              <stop offset="100%" stopColor="#8EDCCB" />
            </linearGradient>
            <linearGradient id={forwardGradientId} x1="44" y1="28" x2="53" y2="35" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#3EBFA3" />
              <stop offset="100%" stopColor="#8EDCCB" />
            </linearGradient>
          </defs>
          <g className="curavon-icon-mark">
            <path
              d="M48.9 45.1C45.5 48.4 40.8 50.4 35.8 50.4C26.3 50.4 18.6 42.7 18.6 33.2C18.6 23.7 26.3 16 35.8 16C40.9 16 45.6 18.1 49 21.5"
              stroke={`url(#${outerGradientId})`}
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M49 16.2H55V22.2"
              stroke={`url(#${outerGradientId})`}
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M23.8 39C26.1 36.4 29.3 34.9 32.9 34.9C36.4 34.9 39.7 36.4 41.9 39"
              stroke="#2F7E8A"
              strokeWidth="2.85"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M21.4 43C24.5 40.6 28.4 39.2 32.9 39.2C37.4 39.2 41.3 40.6 44.4 43"
              stroke="#2E7874"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M33.8 24.1C33.8 22.9 34.7 22 35.9 22C36.8 22 37.5 22.4 38 23.2C38.5 22.4 39.2 22 40.1 22C41.3 22 42.2 22.9 42.2 24.1C42.2 26 40.6 27.3 38 29.4C35.5 27.3 33.8 26 33.8 24.1Z"
              stroke="#FF8A64"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M38 29.3V32.9"
              stroke="#F4A37A"
              strokeWidth="2.25"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M43.9 30.7C46.2 31 48.2 32.2 49.8 34.2"
              stroke={`url(#${forwardGradientId})`}
              strokeWidth="2.45"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="51.1" cy="35.5" r="2.1" fill={`url(#${forwardGradientId})`} />
          </g>
        </svg>
      </span>
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
