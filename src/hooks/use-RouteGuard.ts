'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { ROUTE_PERMISSIONS } from '@/lib/route-config';
import type { User } from '@/lib/types';

/**
 * بررسی دسترسی کاربر بر اساس نقش‌های مورد نیاز
 */
function checkPermission(user: User | null, requiredRoles: string[]): boolean {
  if (requiredRoles.length === 0) return true;
  if (!user) return false;
  return requiredRoles.includes(user.role);
}

/**
 * هوک محافظت از مسیرها - بررسی دسترسی کاربر
 * سازگار با Store قدیمی (store.ts)
 */
export function useRouteGuard(
  requiredRoles: string[] = [],
  redirectTo: 'login' | 'home' | 'dashboard' = 'login'
): { isAllowed: boolean; isLoading: boolean } {
  const currentUser = useAppStore((s) => s.currentUser);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const setAuthModalOpen = useAppStore((s) => s.setAuthModalOpen);
  const setAuthModalTab = useAppStore((s) => s.setAuthModalTab);

  const isAllowed = checkPermission(currentUser, requiredRoles);

  useEffect(() => {
    if (requiredRoles.length === 0) return;

    if (!isAuthenticated) {
      if (redirectTo === 'login') {
        setAuthModalTab('login');
        setAuthModalOpen(true);
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
  }, [isAuthenticated, currentUser, requiredRoles, redirectTo, navigateTo, setAuthModalOpen, setAuthModalTab]);

  return { isAllowed, isLoading: false };
}

/**
 * هوک بررسی دسترسی برای مسیر مشخص
 * سازگار با Store قدیمی (store.ts)
 */
export function useViewGuard(
  view: string,
  redirectTo: 'login' | 'home' | 'dashboard' = 'login'
): { isAllowed: boolean } {
  const currentUser = useAppStore((s) => s.currentUser);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const navigateTo = useAppStore((s) => s.navigateTo);
  const setAuthModalOpen = useAppStore((s) => s.setAuthModalOpen);
  const setAuthModalTab = useAppStore((s) => s.setAuthModalTab);

  const requiredRoles = ROUTE_PERMISSIONS[view] || [];
  const isAllowed = checkPermission(currentUser, requiredRoles);

  useEffect(() => {
    if (requiredRoles.length === 0) return;

    if (!isAuthenticated) {
      if (redirectTo === 'login') {
        setAuthModalTab('login');
        setAuthModalOpen(true);
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
  }, [isAuthenticated, currentUser, requiredRoles, redirectTo, navigateTo, setAuthModalOpen, setAuthModalTab, view]);

  return { isAllowed };
}
