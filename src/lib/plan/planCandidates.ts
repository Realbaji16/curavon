import type { PlanCandidate, PlanEngineInput } from './planTypes';

function hasMedicationSignal(input: PlanEngineInput): boolean {
  const concern = (input.currentConcern ?? '').toLowerCase();
  const intakeConcern = (input.intakeResult?.concern ?? '').toLowerCase();
  const profileMeds = input.profile?.medications?.length ?? 0;
  return (
    /\bmedication|medicine|dose|tablet|capsule|side effect|pharmacist\b/.test(concern) ||
    /\bmedication|medicine|dose|tablet|capsule|side effect|pharmacist\b/.test(intakeConcern) ||
    profileMeds > 0
  );
}

function hasStressSignal(input: PlanEngineInput): boolean {
  const stressTrend = input.snapshot?.currentState.stressTrend;
  const moodTrend = input.snapshot?.currentState.moodTrend;
  const checkInStress = input.latestCheckIn?.stressLevel ?? '';
  const concern = `${input.currentConcern ?? ''} ${input.intakeResult?.concern ?? ''}`.toLowerCase();
  return (
    stressTrend === 'declining' ||
    moodTrend === 'declining' ||
    checkInStress === 'Stressed' ||
    checkInStress === 'Overwhelmed' ||
    /\boverwhelm|anxious|panic|stress|worry|low mood\b/.test(concern)
  );
}

function hasSymptomSignal(input: PlanEngineInput): boolean {
  const repeating = (input.snapshot?.activeConcerns.repeatingSymptoms.length ?? 0) > 0;
  const increasing = input.snapshot?.riskSignals.increasingSymptomFrequency ?? false;
  const concern = `${input.currentConcern ?? ''} ${input.intakeResult?.concern ?? ''}`.toLowerCase();
  return repeating || increasing || /\bheadache|stomach|pain|symptom|nausea|cramp\b/.test(concern);
}

function hasBlockedSignal(input: PlanEngineInput): boolean {
  return (
    (input.snapshot?.activeConcerns.blockedActions ?? 0) > 0 ||
    input.nextActionState?.status === 'blocked' ||
    (input.snapshot?.engagementSignals.repeatedBlockedActions ?? false)
  );
}

function hasPrepSignal(input: PlanEngineInput): boolean {
  return (
    (input.profile?.doctorQuestions.length ?? 0) > 0 ||
    (input.snapshot?.activeConcerns.unresolvedAskConcerns.length ?? 0) >= 2 ||
    hasMedicationSignal(input)
  );
}

const STABILIZE_CANDIDATE: PlanCandidate = {
  id: 'cand-stabilize-lower-noise',
  title: 'Lower the noise first',
  actionText: 'Take two slow breaths, then write one sentence about what feels loudest right now.',
  category: 'stabilize',
  safetyLevel: 'normal',
  whyCandidateFits: 'Useful for stress, overwhelm, low sleep, or low energy states.',
  whenToUse: 'When emotional load is high or focus is scattered.',
  relatedGuide: 'When Worry Feels Too Loud',
  disallowedIf: ['red_flags_present'],
};

const TRACK_CANDIDATE: PlanCandidate = {
  id: 'cand-track-pattern',
  title: 'Track the pattern',
  actionText: 'Write when it started, intensity, what changed, and what makes it better or worse.',
  category: 'track',
  safetyLevel: 'normal',
  whyCandidateFits: 'Improves symptom clarity without diagnosis.',
  whenToUse: 'When symptoms are recurring, unclear, or changing.',
  relatedGuide: 'Something Feels Off',
  disallowedIf: ['red_flags_present'],
};

const PREP_CANDIDATE: PlanCandidate = {
  id: 'cand-prepare-clinician-question',
  title: 'Prepare one clinician question',
  actionText: 'Write the one question you most want answered at your next appointment.',
  category: 'prepare',
  safetyLevel: 'caution',
  whyCandidateFits: 'Helps convert uncertainty into a useful care conversation.',
  whenToUse: 'When unresolved concerns or medication questions exist.',
  relatedGuide: 'Doctor Visit Prep',
  disallowedIf: ['red_flags_present'],
};

const REDUCE_FRICTION_CANDIDATE: PlanCandidate = {
  id: 'cand-reduce-friction-two-minute',
  title: 'Make the step smaller',
  actionText: 'Choose a 2-minute version of the last action or save what got in the way.',
  category: 'reduce_friction',
  safetyLevel: 'normal',
  whyCandidateFits: 'Reduces completion friction and supports continuity.',
  whenToUse: 'When actions were blocked or follow-through is difficult.',
  relatedGuide: 'Tiny Grounding Steps',
  disallowedIf: ['red_flags_present'],
};

export function buildSafePlanCandidates(input: PlanEngineInput): PlanCandidate[] {
  const candidates: PlanCandidate[] = [];
  if (hasBlockedSignal(input)) candidates.push(REDUCE_FRICTION_CANDIDATE);
  if (hasStressSignal(input)) candidates.push(STABILIZE_CANDIDATE);
  if (hasSymptomSignal(input)) candidates.push(TRACK_CANDIDATE);
  if (hasPrepSignal(input)) candidates.push(PREP_CANDIDATE);

  if (!candidates.length) candidates.push(STABILIZE_CANDIDATE);
  if (candidates.length === 1) {
    if (candidates[0].id !== TRACK_CANDIDATE.id) candidates.push(TRACK_CANDIDATE);
    else candidates.push(STABILIZE_CANDIDATE);
  }

  const deduped = Array.from(new Map(candidates.map((candidate) => [candidate.id, candidate])).values());
  return deduped.slice(0, 4);
}
