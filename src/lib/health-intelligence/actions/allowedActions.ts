/** Phase 1 approved next-step action IDs for health intelligence. */
export const APPROVED_ACTION_IDS = [
  'seek_urgent_care_now',
  'speak_to_health_professional_today',
  'visit_clinic_or_pharmacy_for_guidance',
  'monitor_and_track',
  'prepare_doctor_summary',
  'prepare_pharmacist_summary',
  'avoid_unsafe_medicine_mixing',
  'follow_up_if_worse_or_persistent',
  'save_symptom_timeline',
  'ask_for_test_or_lab_context',
  'answer_guided_questions',
] as const;

export type ApprovedActionId = (typeof APPROVED_ACTION_IDS)[number];

export type ApprovedActionCategory =
  | 'escalate'
  | 'seek_care'
  | 'prepare'
  | 'track'
  | 'guide';

export type ApprovedAction = {
  id: ApprovedActionId;
  label: string;
  instruction: string;
  category: ApprovedActionCategory;
};

export const APPROVED_ACTIONS: Record<ApprovedActionId, ApprovedAction> = {
  seek_urgent_care_now: {
    id: 'seek_urgent_care_now',
    label: 'Seek urgent care now',
    instruction:
      'Severe, sudden, or unsafe symptoms should be handled by local emergency services or a clinician now.',
    category: 'escalate',
  },
  speak_to_health_professional_today: {
    id: 'speak_to_health_professional_today',
    label: 'Speak to a health professional today',
    instruction:
      'Consider speaking with a clinician or pharmacist today to review your symptoms and next steps.',
    category: 'seek_care',
  },
  visit_clinic_or_pharmacy_for_guidance: {
    id: 'visit_clinic_or_pharmacy_for_guidance',
    label: 'Visit clinic or pharmacy for guidance',
    instruction:
      'A clinic or licensed pharmacy can help review symptoms or medicine questions — not replace emergency care when needed.',
    category: 'seek_care',
  },
  monitor_and_track: {
    id: 'monitor_and_track',
    label: 'Monitor and track',
    instruction: 'Track when symptoms started, how they change, and what makes them better or worse.',
    category: 'track',
  },
  prepare_doctor_summary: {
    id: 'prepare_doctor_summary',
    label: 'Prepare doctor summary',
    instruction: 'Organize your concern, timeline, and questions for a clinician visit.',
    category: 'prepare',
  },
  prepare_pharmacist_summary: {
    id: 'prepare_pharmacist_summary',
    label: 'Prepare pharmacist summary',
    instruction: 'List medicine names, instructions received, and your main worry for a pharmacist conversation.',
    category: 'prepare',
  },
  avoid_unsafe_medicine_mixing: {
    id: 'avoid_unsafe_medicine_mixing',
    label: 'Avoid unsafe medicine mixing',
    instruction:
      'Note all medicines you are taking and ask a pharmacist or clinician before mixing or changing them.',
    category: 'prepare',
  },
  follow_up_if_worse_or_persistent: {
    id: 'follow_up_if_worse_or_persistent',
    label: 'Follow up if worse or persistent',
    instruction: 'If symptoms worsen, persist, or feel unsafe, seek in-person care without waiting.',
    category: 'seek_care',
  },
  save_symptom_timeline: {
    id: 'save_symptom_timeline',
    label: 'Save symptom timeline',
    instruction: 'Write start time, changes through the day, and any medicines already taken.',
    category: 'track',
  },
  ask_for_test_or_lab_context: {
    id: 'ask_for_test_or_lab_context',
    label: 'Ask for test or lab context',
    instruction:
      'Organize test name, date, and confusing wording for a clinician — slips alone are not a diagnosis.',
    category: 'prepare',
  },
  answer_guided_questions: {
    id: 'answer_guided_questions',
    label: 'Answer guided questions',
    instruction: 'Answer a few short safety and timing questions so Curavon can organize your notes.',
    category: 'guide',
  },
};

const APPROVED_ACTION_ID_SET = new Set<string>(APPROVED_ACTION_IDS);

export function isApprovedActionId(value: string): value is ApprovedActionId {
  return APPROVED_ACTION_ID_SET.has(value);
}

export function getApprovedAction(id: ApprovedActionId): ApprovedAction {
  return APPROVED_ACTIONS[id];
}
