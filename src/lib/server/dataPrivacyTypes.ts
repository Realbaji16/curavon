export type DataPrivacyError = {
  code: string;
  message: string;
};

export type DataPrivacyResponse<T> = {
  ok: boolean;
  error?: DataPrivacyError;
} & T;

export type ExportRequestType = 'account_export' | 'doctor_summary_export';

export type DeletionRequestType = 'full_account_deletion' | 'health_data_deletion';

export type ExportRequestBody = {
  requestType?: unknown;
};

export type DeletionRequestBody = {
  requestType?: unknown;
};

export type DeleteFlowBody = {
  healthFlowId?: unknown;
};

export type DeleteSummaryBody = {
  summaryId?: unknown;
};

export const PRIVACY_ROUTE_MESSAGES = {
  unauthenticated: 'Authentication required.',
  invalidJson: 'Request body must be valid JSON.',
  invalidBody: 'Request body must be a JSON object.',
  exportCreated: 'Export request recorded.',
  deletionCreated: 'Deletion request recorded. Processing may take time.',
  flowDeleted: 'Health flow deleted.',
  summaryDeleted: 'Doctor summary deleted.',
  profileCleared: 'Health profile cleared.',
  accountDeleted: 'Account and health data deleted.',
  accountDeleteFailed: 'Account deletion could not be completed. Try again while signed in.',
  adminNotConfigured:
    'Account deletion is not configured on this server. Add SUPABASE_SERVICE_ROLE_KEY to the server environment.',
  deleteRpcMissing:
    'Run ACCOUNT_DELETION.sql in Supabase SQL Editor (one-time setup), then try again.',
} as const;
