'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { ROUTE_METADATA } from '@/lib/route-config';
import type { AppView } from '@/lib/types';

/**
 * هوک مدیریت متادیتای صفحه بر اساس نما فعلی اپلیکیشن
 * عنوان صفحه و توضیحات متا را بر اساس نما به‌روزرسانی می‌کند
 *
 * @param view - نما فعلی (اختیاری، اگر ارائه نشود از فروشگاه می‌خواند)
 *
 * @example
 * ```tsx
 * // استفاده خودکار از فروشگاه
 * usePageMetadata();
 *
 * // استفاده با نما مشخص
 * usePageMetadata('browse-requests');
 * ```
 */
export function usePageMetadata(view?: AppView): void {
  const currentView = useAppStore((s) => s.currentView);
  const viewParams = useAppStore((s) => s.viewParams);
  const activeView = view || currentView;

  useEffect(() => {
    // دریافت متادیتای نما
    const metadata = ROUTE_METADATA[activeView];

    if (!metadata) return;

    // ساخت عنوان صفحه
    let title = metadata.title;
    let description = metadata.description;

    // سفارشی‌سازی عنوان بر اساس پارامترها
    if (activeView === 'request-detail' && viewParams.slug) {
      title = `درخواست خدمات | ${SITE_NAME}`;
    } else if (activeView === 'specialist-profile' && viewParams.id) {
      title = `پروفایل متخصص | ${SITE_NAME}`;
    } else if (activeView === 'messages' && viewParams.conversationId) {
      title = `چت | ${SITE_NAME}`;
    }

    // به‌روزرسانی عنوان صفحه
    document.title = `${title} | نیاز فایندر`;

    // به‌روزرسانی توضیحات متا
    setMetaTag('description', description);
  }, [activeView, viewParams]);
}

/**
 * تنظیم یا ایجاد تگ متا
 */
function setMetaTag(name: string, content: string): void {
  if (typeof document === 'undefined') return;

  // جستجوی تگ موجود
  let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;

  if (meta) {
    // به‌روزرسانی تگ موجود
    meta.setAttribute('content', content);
  } else {
    // ایجاد تگ جدید
    meta = document.createElement('meta');
    meta.name = name;
    meta.content = content;
    document.head.appendChild(meta);
  }
}

// ثابت نام سایت
const SITE_NAME = 'نیاز فایندر';
