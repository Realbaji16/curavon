import { describe, expect, it } from 'vitest';
import { buildNextBestActionPlan } from '../utils/nextBestActionEngine';
import { readCuravonMemorySnapshot } from '../utils/nextBestActionMemory';
import { todayDateKey } from '../utils/healthUtils';
import type { HealthSnapshot } from '../types/healthSnapshot';

const baseProfile = {
  preferredName: 'Alex',
  primaryGoals: ['Reduce health overwhelm', 'Track symptoms clearly'],
  sensitiveMode: false,
  smartSilencePreference: 'gentle-reminders' as const,
  conditions: ['Migraine'],
  medications: ['Ibuprofen'],
  allergies: [],
  healthNotes: ['Morning headaches'],
  doctorQuestions: ['Should I track sleep?'],
  emergencyContactName: '',
  emergencyContactPhone: '',
};

describe('supporting insights', () => {
  it('reflects today check-in metrics and profile context', () => {
    const memory = readCuravonMemorySnapshot(
      {
        healthProfile: baseProfile,
        dailyCheckins: [
          {
            id: 'c1',
            date: todayDateKey(),
            sleepQuality: 'Poor',
            energyLevel: 'Low',
            stressLevel: 'Stressed',
            mood: 'Worried',
            symptoms: 'Headache behind eyes',
            painLevel: 4,
            hydration: 'Low',
            medicationTaken: 'None',
            notes: 'Felt worse after lunch',
            createdAt: new Date().toISOString(),
          },
        ],
        nextActionState: null,
        askHistory: [],
      },
      {
        doctorSummaryItems: [],
        askHistory: [],
        redFlagLogs: [],
        followUps: [],
        guideResults: [],
      },
    );

    const plan = buildNextBestActionPlan(memory);
    const titles = plan.supportingInsights.map((card) => card.id);

    expect(titles).toContain('today-checkin');
    expect(titles).toContain('profile-context');
    expect(plan.supportingInsights.find((card) => card.id === 'today-checkin')?.lines[0]).toMatch(
      /Sleep: Poor/,
    );
    expect(plan.supportingInsights.find((card) => card.id === 'profile-context')?.lines[0]).toMatch(
      /Goals:/,
    );
    expect(plan.supportingInsights.every((card) => !card.actionLabel && !card.actionTarget)).toBe(
      true,
    );
  });

  it('includes recent Ask, guide, and doctor summary details', () => {
    const memory = readCuravonMemorySnapshot(
      {
        healthProfile: baseProfile,
        dailyCheckins: [],
        nextActionState: {
          currentAction: 'Drink water before bed',
          title: 'Hydration step',
          reason: 'Sleep looked low',
          category: 'sleep_energy',
          status: 'done',
          updatedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
        },
        askHistory: [
          {
            id: 'ask-1',
            concern: 'I keep waking up with headaches',
            concernType: 'Physical symptom',
            nextStep: 'Track sleep and hydration for three days',
            createdAt: new Date().toISOString(),
            savedToDoctorSummary: false,
          },
        ],
      },
      {
        doctorSummaryItems: [
          {
            id: 'item-1',
            type: 'next_action',
            source: 'Next Action',
            title: 'Completed next action',
            content: 'Action: Drink water before bed',
            tags: ['next-action'],
            severity: 'normal',
            createdAt: new Date().toISOString(),
            includedInSummary: true,
          },
        ],
        askHistory: [],
        redFlagLogs: [],
        followUps: [],
        guideResults: [
          {
            guideId: 'headache',
            guideTitle: 'Headache check-in',
            completedAt: new Date().toISOString(),
            resultSummary: 'Hydration and rest may help today.',
            safeNextStep: 'Sip water and rest for 10 minutes',
            safetyLevel: 'normal',
            sourceSignals: [],
          },
        ],
      },
    );

    const snapshot: HealthSnapshot = {
      updatedAt: new Date().toISOString(),
      currentState: {
        moodTrend: 'stable',
        energyTrend: 'declining',
        stressTrend: 'stable',
        sleepTrend: 'declining',
      },
      activeConcerns: {
        repeatingSymptoms: ['headache'],
        unresolvedAskConcerns: ['I keep waking up with headaches'],
        blockedActions: 0,
      },
      riskSignals: {
        repeatedRedFlags: false,
        increasingSymptomFrequency: true,
        worseningCheckinPatterns: false,
      },
      engagementSignals: {
        missedCheckins: 1,
        frequentAskUsage: true,
        repeatedBlockedActions: false,
      },
      profileContext: {
        goalCount: 2,
        hasMedications: true,
        hasConditions: true,
        primaryGoalsSummary: 'Reduce health overwhelm',
      },
      followUpSignals: {
        recentHelped: 0,
        recentBlocked: 0,
        recentWorse: 0,
        recentNotDone: 0,
        repeatedBlocked: false,
        repeatedWorse: false,
      },
      guideActivity: {
        recentGuideTitles: ['Headache check-in'],
        recentGuideCount: 1,
      },
      safetySignalSummary: 'No urgent pattern',
      recentBlockers: [],
      recommendedFocusArea: 'symptom_tracking',
      trendSummary: 'Sleep and symptoms need tracking this week.',
    };

    const plan = buildNextBestActionPlan(memory, snapshot);
    const byId = Object.fromEntries(plan.supportingInsights.map((card) => [card.id, card]));

    expect(byId['recent-ask']?.lines[0]).toMatch(/headaches/i);
    expect(plan.supportingInsights.some((card) => card.id === 'action-status')).toBe(true);
    expect(plan.supportingInsights.some((card) => card.id === 'recent-ask')).toBe(true);
    expect(plan.supportingInsights.every((card) => card.id !== 'no-checkin')).toBe(true);
    expect(plan.supportingInsights.every((card) => card.actionTarget !== 'checkin')).toBe(true);
  });

  it('handles legacy profiles missing newer optional fields', () => {
    const legacyProfile = {
      preferredName: 'Alex',
      primaryGoals: ['Reduce health overwhelm'],
      sensitiveMode: false,
      smartSilencePreference: 'gentle-reminders' as const,
      conditions: ['Migraine'],
      medications: [],
      allergies: [],
      healthNotes: [],
      doctorQuestions: [],
      emergencyContactName: '',
      emergencyContactPhone: '',
    };

    const memory = readCuravonMemorySnapshot(
      {
        healthProfile: legacyProfile,
        dailyCheckins: [],
        nextActionState: null,
        askHistory: [],
      },
      {
        doctorSummaryItems: [],
        askHistory: [],
        redFlagLogs: [],
        followUps: [],
        guideResults: [],
      },
    );

    expect(() => buildNextBestActionPlan(memory)).not.toThrow();
    expect(memory.healthProfile.stateOrRegion).toBe('');
    expect(memory.healthProfile.ageRange).toBe('');
  });
});
