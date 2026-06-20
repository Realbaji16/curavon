import type { AskIntakeSession, CreateAskIntakeSessionInput, UpdateAskIntakeSessionInput } from '../lib/data/dataTypes';
import {
  createAskIntakeSessionRecord,
  updateAskIntakeSessionRecord,
} from '../lib/data/productDataService';

export async function createAskIntakeSession(
  input: CreateAskIntakeSessionInput,
): Promise<AskIntakeSession> {
  return createAskIntakeSessionRecord(input);
}

export async function updateAskIntakeSession(
  id: string,
  input: UpdateAskIntakeSessionInput,
): Promise<AskIntakeSession> {
  return updateAskIntakeSessionRecord(id, input);
}
