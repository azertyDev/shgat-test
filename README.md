# ShGAT — shaharsozlik hujjatlarini ro'yxatga olish

Test topshirig'i (full-stack): ariza beruvchi hujjat chegarasini xaritada chizib yoki GeoJSON yuklab ariza yuboradi,
tekshiruvchi uni tasdiqlaydi yoki qaytaradi. Tasdiqlashda server ID raqam yaratadi va chegarani Esri'ning ochiq
test qatlamiga (`Wildfire/FeatureServer/2`) yozadi. Hisobga olingan hujjat chegarasi xaritada to'g'ridan-to'g'ri shu qatlamdan ko'rsatiladi.

| Qism | Stek |
|---|---|
| Backend | NestJS 12, Prisma 7, PostgreSQL 17, Zod 4, Vitest, Swagger |
| Frontend | React 19, Vite, TypeScript, MUI 7 (Minimal UI shabloni), TanStack Router / Query / Form, ArcGIS Maps SDK 5.1 (`@arcgis/core` + `@arcgis/map-components`) |

API kelishuvi: [docs/api.md](docs/api.md) · Swagger: <http://localhost:3000/api/docs>

## Ishga tushirish

Kerak: Docker, Node.js 22+.

```bash
# 1. Backend + PostgreSQL (migratsiyalar avtomatik qo'llanadi)
docker compose up -d --build

# 2. Frontend
cd frontend
npm install
npm run dev
```

Ilova: <http://localhost:8080>. Vite `/api` so'rovlarini `localhost:3000` ga yo'naltiradi.
Rol yuqori o'ng burchakdagi tugma bilan almashtiriladi (`X-Rol` sarlavhasi), yozuv — **Lotin / Кирилл**.

### Backend'ni Docker'siz ishga tushirish

```bash
docker compose up -d db
cd backend
cp .env.example .env
npm install            # postinstall: prisma generate
npx prisma migrate deploy
npm run start:dev
```

### `.env` namunalari

`backend/.env.example`:

```env
DATABASE_URL=postgresql://shgat:shgat@localhost:5432/shgat
ARCGIS_LAYER_URL=https://sampleserver6.arcgisonline.com/arcgis/rest/services/Wildfire/FeatureServer/2
ARCGIS_TIMEOUT_MS=10000
ARCGIS_RETRIES=2
UPLOAD_DIR=./uploads
PORT=3000
```

`frontend/.env.example`: `VITE_SERVER_URL` (bo'sh — proxy), `VITE_ARCGIS_LAYER_URL`,
`VITE_ARCGIS_API_KEY` (ixtiyoriy; kodga yozilmaydi, bo'sh bo'lsa asos xarita — OpenStreetMap).

## Testlar

```bash
cd backend && npm test     # 42 ta: ID generatori, chegara, proyeksiya, halqa yo'nalishi, fayllar, muddat, ArcGIS (mock), tasdiqlash oqimi
cd frontend && npm test    # 26 ta: forma (TanStack Form), tekshiruvchi amallari (409/502), sxema, GeoJSON, lotin→kirill
```

Lint: `npm run lint` (ikkala papkada).

## Qanday ishlaydi (asosiy qarorlar)

- **Geometriya**: GeoJSON (WGS-84) → Web Mercator (formula, kutubxonasiz) → Esri JSON `rings`.
  Halqa yo'nalishi shoelace bilan hisoblanadi: tashqi halqa soat mili bo'yicha, teshiklar teskari.
  MultiPolygon halqalari bitta `rings` ro'yxatiga yig'iladi. `backend/src/arizalar/chegara.ts`
- **Tasdiqlash tartibi**: holat tekshiruvi → ID takrori tekshiruvi (409) → ArcGIS'ga yozish → faqat shundan keyin
  `id_raqam`, `arcgis_object_id` va holat saqlanadi. ArcGIS xato bersa yoki javob bermasa — 502, ariza `yuborilgan`da qoladi.
  `id_raqam` ustunida `UNIQUE` cheklov bor: parallel tasdiqlashda ham ikkinchi ID yaratilmaydi.
- **Qayta urinishda dublikat yo'q**: har urinishdan oldin qatlamdan
  `description = '<aniq matn>' AND created_date >= <birinchi urinish vaqti>` qidiriladi; topilsa, mavjud `objectId` olinadi.
  Birinchi urinish vaqti bazada saqlanadi (`arcgis_urinish_vaqti`), shuning uchun tekshiruvchi tugmani qayta bossa ham ishlaydi.
  Vaqt sharti ataylab qo'yilgan: server umumiy va boshqa nomzodlar ham namunadagi `БР-1703401-2026` bilan yozadi —
  faqat ID bo'yicha qidiruv birovning obyektini "topib" olardi (sinovda aynan shu holat uchradi).
- **Timeout va retry**: `AbortSignal.timeout` (10 s), 2 marta qayta urinish.
- **Fayllar**: turi mijoz yuborgan `mime` bo'yicha emas, birinchi baytlar (PDF/PNG/JPG imzosi) bo'yicha aniqlanadi;
  diskka foydalanuvchi nomi bilan emas, `{arizaId}/{tur}.{ext}` sifatida yoziladi. 20 MB dan oshsa — 422 va maydon nomi.
- **Frontend**: ro'yxat filtrlari va sahifa URL'da (TanStack Router `validateSearch` + Zod). Forma — TanStack Form + Zod
  (Standard Schema), server 422 xatolari tegishli maydon yonida ko'rsatiladi. Xarita: `<arcgis-map>` + `<arcgis-sketch>`
  (5.0 dan `Sketch` vidjeti eskirgan), hisobga olingan hujjat — `FeatureLayer` + `definitionExpression: objectid = N`;
  obyekt topilmasa (Esri serverni tozalagan bo'lsa) tushunarli ogohlantirish chiqadi.
- **Lotin / kirill**: interfeys matnlari bitta lotin lug'atida, kirill varianti transliteratsiya bilan avtomatik yasaladi;
  serverdan keladigan xabarlar va hudud nomlari ham o'giriladi. `frontend/src/locales/kirill.ts`

## Bajarilgan

Backend (6.1): 1–8 barcha majburiy bandlar. Qo'shimcha: Docker Compose, Swagger, timeout + retry, 3 ish kunlik muddat (ro'yxatda).

Frontend (7.1): 1–8 barcha majburiy bandlar (mock o'rniga haqiqiy backend). Qo'shimcha: komponent testlari (Vitest + Testing Library),
lotin/kirill almashtirish, mobil ekran.

## Bajarilmagan / soddalashtirilgan

- JWT rollar — yo'q, `X-Rol` sarlavhasi (topshiriqda ruxsat etilgan).
- Calcite Design System — interfeys MUI asosidagi shablonda; Calcite faqat ArcGIS komponentlari ichida.
- Frontend uchun MSW mock — yo'q, full-stack variantda haqiqiy API ishlatiladi.
- PostGIS — kerak bo'lmadi: chegara `jsonb`da saqlanadi, tekshiruv va proyeksiya ilovada.
- SOATO ro'yxati (`backend/data/soato.json`) — 12 ta viloyat markazidan iborat namuna, rasmiy to'liq ro'yxat emas.
- 3 ish kunlik muddatda bayram kunlari hisobga olinmaydi.
- Frontend Docker Compose'ga kiritilmagan (dev server orqali).
- Frontend bundle katta (ArcGIS SDK) — code-splitting sozlanmagan.

## Sarflangan vaqt

_TODO: to'ldiring_
