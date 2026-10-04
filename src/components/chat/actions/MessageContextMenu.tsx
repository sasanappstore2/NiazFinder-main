'use client';

import { MoreHorizontal, Pin, PinOff, Reply, Star, Forward } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export interface MessageContextMenuProps {
  isMe: boolean;
  canDeleteForEveryone: boolean;
  canEdit?: boolean;
  onReply: () => void;
  onReact: (emoji: string) => void;
  onEdit?: () => void;
  onDeleteForMe: () => void;
  onDeleteForEveryone: () => void;
  isPinned?: boolean;
  onPin?: () => void;
  isStarred?: boolean;
  onToggleStar?: () => void;
  onForward?: () => void;
  onCopy?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTriggers?: boolean;
  anchorOnly?: boolean;
}

function MessageContextMenuItems({
  onReply,
  onReact,
  onEdit,
  onDeleteForMe,
  onDeleteForEveryone,
  canDeleteForEveryone,
  canEdit,
  isPinned = false,
  onPin,
  isStarred = false,
  onToggleStar,
  onForward,
  onCopy,
  onClose,
}: Pick<
  MessageContextMenuProps,
  | 'onReply'
  | 'onReact'
  | 'onEdit'
  | 'onDeleteForMe'
  | 'onDeleteForEveryone'
  | 'canDeleteForEveryone'
  | 'canEdit'
  | 'isPinned'
  | 'onPin'
  | 'isStarred'
  | 'onToggleStar'
  | 'onForward'
  | 'onCopy'
> & { onClose?: () => void }) {
  const close = () => onClose?.();

  return (
    <>
      <DropdownMenuItem
        onSelect={(e) => {
          e.preventDefault();
          onReply();
          close();
        }}
      >
        پاسخ
      </DropdownMenuItem>
      {onCopy ? (
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            onCopy();
            close();
          }}
        >
          کپی متن
        </DropdownMenuItem>
      ) : null}
      {onForward ? (
        <DropdownMenuItem
          className="gap-2"
          onSelect={(e) => {
            e.preventDefault();
            onForward();
            close();
          }}
        >
          <Forward className="size-4 opacity-70" />
          هدایت
        </DropdownMenuItem>
      ) : null}
      <DropdownMenuItem
        onSelect={(e) => {
          e.preventDefault();
          onReact('👍');
          close();
        }}
      >
        👍 لایک
      </DropdownMenuItem>
      <DropdownMenuItem
        onSelect={(e) => {
          e.preventDefault();
          onReact('👎');
          close();
        }}
      >
        👎 دیسلایک
      </DropdownMenuItem>
      <DropdownMenuItem
        onSelect={(e) => {
          e.preventDefault();
          onReact('❤️');
          close();
        }}
      >
        ❤️ لاو
      </DropdownMenuItem>
      {onToggleStar ? (
        <DropdownMenuItem
          className="gap-2"
          onSelect={(e) => {
            e.preventDefault();
            onToggleStar();
            close();
          }}
        >
          <Star className={cn('size-4', isStarred && 'fill-amber-400 text-amber-500')} />
          {isStarred ? 'برداشتن ستاره' : 'ستاره‌دار کردن'}
        </DropdownMenuItem>
      ) : null}
      {canEdit && onEdit ? (
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            onEdit();
            close();
          }}
        >
          ویرایش پیام
        </DropdownMenuItem>
      ) : null}
      {onPin ? (
        <DropdownMenuItem
          className="gap-2"
          onSelect={(e) => {
            e.preventDefault();
            onPin();
            close();
          }}
        >
          {isPinned ? (
            <>
              <PinOff className="size-4 opacity-70" />
              برداشتن سنجاق
            </>
          ) : (
            <>
              <Pin className="size-4 opacity-70" />
              سنجاق کردن
            </>
          )}
        </DropdownMenuItem>
      ) : null}
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onSelect={(e) => {
          e.preventDefault();
          onDeleteForMe();
          close();
        }}
      >
        حذف یک‌طرفه
      </DropdownMenuItem>
      {canDeleteForEveryone ? (
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onSelect={(e) => {
            e.preventDefault();
            onDeleteForEveryone();
            close();
          }}
        >
          حذف دوطرفه
        </DropdownMenuItem>
      ) : null}
    </>
  );
}

export function MessageContextMenu({
  isMe,
  canDeleteForEveryone,
  canEdit = false,
  onReply,
  onReact,
  onEdit,
  onDeleteForMe,
  onDeleteForEveryone,
  isPinned = false,
  onPin,
  isStarred = false,
  onToggleStar,
  onForward,
  onCopy,
  open,
  onOpenChange,
  showTriggers = true,
  anchorOnly = false,
}: MessageContextMenuProps) {
  const items = (
    <MessageContextMenuItems
      onReply={onReply}
      onReact={onReact}
      onEdit={onEdit}
      onDeleteForMe={onDeleteForMe}
      onDeleteForEveryone={onDeleteForEveryone}
      canDeleteForEveryone={canDeleteForEveryone}
      canEdit={canEdit}
      isPinned={isPinned}
      onPin={onPin}
      isStarred={isStarred}
      onToggleStar={onToggleStar}
      onForward={onForward}
      onCopy={onCopy}
      onClose={() => onOpenChange?.(false)}
    />
  );

  const menu = (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        {anchorOnly ? (
          <button
            type="button"
            tabIndex={-1}
            aria-hidden
            className={cn(
              'pointer-events-none absolute inset-0 z-10 opacity-0',
              'h-full w-full rounded-[inherit]'
            )}
          />
        ) : (
          <button
            type="button"
            className="flex h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-background/90 text-muted-foreground shadow-sm backdrop-blur-xs hover:bg-muted"
            aria-label="عملیات پیام"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={isMe ? 'end' : 'start'} side={anchorOnly ? 'top' : 'bottom'}>
        {items}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (anchorOnly) return menu;
  if (!showTriggers) return null;

  return (
    <>
      <button
        type="button"
        onClick={onReply}
        className="flex h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-background/90 text-muted-foreground shadow-sm backdrop-blur-xs transition-colors hover:bg-primary/10 hover:text-primary"
        aria-label="پاسخ"
      >
        <Reply className="h-3.5 w-3.5" />
      </button>
      {menu}
    </>
  );
}
