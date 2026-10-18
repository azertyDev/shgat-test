# API kelishuvi

Barcha so'rovlarda `X-Rol: ariza_beruvchi | tekshiruvchi` sarlavhasi bo'ladi. Noto'g'ri rol → `403`.

Qo'shimcha (bonus 6.2): `POST /api/auth/token {"rol": "tekshiruvchi"}` → `200 {"token": "..."}` (8 soat).
`Authorization: Bearer <token>` yuborilsa, rol tokendan olinadi va `X-Rol`dan ustun turadi; yaroqsiz yoki
muddati o'tgan token → `401`. Token bo'lmasa `X-Rol` avvalgidek ishlaydi.

Xato formati yagona:

```json
{ "xato": "umumiy xabar", "maydonlar": { "soato_kodi": "ro'yxatda yo'q" } }
```

`maydonlar` faqat validatsiya xatolarida (422) bo'ladi.
Ixtiyoriy `kod` — matnni tahlil qilmasdan aniqlash uchun mashina kodi: `id_takrori` (409, ID raqam band).

## Ariza holatlari

`yuborilgan` → (tasdiqlash) → `hisobga_olingan`
`yuborilgan` → (qaytarish) → `qaytarilgan` → (PUT) → `yuborilgan`

## Endpointlar

| Metod va yo'l | Rol | Javob |
|---|---|---|
| `POST /api/arizalar` | ariza_beruvchi | `201 {id, holat}` · `422` |
| `GET /api/arizalar` | ikkalasi | `200 {items, jami}` |
| `GET /api/arizalar/{id}` | ikkalasi | `200 Ariza` · `404` |
| `PUT /api/arizalar/{id}` | ariza_beruvchi | `200 {id, holat}` · `409` holat `qaytarilgan` emas · `422` |
| `POST /api/arizalar/{id}/tasdiqlash` | tekshiruvchi | `200 {id_raqam, arcgis_object_id}` · `409` · `502` |
| `POST /api/arizalar/{id}/qaytarish` | tekshiruvchi | body `{"sabab": "..."}` → `200 {id, holat}` · `409` · `422` |
| `GET /api/soato` | ikkalasi | `200 [{kod, nomi}]` |
| `GET /api/arizalar/{id}/fayllar/{tur}` | ikkalasi | fayl (yuklab olish) |

### POST / PUT multipart

- `data` — JSON matn: `hujjat_nomi, hujjat_turi, soato_kodi, tasdiq_sanasi, tasdiq_hujjati, chegara`
- fayllar: `asosiy_chizma`, `tushuntirish_xati`, `tasdiqlovchi_hujjat` (PDF/JPG/PNG, har biri ≤ 20 MB).
  POST'da uchalasi majburiy; PUT'da yuborilgani almashtiriladi, qolgani saqlanadi.

### GET /api/arizalar

Query: `holat`, `hujjat_turi`, `soato_kodi`, `sahifa` (1 dan, default 1), `hajm` (1–100, default 20).

Ro'yxat elementi — ariza modeli (TZ 4.1, `fayllar`dan tashqari) va uchta qo'shimcha maydon:

```json
{
  "items": [{
    "id": 1,
    "hujjat_nomi": "Andijon shahri bosh rejasi", "hujjat_turi": "БР", "soato_kodi": "1703401",
    "tasdiq_sanasi": "2026-03-12", "tasdiq_hujjati": "123-son qaror",
    "chegara": { "type": "Polygon", "coordinates": [[[72.3, 40.75], [72.4, 40.75], [72.4, 40.81], [72.3, 40.75]]] },
    "id_raqam": null, "holat": "yuborilgan", "arcgis_object_id": null,
    "hudud_nomi": "Andijon shahri", "yuborilgan_vaqt": "2026-10-18T10:00:00.000Z", "muddat": "2026-10-21"
  }],
  "jami": 1
}
```

TZ 4.1 da yo'q, qo'shimcha maydonlar (faqat o'qish uchun, server hisoblaydi):

| Maydon | Nima |
|---|---|
| `hudud_nomi` | SOATO kodi bo'yicha hudud nomi (`GET /api/soato` ro'yxatidan) |
| `yuborilgan_vaqt` | ariza oxirgi marta yuborilgan vaqt (ISO 8601) |
| `muddat` | ko'rib chiqish muddati: yuborilgan kundan 3 ish kuni (6.2), faqat `yuborilgan` holatida, aks holda `null` |

### GET /api/arizalar/{id}

Ro'yxat elementi + `fayllar: [{tur, nomi, mime, hajm, url}]` va qo'shimcha `qaytarish_sababi`
(qaytarilgan arizada tekshiruvchi yozgan sabab, boshqa holatlarda `null`).
