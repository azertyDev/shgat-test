import type { Application } from '../types';

import userEvent from '@testing-library/user-event';
import { screen, waitFor, fireEvent } from '@testing-library/react';

import { jsonResponse, renderWithProviders } from 'src/test/render';

import { ApiError } from '../api';
import { ApplicationForm } from './application-form';

// the ArcGIS map does not run in jsdom: a button that sets a boundary stands in for it
vi.mock('./boundary-editor', () => ({
  BoundaryEditor: ({ onChange, error }: { onChange: (g: unknown) => void; error?: string }) => (
    <div>
      <button
        type="button"
        onClick={() =>
          onChange({ type: 'Polygon', coordinates: [[[72.3, 40.75], [72.4, 40.75], [72.4, 40.81], [72.3, 40.75]]] })
        }
      >
        pick-boundary
      </button>
      {error && <span>{error}</span>}
    </div>
  ),
}));

const application: Application = {
  id: 5,
  registrationNumber: null,
  documentName: 'Andijon shahri bosh rejasi',
  documentType: 'БР',
  soatoCode: '1703401',
  regionName: 'Andijon shahri',
  status: 'RETURNED',
  submittedAt: '2026-10-18T08:00:00Z',
  reviewDeadline: null,
  approvalDate: '2026-03-12',
  approvalDecree: '123-son qaror',
  boundary: { type: 'Polygon', coordinates: [[[72.3, 40.75], [72.4, 40.75], [72.4, 40.81], [72.3, 40.75]]] },
  arcgisObjectId: null,
  returnReason: 'Sana xato',
  files: [],
};

describe('ApplicationForm', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(200, [{ kod: '1703401', nomi: 'Andijon shahri' }])));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('does not submit an empty form and shows errors next to the fields', async () => {
    const submit = vi.fn();
    renderWithProviders(<ApplicationForm submit={submit} onSuccess={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Yuborish' }));

    expect(await screen.findAllByText('Fayl majburiy')).toHaveLength(3);
    expect(screen.getByText('Chegarani chizing yoki GeoJSON yuklang')).toBeInTheDocument();
    expect(screen.getAllByText("Bo'sh bo'lmasin").length).toBeGreaterThan(0);
    expect(submit).not.toHaveBeenCalled();
  });

  it('updates the future registration number when the date changes', async () => {
    renderWithProviders(<ApplicationForm application={application} submit={vi.fn()} onSuccess={vi.fn()} />);
    const number = screen.getByLabelText("Bo'lajak ID raqam");
    expect(number).toHaveValue('БР-1703401-2026');

    fireEvent.change(screen.getByLabelText('Tasdiqlangan sana'), { target: { value: '2024-05-01' } });
    await waitFor(() => expect(number).toHaveValue('БР-1703401-2024'));
  });

  it('rejects a 25 MB file', async () => {
    renderWithProviders(<ApplicationForm submit={vi.fn()} onSuccess={vi.fn()} />);
    const tooBig = new File(['x'], 'big.pdf', { type: 'application/pdf' });
    Object.defineProperty(tooBig, 'size', { value: 25 * 1024 * 1024 });

    await userEvent.upload(screen.getByLabelText('Asosiy chizma'), tooBig);

    expect(await screen.findByText('Fayl hajmi 20 MB dan oshmasin')).toBeInTheDocument();
  });

  it('shows server 422 errors next to the field and allows resubmitting', async () => {
    const submit = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(422, "Ma'lumotlar noto'g'ri", { soatoCode: "SOATO ro'yxatida yo'q" }))
      .mockResolvedValueOnce({ id: 5 });
    const onSuccess = vi.fn();
    renderWithProviders(<ApplicationForm application={application} submit={submit} onSuccess={onSuccess} />);

    await userEvent.click(screen.getByRole('button', { name: 'Qayta yuborish' }));
    expect(await screen.findByText("SOATO ro'yxatida yo'q")).toBeInTheDocument();
    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit.mock.calls[0][0].mainDrawing).toBeNull(); // edit without new files

    await userEvent.click(screen.getByRole('button', { name: 'Qayta yuborish' }));
    await waitFor(() => expect(onSuccess).toHaveBeenCalledWith(5));
  });
});
