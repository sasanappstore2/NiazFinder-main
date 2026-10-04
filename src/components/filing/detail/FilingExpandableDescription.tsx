'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const COLLAPSE_CHARS = 100;

type Props = {
  text: string;
};

export function FilingExpandableDescription({ text }: Props) {
  const [expanded, setExpanded] = useState(false);
  const needsToggle = text.length > COLLAPSE_CHARS;
  const visible = expanded || !needsToggle ? text : `${text.slice(0, COLLAPSE_CHARS).trim()}…`;

  return (
    <div className="desc-block">
      <p className="whitespace-pre-wrap">{visible}</p>
      {needsToggle ? (
        <button
          type="button"
          className="desc-toggle"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded ? 'نمایش کمتر' : 'ادامه توضیحات'}
          <ChevronDown className={`size-4 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
