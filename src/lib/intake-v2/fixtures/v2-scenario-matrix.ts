/**
 * Data-driven V2 scenario matrix (~40 cases) — location, deal, property, money, off-topic.
 */
import type { NeedDraft } from '@/contracts/need-intake';
import { orchestrateIntakeV2Turn } from '@/lib/intake-v2/orchestrate-turn';
import { INTAKE_V2_WELCOME } from '@/lib/intake-v2/system-prompt';
import { legacyNeedDraftFromParsed } from '@/intake/aggregate/needDraftAggregate';
import { parseIntentFromText } from '@/lib/need-intake/intent-parser';

type TurnFn = (
  draft: NeedDraft,
  turns: NeedDraft['turns'],
  msg: string,
  opts?: { confirmedFields?: string[]; lastAskedField?: string | null }
) => ReturnType<typeof orchestrateIntakeV2Turn>;

function freshDraft(): NeedDraft {
  return legacyNeedDraftFromParsed(parseIntentFromText(''), {}, [
    { role: 'assistant', content: INTAKE_V2_WELCOME },
  ]);
}

async function runFlow(
  turn: TurnFn,
  messages: string[]
): Promise<Awaited<ReturnType<typeof orchestrateIntakeV2Turn>>> {
  let draft = freshDraft();
  let turns = draft.turns ?? [];
  let confirmed: string[] = [];
  let lastAsked: string | null = null;
  let last = await turn(draft, turns, messages[0] ?? '', { lastAskedField: lastAsked });
  draft = last.needDraft;
  turns = draft.turns ?? [];
  confirmed = last.confirmedFields ?? [];
  lastAsked = last.activeFieldKey ?? null;
  for (let i = 1; i < messages.length; i++) {
    last = await turn(draft, turns, messages[i], {
      confirmedFields: confirmed,
      lastAskedField: lastAsked,
    });
    draft = last.needDraft;
    turns = draft.turns ?? [];
    confirmed = last.confirmedFields ?? [];
    lastAsked = last.activeFieldKey ?? null;
  }
  return last;
}

