import { sanitizeTelemetryProperties } from './redactTelemetry';

type SafeErrorContext = Record<string, string | number | boolean>;

function normalizeError(error: unknown): { name: string; message: string } {
  if (error instanceof Error) {
    return {
      name: error.name.slice(0, 80),
      message: error.message.length > 120 ? '[redacted]' : error.message.slice(0, 120),
    };
  }
  return { name: 'UnknownError', message: '[redacted]' };
}

function resolveSentryDsn(): string | undefined {
  if (typeof process === 'undefined') return undefined;
  return process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;
}

/**
 * Report errors with redacted context. Console-only by default; Sentry wiring is
 * deferred until @sentry/nextjs is installed and NEXT_PUBLIC_SENTRY_DSN is set.
 */
export function reportSafeError(
  error: unknown,
  context?: Record<string, unknown>,
): void {
  try {
    const safeContext: SafeErrorContext = sanitizeTelemetryProperties(context);
    const normalized = normalizeError(error);

    if (resolveSentryDsn()) {
      // Placeholder for future Sentry integration — never attach raw health text.
      // import('@sentry/nextjs').then((Sentry) => Sentry.captureException(error, { extra: safeContext }));
    }

    if (typeof console !== 'undefined') {
      console.error('[curavon-error]', normalized.name, safeContext);
    }
  } catch {
    // Never throw from error reporting.
  }
}

export function reportSafeMessage(
  message: string,
  context?: Record<string, unknown>,
): void {
  reportSafeError(new Error(message.length > 120 ? '[redacted]' : message), context);
}
