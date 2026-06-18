import type { CuravonCollection, CuravonDataEntity, DataQuery } from './dataTypes';

export interface DataAdapter {
  getItem<T extends CuravonDataEntity>(
    collection: CuravonCollection,
    id: string,
    query?: Pick<DataQuery, 'userId'>,
  ): Promise<T | null>;
  listItems<T extends CuravonDataEntity>(
    collection: CuravonCollection,
    query?: DataQuery,
  ): Promise<T[]>;
  createItem<T extends CuravonDataEntity>(
    collection: CuravonCollection,
    data: Omit<T, 'createdAt' | 'updatedAt'>,
  ): Promise<T>;
  updateItem<T extends CuravonDataEntity>(
    collection: CuravonCollection,
    id: string,
    patch: Partial<T>,
    query?: Pick<DataQuery, 'userId'>,
  ): Promise<T | null>;
  deleteItem(
    collection: CuravonCollection,
    id: string,
    query?: Pick<DataQuery, 'userId'>,
  ): Promise<boolean>;
  clearCollection(collection: CuravonCollection): Promise<void>;
  clearUserData(userId: string): Promise<void>;
  exportUserData(userId: string): Promise<Record<string, unknown>>;
}
