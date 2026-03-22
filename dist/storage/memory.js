"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryStorageAdapter = void 0;
class MemoryStorageAdapter {
    records = [];
    async append(records) {
        this.records.push(...records);
    }
    async query(filters) {
        return this.records.filter(record => {
            if (filters.from && record.timestamp < filters.from)
                return false;
            if (filters.to && record.timestamp > filters.to)
                return false;
            if (filters.tags) {
                for (const [key, value] of Object.entries(filters.tags)) {
                    if (record.tags[key] !== value)
                        return false;
                }
            }
            if (filters.models && !filters.models.includes(record.model))
                return false;
            if (filters.providers && !filters.providers.includes(record.provider))
                return false;
            return true;
        });
    }
    async purge(filters) {
        const toRemove = await this.query(filters);
        const removeSet = new Set(toRemove);
        const originalLength = this.records.length;
        this.records = this.records.filter(r => !removeSet.has(r));
        return originalLength - this.records.length;
    }
    async close() {
        this.records = [];
    }
}
exports.MemoryStorageAdapter = MemoryStorageAdapter;
//# sourceMappingURL=memory.js.map