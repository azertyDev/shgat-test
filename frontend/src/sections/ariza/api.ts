import type { Soato, Holat, Royxat, ArizaToliq, RoyxatSorovi } from './types';

import { CONFIG } from 'src/global-config';

import { getRol } from './rol';

// ----------------------------------------------------------------------

/** Backend xato formati: {"xato": "...", "maydonlar": {...}} */
export class ApiXato extends Error {
  constructor(
    readonly status: number,
    xato: string,
    readonly maydonlar?: Record<string, string>
  ) {
    super(xato);
  }
}

const BASE = `${CONFIG.serverUrl}/api`;
const ALOQA_YOQ = "Server bilan aloqa yo'q";

const xatoDan = (status: number, body: unknown) => {
  const b = body as { xato?: string; maydonlar?: Record<string, string> } | null;
  return new ApiXato(status, b?.xato ?? `HTTP ${status}`, b?.maydonlar);
};

async function sorov<T>(yol: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BASE + yol, { ...init, headers: { 'X-Rol': getRol(), ...init?.headers } });
  } catch {
    throw new ApiXato(0, ALOQA_YOQ);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) throw xatoDan(res.status, body);
  return body as T;
}

/** fetch yuklash jarayonini bermaydi, shuning uchun multipart so'rovlar XHR orqali. */
function yuklash<T>(method: 'POST' | 'PUT', yol: string, data: FormData, onProgress?: (foiz: number) => void) {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, BASE + yol);
    xhr.setRequestHeader('X-Rol', getRol());
    xhr.responseType = 'json';
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded * 100) / e.total));
    xhr.onload = () => (xhr.status < 300 ? resolve(xhr.response as T) : reject(xatoDan(xhr.status, xhr.response)));
    xhr.onerror = () => reject(new ApiXato(0, ALOQA_YOQ));
    xhr.send(data);
  });
}

const qs = (q: RoyxatSorovi) =>
  new URLSearchParams(
    Object.entries(q)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => [k, String(v)])
  ).toString();

type Yuborildi = { id: number; holat: Holat };

export const api = {
  royxat: (q: RoyxatSorovi) => sorov<Royxat>(`/arizalar?${qs(q)}`),
  bitta: (id: number) => sorov<ArizaToliq>(`/arizalar/${id}`),
  soato: () => sorov<Soato[]>('/soato'),
  yarat: (data: FormData, onProgress?: (foiz: number) => void) =>
    yuklash<Yuborildi>('POST', '/arizalar', data, onProgress),
  tuzat: (id: number, data: FormData, onProgress?: (foiz: number) => void) =>
    yuklash<Yuborildi>('PUT', `/arizalar/${id}`, data, onProgress),
  tasdiqla: (id: number) =>
    sorov<{ id_raqam: string; arcgis_object_id: number }>(`/arizalar/${id}/tasdiqlash`, { method: 'POST' }),
  qaytar: (id: number, sabab: string) =>
    sorov<Yuborildi>(`/arizalar/${id}/qaytarish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sabab }),
    }),
};

export const faylUrl = (url: string) => CONFIG.serverUrl + url;
