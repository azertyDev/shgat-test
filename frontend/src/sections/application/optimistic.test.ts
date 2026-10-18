import type { ApplicationFormValues } from './form-schema';
import type { ApplicationPage, ApplicationSummary } from './types';

import { isOptimistic, optimisticSummary, withOptimisticItem } from './optimistic';

const values = {
  documentName: 'Andijon shahri bosh rejasi',
  documentType: 'БР',
  soatoCode: '1703401',
  approvalDate: '2026-03-12',
  approvalDecree: '123-son qaror',
  boundary: { type: 'Polygon', coordinates: [[[72.3, 40.75], [72.4, 40.75], [72.4, 40.81], [72.3, 40.75]]] },
  mainDrawing: null,
  explanatoryNote: null,
  approvalDocument: null,
} as ApplicationFormValues;

const item = optimisticSummary(values, 'Andijon shahri', new Date('2026-10-18T10:00:00Z'))!;
const existing = { ...item, id: 7 } as ApplicationSummary;
const page: ApplicationPage = { items: [existing, { ...existing, id: 6 }], total: 2 };

describe('optimistic create', () => {
  it('builds a submitted row with a temporary negative id', () => {
    expect(item).toMatchObject({ status: 'SUBMITTED', registrationNumber: null, regionName: 'Andijon shahri' });
    expect(isOptimistic(item)).toBe(true);
    expect(optimisticSummary({ ...values, boundary: null }, null)).toBeNull();
  });

  it('puts the row first on page 1 of a matching list and keeps the page size', () => {
    const next = withOptimisticItem(page, { status: 'SUBMITTED', documentType: 'БР', pageSize: 2 }, item);
    expect(next?.items.map((a) => a.id)).toEqual([item.id, 7]);
    expect(next?.total).toBe(3);
  });

  it('only counts it on later pages and leaves other filters alone', () => {
    expect(withOptimisticItem(page, { page: 2, pageSize: 2 }, item)).toEqual({ ...page, total: 3 });
    expect(withOptimisticItem(page, { status: 'REGISTERED' }, item)).toBe(page);
    expect(withOptimisticItem(page, { documentType: 'ТРЛ' }, item)).toBe(page);
    expect(withOptimisticItem(undefined, {}, item)).toBeUndefined();
  });
});
