import type { ApplicationFormValues } from './form-schema';
import type { ListQuery, ApplicationPage, ApplicationSummary } from './types';

// Optimistic create: the new application shows up in the cached lists while its files are still uploading.

const SERVER_DEFAULT_PAGE_SIZE = 20;

/** Ids below zero never collide with server ids; the UI treats them as "not saved yet". */
export const isOptimistic = (a: Pick<ApplicationSummary, 'id'>) => a.id < 0;

/** List row for the application being sent; null when the form has no boundary (the form blocks that anyway). */
export function optimisticSummary(
  values: ApplicationFormValues,
  regionName: string | null,
  now = new Date()
): ApplicationSummary | null {
  if (!values.boundary) return null;
  return {
    id: -now.getTime(),
    documentName: values.documentName,
    documentType: values.documentType,
    soatoCode: values.soatoCode,
    approvalDate: values.approvalDate,
    approvalDecree: values.approvalDecree,
    boundary: values.boundary,
    registrationNumber: null,
    status: 'SUBMITTED',
    arcgisObjectId: null,
    regionName,
    submittedAt: now.toISOString(),
    reviewDeadline: null,
  };
}

/**
 * Cached list page with the new row added where the server would put it: lists are sorted by id desc,
 * so it goes first on page 1; a later page of the same filter only gets the larger total.
 */
export function withOptimisticItem(
  page: ApplicationPage | undefined,
  query: ListQuery,
  item: ApplicationSummary
): ApplicationPage | undefined {
  const matches =
    (!query.status || query.status === item.status) &&
    (!query.documentType || query.documentType === item.documentType) &&
    (!query.soatoCode || query.soatoCode === item.soatoCode);
  if (!page || !matches) return page;
  if ((query.page ?? 1) > 1) return { ...page, total: page.total + 1 };
  return {
    items: [item, ...page.items].slice(0, query.pageSize ?? SERVER_DEFAULT_PAGE_SIZE),
    total: page.total + 1,
  };
}
