import type { Role } from './types';

import { useSyncExternalStore } from 'react';

// Simplified role (X-Rol header). An external store, so the API layer can read it without hooks.

const STORAGE_KEY = 'shgat-role';
const listeners = new Set<() => void>();
let current: Role = readStoredRole();

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
}

export const useRole = () =>
  useSyncExternalStore(
    (notify) => {
      listeners.add(notify);
      return () => listeners.delete(notify);
    },
    getRole
  );
