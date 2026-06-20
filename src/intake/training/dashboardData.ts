import { buildTrainingStats, listTrainingExamples } from '@/intake/training/trainingRepository';
import { listRecentExports } from '@/intake/training/trainingDatasetBuilder';

export async function buildIntakeTrainingDashboardData(filters?: {
  page?: number;
  pageSize?: number;
  reviewed?: boolean;
  hasUserCorrections?: boolean;
  needType?: string;
  qualityFlag?: string;
  search?: string;
}) {
  const [stats, list, recentExports] = await Promise.all([
    buildTrainingStats(),
    listTrainingExamples({
      page: filters?.page ?? 1,
      pageSize: filters?.pageSize ?? 25,
      reviewed: filters?.reviewed,
      hasUserCorrections: filters?.hasUserCorrections,
      needType: filters?.needType,
      qualityFlag: filters?.qualityFlag,
      search: filters?.search,
    }),
    Promise.resolve(listRecentExports(8)),
  ]);

  return { stats, list, recentExports };
}
