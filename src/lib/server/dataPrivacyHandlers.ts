import { getDataAdapter } from '../data/getDataAdapter';
import { requireAuthenticatedSupabaseUser } from './aiRouteGuards';
import {
  buildPrivacyPayload,
  parseDeleteFlowBody,
  parseDeleteSummaryBody,
  parseDeletionRequestBody,
  parseExportRequestBody,
} from './dataPrivacyGuards';
import type { DataPrivacyError } from './dataPrivacyTypes';
import { PRIVACY_ROUTE_MESSAGES } from './dataPrivacyTypes';
import { createSupabaseServerClient } from '../supabase/serverClient';
import { withServerDataAccess } from './serverDataContext';
import { trackSafeEvent } from '../observability/safeAnalytics';

function privacyError(
  status: number,
  code: string,
  message: string,
): { status: number; body: { ok: false; error: DataPrivacyError } } {
  return {
    status,
    body: { ok: false, error: { code, message } },
  };
}

type PrivacyRouteBody = Record<string, unknown> & { ok: boolean };

async function runPrivacyRoute(
  handler: () => Promise<{ status: number; body: PrivacyRouteBody }>,
): Promise<{ status: number; body: PrivacyRouteBody }> {
  const auth = await requireAuthenticatedSupabaseUser();
  if (!auth.ok) {
    return privacyError(auth.status, auth.code, auth.message);
  }

  const serverClient = await createSupabaseServerClient();
  if (!serverClient) {
    return privacyError(401, 'unauthenticated', PRIVACY_ROUTE_MESSAGES.unauthenticated);
  }

  return withServerDataAccess(auth.userId, serverClient, handler);
}

export async function handleExportRequestPost(request: Request) {
  return runPrivacyRoute(async () => {
    let parsedBody: unknown;
    try {
      parsedBody = await request.json();
    } catch {
      return privacyError(400, 'invalid_json', PRIVACY_ROUTE_MESSAGES.invalidJson);
    }

    const body = parseExportRequestBody(parsedBody);
    if (!body.ok) {
      return privacyError(body.status, body.code, body.message);
    }

    const requestRecord = await getDataAdapter().createDataExportRequest({
      requestStatus: 'pending',
      payload: buildPrivacyPayload({
        request_type: body.requestType,
        requested_via: 'api_data_export_request',
        requested_at: new Date().toISOString(),
      }),
    });

    trackSafeEvent(
      body.requestType === 'doctor_summary_export'
        ? 'summary_export_requested'
        : 'data_export_requested',
      {
        request_status: requestRecord.requestStatus,
        status: 'pending',
        route_name: 'api_data_export_request',
      },
    );

    return {
      status: 200,
      body: {
        ok: true,
        request: {
          id: requestRecord.id,
          status: requestRecord.requestStatus,
          requestType: body.requestType,
        },
        message: PRIVACY_ROUTE_MESSAGES.exportCreated,
      },
    };
  });
}

export async function handleDeletionRequestPost(request: Request) {
  return runPrivacyRoute(async () => {
    let parsedBody: unknown;
    try {
      parsedBody = await request.json();
    } catch {
      return privacyError(400, 'invalid_json', PRIVACY_ROUTE_MESSAGES.invalidJson);
    }

    const body = parseDeletionRequestBody(parsedBody);
    if (!body.ok) {
      return privacyError(body.status, body.code, body.message);
    }

    const deletionScope =
      body.requestType === 'full_account_deletion' ? 'full_account' : 'health_data';

    const requestRecord = await getDataAdapter().createDataDeletionRequest({
      requestStatus: 'pending',
      deletionScope,
      payload: buildPrivacyPayload({
        request_type: body.requestType,
        requested_via: 'api_data_deletion_request',
        requested_at: new Date().toISOString(),
        account_deleted: false,
      }),
    });

    trackSafeEvent('data_deletion_requested', {
      request_status: requestRecord.requestStatus,
      status: 'pending',
      route_name: 'api_data_deletion_request',
    });

    return {
      status: 200,
      body: {
        ok: true,
        request: {
          id: requestRecord.id,
          status: requestRecord.requestStatus,
          requestType: body.requestType,
        },
        message: PRIVACY_ROUTE_MESSAGES.deletionCreated,
      },
    };
  });
}

export async function handleDeleteFlowPost(request: Request) {
  return runPrivacyRoute(async () => {
    let parsedBody: unknown;
    try {
      parsedBody = await request.json();
    } catch {
      return privacyError(400, 'invalid_json', PRIVACY_ROUTE_MESSAGES.invalidJson);
    }

    const body = parseDeleteFlowBody(parsedBody);
    if (!body.ok) {
      return privacyError(body.status, body.code, body.message);
    }

    try {
      const result = await getDataAdapter().deleteHealthFlow(body.healthFlowId);
      return {
        status: 200,
        body: {
          ok: true,
          flowId: result.flowId,
          status: result.status,
          message: PRIVACY_ROUTE_MESSAGES.flowDeleted,
        },
      };
    } catch {
      return privacyError(404, 'flow_not_found', 'Health flow was not found for this account.');
    }
  });
}

export async function handleDeleteSummaryPost(request: Request) {
  return runPrivacyRoute(async () => {
    let parsedBody: unknown;
    try {
      parsedBody = await request.json();
    } catch {
      return privacyError(400, 'invalid_json', PRIVACY_ROUTE_MESSAGES.invalidJson);
    }

    const body = parseDeleteSummaryBody(parsedBody);
    if (!body.ok) {
      return privacyError(body.status, body.code, body.message);
    }

    try {
      const result = await getDataAdapter().deleteDoctorSummary(body.summaryId);
      return {
        status: 200,
        body: {
          ok: true,
          summaryId: result.summaryId,
          deletedKind: result.deletedKind,
          status: 'deleted',
          message: PRIVACY_ROUTE_MESSAGES.summaryDeleted,
        },
      };
    } catch {
      return privacyError(404, 'summary_not_found', 'Doctor summary record was not found for this account.');
    }
  });
}

export async function handleDeleteHealthProfilePost(request: Request) {
  void request;
  return runPrivacyRoute(async () => {
    const result = await getDataAdapter().deleteHealthProfile();
    return {
      status: 200,
      body: {
        ok: true,
        status: result.status,
        message: PRIVACY_ROUTE_MESSAGES.profileCleared,
      },
    };
  });
}
