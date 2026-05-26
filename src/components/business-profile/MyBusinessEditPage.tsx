'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  ExternalLink,
  Eye,
  FolderTree,
  LayoutGrid,
  Loader2,
  Package,
  Store,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { routeBuilder } from '@/config/routes';
import { canManageBusinessProfile } from '@/lib/business/can-manage-business-profile';
import { useAppStore } from '@/lib/store';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BusinessIdentityEditor } from '@/components/business-profile/BusinessIdentityEditor';
import { BusinessCategoryPicker } from '@/components/business-profile/BusinessCategoryPicker';
import { BusinessProfileTabSettings } from '@/components/business-profile/BusinessProfileTabSettings';
import { BusinessProfileCMS } from '@/components/business-profile/BusinessProfileCMS';

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('nf_auth_token') : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

type EditSection = 'identity' | 'category' | 'tabs' | 'content';

const SECTIONS: { id: EditSection; label: string; icon: typeof Building2 }[] = [
  { id: 'identity', label: 'هویت و معرفی', icon: Building2 },
  { id: 'category', label: 'دسته‌بندی', icon: FolderTree },
  { id: 'tabs', label: 'تب‌های پروفایل', icon: LayoutGrid },
  { id: 'content', label: 'محتوا و خدمات', icon: Package },
];

export function MyBusinessEditPage({ slugFromUrl }: { slugFromUrl: string }) {
  const router = useRouter();
  const { currentUser } = useAppStore();
  const [section, setSection] = useState<EditSection>('identity');
  const [categorySlug, setCategorySlug] = useState('');
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [profile, setProfile] = useState<{
    slug: string;
    name: string;
    publicUrl: string;
    verified: boolean;
    viewCount: number;
  } | null>(null);

  const canManage = canManageBusinessProfile(currentUser?.role);

  const loadProfile = useCallback(async () => {
    if (!canManage) {
      setForbidden(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/business/me', { headers: getAuthHeaders() });
      if (res.status === 403) {
        setForbidden(true);
        return;
      }
      if (!res.ok) {
        setForbidden(true);
        return;
      }

      const data = (await res.json()) as {
        slug: string;
        name: string;
        publicUrl: string;
        verified?: boolean;
        viewCount?: number;
        primaryCategorySlug?: string;
      };

      if (data.slug !== slugFromUrl) {
        router.replace(routeBuilder.businessEdit(data.slug));
        return;
      }

      setProfile({
        slug: data.slug,
        name: data.name,
        publicUrl: data.publicUrl,
        verified: data.verified ?? false,
        viewCount: data.viewCount ?? 0,
      });
      if (data.primaryCategorySlug) {
        setCategorySlug(data.primaryCategorySlug);
      }
    } catch {
      setForbidden(true);
    } finally {
      setLoading(false);
    }
  }, [canManage, router, slugFromUrl]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleIdentitySaved = useCallback(
    (data: { slug: string; name: string }) => {
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              slug: data.slug,
              name: data.name,
              publicUrl: routeBuilder.businessProfile(data.slug),
            }
          : null
      );
      if (data.slug !== slugFromUrl) {
        router.replace(routeBuilder.businessEdit(data.slug));
      }
    },
    [router, slugFromUrl]
  );

  const handleCategorySaved = useCallback((slug: string) => {
    setCategorySlug(slug);
  }, []);

  const sectionContent = useMemo(() => {
    switch (section) {
      case 'identity':
        return <BusinessIdentityEditor onSaved={handleIdentitySaved} />;
      case 'category':
        return <BusinessCategoryPicker onCategorySaved={handleCategorySaved} />;
      case 'tabs':
        return <BusinessProfileTabSettings />;
      case 'content':
        return <BusinessProfileCMS key={categorySlug || 'default'} />;
      default:
        return null;
    }
  }, [section, categorySlug, handleIdentitySaved, handleCategorySaved]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
        در حال بارگذاری پنل کسب‌وکار...
      </div>
    );
  }

  if (forbidden || !profile) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <Store className="size-10 text-muted-foreground/40" />
        <h2 className="text-lg font-semibold">دسترسی به پنل کسب‌وکار مجاز نیست</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          برای مدیریت پروفایل کسب‌وکار باید حساب متخصص یا مدیر داشته باشید.
        </p>
        <Button variant="outline" asChild>
          <Link href={routeBuilder.dashboard()}>بازگشت به داشبورد</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-linear-to-br from-emerald-500/10 via-background to-background p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Store className="size-5 text-emerald-600" />
              <h1 className="text-xl font-bold sm:text-2xl">کسب‌وکار من</h1>
              {profile.verified && (
                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700">
                  تأیید شده
                </Badge>
              )}
            </div>
            <p className="text-lg font-semibold">{profile.name}</p>
            <p className="text-sm text-muted-foreground font-mono" dir="ltr">
              /b/{profile.slug}
            </p>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Eye className="size-3.5" />
              {profile.viewCount.toLocaleString('fa-IR')} بازدید
            </div>
          </div>
          <Button variant="outline" size="sm" asChild className="gap-1.5 shrink-0 self-start">
            <Link href={profile.publicUrl} target="_blank" rel="noopener noreferrer">
              مشاهده پروفایل عمومی
              <ExternalLink className="size-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Layout: sidebar + content */}
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <nav className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSection(id)}
              className={cn(
                'flex shrink-0 items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium transition-colors',
                'lg:w-full lg:text-right',
                section === id
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                  : 'border-border/60 bg-background hover:bg-accent'
              )}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        <div className="min-w-0">{sectionContent}</div>
      </div>
    </div>
  );
}
