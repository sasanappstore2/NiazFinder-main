const PERSIAN_WORD_NUMBERS: Record<string, number> = {
  یک: 1,
  دو: 2,
  سه: 3,
  چهار: 4,
  پنج: 5,
  شش: 6,
  هفت: 7,
  هشت: 8,
  نه: 9,
  ده: 10,
};

/** Detect area in square meters from normalized text. */
export function extractArea(normalizedText: string): { value: number | null; confidence: number } {
  const patterns = [
    /(\d{2,4})\s*(?:متر|متری|m2|m²)/u,
    /(?:متراژ|مساحت)\s*(\d{2,4})/u,
    /(\d{2,4})\s*م/u,
  ];

  for (const re of patterns) {
    const m = normalizedText.match(re);
    if (m?.[1]) {
      const value = Number.parseInt(m[1], 10);
      if (value >= 20 && value <= 10000) {
        return { value, confidence: 1 };
      }
    }
  }
  return { value: null, confidence: 0 };
}

/** Detect bedroom count. */
export function extractRooms(normalizedText: string): { value: number | null; confidence: number } {
  const digitMatch = normalizedText.match(/(\d)\s*خواب/u);
  if (digitMatch?.[1]) {
    const n = Number.parseInt(digitMatch[1], 10);
    if (n >= 1 && n <= 10) return { value: n, confidence: 0.95 };
  }

  for (const [word, num] of Object.entries(PERSIAN_WORD_NUMBERS)) {
    if (normalizedText.includes(`${word} خواب`) || normalizedText.includes(`${word}خواب`)) {
      return { value: num, confidence: 0.9 };
    }
  }
  return { value: null, confidence: 0 };
}

/** Parse Persian budget phrases to Rial-scale integers (approximate). */
export function extractBudget(normalizedText: string): {
  min: number | null;
  max: number | null;
  confidence: number;
} {
  const billionMatch = normalizedText.match(/(\d+(?:\.\d+)?)\s*میلیارد/u);
  if (billionMatch?.[1]) {
    const n = Number.parseFloat(billionMatch[1]);
    const value = Math.round(n * 1_000_000_000);
    return { min: value, max: value, confidence: 0.95 };
  }

  const millionMatch = normalizedText.match(/(\d+(?:\.\d+)?)\s*میلیون/u);
  if (millionMatch?.[1]) {
    const n = Number.parseFloat(millionMatch[1]);
    const value = Math.round(n * 1_000_000);
    return { min: value, max: value, confidence: 0.92 };
  }

  const rangeMatch = normalizedText.match(
    /(\d+)\s*(?:تا|-)\s*(\d+)\s*میلیون/u
  );
  if (rangeMatch?.[1] && rangeMatch[2]) {
    const min = Number.parseInt(rangeMatch[1], 10) * 1_000_000;
    const max = Number.parseInt(rangeMatch[2], 10) * 1_000_000;
    return { min, max, confidence: 0.88 };
  }

  return { min: null, max: null, confidence: 0 };
}
