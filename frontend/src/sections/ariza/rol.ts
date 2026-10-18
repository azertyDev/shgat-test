import type { Rol } from './types';

import { useSyncExternalStore } from 'react';

// Soddalashtirilgan rol (X-Rol sarlavhasi). API qatlami hook'siz o'qiy olishi uchun tashqi store.

const KALIT = 'shgat-rol';
const tinglovchilar = new Set<() => void>();
let joriy: Rol = oqi();

function oqi(): Rol {
  try {
    return localStorage.getItem(KALIT) === 'tekshiruvchi' ? 'tekshiruvchi' : 'ariza_beruvchi';
  } catch {
    return 'ariza_beruvchi';
  }
}

export const getRol = () => joriy;

export function setRol(rol: Rol) {
  joriy = rol;
  try {
    localStorage.setItem(KALIT, rol);
  } catch {
    // private rejim: rol faqat shu sessiyada saqlanadi
  }
  tinglovchilar.forEach((f) => f());
}

export const useRol = () =>
  useSyncExternalStore(
    (f) => {
      tinglovchilar.add(f);
      return () => tinglovchilar.delete(f);
    },
    getRol
  );
