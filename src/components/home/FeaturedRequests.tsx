'use client';

import { useNavigate } from '@/hooks/navigation/use-navigate';
import { useEffect } from 'react';
import { MapPin, Clock, DollarSign, FileText, ArrowLeft, Flame, Globe, Palette, Smartphone, Monitor, Pen, BookOpen, Home, Wrench, GraduationCap, Bot, Briefcase, Heart, Code, type LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAppStore } from '@/lib/store';
import { formatBudgetRange, getTimeAgo, getPriorityLabel } from '@/lib/constants';
import type { ServiceRequest } from '@/lib/types';
import { BookmarkButton } from '@/components/shared/BookmarkButton';
import { routeBuilder } from '@/config/routes';
import { useLocationScopeApiParams } from '@/hooks/use-location-scope-api-params';

// Category icon mapping
const ICON_MAP: Record<string, LucideIcon> = {
  Globe, Palette, Smartphone, Monitor, Pen, BookOpen, Home, Wrench, GraduationCap, Bot,
  Briefcase, Heart, Code, Layout: Monitor, Server: Monitor, Layers: Smartphone,
  Apple: Smartphone, FileCode: Code, Paintbrush: Palette, PencilRuler: Pen,
  Laptop: Monitor, Hammer: Wrench, School: GraduationCap, BotIcon: Bot,
  MessageCircle: Bot, Shield: Briefcase, Scale: Briefcase,
};

