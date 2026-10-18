import type { ListQuery } from './types';

import { useMutation, queryOptions, useQueryClient, keepPreviousData } from '@tanstack/react-query';

import { api } from './api';

// ----------------------------------------------------------------------

export const applicationKeys = {
  all: ['applications'] as const,
  list: (q: ListQuery) => [...applicationKeys.all, 'list', q] as const,
  detail: (id: number) => [...applicationKeys.all, 'detail', id] as const,
};

export const applicationListQuery = (q: ListQuery) =>
  queryOptions({ queryKey: applicationKeys.list(q), queryFn: () => api.list(q), placeholderData: keepPreviousData });

export const applicationQuery = (id: number) =>
  queryOptions({ queryKey: applicationKeys.detail(id), queryFn: () => api.get(id) });

export const soatoQuery = queryOptions({ queryKey: ['soato'], queryFn: api.soato, staleTime: Infinity });

function useApplicationMutation<TArg, TResult>(fn: (arg: TArg) => Promise<TResult>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => queryClient.invalidateQueries({ queryKey: applicationKeys.all }),
  });
}

export const useApprove = (id: number) => useApplicationMutation(() => api.approve(id));

export const useReturnToApplicant = (id: number) =>
  useApplicationMutation((reason: string) => api.returnToApplicant(id, reason));
