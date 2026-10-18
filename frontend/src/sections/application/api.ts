import type { ApplicationFormValues } from './form-schema';
import type { PageDto, SoatoDto, StatusDto, ApprovalDto } from './api-contract';

import { CONFIG } from 'src/global-config';

import { getRole } from './role-store';
import {
  toPayload,
  ROLE_HEADER,
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
    readonly fieldErrors?: Record<string, string>
  ) {
    super(message);
  }
}

const BASE_URL = `${CONFIG.serverUrl}/api`;
const NO_CONNECTION = "Server bilan aloqa yo'q";

const toApiError = (status: number, body: unknown) => {
  const { message, fieldErrors } = fromErrorDto(body, status);
  return new ApiError(status, message, fieldErrors);
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(BASE_URL + path, { ...init, headers: { 'X-Rol': ROLE_HEADER[getRole()], ...init?.headers } });
  } catch {
    throw new ApiError(0, NO_CONNECTION);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) throw toApiError(res.status, body);
  return body as T;
}

/** fetch has no upload progress, so multipart requests go through XHR. */
function upload<T>(method: 'POST' | 'PUT', path: string, body: FormData, onProgress?: (percent: number) => void) {
  return new Promise<T>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, BASE_URL + path);
    xhr.setRequestHeader('X-Rol', ROLE_HEADER[getRole()]);
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
