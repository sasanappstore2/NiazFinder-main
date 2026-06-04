'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ImagePlus,
  X,
  Send,
  Eye,
  EyeOff,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAppStore } from '@/lib/store';
import { useAppRouter } from '@/hooks/use-router';
import { isAllowedMediaUrl } from '@/lib/media/is-allowed-media-url';
import { toast } from 'sonner';

// ─── Animation variants ─────────────────────────────────
const fadeIn = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

// ─── Avatar helpers ─────────────────────────────────────
const AVATAR_SOLID = [
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-violet-500',
  'bg-cyan-500',
  'bg-orange-500',
];

function getAvatarSolid(name: string) {
  const hash = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_SOLID[hash % AVATAR_SOLID.length];
}

function getInitials(name: string) {
  const parts = name.trim().split(' ');
  return parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0][0];
}

// ─── Auth header helper ─────────────────────────────────
function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('nf_auth_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ─── Main Component ─────────────────────────────────────
export function CreatePostPage() {
  const { push } = useAppRouter();
  const currentUser = useAppStore((s) => s.currentUser);

  const [content, setContent] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const displayName = currentUser
    ? currentUser.displayName || `${currentUser.firstName} ${currentUser.lastName}`
    : 'کاربر';
  const initials = getInitials(displayName);
  const avatarColor = getAvatarSolid(displayName);
  const charCount = content.length;
  const maxChars = 2000;
  const charPercent = (charCount / maxChars) * 100;

  // ── Add image URL ─────────────────────────────────────
  const handleAddImageUrl = () => {
    const url = imageUrlInput.trim();
    if (!url) return;

    if (!url.startsWith('/uploads/') && !url.startsWith('/images/')) {
      toast.error('فقط مسیر داخلی مجاز است (مثلاً /images/placeholders/demo-1.webp)');
      return;
    }
    if (!isAllowedMediaUrl(url)) {
      toast.error('آدرس تصویر باید از storage داخلی باشد');
      return;
    }

    if (imageUrls.length >= 10) {
      toast.error('حداکثر ۱۰ تصویر مجاز است');
      return;
    }

    if (imageUrls.includes(url)) {
      toast.error('این آدرس تصویر قبلاً اضافه شده است');
      return;
    }

    setImageUrls((prev) => [...prev, url]);
    setImageUrlInput('');
  };

  // ── Remove image URL ──────────────────────────────────
  const handleRemoveImageUrl = (index: number) => {
    setImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Submit post ───────────────────────────────────────
  const handleSubmit = async () => {
    if (!content.trim()) {
      toast.error('لطفاً محتوای پست را وارد کنید');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          content: content.trim(),
          imageUrls,
          isPrivate,
        }),
      });

      if (res.ok) {
        toast.success('پست شما با موفقیت منتشر شد! 🎉');
        push('social-feed');
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || 'خطا در انتشار پست. لطفاً دوباره تلاش کنید.');
      }
    } catch {
      toast.error('خطا در ارتباط با سرور. لطفاً دوباره تلاش کنید.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/20" dir="rtl">
      <div className="mx-auto max-w-2xl px-4 py-6">
        {/* ── Back Button ──────────────────────────────── */}
        <motion.div {...fadeIn} className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => push('social-feed')}
            className="gap-2 text-sm text-muted-foreground"
          >
            <ArrowRight className="size-4" />
            بازگشت به فید
          </Button>
        </motion.div>

        {/* ── Main Card ────────────────────────────────── */}
        <motion.div {...fadeIn} transition={{ delay: 0.05 }}>
          <Card className="border-border/60 bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-extrabold flex items-center gap-2">
                <Send className="size-5 text-emerald-500" />
                ایجاد پست جدید
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-6">
              <motion.div
                variants={container}
                initial="hidden"
                animate="show"
                className="space-y-6"
              >
                {/* ─── Author info ──────────────────────────── */}
                <motion.div variants={item} className="flex items-center gap-3">
                  <Avatar className="size-11 rounded-xl">
                    <AvatarFallback
                      className={`${avatarColor} rounded-xl text-white font-bold text-sm`}
                    >
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-bold">{displayName}</p>
                    <p className="text-xs text-muted-foreground">
                      @{currentUser?.username || 'کاربر'}
                    </p>
                  </div>
                  {/* Privacy toggle */}
                  <div className="flex items-center gap-2">
                    <Label
                      htmlFor="privacy-toggle"
                      className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1"
                    >
                      {isPrivate ? (
                        <>
                          <EyeOff className="size-3.5" />
                          خصوصی
                        </>
                      ) : (
                        <>
                          <Eye className="size-3.5" />
                          عمومی
                        </>
                      )}
                    </Label>
                    <Switch
                      id="privacy-toggle"
                      checked={isPrivate}
                      onCheckedChange={setIsPrivate}
                    />
                  </div>
                </motion.div>

                <Separator className="bg-border/40" />

                {/* ─── Content textarea ─────────────────────── */}
                <motion.div variants={item}>
                  <div className="relative">
                    <Textarea
                      value={content}
                      onChange={(e) => {
                        if (e.target.value.length <= maxChars) {
                          setContent(e.target.value);
                        }
                      }}
                      placeholder="چه خبری داری؟ افکارت رو به اشتراک بذار..."
                      className="min-h-[180px] resize-none text-sm leading-7 border-0 focus-visible:ring-1 bg-muted/30 rounded-xl p-4"
                    />
                  </div>
                  {/* Character counter */}
                  <div className="mt-2 flex items-center justify-between">
                    <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden ml-4">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          charPercent > 90
                            ? 'bg-rose-500'
                            : charPercent > 70
                              ? 'bg-amber-500'
                              : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(charPercent, 100)}%` }}
                      />
                    </div>
                    <span
                      className={`text-xs font-medium tabular-nums ${
                        charPercent > 90
                          ? 'text-rose-500'
                          : charPercent > 70
                            ? 'text-amber-500'
                            : 'text-muted-foreground'
                      }`}
                    >
                      {charCount.toLocaleString('fa-IR')} / {maxChars.toLocaleString('fa-IR')}
                    </span>
                  </div>
                </motion.div>

                <Separator className="bg-border/40" />

                {/* ─── Image URLs ────────────────────────────── */}
                <motion.div variants={item}>
                  <div className="flex items-center gap-2 mb-3">
                    <ImagePlus className="size-4 text-emerald-500" />
                    <h3 className="text-sm font-bold">تصاویر</h3>
                    <Badge variant="secondary" className="text-caption">
                      اختیاری · حداکثر ۱۰
                    </Badge>
                  </div>

                  {/* Existing image URLs */}
                  <AnimatePresence>
                    {imageUrls.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mb-3 space-y-2"
                      >
                        {imageUrls.map((url, i) => (
                          <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2"
                          >
                            <ImagePlus className="size-4 text-muted-foreground shrink-0" />
                            <span className="flex-1 truncate text-xs text-muted-foreground">
                              {url}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 shrink-0 text-muted-foreground hover:text-rose-500"
                              onClick={() => handleRemoveImageUrl(i)}
                            >
                              <X className="size-3.5" />
                            </Button>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Image URL input */}
                  <div className="flex items-center gap-2">
                    <Input
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddImageUrl();
                        }
                      }}
                      placeholder="مسیر داخلی تصویر (مثلاً /images/placeholders/demo-1.webp)"
                      className="text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleAddImageUrl}
                      disabled={!imageUrlInput.trim()}
                      className="shrink-0 rounded-xl"
                    >
                      <ImagePlus className="size-4" />
                    </Button>
                  </div>
                </motion.div>

                <Separator className="bg-border/40" />

                {/* ─── Submit section ────────────────────────── */}
                <motion.div variants={item} className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {isPrivate ? (
                      <Badge variant="outline" className="text-caption gap-1">
                        <EyeOff className="size-3" />
                        فقط من
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="text-caption gap-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400"
                      >
                        <Eye className="size-3" />
                        عمومی
                      </Badge>
                    )}
                    {imageUrls.length > 0 && (
                      <Badge variant="secondary" className="text-caption gap-1">
                        <ImagePlus className="size-3" />
                        {imageUrls.length.toLocaleString('fa-IR')} تصویر
                      </Badge>
                    )}
                  </div>

                  <Button
                    onClick={handleSubmit}
                    disabled={submitting || !content.trim()}
                    className="gap-2 rounded-xl min-w-[140px]"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        در حال انتشار...
                      </>
                    ) : (
                      <>
                        <Send className="size-4" />
                        انتشار پست
                      </>
                    )}
                  </Button>
                </motion.div>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
