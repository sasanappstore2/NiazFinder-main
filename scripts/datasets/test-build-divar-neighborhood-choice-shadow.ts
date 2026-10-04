import { describe, expect, test } from 'bun:test';
import type { ManagedNeighborhood } from '@/lib/neighborhoods/types';
import {
  compactLocationKey,
  labelAppearsInText,
  makeUnknownDecision,
  textDescribesBetweenPlaces,
  unknownQuota,
} from './build-divar-neighborhood-choice-shadow';

const neighborhoods: ManagedNeighborhood[] = [
  { id: 'ferdowsi', name: 'فردوسی', areas: ['خیابان فردوسی'] },
  { id: 'vanak', name: 'ونک', areas: ['میدان ونک'] },
  { id: 'ahmadabad', name: 'احمدآباد', areas: ['بلوار احمدآباد'] },
];

describe('Divar neighborhood choice shadow corpus helpers', () => {
  test('normalizes Persian/Arabic variants, half-spaces and punctuation', () => {
    expect(compactLocationKey('فردوسى‌، كی')).toBe('فردوسیکی');
  });

  test('recognizes canonical neighborhood and area labels in text', () => {
    expect(labelAppearsInText(neighborhoods[0]!, 'حوالی خیابان فردوسی می‌خواهم')).toBe(true);
    expect(labelAppearsInText(neighborhoods[2]!, 'واحدی برای اجاره')).toBe(false);
  });

  test('uses a bounded per-city/split unknown quota', () => {
    expect(unknownQuota(0)).toBe(8);
    expect(unknownQuota(4)).toBe(8);
    expect(unknownQuota(20)).toBe(40);
    expect(unknownQuota(100)).toBe(64);
    expect(() => unknownQuota(-1)).toThrow();
  });

  test('keeps between-place requests outside single-neighborhood labels', () => {
    expect(textDescribesBetweenPlaces('حوالی فردوسی بین ثمانه و مهدی')).toBe(true);
    expect(textDescribesBetweenPlaces('حوالی فردوسی اجاره می‌خواهم')).toBe(false);
  });

  test('labels only safe no-candidate text as unknown and excludes mentioned distractors', () => {
    const catalog = {
      cityName: 'مشهد',
      rows: neighborhoods,
      byId: new Map(neighborhoods.map((item) => [item.id, item])),
    };
    const absent = makeUnknownDecision(catalog, 'یک آپارتمان در مشهد می‌خواهم', 'group-1', 'ferdowsi');
    expect(absent).not.toBeNull();
    expect(absent?.criteria.unknown).toBeTruthy();
    expect(absent?.candidateIds).not.toContain('ferdowsi');

    const mentioned = makeUnknownDecision(catalog, 'محدوده ونک را می‌خواهم', 'group-2', 'ferdowsi');
    expect(mentioned).toBeNull();
  });
});
