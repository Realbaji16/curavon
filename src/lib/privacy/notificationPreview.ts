export const GENERIC_SENSITIVE_NOTIFICATION_PREVIEW =
  'You have a Curavon health action update.';

export function resolveSensitivePreviewPreference(
  preference: Record<string, unknown> | null | undefined,
): boolean {
  if (!preference) return false;
  return preference.sensitive_preview === true;
}

export function resolveNotificationPreviewText(input: {
  isSensitive: boolean;
  sensitivePreviewEnabled?: boolean;
  rawPreview?: string;
}): string {
  if (input.isSensitive && !input.sensitivePreviewEnabled) {
    return GENERIC_SENSITIVE_NOTIFICATION_PREVIEW;
  }
  const raw = input.rawPreview?.trim();
  if (!raw) return GENERIC_SENSITIVE_NOTIFICATION_PREVIEW;
  return raw.length > 120 ? `${raw.slice(0, 120)}…` : raw;
}
