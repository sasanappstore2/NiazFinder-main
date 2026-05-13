'use client';

import { useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { ROUTE_PERMISSIONS } from '@/lib/route-config';
import type { User } from '@/lib/types';

/**
 * هوک محافظت از مسیرها - بررسی دسترسی کاربر
 * اگر کاربر نقش مورد نیاز را نداشته باشد، به صفحه ورود هدایت می‌شود
 *
 * @param requiredRoles - آرایه‌ای از نقش‌های مجاز (خالی = برای همه)
 * @param redirectTo - مسیر هدایت در صورت عدم دسترسی (پیش‌فرض: ورود)
 *
 * @example
 * ```tsx
 * // فقط متخصص‌ها و ادمین‌ها
 * useRouteGuard(['SPECIALIST', 'ADMIN']);
 *
 * // فقط ادمین‌ها
 * useRouteGuard(['ADMIN', 'SUPER_ADMIN']);
 *
 * // کاربران وارد شده
 * useRouteGuard(['CLIENT', 'SPECIALIST', 'ADMIN', 'SUPER_ADMIN']);
 * ```
 */
export function useRouteGuard(
  requiredRoles: string[] = [],
  redirectTo: 'login' | 'home' | 'dashboard' = 'login'
): { isAllowed: boolean; isLoading: boolean } {
  const currentUser = useAppStore((s) => s.currentUser);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const openAuthModal = useAppStore((s) => s.openAuthModal);

  // بررسی دسترسی
  const isAllowed = checkPermission(currentUser, requiredRoles);

  // هدایت کاربر در صورت عدم دسترسی
  useEffect(() => {
    // اگر نقش خاصی نیاز نیست، همه مجاز هستند
    if (requiredRoles.length === 0) return;

    // اگر کاربر وارد نشده
    if (!isAuthenticated) {
      if (redirectTo === 'login') {
        openAuthModal('login');
      } else {
        navigateTo(redirectTo);
      }
      return;
    }

    // اگر نقش کاربر مجاز نیست
    if (currentUser && !checkPermission(currentUser, requiredRoles)) {
      if (redirectTo === 'dashboard') {
        navigateTo('dashboard');
      } else if (redirectTo === 'home') {
        navigateTo('home');
      } else {
        navigateTo('home');
      }
    }
  }, [isAuthenticated, currentUser, requiredRoles, redirectTo, navigateTo, openAuthModal]);

  return {
    isAllowed,
    isLoading: false,
  };
}

/**
 * بررسی دسترسی کاربر بر اساس نقش‌های مورد نیاز
 */
function checkPermission(user: User | null, requiredRoles: string[]): boolean {
  // اگر نقشی مشخص نشده، همه مجاز هستند
  if (requiredRoles.length === 0) return true;

  // اگر کاربر وارد نشده و نقش نیاز است
  if (!user) return false;

  // بررسی نقش کاربر
  return requiredRoles.includes(user.role);
}

/**
 * هوک بررسی دسترسی برای مسیر مشخص
 * از پیکربندی مسیرها استفاده می‌کند
 */
export function useViewGuard(
  view: string,
  redirectTo: 'login' | 'home' | 'dashboard' = 'login'
): { isAllowed: boolean } {
  const currentUser = useAppStore((s) => s.currentUser);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const openAuthModal = useAppStore((s) => s.openAuthModal);

  const requiredRoles = ROUTE_PERMISSIONS[view] || [];
  const isAllowed = checkPermission(currentUser, requiredRoles);

  useEffect(() => {
    if (requiredRoles.length === 0) return;

    if (!isAuthenticated) {
      if (redirectTo === 'login') {
        openAuthModal('login');
      } else {
        navigateTo(redirectTo);
      }
      return;
    }

    if (currentUser && !checkPermission(currentUser, requiredRoles)) {
      if (redirectTo === 'dashboard') {
        navigateTo('dashboard');
      } else {
        navigateTo('home');
      }
    }
  }, [isAuthenticated, currentUser, requiredRoles, redirectTo, navigateTo, openAuthModal, view]);

  return { isAllowed };
}
