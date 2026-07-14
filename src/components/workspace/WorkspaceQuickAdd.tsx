'use client';

import Link from 'next/link';
import { Plus, FileText, MapPinned, Users, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { routeBuilder } from '@/config/routes';

export function WorkspaceQuickAdd({ onCollaborationRequest }: { onCollaborationRequest?: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" className="h-9 gap-1">
          <Plus className="size-4" />
          افزودن سریع
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem asChild>
          <Link href={routeBuilder.needNew()}>
            <FileText className="size-4 ml-2" />
            نیاز جدید
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={routeBuilder.myBusiness()}>
            <MapPinned className="size-4 ml-2" />
            تنظیم محدوده منطقه
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            onCollaborationRequest?.();
          }}
        >
          <Users className="size-4 ml-2" />
          درخواست همکاری
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <ClipboardList className="size-4 ml-2" />
          پیگیری جدید (به‌زودی)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
