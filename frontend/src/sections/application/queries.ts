import type { ListQuery, ApplicationPage } from './types';
import type { ApplicationFormValues } from './form-schema';

import { useMutation, queryOptions, useQueryClient, keepPreviousData } from '@tanstack/react-query';

import { api } from './api';
import { optimisticSummary, withOptimisticItem } from './optimistic';

// ----------------------------------------------------------------------

export const applicationKeys = {
  all: ['applications'] as const,
  list: (q: ListQuery) => [...applicationKeys.all, 'list', q] as const,
  detail: (id: number) => [...applicationKeys.all, 'detail', id] as const,
};

export const applicationListQuery = (q: ListQuery) =>
  queryOptions({ queryKey: applicationKeys.list(q), queryFn: () => api.list(q), placeholderData: keepPreviousData });

/** every application waiting for review (sidebar counter, overdue count); 100 is the API page limit */
export const pendingReviewQuery = applicationListQuery({ status: 'SUBMITTED', pageSize: 100 });

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

type CreateInput = { values: ApplicationFormValues; onProgress: (percent: number) => void };

/** Create with an optimistic list row: it is shown at once and rolled back if the server says no. */
export function useCreateApplication() {
  const queryClient = useQueryClient();
  const listKey = [...applicationKeys.all, 'list'];

  return useMutation({
    mutationFn: ({ values, onProgress }: CreateInput) => api.create(values, onProgress),
    onMutate: async ({ values }) => {
      // a list request already on its way would overwrite the optimistic row
      await queryClient.cancelQueries({ queryKey: listKey });
      const snapshot = queryClient.getQueriesData<ApplicationPage>({ queryKey: listKey });
      const regionName = queryClient.getQueryData(soatoQuery.queryKey)?.find((r) => r.code === values.soatoCode)?.name ?? null;
      const item = optimisticSummary(values, regionName);
      if (item)
        snapshot.forEach(([key, page]) =>
          queryClient.setQueryData(key, withOptimisticItem(page, key[2] as ListQuery, item))
        );
      return { snapshot };
    },
    onError: (_error, _input, context) => context?.snapshot.forEach(([key, page]) => queryClient.setQueryData(key, page)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: applicationKeys.all }),
  });
}
