/**
 * Admin access for Phase 3 form imports.
 *
 * Curavon does not yet define application admin roles. HTTP admin routes are
 * deferred until an admin role model exists — see docs/architecture/phase3-form-import-execution.md.
 */

export const FORM_IMPORT_ADMIN_API_DEFERRED = true;

export type FormImportAdminSession = {
  userId: string;
};

export type AdminFormImportAccessDenied = {
  allowed: false;
  status: 401 | 403 | 503;
  code: 'unauthenticated' | 'admin_roles_not_configured' | 'admin_not_configured';
  message: string;
};

export type AdminFormImportAccessGranted = {
  allowed: true;
  session: FormImportAdminSession;
};

export type AdminFormImportAccessResult =
  | AdminFormImportAccessDenied
  | AdminFormImportAccessGranted;

/**
 * Gate for admin form import HTTP endpoints.
 * Denies all callers until a real admin role system is implemented.
 */
export function checkAdminFormImportAccess(
  session: FormImportAdminSession | null,
): AdminFormImportAccessResult {
  if (!session?.userId) {
    return {
      allowed: false,
      status: 401,
      code: 'unauthenticated',
      message: 'Authentication is required for form insight admin operations.',
    };
  }

  return {
    allowed: false,
    status: 403,
    code: 'admin_roles_not_configured',
    message:
      'Form insight admin API is deferred — no application admin role is configured yet. Use the CLI import path.',
  };
}
