import { createSupabaseServerClient } from '../supabase/serverClient';
import { readCsvTextFromUploadBuffer } from '../form-insights/import/formImportFileIo';
import {
  buildFormImportPublicSummary,
  executeFormImportFromCsv,
} from '../form-insights/import/formImportExecution';
import { validateFormImportUpload } from '../form-insights/import/formImportUpload';
import { persistFormImportResult } from './formInsightPersistence';
import {
  checkAdminFormImportAccess,
  type AdminFormImportAccessResult,
  type FormImportAdminSession,
} from './formInsightAdminAccess';
import type { FormInsightStatus } from '../form-insights/types';

export type FormImportHandlerErrorBody = {
  error: string;
  message: string;
};

export type FormImportHandlerSuccessBody = ReturnType<typeof buildFormImportPublicSummary> & {
  persisted: boolean;
  databaseBatchId?: string;
};

async function resolveAdminFormImportAccess(
  _request: Request,
): Promise<AdminFormImportAccessResult> {
  void _request;
  const client = await createSupabaseServerClient();
  if (!client) {
    return {
      allowed: false,
      status: 503,
      code: 'admin_not_configured',
      message: 'Supabase is not configured for form insight admin operations.',
    };
  }

  const { data, error } = await client.auth.getUser();
  if (error || !data.user?.id) {
    return checkAdminFormImportAccess(null);
  }

  const session: FormImportAdminSession = { userId: data.user.id };
  return checkAdminFormImportAccess(session);
}

function accessDeniedResponse(access: Extract<AdminFormImportAccessResult, { allowed: false }>): {
  status: number;
  body: FormImportHandlerErrorBody;
} {
  return {
    status: access.status,
    body: {
      error: access.code,
      message: access.message,
    },
  };
}

/**
 * Deferred admin import endpoint handler.
 * Validates access before reading upload bodies. Not wired to a public route yet.
 */
export async function handleAdminFormImportPost(request: Request): Promise<{
  status: number;
  body: FormImportHandlerSuccessBody | FormImportHandlerErrorBody;
}> {
  const access = await resolveAdminFormImportAccess(request);
  if (!access.allowed) {
    return accessDeniedResponse(access);
  }

  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return {
      status: 400,
      body: {
        error: 'missing_file',
        message: 'Multipart field "file" with a CSV or ZIP upload is required.',
      },
    };
  }

  const buffer = new Uint8Array(await file.arrayBuffer());
  const validation = validateFormImportUpload({
    filename: file.name,
    byteLength: buffer.byteLength,
  });

  if (!validation.ok) {
    return {
      status: 400,
      body: {
        error: validation.code,
        message: validation.message,
      },
    };
  }

  const csvRead = await readCsvTextFromUploadBuffer(validation.filename, buffer);
  if (!csvRead.ok) {
    return {
      status: 400,
      body: {
        error: csvRead.code,
        message: csvRead.message,
      },
    };
  }

  const result = executeFormImportFromCsv(csvRead.filename, csvRead.csvText);
  const persist = await persistFormImportResult({ result });

  if (!persist.ok) {
    return {
      status: 500,
      body: {
        error: persist.error.code,
        message: persist.error.message,
      },
    };
  }

  return {
    status: 200,
    body: {
      ...buildFormImportPublicSummary(result),
      persisted: true,
      databaseBatchId: persist.data.batchId,
    },
  };
}

export async function handleAdminFormInsightsGet(request: Request): Promise<{
  status: number;
  body: FormImportHandlerErrorBody | { insights: unknown[] };
}> {
  const access = await resolveAdminFormImportAccess(request);
  if (!access.allowed) {
    return accessDeniedResponse(access);
  }

  return {
    status: 200,
    body: { insights: [] },
  };
}

export async function handleAdminFormInsightByIdGet(
  request: Request,
  insightId: string,
): Promise<{
  status: number;
  body: FormImportHandlerErrorBody | Record<string, never>;
}> {
  void insightId;
  const access = await resolveAdminFormImportAccess(request);
  if (!access.allowed) {
    return accessDeniedResponse(access);
  }

  return {
    status: 200,
    body: {},
  };
}

export async function handleAdminFormInsightByIdPatch(
  request: Request,
  insightId: string,
  status: FormInsightStatus,
): Promise<{
  status: number;
  body: FormImportHandlerErrorBody | Record<string, never>;
}> {
  void insightId;
  void status;
  const access = await resolveAdminFormImportAccess(request);
  if (!access.allowed) {
    return accessDeniedResponse(access);
  }

  return {
    status: 200,
    body: {},
  };
}
