'use client';

import { useCallback, useState } from 'react';
import { Check, Copy, ExternalLink, Hash, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { toPersianDigits } from '@/lib/format/digits';
import { ShareButton } from '@/components/shared/ShareButton';

type Props = {
  fileCode: string;
  title: string;
  detailUrl?: string | null;
  sourceLabel?: string | null;
};

export function FilingFileCodeBadge({ fileCode }: { fileCode: string }) {
  const [copied, setCopied] = useState(false);
  const display = toPersianDigits(fileCode);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(fileCode);
      setCopied(true);
      toast.success('کد فایل کپی شد');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('کپی نشد');
    }
  }, [fileCode]);

  return (
    <button type="button" className="file-code" onClick={copy} title="کپی کد فایل">
      <Hash className="size-3 opacity-80" aria-hidden />
      کد فایل:
      <span>{display}</span>
      {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5 opacity-80" aria-hidden />}
    </button>
  );
}

export function FilingDetailToolbar({ fileCode, title, detailUrl }: Props) {
  return (
    <div className="filing-toolbar">
      <div className="filing-toolbar-actions">
        {detailUrl ? (
          <a
            href={detailUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="filing-toolbar-btn"
          >
            <ExternalLink className="size-4" aria-hidden />
            <span>لینک خارجی</span>
          </a>
        ) : null}
        <ShareButton
          title={title}
          description={`کد فایل ${toPersianDigits(fileCode)}`}
          variant="toolbar"
          size="sm"
          label="اشتراک"
          className="filing-toolbar-btn filing-toolbar-btn--share"
        />
      </div>
    </div>
  );
}
