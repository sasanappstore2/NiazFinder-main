import type { ParsedIntent } from '@/contracts/need-intake';
import type { DatasetLabels } from '@/lib/need-intake/dataset/schema';
import { isRealEstateCategorySlug } from '@/lib/need-intake/dataset/validate-real-estate-fixture';
import {
  categoriesCompatible,
  dealsEquivalent,
} from '@/lib/need-intake/prefill/prefill-post-process';
import { normalizeCitySlug } from '@/lib/need-intake/prefill/prefill-policy';
import { parseCity } from '@/lib/need-intake/intent-parser';

function dealFromAnswers(answers: Record<string, unknown>): string | undefined {
  const v = answers.dealType;
  return typeof v === 'string' ? v : undefined;
}

function kindFromAnswers(answers: Record<string, unknown>): string | undefined {
  const v = answers.propertyKind;
  return typeof v === 'string' ? v : undefined;
}

/** Compare rules output to teacher labels. Captured Divar rows use relaxed slot checks. */
export function scorePrefillAgainstTeacher(
  parsed: ParsedIntent,
  answers: Record<string, unknown>,
  teacher: DatasetLabels,
  opts?: { captured?: boolean }
): string[] {
  const errors: string[] = [];
  const teacherCat = teacher.subcategorySlug ?? teacher.categorySlug;
  const estateTeacher = isRealEstateCategorySlug(teacherCat);

  if (!estateTeacher) {
    return errors;
  }

  const pKind = parsed.entities?.propertyKind ?? kindFromAnswers(answers);
  const parsedCat = parsed.subcategorySlug ?? parsed.categorySlug;

  if (!opts?.captured) {
    if (
      teacherCat &&
      parsedCat &&
      !categoriesCompatible(parsedCat, teacherCat, pKind) &&
      !isRealEstateCategorySlug(parsedCat)
    ) {
      errors.push(`category ${parsedCat} != ${teacherCat}`);
    }
  }

  const tDeal = teacher.entities?.dealType;
  const pDeal = parsed.entities?.dealType ?? dealFromAnswers(answers);
  if (tDeal && pDeal && !dealsEquivalent(pDeal, tDeal)) {
    if (
      opts?.captured &&
      tDeal === 'buy' &&
      pDeal === 'sell' &&
      /(?:می\s*خو(?:ام|اهم)|دنبال|نیاز\s*دار|لازم\s*دار)/u.test(parsed.rawText) &&
      /فروش/u.test(parsed.rawText)
    ) {
      // Divar need-transform keeps the listing's «فروش …» wording for buyer rows.
    } else if (opts?.captured && tDeal === 'partnership' && (pDeal === 'buy' || pDeal === 'sell')) {
      // Partnership listings often include buy/sell phrasing in the Divar title.
    } else {
      errors.push(`dealType ${pDeal} != ${tDeal}`);
    }
  }

  if (!opts?.captured) {
    const tKind = teacher.entities?.propertyKind;
    const kind = pKind;
    if (tKind && kind && tKind !== kind) {
      errors.push(`propertyKind ${kind} != ${tKind}`);
    }
  }

  const tCity = normalizeCitySlug(teacher.city ?? teacher.entities?.city);
  const pCity = normalizeCitySlug(parsed.city);
  if (tCity && pCity && tCity !== pCity) {
    if (opts?.captured) {
      const explicit = normalizeCitySlug(parseCity(parsed.rawText));
      if (explicit && explicit === pCity) {
        // Divar row city slug in labels can disagree with explicit «شهر:» line.
      } else {
        errors.push(`city ${pCity} != ${tCity}`);
      }
    } else {
      errors.push(`city ${pCity} != ${tCity}`);
    }
  }

  if (teacher.entities?.areaMin) {
    const got = String(
      answers.areaMin ?? parsed.entities?.areaMin ?? parsed.entities?.area ?? ''
    );
    if (got && got !== teacher.entities.areaMin) {
      errors.push(`areaMin ${got} != ${teacher.entities.areaMin}`);
    }
  }

  return errors;
}
