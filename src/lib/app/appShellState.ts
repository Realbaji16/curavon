import type { DemoAuthUser, ProfileSetupData } from '../../types/appShell';

type LocalAuthCredential = {
  email: string;
  password: string;
  displayName: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

type AppShellState = {
  onboardingSeen: boolean;
  consentComplete: boolean;
  setupComplete: boolean;
  profileSetup: ProfileSetupData | null;
  authDemoUser: DemoAuthUser | null;
  authDemoUserId: string | null;
  authDemoUsers: LocalAuthCredential[];
};

const DEFAULT_SHELL_STATE: AppShellState = {
  onboardingSeen: false,
  consentComplete: false,
  setupComplete: false,
  profileSetup: null,
  authDemoUser: null,
  authDemoUserId: null,
  authDemoUsers: [],
};

let shellState: AppShellState = { ...DEFAULT_SHELL_STATE };

export function getAppShellState(): AppShellState {
  return shellState;
}

export function patchAppShellState(patch: Partial<AppShellState>) {
  shellState = { ...shellState, ...patch };
}

export function clearAppShellState() {
  shellState = {
    ...DEFAULT_SHELL_STATE,
    authDemoUsers: shellState.authDemoUsers,
  };
}

export function resetAppShellStateForTests() {
  shellState = { ...DEFAULT_SHELL_STATE };
}

export function readLocalDemoUsers(): LocalAuthCredential[] {
  return shellState.authDemoUsers;
}

export function writeLocalDemoUsers(users: LocalAuthCredential[]) {
  shellState = { ...shellState, authDemoUsers: users };
}

export function readCurrentDemoUser(): DemoAuthUser | null {
  return shellState.authDemoUser;
}

export function writeCurrentDemoUser(user: DemoAuthUser, userId: string) {
  shellState = {
    ...shellState,
    authDemoUser: user,
    authDemoUserId: userId,
  };
}

export function clearCurrentDemoUser() {
  shellState = {
    ...shellState,
    authDemoUser: null,
    authDemoUserId: null,
  };
}

export function clearLocalDemoAccountData(options?: { clearHealthData?: boolean }) {
  void options?.clearHealthData;
  clearCurrentDemoUser();
  patchAppShellState({
    consentComplete: false,
    setupComplete: false,
    profileSetup: null,
  });
}
