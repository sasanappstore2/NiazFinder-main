/**
 * Client-side DOM probing for live HTML mirror (no screenshot / no hover API).
 */

import type { InferredListingFields } from '@/lib/filing/ingest/infer-listing-from-text';
import { inferListingFieldsFromText } from '@/lib/filing/ingest/infer-listing-from-text';

export type MirrorProbe = {
  cssSelector: string;
  cardSelector?: string;
  listContainerSelector?: string;
  textPreview: string;
  cardText?: string;
  tagName?: string;
  boundingBox: { x: number; y: number; width: number; height: number };
  inferred?: InferredListingFields;
};

function escapeCssIdent(value: string): string {
  if (typeof CSS !== 'undefined' && 'escape' in CSS) {
    return CSS.escape(value);
  }
  return value.replace(/([^\w-])/g, '\\$1');
}

export function buildCssSelector(node: Element | null): string {
  if (!node) return '';
  if (node.id) return `#${escapeCssIdent(node.id)}`;

  const parts: string[] = [];
  let el: Element | null = node;
  while (el && el.nodeType === 1 && parts.length < 8) {
    let part = el.tagName.toLowerCase();
    if (el.id) {
      parts.unshift(`#${escapeCssIdent(el.id)}`);
      break;
    }
    const parent = el.parentElement;
    if (parent) {
      const siblings = [...parent.children].filter((c) => c.tagName === el!.tagName);
      if (siblings.length > 1) {
        part += `:nth-of-type(${siblings.indexOf(el) + 1})`;
      }
    }
    const classes = Array.from(el.classList).slice(0, 2);
    if (classes.length) {
      part += classes.map((c) => `.${escapeCssIdent(c)}`).join('');
    }
    parts.unshift(part);
    el = parent;
  }
  return parts.join(' > ');
}

export function findListingCard(el: Element | null): Element | null {
  let node: Element | null = el;
  for (let i = 0; i < 14 && node; i++) {
    const text = (node.textContent || '').trim();
    const cls = node.className?.toString() || '';
    if (
      text.length > 50 &&
      (cls.includes('file') ||
        cls.includes('box') ||
        cls.includes('card') ||
        cls.includes('item') ||
        cls.includes('listing') ||
        cls.includes('property') ||
        cls.includes('field-row') ||
        text.includes('متری') ||
        text.includes('فایل') ||
        text.includes('رهن') ||
        text.includes('فروش') ||
        text.includes('کد فایل') ||
        text.includes('مبلغ'))
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return el;
}

export function listContainerSelectorFromCard(card: Element | null): string {
  if (!card) return '';
  const tag = card.tagName.toLowerCase();
  const classes = Array.from(card.classList);
  const pick = classes.filter(
    (c) =>
      /^(box|file|clearfix|card|item|listing|ad|property)$/i.test(c) ||
      c.includes('file') ||
      c.includes('listing') ||
      c.includes('card') ||
      c.includes('property')
  );
  if (pick.length >= 2) {
    return `${tag}.${pick
      .slice(0, 4)
      .map((c) => escapeCssIdent(c))
      .join('.')}`;
  }
  if (pick.length === 1) return `${tag}.${escapeCssIdent(pick[0])}`;
  return '';
}

export function probeElementFromDom(el: Element | null, userCity: string): MirrorProbe | null {
  if (!el) return null;
  const card = findListingCard(el);
  const target = card || el;
  const r = target.getBoundingClientRect();
  const cssSelector = buildCssSelector(target);
  const listSel = listContainerSelectorFromCard(target) || cssSelector;
  const cardText = (target.textContent || '').trim();
  const textPreview = (el.textContent || '').trim().slice(0, 200);
  const inferred = inferListingFieldsFromText(cardText, userCity);

  return {
    cssSelector,
    cardSelector: cssSelector,
    listContainerSelector: listSel,
    textPreview,
    cardText: cardText.slice(0, 2500),
    tagName: el.tagName.toLowerCase(),
    boundingBox: { x: r.x, y: r.y, width: r.width, height: r.height },
    inferred: Object.keys(inferred).length ? inferred : undefined,
  };
}

export type MirrorHighlightTarget = {
  id: string;
  label?: string;
  status: 'found' | 'uncertain' | 'missing';
  selector?: string;
  containerSelector?: string;
  innerSelector?: string;
};

export function resolveHighlightElements(
  doc: Document,
  target: MirrorHighlightTarget
): Element[] {
  const out: Element[] = [];
  if (target.containerSelector && target.innerSelector) {
    const roots = doc.querySelectorAll(target.containerSelector);
    roots.forEach((root) => {
      const el = root.querySelector(target.innerSelector!);
      if (el) out.push(el);
    });
    if (out.length) return out;
  }
  if (target.selector) {
    doc.querySelectorAll(target.selector).forEach((el) => out.push(el));
  } else if (target.containerSelector) {
    doc.querySelectorAll(target.containerSelector).forEach((el) => out.push(el));
  }
  return out;
}

const HIGHLIGHT_CLASS: Record<MirrorHighlightTarget['status'], string> = {
  found: 'nf-mirror-scan-found',
  uncertain: 'nf-mirror-scan-uncertain',
  missing: 'nf-mirror-scan-missing',
};

export function applyMirrorHighlights(
  doc: Document,
  targets: MirrorHighlightTarget[],
  activeId: string | null
): void {
  doc
    .querySelectorAll(
      '.nf-mirror-scan-found, .nf-mirror-scan-uncertain, .nf-mirror-scan-missing, .nf-mirror-scan-active'
    )
    .forEach((el) => {
      el.classList.remove(
        'nf-mirror-scan-found',
        'nf-mirror-scan-uncertain',
        'nf-mirror-scan-missing',
        'nf-mirror-scan-active'
      );
    });

  for (const t of targets) {
    const els = resolveHighlightElements(doc, t);
    const cls =
      t.id === activeId ? 'nf-mirror-scan-active' : HIGHLIGHT_CLASS[t.status] || 'nf-mirror-scan-uncertain';
    els.forEach((el) => el.classList.add(cls));
    if (t.id === activeId && els[0]) {
      els[0].scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'auto' });
    }
  }
}
