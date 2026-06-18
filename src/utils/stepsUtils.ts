export const DEFAULT_STEPS_GOAL = 6000;

export const STEPS_BAND_OPTIONS = [
  'Under 2,000',
  '2,000 – 5,000',
  '5,000 – 8,000',
  'Over 8,000',
  'Not sure',
] as const;

export type StepsBand = (typeof STEPS_BAND_OPTIONS)[number];

const STEPS_BAND_VALUES: Record<StepsBand, number> = {
  'Under 2,000': 1500,
  '2,000 – 5,000': 3500,
  '5,000 – 8,000': 6500,
  'Over 8,000': 9000,
  'Not sure': 0,
};

export function stepsBandToCount(band: string, fallback = 0): number {
  if (band in STEPS_BAND_VALUES) {
    const value = STEPS_BAND_VALUES[band as StepsBand];
    return value > 0 ? value : fallback;
  }
  return fallback;
}

export function formatStepCount(steps: number): string {
  if (steps <= 0) return '0';
  if (steps >= 1000) {
    const rounded = steps >= 10000 ? Math.round(steps / 1000) : (steps / 1000).toFixed(1).replace(/\.0$/, '');
    return `${rounded}k`;
  }
  return steps.toLocaleString();
}

export function formatStepCountFull(steps: number): string {
  return steps.toLocaleString();
}

export function stepsProgress(steps: number, goal: number): number {
  if (goal <= 0) return 0;
  return Math.min(100, Math.round((steps / goal) * 100));
}
