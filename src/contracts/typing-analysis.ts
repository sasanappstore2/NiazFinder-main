/**
 * Realtime typing analysis contracts (rules-only lightweight layer).
 */

export type TypingAnalysisSource = 'rules' | 'cache';

export interface TypingSpamInfo {
  isSpam: boolean;
  reason?: string;
}

export interface TypingDuplicateInfo {
  likely: boolean;
  matchIds?: string[];
}

export interface TypingPreloadHints {
  specialists?: boolean;
  requests?: boolean;
}

export interface TypingAnalysisResult {
  sessionId: string;
  textHash: string;
  /** Semantic intent slug (e.g. hire_developer, property_search). */
  intent: string;
  categorySlug: string;
  subcategorySlug?: string;
  confidence: number;
  tags: string[];
  keywords: string[];
  suggestions: string[];
  spam: TypingSpamInfo;
  duplicate: TypingDuplicateInfo;
  preloads?: TypingPreloadHints;
  latencyMs: number;
  source: TypingAnalysisSource;
  seq?: number;
}

export interface TypingAnalyzeRequest {
  sessionId: string;
  text: string;
  seq?: number;
  locale?: 'fa' | 'en';
  city?: string;
}

export interface TypingAnalyzeResponse {
  ok: boolean;
  result?: TypingAnalysisResult;
  error?: string;
  retryAfterMs?: number;
}

export type TypingAnalysisStatus = 'idle' | 'analyzing' | 'ready' | 'error';
