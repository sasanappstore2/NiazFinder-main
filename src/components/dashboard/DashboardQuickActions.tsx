'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import {
  ClipboardPlus,
  Compass,
  Gift,
  Kanban,
  Store,
  Wallet,
} from 'lucide-react';
import { routeBuilder } from '@/config/routes';
import { cn } from '@/lib/utils';

interface QuickAction {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
  href: string;
}

const CLIENT_ACTIONS: QuickAction[] = [
  {
    key: 'post-need',
    label: 'ثبت نیاز جدید',
    description: 'در چند ثانیه نیازتان را بنویسید',
    icon: ClipboardPlus,
    href: routeBuilder.needNew(),
  },
  {
    key: 'browse',
    label: 'بازار نیازها',
    description: 'نیازهای دیگران را ببینید',
    icon: Compass,
    href: routeBuilder.search({ market: 'need', location: 'iran' }),
  },
  {
    key: 'referral',
    label: 'دعوت از دوستان',
    description: 'با دعوت دوستان پاداش بگیرید',
    icon: Gift,
    href: routeBuilder.referral(),
  },
];

function businessActions(): QuickAction[] {
  return [
    {
      key: 'workspace',
      label: 'میزکار',
      description: 'پیگیری لیدها و فایل‌های منطقه',
      icon: Kanban,
      href: routeBuilder.workspace(),
    },
    {
      key: 'my-business',
      label: 'پروفایل کسب‌وکار',
      description: 'اطلاعات و خدمات خود را مدیریت کنید',
      icon: Store,
      href: routeBuilder.myBusiness(),
    },
    {
      key: 'wallet',
      label: 'کیف پول',
      description: 'موجودی و تراکنش‌ها',
      icon: Wallet,
      href: '#wallet',
    },
    {
      key: 'referral',
      label: 'دعوت از دوستان',
      description: 'با دعوت دوستان پاداش بگیرید',
      icon: Gift,
      href: routeBuilder.referral(),
    },
  ];
}

export function DashboardQuickActions({
  isBusiness,
  onWalletTab,
}: {
  isBusiness: boolean;
  onWalletTab: () => void;
}) {
  const actions = isBusiness ? businessActions() : CLIENT_ACTIONS;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {actions.map((action) => {
        const isWalletShortcut = action.href === '#wallet';
        const content = (
          <>
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <action.icon className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{action.label}</p>
              <p className="truncate text-xs text-muted-foreground">{action.description}</p>
            </div>
          </>
        );
        const className = cn(
          'flex items-center gap-3 rounded-xl border border-border/60 bg-card p-3.5',
          'text-start transition-colors hover:border-primary/40 hover:bg-primary/5'
        );

        if (isWalletShortcut) {
          return (
            <button key={action.key} type="button" onClick={onWalletTab} className={className}>
              {content}
            </button>
          );
        }

        return (
          <Link key={action.key} href={action.href} className={className}>
            {content}
          </Link>
        );
      })}
    </div>
  );
}
