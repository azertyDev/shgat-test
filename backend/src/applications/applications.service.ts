import { HttpStatus, Injectable } from '@nestjs/common';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { Holat, Prisma, type Ariza, type Fayl } from '../generated/prisma/client.js';
import { apiError, FieldValidationError } from '../common/api-error.js';
import { PrismaService } from '../prisma.service.js';
import { regionName } from '../soato/soato.js';
import { ArcgisService, ArcgisXatosi } from './arcgis.service.js';
import { arizaSchema, HUJJAT_TURLARI, type ArizaData } from './application.schema.js';
import { toEsriPolygon } from './boundary.js';
import { UPLOAD_FIELDS, type UploadField } from './api-contract.js';
import { checkUploadedFile, detectFileType } from './upload-files.js';
import { buildRegistrationNumber } from './registration-number.js';
import { addBusinessDays, tashkentDate } from './business-days.js';

export type Fayllar = Partial<Record<UploadField, Express.Multer.File[]>>;
type Tx = Prisma.TransactionClient;

const TEKSHIRISH_MUDDATI = 3; // ish kuni
const DESCRIPTION_MAX = 75; // ArcGIS qatlamidagi description maydoni uzunligi

@Injectable()
export class ArizalarService {
  private readonly uploadDir = resolve(process.env.UPLOAD_DIR ?? 'uploads');

  constructor(
    private readonly prisma: PrismaService,
    private readonly arcgis: ArcgisService,
  ) {}

  async yarat(dataMatn: unknown, fayllar: Fayllar) {
    const d = this.tekshir(dataMatn, fayllar, true);
    const a = await this.prisma.$transaction(async (tx) => {
      const ariza = await tx.ariza.create({ data: ustunlar(d) });
      await this.saqlaFayllar(tx, ariza.id, fayllar);
      return ariza;
    });
    return { id: a.id, holat: a.holat };
  }

  async royxat(q: Record<string, string | undefined>) {
    const maydonlar: Record<string, string> = {};
    if (q.holat && !(q.holat in Holat)) maydonlar.holat = `Holatlardan biri: ${Object.keys(Holat).join(', ')}`;
    if (q.hujjat_turi && !(HUJJAT_TURLARI as readonly string[]).includes(q.hujjat_turi))
      maydonlar.hujjat_turi = `Turlardan biri: ${HUJJAT_TURLARI.join(', ')}`;
    if (Object.keys(maydonlar).length) throw new FieldValidationError(maydonlar);

    const sahifa = Math.max(1, Number.parseInt(q.sahifa ?? '', 10) || 1);
    const hajm = Math.min(100, Math.max(1, Number.parseInt(q.hajm ?? '', 10) || 20));
    const where: Prisma.ArizaWhereInput = {
      holat: q.holat as Holat | undefined,
      hujjat_turi: q.hujjat_turi || undefined,
      soato_kodi: q.soato_kodi || undefined,
    };
    const [items, jami] = await this.prisma.$transaction([
      this.prisma.ariza.findMany({ where, orderBy: { id: 'desc' }, skip: (sahifa - 1) * hajm, take: hajm }),
      this.prisma.ariza.count({ where }),
    ]);
    return { items: items.map(qisqa), jami };
  }

  async bitta(id: number) {
    const a = await this.prisma.ariza.findUnique({ where: { id }, include: { fayllar: true } });
    if (!a) throw apiError(HttpStatus.NOT_FOUND, 'Ariza topilmadi');
    return {
      ...qisqa(a),
      tasdiq_sanasi: a.tasdiq_sanasi.toISOString().slice(0, 10),
      tasdiq_hujjati: a.tasdiq_hujjati,
      chegara: a.chegara,
      arcgis_object_id: a.arcgis_object_id,
      qaytarish_sababi: a.qaytarish_sababi,
      fayllar: a.fayllar.map((f) => ({
        tur: f.tur,
        nomi: f.nomi,
        mime: f.mime,
        hajm: f.hajm,
        url: `/api/arizalar/${a.id}/fayllar/${f.tur}`,
      })),
    };
  }

