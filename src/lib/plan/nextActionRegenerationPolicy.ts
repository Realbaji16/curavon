import type { NextActionState } from '../../types/health';

export type NextActionRegenerationTrigger =
  | 'initial_load'
  | 'checkin_completed'
  | 'action_completed'
  | 'action_blocked'
  | 'action_adjusted'
  | 'manual_refresh'
  | 'ask_promoted'
  | 'guide_completed'
  | 'followup_requested'
  | 'data_reset'
  | 'demo_seed';

export const EXPLICIT_REGENERATION_TRIGGERS: ReadonlySet<NextActionRegenerationTrigger> =
  new Set([
    'checkin_completed',
    'action_completed',
    'action_blocked',
    'action_adjusted',
    'manual_refresh',
    'ask_promoted',
    'guide_completed',
    'followup_requested',
    'data_reset',
    'demo_seed',
  ]);

/** Blocks rapid duplicate generation unless trigger is explicit. */
export const PLAN_GENERATION_COOLDOWN_MS = 5000;

export type ApplyNextActionStatus = 'generated' | 'skipped' | 'fallback' | 'error';

export interface ApplyNextActionResult {
  status: ApplyNextActionStatus;
  reason: string;
  action?: NextActionState | null;
}

export interface ShouldRegenerateInput {
  currentAction: NextActionState | null;
  trigger: NextActionRegenerationTrigger;
  lastGeneratedAt?: number | null;
  onlyIfPending?: boolean;
  force?: boolean;
}

export interface ShouldRegenerateResult {
  allow: boolean;
  reason: string;
}

function isUrgentAction(action: NextActionState): boolean {
  return action.safetyLevel === 'urgent' || action.category === 'escalate';
}

/**
 * Conservative regeneration policy — when unsure, do not regenerate.
 * Pending actions stay stable until an explicit trigger or no action exists.
 */
export function shouldRegenerateNextAction(input: ShouldRegenerateInput): ShouldRegenerateResult {
  const { currentAction, trigger, lastGeneratedAt, onlyIfPending, force } = input;

  if (force) {
    return { allow: true, reason: 'forced' };
  }

  if (!currentAction) {
    return { allow: true, reason: 'no_current_action' };
  }

  if (
    isUrgentAction(currentAction) &&
    trigger !== 'manual_refresh' &&
    trigger !== 'followup_requested' &&
    trigger !== 'data_reset' &&
    trigger !== 'demo_seed' &&
    trigger !== 'ask_promoted'
  ) {
    return { allow: false, reason: 'urgent_action_protected' };
  }

  const isExplicit = EXPLICIT_REGENERATION_TRIGGERS.has(trigger);
  const isPending = currentAction.status === 'pending';

  if (trigger === 'initial_load') {
    if (!currentAction) return { allow: true, reason: 'initial_load_no_action' };
    if (isPending) return { allow: false, reason: 'initial_load_pending_exists' };
    return { allow: false, reason: 'initial_load_existing_action' };
  }

  if (trigger === 'manual_refresh') {
    return { allow: true, reason: 'manual_refresh_allowed' };
  }

  if (isPending && !isExplicit) {
    return { allow: false, reason: 'pending_action_stable' };
  }

  if (onlyIfPending === true && !isPending) {
    const allowedWhenNotPending = new Set<NextActionRegenerationTrigger>([
      'manual_refresh',
      'checkin_completed',
      'followup_requested',
      'data_reset',
      'demo_seed',
      'action_completed',
      'action_blocked',
      'action_adjusted',
    ]);
    if (!allowedWhenNotPending.has(trigger)) {
      return { allow: false, reason: 'only_if_pending_but_not_pending' };
    }
  }

  if (
    lastGeneratedAt &&
    Date.now() - lastGeneratedAt < PLAN_GENERATION_COOLDOWN_MS &&
    !isExplicit
  ) {
    return { allow: false, reason: 'recent_generation_cooldown' };
  }

  return { allow: true, reason: 'policy_allowed' };
}
