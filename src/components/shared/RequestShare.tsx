'use client';

import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Share2, Link2, Send, MessageCircle, Mail, Check } from 'lucide-react';

interface RequestShareProps {
  requestTitle: string;
  requestId: string;
}

const SHARE_URL = (requestId: string) =>
  `https://needfinder.ir/request/${requestId}`;

const socialButtons = [
  {
    key: 'telegram' as const,
    label: 'تلگرام',
    icon: Send,
    color: '#0088cc',
    getUrl: (url: string, title: string) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  },
  {
    key: 'whatsapp' as const,
    label: 'واتساپ',
    icon: MessageCircle,
    color: '#25D366',
    getUrl: (url: string, title: string) =>
      `https://wa.me/?text=${encodeURIComponent(title + ' ' + url)}`,
  },
  {
    key: 'email' as const,
    label: 'ایمیل',
    icon: Mail,
    color: undefined,
    getUrl: (url: string, title: string) =>
      `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`,
  },
] as const;

export function RequestShare({ requestTitle, requestId }: RequestShareProps) {
  const [copied, setCopied] = useState(false);
  const url = SHARE_URL(requestId);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('لینک در کلیپ‌بورد کپی شد');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('خطا در کپی کردن لینک');
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400"
          aria-label="اشتراک‌گذاری"
        >
          <Share2 className="h-4 w-4" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-72 rounded-xl border border-border/60 p-0 shadow-lg"
        align="start"
        side="top"
      >
        <div className="space-y-1 p-4">
          {/* Title */}
          <h3 className="text-sm font-bold text-foreground">
            اشتراک‌گذاری این نیاز
          </h3>
          <p className="line-clamp-1 text-xs text-muted-foreground" dir="rtl">
            {requestTitle}
          </p>
        </div>

        <div className="border-t border-border/50 px-4 pb-4 pt-3 space-y-3">
          {/* Copy Link Button */}
          <div>
            <Button
              onClick={handleCopyLink}
              variant="outline"
              className="w-full justify-start gap-3 rounded-xl border-emerald-200 bg-emerald-50/50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-emerald-950/50"
            >
              {copied ? (
                <Check className="h-4 w-4 shrink-0" />
              ) : (
                <Link2 className="h-4 w-4 shrink-0" />
              )}
              <span className="text-sm font-medium">
                {copied ? 'کپی شد!' : 'کپی لینک'}
              </span>
            </Button>
          </div>

          {/* Social Share Buttons */}
          {socialButtons.map((social) => {
            const Icon = social.icon;
            const shareUrl = social.getUrl(url, requestTitle);

            return (
              <div key={social.key}>
                <Button
                  asChild
                  variant="outline"
                  className="w-full justify-start gap-3 rounded-xl hover:bg-accent"
                  style={
                    social.color
                      ? {
                          borderColor: social.color + '40',
                          color: social.color,
                        }
                      : undefined
                  }
                >
                  <a
                    href={shareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center gap-3 text-sm font-medium"
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{social.label}</span>
                  </a>
                </Button>
              </div>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
