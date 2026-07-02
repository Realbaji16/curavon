import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdminClient } from '../supabase/adminClient';
import {
  createFormInsightRepository,
  type CreateImportBatchInput,
  type FormInsightRepository,
  type InsertFormInsightsInput,
  type InsertNormalizedResponsesInput,
  type LinkInsightsToModulesInput,
  type ListInsightsFilter,
  type PersistFormImportInput,
  type RecordReviewEventInput,
  type RepositoryResult,
} from '../form-insights/storage/formInsightRepository';
import type { FormInsightStatus } from '../form-insights/types';

function assertServerRuntime(): void {
  if (typeof window !== 'undefined') {
    throw new Error('Form insight repository is server-only.');
  }
}

function requireAdminClient(): SupabaseClient | RepositoryResult<never> {
  const client = getSupabaseAdminClient();
  if (!client) {
    return {
      ok: false,
      error: {
        code: 'not_configured',
        message: 'Supabase admin client is not configured for form insight persistence.',
      },
    };
  }
  return client;
}

function withAdminRepository<T>(
  operation: (repository: FormInsightRepository) => Promise<RepositoryResult<T>>,
): Promise<RepositoryResult<T>> {
  assertServerRuntime();
  const client = requireAdminClient();
  if (!('from' in client)) {
    return Promise.resolve(client);
  }
  return operation(createFormInsightRepository(client));
}

/** Server-only persistence for de-identified form insights (admin/service role). */
export async function createImportBatch(
  input: CreateImportBatchInput,
): Promise<RepositoryResult<import('../form-insights/storage/formInsightRepository').ImportBatchRecord>> {
  return withAdminRepository((repository) => repository.createImportBatch(input));
}

export async function insertNormalizedResponses(
  input: InsertNormalizedResponsesInput,
): Promise<RepositoryResult<import('../form-insights/storage/formInsightRepository').InsertNormalizedResponsesResult>> {
  return withAdminRepository((repository) => repository.insertNormalizedResponses(input));
}

export async function insertFormInsights(
  input: InsertFormInsightsInput,
): Promise<RepositoryResult<import('../form-insights/storage/formInsightRepository').InsertFormInsightsResult>> {
  return withAdminRepository((repository) => repository.insertFormInsights(input));
}

export async function linkInsightsToModules(
  input: LinkInsightsToModulesInput,
): Promise<RepositoryResult<import('../form-insights/storage/formInsightRepository').LinkInsightsToModulesResult>> {
  return withAdminRepository((repository) => repository.linkInsightsToModules(input));
}

export async function listInsights(
  filter?: ListInsightsFilter,
): Promise<RepositoryResult<import('../form-insights/types').FormInsight[]>> {
  return withAdminRepository((repository) => repository.listInsights(filter));
}

export async function getInsightById(
  insightId: string,
): Promise<RepositoryResult<import('../form-insights/types').FormInsight>> {
  return withAdminRepository((repository) => repository.getInsightById(insightId));
}

export async function updateInsightStatus(
  insightId: string,
  status: FormInsightStatus,
): Promise<RepositoryResult<import('../form-insights/types').FormInsight>> {
  return withAdminRepository((repository) => repository.updateInsightStatus(insightId, status));
}

export async function recordReviewEvent(
  input: RecordReviewEventInput,
): Promise<RepositoryResult<import('../form-insights/storage/formInsightRepository').RecordReviewEventResult>> {
  return withAdminRepository((repository) => repository.recordReviewEvent(input));
}

export async function persistFormImportResult(
  input: PersistFormImportInput,
): Promise<RepositoryResult<import('../form-insights/storage/formInsightRepository').PersistFormImportResult>> {
  return withAdminRepository((repository) => repository.persistFormImportResult(input));
}

export { createFormInsightRepository } from '../form-insights/storage/formInsightRepository';
export type {
  CreateImportBatchInput,
  FormInsightRepository,
  FormInsightRepositoryError,
  FormInsightRepositoryErrorCode,
  ImportBatchRecord,
  InsertFormInsightsInput,
  InsertFormInsightsResult,
  InsertNormalizedResponsesInput,
  InsertNormalizedResponsesResult,
  LinkInsightsToModulesInput,
  LinkInsightsToModulesResult,
  ListInsightsFilter,
  PersistFormImportInput,
  PersistFormImportResult,
  RecordReviewEventInput,
  RecordReviewEventResult,
  RepositoryResult,
} from '../form-insights/storage/formInsightRepository';
