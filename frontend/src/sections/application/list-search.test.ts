import { applyListFilter, listSearchSchema } from './list-search';

describe('list URL search', () => {
  it('parses valid filters and coerces numbers from the URL', () => {
    expect(listSearchSchema.parse({ status: 'REGISTERED', type: 'БР', page: '3', pageSize: '25' })).toEqual({
      status: 'REGISTERED',
      type: 'БР',
      page: 3,
      pageSize: 25,
    });
  });

  it('drops invalid values instead of failing the route', () => {
    expect(listSearchSchema.parse({ status: 'yuborilgan', type: 'XX', page: '0', pageSize: '1000' })).toEqual({
      status: undefined,
      type: undefined,
      page: undefined,
      pageSize: undefined,
    });
  });

  it('goes back to page 1 when a filter changes', () => {
    const prev = { status: 'SUBMITTED' as const, page: 4, pageSize: 25 };
    expect(applyListFilter(prev, { type: 'БР' })).toEqual({ status: 'SUBMITTED', type: 'БР', page: undefined, pageSize: 25 });
    expect(applyListFilter(prev, { pageSize: 50 })).toMatchObject({ page: undefined, pageSize: 50 });
  });

  it('keeps the filters when only the page changes', () => {
    expect(applyListFilter({ status: 'RETURNED', page: 1 }, { status: 'RETURNED', page: 2 })).toEqual({
      status: 'RETURNED',
      page: 2,
    });
  });
});
