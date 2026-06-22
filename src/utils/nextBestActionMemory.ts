import type { DoctorSummaryItem, RedFlagLog } from '../types/doctorSummary';
import type { FollowUpRecord } from '../lib/followUp/followUpTypes';
import type { PersonalizationMemorySnapshot } from '../types/nextBestAction';
import { createDefaultHealthProfile, normalizeHealthProfile } from './healthUtils';
import type { GuideResultRecord } from './guideResultStorage';

export type CuravonMemoryProductInputs = Pick<
  PersonalizationMemorySnapshot,
  'doctorSummaryItems' | 'askHistory' | 'redFlagLogs' | 'followUps' | 'guideResults'
>;

export type CuravonMemoryCoreInputs = Pick<
  PersonalizationMemorySnapshot,
  'healthProfile' | 'dailyCheckins' | 'nextActionState' | 'askHistory'
>;

export function readCuravonMemorySnapshot(
  core?: CuravonMemoryCoreInputs,
  product?: CuravonMemoryProductInputs,
): PersonalizationMemorySnapshot {
  return {
    healthProfile: core?.healthProfile
      ? normalizeHealthProfile(core.healthProfile)
      : createDefaultHealthProfile(),
    dailyCheckins: core?.dailyCheckins ?? [],
    nextActionState: core?.nextActionState ?? null,
    askHistory: core?.askHistory ?? product?.askHistory ?? [],
    doctorSummaryItems: product?.doctorSummaryItems ?? [],
    redFlagLogs: product?.redFlagLogs ?? [],
    followUps: product?.followUps ?? [],
    guideResults: product?.guideResults ?? [],
  };
}

export type { GuideResultRecord, DoctorSummaryItem, RedFlagLog, FollowUpRecord };
