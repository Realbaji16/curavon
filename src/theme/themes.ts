export type ThemePreset = 'calm' | 'warm' | 'minimal';

export interface ThemeTokens {
  name: string;
  bg: string;
  bgGradient: string;
  surface: string;
  surfaceElevated: string;
  primary: string;
  primarySoft: string;
  accent: string;
  accentSoft: string;
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
}

export const themes: Record<ThemePreset, ThemeTokens> = {
  calm: {
    name: 'Calm Mode',
    bg: '#E8F4F1',
    bgGradient: 'linear-gradient(165deg, #E8F4F1 0%, #D4EDE8 45%, #C5E6DF 100%)',
    surface: '#FFFFFF',
    surfaceElevated: '#F5FAF9',
    primary: '#2A9D8F',
    primarySoft: '#B8E4DC',
    accent: '#52B788',
    accentSoft: '#D8F3DC',
    text: '#1B4332',
    textSecondary: '#40916C',
    textMuted: '#74A892',
    border: '#B7D9D0',
    success: '#52B788',
    warning: '#F4A261',
    danger: '#E76F51',
    tabBar: 'rgba(255,255,255,0.92)',
    cardGradient: 'linear-gradient(135deg, #FFFFFF 0%, #E8F6F3 100%)',
    heroGradient: 'linear-gradient(145deg, #2A9D8F 0%, #52B788 55%, #74C69D 100%)',
    shadow: '0 8px 32px rgba(42, 157, 143, 0.15)',
  },
  warm: {
    name: 'Warm Mode',
    bg: '#FFF5EE',
    bgGradient: 'linear-gradient(165deg, #FFF5EE 0%, #FFE8DC 45%, #FFDCC8 100%)',
    surface: '#FFFFFF',
    surfaceElevated: '#FFF9F5',
    primary: '#E07A5F',
    primarySoft: '#F4C4B0',
    accent: '#F2CC8F',
    accentSoft: '#FAECD8',
    text: '#3D2C29',
    textSecondary: '#C06040',
    textMuted: '#A08070',
    border: '#F0D0C0',
    success: '#81B29A',
    warning: '#F2CC8F',
    danger: '#E63946',
    tabBar: 'rgba(255,255,255,0.92)',
    cardGradient: 'linear-gradient(135deg, #FFFFFF 0%, #FFF0E8 100%)',
    heroGradient: 'linear-gradient(145deg, #E07A5F 0%, #F4845F 55%, #F2A679 100%)',
    shadow: '0 8px 32px rgba(224, 122, 95, 0.18)',
  },
  minimal: {
    name: 'Minimal',
    bg: '#F8F9FA',
    bgGradient: 'linear-gradient(165deg, #F8F9FA 0%, #F1F3F5 100%)',
    surface: '#FFFFFF',
    surfaceElevated: '#FAFBFC',
    primary: '#495057',
    primarySoft: '#DEE2E6',
    accent: '#868E96',
    accentSoft: '#E9ECEF',
    text: '#212529',
    textSecondary: '#495057',
    textMuted: '#868E96',
    border: '#DEE2E6',
    success: '#51CF66',
    warning: '#FFD43B',
    danger: '#FF6B6B',
    tabBar: 'rgba(255,255,255,0.95)',
    cardGradient: 'linear-gradient(135deg, #FFFFFF 0%, #F8F9FA 100%)',
    heroGradient: 'linear-gradient(145deg, #495057 0%, #6C757D 100%)',
    shadow: '0 4px 20px rgba(0, 0, 0, 0.06)',
  },
};
