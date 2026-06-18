import type { DailyCheckIn, NextActionState } from '../types/health';
import { DEFAULT_STEPS_GOAL } from './stepsUtils';

export function generateNextActionFromCheckIn(
  checkIn: DailyCheckIn,
  liveSteps?: number,
): NextActionState {
  const symptoms = checkIn.symptoms.toLowerCase();
  const now = new Date().toISOString();
  const steps = Math.max(checkIn.steps ?? 0, liveSteps ?? 0);
  const goal = DEFAULT_STEPS_GOAL;

  if (checkIn.stressLevel === 'Overwhelmed' || checkIn.mood === 'Worried') {
    return {
      currentAction:
        'Take two minutes to slow your breathing, then write one sentence about what feels loudest.',
      source: "Today's Check-In",
      status: 'pending',
      updatedAt: now,
    };
  }

  if (checkIn.sleepQuality === 'Poor' || checkIn.sleepQuality === 'Very poor') {
    return {
      currentAction:
        'Keep today lighter where possible and note one thing that affected your sleep.',
      source: "Today's Check-In",
      status: 'pending',
      updatedAt: now,
    };
  }

  if (
    steps >= 8000 &&
    (checkIn.energyLevel === 'Drained' || checkIn.energyLevel === 'Low')
  ) {
    return {
      currentAction:
        'You have moved a lot today — prioritize rest and hydration before adding more activity.',
      source: "Today's Check-In",
      status: 'pending',
      updatedAt: now,
    };
  }

  if (checkIn.energyLevel === 'Drained') {
    return {
      currentAction:
        'Choose one low-effort task and one recovery action before adding more to your day.',
      source: "Today's Check-In",
      status: 'pending',
      updatedAt: now,
    };
  }

  if (
    steps > 0 &&
    steps < 3000 &&
    (checkIn.energyLevel === 'High' || checkIn.energyLevel === 'Steady')
  ) {
    return {
      currentAction:
        'Take a 5-minute gentle walk or stretch break — light movement may support your energy today.',
      source: "Today's Check-In",
      status: 'pending',
      updatedAt: now,
    };
  }

  if (steps > 0 && steps < goal && checkIn.energyLevel !== 'Low') {
    return {
      currentAction:
        'Add a short easy walk when you can — you are below your usual movement rhythm for today.',
      source: "Today's Check-In",
      status: 'pending',
      updatedAt: now,
    };
  }

  if (steps >= goal && checkIn.hydration !== 'Yes') {
    return {
      currentAction:
        'You have been moving well today — pair that with a glass of water and a brief pause.',
      source: "Today's Check-In",
      status: 'pending',
      updatedAt: now,
    };
  }

  if (symptoms.includes('headache')) {
    return {
      currentAction:
        'Note when the headache started, its intensity, and any triggers you noticed.',
      source: "Today's Check-In",
      status: 'pending',
      updatedAt: now,
    };
  }

  if (symptoms.includes('stomach')) {
    return {
      currentAction:
        'Write down timing, recent food, pain level, and whether symptoms are getting better or worse.',
      source: "Today's Check-In",
      status: 'pending',
      updatedAt: now,
    };
  }

  if (checkIn.medicationTaken === 'Needed but not yet') {
    return {
      currentAction:
        'Check your medication instructions or contact a clinician/pharmacist if you are unsure.',
      source: "Today's Check-In",
      status: 'pending',
      updatedAt: now,
    };
  }

  return {
    currentAction: 'Pick one small health-supportive step you can complete in the next 10 minutes.',
    source: "Today's Check-In",
    status: 'pending',
    updatedAt: now,
  };
}

export const ADJUSTED_ACTIONS: Record<string, string> = {
  'two-minutes': 'Spend just 2 minutes on a smaller version of this step — that still counts.',
  'later-today': 'Save this step for later today and set a gentle reminder for yourself.',
  note: 'Turn this into a short note about what you noticed instead of a full task.',
  'different-step': 'Pick a different gentle step: drink water, stretch, or write one sentence about how you feel.',
};
