'use client';

import { create } from 'zustand';
import type {
  IntakeStep,
  ListingPreview,
  NeedDraft,
  NextQuestionResponse,
  ParsedIntent,
} from '@/contracts/need-intake';
import type {
  TypingAnalysisResult,
  TypingAnalysisStatus,
} from '@/contracts/typing-analysis';
import type { IntakeAnalysisResult } from '@/intake/types';
import {
  createNeedDraftFromAnalysis,
  mergeAnalyzeIntoDraft,
  patchNeedDraftEntities as patchDraftEntities,
  projectNeedDraftFromForm,
  syncNeedDraftFromForm,
  type SyncNeedDraftFormOpts,
  type IntakeUserFieldLocks,
} from '@/intake/aggregate/needDraftAggregate';
import { warnLegacyWriteDetected } from '@/intake/legacy/legacy-guards';
import type { NeedDraft as NeedDraftContract } from '@/contracts/need-intake';

type AnalyzedDraftCarrier = IntakeAnalysisResult & {
  draft?: NeedDraftContract;
};

interface NeedIntakeState {
  step: IntakeStep;
  seedText: string;
  needDraft: NeedDraft | null;
  /** @deprecated Derived read mirror — use needDraft + draftToLegacyPayload(). */
  parsedIntent: ParsedIntent | null;
  /** @deprecated Derived read mirror — use needDraft.entities. */
  answers: Record<string, string | number | boolean | string[]>;
  currentQuestion: NextQuestionResponse | null;
  summary: string;
  listingPreview: ListingPreview | null;
  readinessScore: number;
  readyToPreview: boolean;
  leadPhone: string | null;
  error: string | null;
  isLoading: boolean;
  typingAnalysis: TypingAnalysisResult | null;
  analysisStatus: TypingAnalysisStatus;
  typingPreloading: boolean;
  typingSessionId: string | null;

  setSeedText: (text: string) => void;
  /** @deprecated Use patchNeedDraftEntities(). Writes are logged as LEGACY_WRITE_DETECTED. */
  setAnswer: (key: string, value: string | number | boolean) => void;
  /** @deprecated Use patchNeedDraftEntities(). Writes are logged as LEGACY_WRITE_DETECTED. */
  setAnswers: (answers: Record<string, string | number | boolean | string[]>) => void;
  setStep: (step: IntakeStep) => void;
  /** @deprecated Use patchNeedDraftEntities(). Writes are logged as LEGACY_WRITE_DETECTED. */
  setParsedIntent: (parsed: ParsedIntent) => void;
  setCurrentQuestion: (q: NextQuestionResponse | null) => void;
  setSummary: (s: string) => void;
  setListingPreview: (
    p: ListingPreview | null | ((prev: ListingPreview | null) => ListingPreview | null)
  ) => void;
  setReadiness: (score: number, ready: boolean) => void;
  setLeadPhone: (phone: string | null) => void;
  setError: (e: string | null) => void;
  setLoading: (v: boolean) => void;
  setTypingAnalysis: (r: TypingAnalysisResult | null) => void;
  setAnalysisStatus: (s: TypingAnalysisStatus) => void;
  setTypingPreloading: (v: boolean) => void;
  setTypingSessionId: (id: string | null) => void;
  setNeedDraft: (draft: NeedDraft | null) => void;
  setNeedDraftFromAnalysis: (
    analysis: IntakeAnalysisResult,
    sourceText: string,
    intakeTrace?: import('@/intake/types/analysis-trace').IntakeAnalysisTrace,
    locks?: IntakeUserFieldLocks
  ) => void;
  patchNeedDraftEntities: (patch: Partial<Record<string, unknown>>) => void;
  syncNeedDraftFromFormFields: (
    form: {
      needText: string;
      detailsText: string;
      categorySlug: string;
      subcategorySlug: string;
      city: string;
      neighborhood: string;
      neighborhoodSlug?: string | null;
    },
    opts?: SyncNeedDraftFormOpts
  ) => NeedDraft | null;
  /** Pure draft projection for live preview — does not write store. */
  projectNeedDraftFromFormFields: (
    form: {
      needText: string;
      detailsText: string;
      categorySlug: string;
      subcategorySlug: string;
      city: string;
      neighborhood: string;
      neighborhoodSlug?: string | null;
    },
    opts?: SyncNeedDraftFormOpts
  ) => NeedDraft;
  reset: () => void;
  getDraft: () => NeedDraft | null;
}

