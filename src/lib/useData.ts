import { useSyncExternalStore, useCallback } from 'react';
import * as ds from './dataService';

/**
 * React hook that re-renders whenever the data service notifies.
 * selector: a function that reads from the data service.
 */
export function useData<T>(selector: () => T): T {
  const subscribe = useCallback(
    (onStoreChange: () => void) => ds.subscribe(onStoreChange),
    []
  );
  return useSyncExternalStore(subscribe, selector, selector);
}

export function useDataStatus() {
  const subscribe = useCallback(
    (onStoreChange: () => void) => ds.subscribe(onStoreChange),
    []
  );
  return useSyncExternalStore(subscribe, ds.getDataStatus, ds.getDataStatus);
}
