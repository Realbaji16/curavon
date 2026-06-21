import type { DoctorSummaryDraft, DoctorSummaryItem, RedFlagLog } from '../types/doctorSummary';

import { collectSafetyFromRedFlag } from './metaSystem';

import {

  clearDoctorSummaryDraftsRemote,

  clearDoctorSummaryItemsRemote,

  clearRedFlagLogsRemote,

  fetchDoctorSummaryDrafts,

  fetchDoctorSummaryItems,

  fetchRedFlagLogs,

  saveDoctorSummaryDraftRecord,

  saveDoctorSummaryItemRecord,

  saveRedFlagLogRecord,

} from '../lib/data/productDataService';



export async function loadDoctorSummaryItems(): Promise<DoctorSummaryItem[]> {

  return fetchDoctorSummaryItems();

}



export async function saveDoctorSummaryItem(item: DoctorSummaryItem): Promise<void> {

  await saveDoctorSummaryItemRecord(item);

}



export async function loadDoctorSummaryDrafts(): Promise<DoctorSummaryDraft[]> {

  return fetchDoctorSummaryDrafts();

}



export async function saveDoctorSummaryDraft(draft: DoctorSummaryDraft): Promise<void> {

  await saveDoctorSummaryDraftRecord(draft);

}



export async function loadRedFlagLogs(): Promise<RedFlagLog[]> {

  return fetchRedFlagLogs();

}



export async function clearDoctorSummaryStorage(): Promise<void> {

  await Promise.all([

    clearDoctorSummaryItemsRemote(),

    clearDoctorSummaryDraftsRemote(),

    clearRedFlagLogsRemote(),

  ]);

}



export async function addDoctorSummaryItem(

  item: Omit<DoctorSummaryItem, 'id' | 'createdAt'>,

): Promise<DoctorSummaryItem> {

  const entry: DoctorSummaryItem = {

    ...item,

    id: `dsi-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,

    createdAt: new Date().toISOString(),

  };

  await saveDoctorSummaryItemRecord(entry);

  return entry;

}



export async function addRedFlagLog(

  log: Omit<RedFlagLog, 'id' | 'createdAt'>,

): Promise<RedFlagLog> {

  const entry: RedFlagLog = {

    ...log,

    id: `rfl-${Date.now()}`,

    createdAt: new Date().toISOString(),

  };

  await saveRedFlagLogRecord(entry);

  collectSafetyFromRedFlag(entry);

  return entry;

}


