import type { Role } from './types';

import { useSyncExternalStore } from 'react';

import { CONFIG } from 'src/global-config';

import { ROLE_HEADER, toTokenRequest } from './api-contract';

// Current role and its token. An external store, so the API layer can read it without hooks.
// With a token the API gets `Authorization: Bearer`; without one (backend unreachable, token request
// failed) it falls back to the X-Rol header of the task spec.

const STORAGE_KEY = 'shgat-role';
const listeners = new Set<() => void>();
let current: Role = readStoredRole();
let token: { role: Role; value: string } | null = null;

function readStoredRole(): Role {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'REVIEWER' ? 'REVIEWER' : 'APPLICANT';
  } catch {
    return 'APPLICANT';
  }
}

export const getRole = () => current;

export function setRole(role: Role) {
  current = role;
  try {
    localStorage.setItem(STORAGE_KEY, role);
  } catch {
    // private mode: the role lives for this session only
  }
  listeners.forEach((notify) => notify());
  void refreshToken(role);
}

/** Requests a token for the role. A token that arrives after the role changed again is ignored. */
export async function refreshToken(role: Role = current): Promise<void> {
  try {
    const res = await fetch(`${CONFIG.serverUrl}/api/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: toTokenRequest(role),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { token: value } = (await res.json()) as { token: string };
    if (role === current) token = { role, value };
  } catch {
    if (role === current) token = null;
  }
}

export const hasToken = () => token?.role === current;

/** Auth headers for the current role: the token if we have one for it, otherwise X-Rol. */
export function authHeaders(): Record<string, string> {
  return token && token.role === current
    ? { Authorization: `Bearer ${token.value}` }
    : { 'X-Rol': ROLE_HEADER[current] };
}

export const useRole = () =>
  useSyncExternalStore(
    (notify) => {
      listeners.add(notify);
      return () => listeners.delete(notify);
    },
    getRole
  );
