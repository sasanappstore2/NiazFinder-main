import type { ReactNode } from 'react';

export interface HeaderProps {
  megaMenuSlot?: ReactNode;
  searchSlot?: ReactNode;
  className?: string;
}

export interface HeaderNavItem {
  id: string;
  label: string;
  href: string;
  requiresAuth?: boolean;
}
