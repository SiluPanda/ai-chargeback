import type { StorageAdapter, CostRecord, QueryFilters } from '../types';

export class MemoryStorageAdapter implements StorageAdapter {
  private records: CostRecord[] = [];

  async append(records: CostRecord[]): Promise<void> {
    this.records.push(...records);
  }

  async query(filters: QueryFilters): Promise<CostRecord[]> {
    return this.records.filter(record => {
      if (filters.from && record.timestamp < filters.from) return false;
      if (filters.to && record.timestamp > filters.to) return false;
      if (filters.tags) {
        for (const [key, value] of Object.entries(filters.tags)) {
          if (record.tags[key] !== value) return false;
        }
      }
      if (filters.models && !filters.models.includes(record.model)) return false;
      if (filters.providers && !filters.providers.includes(record.provider)) return false;
      return true;
    });
  }

  async purge(filters: QueryFilters): Promise<number> {
    const toRemove = await this.query(filters);
    const removeSet = new Set(toRemove);
    const originalLength = this.records.length;
    this.records = this.records.filter(r => !removeSet.has(r));
    return originalLength - this.records.length;
  }

  async close(): Promise<void> {
    this.records = [];
  }
}
