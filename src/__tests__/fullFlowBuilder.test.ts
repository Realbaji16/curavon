import { describe, expect, it } from 'vitest';
import { buildFullFlowModel } from '../lib/plan/fullFlowBuilder';
import type { NextActionState } from '../types/health';

function baseAction(overrides: Partial<NextActionState> = {}): NextActionState {
  return {
    currentAction: 'Take a short walk after lunch.',
    title: "Today's next step",
    reason: 'Movement may help steady energy.',
    source: 'today',
    category: 'stabilize',
    safetyLevel: 'normal',
    status: 'pending',
    updatedAt: new Date().toISOString(),
    actionId: 'action-test-1',
    ...overrides,
  };
}

describe('buildFullFlowModel', () => {
  it('returns fallback when no current action exists', () => {
    const model = buildFullFlowModel({ nextActionState: null });
    expect(model.source).toBe('fallback');
    expect(model.title).toContain('will appear here');
    expect(model.sections.some((s) => s.type === 'safety')).toBe(true);
  });

  it('builds context, focus, and current action for normal state', () => {
    const model = buildFullFlowModel({ nextActionState: baseAction() });
    expect(model.safetyLevel).toBe('normal');
    expect(model.sections.some((s) => s.type === 'context')).toBe(true);
    expect(model.sections.some((s) => s.type === 'current_action')).toBe(true);
    expect(model.sections.some((s) => s.type === 'next_step')).toBe(true);
  });

  it('shows urgent boundary first for urgent actions', () => {
    const model = buildFullFlowModel({
      nextActionState: baseAction({
        safetyLevel: 'urgent',
        category: 'escalate',
        currentAction: 'Seek urgent support for severe symptoms.',
      }),
    });
    expect(model.safetyLevel).toBe('urgent');
    expect(model.sections[0]?.type).toBe('urgent_boundary');
    expect(model.sections.some((s) => s.type === 'next_step')).toBe(false);
  });

  it('does not use diagnosis language in safety copy', () => {
    const model = buildFullFlowModel({ nextActionState: baseAction() });
    const allText = model.sections.map((s) => s.body).join(' ');
    expect(allText.toLowerCase()).not.toContain('diagnosis');
    expect(allText.toLowerCase()).not.toContain('you have');
  });
});
