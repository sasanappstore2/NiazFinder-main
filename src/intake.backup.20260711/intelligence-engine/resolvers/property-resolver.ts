import { extractPropertySlotsFromText } from '@/lib/need-intake/extract-property-slots';
import {
  createEmptyFieldBag,
  setField,
  type IntakeFieldBag,
} from '@/intake/intelligence-engine/types';

export function resolveProperty(rawText: string): Partial<IntakeFieldBag> {
  const bag = createEmptyFieldBag();
  const slots = extractPropertySlotsFromText(rawText);

  if (slots.areaMin) {
    const n = Number(slots.areaMin);
    setField(bag, 'area', {
      value: Number.isFinite(n) ? n : null,
      confidence: 0.88,
      source: 'rule',
      evidence: 'areaMin',
    });
  } else if (slots.areaMax) {
    const n = Number(slots.areaMax);
    setField(bag, 'area', { value: Number.isFinite(n) ? n : null, confidence: 0.8, source: 'rule' });
  }

  if (slots.rooms) {
    const n = Number(slots.rooms.replace('+', ''));
    setField(bag, 'rooms', {
      value: Number.isFinite(n) ? n : null,
      confidence: 0.85,
      source: 'rule',
    });
  }

  if (slots.floorMin) {
    setField(bag, 'floorMin', {
      value: Number(slots.floorMin),
      confidence: 0.8,
      source: 'rule',
    });
  }

  if (slots.nightlyRent) {
    const n = Number(slots.nightlyRent);
    if (Number.isFinite(n) && n > 0) {
      setField(bag, 'budgetMax', {
        value: n,
        confidence: 0.88,
        source: 'rule',
        evidence: 'nightlyRent',
      });
    }
  }

  return bag;
}
