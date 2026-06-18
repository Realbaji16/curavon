export type CuravonCollection =
  | 'health_profile'
  | 'daily_checkins'
  | 'ask_history'
  | 'doctor_summary_items'
  | 'doctor_summary_drafts'
  | 'next_action_state'
  | 'red_flag_logs'
  | 'follow_ups'
  | 'memory_snapshot'
  | 'ai_usage_log'
  | 'guide_results'
  | 'user_preferences';

export interface CuravonDataEntity {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export type DataQuery = {
  userId: string;
  includeDeleted?: boolean;
  limit?: number;
};
