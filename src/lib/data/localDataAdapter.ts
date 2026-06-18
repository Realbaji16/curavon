import { APP_STORAGE_KEYS, CORE_HEALTH_DATA_KEYS } from './storageKeys';
import { safeRead, safeRemove, safeWrite } from '../../utils/healthStorage';
import type { CuravonCollection, CuravonDataEntity, DataQuery } from './dataTypes';
import type { DataAdapter } from './dataAdapter';

type ScopedStore<T> = Record<string, T[]>;
const LOCAL_ANON_USER_ID = 'local-anon-user';

const COLLECTION_KEYS: Record<CuravonCollection, string> = {
  health_profile: 'curavon_collection_health_profile',
  daily_checkins: 'curavon_collection_daily_checkins',
  ask_history: 'curavon_collection_ask_history',
  doctor_summary_items: 'curavon_collection_doctor_summary_items',
  doctor_summary_drafts: 'curavon_collection_doctor_summary_drafts',
  next_action_state: 'curavon_collection_next_action_state',
  red_flag_logs: 'curavon_collection_red_flag_logs',
  follow_ups: 'curavon_collection_follow_ups',
  memory_snapshot: 'curavon_collection_memory_snapshot',
  ai_usage_log: 'curavon_collection_ai_usage_log',
  guide_results: 'curavon_collection_guide_results',
  user_preferences: 'curavon_collection_user_preferences',
};

const LEGACY_FALLBACK_KEYS: Partial<Record<CuravonCollection, string>> = {
  health_profile: APP_STORAGE_KEYS.healthProfile,
  daily_checkins: APP_STORAGE_KEYS.dailyCheckins,
  ask_history: APP_STORAGE_KEYS.askHistory,
  doctor_summary_items: APP_STORAGE_KEYS.doctorSummaryItems,
  doctor_summary_drafts: APP_STORAGE_KEYS.doctorSummaryDrafts,
  next_action_state: APP_STORAGE_KEYS.nextActionState,
  red_flag_logs: APP_STORAGE_KEYS.redFlagLogs,
  follow_ups: APP_STORAGE_KEYS.followUps,
  memory_snapshot: APP_STORAGE_KEYS.healthSnapshot,
  ai_usage_log: APP_STORAGE_KEYS.aiUsageLog,
  guide_results: APP_STORAGE_KEYS.guideResults,
  user_preferences: APP_STORAGE_KEYS.userPreferences,
};

function resolveUserId(queryUserId?: string): string {
  return queryUserId?.trim() || safeRead<string>(APP_STORAGE_KEYS.authDemoUserId, '') || LOCAL_ANON_USER_ID;
}

function readScoped<T extends CuravonDataEntity>(collection: CuravonCollection): ScopedStore<T> {
  return safeRead<ScopedStore<T>>(COLLECTION_KEYS[collection], {});
}

function writeScoped<T extends CuravonDataEntity>(collection: CuravonCollection, value: ScopedStore<T>) {
  safeWrite(COLLECTION_KEYS[collection], value);
}

function normalizeLegacy<T extends CuravonDataEntity>(value: unknown, userId: string): T[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
      .map((item) => ({
        ...(item as object),
        userId: typeof item.userId === 'string' ? item.userId : userId,
        createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
        updatedAt: typeof item.updatedAt === 'string' ? item.updatedAt : new Date().toISOString(),
      })) as T[];
  }
  if (value && typeof value === 'object') {
    return [
      {
        ...(value as object),
        id: typeof (value as Record<string, unknown>).id === 'string'
          ? ((value as Record<string, unknown>).id as string)
          : 'legacy-singleton',
        userId,
        createdAt:
          typeof (value as Record<string, unknown>).createdAt === 'string'
            ? ((value as Record<string, unknown>).createdAt as string)
            : new Date().toISOString(),
        updatedAt:
          typeof (value as Record<string, unknown>).updatedAt === 'string'
            ? ((value as Record<string, unknown>).updatedAt as string)
            : new Date().toISOString(),
      } as T,
    ];
  }
  return [];
}

async function listWithLegacyFallback<T extends CuravonDataEntity>(
  collection: CuravonCollection,
  query: DataQuery,
): Promise<T[]> {
  const scoped = readScoped<T>(collection);
  const current = scoped[query.userId] ?? [];
  if (current.length > 0) {
    return query.includeDeleted ? current : current.filter((item) => !item.deletedAt);
  }
  const legacyKey = LEGACY_FALLBACK_KEYS[collection];
  if (!legacyKey) return [];
  const legacy = normalizeLegacy<T>(safeRead(legacyKey, []), query.userId);
  return query.includeDeleted ? legacy : legacy.filter((item) => !item.deletedAt);
}

