'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { ROUTE_PERMISSIONS } from '@/lib/route-config';
import { useNavigate } from '@/hooks/navigation/use-navigate';
import type { AppView, User } from '@/lib/types';

function checkPermission(user: User | null, requiredRoles: string[]): boolean {
  if (requiredRoles.length === 0) return true;
  if (!user) return false;
  return requiredRoles.includes(user.role);
}

export function useRouteGuard(
  requiredRoles: string[] = [],
  redirectTo: AppView | 'login' | 'home' | 'dashboard' = 'login'
): { isAllowed: boolean; isLoading: boolean } {
  const currentUser = useAppStore((s) => s.currentUser);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const { navigateTo } = useNavigate();
  const setAuthModalOpen = useAppStore((s) => s.setAuthModalOpen);
  const setAuthModalTab = useAppStore((s) => s.setAuthModalTab);

  const isAllowed = checkPermission(currentUser, requiredRoles);

  useEffect(() => {
    if (requiredRoles.length === 0) return;

    if (!isAuthenticated) {
      if (redirectTo === 'login') {
        setAuthModalTab('login');
        setAuthModalOpen(true);
      } else if (redirectTo !== 'login') {
        navigateTo(redirectTo as AppView);
      }
      return;
    }

    if (currentUser && !checkPermission(currentUser, requiredRoles)) {
      navigateTo(redirectTo === 'dashboard' ? 'dashboard' : 'home');
    }
  }, [isAuthenticated, currentUser, requiredRoles, redirectTo, navigateTo, setAuthModalOpen, setAuthModalTab]);

  return { isAllowed, isLoading: false };
}

export function useViewGuard(
  view: string,
  redirectTo: AppView | 'login' | 'home' | 'dashboard' = 'login'
): { isAllowed: boolean } {
  const currentUser = useAppStore((s) => s.currentUser);
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const { navigateTo } = useNavigate();
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
      } else if (redirectTo !== 'login') {
        navigateTo(redirectTo as AppView);
      }
      return;
    }

    if (currentUser && !checkPermission(currentUser, requiredRoles)) {
      navigateTo(redirectTo === 'dashboard' ? 'dashboard' : 'home');
    }
  }, [isAuthenticated, currentUser, requiredRoles, redirectTo, navigateTo, setAuthModalOpen, setAuthModalTab, view]);

  return { isAllowed };
}
