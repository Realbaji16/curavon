export type DeletionType =
  | 'health_data_only'
  | 'local_account_only'
  | 'account_and_health_data';

export type ConfirmationCopy = {
  title: string;
  body: string;
  confirmLabel: string;
  dangerLevel: 'medium' | 'high';
};

export const DELETION_CONFIRMATION_COPY: Record<DeletionType, ConfirmationCopy> = {
  health_data_only: {
    title: 'Delete all health data?',
    body:
      'This removes your health profile, check-ins, Ask history, doctor summary items, red flag logs, follow-ups, memory snapshot, and guide results from this device. Your local sign-in is not removed.',
    confirmLabel: 'Delete health data',
    dangerLevel: 'medium',
  },
  local_account_only: {
    title: 'Delete local account?',
    body:
      'This removes your local Curavon account from this device. Your health data is only removed if you choose that option.',
    confirmLabel: 'Delete local account',
    dangerLevel: 'high',
  },
  account_and_health_data: {
    title: 'Delete account and health data?',
    body:
      'This permanently deletes your Curavon account from Supabase, removes all health data stored there, and clears this device. Export your data first if you want a copy. You cannot sign in again with the same account after this.',
    confirmLabel: 'Delete everything',
    dangerLevel: 'high',
  },
};