export function createLocalDataAdapter(): DataAdapter {
  return {
    async getItem<T extends CuravonDataEntity>(
      collection: CuravonCollection,
      id: string,
      query?: Pick<DataQuery, 'userId'>,
    ) {
      const items = await listWithLegacyFallback<T>(collection, {
        userId: resolveUserId(query?.userId),
        includeDeleted: true,
      });
      return (items.find((item) => item.id === id) ?? null) as T | null;
    },

    async listItems<T extends CuravonDataEntity>(collection: CuravonCollection, query?: DataQuery) {
      const nextQuery: DataQuery = {
        userId: resolveUserId(query?.userId),
        includeDeleted: query?.includeDeleted,
        limit: query?.limit,
      };
      const items = await listWithLegacyFallback<T>(collection, nextQuery);
      if (!nextQuery.limit || nextQuery.limit <= 0) return items;
      return items.slice(0, nextQuery.limit) as T[];
    },

    async createItem<T extends CuravonDataEntity>(
      collection: CuravonCollection,
      data: Omit<T, 'createdAt' | 'updatedAt'>,
    ) {
      const scoped = readScoped<T>(collection);
      const userId = resolveUserId(data.userId);
      const userItems = scoped[userId] ?? [];
      const now = new Date().toISOString();
      const record: T = {
        ...data,
        id:
          typeof data.id === 'string' && data.id.trim().length > 0
            ? data.id
            : `local-${collection}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        userId,
        createdAt: now,
        updatedAt: now,
      } as T;
      writeScoped(collection, {
        ...scoped,
        [userId]: [record, ...userItems],
      });
      return record;
    },

    async updateItem<T extends CuravonDataEntity>(
      collection: CuravonCollection,
      id: string,
      patch: Partial<T>,
      query?: Pick<DataQuery, 'userId'>,
    ) {
      const scoped = readScoped<T>(collection);
      const userId = resolveUserId(query?.userId);
      const userItems = scoped[userId] ?? [];
      let hit = false;
      const nextItems = userItems.map((item) => {
        if (item.id !== id) return item;
        hit = true;
        return {
          ...item,
          ...patch,
          updatedAt: new Date().toISOString(),
        };
      });
      if (!hit) return null;
      writeScoped(collection, { ...scoped, [userId]: nextItems });
      return (nextItems.find((item) => item.id === id) ?? null) as T | null;
    },

    async deleteItem(collection, id, query?) {
      const updated = await this.updateItem(
        collection,
        id,
        { deletedAt: new Date().toISOString() } as Partial<CuravonDataEntity>,
        query,
      );
      return Boolean(updated);
    },

    async clearCollection(collection) {
      safeRemove(COLLECTION_KEYS[collection]);
      const legacyKey = LEGACY_FALLBACK_KEYS[collection];
      if (legacyKey) safeRemove(legacyKey);
    },

    async clearUserData(userId) {
      Object.values(COLLECTION_KEYS).forEach((storageKey) => {
        const scoped = safeRead<ScopedStore<CuravonDataEntity>>(storageKey, {});
        if (!scoped[userId]) return;
        const next = { ...scoped };
        delete next[userId];
        safeWrite(storageKey, next);
      });

      // Compatibility clear only for the currently signed-in local user.
      const activeUserId = resolveUserId(undefined);
      if (userId === activeUserId || (userId === LOCAL_ANON_USER_ID && activeUserId === LOCAL_ANON_USER_ID)) {
        CORE_HEALTH_DATA_KEYS.forEach(safeRemove);
      }
    },

    async exportUserData(userId) {
      const payload: Record<string, unknown> = {
        exportedAt: new Date().toISOString(),
        userId,
        mode: 'local_demo',
        collections: {},
      };

      const entries = await Promise.all(
        (Object.keys(COLLECTION_KEYS) as CuravonCollection[]).map(async (collection) => {
          const items = await listWithLegacyFallback(collection, {
            userId,
            includeDeleted: true,
          });
          return [collection, items] as const;
        }),
      );
      payload.collections = Object.fromEntries(entries);

      return payload;
    },
  };
}
