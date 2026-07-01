import type { CrawlStorage, RawPageRecord, StoredProperty } from '../interfaces/storage';
import type { ExtractedListing } from '../types/property';

export class InMemoryCrawlStorage implements CrawlStorage {
  rawPages: RawPageRecord[] = [];
  extractionRows: Array<ExtractedListing & { jobId: string; pageId: string }> = [];
  propertyRows: StoredProperty[] = [];
  logRows: Array<{ level: string; message: string; meta?: Record<string, unknown>; at: string }> = [];

  raw = {
    append: async (page: RawPageRecord) => {
      this.rawPages.push(structuredClone(page));
    },
    get: async (id: string) => this.rawPages.find((p) => p.id === id) ?? null,
    listByJob: async (jobId: string, opts?: { limit?: number; offset?: number }) => {
      const rows = this.rawPages.filter((p) => p.jobId === jobId);
      const offset = opts?.offset ?? 0;
      return rows.slice(offset, offset + (opts?.limit ?? rows.length));
    },
  };

  extractions = {
    append: async (row: ExtractedListing & { jobId: string; pageId: string }) => {
      this.extractionRows.push(structuredClone(row));
    },
    listByJob: async (jobId: string) =>
      this.extractionRows.filter((r) => r.jobId === jobId).map((r) => {
        const { jobId: _j, pageId: _p, ...rest } = r;
        return rest;
      }),
  };

  properties = {
    save: async (p: StoredProperty) => {
      this.propertyRows.push(structuredClone(p));
    },
    saveBatch: async (ps: StoredProperty[]) => {
      this.propertyRows.push(...ps.map((p) => structuredClone(p)));
    },
    findByExternalId: async (siteKey: string, externalId: string) =>
      this.propertyRows.find((p) => p.sourceSite === siteKey && p.externalId === externalId) ?? null,
    findByUrl: async (url: string) => this.propertyRows.find((p) => p.sourceUrl === url || p.detailUrl === url) ?? null,
  };

  logs = {
    log: async (level: 'info' | 'warn' | 'error', message: string, meta?: Record<string, unknown>) => {
      this.logRows.push({ level, message, meta, at: new Date().toISOString() });
    },
    listErrors: async (jobId: string) =>
      this.logRows
        .filter((l) => l.level === 'error' && l.meta?.jobId === jobId)
        .map((l) => ({ message: l.message, meta: l.meta, at: l.at })),
  };
}
