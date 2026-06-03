'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { MessageSquare, RefreshCcw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAdmin } from '@/components/admin/context/AdminContext';

type ConversationRow = {
  id: string;
  requestId: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  messageCount: number;
  user1: { id: string; phone: string | null; displayName: string | null; firstName: string; lastName: string };
  user2: { id: string; phone: string | null; displayName: string | null; firstName: string; lastName: string };
};

type MessageRow = {
  id: string;
  senderId: string;
  content: string;
  type: string;
  attachmentUrls: string[];
  isRead: boolean;
  createdAt: string;
  sender: { id: string; phone: string | null; displayName: string | null; firstName: string; lastName: string };
};

function displayName(user: ConversationRow['user1']) {
  return user.displayName || `${user.firstName} ${user.lastName}`.trim() || user.phone || user.id;
}

export function ChatReviewPanel() {
  const { apiFetch, hasPermission } = useAdmin();
  const [isLoading, setIsLoading] = useState(true);
  const [q, setQ] = useState('');
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [blocks, setBlocks] = useState<Array<{ id: string; blockerId: string; blockedId: string }>>([]);
  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId]
  );

  const loadConversations = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch<{ conversations: ConversationRow[] }>(
        `/api/super-admin/chat-review/conversations?q=${encodeURIComponent(q)}&limit=20`
      );
      setConversations(data.conversations);
      if (!selectedId && data.conversations[0]?.id) setSelectedId(data.conversations[0].id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا در بارگذاری گفتگوها');
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch, q, selectedId]);

  const loadMessages = useCallback(
    async (conversationId: string) => {
      try {
        const data = await apiFetch<{ messages: MessageRow[] }>(
          `/api/super-admin/chat-review/conversations/${conversationId}/messages?limit=120`
        );
        setMessages(data.messages);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'خطا در بارگذاری پیام‌ها');
      }
    },
    [apiFetch]
  );

  const loadBlocks = useCallback(
    async (userId: string) => {
      try {
        const data = await apiFetch<{ blocks: typeof blocks }>(
          `/api/super-admin/chat-review/users/${userId}/blocks`
        );
        setBlocks(data.blocks);
      } catch {
        setBlocks([]);
      }
    },
    [apiFetch]
  );

  const hideMessage = async (messageId: string) => {
    try {
      await apiFetch(`/api/super-admin/chat-review/messages/${messageId}/hide`, { method: 'POST' });
      toast.success('پیام مخفی شد');
      if (selectedId) void loadMessages(selectedId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'خطا');
    }
  };

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (!selectedId) return;
    void loadMessages(selectedId);
  }, [selectedId, loadMessages]);

  useEffect(() => {
    if (!selected) return;
    void loadBlocks(selected.user1.id);
  }, [selected, loadBlocks]);

  return (
    <Card className="border-border/60 bg-card/90">
      <CardHeader className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="size-4 text-emerald-500" />
              بازبینی چت‌ها
            </CardTitle>
            <CardDescription className="text-xs leading-6">
              مشاهده گفتگوها، مخفی‌سازی پیام و بررسی blockها
            </CardDescription>
          </div>
          <Button variant="outline" className="rounded-lg" onClick={loadConversations} disabled={isLoading}>
            <RefreshCcw className="size-4" />
            تازه‌سازی
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute right-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="جستجو در آخرین پیام/نام/شماره..."
              className="pr-10"
            />
          </div>
          <Button className="rounded-lg" onClick={loadConversations}>جستجو</Button>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
          <div className="space-y-2">
            {conversations.map((c) => {
              const active = c.id === selectedId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full rounded-lg border px-3 py-3 text-right transition-colors ${
                    active ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-border/60 bg-muted/20 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-black">
                        {displayName(c.user1)} ↔ {displayName(c.user2)}
                      </div>
                      <div className="mt-1 truncate text-xs text-muted-foreground">
                        {c.lastMessage || 'بدون پیام'}
                      </div>
                    </div>
                    <Badge variant="outline">{c.messageCount}</Badge>
                  </div>
                </button>
              );
            })}
            {!isLoading && conversations.length === 0 && (
              <div className="rounded-lg border border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
                گفتگویی پیدا نشد.
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border/60 bg-muted/10">
            <div className="flex items-center justify-between gap-3 border-b border-border/60 p-4">
              <div className="min-w-0">
                <div className="truncate text-sm font-black">
                  {selected ? `${displayName(selected.user1)} ↔ ${displayName(selected.user2)}` : 'یک گفتگو را انتخاب کنید'}
                </div>
                {blocks.length > 0 && (
                  <div className="mt-1 text-xs text-amber-600">{blocks.length} block مرتبط</div>
                )}
              </div>
              {selected?.requestId && <Badge variant="secondary">request: {selected.requestId}</Badge>}
            </div>

            <div className="max-h-[520px] overflow-y-auto p-4">
              {messages.map((m, idx) => (
                <div key={m.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-black">{displayName(m.sender)}</div>
                      <div className="mt-1 text-sm leading-7">{m.content}</div>
                      {m.type === 'CALL' && <Badge variant="outline" className="mt-1">تماس صوتی</Badge>}
                      <div className="mt-2 text-[11px] text-muted-foreground" dir="ltr">
                        {new Date(m.createdAt).toLocaleString('fa-IR')}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-xs text-muted-foreground">{m.type}</span>
                      {hasPermission('comms:messages:moderate') && (
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => hideMessage(m.id)}>
                          مخفی
                        </Button>
                      )}
                    </div>
                  </div>
                  {idx !== messages.length - 1 && <Separator className="my-3" />}
                </div>
              ))}

              {!messages.length && (
                <div className="py-10 text-center text-sm text-muted-foreground">پیامی وجود ندارد.</div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
