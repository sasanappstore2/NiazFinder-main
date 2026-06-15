import { Injectable } from '@nestjs/common';

@Injectable()
export class PersianNormalizerService {
  normalize(text: string): string {
    return text
      .replace(/\u0643/g, '\u06A9') // \u0643 -> \u06A9
      .replace(/\u064A/g, '\u06CC') // \u064A -> \u06CC
      .replace(/\u0629/g, '\u0647') // \u0629 -> \u0647
      .replace(/\u0624/g, '\u0648') // \u0624 -> \u0648
      .replace(/[\u0625\u0623]/g, '\u0627') // \u0625/\u0623 -> \u0627
      .replace(/[\u064B-\u065F]/g, '') // strip Arabic diacritics
      .replace(/\u200C/g, ' ') // ZWNJ -> space
      .replace(/\s+/g, ' ')
      .trim();
  }

  removeTokens(text: string, tokens: string[]): string {
    let result = text;
    for (const token of tokens) {
      if (!token.trim()) continue;
      const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      result = result.replace(new RegExp(escaped, 'g'), '');
    }
    return result.replace(/\s+/g, ' ').trim();
  }
}
