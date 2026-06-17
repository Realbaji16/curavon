import type { ThemePreset } from './themes';
import { themes } from './themes';

const SKY_PALETTES: Record<
  ThemePreset,
  { top: string; mid: string; bottom: string; teal: string; tealDeep: string }
> = {
  sky: {
    top: '#c5d9eb',
    mid: '#dcc8d4',
    bottom: '#f0c8a8',
    teal: '#2bb3a3',
    tealDeep: '#157b70',
  },
  mist: {
    top: '#dce8f6',
    mid: '#e4ddf0',
    bottom: '#ece8f8',
    teal: '#3a8f86',
    tealDeep: '#1f7a72',
  },
  dawn: {
    top: '#c8dce8',
    mid: '#ecd0c4',
    bottom: '#f8d0a8',
    teal: '#2bb3a3',
    tealDeep: '#157b70',
  },
  night: {
    top: '#050814',
    mid: '#0e1834',
    bottom: '#1a2854',
    teal: '#5ec4a8',
    tealDeep: '#2a8f7f',
  },
};

function getSurfaceVars(theme: ThemePreset) {
  switch (theme) {
    case 'mist':
      return {
        '--glass-card-top': 'rgba(255, 255, 255, 0.48)',
        '--glass-card-bottom': 'rgba(228, 221, 240, 0.34)',
        '--glass-card-highlight': 'rgba(236, 232, 248, 0.58)',
        '--action-btn-done-text': '#1f7a72',
        '--action-btn-done-bg':
          'linear-gradient(rgba(228, 240, 248, 0.95), rgba(228, 240, 248, 0.95))',
        '--action-btn-done-border': 'rgba(139, 127, 212, 0.28)',
        '--action-btn-blocked-text': '#9e4840',
        '--action-btn-blocked-bg':
          'linear-gradient(rgba(255, 228, 222, 0.96), rgba(255, 228, 222, 0.96))',
        '--action-btn-blocked-border': 'rgba(196, 106, 90, 0.34)',
        '--action-btn-adjust-text': '#9a5e18',
        '--action-btn-adjust-bg':
          'linear-gradient(rgba(255, 241, 218, 0.96), rgba(255, 241, 218, 0.96))',
        '--action-btn-adjust-border': 'rgba(217, 151, 74, 0.34)',
        '--pill-teal-bg': 'rgba(139, 127, 212, 0.14)',
      };
    case 'dawn':
      return {
        '--glass-card-top': 'rgba(255, 255, 255, 0.48)',
        '--glass-card-bottom': 'rgba(255, 236, 216, 0.34)',
        '--glass-card-highlight': 'rgba(255, 245, 232, 0.58)',
        '--action-btn-done-text': '#157b70',
        '--action-btn-done-bg':
          'linear-gradient(rgba(234, 246, 243, 0.95), rgba(234, 246, 243, 0.95))',
        '--action-btn-done-border': 'rgba(43, 179, 163, 0.3)',
        '--action-btn-blocked-text': '#a44a40',
        '--action-btn-blocked-bg':
          'linear-gradient(rgba(255, 224, 216, 0.96), rgba(255, 224, 216, 0.96))',
        '--action-btn-blocked-border': 'rgba(210, 100, 82, 0.36)',
        '--action-btn-adjust-text': '#a86218',
        '--action-btn-adjust-bg':
          'linear-gradient(rgba(255, 236, 208, 0.96), rgba(255, 236, 208, 0.96))',
        '--action-btn-adjust-border': 'rgba(224, 140, 58, 0.36)',
        '--pill-teal-bg': 'rgba(224, 122, 82, 0.12)',
      };
    case 'night':
      return {
        '--glass-card-top': 'rgba(44, 54, 84, 0.78)',
        '--glass-card-bottom': 'rgba(22, 30, 54, 0.62)',
        '--glass-card-highlight': 'rgba(255, 255, 255, 0.12)',
        '--action-btn-done-text': '#ffffff',
        '--action-btn-done-bg':
          'linear-gradient(135deg, #3a9b8a 0%, #1a6b62 100%)',
        '--action-btn-done-border': 'rgba(94, 196, 168, 0.48)',
        '--action-btn-blocked-text': '#f5b8b0',
        '--action-btn-blocked-bg':
          'linear-gradient(135deg, rgba(168, 72, 66, 0.72) 0%, rgba(128, 48, 44, 0.82) 100%)',
        '--action-btn-blocked-border': 'rgba(220, 120, 110, 0.42)',
        '--action-btn-adjust-text': '#ffd49a',
        '--action-btn-adjust-bg':
          'linear-gradient(135deg, rgba(176, 118, 48, 0.72) 0%, rgba(138, 88, 28, 0.82) 100%)',
        '--action-btn-adjust-border': 'rgba(232, 168, 88, 0.4)',
        '--pill-teal-bg': 'rgba(94, 196, 168, 0.2)',
        '--brand-teal-border': 'rgba(94, 196, 168, 0.32)',
      };
    default:
      return {
        '--glass-card-top': 'rgba(255, 255, 255, 0.44)',
        '--glass-card-bottom': 'rgba(255, 255, 255, 0.28)',
        '--glass-card-highlight': 'rgba(255, 255, 255, 0.5)',
        '--action-btn-done-text': '#157b70',
        '--action-btn-done-bg':
          'linear-gradient(rgba(234, 246, 243, 0.95), rgba(234, 246, 243, 0.95))',
        '--action-btn-done-border': 'rgba(43, 179, 163, 0.28)',
        '--action-btn-blocked-text': '#9e4840',
        '--action-btn-blocked-bg':
          'linear-gradient(rgba(255, 228, 222, 0.96), rgba(255, 228, 222, 0.96))',
        '--action-btn-blocked-border': 'rgba(196, 106, 90, 0.34)',
        '--action-btn-adjust-text': '#9a5e18',
        '--action-btn-adjust-bg':
          'linear-gradient(rgba(255, 241, 218, 0.96), rgba(255, 241, 218, 0.96))',
        '--action-btn-adjust-border': 'rgba(217, 151, 74, 0.34)',
        '--pill-teal-bg': 'rgba(58, 155, 138, 0.14)',
      };
  }
}

