import type { Role } from './types';

import { useSyncExternalStore } from 'react';

import { CONFIG } from 'src/global-config';

import { ROLE_HEADER, toTokenRequest } from './api-contract';

// Current role and its tokens. An external store, so the API layer can read it without hooks.
// With a token the API gets `Authorization: Bearer`; without one (backend unreachable, token request
// failed) it falls back to the X-Rol header of the task spec.
// Tokens are kept per role in localStorage, so a reload or switching roles back does not ask for a new
// one while it is still valid. They carry only a role (no password), so storing them is no extra risk.

const STORAGE_KEY = 'shgat-role';
const TOKENS_KEY = 'shgat-tokens';
/** a token that expires sooner than this is replaced before use */
const RENEW_BEFORE_MS = 60_000;

const listeners = new Set<() => void>();
let current: Role = readStoredRole();
let tokens: Partial<Record<Role, string>> = readStoredTokens();

function readStoredRole(): Role {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'REVIEWER' ? 'REVIEWER' : 'APPLICANT';
  } catch {
    return 'APPLICANT';
  }
}

function readStoredTokens(): Partial<Record<Role, string>> {
  try {
    return JSON.parse(localStorage.getItem(TOKENS_KEY) ?? '{}') ?? {};
  } catch {
    return {};
  }
}

function saveTokens(next: Partial<Record<Role, string>>) {
  tokens = next;
  try {
    localStorage.setItem(TOKENS_KEY, JSON.stringify(next));
  } catch {
    // private mode: tokens live for this session only
  }
}

/** `exp` of a JWT in ms; 0 when the token cannot be read (then it is never used). */
export function tokenExpiry(jwt: string): number {
  try {
    const payload = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const exp = (JSON.parse(atob(payload)) as { exp?: unknown }).exp;
    return typeof exp === 'number' ? exp * 1000 : 0;
  } catch {
    return 0;
  }
}

/** Token of the role if it is valid for at least `marginMs` more. */
function validToken(role: Role, marginMs = 0): string | undefined {
  const value = tokens[role];
  return value && tokenExpiry(value) - Date.now() > marginMs ? value : undefined;
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
  void ensureToken(role);
}

/** Asks for a token only when the role has none or it is about to expire (start-up, role switch). */
export async function ensureToken(role: Role = current): Promise<void> {
  if (!validToken(role, RENEW_BEFORE_MS)) await refreshToken(role);
}

/** Requests a new token for the role (also after a 401). A token for a role that is no longer current is still kept. */
export async function refreshToken(role: Role = current): Promise<void> {
  try {
    const res = await fetch(`${CONFIG.serverUrl}/api/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: toTokenRequest(role),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { token: value } = (await res.json()) as { token: string };
    saveTokens({ ...tokens, [role]: value });
  } catch {
    const rest = { ...tokens };
    delete rest[role];
    saveTokens(rest);
  }
}

export const hasToken = () => !!validToken(current);

/** Auth headers for the current role: its token if it is still valid, otherwise X-Rol. */
export function authHeaders(): Record<string, string> {
  const value = validToken(current);
  return value ? { Authorization: `Bearer ${value}` } : { 'X-Rol': ROLE_HEADER[current] };
}

export const useRole = () =>
  useSyncExternalStore(
    (notify) => {
      listeners.add(notify);
      return () => listeners.delete(notify);
    },
    getRole
  );
