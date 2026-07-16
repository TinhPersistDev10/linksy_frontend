// src/lib/utils/storage.ts
// Centralize tất cả localStorage/sessionStorage operations ở đây
// Giúp dễ dàng thay đổi storage strategy sau này (ví dụ: đổi sang IndexedDB)

const USER_KEY = 'auth_user';

export const storage = {
  getUser: <T>(): T | null => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = sessionStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  },

  setUser: <T>(user: T): void => {
    if (typeof window === 'undefined') return;
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  removeUser: (): void => {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(USER_KEY);
  },

  clear: (): void => {
    if (typeof window === 'undefined') return;
    sessionStorage.clear();
  },
};