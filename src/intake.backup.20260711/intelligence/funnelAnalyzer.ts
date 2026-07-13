import type { FunnelStats, FunnelStep, StepStats } from '@/intake/intelligence/types';
import type { SessionAggregationResult } from '@/intake/intelligence/types';
import { FUNNEL_STEPS } from '@/intake/intelligence/types';

const MIN_BOTTLENECK_SESSIONS = 5;

function sessionReachedStep(
  aggregation: SessionAggregationResult,
  step: FunnelStep
): number {
  let count = 0;
  for (const session of aggregation.sessions) {
    if (session.stepsReached.has(step)) count += 1;
  }
  return count;
}

export function analyzeFunnel(aggregation: SessionAggregationResult): {
  funnelStats: FunnelStats;
  stepStats: Record<string, StepStats>;
} {
  const stepConversionRates: Record<string, number> = {};
  const dropOffRates: Record<string, number> = {};
  const stepStats: Record<string, StepStats> = {};

  for (let i = 0; i < FUNNEL_STEPS.length; i += 1) {
    const step = FUNNEL_STEPS[i]!;
    const reached = sessionReachedStep(aggregation, step);
    const nextStep = FUNNEL_STEPS[i + 1];
    const nextReached = nextStep ? sessionReachedStep(aggregation, nextStep) : reached;

    stepConversionRates[step] = reached > 0 ? nextReached / reached : 0;

    const dropoffs = aggregation.dropoffsByStep.get(step) ?? 0;
    dropOffRates[step] = reached > 0 ? dropoffs / reached : 0;

    let durationSum = 0;
    let durationCount = 0;
    let backNav = 0;
    let transitions = 0;
    let exited = 0;

    for (const session of aggregation.sessions) {
      if (!session.stepsReached.has(step)) continue;
      const dur = session.stepDurations.get(step);
      if (dur != null) {
        durationSum += dur;
        durationCount += 1;
      }
      if (session.dropoffStep === step) exited += 1;
      transitions += session.stepTransitions;
      backNav += session.backNavigations;
    }

    stepStats[step] = {
      avgDurationMs: durationCount > 0 ? durationSum / durationCount : 0,
      backNavigationRate: transitions > 0 ? backNav / transitions : 0,
      sessionsReached: reached,
      sessionsExited: exited,
    };
  }

  let bottleneckStep: string | undefined;
  let maxDrop = -1;
  for (const step of FUNNEL_STEPS) {
    const reached = stepStats[step]?.sessionsReached ?? 0;
    if (reached < MIN_BOTTLENECK_SESSIONS) continue;
    const rate = dropOffRates[step] ?? 0;
    if (rate > maxDrop) {
      maxDrop = rate;
      bottleneckStep = step;
    }
  }

  return {
    funnelStats: {
      stepConversionRates,
      dropOffRates,
      bottleneckStep,
    },
    stepStats,
  };
}
