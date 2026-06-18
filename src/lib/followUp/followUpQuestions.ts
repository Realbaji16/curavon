import type { FollowUpIntent } from './followUpTypes';

export function followUpIntentForCategory(category?: string): FollowUpIntent {
  if (category === 'track') return 'check_symptom_pattern';
  if (category === 'prepare') return 'check_doctor_prep';
  if (category === 'reduce_friction') return 'check_action';
  if (category === 'escalate') return 'check_safety_event';
  return 'check_stress_state';
}

export function promptForFollowUp(category?: string, safetyLevel?: 'normal' | 'caution' | 'urgent'): string {
  if (safetyLevel === 'caution' || safetyLevel === 'urgent') {
    return 'Do you want to save an update for your doctor summary?';
  }
  if (category === 'track') return 'Were you able to write down the pattern?';
  if (category === 'prepare') return 'Were you able to prepare the note or question?';
  if (category === 'reduce_friction') return 'Was the smaller version easier to do?';
  return 'Did this help you feel a little more settled?';
}
