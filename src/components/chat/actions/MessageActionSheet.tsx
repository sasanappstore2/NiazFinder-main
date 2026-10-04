'use client';

import type { ReactNode } from 'react';
import { Forward, Pin, PinOff, Star } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { MessageContextMenuProps } from '@/components/chat/actions/MessageContextMenu';

type ActionSheetProps = Pick<
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
> & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function ActionRow({
  label,
  onClick,
  destructive,
  icon,
}: {
  label: string;
  onClick: () => void;
  destructive?: boolean;
  icon?: ReactNode;
}) {
  return (
    <button
      type="button"
      className={cn(
        'flex min-h-12 w-full items-center gap-3 rounded-xl px-4 text-start text-base font-medium transition-colors',
        'hover:bg-muted active:bg-muted',
        destructive && 'text-destructive'
      )}
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}

/** Mobile bottom sheet for message long-press actions. */
export function MessageActionSheet({
  open,
  onOpenChange,
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
}: ActionSheetProps) {
  const close = () => onOpenChange(false);
  const run = (fn: () => void) => {
    fn();
    close();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        showCloseButton={false}
        className="max-h-[min(85dvh,560px)] gap-0 rounded-t-2xl px-0 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2"
      >
        <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-muted-foreground/30" aria-hidden />
        <SheetHeader className="border-b border-border/50 px-4 pb-3 text-start">
          <SheetTitle className="text-base">عملیات پیام</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-0.5 overflow-y-auto px-2 py-2">
          <ActionRow label="پاسخ" onClick={() => run(onReply)} />
          {onCopy ? <ActionRow label="کپی متن" onClick={() => run(onCopy)} /> : null}
          {onForward ? (
            <ActionRow
              label="هدایت"
              icon={<Forward className="size-4 opacity-70" />}
              onClick={() => run(onForward)}
            />
          ) : null}
          <div className="flex gap-2 px-2 py-2">
            {(['👍', '👎', '❤️'] as const).map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="flex h-12 flex-1 items-center justify-center rounded-xl bg-muted/60 text-xl active:bg-muted"
                onClick={() => run(() => onReact(emoji))}
                aria-label={`واکنش ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
          {onToggleStar ? (
            <ActionRow
              label={isStarred ? 'برداشتن ستاره' : 'ستاره‌دار کردن'}
              icon={
                <Star
                  className={cn('size-4', isStarred && 'fill-amber-400 text-amber-500')}
                />
              }
              onClick={() => run(onToggleStar)}
            />
          ) : null}
          {canEdit && onEdit ? (
            <ActionRow label="ویرایش پیام" onClick={() => run(onEdit)} />
          ) : null}
          {onPin ? (
            <ActionRow
              label={isPinned ? 'برداشتن سنجاق' : 'سنجاق کردن'}
              icon={
                isPinned ? (
                  <PinOff className="size-4 opacity-70" />
                ) : (
                  <Pin className="size-4 opacity-70" />
                )
              }
              onClick={() => run(onPin)}
            />
          ) : null}
          <div className="my-1 h-px bg-border/60" />
          <ActionRow label="حذف یک‌طرفه" onClick={() => run(onDeleteForMe)} />
          {canDeleteForEveryone ? (
            <ActionRow
              label="حذف دوطرفه"
              destructive
              onClick={() => run(onDeleteForEveryone)}
            />
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
