import type { ApplicationFormValues } from './form-schema';
import type { PageDto, SoatoDto, StatusDto, ApprovalDto, ApiErrorCode } from './api-contract';

import { CONFIG } from 'src/global-config';

import { hasToken, authHeaders, refreshToken } from './role-store';
import {
  toPayload,
  fromPageDto,
  fromSoatoDto,
  toListParams,
  toReturnBody,
  fromErrorDto,
  fromStatusDto,
  fromDetailsDto,
  fromApprovalDto,
} from './api-contract';

// ----------------------------------------------------------------------

/** Backend error with the message and per-field errors (keyed by form field names). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly fieldErrors?: Record<string, string>,
    readonly code?: ApiErrorCode
  ) {
    super(message);
  }
}

const BASE_URL = `${CONFIG.serverUrl}/api`;
const NO_CONNECTION = "Server bilan aloqa yo'q";

const toApiError = (status: number, body: unknown) => {
  const { message, fieldErrors, code } = fromErrorDto(body, status);
  return new ApiError(status, message, fieldErrors, code);
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const send = () => fetch(BASE_URL + path, { ...init, headers: { ...authHeaders(), ...init?.headers } });
  let res: Response;
  try {
    res = await send();
    // expired token: get a fresh one and retry once
    if (res.status === 401 && hasToken()) {
      await refreshToken();
      res = await send();
    }
  } catch {
    throw new ApiError(0, NO_CONNECTION);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) throw toApiError(res.status, body);
  return body as T;
}

/** fetch has no upload progress, so multipart requests go through XHR. Retries once on an expired token. */
async function upload<T>(method: 'POST' | 'PUT', path: string, body: FormData, onProgress?: (percent: number) => void) {
  try {
    return await uploadOnce<T>(method, path, body, onProgress);
  } catch (e) {
    if (!(e instanceof ApiError && e.status === 401 && hasToken())) throw e;
    await refreshToken();
    return uploadOnce<T>(method, path, body, onProgress);
  }
}

function uploadOnce<T>(method: 'POST' | 'PUT', path: string, body: FormData, onProgress?: (percent: number) => void) {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, BASE_URL + path);
    Object.entries(authHeaders()).forEach(([name, value]) => xhr.setRequestHeader(name, value));
    xhr.responseType = 'json';
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded * 100) / e.total));
    xhr.onload = () => (xhr.status < 300 ? resolve(xhr.response as T) : reject(toApiError(xhr.status, xhr.response)));
    xhr.onerror = () => reject(new ApiError(0, NO_CONNECTION));
    xhr.send(body);
  });
}

type OnProgress = (percent: number) => void;

export const api = {
  list: (q: Parameters<typeof toListParams>[0]) =>
    request<PageDto>(`/arizalar?${toListParams(q)}`).then(fromPageDto),
  get: (id: number) => request<Parameters<typeof fromDetailsDto>[0]>(`/arizalar/${id}`).then(fromDetailsDto),
  soato: () => request<SoatoDto[]>('/soato').then(fromSoatoDto),
  create: (values: ApplicationFormValues, onProgress?: OnProgress) =>
    upload<StatusDto>('POST', '/arizalar', toPayload(values), onProgress).then(fromStatusDto),
  resubmit: (id: number, values: ApplicationFormValues, onProgress?: OnProgress) =>
    upload<StatusDto>('PUT', `/arizalar/${id}`, toPayload(values), onProgress).then(fromStatusDto),
  approve: (id: number) =>
    request<ApprovalDto>(`/arizalar/${id}/tasdiqlash`, { method: 'POST' }).then(fromApprovalDto),
  returnToApplicant: (id: number, reason: string) =>
    request<StatusDto>(`/arizalar/${id}/qaytarish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: toReturnBody(reason),
    }).then(fromStatusDto),
};

export const fileUrl = (url: string) => CONFIG.serverUrl + url;
