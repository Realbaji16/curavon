import { describe, expect, it } from 'vitest';
import { generateCuravonNextActionSync } from '../lib/plan/nextActionAdapter';
import { createDefaultHealthProfile } from '../utils/healthUtils';

const baseProfile = createDefaultHealthProfile();

describe('nextActionAdapter generateCuravonNextActionSync', () => {
  it('returns escalate/urgent safety override for chest pain without normal self-care', () => {
    const result = generateCuravonNextActionSync({
      source: 'today',
      snapshot: null,
      currentConcern: 'I have chest pain and trouble breathing',
      profile: baseProfile,
    });

    expect(result.safetyOverride).toBe(true);
    expect(result.category).toBe('escalate');
    expect(result.safetyLevel).toBe('urgent');
    expect(result.actionText.toLowerCase()).not.toMatch(/take two slow breaths|hydrate/);
    expect(result.selectedBy).toBe('rules');
    expect(result.planEngineReason).toBe('canonical_v3');
  });

  it('routes medication concerns toward prepare-safe language', () => {
    const result = generateCuravonNextActionSync({
      source: 'ask',
      snapshot: null,
      currentConcern: 'I have questions about my medication side effects',
      intakeResult: {
        concern: 'medication side effects',
        concernType: 'medication',
        redFlags: [],
      },
      profile: {
        ...baseProfile,
        medications: ['example med'],
      },
    });

    expect(result.category).toBe('prepare');
    const blob = `${result.actionText} ${result.reason}`.toLowerCase();
    expect(blob).not.toMatch(/start taking|stop taking|change your dose|\d+mg/);
    expect(blob).toMatch(/clinician|question|prepare|write/);
  });

  it('returns one deterministic action for vague normal concern without API key', () => {
    const result = generateCuravonNextActionSync({
      source: 'today',
      snapshot: null,
      currentConcern: 'I feel a bit tired today',
      profile: baseProfile,
    });

    expect(result.actionText.trim().length).toBeGreaterThan(10);
    expect(result.title.trim().length).toBeGreaterThan(3);
    expect(`${result.actionText} ${result.reason}`.toLowerCase()).not.toMatch(/you have|diagnosis|treatment plan/);
    expect(result.selectedBy === 'rules' || result.fallbackUsed).toBe(true);
    expect(result.planEngineReason).toBe('canonical_v3');
  });
});