  /** Qaytarilgan arizani tuzatib qayta yuborish. Yuborilmagan fayllar saqlanib qoladi. */
  async tuzat(id: number, dataMatn: unknown, fayllar: Fayllar) {
    await this.holatiShu(id, 'qaytarilgan', 'Faqat qaytarilgan arizani tuzatib qayta yuborish mumkin');
    const d = this.tekshir(dataMatn, fayllar, false);
    await this.prisma.$transaction(async (tx) => {
      const r = await tx.ariza.updateMany({
        where: { id, holat: 'qaytarilgan' },
        data: { ...ustunlar(d), holat: 'yuborilgan', yuborilgan_vaqt: new Date(), qaytarish_sababi: null, arcgis_urinish_vaqti: null },
      });
      if (r.count === 0) throw apiError(HttpStatus.CONFLICT, "Ariza holati o'zgargan, sahifani yangilang");
      await this.saqlaFayllar(tx, id, fayllar);
    });
    return { id, holat: 'yuborilgan' as const };
  }

  /**
   * ID yaratadi, chegarani ArcGIS'ga yozadi va faqat shundan keyin holatni o'zgartiradi.
   * ArcGIS xato bersa — holat va ID o'zgarmaydi (502), tekshiruvchi qayta urinadi.
   */
  async tasdiqla(id: number) {
    const a = await this.holatiShu(id, 'yuborilgan', 'Faqat yuborilgan arizani tasdiqlash mumkin');
    const idRaqam = buildRegistrationNumber(a.hujjat_turi, a.soato_kodi, a.tasdiq_sanasi);

    const band = await this.prisma.ariza.findUnique({ where: { id_raqam: idRaqam } });
    if (band) throw idTakrori(idRaqam, band.id);

    // ID va holat emas — faqat urinish vaqti saqlanadi (ArcgisService.yoz izohiga qarang)
    const boshlandi = a.arcgis_urinish_vaqti ?? new Date();
    if (!a.arcgis_urinish_vaqti) await this.prisma.ariza.update({ where: { id }, data: { arcgis_urinish_vaqti: boshlandi } });

    let objectId: number;
    try {
      const description = `${idRaqam} | ${a.hujjat_nomi}`.slice(0, DESCRIPTION_MAX);
      objectId = await this.arcgis.yoz(description, toEsriPolygon(a.chegara as never), boshlandi);
    } catch (e) {
      if (e instanceof ArcgisXatosi) throw apiError(HttpStatus.BAD_GATEWAY, `ArcGIS qatlamiga yozib bo'lmadi (${e.message.replace(/\.+$/, '')}). Keyinroq qayta urinib ko'ring.`);
      throw e;
    }

    try {
      const r = await this.prisma.ariza.updateMany({
        where: { id, holat: 'yuborilgan' },
        data: { holat: 'hisobga_olingan', id_raqam: idRaqam, arcgis_object_id: objectId },
      });
      if (r.count === 0) throw apiError(HttpStatus.CONFLICT, "Ariza holati o'zgargan, sahifani yangilang");
    } catch (e) {
      // parallel tasdiqlashda unique cheklov ishlaydi
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw idTakrori(idRaqam);
      throw e;
    }
    return { id_raqam: idRaqam, arcgis_object_id: objectId };
  }

  async qaytar(id: number, body: unknown) {
    const sabab = (body as { sabab?: unknown } | undefined)?.sabab;
    if (typeof sabab !== 'string' || !sabab.trim()) throw new FieldValidationError({ sabab: 'Qaytarish sababi majburiy' });
    await this.holatiShu(id, 'yuborilgan', 'Faqat yuborilgan arizani qaytarish mumkin');
    const r = await this.prisma.ariza.updateMany({
      where: { id, holat: 'yuborilgan' },
      data: { holat: 'qaytarilgan', qaytarish_sababi: sabab.trim() },
    });
    if (r.count === 0) throw apiError(HttpStatus.CONFLICT, "Ariza holati o'zgargan, sahifani yangilang");
    return { id, holat: 'qaytarilgan' as const };
  }

  async fayl(id: number, tur: string) {
    const f = (UPLOAD_FIELDS as readonly string[]).includes(tur)
      ? await this.prisma.fayl.findUnique({ where: { ariza_id_tur: { ariza_id: id, tur: tur as UploadField } } })
      : null;
    if (!f) throw apiError(HttpStatus.NOT_FOUND, 'Fayl topilmadi');
    return { ...f, toliqYol: join(this.uploadDir, f.yol) };
  }

