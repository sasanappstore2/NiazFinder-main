'use client';

import { useState, useCallback } from 'react';
import {
  Share2,
  Link as LinkIcon,
  Check,
  MessageCircle,
  Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { toast } from 'sonner';

interface ShareButtonProps {
  url?: string;
  title?: string;
  description?: string;
  /** Optional accessible label override */
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  /** Rectangular toolbar control aligned with profile CTAs */
  variant?: 'icon' | 'toolbar';
  className?: string;
}

const SIZE_MAP = {
  sm: { trigger: 'size-8', icon: 'size-3.5' },
  md: { trigger: 'size-9', icon: 'size-4' },
  lg: { trigger: 'size-10', icon: 'size-[18px]' },
};

const SHARE_OPTIONS = [
  {
    id: 'copy',
    label: 'کپی لینک',
    icon: LinkIcon,
    color: 'text-foreground hover:bg-muted',
  },
  {
    id: 'whatsapp',
    label: 'واتساپ',
    icon: MessageCircle,
    color: 'text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950/30',
  },
  {
    id: 'telegram',
    label: 'تلگرام',
    icon: Send,
    color: 'text-sky-500 hover:bg-sky-50 dark:text-sky-400 dark:hover:bg-sky-950/30',
  },
  {
    id: 'twitter',
    label: 'توییتر',
    icon: Share2,
    color: 'text-foreground hover:bg-muted',
  },
];

export function ShareButton({
  url = '',
  title = '',
  description = '',
  label,
  size = 'md',
  variant = 'icon',
  className,
}: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const sizeConfig = SIZE_MAP[size];

  const shareUrl = url || (typeof window !== 'undefined' ? window.location.href : '');
  const shareTitle = title || 'نیاز فایندر';

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('لینک کپی شد!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      toast.success('لینک کپی شد!');
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareUrl]);

  const handleShare = useCallback(
    (platform: string) => {
      let shareLink = '';
      const encodedUrl = encodeURIComponent(shareUrl);
      const encodedTitle = encodeURIComponent(shareTitle);
      const encodedDesc = encodeURIComponent(description);

      switch (platform) {
        case 'whatsapp':
          shareLink = `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`;
          break;
        case 'telegram':
          shareLink = `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`;
          break;
        case 'twitter':
          shareLink = `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`;
          break;
        default:
          return;
      }

      if (shareLink) {
        window.open(shareLink, '_blank', 'noopener,noreferrer,width=600,height=400');
        setOpen(false);
      }
    },
    [shareUrl, shareTitle, description]
  );

  const handleNativeShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: description,
          url: shareUrl,
        });
        setOpen(false);
      } catch {
        // User cancelled or error
      }
    }
  }, [shareTitle, description, shareUrl]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            variant === 'toolbar'
              ? cn(
                  'profile-toolbar-share inline-flex h-11 min-h-11 items-center justify-center gap-1.5 rounded-md',
                  'border border-border bg-background px-3 text-sm font-medium text-foreground shadow-sm',
                  'transition-colors hover:bg-muted/80 active:scale-[0.99]'
                )
              : cn(
                  'inline-flex items-center justify-center rounded-full',
                  'bg-background text-foreground/80 ring-2 ring-border/60 shadow-sm',
                  'transition-all duration-200',
                  'hover:bg-accent hover:text-foreground hover:ring-border',
                  'dark:bg-card dark:text-foreground/85 dark:ring-border/70 dark:hover:bg-accent/80',
                  'active:scale-95',
                  sizeConfig.trigger
                ),
            className
          )}
          aria-label={label ?? 'اشتراک‌گذاری'}
        >
          <Share2 className={variant === 'toolbar' ? 'size-4 shrink-0' : sizeConfig.icon} />
          {variant === 'toolbar' && <span>اشتراک</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className={cn(
          'w-52 p-1.5',
          'border-border/60 bg-card/95 backdrop-blur-xl',
          'dark:bg-card/90'
        )}
      >
        {/* Share options */}
        <div className="flex flex-col gap-0.5">
          {SHARE_OPTIONS.map((option) => {
            const Icon = option.icon;
            if (option.id === 'copy') {
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={handleCopyLink}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium',
                    'transition-all duration-150',
                    option.color,
                    copied && 'text-emerald-600 dark:text-emerald-400'
                  )}
                >
                  {copied ? (
                    <Check className="size-4" />
                  ) : (
                    <Icon className="size-4" />
                  )}
                  {copied ? 'کپی شد!' : option.label}
                </button>
              );
            }

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleShare(option.id)}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium',
                  'transition-all duration-150',
                  option.color
                )}
              >
                <Icon className="size-4" />
                {option.label}
              </button>
            );
          })}
        </div>

        {/* Native share button */}
        {typeof navigator !== 'undefined' && 'share' in navigator && (
          <>
            <div className="my-1.5 border-t border-border/40" />
            <button
              type="button"
              onClick={handleNativeShare}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-primary hover:bg-primary/5 transition-colors"
            >
              <Share2 className="size-4" />
              اشتراک‌گذاری بیشتر...
            </button>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
