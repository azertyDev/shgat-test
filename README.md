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

Kerak: faqat Docker.

```bash
docker compose up -d --build --wait
```

Ilova: <http://localhost:8080> (nginx: statik frontend, `/api` → NestJS). API to'g'ridan-to'g'ri: <http://localhost:3000/api>,
Swagger: <http://localhost:3000/api/docs>. Migratsiyalar avtomatik qo'llanadi; `--wait` hamma servis tayyor bo'lganda qaytadi
(toza kompyuterda birinchi yig'ish bir necha daqiqa oladi).
Rol yuqori o'ng burchakdagi tugma bilan almashtiriladi (frontend rol uchun JWT oladi, bo'lmasa `X-Rol` yuboradi), yozuv — **Lotin / Кирилл**.

Ixtiyoriy: ArcGIS dasturchi kaliti — `VITE_ARCGIS_API_KEY=... docker compose up -d --build`; `JWT_SECRET` ni ham
shu tarzda bering (standart qiymat faqat lokal ishga tushirish uchun).

### Frontend'ni dev rejimida (hot reload)

```bash
docker compose up -d --wait db api   # web konteyneri 8080 portni egallamasligi uchun
cd frontend
npm install
npm run dev                          # http://localhost:8080, /api → localhost:3000
```

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
# rol tokenlari uchun kalit, masalan: openssl rand -hex 32 (bo'lmasa ilova ishga tushmaydi)
JWT_SECRET=
```

`frontend/.env.example`: `VITE_SERVER_URL` (bo'sh — proxy), `VITE_ARCGIS_LAYER_URL`,
`VITE_ARCGIS_API_KEY` (ixtiyoriy; kodga yozilmaydi, bo'sh bo'lsa asos xarita — OpenStreetMap).

## Testlar

```bash
cd backend && npm test     # 85 ta: ID generatori, chegara, proyeksiya, halqa yo'nalishi, fayllar va saqlash, muddat, ArcGIS (mock), tasdiqlash oqimi, JWT va RoleGuard
cd frontend && npm test    # 36 ta: forma (TanStack Form), tekshiruvchi amallari (409/502), sxema, API kontrakti, rol tokeni, GeoJSON, lotin→kirill, tarjima kalitlari
```

Lint: `npm run lint` (ikkala papkada).

CI: `.github/workflows/ci.yml` — har push va pull request'da backend va frontend uchun `npm ci`, lint, testlar va build,
so'ng ikkala Docker obrazi yig'iladi va `docker-compose.yml` tekshiriladi.

## Loyiha tuzilmasi

Kod, baza, fayl va o'zgaruvchi nomlari — ingliz tilida. Topshiriqning API kelishuvi (yo'llar, maydonlar, holat qiymatlari,
`xato`/`maydonlar`, `X-Rol`) o'zbekcha va o'zgarmaydi: bu nomlar har tomonda faqat bitta qatlamda turadi va shu yerda
inglizcha modelga o'giriladi — `backend/src/applications/api-contract.ts` (+ `dto/`, `mappers/`) va
`frontend/src/sections/application/api-contract.ts`. Masalan, kodda `ApplicationStatus.SUBMITTED`, API'da `"yuborilgan"`.
Foydalanuvchiga ko'rinadigan matnlar o'zbekcha. Hujjat turlari (`БР`, `ҲРС`, ...) — topshiriqdagi kodlar, ma'lumot sifatida qoladi.

```
backend/src/
  app.module.ts, main.ts
  prisma/        PrismaModule (@Global)
  common/        errors/ (yagona xato formati, filtr), pipes/ (ParseIdPipe)
  auth/          AuthModule — POST /api/auth/token, Role, @Roles, RoleGuard (Bearer token yoki X-Rol)
  geo/           GeoJSON tekshiruvi, Web Mercator va Esri halqalari (Nest'siz, toza funksiyalar)
  arcgis/        ArcgisModule — Feature Service mijozi (timeout, retry, dublikatsiz qayta urinish)
  soato/         SoatoModule — GET /api/soato va hudud nomlari
  storage/       StorageModule — fayllarni diskka yozish, tur va hajm tekshiruvi
  applications/  ApplicationsModule — controller, service, api-contract.ts,
                 dto/ (so'rov sxemasi, javob turlari), mappers/, domain/ (ID raqam, ish kunlari, hujjat turlari)
frontend/src/
  pages/         TanStack Router fayl yo'llari (/, /applications/new, /applications/$id, /applications/$id/edit)
  sections/application/  types, api-contract, api, queries, form-schema, components/, view/
  locales/       uz-Latn lug'ati, avtomatik kirill (transliterate.ts)
  theme/, components/, layouts/   Minimal UI shablonidan
```

## Qanday ishlaydi (asosiy qarorlar)

- **Geometriya**: GeoJSON (WGS-84) → Web Mercator (formula, kutubxonasiz) → Esri JSON `rings`.
  Halqa yo'nalishi shoelace bilan hisoblanadi: tashqi halqa soat mili bo'yicha, teshiklar teskari.
  MultiPolygon halqalari bitta `rings` ro'yxatiga yig'iladi. `backend/src/geo/esri-geometry.ts`
- **Tasdiqlash tartibi**: holat tekshiruvi → ID takrori tekshiruvi (409) → ArcGIS'ga yozish → faqat shundan keyin
  `id_raqam`, `arcgis_object_id` va holat saqlanadi. ArcGIS xato bersa yoki javob bermasa — 502, ariza `yuborilgan`da qoladi.
  `id_raqam` ustunida `UNIQUE` cheklov bor: parallel tasdiqlashda ham ikkinchi ID yaratilmaydi.
- **Qayta urinishda dublikat yo'q**: oldingi urinish obyektni yaratib, javobi yo'qolgan bo'lishi mumkin bo'lsa (shu so'rov
  ichidagi qayta urinish yoki `arcgis_attempt_at` saqlangan qayta tasdiqlash), avval qatlamdan
  `description = '<aniq matn>' AND created_date >= <birinchi urinish vaqti>` qidiriladi; topilsa, mavjud `objectId` olinadi.
  Yangi birinchi urinishda qidiruv yo'q: server umumiy, boshqa nomzodlar ham namunadagi `БР-1703401-2026` bilan yozadi va
  ularning obyektini "topib" olish xavfi bor (sinovda aynan shu holat uchradi).
- **Yozilgan, lekin bog'lanmagan obyekt qolmaydi**: ArcGIS'ga yozilgandan keyin holat o'zgarmasa (ariza shu orada qaytarilgan
  yoki parallel tasdiqlash ID'ni band qilgan), obyekt qatlamdan o'chiriladi (`applyEdits deletes`) va 409 qaytadi.
- **Timeout va retry**: `AbortSignal.timeout` (10 s), 2 marta qayta urinish.
- **Fayllar**: xotiraga emas, to'g'ridan-to'g'ri diskka (`UPLOAD_DIR/.incoming`, multer `diskStorage`) qabul qilinadi.
  Turi mijoz yuborgan `mime` bo'yicha emas, birinchi baytlar (PDF/PNG/JPG imzosi) bo'yicha aniqlanadi; 20 MB dan oshsa —
  422 va maydon nomi. Saqlashda nom foydalanuvchidan olinmaydi (`{tur}-{uuid}.{ext}`), fayllar bazadagi tranzaksiyadan
  oldin joylanadi va hech qachon ustidan yozilmaydi: tranzaksiya muvaffaqiyatsiz bo'lsa yangilari o'chiriladi, almashtirilgan
  eskilari esa faqat commit'dan keyin o'chiriladi. Vaqtinchalik fayllar har so'rovdan keyin tozalanadi.
- **Frontend**: ro'yxat filtrlari va sahifa URL'da (TanStack Router `validateSearch` + Zod). Forma — TanStack Form + Zod
  (Standard Schema), server 422 xatolari tegishli maydon yonida ko'rsatiladi. Xarita: `<arcgis-map>` + `<arcgis-sketch>`
  (5.0 dan `Sketch` vidjeti eskirgan), hisobga olingan hujjat — `FeatureLayer` + `definitionExpression: objectid = N`;
  obyekt topilmasa (Esri serverni tozalagan bo'lsa) tushunarli ogohlantirish chiqadi.
- **Lotin / kirill**: interfeys matnlari bitta lotin lug'atida, kirill varianti transliteratsiya bilan avtomatik yasaladi;
  serverdan keladigan xabarlar va hudud nomlari ham o'giriladi. `frontend/src/locales/transliterate.ts`

## Bajarilgan

Backend (6.1): 1–8 barcha majburiy bandlar. Qo'shimcha: Docker Compose, Swagger, timeout + retry, 3 ish kunlik muddat (ro'yxatda), JWT rollar.

Frontend (7.1): 1–8 barcha majburiy bandlar (mock o'rniga haqiqiy backend). Qo'shimcha: komponent testlari (Vitest + Testing Library),
lotin/kirill almashtirish, mobil ekran.

## Bajarilmagan / soddalashtirilgan

- JWT rollar — foydalanuvchi va parol yo'q, shuning uchun token so'ralgan rol uchun beriladi: bu imzolangan, muddatli
  token mexanizmini ko'rsatadi, haqiqiy autentifikatsiya emas. Topshiriq kelishuvi buzilmasligi uchun `X-Rol` ham ishlaydi.
  `docker-compose.yml`dagi standart `JWT_SECRET` faqat lokal ishga tushirish uchun.
- Calcite Design System — interfeys MUI asosidagi shablonda; Calcite faqat ArcGIS komponentlari ichida.
- Frontend uchun MSW mock — yo'q, full-stack variantda haqiqiy API ishlatiladi.
- PostGIS — kerak bo'lmadi: chegara `jsonb`da saqlanadi, tekshiruv va proyeksiya ilovada.
- SOATO ro'yxati (`backend/data/soato.json`) — 12 ta viloyat markazidan iborat namuna, rasmiy to'liq ro'yxat emas.
- 3 ish kunlik muddatda bayram kunlari hisobga olinmaydi.
- Frontend bundle katta (ArcGIS SDK) — code-splitting sozlanmagan.

## Sarflangan vaqt

_TODO: to'ldiring_
