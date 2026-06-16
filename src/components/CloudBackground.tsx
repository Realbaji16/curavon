import type { TabId } from '../context/AppContext';

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
}

/** Decorative sky clouds — CSS-only layers, mood tints, reduced-motion safe. */
export function CloudBackground({ mood = 'today' }: CloudBackgroundProps) {
  return (
    <div className={`cloud-bg cloud-bg--${mood}`} aria-hidden="true">
      <div className="cloud-sky-base" />
      <div className="cloud-blob cloud-blob--1" />
      <div className="cloud-blob cloud-blob--2" />
      <div className="cloud-blob cloud-blob--3" />
      <div className="cloud-blob cloud-blob--4" />
      <div className="cloud-blob cloud-blob--5" />
      <div className="cloud-blob cloud-blob--6" />
      <div className="cloud-wisp cloud-wisp--1" />
      <div className="cloud-wisp cloud-wisp--2" />
      <div className="cloud-wisp cloud-wisp--3" />
    </div>
  );
}
