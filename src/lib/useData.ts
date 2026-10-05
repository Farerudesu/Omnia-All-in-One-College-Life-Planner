import { useSyncExternalStore, useCallback, useRef } from 'react';
import * as ds from './dataService';

function isShallowEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || a === null || typeof b !== 'object' || b === null) {
    return false;
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!Object.is(a[i], b[i])) return false;
    }
    return true;
  }
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key) || !Object.is((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])) {
      return false;
    }
  }
  return true;
}

/**
 * React hook that re-renders whenever the data service notifies.
 * selector: a function that reads from the data service.
 * Resilient against non-primitive snapshots and computed returns by memoizing shallow equality.
 */
export function useData<T>(selector: () => T): T {
  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  const cacheRef = useRef<{ value: T; hasValue: boolean }>({ value: undefined as unknown as T, hasValue: false });

  const subscribe = useCallback(
    (onStoreChange: () => void) => ds.subscribe(onStoreChange),
    []
  );

  const getSnapshot = useCallback(() => {
    const nextValue = selectorRef.current();
    if (cacheRef.current.hasValue) {
      if (isShallowEqual(cacheRef.current.value, nextValue)) {
        return cacheRef.current.value;
      }
    }
    cacheRef.current = { value: nextValue, hasValue: true };
    return nextValue;
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function useDataStatus() {
  const subscribe = useCallback(
    (onStoreChange: () => void) => ds.subscribe(onStoreChange),
    []
  );
  return useSyncExternalStore(subscribe, ds.getDataStatus, ds.getDataStatus);
}
