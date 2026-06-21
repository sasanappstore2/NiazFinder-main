'use client';

import { useCallback, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/lib/store';
import {
  startConversation,
  syncAndNavigateToConversation,
  syncConversationAfterStart,
  navigateToConversation,
  ContactAuthRequiredError,
} from '@/lib/contact/start-conversation';
import { savePendingContact } from '@/lib/contact/pending-contact';
import type { ProductChatIntro } from '@/lib/chat/product-chat-intro';
import type { PublicBusinessContacts, PublicContactPoint } from '@/lib/business/team/public-contacts';

export type BusinessContactPickerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: PublicBusinessContacts | null;
  requestId?: string;
  productIntro?: ProductChatIntro;
  onSelect?: (conversationId: string) => void;
};

export function BusinessContactPickerSheet({
  open,
  onOpenChange,
  data,
  requestId,
  productIntro,
  onSelect,
}: BusinessContactPickerProps) {
  const router = useRouter();
  const authToken = useAppStore((s) => s.authToken);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleSelect = useCallback(
    async (point: PublicContactPoint) => {
      if (!authToken) return;
      setLoadingId(point.id);
      try {
        const result = await startConversation(
          {
            otherUserId: point.assignee.id,
            requestId,
            contactPointId: point.id,
            businessProfileId: data?.business.id,
            productIntro,
          },
          authToken
        );
        syncConversationAfterStart(result);
        onOpenChange(false);
        if (onSelect) onSelect(result.conversationId);
        else navigateToConversation(router, result.conversationId);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'خطا در شروع گفتگو');
      } finally {
        setLoadingId(null);
      }
    },
    [authToken, data?.business.id, onOpenChange, onSelect, productIntro, requestId, router]
  );

  if (!data) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] rounded-t-2xl px-4 sheet-safe-area-lg">
        <SheetHeader className="text-right">
          <div className="flex items-center gap-3">
            {data.business.logo ? (
              <Image
                src={data.business.logo}
                alt=""
                width={40}
                height={40}
                className="size-10 rounded-xl object-cover"
              />
            ) : (
              <div className="flex size-10 items-center justify-center rounded-xl bg-muted text-sm font-bold">
                {data.business.name.slice(0, 2)}
              </div>
            )}
            <div className="min-w-0 text-right">
              <SheetTitle className="text-base">{data.business.name}</SheetTitle>
              <SheetDescription>با چه بخشی می‌خواهید صحبت کنید؟</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-4 space-y-2 overflow-y-auto">
          {data.contactPoints.map((point) => (
            <button
              key={point.id}
              type="button"
              disabled={loadingId !== null}
              onClick={() => void handleSelect(point)}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border border-border/60 p-3 text-right transition-colors hover:bg-accent',
                loadingId === point.id && 'opacity-70'
              )}
            >
              <div className="relative size-11 shrink-0 overflow-hidden rounded-full bg-muted">
                {point.assignee.avatar ? (
                  <Image
                    src={point.assignee.avatar}
                    alt=""
                    width={44}
                    height={44}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-sm font-medium">
                    {point.assignee.displayName.slice(0, 1)}
                  </div>
                )}
                {point.assignee.online && (
                  <span className="absolute bottom-0 left-0 size-2.5 rounded-full border-2 border-background bg-emerald-500" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{point.label}</p>
                <p className="text-sm text-muted-foreground">{point.assignee.displayName}</p>
                {point.description && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{point.description}</p>
                )}
              </div>
              {loadingId === point.id && (
                <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
              )}
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export type OpenBusinessContactParams = {
  businessSlug: string;
  requestId?: string;
  productIntro?: ProductChatIntro;
  returnTo?: string;
};

export function useBusinessContact() {
  const router = useRouter();
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const authToken = useAppStore((s) => s.authToken);
  const setAuthModalOpen = useAppStore((s) => s.setAuthModalOpen);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerData, setPickerData] = useState<PublicBusinessContacts | null>(null);
  const [pendingParams, setPendingParams] = useState<OpenBusinessContactParams | null>(null);

  const startWithPoint = useCallback(
    async (
      data: PublicBusinessContacts,
      point: PublicContactPoint,
      params: OpenBusinessContactParams
    ) => {
      if (!authToken) return;
      const result = await startConversation(
        {
          otherUserId: point.assignee.id,
          requestId: params.requestId,
          contactPointId: point.id,
          businessProfileId: data.business.id,
          productIntro: params.productIntro,
        },
        authToken
      );
      syncAndNavigateToConversation(router, result);
    },
    [authToken, router]
  );

  const openBusinessContact = useCallback(
    async (params: OpenBusinessContactParams) => {
      try {
        const res = await fetch(
          `/api/business/slug/${encodeURIComponent(params.businessSlug)}/contact-points`
        );
        const json = (await res.json()) as PublicBusinessContacts & { error?: string };
        if (!res.ok) {
          throw new Error(json.error || 'خطا در بارگذاری مخاطبین');
        }

        if (json.chatDisabledMessage || json.contactPoints.length === 0) {
          toast.info(json.chatDisabledMessage || 'چت برای این کسب‌وکار فعال نیست');
          return;
        }

        if (!isAuthenticated || !authToken) {
          const defaultPoint =
            json.contactPoints.find((p) => p.id === json.defaultContactPointId) ??
            json.contactPoints[0];
          savePendingContact({
            action: 'chat',
            otherUserId: defaultPoint.assignee.id,
            requestId: params.requestId,
            returnTo: params.returnTo ?? window.location.pathname,
            productIntro: params.productIntro,
            contactPointId: defaultPoint.id,
            businessProfileId: json.business.id,
            businessSlug: params.businessSlug,
          });
          setPendingParams(params);
          setPickerData(json);
          setAuthModalOpen(true);
          return;
        }

        if (json.contactPoints.length === 1) {
          await startWithPoint(json, json.contactPoints[0], params);
          return;
        }

        setPendingParams(params);
        setPickerData(json);
        setPickerOpen(true);
      } catch (e) {
        if (e instanceof ContactAuthRequiredError) {
          setAuthModalOpen(true);
        } else {
          toast.error(e instanceof Error ? e.message : 'خطا در تماس با کسب‌وکار');
        }
      }
    },
    [authToken, isAuthenticated, setAuthModalOpen, startWithPoint]
  );

  const picker = (
    <BusinessContactPickerSheet
      open={pickerOpen}
      onOpenChange={setPickerOpen}
      data={pickerData}
      requestId={pendingParams?.requestId}
      productIntro={pendingParams?.productIntro}
    />
  );

  return { openBusinessContact, picker };
}
