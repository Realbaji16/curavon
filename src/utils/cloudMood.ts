import type { TabId } from '../context/AppContext';

export type CloudMood = 'onboarding' | 'today' | 'ask' | 'flow' | 'learn' | 'profile' | 'safety';

const TAB_MOOD: Record<TabId, CloudMood> = {
  home: 'today',
  ask: 'ask',
  circle: 'learn',
  flow: 'learn', // legacy alias — same mood as Guides
  settings: 'profile',
};

export function moodForTab(tab: TabId): CloudMood {
  return TAB_MOOD[tab];
}
