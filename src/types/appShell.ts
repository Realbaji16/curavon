import type {
  AgeRange,
  LanguageStyle,
  PregnancyStatus,
  ProfileSex,
  SmartSilencePreference,
} from './health';

export type ProfileSetupData = {
  preferredName: string;
  primaryGoals: string[];
  smartSilencePreference: SmartSilencePreference;
  sensitiveMode?: boolean;
  ageRange?: AgeRange;
  sex?: ProfileSex;
  pregnancyStatus?: PregnancyStatus;
  stateOrRegion?: string;
  languageStyle?: LanguageStyle;
  conditions?: string[];
  allergies?: string[];
  medications?: string[];
};

export type DemoAuthUser = {
  fullName: string;
  email: string;
};
