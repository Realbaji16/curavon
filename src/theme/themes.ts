export type ThemePreset = 'sky' | 'mist' | 'dawn';

export interface ThemeTokens {
  name: string;
  bg: string;
  bgGradient: string;
  surface: string;
  surfaceElevated: string;
  glass: string;
  glassBorder: string;
  primary: string;
  primarySoft: string;
  accent: string;
  accentSoft: string;
  teal: string;
  tealSoft: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  success: string;
  warning: string;
  danger: string;
  tabBar: string;
  cardGradient: string;
  heroGradient: string;
  shadow: string;
  shadowSoft: string;
}

export const themes: Record<ThemePreset, ThemeTokens> = {
  sky: {
    name: 'Sky',
    bg: '#EAF4FC',
    bgGradient:
      'linear-gradient(180deg, #E8F4FC 0%, #EDE8F8 42%, #FFF6EE 100%)',
    surface: '#FFFFFF',
    surfaceElevated: 'rgba(255, 255, 255, 0.92)',
    glass: 'rgba(255, 255, 255, 0.72)',
    glassBorder: 'rgba(255, 255, 255, 0.85)',
    primary: '#E8876F',
    primarySoft: 'rgba(232, 135, 111, 0.18)',
    accent: '#8B9CF7',
    accentSoft: 'rgba(139, 156, 247, 0.16)',
    teal: '#5FBFA8',
    tealSoft: 'rgba(95, 191, 168, 0.18)',
    text: '#1E2A3B',
    textSecondary: '#4A5D78',
    textMuted: '#7A8FA8',
    border: 'rgba(30, 42, 59, 0.08)',
    success: '#5FBFA8',
    warning: '#E8A84C',
    danger: '#D65A5A',
    tabBar: 'rgba(255, 255, 255, 0.78)',
    cardGradient:
      'linear-gradient(145deg, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0.62) 100%)',
    heroGradient:
      'linear-gradient(145deg, #F0927E 0%, #F0B088 38%, #6EC4AE 100%)',
    shadow: '0 12px 40px rgba(30, 60, 100, 0.12)',
    shadowSoft: '0 4px 20px rgba(30, 60, 100, 0.06)',
  },
  mist: {
    name: 'Mist',
    bg: '#EEF0FA',
    bgGradient:
      'linear-gradient(180deg, #EBEFFA 0%, #E8E4F6 50%, #F5F0FF 100%)',
    surface: '#FFFFFF',
    surfaceElevated: 'rgba(255, 255, 255, 0.94)',
    glass: 'rgba(255, 255, 255, 0.76)',
    glassBorder: 'rgba(255, 255, 255, 0.9)',
    primary: '#9B8CF0',
    primarySoft: 'rgba(155, 140, 240, 0.18)',
    accent: '#7EB8E8',
    accentSoft: 'rgba(126, 184, 232, 0.16)',
    teal: '#6BBFA8',
    tealSoft: 'rgba(107, 191, 168, 0.18)',
    text: '#1E2640',
    textSecondary: '#4A5078',
    textMuted: '#7A82A8',
    border: 'rgba(30, 38, 64, 0.08)',
    success: '#6BBFA8',
    warning: '#E0A860',
    danger: '#D06068',
    tabBar: 'rgba(255, 255, 255, 0.82)',
    cardGradient:
      'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(248,246,255,0.65) 100%)',
    heroGradient:
      'linear-gradient(145deg, #A898F0 0%, #8EC8F0 45%, #7EC8B0 100%)',
    shadow: '0 12px 40px rgba(60, 50, 120, 0.1)',
    shadowSoft: '0 4px 20px rgba(60, 50, 120, 0.05)',
  },
  dawn: {
    name: 'Dawn',
    bg: '#FFF4EC',
    bgGradient:
      'linear-gradient(180deg, #FFF0E8 0%, #FFE8DC 40%, #EAF6FC 100%)',
    surface: '#FFFFFF',
    surfaceElevated: 'rgba(255, 255, 255, 0.93)',
    glass: 'rgba(255, 255, 255, 0.74)',
    glassBorder: 'rgba(255, 255, 255, 0.88)',
    primary: '#F07858',
    primarySoft: 'rgba(240, 120, 88, 0.2)',
    accent: '#F0A878',
    accentSoft: 'rgba(240, 168, 120, 0.2)',
    teal: '#58B8A0',
    tealSoft: 'rgba(88, 184, 160, 0.18)',
    text: '#2A2438',
    textSecondary: '#5A5068',
    textMuted: '#908898',
    border: 'rgba(42, 36, 56, 0.08)',
    success: '#58B8A0',
    warning: '#E89848',
    danger: '#D85858',
    tabBar: 'rgba(255, 255, 255, 0.8)',
    cardGradient:
      'linear-gradient(145deg, rgba(255,255,255,0.9) 0%, rgba(255,248,240,0.68) 100%)',
    heroGradient:
      'linear-gradient(145deg, #F88868 0%, #F8B878 40%, #68C8A8 100%)',
    shadow: '0 12px 40px rgba(180, 90, 60, 0.12)',
    shadowSoft: '0 4px 20px rgba(180, 90, 60, 0.06)',
  },
};
