import type {
  AgeRange,
  LanguageStyle,
  PregnancyStatus,
  ProfileSex,
} from '../types/health';

export const AGE_RANGE_OPTIONS: { id: AgeRange; label: string }[] = [
  { id: 'under-18', label: 'Under 18' },
  { id: '18-24', label: '18–24' },
  { id: '25-34', label: '25–34' },
  { id: '35-44', label: '35–44' },
  { id: '45-54', label: '45–54' },
  { id: '55-64', label: '55–64' },
  { id: '65-plus', label: '65+' },
];

export const PROFILE_SEX_OPTIONS: { id: ProfileSex; label: string }[] = [
  { id: 'female', label: 'Female' },
  { id: 'male', label: 'Male' },
  { id: 'intersex', label: 'Intersex' },
  { id: 'prefer-not-to-say', label: 'Prefer not to say' },
];

export const PREGNANCY_STATUS_OPTIONS: { id: PregnancyStatus; label: string }[] = [
  { id: 'not-pregnant', label: 'Not pregnant' },
  { id: 'pregnant', label: 'Pregnant' },
  { id: 'trying', label: 'Trying to conceive' },
  { id: 'postpartum', label: 'Postpartum' },
  { id: 'prefer-not-to-say', label: 'Prefer not to say' },
];

export const LANGUAGE_STYLE_OPTIONS: { id: LanguageStyle; label: string }[] = [
  { id: 'plain', label: 'Plain and simple' },
  { id: 'warm', label: 'Warm and encouraging' },
  { id: 'clinical', label: 'Clinical and precise' },
  { id: 'brief', label: 'Brief and direct' },
];

export function pregnancyContextRelevant(sex: ProfileSex | ''): boolean {
  return sex === 'female' || sex === 'intersex';
}

export function parseOptionalCommaList(value: string): string[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

export function formatCommaList(items: string[]): string {
  return items.join(', ');
}
