import { z } from 'zod';

import { DOCUMENT_TYPES, APPLICATION_STATUSES } from './types';

/** List filters live in the URL (TanStack Router validateSearch). Invalid values are ignored. */
export const listSearchSchema = z.object({
  status: z.enum(APPLICATION_STATUSES).optional().catch(undefined),
  type: z.enum(DOCUMENT_TYPES).optional().catch(undefined),
  page: z.coerce.number().int().min(1).optional().catch(undefined),
  pageSize: z.coerce.number().int().min(5).max(100).optional().catch(undefined),
});

export type ListSearch = z.infer<typeof listSearchSchema>;

export const DEFAULT_PAGE_SIZE = 10;
