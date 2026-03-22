import type { StorageAdapter, CostRecord, QueryFilters } from '../types';
export declare class MemoryStorageAdapter implements StorageAdapter {
    private records;
    append(records: CostRecord[]): Promise<void>;
    query(filters: QueryFilters): Promise<CostRecord[]>;
    purge(filters: QueryFilters): Promise<number>;
    close(): Promise<void>;
}
//# sourceMappingURL=memory.d.ts.map