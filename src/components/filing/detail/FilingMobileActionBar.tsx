'use client';

import Link from 'next/link';
import { ClipboardList, LayoutGrid, Phone, Plus, Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { toPersianDigits } from '@/lib/format/digits';
import { routeBuilder } from '@/config/routes';

type Props = {
  phone?: string | null;
  title: string;
  fileCode: string;
};

export function FilingMobileActionBar({ phone, title, fileCode }: Props) {
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
    <nav className="filing-mobile-bar" aria-label="اقدامات سریع">
      <div className="filing-mobile-bar__inner">
        {phone ? (
          <a href={`tel:${phone}`} className="filing-mobile-bar__primary">
            <Phone className="size-5 shrink-0" aria-hidden />
            <span>تماس</span>
          </a>
        ) : (
          <Link href={routeBuilder.needNew()} className="filing-mobile-bar__primary">
            <Plus className="size-5 shrink-0" aria-hidden />
            <span>ثبت نیاز</span>
          </Link>
        )}

        <div className="filing-mobile-bar__tools" role="group" aria-label="سایر اقدامات">
          <button
            type="button"
            className="filing-mobile-bar__tool"
            onClick={share}
            aria-label="اشتراک‌گذاری"
          >
            <Share2 className="size-[1.125rem]" aria-hidden />
            <span className="filing-mobile-bar__tool-label">اشتراک</span>
          </button>
          <Link
            href={routeBuilder.needNew()}
            className="filing-mobile-bar__tool"
            aria-label="ثبت درخواست"
          >
            <ClipboardList className="size-[1.125rem]" aria-hidden />
            <span className="filing-mobile-bar__tool-label">درخواست</span>
          </Link>
          <Link
            href={routeBuilder.filingBrowse()}
            className="filing-mobile-bar__tool"
            aria-label="بازگشت به فایلینگ"
          >
            <LayoutGrid className="size-[1.125rem]" aria-hidden />
            <span className="filing-mobile-bar__tool-label">فایلینگ</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
