'use client';

import { create } from 'zustand';
import type {
  ConversationTurn,
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

interface NeedIntakeState {
  step: IntakeStep;
  seedText: string;
  parsedIntent: ParsedIntent | null;
  answers: Record<string, string | number | boolean | string[]>;
  turns: ConversationTurn[];
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
  addTurn: (turn: ConversationTurn) => void;
  setAnswer: (key: string, value: string | number | boolean) => void;
  setAnswers: (answers: Record<string, string | number | boolean | string[]>) => void;
  setStep: (step: IntakeStep) => void;
  setParsedIntent: (parsed: ParsedIntent) => void;
  setCurrentQuestion: (q: NextQuestionResponse | null) => void;
  setSummary: (s: string) => void;
  setListingPreview: (p: ListingPreview | null) => void;
  setReadiness: (score: number, ready: boolean) => void;
  setLeadPhone: (phone: string | null) => void;
  setError: (e: string | null) => void;
  setLoading: (v: boolean) => void;
  setTypingAnalysis: (r: TypingAnalysisResult | null) => void;
  setAnalysisStatus: (s: TypingAnalysisStatus) => void;
  setTypingPreloading: (v: boolean) => void;
  setTypingSessionId: (id: string | null) => void;
  reset: () => void;
  getDraft: () => NeedDraft | null;
}

const initialState = {
  step: 'idle' as IntakeStep,
  seedText: '',
  parsedIntent: null,
  answers: {},
  turns: [],
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

export const useNeedIntakeStore = create<NeedIntakeState>((set, get) => ({
  ...initialState,

  setSeedText: (text) => set({ seedText: text }),
  addTurn: (turn) => set((s) => ({ turns: [...s.turns, turn] })),
  setAnswer: (key, value) =>
    set((s) => ({ answers: { ...s.answers, [key]: value } })),
  setAnswers: (answers) => set({ answers }),
  setStep: (step) => set({ step }),
  setParsedIntent: (parsed) => set({ parsedIntent: parsed }),
  setCurrentQuestion: (q) => set({ currentQuestion: q }),
  setSummary: (summary) => set({ summary }),
  setListingPreview: (listingPreview) => set({ listingPreview }),
  setReadiness: (readinessScore, readyToPreview) =>
    set({ readinessScore, readyToPreview }),
  setLeadPhone: (leadPhone) => set({ leadPhone }),
  setError: (error) => set({ error }),
  setLoading: (isLoading) => set({ isLoading }),
  setTypingAnalysis: (typingAnalysis) => set({ typingAnalysis }),
  setAnalysisStatus: (analysisStatus) => set({ analysisStatus }),
  setTypingPreloading: (typingPreloading) => set({ typingPreloading }),
  setTypingSessionId: (typingSessionId) => set({ typingSessionId }),
  reset: () => set(initialState),

  getDraft: () => {
    const s = get();
    if (!s.parsedIntent) return null;
    return {
      parsedIntent: s.parsedIntent,
      answers: s.answers,
      turns: s.turns,
      leadPhone: s.leadPhone ?? undefined,
      listingPreview: s.listingPreview ?? undefined,
    };
  },
}));
