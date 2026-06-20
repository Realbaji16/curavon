import type { AuthSession } from './authTypes';

export function canEnterApp(session: AuthSession): boolean {
  return session.isAuthenticated && !!session.user?.consentCompleted && !!session.user?.setupCompleted;
}

export function requiresConsent(session: AuthSession): boolean {
  return session.isAuthenticated && !session.user?.consentCompleted;
}

export function requiresSetup(session: AuthSession): boolean {
  return session.isAuthenticated && !!session.user?.consentCompleted && !session.user?.setupCompleted;
}

export function canSignOutWithoutDataDeletion(): boolean {
  return true;
}

export function canDeleteHealthDataWithoutSignOut(): boolean {
  return true;
}

export function deleteLocalAccountRequiresExplicitHealthDataChoice(confirmed: boolean): boolean {
  return confirmed;
}

export function requireExplicitDeleteConfirmation(confirmed: boolean): boolean {
  return confirmed;
}
