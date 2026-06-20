export type ProfileSetupData = {
  preferredName: string;
  primaryGoals: string[];
  smartSilencePreference: 'gentle-reminders' | 'daily-digest-only' | 'minimal-notifications';
  sensitiveMode?: boolean;
};

export type DemoAuthUser = {
  fullName: string;
  email: string;
};
