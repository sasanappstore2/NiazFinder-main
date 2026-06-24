import type { KnowledgeArticle, KnowledgeArticleType } from './types';

/**
 * Phase 8 — Real Estate Knowledge Hub. Businesses publish articles / guides /
 * market reports attached to their profile (SEO + authority).
 */

export const KNOWLEDGE_TYPE_LABELS: Record<KnowledgeArticleType, string> = {
  article: 'مقاله',
  guide: 'راهنما',
  market_report: 'گزارش بازار',
};

export function publishedArticles(articles: KnowledgeArticle[]): KnowledgeArticle[] {
  return articles
    .filter((a) => a.published)
    .sort((a, b) => (b.publishedAt ?? '').localeCompare(a.publishedAt ?? ''));
}

