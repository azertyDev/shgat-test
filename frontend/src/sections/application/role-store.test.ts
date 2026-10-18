import { api } from './api';
import { setRole, getRole, authHeaders, refreshToken } from './role-store';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('role store and auth headers', () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('requests a token for the role and then sends it as Bearer', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { token: 'tok-reviewer' }));
    setRole('REVIEWER');
    await vi.waitFor(() => expect(authHeaders()).toEqual({ Authorization: 'Bearer tok-reviewer' }));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/auth/token');
    expect(JSON.parse(init?.body as string)).toEqual({ rol: 'tekshiruvchi' });
  });

  it('falls back to X-Rol when no token can be had', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('network'));
    setRole('APPLICANT');
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(authHeaders()).toEqual({ 'X-Rol': 'ariza_beruvchi' });
  });

  it('ignores a token that arrives after the role changed', async () => {
    let resolveFirst!: (r: Response) => void;
    fetchMock
      .mockImplementationOnce(() => new Promise((r) => (resolveFirst = r)))
      .mockResolvedValueOnce(json(500, {}));
    setRole('REVIEWER');
    setRole('APPLICANT');
    resolveFirst(json(200, { token: 'late-reviewer-token' }));
    await new Promise((r) => setTimeout(r, 0));
    expect(getRole()).toBe('APPLICANT');
    expect(authHeaders()).toEqual({ 'X-Rol': 'ariza_beruvchi' });
  });

  it('refreshes an expired token once and retries the request', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { token: 'old' }));
    setRole('REVIEWER');
    await vi.waitFor(() => expect(authHeaders()).toEqual({ Authorization: 'Bearer old' }));

    fetchMock
      .mockResolvedValueOnce(json(401, { xato: "Token yaroqsiz yoki muddati o'tgan" }))
      .mockResolvedValueOnce(json(200, { token: 'new' }))
      .mockResolvedValueOnce(json(200, [{ kod: '1703401', nomi: 'Andijon shahri' }]));

    await expect(api.soato()).resolves.toEqual([{ code: '1703401', name: 'Andijon shahri' }]);
    const retried = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
    expect((retried[1]?.headers as Record<string, string>).Authorization).toBe('Bearer new');
  });

  it('refreshToken without a role uses the current one', async () => {
    fetchMock.mockResolvedValue(json(200, { token: 't' }));
    setRole('APPLICANT');
    await refreshToken();
    const last = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
    expect(JSON.parse(last[1]?.body as string)).toEqual({ rol: 'ariza_beruvchi' });
  });
});
