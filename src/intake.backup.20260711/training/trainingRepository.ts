import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import type { TrainingExportFormat } from '@/intake/training/types';

export interface TrainingListFilters {
  reviewed?: boolean;
  hasUserCorrections?: boolean;
  needType?: string;
  qualityFlag?: string;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  pageSize?: number;
}

export interface TrainingExampleSummary {
  id: string;
  sourceText: string;
  needType: string | null;
  publishedAt: string;
  reviewed: boolean;
  hasUserCorrections: boolean;
  correctionFields: string[];
  qualityFlags: string[];
  qualityScore: number | null;
  moderationLabel: string | null;
  serviceRequestId: string | null;
  categorySlug: string | null;
  city: string | null;
}

function entityString(entities: unknown, key: string): string | null {
  if (!entities || typeof entities !== 'object') return null;
  const v = (entities as Record<string, unknown>)[key];
  return typeof v === 'string' ? v : v != null ? String(v) : null;
}

function toSummary(row: {
  id: string;
  sourceText: string;
  needType: string | null;
  publishedAt: Date;
  reviewed: boolean;
  hasUserCorrections: boolean;
  correctionFields: string[];
  qualityFlags: string[];
  qualityScore: number | null;
  moderationLabel: string | null;
  serviceRequestId: string | null;
  finalEntities: unknown;
}): TrainingExampleSummary {
  return {
    id: row.id,
    sourceText: row.sourceText,
    needType: row.needType,
    publishedAt: row.publishedAt.toISOString(),
    reviewed: row.reviewed,
    hasUserCorrections: row.hasUserCorrections,
    correctionFields: row.correctionFields,
    qualityFlags: row.qualityFlags,
    qualityScore: row.qualityScore,
    moderationLabel: row.moderationLabel,
    serviceRequestId: row.serviceRequestId,
    categorySlug: entityString(row.finalEntities, 'categorySlug'),
    city: entityString(row.finalEntities, 'city'),
  };
}

function buildWhere(filters: TrainingListFilters): Prisma.IntakeTrainingExampleWhereInput {
  const where: Prisma.IntakeTrainingExampleWhereInput = {};
  if (filters.reviewed != null) where.reviewed = filters.reviewed;
  if (filters.hasUserCorrections != null) where.hasUserCorrections = filters.hasUserCorrections;
  if (filters.needType) where.needType = filters.needType;
  if (filters.qualityFlag) where.qualityFlags = { has: filters.qualityFlag };
  if (filters.search?.trim()) {
    where.sourceText = { contains: filters.search.trim(), mode: 'insensitive' };
  }
  if (filters.dateFrom || filters.dateTo) {
    where.publishedAt = {};
    if (filters.dateFrom) where.publishedAt.gte = filters.dateFrom;
    if (filters.dateTo) where.publishedAt.lte = filters.dateTo;
  }
  return where;
}

export async function listTrainingExamples(filters: TrainingListFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 25));
  const where = buildWhere(filters);

  const [rows, total] = await Promise.all([
    db.intakeTrainingExample.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        sourceText: true,
        needType: true,
        publishedAt: true,
        reviewed: true,
        hasUserCorrections: true,
        correctionFields: true,
        qualityFlags: true,
        qualityScore: true,
        moderationLabel: true,
        serviceRequestId: true,
        finalEntities: true,
      },
    }),
    db.intakeTrainingExample.count({ where }),
  ]);

  return {
    items: rows.map(toSummary),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getTrainingExampleById(id: string) {
  return db.intakeTrainingExample.findUnique({ where: { id } });
}

export async function updateTrainingExample(
  id: string,
  data: {
    reviewed?: boolean;
    qualityScore?: number | null;
    moderationLabel?: string | null;
    correctedEntities?: Prisma.InputJsonValue;
    reviewedBy?: string | null;
    reviewedAt?: Date | null;
  }
) {
  return db.intakeTrainingExample.update({
    where: { id },
    data,
  });
}

export async function buildTrainingStats() {
  const since7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [total, reviewed, withCorrections, last7d, correctionByField] = await Promise.all([
    db.intakeTrainingExample.count(),
    db.intakeTrainingExample.count({ where: { reviewed: true } }),
    db.intakeTrainingExample.count({ where: { hasUserCorrections: true } }),
    db.intakeTrainingExample.count({ where: { publishedAt: { gte: since7d } } }),
    db.intakeTrainingExample.findMany({
      where: { hasUserCorrections: true },
      select: { correctionFields: true },
    }),
  ]);

  const fieldCounts: Record<string, number> = {};
  for (const row of correctionByField) {
    for (const field of row.correctionFields) {
      fieldCounts[field] = (fieldCounts[field] ?? 0) + 1;
    }
  }

  const dailyRows = await db.$queryRaw<Array<{ day: string; count: bigint }>>`
    SELECT DATE("publishedAt") as day, COUNT(*)::bigint as count
    FROM "IntakeTrainingExample"
    WHERE "publishedAt" >= ${since7d}
    GROUP BY DATE("publishedAt")
    ORDER BY day ASC
  `;

  return {
    total,
    reviewed,
    goldDatasetSize: reviewed,
    withCorrections,
    correctionRate: total > 0 ? Math.round((withCorrections / total) * 1000) / 10 : 0,
    last7d,
    correctionByField: fieldCounts,
    dailyTrend: dailyRows.map((r) => ({
      day: String(r.day).slice(0, 10),
      count: Number(r.count),
    })),
  };
}

export async function fetchExamplesForExport(opts: {
  reviewedOnly?: boolean;
  hasUserCorrections?: boolean;
  limit?: number;
}) {
  const where: Prisma.IntakeTrainingExampleWhereInput = {};
  if (opts.reviewedOnly) where.reviewed = true;
  if (opts.hasUserCorrections != null) where.hasUserCorrections = opts.hasUserCorrections;

  return db.intakeTrainingExample.findMany({
    where,
    orderBy: { publishedAt: 'desc' },
    take: opts.limit ?? 50_000,
  });
}

export interface ExportResult {
  format: TrainingExportFormat;
  trainPath: string;
  valPath?: string;
  manifestPath: string;
  trainCount: number;
  valCount: number;
  exportedAt: string;
}
