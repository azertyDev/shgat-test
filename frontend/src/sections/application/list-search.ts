import { z } from 'zod';

import { DOCUMENT_TYPES, APPLICATION_STATUSES } from './types';

/** List filters live in the URL (TanStack Router validateSearch). Invalid values are ignored. */
export const listSearchSchema = z.object({
  status: z.enum(APPLICATION_STATUSES).optional().catch(undefined),
  type: z.enum(DOCUMENT_TYPES).optional().catch(undefined),
  /** 7-digit SOATO code of the region (soato_kodi on the wire); a number, so the URL stays ?region=1703401 */
  region: z.coerce.number().int().min(1_000_000).max(9_999_999).optional().catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(undefined),
  pageSize: z.coerce.number().int().min(5).max(100).optional().catch(undefined),
});

export type ListSearch = z.infer<typeof listSearchSchema>;

export const DEFAULT_PAGE_SIZE = 10;

/** New URL search after a filter change: any change other than the page itself goes back to page 1. */
export const applyListFilter = (prev: ListSearch, patch: Partial<ListSearch>): ListSearch => ({
  ...prev,
  ...patch,
  page: patch.page,
});