export function getThemeCssVars(theme: ThemePreset): Record<string, string> {
  const tokens = themes[theme];
  const sky = SKY_PALETTES[theme];
  const surfaces = getSurfaceVars(theme);

  return {
    '--theme-text': tokens.text,
    '--theme-text-secondary': tokens.textSecondary,
    '--theme-text-muted': tokens.textMuted,
    '--theme-primary': tokens.primary,
    '--theme-primary-soft': tokens.primarySoft,
    '--theme-accent': tokens.accent,
    '--theme-teal': tokens.teal,
    '--theme-glass': tokens.glass,
    '--theme-glass-border': tokens.glassBorder,
    '--theme-border': tokens.border,
    '--theme-tab-bar': tokens.tabBar,
    '--ink': tokens.text,
    '--muted-ink': tokens.textSecondary,
    '--text-primary': tokens.text,
    '--text-muted': tokens.textSecondary,
    '--text-soft': tokens.textMuted,
    '--text-heading': tokens.text,
    '--text-title': tokens.text,
    '--text-subtitle': tokens.textSecondary,
    '--text-body': tokens.textSecondary,
    '--text-safety': tokens.textMuted,
    '--text-label-warm': tokens.primary,
    '--text-label-teal': tokens.teal,
    '--brand-teal': sky.teal,
    '--brand-teal-deep': sky.tealDeep,
    '--brand-teal-soft':
      theme === 'night'
        ? 'rgba(94, 196, 168, 0.16)'
        : theme === 'mist'
          ? 'color-mix(in srgb, #e4ddf0 42%, #eaf6f3 58%)'
          : theme === 'dawn'
            ? 'color-mix(in srgb, #f8d0a8 28%, #eaf6f3 72%)'
            : 'color-mix(in srgb, var(--sky-bottom) 30%, #eaf6f3 70%)',
    '--sky-top': sky.top,
    '--sky-mid': sky.mid,
    '--sky-bottom': sky.bottom,
    '--glass-border':
      theme === 'night' ? 'rgba(255, 255, 255, 0.18)' : tokens.glassBorder,
    '--glass-fill': tokens.glass,
    '--theme-panel-bg':
      theme === 'night' ? 'rgba(24, 32, 52, 0.94)' : 'rgba(255, 255, 255, 0.92)',
    '--theme-panel-text': tokens.text,
    '--theme-panel-muted': tokens.textSecondary,
    ...(theme === 'night'
      ? {
          '--glass-shadow':
            '0 24px 56px rgba(0, 0, 0, 0.38), 0 8px 22px rgba(0, 0, 0, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.14)',
        }
      : {}),
    ...surfaces,
  } as Record<string, string>;
}