const initialState = {
  step: 'compose' as IntakeStep,
  seedText: '',
  needDraft: null as NeedDraft | null,
  parsedIntent: null,
  answers: {},
  currentQuestion: null,
  summary: '',
  listingPreview: null,
  readinessScore: 0,
  readyToPreview: false,
  leadPhone: null,
  error: null,
  isLoading: false,
  typingAnalysis: null,
  analysisStatus: 'idle' as TypingAnalysisStatus,
  typingPreloading: false,
  typingSessionId: null,
};

function applyNeedDraft(set: (partial: Partial<NeedIntakeState>) => void, draft: NeedDraft | null) {
  set({
    needDraft: draft,
    parsedIntent: draft?.parsedIntent ?? null,
    answers: draft?.answers ?? {},
    seedText: draft?.sourceText ?? '',
    readinessScore: draft?.completionScore ?? 0,
    readyToPreview: draft?.completionState === 'READY_TO_PUBLISH',
  });
}

export const useNeedIntakeStore = create<NeedIntakeState>((set, get) => ({
  ...initialState,

  setSeedText: (text) => set({ seedText: text }),
  setAnswer: (key, value) => {
    warnLegacyWriteDetected('answers', `need-intake-store.setAnswer(${key})`);
    set((s) => ({ answers: { ...s.answers, [key]: value } }));
  },
  setAnswers: (answers) => {
    warnLegacyWriteDetected('answers', 'need-intake-store.setAnswers');
    set({ answers });
  },
  setStep: (step) => set({ step }),
  setParsedIntent: (parsed) => {
    warnLegacyWriteDetected('parsedIntent', 'need-intake-store.setParsedIntent');
    set({ parsedIntent: parsed });
  },
  setCurrentQuestion: (q) => set({ currentQuestion: q }),
  setSummary: (summary) => set({ summary }),
  setListingPreview: (listingPreview) =>
    set((s) => {
      const next =
        typeof listingPreview === 'function' ? listingPreview(s.listingPreview) : listingPreview;
      return {
        listingPreview: next,
        needDraft: s.needDraft ? { ...s.needDraft, listingPreview: next ?? undefined } : null,
      };
    }),
  setReadiness: (readinessScore, readyToPreview) =>
    set({ readinessScore, readyToPreview }),
  setLeadPhone: (leadPhone) =>
    set((s) => ({
      leadPhone,
      needDraft: s.needDraft ? { ...s.needDraft, leadPhone: leadPhone ?? undefined } : null,
    })),
  setError: (error) => set({ error }),
  setLoading: (isLoading) => set({ isLoading }),
  setTypingAnalysis: (typingAnalysis) => set({ typingAnalysis }),
  setAnalysisStatus: (analysisStatus) => set({ analysisStatus }),
  setTypingPreloading: (typingPreloading) => set({ typingPreloading }),
  setTypingSessionId: (typingSessionId) => set({ typingSessionId }),

  setNeedDraft: (draft) => applyNeedDraft(set, draft),

  setNeedDraftFromAnalysis: (analysis, sourceText, intakeTrace, locks) => {
    const { leadPhone, listingPreview, needDraft } = get();
    const carrier = analysis as AnalyzedDraftCarrier;
    const analyzed =
      carrier.draft ??
      createNeedDraftFromAnalysis(analysis, sourceText, {
        leadPhone,
        intakeTrace,
        existing: { listingPreview: listingPreview ?? undefined },
      });
    const draft = mergeAnalyzeIntoDraft(
      needDraft,
      {
        ...analyzed,
        sourceText: analyzed.sourceText || sourceText,
        leadPhone: leadPhone ?? analyzed.leadPhone,
        listingPreview: analyzed.listingPreview ?? listingPreview ?? undefined,
        intakeTrace: intakeTrace ?? analyzed.intakeTrace,
      },
      locks
    );
    applyNeedDraft(set, draft);
  },

  patchNeedDraftEntities: (patch) => {
    const current = get().needDraft;
    if (!current) return;
    const updated = patchDraftEntities(current, patch);
    applyNeedDraft(set, updated);
  },

  syncNeedDraftFromFormFields: (form, opts) => {
    const current = get().needDraft;
    const updated = syncNeedDraftFromForm(current, form, opts);
    applyNeedDraft(set, updated);
    return updated;
  },

  projectNeedDraftFromFormFields: (form, opts) => {
    const current = get().needDraft;
    return projectNeedDraftFromForm(current, form, opts);
  },

  reset: () => set(initialState),

  getDraft: () => get().needDraft,
}));
