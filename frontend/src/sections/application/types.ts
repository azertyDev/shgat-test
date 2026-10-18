export const HUJJAT_TURLARI = ['БСХ', 'ҲРС', 'ТРЛ', 'БР', 'БРЛ', 'ҚР', 'ЛШ'] as const;
export type HujjatTuri = (typeof HUJJAT_TURLARI)[number];

export const HOLATLAR = ['yuborilgan', 'hisobga_olingan', 'qaytarilgan'] as const;
export type Holat = (typeof HOLATLAR)[number];

export const FAYL_TURLARI = ['asosiy_chizma', 'tushuntirish_xati', 'tasdiqlovchi_hujjat'] as const;
export type FaylTuri = (typeof FAYL_TURLARI)[number];

export type Rol = 'ariza_beruvchi' | 'tekshiruvchi';

type Position = [number, number];
export type Chegara =
  | { type: 'Polygon'; coordinates: Position[][] }
  | { type: 'MultiPolygon'; coordinates: Position[][][] };

export type Soato = { kod: string; nomi: string };

export type ArizaQisqa = {
  id: number;
  id_raqam: string | null;
  hujjat_nomi: string;
  hujjat_turi: string;
  soato_kodi: string;
  hudud_nomi: string | null;
  holat: Holat;
  yuborilgan_vaqt: string;
  muddat: string | null;
};

export type ArizaFayl = { tur: FaylTuri; nomi: string; mime: string; hajm: number; url: string };

export type ArizaToliq = ArizaQisqa & {
  tasdiq_sanasi: string;
  tasdiq_hujjati: string;
  chegara: Chegara;
  arcgis_object_id: number | null;
  qaytarish_sababi: string | null;
  fayllar: ArizaFayl[];
};

export type Royxat = { items: ArizaQisqa[]; jami: number };

export type RoyxatSorovi = {
  holat?: Holat;
  hujjat_turi?: string;
  soato_kodi?: string;
  sahifa?: number;
  hajm?: number;
};
