import userEvent from '@testing-library/user-event';
import { screen, within, waitFor } from '@testing-library/react';

import { jsonResponse, renderWithProviders } from 'src/test/render';

import { ReviewActions } from './review-actions';

describe('ReviewActions', () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('explains a duplicate number (409) in plain language', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(409, { xato: 'БР-1703401-2026 band (ariza #1)', kod: 'id_takrori' })
    );
    renderWithProviders(<ReviewActions id={2} />);

    await userEvent.click(screen.getByRole('button', { name: 'Tasdiqlash' }));

    expect(await screen.findByText(/Bu ID raqam band/)).toBeInTheDocument();
    expect(screen.getByText(/ariza #1/)).toBeInTheDocument();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/arizalar/2/tasdiqlash');
    expect((init?.headers as Record<string, string>)['X-Rol']).toBeDefined();
  });

  it('shows the ArcGIS error (502) with a retry button', async () => {
    fetchMock.mockResolvedValue(jsonResponse(502, { xato: "ArcGIS qatlamiga yozib bo'lmadi (HTTP 503)" }));
    renderWithProviders(<ReviewActions id={3} />);

    await userEvent.click(screen.getByRole('button', { name: 'Tasdiqlash' }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/holati o'zgarmadi/);
    await userEvent.click(within(alert).getByRole('button', { name: 'Tasdiqlash' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it('requires a reason to return an application', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { id: 3, holat: 'qaytarilgan' }));
    renderWithProviders(<ReviewActions id={3} />);

    await userEvent.click(screen.getByRole('button', { name: 'Qaytarish' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Qaytarish' }));
    expect(within(dialog).getByText('Sabab majburiy')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();

    await userEvent.type(within(dialog).getByLabelText('Qaytarish sababi'), 'Chegara noaniq');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Qaytarish' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(JSON.parse(fetchMock.mock.calls[0][1]?.body as string)).toEqual({ sabab: 'Chegara noaniq' });
  });
});
