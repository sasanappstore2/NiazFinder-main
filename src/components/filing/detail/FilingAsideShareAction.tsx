'use client';

import { ChevronLeft, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { toPersianDigits } from '@/lib/format/digits';

type Props = {
  title: string;
  fileCode: string;
};

export function FilingAsideShareAction({ title, fileCode }: Props) {
  const share = async () => {
    const url = window.location.href;
    const text = `${title} — کد ${toPersianDigits(fileCode)}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        /* cancelled */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success('لینک کپی شد');
    } catch {
      toast.error('اشتراک‌گذاری ممکن نشد');
    }
  };

  return (
    <button type="button" className="filing-aside-action" onClick={share}>
      <span className="filing-aside-action__icon" aria-hidden>
        <Share2 className="size-4" />
      </span>
      <span className="filing-aside-action__body">
        <span className="filing-aside-action__title">اشتراک‌گذاری</span>
        <span className="filing-aside-action__hint">ارسال لینک این آگهی</span>
      </span>
      <ChevronLeft className="filing-aside-action__chevron size-4" aria-hidden />
    </button>
  );
}
