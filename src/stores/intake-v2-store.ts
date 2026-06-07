'use client';

import { create } from 'zustand';
import type {
  ConversationTurn,
  FieldOption,
  ListingPreview,
  NeedDraft,
  NextQuestionResponse,
} from '@/contracts/need-intake';
import { legacyNeedDraftFromParsed } from '@/intake/aggregate/needDraftAggregate';
import { parseIntentFromText } from '@/lib/need-intake/intent-parser';
import { INTAKE_V2_WELCOME } from '@/lib/intake-v2/system-prompt';
import type { V2MissingField } from '@/lib/intake-v2/v2-readiness';

export type IntakeV2Phase = 'chat' | 'preview' | 'done';

interface IntakeV2State {
  turns: ConversationTurn[];
  needDraft: NeedDraft;
  readinessScore: number;
  readyToPreview: boolean;
  canSoftPreview: boolean;
  currentQuestion: NextQuestionResponse | null;
  suggestedChips: FieldOption[];
  missingFields: V2MissingField[];
  confirmedFields: string[];
  inferredFields: string[];
  confirmedCount: number;
  requiredCount: number;
  activeFieldKey: string | null;
  activeFieldLabel: string | null;
  extractedSummary: string;
  listingPreview: ListingPreview | null;
  leadPhone: string;
  phase: IntakeV2Phase;
  isLoading: boolean;
  error: string | null;
  publishedNeed: { id: string; title: string } | null;

  setLeadPhone: (phone: string) => void;
  setPhase: (phase: IntakeV2Phase) => void;
  setListingPreview: (preview: ListingPreview | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  applyTurnResult: (result: {
    needDraft: NeedDraft;
    readinessScore: number;
    readyToPreview: boolean;
    canSoftPreview?: boolean;
    currentQuestion: NextQuestionResponse | null;
    extractedSummary: string;
    suggestedChips?: FieldOption[];
    missingFields?: V2MissingField[];
    confirmedFields?: string[];
    inferredFields?: string[];
    confirmedCount?: number;
    requiredCount?: number;
    activeFieldKey?: string | null;
    activeFieldLabel?: string | null;
  }) => void;
  appendUserTurn: (content: string) => void;
  setPublishedNeed: (payload: { id: string; title: string } | null) => void;
  reset: () => void;
}

function createInitialDraft(): NeedDraft {
  return legacyNeedDraftFromParsed(parseIntentFromText(''), {}, [
    { role: 'assistant', content: INTAKE_V2_WELCOME },
  ]);
}

const initialDraft = createInitialDraft();

export const useIntakeV2Store = create<IntakeV2State>((set) => ({
  turns: initialDraft.turns ?? [{ role: 'assistant', content: INTAKE_V2_WELCOME }],
  needDraft: initialDraft,
  readinessScore: 0,
  readyToPreview: false,
  canSoftPreview: false,
  currentQuestion: null,
  suggestedChips: [],
  missingFields: [],
  confirmedFields: [],
  inferredFields: [],
  confirmedCount: 0,
  requiredCount: 0,
  activeFieldKey: null,
  activeFieldLabel: null,
  extractedSummary: '',
  listingPreview: null,
  leadPhone: '',
  phase: 'chat',
  isLoading: false,
  error: null,
  publishedNeed: null,

  setLeadPhone: (phone) => set({ leadPhone: phone }),
  setPhase: (phase) => set({ phase }),
  setListingPreview: (listingPreview) => set({ listingPreview }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  applyTurnResult: (result) =>
    set({
      turns: result.needDraft.turns ?? [],
      needDraft: result.needDraft,
      readinessScore: result.readinessScore,
      readyToPreview: result.readyToPreview,
      canSoftPreview: result.canSoftPreview ?? false,
      currentQuestion: result.currentQuestion,
      suggestedChips: result.suggestedChips ?? [],
      missingFields: result.missingFields ?? [],
      confirmedFields: result.confirmedFields ?? [],
      inferredFields: result.inferredFields ?? [],
      confirmedCount: result.confirmedCount ?? 0,
      requiredCount: result.requiredCount ?? 0,
      activeFieldKey: result.activeFieldKey ?? null,
      activeFieldLabel: result.activeFieldLabel ?? null,
      extractedSummary: result.extractedSummary,
    }),
  appendUserTurn: (content) =>
    set((s) => ({
      turns: [...s.turns, { role: 'user', content }],
    })),
  setPublishedNeed: (publishedNeed) => set({ publishedNeed, phase: 'done' }),
  reset: () => {
    const draft = createInitialDraft();
    set({
      turns: draft.turns ?? [],
      needDraft: draft,
      readinessScore: 0,
      readyToPreview: false,
      canSoftPreview: false,
      currentQuestion: null,
      suggestedChips: [],
      missingFields: [],
      confirmedFields: [],
      inferredFields: [],
      confirmedCount: 0,
      requiredCount: 0,
      activeFieldKey: null,
      activeFieldLabel: null,
      extractedSummary: '',
      listingPreview: null,
      leadPhone: '',
      phase: 'chat',
      isLoading: false,
      error: null,
      publishedNeed: null,
    });
  },
}));
