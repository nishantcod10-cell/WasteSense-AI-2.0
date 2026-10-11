import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook to safely store and synchronize state with localStorage.
 * Handles JSON serialization, window storage events, and error recovery.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // Read initial stored value or use provided initialValue
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      if (item === null) {
        return initialValue;
      }
      return JSON.parse(item) as T;
    } catch (error) {
      console.warn(`[useLocalStorage] Error reading key "${key}":`, error);
      return initialValue;
    }
  });

  // Setter function supporting functional updates
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        setStoredValue((currentValue) => {
          const valueToStore = value instanceof Function ? value(currentValue) : value;
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
            // Dispatch custom event for same-tab updates across hook instances
            window.dispatchEvent(
              new CustomEvent('local-storage-sync', {
                detail: { key, newValue: valueToStore },
              })
            );
          }
          return valueToStore;
        });
      } catch (error) {
        console.error(`[useLocalStorage] Error setting key "${key}":`, error);
      }
    },
    [key]
  );

  // Sync across storage events and custom internal events
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent | CustomEvent) => {
      if ('key' in event && event.key !== null) {
        if (event.key === key) {
          try {
            setStoredValue(event.newValue ? JSON.parse(event.newValue) : initialValue);
          } catch {
            setStoredValue(initialValue);
          }
        }
      } else if ('detail' in event && event.detail?.key === key) {
        setStoredValue(event.detail.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange as EventListener);
    window.addEventListener('local-storage-sync', handleStorageChange as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange as EventListener);
      window.removeEventListener('local-storage-sync', handleStorageChange as EventListener);
    };
  }, [key, initialValue]);

  return [storedValue, setValue];
}

export default useLocalStorage;
