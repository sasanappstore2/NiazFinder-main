'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Save,
  X,
  User,
  Globe,
  MapPin,
  AtSign,
  ImageIcon,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Camera,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/lib/store';
import { useAppRouter } from '@/hooks/use-router';
import { toast } from 'sonner';

// ─── Animation variants ───────────────────────────────
const fadeIn = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};

// ─── Color helpers (same as UserProfile.tsx) ─────────
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
  return parts.length > 1
    ? parts[0][0] + parts[1][0]
    : parts[0][0];
}

// ─── Auth header helper ──────────────────────────────
function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('nf_auth_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ─── Main Component ───────────────────────────────────
export function EditProfilePage() {
  const currentUser = useAppStore((s) => s.currentUser);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const { push } = useAppRouter();

  // ── Form state ──────────────────────────────────────
  const [firstName, setFirstName] = useState(currentUser?.firstName || '');
  const [lastName, setLastName] = useState(currentUser?.lastName || '');
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [username, setUsername] = useState(currentUser?.username || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [city, setCity] = useState(currentUser?.city || '');
  const [province, setProvince] = useState(currentUser?.province || '');
  const [website, setWebsite] = useState(currentUser?.website || '');
  const [coverImage, setCoverImage] = useState(currentUser?.coverImage || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatar || '');

  // ── UI state ────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [usernameError, setUsernameError] = useState('');
  const [usernameChecking, setUsernameChecking] = useState(false);

  const displayNameForAvatar = displayName || `${firstName || 'ن'} ${lastName || 'ا'}`;
  const initials = getInitials(displayNameForAvatar);
  const avatarSolid = getAvatarSolid(displayNameForAvatar);

  // ── Username availability check (client-side hint) ──
  const checkUsername = useCallback(
    async (value: string) => {
      setUsernameError('');
      if (!value || value.trim().length < 3) return;

      const trimmed = value.trim().toLowerCase();
      // Only check if changed from original
      if (trimmed === currentUser?.username?.toLowerCase()) return;

      setUsernameChecking(true);
      try {
        const res = await fetch(`/api/users/profile`, {
          headers: getAuthHeaders(),
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          // Simple client-side hint: if user typed a very common username
          // We show a generic warning. Real check happens on save via PUT.
          const commonUsernames = ['admin', 'root', 'user', 'test', 'moderator', 'support'];
          if (commonUsernames.includes(trimmed)) {
            setUsernameError('این نام کاربری احتمالاً در دسترس نیست');
          }
        }
      } catch {
        // Silently fail
      } finally {
        setUsernameChecking(false);
      }
    },
    [currentUser?.username]
  );

  const handleUsernameChange = (value: string) => {
    // Only allow alphanumeric and underscore
    const cleaned = value.replace(/[^a-zA-Z0-9_]/g, '');
    setUsername(cleaned);
    checkUsername(cleaned);
  };

  // ── Validation ──────────────────────────────────────
  const validate = (): boolean => {
    if (!firstName.trim()) {
      toast.error('لطفاً نام خود را وارد کنید');
      return false;
    }
    if (!lastName.trim()) {
      toast.error('لطفاً نام خانوادگی خود را وارد کنید');
      return false;
    }
    if (username.trim() && username.trim().length < 3) {
      toast.error('نام کاربری باید حداقل ۳ کاراکتر باشد');
      return false;
    }
    if (username.trim() && !/^[a-zA-Z0-9_]+$/.test(username.trim())) {
      toast.error('نام کاربری فقط شامل حروف انگلیسی، اعداد و _ می‌تواند باشد');
      return false;
    }
    return true;
  };

  // ── Save handler ────────────────────────────────────
  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      const body: Record<string, string> = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        displayName: displayName.trim(),
        username: username.trim(),
        bio: bio.trim(),
        city: city.trim(),
        province: province.trim(),
        website: website.trim(),
        coverImage: coverImage.trim(),
        avatar: avatarUrl.trim(),
      };

      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          toast.error(data.error || 'این نام کاربری قبلاً ثبت شده است');
        } else if (res.status === 401) {
          toast.error('لطفاً ابتدا وارد حساب کاربری خود شوید');
        } else {
          toast.error(data.error || 'خطا در به‌روزرسانی پروفایل');
        }
        return;
      }

      // Update store with returned user data
      if (data.user) {
        updateProfile({
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          displayName: data.user.displayName,
          username: data.user.username,
          bio: data.user.bio,
          city: data.user.city,
          province: data.user.province,
          website: data.user.website,
          avatar: data.user.avatar,
          coverImage: data.user.coverImage,
        });
      }

      toast.success('پروفایل با موفقیت به‌روزرسانی شد');
      push('profile');
    } catch {
      toast.error('خطا در ارتباط با سرور. لطفاً دوباره تلاش کنید');
    } finally {
      setSaving(false);
    }
  };

  // ── Handle cancel ───────────────────────────────────
  const handleCancel = () => {
    push('profile');
  };

  return (
    <div className="min-h-screen bg-muted/20" dir="rtl">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="space-y-6"
        >
          {/* ── Back Button ──────────────────────────── */}
          <motion.div variants={staggerItem}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => push('profile')}
              className="gap-2 text-sm text-muted-foreground"
            >
              <ArrowRight className="size-4" />
              بازگشت به پروفایل
            </Button>
          </motion.div>

          {/* ── Page Title ───────────────────────────── */}
          <motion.div variants={staggerItem}>
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                <User className="size-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold sm:text-2xl">ویرایش پروفایل</h1>
                <p className="text-sm text-muted-foreground">
                  اطلاعات پروفایل خود را ویرایش کنید
                </p>
              </div>
            </div>
          </motion.div>

          {/* ── Profile Header Preview ───────────────── */}
          <motion.div variants={staggerItem}>
            <Card className="overflow-hidden border-border/60">
              {/* Cover image preview */}
              <div className="relative h-40 overflow-hidden bg-gradient-to-bl from-emerald-500 via-emerald-600 to-teal-700 sm:h-48">
                {coverImage ? (
                  <img
                    src={coverImage}
                    alt="تصویر کاور"
                    className="size-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <>
                    <div className="pointer-events-none absolute -left-10 -top-10 size-40 rounded-full bg-white/5" />
                    <div className="pointer-events-none absolute bottom-0 left-1/3 size-60 rounded-full bg-white/5" />
                    <div className="pointer-events-none absolute -right-8 bottom-4 size-32 rounded-full bg-white/5" />
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.08),transparent_50%)]" />
                  </>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
              </div>

              {/* Avatar preview */}
              <div className="relative -mt-14 flex items-end gap-4 bg-card px-6 pb-4 pt-0 sm:px-8">
                <div className="relative">
                  {avatarUrl ? (
                    <div className="size-28 overflow-hidden rounded-2xl ring-4 ring-card shadow-lg">
                      <img
                        src={avatarUrl}
                        alt="آواتار"
                        className="size-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                      <div className={`hidden size-28 flex items-center justify-center text-3xl font-extrabold text-white ${avatarSolid}`}>
                        {initials}
                      </div>
                    </div>
                  ) : (
                    <div className={`size-28 flex items-center justify-center text-3xl font-extrabold text-white rounded-2xl shadow-lg ring-4 ring-card ${avatarSolid}`}>
                      {initials}
                    </div>
                  )}
                  <div className="absolute -bottom-1 -left-1 flex size-7 items-center justify-center rounded-full bg-emerald-500 ring-[3px] ring-card shadow-sm">
                    <Camera className="size-3.5 text-white" />
                  </div>
                </div>
                <div className="mb-2 min-w-0 flex-1">
                  <h2 className="truncate text-lg font-bold sm:text-xl">
                    {displayName || `${firstName || 'نام'} ${lastName || 'خانوادگی'}`}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {username ? `@${username}` : 'نام کاربری تنظیم نشده'}
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* ── Main Form Card ───────────────────────── */}
          <motion.div variants={staggerItem}>
            <Card className="border-border/60">
              <CardContent className="p-6 sm:p-8">
                <div className="space-y-6">
                  {/* ── Personal Info Section ─────────── */}
                  <div>
                    <div className="mb-4 flex items-center gap-2">
                      <User className="size-4 text-emerald-500" />
                      <h3 className="text-sm font-bold">اطلاعات شخصی</h3>
                    </div>
                    <Separator className="mb-5 bg-border/60" />

                    <div className="grid gap-5 sm:grid-cols-2">
                      {/* نام */}
                      <div className="space-y-2">
                        <Label htmlFor="firstName" className="text-sm font-medium">
                          نام <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="firstName"
                          placeholder="مثلاً: علی"
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="border-border/80 bg-background focus:border-emerald-500 focus:ring-emerald-500/20"
                        />
                      </div>

                      {/* نام خانوادگی */}
                      <div className="space-y-2">
                        <Label htmlFor="lastName" className="text-sm font-medium">
                          نام خانوادگی <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="lastName"
                          placeholder="مثلاً: محمدی"
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="border-border/80 bg-background focus:border-emerald-500 focus:ring-emerald-500/20"
                        />
                      </div>

                      {/* نام نمایشی */}
                      <div className="space-y-2">
                        <Label htmlFor="displayName" className="text-sm font-medium">
                          نام نمایشی
                        </Label>
                        <Input
                          id="displayName"
                          placeholder="مثلاً: علی محمدی"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="border-border/80 bg-background focus:border-emerald-500 focus:ring-emerald-500/20"
                        />
                        <p className="text-caption text-muted-foreground">
                          این نام در پروفایل شما نمایش داده می‌شود
                        </p>
                      </div>

                      {/* نام کاربری */}
                      <div className="space-y-2">
                        <Label htmlFor="username" className="text-sm font-medium">
                          نام کاربری
                        </Label>
                        <div className="relative">
                          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                            @
                          </span>
                          <Input
                            id="username"
                            placeholder="مثلاً: ali_mohammadi"
                            value={username}
                            onChange={(e) => handleUsernameChange(e.target.value)}
                            className="border-border/80 bg-background pr-8 focus:border-emerald-500 focus:ring-emerald-500/20"
                            dir="ltr"
                          />
                          {usernameChecking && (
                            <Loader2 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                          )}
                        </div>
                        {usernameError ? (
                          <p className="flex items-center gap-1 text-caption text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="size-3" />
                            {usernameError}
                          </p>
                        ) : username.trim() && username.trim() !== currentUser?.username?.toLowerCase() ? (
                          <p className="flex items-center gap-1 text-caption text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="size-3" />
                            نام کاربری در دسترس به نظر می‌رسد
                          </p>
                        ) : (
                          <p className="text-caption text-muted-foreground">
                            فقط حروف انگلیسی، اعداد و _ (حداقل ۳ کاراکتر)
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* ── Bio Section ───────────────────── */}
                  <div>
                    <div className="mb-4 flex items-center gap-2">
                      <FileText className="size-4 text-emerald-500" />
                      <h3 className="text-sm font-bold">بیوگرافی</h3>
                    </div>
                    <Separator className="mb-5 bg-border/60" />

                    <div className="space-y-2">
                      <Textarea
                        placeholder="درباره خودتان بنویسید..."
                        value={bio}
                        onChange={(e) => {
                          if (e.target.value.length <= 500) {
                            setBio(e.target.value);
                          }
                        }}
                        rows={4}
                        className="border-border/80 bg-background resize-none focus:border-emerald-500 focus:ring-emerald-500/20"
                      />
                      <div className="flex items-center justify-between">
                        <p className="text-caption text-muted-foreground">
                          کمی درباره خودتان، مهارت‌ها و تخصص‌هایتان بنویسید
                        </p>
                        <Badge
                          variant={bio.length > 450 ? 'destructive' : 'secondary'}
                          className="text-caption font-medium tabular-nums"
                        >
                          {bio.length.toLocaleString('fa-IR')} / ۵۰۰
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* ── Location Section ──────────────── */}
                  <div>
                    <div className="mb-4 flex items-center gap-2">
                      <MapPin className="size-4 text-emerald-500" />
                      <h3 className="text-sm font-bold">موقعیت مکانی</h3>
                    </div>
                    <Separator className="mb-5 bg-border/60" />

                    <div className="grid gap-5 sm:grid-cols-2">
                      {/* شهر */}
                      <div className="space-y-2">
                        <Label htmlFor="city" className="text-sm font-medium">
                          شهر
                        </Label>
                        <Input
                          id="city"
                          placeholder="مثلاً: تهران"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="border-border/80 bg-background focus:border-emerald-500 focus:ring-emerald-500/20"
                        />
                      </div>

                      {/* استان */}
                      <div className="space-y-2">
                        <Label htmlFor="province" className="text-sm font-medium">
                          استان
                        </Label>
                        <Input
                          id="province"
                          placeholder="مثلاً: تهران"
                          value={province}
                          onChange={(e) => setProvince(e.target.value)}
                          className="border-border/80 bg-background focus:border-emerald-500 focus:ring-emerald-500/20"
                        />
                      </div>
                    </div>
                  </div>

                  {/* ── Links & Media Section ──────────── */}
                  <div>
                    <div className="mb-4 flex items-center gap-2">
                      <Globe className="size-4 text-emerald-500" />
                      <h3 className="text-sm font-bold">لینک‌ها و رسانه</h3>
                    </div>
                    <Separator className="mb-5 bg-border/60" />

                    <div className="space-y-5">
                      {/* وب‌سایت */}
                      <div className="space-y-2">
                        <Label htmlFor="website" className="text-sm font-medium">
                          وب‌سایت
                        </Label>
                        <div className="relative">
                          <Globe className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="website"
                            placeholder="مثلاً: https://example.com"
                            value={website}
                            onChange={(e) => setWebsite(e.target.value)}
                            dir="ltr"
                            className="border-border/80 bg-background pr-10 focus:border-emerald-500 focus:ring-emerald-500/20"
                          />
                        </div>
                        <p className="text-caption text-muted-foreground">
                          لینک وب‌سایت یا پورتفولیوی شخصی خود را وارد کنید
                        </p>
                      </div>

                      {/* تصویر کاور */}
                      <div className="space-y-2">
                        <Label htmlFor="coverImage" className="text-sm font-medium">
                          تصویر کاور
                        </Label>
                        <div className="relative">
                          <ImageIcon className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="coverImage"
                            placeholder="آدرس URL تصویر کاور"
                            value={coverImage}
                            onChange={(e) => setCoverImage(e.target.value)}
                            dir="ltr"
                            className="border-border/80 bg-background pr-10 focus:border-emerald-500 focus:ring-emerald-500/20"
                          />
                        </div>
                        {coverImage && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                          >
                            <div className="mt-2 overflow-hidden rounded-xl border border-border/60">
                              <img
                                src={coverImage}
                                alt="پیش‌نمایش کاور"
                                className="h-28 w-full object-cover sm:h-36"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).parentElement!.classList.add('hidden');
                                }}
                              />
                            </div>
                          </motion.div>
                        )}
                      </div>

                      {/* تصویر آواتار */}
                      <div className="space-y-2">
                        <Label htmlFor="avatar" className="text-sm font-medium">
                          تصویر آواتار
                        </Label>
                        <div className="relative">
                          <AtSign className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            id="avatar"
                            placeholder="آدرس URL تصویر آواتار"
                            value={avatarUrl}
                            onChange={(e) => setAvatarUrl(e.target.value)}
                            dir="ltr"
                            className="border-border/80 bg-background pr-10 focus:border-emerald-500 focus:ring-emerald-500/20"
                          />
                        </div>
                        {avatarUrl && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-2"
                          >
                            <div className="inline-block overflow-hidden rounded-xl border border-border/60 shadow-sm">
                              <img
                                src={avatarUrl}
                                alt="پیش‌نمایش آواتار"
                                className="size-20 object-cover sm:size-24"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).parentElement!.classList.add('hidden');
                                }}
                              />
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Action Buttons ────────────────────────── */}
          <motion.div
            variants={staggerItem}
            className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"
          >
            <Button
              variant="outline"
              size="lg"
              onClick={handleCancel}
              disabled={saving}
              className="gap-2 rounded-xl border-border/80 px-6"
            >
              <X className="size-4" />
              انصراف
            </Button>
            <Button
              size="lg"
              onClick={handleSave}
              disabled={saving}
              className="gap-2 rounded-xl bg-emerald-600 px-8 text-white hover:bg-emerald-700"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  در حال ذخیره...
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  ذخیره تغییرات
                </>
              )}
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