  private async holatiShu(id: number, holat: Holat, xabar: string): Promise<Ariza> {
    const a = await this.prisma.ariza.findUnique({ where: { id } });
    if (!a) throw apiError(HttpStatus.NOT_FOUND, 'Ariza topilmadi');
    if (a.holat !== holat) throw apiError(HttpStatus.CONFLICT, `${xabar} (hozirgi holat: ${a.holat})`);
    return a;
  }

  private tekshir(dataMatn: unknown, fayllar: Fayllar, fayllarMajburiy: boolean): ArizaData {
    const maydonlar: Record<string, string> = {};
    let qiymat: ArizaData | undefined;
    try {
      const r = arizaSchema.safeParse(JSON.parse(String(dataMatn ?? '')));
      if (r.success) qiymat = r.data;
      else for (const i of r.error.issues) maydonlar[String(i.path[0] ?? 'data')] ??= i.message;
    } catch {
      maydonlar.data = "data maydoni to'g'ri JSON bo'lishi kerak";
    }
    for (const tur of UPLOAD_FIELDS) {
      const x = checkUploadedFile(fayllar[tur]?.[0], fayllarMajburiy);
      if (x) maydonlar[tur] = x;
    }
    if (!qiymat || Object.keys(maydonlar).length) throw new FieldValidationError(maydonlar);
    return qiymat;
  }

  /** Fayl nomi foydalanuvchidan olinmaydi: {uploadDir}/{arizaId}/{tur}.{ext} */
  private async saqlaFayllar(tx: Tx, arizaId: number, fayllar: Fayllar) {
    for (const tur of UPLOAD_FIELDS) {
      const f = fayllar[tur]?.[0];
      if (!f) continue;
      const { ext, mime } = detectFileType(f.buffer)!;
      const yol = `${arizaId}/${tur}.${ext}`;
      const toliq = join(this.uploadDir, yol);
      await mkdir(dirname(toliq), { recursive: true });
      await writeFile(toliq, f.buffer);
      const eski = await tx.fayl.findUnique({ where: { ariza_id_tur: { ariza_id: arizaId, tur } } });
      if (eski && eski.yol !== yol) await rm(join(this.uploadDir, eski.yol), { force: true });
      const qator = { nomi: f.originalname.slice(0, 255), mime, hajm: f.size, yol };
      await tx.fayl.upsert({
        where: { ariza_id_tur: { ariza_id: arizaId, tur } },
        create: { ariza_id: arizaId, tur, ...qator },
        update: qator,
      });
    }
  }
}

const ustunlar = (d: ArizaData) => ({
  hujjat_nomi: d.hujjat_nomi,
  hujjat_turi: d.hujjat_turi,
  soato_kodi: d.soato_kodi,
  tasdiq_sanasi: new Date(`${d.tasdiq_sanasi}T00:00:00Z`),
  tasdiq_hujjati: d.tasdiq_hujjati,
  chegara: d.chegara as Prisma.InputJsonValue,
});

const qisqa = (a: Ariza & { fayllar?: Fayl[] }) => ({
  id: a.id,
  id_raqam: a.id_raqam,
  hujjat_nomi: a.hujjat_nomi,
  hujjat_turi: a.hujjat_turi,
  soato_kodi: a.soato_kodi,
  hudud_nomi: regionName(a.soato_kodi),
  holat: a.holat,
  yuborilgan_vaqt: a.yuborilgan_vaqt,
  // tekshiruvchi uchun: faqat ko'rib chiqilmagan arizalarda
  muddat: a.holat === 'yuborilgan' ? addBusinessDays(tashkentDate(a.yuborilgan_vaqt), TEKSHIRISH_MUDDATI) : null,
});

const idTakrori = (idRaqam: string, arizaId?: number) =>
  apiError(
    HttpStatus.CONFLICT,
    `${idRaqam} ID raqami allaqachon mavjud${arizaId ? ` (ariza #${arizaId})` : ''}: shu tur, hudud va yil uchun hujjat hisobga olingan`,
  );
