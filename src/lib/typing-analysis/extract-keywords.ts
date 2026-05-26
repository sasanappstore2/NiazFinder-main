import { normalizeTypingText } from './normalize-text';

const STOPWORDS = new Set([
  'و',
  'در',
  'به',
  'از',
  'که',
  'را',
  'با',
  'برای',
  'این',
  'یک',
  'می',
  'خواهم',
  'میخوام',
  'دنبال',
  'نیاز',
  'دارم',
  'هستم',
  'است',
]);

const SKILL_TAGS: Record<string, string[]> = {
  react: ['react', 'frontend', 'فرانت'],
  vue: ['vue', 'frontend'],
  node: ['node', 'nodejs', 'backend'],
  python: ['python', 'پایتون'],
  plumbing: ['لوله', 'لوله‌کشی', 'تاسیسات'],
  cleaning: ['نظافت', 'نظافتچی'],
};

export function extractKeywords(text: string): string[] {
  const norm = normalizeTypingText(text);
  const tokens = norm.split(/[\s,،.]+/).filter((t) => t.length > 1 && !STOPWORDS.has(t));
  const keywords = new Set<string>(tokens.slice(0, 12));

  for (const [tag, words] of Object.entries(SKILL_TAGS)) {
    if (words.some((w) => norm.includes(w))) keywords.add(tag);
  }

  return Array.from(keywords).slice(0, 10);
}

export function extractTags(text: string, categorySlug: string): string[] {
  const keywords = extractKeywords(text);
  const tags = new Set<string>();

  for (const k of keywords) {
    if (['react', 'vue', 'node', 'python', 'frontend', 'backend'].includes(k)) {
      tags.add(k);
    }
  }

  if (categorySlug === 'it' && (text.includes('برنامه') || text.includes('react'))) {
    tags.add('react');
    tags.add('frontend');
  }

  if (tags.size === 0 && keywords.length) {
    keywords.slice(0, 3).forEach((k) => tags.add(k));
  }

  return Array.from(tags).slice(0, 6);
}
