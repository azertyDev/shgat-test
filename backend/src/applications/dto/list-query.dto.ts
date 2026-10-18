import type { ApplicationStatus } from '../../generated/prisma/client.js';
import { FieldValidationError } from '../../common/errors/api-error.js';
import { API_STATUSES, statusFromApi } from '../api-contract.js';
import { DOCUMENT_TYPES } from '../domain/document-types.js';

export interface ListQuery {
  status?: ApplicationStatus;
  documentType?: string;
  soatoCode?: string;
  page: number;
  pageSize: number;
}

const MAX_PAGE = 1_000_000;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/** Query of GET /api/arizalar (wire names: holat, hujjat_turi, soato_kodi, sahifa, hajm). */
export function parseListQuery(
  query: Record<string, string | undefined>,
): ListQuery {
  const errors: Record<string, string> = {};
  const status = query.holat ? statusFromApi(query.holat) : undefined;
  if (query.holat && !status)
    errors.holat = `Holatlardan biri: ${API_STATUSES.join(', ')}`;
  if (
    query.hujjat_turi &&
    !(DOCUMENT_TYPES as readonly string[]).includes(query.hujjat_turi)
  )
    errors.hujjat_turi = `Turlardan biri: ${DOCUMENT_TYPES.join(', ')}`;
  if (Object.keys(errors).length) throw new FieldValidationError(errors);

  return {
    status,
    documentType: query.hujjat_turi || undefined,
    soatoCode: query.soato_kodi || undefined,
    // clamped so that skip stays a safe integer for Prisma (huge values returned 500)
    page: Math.min(
      MAX_PAGE,
      Math.max(1, Number.parseInt(query.sahifa ?? '', 10) || 1),
    ),
    pageSize: Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, Number.parseInt(query.hajm ?? '', 10) || DEFAULT_PAGE_SIZE),
    ),
  };
}
