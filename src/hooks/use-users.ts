import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';
import type { User, FollowResponse } from '@/lib/types';
import { useDebounce } from '@/hooks/use-debounce';
import { toast } from 'sonner';

// ============ Response Types ============

interface UsersListResponse {
  data: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============ Query Keys ============

export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: UsersFilters) => [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
  suggested: () => [...userKeys.all, 'suggested'] as const,
  search: (query: string) => [...userKeys.all, 'search', query] as const,
  follow: (userId: string) => [...userKeys.all, 'follow', userId] as const,
};

// ============ Types ============

interface UsersFilters {
  search?: string;
  role?: string;
  sort?: string;
  page?: number;
}

// ============ Hooks ============

/**
 * Fetches a paginated list of users with optional filtering.
 */
export function useUsers(
  search?: string,
  role?: string,
  sort?: string,
  page: number = 1
) {
  return useQuery({
    queryKey: userKeys.list({ search, role, sort, page }),
    queryFn: () =>
      apiFetch<UsersListResponse>('/api/users', {
        params: {
          search: search || undefined,
          role: role || undefined,
          sort: sort || undefined,
          page,
          limit: 20,
        },
      }),
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Fetches a single user's profile by ID.
 */
export function useUser(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => apiFetch<User>(`/api/users/${id}`),
    enabled: !!id,
  });
}

/**
 * Mutation hook for follow/unfollow with optimistic update.
 * Toggles the follow state for a given user.
 */
export function useFollow(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiFetch<FollowResponse>(`/api/users/${userId}/follow`, {
        method: 'POST',
      }),
    onMutate: async () => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: userKeys.detail(userId) });

      // Snapshot previous user data
      const previousUser = queryClient.getQueryData<User>(userKeys.detail(userId));

      // Optimistically update the user data
      if (previousUser) {
        queryClient.setQueryData<User>(userKeys.detail(userId), {
          ...previousUser,
          followerCount: (previousUser.followerCount || 0) + 1,
        });
      }

      return { previousUser };
    },
    onError: (_error, _variables, context) => {
      // Revert optimistic update on error
      if (context?.previousUser) {
        queryClient.setQueryData(userKeys.detail(userId), context.previousUser);
      }
      toast.error('خطا در دنبال کردن کاربر');
    },
    onSettled: () => {
      // Refetch after error or success to ensure consistency
      queryClient.invalidateQueries({ queryKey: userKeys.detail(userId) });
    },
    onSuccess: (data) => {
      if (data.message) toast.success(data.message);
    },
  });
}

/**
 * Fetches suggested users for discovery.
 * Reuses the users endpoint with a specific sort parameter.
 */
export function useSuggestedUsers() {
  return useQuery({
    queryKey: userKeys.suggested(),
    queryFn: () =>
      apiFetch<UsersListResponse>('/api/users', {
        params: {
          sort: 'active',
          limit: 10,
          page: 1,
        },
      }),
    staleTime: 5 * 60 * 1000, // 5 min — suggested users change infrequently
  });
}

/**
 * Debounced search hook for users.
 * Returns results after the search query has been debounced.
 */
export function useSearchUsers(query: string) {
  const debouncedQuery = useDebounce(query, 400);

  return useQuery({
    queryKey: userKeys.search(debouncedQuery),
    queryFn: () =>
      apiFetch<UsersListResponse>('/api/users', {
        params: {
          search: debouncedQuery || undefined,
          limit: 20,
          page: 1,
        },
      }),
    enabled: debouncedQuery.length > 0,
  });
}
