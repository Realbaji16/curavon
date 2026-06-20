import type { AskHistoryEntry } from '../../types/askIntake';
import type { DailyCheckIn } from '../../types/health';

let contextCheckins: DailyCheckIn[] = [];
let contextAskHistory: AskHistoryEntry[] = [];

export function setMetaSystemHealthContext(input: {
  checkins?: DailyCheckIn[];
  askHistory?: AskHistoryEntry[];
}) {
  if (input.checkins) contextCheckins = input.checkins;
  if (input.askHistory) contextAskHistory = input.askHistory;
}

export function getMetaSystemCheckins(): DailyCheckIn[] {
  return contextCheckins;
}

export function getMetaSystemAskHistory(): AskHistoryEntry[] {
  return contextAskHistory;
}

export function resetMetaSystemContextForTests() {
  contextCheckins = [];
  contextAskHistory = [];
}