const priorityConfig: Record<string, { className: string; icon: typeof Flame }> = {
  URGENT: { className: 'bg-destructive/10 text-destructive border-destructive/20', icon: Flame },
  HIGH: { className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800', icon: Flame },
  NORMAL: { className: 'bg-muted text-muted-foreground border-border', icon: Clock },
  LOW: { className: 'bg-muted text-muted-foreground border-border', icon: Clock },
};

const accentColors: Record<string, string> = {
  URGENT: 'bg-destructive',
  HIGH: 'bg-amber-500',
  NORMAL: 'bg-primary/40',
  LOW: 'bg-muted-foreground/30',
};

function PriorityBadge({ priority }: { priority: string }) {
  const config = priorityConfig[priority] || priorityConfig.NORMAL;
  const Icon = config.icon;
  return (
    <Badge variant="outline" className={`rounded-lg text-caption font-medium ${config.className}`}>
      <Icon className="size-3" aria-hidden="true" />
      {getPriorityLabel(priority)}
    </Badge>
  );
}

function RequestCardSkeleton() {
  return (
    <Card className="overflow-hidden border-border/50 bg-card/80">
      <CardContent className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="size-8 rounded-lg" />
            <Skeleton className="h-4 w-24 rounded" />
          </div>
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <Skeleton className="h-5 w-3/4 rounded" />
        <div className="space-y-1.5">
          <Skeleton className="h-7 w-32 rounded-lg" />
          <Skeleton className="h-4 w-20 rounded" />
        </div>
        <div className="flex items-center justify-between border-t border-border/40 pt-3">
          <Skeleton className="h-4 w-20 rounded" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-3 w-14 rounded" />
            <Skeleton className="size-6 rounded-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RequestCard({ request }: { request: ServiceRequest }) {
  const { navigateTo } = useNavigate();
  const IconComponent = ICON_MAP[request.categoryIcon || ''] || Globe;

  return (
    <Card
      onClick={() => navigateTo('request-detail', { id: request.id })}
      className="group cursor-pointer overflow-hidden border-border/50 bg-card/80 hover-lift transition-all 150ms ease"
      data-href={routeBuilder.listing(request.id, request.title)}
      title={`${request.title} - ${request.categoryName} - ${request.city}`}
      itemScope
      itemType="https://schema.org/Offer"
    >
      <div className="flex h-full">
        <div className={`w-[3px] shrink-0 ${accentColors[request.priority] || 'bg-primary/40'}`} aria-hidden="true" />
        <CardContent className="flex-1 p-5">
          {/* Top Row */}
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
                <IconComponent className="size-4" />
              </span>
              <span className="text-xs font-medium text-muted-foreground truncate max-w-[140px]">{request.categoryName}</span>
            </div>
            <div className="flex items-center gap-1">
              <BookmarkButton id={request.id} type="request" size="sm" />
              <PriorityBadge priority={request.priority} />
            </div>
          </div>

          {/* Title */}
          <h3 className="mb-3 text-sm font-bold leading-snug line-clamp-2 group-hover:text-emerald-600 transition-colors 150ms ease" itemProp="name">
            {request.title}
          </h3>

          {/* Meta */}
          <div className="mb-4 space-y-2">
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/6 px-2.5 py-1.5" itemProp="offers" itemScope itemType="https://schema.org/Offer">
              <div className="flex size-6 items-center justify-center rounded-md bg-emerald-500/10" aria-hidden="true">
                <DollarSign className="size-3.5 text-emerald-600" />
              </div>
              <span className="text-xs font-medium truncate" itemProp="priceSpecification">{formatBudgetRange(request.budgetMin, request.budgetMax)}</span>
            </div>
            {request.city && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                <span itemProp="areaServed">{request.city}</span>
              </div>
            )}
          </div>

          {/* Bottom Row */}
          <div className="flex items-center justify-between border-t border-border/40 pt-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <FileText className="size-3.5" aria-hidden="true" />
              <span>{request.proposalCount.toLocaleString('fa-IR')} پیشنهاد</span>
            </div>
            <div className="flex items-center gap-2">
              <time className="text-caption text-muted-foreground" dateTime={request.createdAt} itemProp="datePosted">{getTimeAgo(request.createdAt)}</time>
              <div className="size-6 rounded-full flex items-center justify-center text-caption font-bold bg-primary/10 text-primary" aria-hidden="true">
                {request.user.firstName.charAt(0)}{request.user.lastName.charAt(0)}
              </div>
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

export function FeaturedRequests() {
  const { navigateTo } = useNavigate();
  const requests = useAppStore((s) => s.requests);
  const isLoading = useAppStore((s) => s.isLoading);
  const fetchRequests = useAppStore((s) => s.fetchRequests);
  const geoParams = useLocationScopeApiParams();

  useEffect(() => {
    fetchRequests({ limit: '6', status: 'OPEN', ...geoParams });
  }, [fetchRequests, geoParams]);

  return (
    <section id="requests" className="section-padding bg-background" aria-label="آخرین نیازها" itemScope itemType="https://schema.org/ItemList">
      <div className="container-default mx-auto px-5 md:px-8">
        <div className="mb-12 flex items-end justify-between gap-4">
          <div>
            <h2 className="mb-3 text-2xl md:text-4xl font-extrabold tracking-tight" itemProp="name">آخرین نیازها</h2>
            <p className="text-sm md:text-base text-muted-foreground" itemProp="description">جدیدترین نیازهای ثبت شده توسط کاربران</p>
          </div>
          <Button
            onClick={() => navigateTo('browse-requests')}
            variant="outline"
            className="hidden sm:inline-flex h-10 rounded-xl border-border/60 px-6 shrink-0 transition-all 150ms ease"
            data-href="/browse?type=need"
            title="مشاهده لیست کامل نیازهای ثبت شده"
          >
            مشاهده همه نیازها
            <ArrowLeft className="size-4" aria-hidden="true" />
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="در حال بارگذاری نیازها" role="status">
            {Array.from({ length: 6 }).map((_, i) => (
              <RequestCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {requests.slice(0, 6).map((request) => (
              <RequestCard key={request.id} request={request} />
            ))}
          </div>
        )}

        <div className="mt-8 flex justify-center sm:hidden">
          <Button
            onClick={() => navigateTo('browse-requests')}
            variant="outline"
            className="h-10 rounded-xl border-border/60 px-6"
            data-href="/browse?type=need"
            title="مشاهده لیست کامل نیازهای ثبت شده"
          >
            مشاهده همه نیازها
            <ArrowLeft className="size-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <noscript>
        <div className="sr-only">
          <h2>آخرین نیازها</h2>
          <p>جدیدترین نیازهای ثبت شده توسط کاربران در نیاز فایندر. شامل نیازهای حوزه‌های مختلف با بودجه و اولویت‌های متنوع.</p>
        </div>
      </noscript>
    </section>
  );
}