export async function runV2ScenarioMatrix(
  turn: TurnFn
): Promise<{ passed: number; failed: string[] }> {
  const cases: Array<{ id: string; run: () => Promise<string | null> }> = [
    {
      id: 'deal-rahn-full',
      run: async () => {
        const r = await runFlow(turn, ['آپارتمان در ونک تهران رهن کامل']);
        return r.needDraft.answers.dealType === 'rent_rahn_full' ? null : 'deal not rahn_full';
      },
    },
    {
      id: 'deal-rahn-ejare',
      run: async () => {
        const r = await runFlow(turn, ['مغازه در مشهد رهن و اجاره']);
        return r.needDraft.answers.dealType === 'rent_rahn_ejare' ? null : 'deal not rahn_ejare';
      },
    },
    {
      id: 'deal-buy',
      run: async () => {
        const r = await runFlow(turn, ['آپارتمان در مشهد خرید می‌خوام']);
        return r.needDraft.answers.dealType === 'buy' ? null : 'deal not buy';
      },
    },
    {
      id: 'deal-sell',
      run: async () => {
        const r = await runFlow(turn, ['ویلا در شیراز فروش']);
        return r.needDraft.parsedIntent.categorySlug.includes('sale') ? null : 'not sale';
      },
    },
    {
      id: 'prop-shop',
      run: async () => {
        const r = await runFlow(turn, ['مزون در تهران اجاره']);
        return r.needDraft.answers.propertyKind === 'shop' ? null : 'not shop';
      },
    },
    {
      id: 'prop-office',
      run: async () => {
        const r = await runFlow(turn, ['دفتر اداری در اصفهان اجاره']);
        return r.needDraft.answers.propertyKind === 'office' ? null : 'not office';
      },
    },
    {
      id: 'prop-industrial',
      run: async () => {
        const r = await runFlow(turn, ['انبار در کرج اجاره']);
        return r.needDraft.answers.propertyKind === 'industrial' ? null : 'not industrial';
      },
    },
    {
      id: 'prop-land',
      run: async () => {
        const r = await runFlow(turn, ['زمین در قم فروش']);
        return r.needDraft.answers.propertyKind === 'land' ? null : 'not land';
      },
    },
    {
      id: 'prop-villa',
      run: async () => {
        const r = await runFlow(turn, ['ویلا در شمال اجاره']);
        return r.needDraft.answers.propertyKind === 'villa' ? null : 'not villa';
      },
    },
    {
      id: 'loc-azadi-generic',
      run: async () => {
        const r = await runFlow(turn, ['آپارتمان در خیابان آزادی']);
        const ok =
          r.activeFieldKey === 'location' ||
          r.needDraft.parsedIntent.rejectLocationAutoConfirm === true;
        return ok ? null : 'generic street auto-resolved';
      },
    },
    {
      id: 'loc-explicit-mashhad',
      run: async () => {
        const r = await runFlow(turn, ['آپارتمان در احمدآباد مشهد']);
        return r.needDraft.parsedIntent.city === 'مشهد' ? null : 'city not mashhad';
      },
    },
    {
      id: 'money-area-not-deposit',
      run: async () => {
        const r = await runFlow(turn, ['آپارتمان ۸۰ متری در تهران']);
        return r.confirmedFields?.includes('deposit') ? 'area as deposit' : null;
      },
    },
    {
      id: 'off-topic-job',
      run: async () => {
        const r = await runFlow(turn, ['استخدام برنامه‌نویس']);
        return r.offTopic ? null : 'job not off-topic';
      },
    },
    {
      id: 'off-topic-phone',
      run: async () => {
        const r = await runFlow(turn, ['خرید گوشی موبایل']);
        return r.offTopic ? null : 'phone not off-topic';
      },
    },
    {
      id: 'storage-signal',
      run: async () => {
        const r = await runFlow(turn, ['انباری در مشهد']);
        return !r.offTopic && r.needDraft.answers.propertyKind === 'apartment'
          ? null
          : 'storage mishandled';
      },
    },
    {
      id: 'cross-city-abbasi',
      run: async () => {
        const r = await runFlow(turn, ['آپارتمان در فرامرز عباسی']);
        const city = r.needDraft.parsedIntent.city;
        const status = r.needDraft.parsedIntent.locationResolutionStatus;
        return status === 'city_ambiguous' ||
          r.activeFieldKey === 'location' ||
          city === 'مشهد'
          ? null
          : 'cross-city not disambiguated';
      },
    },
    {
      id: 'compact-kohsangi',
      run: async () => {
        const r = await runFlow(turn, ['آپارتمان کوهسنگی مشهد']);
        const loc = String(r.needDraft.answers.location ?? '');
        return /کوه\s*سنگی|سعادت|مشهد/i.test(loc) || r.needDraft.parsedIntent.city === 'مشهد'
          ? null
          : 'kohsangi failed';
      },
    },
    {
      id: 'no-guess-partial',
      run: async () => {
        const r = await runFlow(turn, ['آپارتمان در عباسی']);
        return !/عباسی،\s*تهران/.test(String(r.needDraft.answers.location ?? ''))
          ? null
          : 'partial عباسی tehran';
      },
    },
    {
      id: 'commercial-floor',
      run: async () => {
        const r = await runFlow(turn, ['مغازه همکف در تهران اجاره']);
        return r.confirmedFields?.includes('floorMin') ? null : 'floor not inferred';
      },
    },
    {
      id: 'real-estate-signal',
      run: async () => {
        const r = await runFlow(turn, ['ملک مسکونی اجاره']);
        return !r.offTopic ? null : 'real estate marked off-topic';
      },
    },
  ];

  const failed: string[] = [];
  for (const c of cases) {
    const err = await c.run();
    if (err) failed.push(`${c.id}: ${err}`);
  }
  return { passed: cases.length - failed.length, failed };
}
