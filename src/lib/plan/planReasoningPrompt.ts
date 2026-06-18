import type { PlanCandidate, PlanSafetyLevel } from './planTypes';

export const PLAN_REASONING_SYSTEM_PROMPT = `You are Curavon's guarded health action reasoning layer.

Your job is to choose the safest and most useful next action from a list of ALLOWED candidates.

You must not invent new actions.

You must not diagnose, prescribe, change medication, or create treatment plans.

You must choose the action that is:
- safest
- simplest
- most useful right now
- aligned with the user's recent context
- respectful of blockers and overwhelm

If there is uncertainty, choose the lower-risk action.

Return JSON only:
{
  "selectedCandidateId": "",
  "reasoning": "",
  "whyNotOthers": "",
  "followUpPrompt": "",
  "watchFor": "",
  "confidence": "low|medium|high"
}`;

export function buildPlanReasoningPrompt(input: {
  snapshotSummary: string;
  currentConcern: string;
  sourceSignals: string[];
  safetyLevel: PlanSafetyLevel;
  userConstraints: string[];
  candidates: PlanCandidate[];
}): string {
  return [
    'Select one candidate ID only from the provided list.',
    `Safety level: ${input.safetyLevel}`,
    `Current concern: ${input.currentConcern || 'Not specified'}`,
    `Snapshot summary: ${input.snapshotSummary}`,
    `Source signals: ${input.sourceSignals.join(', ') || 'none'}`,
    `User constraints/blockers: ${input.userConstraints.join(', ') || 'none'}`,
    'Allowed candidates:',
    ...input.candidates.map((candidate) =>
      `- ${candidate.id} | ${candidate.title} | ${candidate.category} | ${candidate.actionText} | when: ${candidate.whenToUse}`,
    ),
  ].join('\n');
}
