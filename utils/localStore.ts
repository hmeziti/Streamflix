import { useSyncExternalStore } from 'react';

/** Valeur persistée en localStorage, partagée et réactive entre composants. */
export const createLocalStore = <T>(key: string, fallback: T) => {
  const listeners = new Set<() => void>();
  let cache: T | undefined;

  const get = (): T => {
    if (cache === undefined) {
      try {
        const raw = window.localStorage.getItem(key);
        cache = raw ? (JSON.parse(raw) as T) : fallback;
      } catch {
        cache = fallback;
      }
    }
    return cache;
  };

  const set = (value: T): void => {
    cache = value;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore storage quota / privacy mode errors
    }
    listeners.forEach((listener) => listener());
  };

  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  const useValue = (): T => useSyncExternalStore(subscribe, get, () => fallback);

  return { get, set, useValue };
};
