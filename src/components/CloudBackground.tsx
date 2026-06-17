import type { TabId } from '../context/AppContext';
import type { ThemePreset } from '../theme/themes';
import { StarField } from './StarField';

export type CloudMood = 'onboarding' | 'today' | 'ask' | 'flow' | 'learn' | 'profile' | 'safety';

const TAB_MOOD: Record<TabId, CloudMood> = {
  home: 'today',
  ask: 'ask',
  flow: 'flow',
  circle: 'learn',
  settings: 'profile',
};

export function moodForTab(tab: TabId): CloudMood {
  return TAB_MOOD[tab];
}

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

  return (
    <div
      className={`cloud-background cloud-bg cloud-bg--${mood} ${isNight ? 'cloud-bg--night' : 'cloud-bg--day'}`}
      aria-hidden="true"
    >
      <div className="cloud-sky-base" />
      <div className="cloud-sky-glow" />
      <div className="cloud-sky-glow-warm" />
      <div className="cloud-sky-lavender" />
      <div className="cloud-sky-haze" />

      {isNight ? (
        <>
          <StarField />
          <div className="cloud-layer cloud-layer--night">
            <div className="cloud-blob cloud-blob--night-1 floating-cloud" />
            <div className="cloud-blob cloud-blob--night-2 floating-cloud" />
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
