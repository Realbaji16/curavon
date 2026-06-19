import type { ThemePreset } from '../theme/themes';
import type { CloudMood } from '../utils/cloudMood';
import { StarField } from './StarField';

interface CloudBackgroundProps {
  mood?: CloudMood;
  theme?: ThemePreset;
}

/**
 * Soft Medical Sky — layered atmospheric clouds (CSS only).
 * Stack: sky base → glow accents → lavender mist → far → mid → near banks.
 */
export function CloudBackground({ mood = 'today', theme = 'sky' }: CloudBackgroundProps) {
  const isNight = theme === 'night';
  const themeClass = isNight ? 'cloud-bg--night' : `cloud-bg--day cloud-bg--theme-${theme}`;

  return (
    <div
      className={`cloud-background cloud-bg cloud-bg--${mood} ${themeClass}`}
      aria-hidden="true"
    >
      <div className="cloud-sky-base" />
      <div className="cloud-sky-glow" />
      <div className="cloud-sky-glow-warm" />
      <div className="cloud-sky-lavender" />
      <div className="cloud-sky-haze" />

      {isNight ? (
        <>
          <div className="cloud-sky-night-aurora" aria-hidden="true" />
          <StarField />
          <div className="cloud-layer cloud-layer--night">
            <div className="cloud-blob cloud-blob--night-1 floating-cloud" />
            <div className="cloud-blob cloud-blob--night-2 floating-cloud" />
            <div className="cloud-blob cloud-blob--night-3 floating-cloud" />
          </div>
        </>
      ) : (
        <>
          {/* Far — upper faint + lavender mist */}
          <div className="cloud-layer cloud-layer--far">
            <div className="cloud-blob cloud-blob--upper-faint floating-cloud" />
            <div className="cloud-blob cloud-blob--lavender-mist floating-cloud" />
            <div className="cloud-blob cloud-blob--far-accent floating-cloud" />
          </div>

          {/* Mid — side edges + card-offset cloud (calmer over text) */}
          <div className="cloud-layer cloud-layer--mid">
            <div className="cloud-blob cloud-blob--left-edge floating-cloud" />
            <div className="cloud-blob cloud-blob--right-edge floating-cloud" />
            <div className="cloud-blob cloud-blob--behind-card floating-cloud" />
          </div>

          {/* Near — lower bank + warm cream glow */}
          <div className="cloud-layer cloud-layer--near">
            <div className="cloud-blob cloud-blob--lower-bank floating-cloud" />
            <div className="cloud-blob cloud-blob--bank-left floating-cloud" />
            <div className="cloud-blob cloud-blob--bank-right floating-cloud" />
            <div className="cloud-blob cloud-blob--cream-glow floating-cloud" />
          </div>
        </>
      )}
    </div>
  );
}
