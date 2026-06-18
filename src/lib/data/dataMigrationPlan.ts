export const CURAVON_LOCAL_DATA_MIGRATION_PLAN = [
  {
    stage: 1,
    title: 'Current localStorage compatibility',
    notes: 'Keep existing reads/writes stable for all current users.',
  },
  {
    stage: 2,
    title: 'Centralized storage keys',
    notes: 'Replace scattered string keys with shared constants where low-risk.',
  },
  {
    stage: 3,
    title: 'Adapter-only data access',
    notes: 'Route storage operations through data adapter boundaries.',
  },
  {
    stage: 4,
    title: 'User-scoped local records',
    notes: 'Store records by userId while preserving legacy compatibility.',
  },
  {
    stage: 5,
    title: 'Backend provider decision later',
    notes: 'Select provider after product and safety requirements are finalized.',
  },
  {
    stage: 6,
    title: 'Backend adapter implementation later',
    notes: 'Implement provider-specific adapters behind existing contracts.',
  },
  {
    stage: 7,
    title: 'Local-to-backend migration later',
    notes: 'Offer explicit user-controlled migration with rollback safeguards.',
  },
] as const;

export const CURAVON_PRIVACY_RULES = [
  'Collect minimum necessary health data.',
  'User owns their data.',
  'Sign-out does not imply data deletion.',
  'Delete health data and delete account are separate actions unless explicitly confirmed.',
  'Avoid storing secrets and API keys in storage.',
  'Do not store unnecessary raw model prompts/responses in exports.',
] as const;
