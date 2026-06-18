export type ThemePreset = 'sky' | 'mist' | 'dawn' | 'night';



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



const BTN_SHADOW =

  '0 16px 34px rgba(255, 138, 100, 0.22), 0 8px 18px rgba(78, 190, 168, 0.12)';



const HERO_GRADIENT =

  'linear-gradient(135deg, #FF956F 0%, #F4BC82 58%, #9AE0D4 100%)';



const CARD_GLASS =

  'linear-gradient(148deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.18) 100%)';



/** Default: bright soft medical sky — deep navy text, coral/mint actions */

export const themes: Record<ThemePreset, ThemeTokens> = {

  sky: {

    name: 'Sky',

    bg: '#D8EFFA',

    bgGradient:

      'linear-gradient(180deg, #D8EFFA 0%, #E8E4F6 46%, #FAF3E8 100%)',

    surface: '#FFFFFF',

    surfaceElevated: 'rgba(255, 255, 255, 0.32)',

    glass: 'rgba(255, 255, 255, 0.28)',

    glassBorder: 'rgba(255, 255, 255, 0.72)',

    primary: '#D96F5A',

    primarySoft: 'rgba(255, 138, 100, 0.12)',

    accent: '#F6B36D',

    accentSoft: 'rgba(246, 179, 109, 0.16)',

    teal: '#3A8F86',

    tealSoft: 'rgba(94, 196, 168, 0.16)',

    text: '#223044',

    textSecondary: '#526577',

    textMuted: '#6F8191',

    border: 'rgba(37, 54, 74, 0.08)',

    success: '#3A8F86',

    warning: '#D4A04A',

    danger: '#C85A5A',

    tabBar: 'rgba(255, 255, 255, 0.45)',

    cardGradient: CARD_GLASS,

    heroGradient: HERO_GRADIENT,

    shadow: BTN_SHADOW,

    shadowSoft: '0 8px 24px rgba(53, 78, 110, 0.1)',

  },

  mist: {

    name: 'Mist',

    bg: '#EEF0FA',

    bgGradient:

      'linear-gradient(180deg, #E4EFFA 0%, #E8E4F6 50%, #F5F0FF 100%)',

    surface: '#FFFFFF',

    surfaceElevated: 'rgba(255, 255, 255, 0.32)',

    glass: 'rgba(255, 255, 255, 0.28)',

    glassBorder: 'rgba(255, 255, 255, 0.72)',

    primary: '#8B7FD4',

    primarySoft: 'rgba(139, 127, 212, 0.16)',

    accent: '#9B8CF0',

    accentSoft: 'rgba(155, 140, 240, 0.14)',

    teal: '#3A8F86',

    tealSoft: 'rgba(94, 196, 168, 0.16)',

    text: '#223044',

    textSecondary: '#526577',

    textMuted: '#6F8191',

    border: 'rgba(37, 54, 74, 0.08)',

    success: '#3A8F86',

    warning: '#D4A04A',

    danger: '#C06068',

    tabBar: 'rgba(255, 255, 255, 0.45)',

    cardGradient: CARD_GLASS,

    heroGradient: HERO_GRADIENT,

    shadow: BTN_SHADOW,

    shadowSoft: '0 8px 24px rgba(53, 78, 110, 0.1)',

  },

  dawn: {

    name: 'Dawn',

    bg: '#FFF4EC',

    bgGradient:

      'linear-gradient(180deg, #D8EFFA 0%, #F0E8F4 40%, #FAF3E8 100%)',

    surface: '#FFFFFF',

    surfaceElevated: 'rgba(255, 255, 255, 0.32)',

    glass: 'rgba(255, 255, 255, 0.28)',

    glassBorder: 'rgba(255, 255, 255, 0.72)',

    primary: '#E07A52',

    primarySoft: 'rgba(224, 122, 82, 0.16)',

    accent: '#F6B36D',

    accentSoft: 'rgba(246, 179, 109, 0.18)',

    teal: '#3A8F86',

    tealSoft: 'rgba(94, 196, 168, 0.16)',

    text: '#223044',

    textSecondary: '#526577',

    textMuted: '#6F8191',

    border: 'rgba(37, 54, 74, 0.08)',

    success: '#3A8F86',

    warning: '#D4A04A',

    danger: '#C85858',

    tabBar: 'rgba(255, 255, 255, 0.45)',

    cardGradient: CARD_GLASS,

    heroGradient: HERO_GRADIENT,

    shadow: BTN_SHADOW,

    shadowSoft: '0 8px 24px rgba(53, 78, 110, 0.1)',

  },

  night: {

    name: 'Night',

    bg: '#0F1528',

    bgGradient:

      'linear-gradient(180deg, #0B1020 0%, #121830 45%, #1A2040 100%)',

    surface: 'rgba(28, 36, 58, 0.92)',

    surfaceElevated: 'rgba(36, 44, 68, 0.48)',

    glass: 'rgba(28, 36, 58, 0.4)',

    glassBorder: 'rgba(255, 255, 255, 0.14)',

    primary: '#F6B36D',

    primarySoft: 'rgba(246, 179, 109, 0.2)',

    accent: '#8B9CF7',

    accentSoft: 'rgba(139, 156, 247, 0.2)',

    teal: '#5EC4A8',

    tealSoft: 'rgba(94, 196, 168, 0.2)',

    text: '#EEF2FA',

    textSecondary: '#DEE7F8',

    textMuted: '#CEDAF0',

    border: 'rgba(255, 255, 255, 0.1)',

    success: '#5EC4A8',

    warning: '#E8B860',

    danger: '#E87878',

    tabBar: 'rgba(20, 28, 48, 0.55)',

    cardGradient:

      'linear-gradient(145deg, rgba(36,44,68,0.52) 0%, rgba(24,32,52,0.44) 100%)',

    heroGradient: HERO_GRADIENT,

    shadow: BTN_SHADOW,

    shadowSoft: '0 8px 24px rgba(0, 0, 0, 0.22)',

  },

};

