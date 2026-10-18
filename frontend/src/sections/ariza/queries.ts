import type { RoyxatSorovi } from './types';

import { useMutation, queryOptions, useQueryClient, keepPreviousData } from '@tanstack/react-query';

import { api } from './api';

// ----------------------------------------------------------------------

export const arizaKeys = {
  all: ['arizalar'] as const,
  royxat: (q: RoyxatSorovi) => [...arizaKeys.all, 'royxat', q] as const,
  bitta: (id: number) => [...arizaKeys.all, 'bitta', id] as const,
};

export const royxatQuery = (q: RoyxatSorovi) =>
  queryOptions({ queryKey: arizaKeys.royxat(q), queryFn: () => api.royxat(q), placeholderData: keepPreviousData });

export const arizaQuery = (id: number) =>
  queryOptions({ queryKey: arizaKeys.bitta(id), queryFn: () => api.bitta(id) });

export const soatoQuery = queryOptions({ queryKey: ['soato'], queryFn: api.soato, staleTime: Infinity });

function useArizaMutation<TArg, TRes>(fn: (arg: TArg) => Promise<TRes>) {
  const qc = useQueryClient();
  return useMutation({ mutationFn: fn, onSettled: () => qc.invalidateQueries({ queryKey: arizaKeys.all }) });
}

export const useTasdiqlash = (id: number) => useArizaMutation(() => api.tasdiqla(id));

export const useQaytarish = (id: number) => useArizaMutation((sabab: string) => api.qaytar(id, sabab));
