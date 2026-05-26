import {
  classifierToParseVertical,
  classifyVertical,
} from '@/lib/need-intake/vertical-classifier';

export type ParseVertical =
  | 'real-estate'
  | 'vehicles'
  | 'electronics'
  | 'home-appliances'
  | 'personal-items'
  | 'entertainment'
  | 'services'
  | 'jobs'
  | 'social'
  | 'general';

/** Hint vertical from raw text using scored classifier. */
export function guessVerticalFromText(text: string): ParseVertical {
  const c = classifyVertical(text);
  return classifierToParseVertical(c.vertical);
}
