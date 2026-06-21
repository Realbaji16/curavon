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
} as const;
