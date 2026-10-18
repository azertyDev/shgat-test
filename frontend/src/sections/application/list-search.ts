import { z } from 'zod';

import { HOLATLAR, HUJJAT_TURLARI } from './types';

/** Ro'yxat filtrlari URL'da saqlanadi (TanStack Router validateSearch). Noto'g'ri qiymat — e'tiborsiz. */
export const royxatSearchSchema = z.object({
  holat: z.enum(HOLATLAR).optional().catch(undefined),
  hujjat_turi: z.enum(HUJJAT_TURLARI).optional().catch(undefined),
  sahifa: z.coerce.number().int().min(1).optional().catch(undefined),
  hajm: z.coerce.number().int().min(5).max(100).optional().catch(undefined),
});

export type RoyxatSearch = z.infer<typeof royxatSearchSchema>;

export const STANDART_HAJM = 10;
