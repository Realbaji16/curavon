import type { AuthAdapter, AuthMode } from './authTypes';
import { createLocalAuthAdapter } from './localAuthAdapter';

export function createAuthAdapter(mode: AuthMode = 'local_demo'): AuthAdapter {
  // Local-first adapter. A real backend adapter can replace this later.
  return createLocalAuthAdapter(mode);
}
