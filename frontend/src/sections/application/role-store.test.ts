const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Unsigned JWT-shaped token; only `exp` matters to the client. */
const jwt = (name: string, expiresInSec = 8 * 3600) =>
  `h.${btoa(JSON.stringify({ sub: name, exp: Math.floor(Date.now() / 1000) + expiresInSec }))}.sig`;

/** A fresh module per test, like a page load: state comes only from localStorage. */
const load = async () => {
  vi.resetModules();
  return { ...(await import('./role-store')), api: (await import('./api')).api };
};

describe('role store and auth headers', () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => {
    localStorage.clear();
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('requests a token for the role and then sends it as Bearer', async () => {
    const { setRole, authHeaders } = await load();
    const token = jwt('reviewer');
    fetchMock.mockResolvedValueOnce(json(200, { token }));
    setRole('REVIEWER');
    await vi.waitFor(() => expect(authHeaders()).toEqual({ Authorization: `Bearer ${token}` }));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/auth/token');
    expect(JSON.parse(init?.body as string)).toEqual({ rol: 'tekshiruvchi' });
  });

  it('falls back to X-Rol when no token can be had', async () => {
    const { setRole, authHeaders } = await load();
    fetchMock.mockRejectedValueOnce(new TypeError('network'));
    setRole('APPLICANT');
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(authHeaders()).toEqual({ 'X-Rol': 'ariza_beruvchi' });
  });

  it('never sends the token of another role', async () => {
    const { setRole, getRole, authHeaders } = await load();
    let resolveFirst!: (r: Response) => void;
    fetchMock
      .mockImplementationOnce(() => new Promise((r) => (resolveFirst = r)))
      .mockResolvedValueOnce(json(500, {}));
    setRole('REVIEWER');
    setRole('APPLICANT');
    resolveFirst(json(200, { token: jwt('late-reviewer') }));
    await new Promise((r) => setTimeout(r, 0));
    expect(getRole()).toBe('APPLICANT');
    expect(authHeaders()).toEqual({ 'X-Rol': 'ariza_beruvchi' });
  });

  it('refreshes a token the server rejects (401) once and retries the request', async () => {
    const { setRole, authHeaders, api } = await load();
    const old = jwt('old');
    fetchMock.mockResolvedValueOnce(json(200, { token: old }));
    setRole('REVIEWER');
    await vi.waitFor(() => expect(authHeaders()).toEqual({ Authorization: `Bearer ${old}` }));

    const fresh = jwt('new');
    fetchMock
      .mockResolvedValueOnce(json(401, { xato: "Token yaroqsiz yoki muddati o'tgan" }))
      .mockResolvedValueOnce(json(200, { token: fresh }))
      .mockResolvedValueOnce(json(200, [{ kod: '1703401', nomi: 'Andijon shahri' }]));

    await expect(api.soato()).resolves.toEqual([{ code: '1703401', name: 'Andijon shahri' }]);
    const retried = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
    expect((retried[1]?.headers as Record<string, string>).Authorization).toBe(`Bearer ${fresh}`);
  });

  it('reuses a stored token after a reload instead of asking for a new one', async () => {
    const token = jwt('stored-reviewer');
    localStorage.setItem('shgat-role', 'REVIEWER');
    localStorage.setItem('shgat-tokens', JSON.stringify({ REVIEWER: token }));

    const { ensureToken, authHeaders } = await load();
    await ensureToken();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(authHeaders()).toEqual({ Authorization: `Bearer ${token}` });
  });

  it('asks for a new token when the stored one is about to expire', async () => {
    localStorage.setItem('shgat-role', 'REVIEWER');
    localStorage.setItem('shgat-tokens', JSON.stringify({ REVIEWER: jwt('expiring', 30) }));
    const fresh = jwt('fresh');
    fetchMock.mockResolvedValueOnce(json(200, { token: fresh }));

    const { ensureToken, authHeaders } = await load();
    await ensureToken();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(authHeaders()).toEqual({ Authorization: `Bearer ${fresh}` });
    expect(JSON.parse(localStorage.getItem('shgat-tokens')!)).toEqual({ REVIEWER: fresh });
  });

  it('does not send an expired token and does not ask again when switching back to a role', async () => {
    localStorage.setItem('shgat-role', 'APPLICANT');
    localStorage.setItem(
      'shgat-tokens',
      JSON.stringify({ APPLICANT: jwt('expired', -10), REVIEWER: jwt('reviewer') })
    );
    const { setRole, authHeaders } = await load();
    expect(authHeaders()).toEqual({ 'X-Rol': 'ariza_beruvchi' });

    setRole('REVIEWER');
    await new Promise((r) => setTimeout(r, 0));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
