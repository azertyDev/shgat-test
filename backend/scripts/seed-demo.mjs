// Demo data through the public API, the same path the UI takes: create, then approve or return.
// Run against a running API:  docker compose exec api npm run seed   (or API_URL=... node scripts/seed-demo.mjs)
// Approvals write to the shared Esri sample layer (task spec 4.3) — only demo records, as the spec asks.
// Refuses to run on a database that already has applications, unless --force is given.

const API = process.env.API_URL ?? 'http://localhost:3000/api';
const FORCE = process.argv.includes('--force');

// [name, type, SOATO, approval date, decree, centre [lon, lat], radius [lon, lat] in degrees, outcome, return reason]
const APPLICATIONS = [
  [
    'Samarqand shahri bosh rejasi',
    'БР',
    '1718401',
    '2024-06-14',
    '512-son qaror',
    [66.96, 39.655],
    [0.085, 0.06],
    'approve',
  ],
  [
    'Buxoro shahri bosh rejasi',
    'БР',
    '1706401',
    '2023-09-20',
    '247-son qaror',
    [64.42, 39.77],
    [0.07, 0.05],
    'approve',
  ],
  [
    'Navoiy shahri markaziy qismi tafsiliy rejalashtirish loyihasi',
    'ТРЛ',
    '1712401',
    '2025-02-11',
    '89-son qaror',
    [65.375, 40.1],
    [0.025, 0.018],
    'approve',
  ],
  [
    'Nukus shahri bosh rejasi',
    'БР',
    '1735401',
    '2022-11-03',
    '631-son qaror',
    [59.61, 42.46],
    [0.08, 0.055],
    'approve',
  ],
  [
    "Farg'ona shahri bosh rejasi",
    'БР',
    '1730401',
    '2024-03-28',
    '198-son qaror',
    [71.785, 40.385],
    [0.06, 0.045],
    'approve',
  ],
  [
    "Termiz shahri bosh rejasiga o'zgartirishlar",
    'БР',
    '1722401',
    '2025-07-15',
    '402-son qaror',
    [67.28, 37.235],
    [0.06, 0.03],
    'return',
    "Tasdiqlovchi hujjat sifatida qarorning faqat birinchi sahifasi yuklangan. Qarorning to'liq nusxasini biriktiring.",
  ],
  [
    'Urganch shahri janubiy qismi tafsiliy rejasi',
    'ТРЛ',
    '1733401',
    '2025-04-22',
    '155-son qaror',
    [60.635, 41.535],
    [0.03, 0.02],
    'return',
    "Chegara tushuntirish xatida ko'rsatilgan hududga mos emas: chizilgan poligon janubiy qismdan tashqariga chiqib ketgan. Chegarani tuzating.",
  ],
  [
    'Andijon shahri bosh rejasi',
    'БР',
    '1703401',
    '2026-03-12',
    '123-son qaror',
    [72.345, 40.78],
    [0.065, 0.045],
    'submit',
  ],
  [
    'Qarshi shahri bosh rejasi',
    'БР',
    '1710401',
    '2026-01-20',
    '37-son qaror',
    [65.79, 38.86],
    [0.07, 0.05],
    'submit',
  ],
  [
    'Namangan shahri shimoliy turar joy massivi tafsiliy rejasi',
    'ТРЛ',
    '1714401',
    '2026-05-05',
    '276-son qaror',
    [71.66, 41.025],
    [0.03, 0.02],
    'submit',
  ],
  [
    'Jizzax shahri sanoat zonasi tafsiliy rejasi',
    'ТРЛ',
    '1708401',
    '2026-08-18',
    '344-son qaror',
    [67.875, 40.105],
    [0.025, 0.018],
    'submit',
  ],
  [
    'Guliston shahri bosh rejasi',
    'БР',
    '1724401',
    '2026-09-02',
    '419-son qaror',
    [68.785, 40.49],
    [0.045, 0.035],
    'submit',
  ],
];

// irregular but simple outline: the radius changes with the angle, so the ring never crosses itself
const SHAPE = [1.0, 0.82, 0.95, 0.7, 0.9, 0.78, 1.05, 0.85, 0.92, 0.75];

function boundary([lon, lat], [rx, ry]) {
  const round = (v) => Math.round(v * 1e5) / 1e5;
  const ring = SHAPE.map((k, i) => {
    const a = (2 * Math.PI * i) / SHAPE.length;
    return [
      round(lon + rx * k * Math.cos(a)),
      round(lat + ry * k * Math.sin(a)),
    ];
  });
  return { type: 'Polygon', coordinates: [[...ring, ring[0]]] };
}

