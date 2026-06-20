import { beforeEach, describe, expect, it } from 'vitest';

import { scheduleFollowUpForAction } from '../lib/followUp/followUpScheduler';
import { resetFollowUpsCacheForTests, getFollowUps } from '../lib/followUp/followUpStorage';
import type { AcceptedActionSource } from '../types/actionLifecycle';
import { isPreviewActionSource } from '../types/actionLifecycle';
import { clearLocalStorage } from './testUtils';

function acceptedAskAction(actionId = 'ask-v2-demo-action') {
  return {
    acceptanceSource: 'ask_promoted' as const,
    action: {
      actionId,
      title: 'Take a short walk',
      category: 'movement',
      safetyLevel: 'normal' as const,
    },
    context: { entryId: 'ask-entry-1' },
  };
}

describe('follow-up acceptance lifecycle', () => {
  beforeEach(() => {
    clearLocalStorage();
    resetFollowUpsCacheForTests();
  });

  it('treats ask_preview as preview-only and never schedules', () => {
    expect(isPreviewActionSource('ask_preview')).toBe(true);

    const result = scheduleFollowUpForAction({
      acceptanceSource: 'ask_preview' as unknown as AcceptedActionSource,
      action: {
        actionId: 'ask-v2-preview',
        title: 'Preview action',
        category: 'stabilize',
        safetyLevel: 'normal',
      },
      context: { entryId: 'ask-entry-preview' },
    });

    expect(result.status).toBe('skipped');
    expect(result.reason).toBe('preview_action');
    expect(getFollowUps()).toHaveLength(0);
  });

  it('does not schedule follow-up for ask result preview path (no acceptance call)', () => {
    expect(getFollowUps()).toHaveLength(0);
  });

  it('schedules exactly one follow-up when ask action is promoted to Today', () => {
    const input = acceptedAskAction();
    const first = scheduleFollowUpForAction(input);
    const second = scheduleFollowUpForAction(input);

    expect(first.status).toBe('created');
    expect(second.status).toBe('existing');
    expect(getFollowUps()).toHaveLength(1);
    expect(getFollowUps()[0]?.actionId).toBe('ask-v2-demo-action');
  });

  it('double Add to Today does not duplicate follow-up for same stable actionId', () => {
    const input = acceptedAskAction('ask-v2-stable-id');
    scheduleFollowUpForAction(input);
    scheduleFollowUpForAction(input);
    scheduleFollowUpForAction(input);

    expect(getFollowUps().filter((item) => item.status === 'pending')).toHaveLength(1);
  });

  it('doctor summary save path does not schedule follow-up', () => {
    const result = scheduleFollowUpForAction({
      acceptanceSource: 'doctor_summary_note' as unknown as AcceptedActionSource,
      action: {
        actionId: 'summary-only',
        title: 'Saved note',
        category: 'general',
        safetyLevel: 'normal',
      },
    });

    expect(result.status).toBe('skipped');
    expect(result.reason).toBe('preview_action');
    expect(getFollowUps()).toHaveLength(0);
  });

  it('skips follow-up for urgent ask-style actions', () => {
    const result = scheduleFollowUpForAction({
      acceptanceSource: 'ask_promoted',
      action: {
        actionId: 'ask-v2-urgent',
        title: 'Seek urgent care',
        category: 'escalate',
        safetyLevel: 'urgent',
      },
    });

    expect(result.status).toBe('skipped');
    expect(result.reason).toBe('urgent_or_escalate');
    expect(getFollowUps()).toHaveLength(0);
  });

  it('skips follow-up for urgent/escalate even when accepted', () => {
    const result = scheduleFollowUpForAction({
      acceptanceSource: 'today',
      action: {
        actionId: 'accepted-urgent',
        title: 'Escalate review',
        category: 'escalate',
        safetyLevel: 'urgent',
      },
    });

    expect(result.status).toBe('skipped');
    expect(result.reason).toBe('urgent_or_escalate');
  });

  it('guide completed accepted action still schedules one safe follow-up', () => {
    const input = {
      acceptanceSource: 'guide_completed' as const,
      action: {
        actionId: 'guide-v2-sleep-check',
        title: 'Wind down earlier',
        category: 'sleep',
        safetyLevel: 'normal' as const,
      },
      context: { guideId: 'mood-stress-checkin' },
    };

    const result = scheduleFollowUpForAction(input);
    expect(result.status).toBe('created');
    expect(getFollowUps()).toHaveLength(1);
  });

  it('activity insight refresh path does not schedule follow-up', () => {
    const result = scheduleFollowUpForAction({
      acceptanceSource: 'activity_insight' as unknown as AcceptedActionSource,
      action: {
        actionId: 'insight-pref',
        title: 'Prefer smaller steps',
        category: 'general',
        safetyLevel: 'normal',
      },
    });

    expect(result.status).toBe('skipped');
    expect(result.reason).toBe('preview_action');
  });
});

describe('acceptanceSourceFromPlanTrigger', () => {
  it('maps plan triggers to accepted sources', async () => {
    const { acceptanceSourceFromPlanTrigger } = await import('../types/actionLifecycle');
    expect(acceptanceSourceFromPlanTrigger('checkin_completed', 'today')).toBe('checkin_plan');
    expect(acceptanceSourceFromPlanTrigger('followup_requested', 'followup')).toBe('followup_adjusted');
    expect(acceptanceSourceFromPlanTrigger('manual_refresh', 'today')).toBe('manual_refresh');
    expect(acceptanceSourceFromPlanTrigger('initial_load', 'today')).toBe('today');
  });
});
