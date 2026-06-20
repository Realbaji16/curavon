import type {
  DeletionRequestType,
  DeleteFlowBody,
  DeleteSummaryBody,
  ExportRequestType,
  ExportRequestBody,
  DeletionRequestBody,
} from './dataPrivacyTypes';

type RouteBodyFailure = {
  ok: false;
  status: 400;
  code: 'invalid_body' | 'empty_input';
  message: string;
};

const EXPORT_TYPES = new Set<ExportRequestType>(['account_export', 'doctor_summary_export']);
const DELETION_TYPES = new Set<DeletionRequestType>(['full_account_deletion', 'health_data_deletion']);

export function parseExportRequestBody(
  body: unknown,
): { ok: true; requestType: ExportRequestType } | RouteBodyFailure {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return {
      ok: false,
      status: 400,
      code: 'invalid_body',
      message: 'Request body must be a JSON object.',
    };
  }

  const record = body as ExportRequestBody;
  const rawType = typeof record.requestType === 'string' ? record.requestType.trim() : 'account_export';
  const requestType = EXPORT_TYPES.has(rawType as ExportRequestType)
    ? (rawType as ExportRequestType)
    : 'account_export';

  return { ok: true, requestType };
}

export function parseDeletionRequestBody(
  body: unknown,
): { ok: true; requestType: DeletionRequestType } | RouteBodyFailure {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return {
      ok: false,
      status: 400,
      code: 'invalid_body',
      message: 'Request body must be a JSON object.',
    };
  }

  const record = body as DeletionRequestBody;
  const rawType = typeof record.requestType === 'string' ? record.requestType.trim() : 'health_data_deletion';
  if (!DELETION_TYPES.has(rawType as DeletionRequestType)) {
    return {
      ok: false,
      status: 400,
      code: 'invalid_body',
      message: 'Field "requestType" must be full_account_deletion or health_data_deletion.',
    };
  }

  return { ok: true, requestType: rawType as DeletionRequestType };
}

export function parseDeleteFlowBody(
  body: unknown,
): { ok: true; healthFlowId: string } | RouteBodyFailure {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return {
      ok: false,
      status: 400,
      code: 'invalid_body',
      message: 'Request body must be a JSON object.',
    };
  }

  const record = body as DeleteFlowBody;
  if (typeof record.healthFlowId !== 'string' || !record.healthFlowId.trim()) {
    return {
      ok: false,
      status: 400,
      code: 'empty_input',
      message: 'Field "healthFlowId" must be a non-empty string.',
    };
  }

  return { ok: true, healthFlowId: record.healthFlowId.trim() };
}

export function parseDeleteSummaryBody(
  body: unknown,
): { ok: true; summaryId: string } | RouteBodyFailure {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return {
      ok: false,
      status: 400,
      code: 'invalid_body',
      message: 'Request body must be a JSON object.',
    };
  }

  const record = body as DeleteSummaryBody;
  if (typeof record.summaryId !== 'string' || !record.summaryId.trim()) {
    return {
      ok: false,
      status: 400,
      code: 'empty_input',
      message: 'Field "summaryId" must be a non-empty string.',
    };
  }

  return { ok: true, summaryId: record.summaryId.trim() };
}

export function buildPrivacyPayload(input: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (typeof value === 'string' && value.length > 120) {
      safe[key] = `[redacted:${value.length}chars]`;
      continue;
    }
    safe[key] = value;
  }
  return safe;
}