/** Minimal one-page PDF with plain ASCII text (Helvetica), enough for the PDF signature check. */
function pdf(title, lines) {
  const esc = (t) => t.replace(/[^\x20-\x7e]/g, '?').replace(/[\\()]/g, '\\$&');
  const text = [
    'BT',
    '/F1 18 Tf',
    '56 780 Td',
    `(${esc(title)}) Tj`,
    '/F1 11 Tf',
    '0 -30 Td',
  ];
  for (const line of lines) text.push(`(${esc(line)}) Tj`, '0 -16 Td');
  text.push('ET');
  const stream = text.join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let out = '%PDF-1.4\n';
  const offsets = objects.map((body, i) => {
    const at = out.length;
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
    return at;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  out += offsets
    .map((o) => `${String(o).padStart(10, '0')} 00000 n \n`)
    .join('');
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Blob([out], { type: 'application/pdf' });
}

async function call(method, path, role, body) {
  const headers = { 'X-Rol': role };
  if (body && !(body instanceof FormData))
    headers['Content-Type'] = 'application/json';
  const res = await fetch(API + path, {
    method,
    headers,
    body: body instanceof FormData ? body : body && JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

const slug = (s) =>
  s
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .slice(0, 40)
    .replace(/_+$/, '');

const existing = await call('GET', '/arizalar?hajm=1', 'tekshiruvchi');
if (existing.status !== 200)
  throw new Error(`API is not reachable at ${API} (${existing.status})`);
if (existing.data.jami > 0 && !FORCE) {
  console.error(
    `The database already has ${existing.data.jami} applications; run with --force to add the demo set anyway.`,
  );
  process.exit(1);
}

for (const [
  name,
  type,
  soato,
  date,
  decree,
  centre,
  radius,
  outcome,
  reason,
] of APPLICATIONS) {
  const s = slug(name);
  const form = new FormData();
  form.append(
    'data',
    JSON.stringify({
      hujjat_nomi: name,
      hujjat_turi: type,
      soato_kodi: soato,
      tasdiq_sanasi: date,
      tasdiq_hujjati: decree,
      chegara: boundary(centre, radius),
    }),
  );
  form.append(
    'asosiy_chizma',
    pdf(`${name} - Asosiy chizma`, [
      'Masshtab 1:10 000',
      "Funksional zonalar va transport tarmog'i",
    ]),
    `${s}_asosiy_chizma.pdf`,
  );
  form.append(
    'tushuntirish_xati',
    pdf(`${name} - Tushuntirish xati`, [
      'Loyiha maqsadi, hudud tavsifi, aholi soni prognozi',
      'Muhandislik infratuzilmasi',
    ]),
    `${s}_tushuntirish_xati.pdf`,
  );
  form.append(
    'tasdiqlovchi_hujjat',
    pdf(`${name} - Tasdiqlovchi hujjat`, [
      `${decree}, ${date}`,
      'Loyiha tasdiqlansin.',
    ]),
    `${s}_qaror.pdf`,
  );

  const created = await call('POST', '/arizalar', 'ariza_beruvchi', form);
  if (created.status !== 201)
    throw new Error(
      `create "${name}": ${created.status} ${JSON.stringify(created.data)}`,
    );
  const { id } = created.data;

  let note = '';
  if (outcome === 'approve') {
    // the shared sample server sometimes fails; a retry does not create a second feature (see ArcgisService)
    let approved;
    for (let attempt = 0; attempt < 3 && approved?.status !== 200; attempt++)
      approved = await call(
        'POST',
        `/arizalar/${id}/tasdiqlash`,
        'tekshiruvchi',
      );
    if (approved.status !== 200)
      throw new Error(
        `approve "${name}": ${approved.status} ${JSON.stringify(approved.data)}`,
      );
    note = `${approved.data.id_raqam}, objectid ${approved.data.arcgis_object_id}`;
  } else if (outcome === 'return') {
    const returned = await call(
      'POST',
      `/arizalar/${id}/qaytarish`,
      'tekshiruvchi',
      { sabab: reason },
    );
    if (returned.status !== 200)
      throw new Error(
        `return "${name}": ${returned.status} ${JSON.stringify(returned.data)}`,
      );
  }
  console.log(`#${id} ${outcome.padEnd(7)} ${name}${note && ` (${note})`}`);
}
