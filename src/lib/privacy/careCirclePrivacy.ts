import type { CareCircleMember } from '../data/dataTypes';

export const CARE_CIRCLE_LOCKED_COPY =
  'Care Circle sharing is permission-based and not enabled for health details yet.';

export const DEFAULT_MEMBER_SHARING_RULES: Record<string, boolean> = {
  health_flows: false,
  doctor_summaries: false,
  ask_history: false,
  profile_data: false,
  raw_content: false,
};

export type CareCircleMemberAccessInput = Pick<
  CareCircleMember,
  'status' | 'permissionLevel' | 'sharingRules'
>;

const BLOCKED_MEMBER_STATUSES = new Set(['pending', 'blocked', 'removed']);

function isActiveMember(member: CareCircleMemberAccessInput): boolean {
  return !BLOCKED_MEMBER_STATUSES.has(member.status);
}

function sharingRuleEnabled(
  sharingRules: Record<string, unknown> | undefined,
  key: keyof typeof DEFAULT_MEMBER_SHARING_RULES,
): boolean {
  const value = sharingRules?.[key];
  return value === true;
}

/** Raw health content requires explicit sharing rule + active membership + owner-granted permission. */
export function canMemberAccessHealthContent(member: CareCircleMemberAccessInput): boolean {
  if (!isActiveMember(member)) return false;
  if (member.permissionLevel === 'none') return false;
  return (
    member.permissionLevel === 'full' &&
    sharingRuleEnabled(member.sharingRules, 'health_flows') &&
    sharingRuleEnabled(member.sharingRules, 'raw_content')
  );
}

export function canMemberAccessDoctorSummaries(member: CareCircleMemberAccessInput): boolean {
  if (!isActiveMember(member)) return false;
  return (
    member.permissionLevel === 'full' &&
    sharingRuleEnabled(member.sharingRules, 'doctor_summaries') &&
    sharingRuleEnabled(member.sharingRules, 'raw_content')
  );
}

export function canMemberAccessAskHistory(member: CareCircleMemberAccessInput): boolean {
  if (!isActiveMember(member)) return false;
  return (
    member.permissionLevel === 'full' &&
    sharingRuleEnabled(member.sharingRules, 'ask_history') &&
    sharingRuleEnabled(member.sharingRules, 'raw_content')
  );
}

export function canMemberAccessProfileData(member: CareCircleMemberAccessInput): boolean {
  if (!isActiveMember(member)) return false;
  return (
    (member.permissionLevel === 'metadata_only' ||
      member.permissionLevel === 'status_only' ||
      member.permissionLevel === 'full') &&
    sharingRuleEnabled(member.sharingRules, 'profile_data')
  );
}

/** Status-only signals — never raw content. Default members do not receive these yet. */
export function canMemberViewStatusSignals(member: CareCircleMemberAccessInput): boolean {
  if (!isActiveMember(member)) return false;
  return member.permissionLevel === 'status_only' || member.permissionLevel === 'metadata_only';
}

export function mergeDefaultSharingRules(
  overrides?: Record<string, unknown>,
): Record<string, boolean> {
  const merged = { ...DEFAULT_MEMBER_SHARING_RULES };
  if (!overrides) return merged;
  for (const key of Object.keys(DEFAULT_MEMBER_SHARING_RULES) as Array<
    keyof typeof DEFAULT_MEMBER_SHARING_RULES
  >) {
    if (typeof overrides[key] === 'boolean') {
      merged[key] = overrides[key] as boolean;
    }
  }
  return merged;
}
