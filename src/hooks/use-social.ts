import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import type { Post, PostComment, LikeResponse } from '@/lib/types';
import { toast } from 'sonner';

// Simple fetch wrapper for social API calls (local Next.js API routes)
async function apiFetch<T = any>(url: string, options?: { method?: string; body?: any; params?: Record<string, any> }): Promise<T> {
  let fullUrl = url;
  if (options?.params) {
    const qs = new URLSearchParams(
      Object.entries(options.params)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => [k, String(v)])
    ).toString();
    fullUrl = `${url}${qs ? `?${qs}` : ''}`;
  }
  const res = await fetch(fullUrl, {
    method: options?.method || 'GET',
    headers: { 'Content-Type': 'application/json' },
    body: options?.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

// ============ Response Types ============

/** Cursor-based posts response from the API */
interface CursorPostsResponse {
  posts: Post[];
  nextCursor: string | null;
  hasMore: boolean;
}

/** Legacy page-based posts response (kept for backward compat) */
interface PostsListResponse {
  data: Post[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface CommentsListResponse {
  data: PostComment[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface CreatePostPayload {
  content: string;
  imageUrls?: string;
  isPrivate?: boolean;
}

interface CreateCommentPayload {
  content: string;
}

// ============ Query Keys ============

export const postKeys = {
  all: ['posts'] as const,
  lists: () => [...postKeys.all, 'list'] as const,
  list: (filters: { cursor?: string; limit?: number }) =>
    [...postKeys.lists(), filters] as const,
  infinite: () => [...postKeys.all, 'infinite'] as const,
  details: () => [...postKeys.all, 'detail'] as const,
  detail: (id: string) => [...postKeys.details(), id] as const,
  comments: (postId: string) =>
    [...postKeys.all, 'comments', postId] as const,
  likes: (postId: string) =>
    [...postKeys.all, 'likes', postId] as const,
};

// ============ Posts Feed ============

/**
 * Fetches a single page of posts (no pagination — latest first).
 */
export function usePosts(limit: number = 20) {
  return useQuery({
    queryKey: postKeys.list({ limit }),
    queryFn: () =>
      apiFetch<CursorPostsResponse>('/api/posts', {
        params: { limit },
      }),
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Fetches a single post by ID.
 */
export function usePost(id: string) {
  return useQuery({
    queryKey: postKeys.detail(id),
    queryFn: () => apiFetch<Post>(`/api/posts/${id}`),
    enabled: !!id,
  });
}

/**
 * Infinite scroll feed using useInfiniteQuery with cursor-based pagination.
 * Fetches pages of posts and supports fetchNextPage.
 */
export function useInfiniteFeed(limit: number = 10) {
  return useInfiniteQuery({
    queryKey: postKeys.infinite(),
    queryFn: ({ pageParam }) => {
      const params: Record<string, string | number> = { limit };
      if (pageParam) params.cursor = pageParam;
      return apiFetch<CursorPostsResponse>('/api/posts', { params });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 30 * 1000,
    placeholderData: (previousData) => previousData,
  });
}

// ============ Like Post ============

/**
 * Mutation hook for toggling like on a post with optimistic update.
 */
export function useLikePost(postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiFetch<LikeResponse>(`/api/posts/${postId}/like`, {
        method: 'POST',
      }),
    onMutate: async () => {
      // Cancel related queries
      await queryClient.cancelQueries({ queryKey: postKeys.lists() });
      await queryClient.cancelQueries({ queryKey: postKeys.infinite() });

      // Snapshot the previous data
      const previousInfiniteData = queryClient.getQueryData<
        ReturnType<typeof useInfiniteFeed>['data']
      >(postKeys.infinite());

      // Optimistically update infinite query
      if (previousInfiniteData) {
        queryClient.setQueryData(postKeys.infinite(), {
          ...previousInfiniteData,
          pages: previousInfiniteData.pages.map((page) => ({
            ...page,
            posts: page.posts.map((post) =>
              post.id === postId
                ? {
                    ...post,
                    isLiked: !post.isLiked,
                    likeCount: post.isLiked
                      ? post.likeCount - 1
                      : post.likeCount + 1,
                  }
                : post
            ),
          })),
        });
      }

      return { previousInfiniteData };
    },
    onError: (_error, _variables, context) => {
      // Revert optimistic updates on error
      if (context?.previousInfiniteData) {
        queryClient.setQueryData(postKeys.infinite(), context.previousInfiniteData);
      }
      toast.error('خطا در ثبت لایک');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
      queryClient.invalidateQueries({ queryKey: postKeys.infinite() });
    },
  });
}

// ============ Comments ============

/**
 * Fetches comments for a specific post.
 */
export function useComments(postId: string) {
  return useQuery({
    queryKey: postKeys.comments(postId),
    queryFn: () =>
      apiFetch<PostComment[]>(`/api/posts/${postId}/comments`, {
        params: { limit: 100 },
      }),
    enabled: !!postId,
  });
}

// ============ Create Post ============

/**
 * Mutation hook for creating a new post.
 * Invalidates the posts feed on success.
 */
export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreatePostPayload) =>
      apiFetch<Post>('/api/posts', {
        method: 'POST',
        body: payload,
      }),
    onSuccess: () => {
      toast.success('پست شما با موفقیت منتشر شد! 🎉');
      queryClient.invalidateQueries({ queryKey: postKeys.lists() });
      queryClient.invalidateQueries({ queryKey: postKeys.infinite() });
    },
    onError: () => {
      toast.error('خطا در انتشار پست. لطفاً دوباره تلاش کنید.');
    },
  });
}
