import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { Conversation, Message } from '@/lib/types';
import { toast } from 'sonner';

// ============ Response Types ============

interface ConversationsResponse {
  conversations: Conversation[];
}

interface MessagesResponse {
  data: MessageItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface MessageItem {
  id: string;
  senderId: string;
  content: string;
  type: string;
  attachmentUrls: string[];
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

interface SendMessagePayload {
  content: string;
  type?: 'TEXT' | 'IMAGE' | 'FILE' | 'VOICE';
}

interface CreateConversationPayload {
  otherUserId: string;
  requestId?: string;
}

interface CreateConversationResponse {
  message: string;
  conversation: Conversation;
}

// ============ Query Keys ============

export const chatKeys = {
  all: ['chat'] as const,
  conversations: () => [...chatKeys.all, 'conversations'] as const,
  messages: (conversationId: string) =>
    [...chatKeys.all, 'messages', conversationId] as const,
  sendMessage: (conversationId: string) =>
    [...chatKeys.all, 'send', conversationId] as const,
};

// ============ Conversations ============

/**
 * Fetches the list of conversations for the current user.
 */
export function useConversations() {
  return useQuery({
    queryKey: chatKeys.conversations(),
    queryFn: () => apiFetch<ConversationsResponse>('/api/chat'),
    refetchInterval: 30 * 1000, // Refresh every 30s
  });
}

/**
 * Fetches messages for a specific conversation.
 */
export function useMessages(conversationId: string, page: number = 1, limit: number = 30) {
  return useQuery({
    queryKey: [...chatKeys.messages(conversationId), { page, limit }],
    queryFn: () =>
      apiFetch<MessagesResponse>(`/api/chat/${conversationId}`, {
        params: { page, limit },
      }),
    enabled: !!conversationId,
  });
}

/**
 * Mutation hook for sending a message with optimistic append.
 * Immediately shows the sent message in the UI, then reconciles with the server response.
 */
export function useSendMessage(conversationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SendMessagePayload) =>
      apiFetch<{ message: string; messageData: MessageItem }>(
        `/api/chat/${conversationId}`,
        {
          method: 'POST',
          body: payload,
        }
      ),
    onMutate: async (variables) => {
      // Cancel any outgoing refetches for this conversation's messages
      await queryClient.cancelQueries({
        queryKey: chatKeys.messages(conversationId),
      });

      // Snapshot previous messages data
      const previousMessages = queryClient.getQueriesData<MessagesResponse>({
        queryKey: chatKeys.messages(conversationId),
      });

      // Create optimistic message
      const optimisticMessage: MessageItem = {
        id: `temp-${Date.now()}`,
        senderId: 'current-user',
        content: variables.content,
        type: variables.type || 'TEXT',
        attachmentUrls: [],
        isRead: false,
        readAt: null,
        createdAt: new Date().toISOString(),
      };

      // Optimistically append the message
      queryClient.setQueriesData<MessagesResponse>(
        { queryKey: chatKeys.messages(conversationId) },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: [...old.data, optimisticMessage],
            pagination: {
              ...old.pagination,
              total: old.pagination.total + 1,
            },
          };
        }
      );

      return { previousMessages };
    },
    onError: (_error, _variables, context) => {
      // Revert optimistic update on error
      if (context?.previousMessages) {
        for (const [queryKey, data] of context.previousMessages) {
          queryClient.setQueryData(queryKey, data);
        }
      }
      toast.error('خطا در ارسال پیام. لطفاً دوباره تلاش کنید.');
    },
    onSuccess: (data, _variables, context) => {
      // Replace optimistic message with real server data
      queryClient.setQueriesData<MessagesResponse>(
        { queryKey: chatKeys.messages(conversationId) },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((msg) =>
              msg.id.startsWith('temp-') ? data.messageData : msg
            ),
          };
        }
      );

      // Update conversations list to reflect new last message
      queryClient.invalidateQueries({
        queryKey: chatKeys.conversations(),
      });
    },
    onSettled: () => {
      // Always refetch to ensure consistency
      queryClient.invalidateQueries({
        queryKey: chatKeys.messages(conversationId),
      });
    },
  });
}

/**
 * Mutation hook for creating a new conversation with a user.
 * Invalidates the conversations list on success.
 */
export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateConversationPayload) =>
      apiFetch<CreateConversationResponse>('/api/chat', {
        method: 'POST',
        body: payload,
      }),
    onSuccess: (data) => {
      toast.success(data.message);
      queryClient.invalidateQueries({ queryKey: chatKeys.conversations() });
    },
    onError: () => {
      toast.error('خطا در ایجاد گفتگو. لطفاً دوباره تلاش کنید.');
    },
  });
}
