import type { ArizaToliq } from '../types';

import userEvent from '@testing-library/user-event';
import { screen, waitFor, fireEvent } from '@testing-library/react';

import { jsonJavob, renderWithProviders } from 'src/test/render';

import { ArizaForm } from './ariza-form';

// ArcGIS xaritasi jsdom'da ishlamaydi — o'rniga chegara tanlovchi tugma
vi.mock('./chegara-xarita', () => ({
  ChegaraXarita: ({ onChange, error }: { onChange: (g: unknown) => void; error?: string }) => (
    <div>
      <button
        type="button"
        onClick={() =>
          onChange({ type: 'Polygon', coordinates: [[[72.3, 40.75], [72.4, 40.75], [72.4, 40.81], [72.3, 40.75]]] })
        }
      >
        chegara-tanlash
      </button>
      {error && <span>{error}</span>}
    </div>
  ),
}));

const ariza: ArizaToliq = {
  id: 5,
  id_raqam: null,
  hujjat_nomi: 'Andijon shahri bosh rejasi',
  hujjat_turi: 'БР',
  soato_kodi: '1703401',
  hudud_nomi: 'Andijon shahri',
  holat: 'qaytarilgan',
  yuborilgan_vaqt: '2026-10-18T08:00:00Z',
  muddat: null,
  tasdiq_sanasi: '2026-03-12',
  tasdiq_hujjati: '123-son qaror',
  chegara: { type: 'Polygon', coordinates: [[[72.3, 40.75], [72.4, 40.75], [72.4, 40.81], [72.3, 40.75]]] },
  arcgis_object_id: null,
  qaytarish_sababi: 'Sana xato',
  fayllar: [],
};

describe('ArizaForm', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonJavob(200, [{ kod: '1703401', nomi: 'Andijon shahri' }])));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("bo'sh forma yuborilmaydi, xatolar maydonlar yonida", async () => {
    const onYuborish = vi.fn();
    renderWithProviders(<ArizaForm onYuborish={onYuborish} onMuvaffaqiyat={vi.fn()} />);

    await userEvent.click(screen.getByRole('button', { name: 'Yuborish' }));

    expect(await screen.findAllByText('Fayl majburiy')).toHaveLength(3);
    expect(screen.getByText('Chegarani chizing yoki GeoJSON yuklang')).toBeInTheDocument();
    expect(screen.getAllByText("Bo'sh bo'lmasin").length).toBeGreaterThan(0);
    expect(onYuborish).not.toHaveBeenCalled();
  });

  it("bo'lajak ID sana o'zgarsa yangilanadi", async () => {
    renderWithProviders(<ArizaForm ariza={ariza} onYuborish={vi.fn()} onMuvaffaqiyat={vi.fn()} />);
    const id = screen.getByLabelText("Bo'lajak ID raqam");
    expect(id).toHaveValue('БР-1703401-2026');

    fireEvent.change(screen.getByLabelText('Tasdiqlangan sana'), { target: { value: '2024-05-01' } });
    await waitFor(() => expect(id).toHaveValue('БР-1703401-2024'));
  });

  it('25 MB fayl rad etiladi', async () => {
    renderWithProviders(<ArizaForm onYuborish={vi.fn()} onMuvaffaqiyat={vi.fn()} />);
    const katta = new File(['x'], 'katta.pdf', { type: 'application/pdf' });
    Object.defineProperty(katta, 'size', { value: 25 * 1024 * 1024 });

    await userEvent.upload(screen.getByLabelText('Asosiy chizma'), katta);

    expect(await screen.findByText('Fayl hajmi 20 MB dan oshmasin')).toBeInTheDocument();
  });

  it('server 422 xatolari maydon yonida, fayllarsiz tahrir yuboriladi', async () => {
    const onYuborish = vi
      .fn()
      .mockRejectedValueOnce(
        Object.assign(new (await import('../api')).ApiXato(422, "Ma'lumotlar noto'g'ri", { soato_kodi: "SOATO ro'yxatida yo'q" }))
      )
      .mockResolvedValueOnce({ id: 5 });
    const onMuvaffaqiyat = vi.fn();
    renderWithProviders(<ArizaForm ariza={ariza} onYuborish={onYuborish} onMuvaffaqiyat={onMuvaffaqiyat} />);

    await userEvent.click(screen.getByRole('button', { name: 'Qayta yuborish' }));
    expect(await screen.findByText("SOATO ro'yxatida yo'q")).toBeInTheDocument();
    expect(onYuborish).toHaveBeenCalledTimes(1);
    expect((onYuborish.mock.calls[0][0] as FormData).has('asosiy_chizma')).toBe(false);

    await userEvent.click(screen.getByRole('button', { name: 'Qayta yuborish' }));
    await waitFor(() => expect(onMuvaffaqiyat).toHaveBeenCalledWith(5));
  });
});
