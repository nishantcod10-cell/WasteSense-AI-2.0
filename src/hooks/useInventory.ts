import { useState, useCallback, useEffect } from 'react';
import { InventoryItem } from '../types';
import { storage } from '../services/storage';

export interface UseInventoryReturn {
  items: InventoryItem[];
  loading: boolean;
  addItem: (item: Omit<InventoryItem, 'id' | 'lastUpdated'> & { id?: string }) => InventoryItem;
  updateItem: (id: string, updates: Partial<InventoryItem>) => boolean;
  deleteItem: (id: string) => boolean;
  importItems: (newItems: InventoryItem[], mode?: 'append' | 'replace') => void;
  resetToDemo: () => void;
  refresh: () => void;
}

export function useInventory(): UseInventoryReturn {
  const [items, setItems] = useState<InventoryItem[]>(() => storage.getInventory());
  const [loading, setLoading] = useState<boolean>(false);

  // Synchronize state from storage
  const refresh = useCallback(() => {
    setLoading(true);
    try {
      const stored = storage.getInventory();
      setItems(stored);
    } finally {
      setLoading(false);
    }
  }, []);

  // Listen to window storage events if modified elsewhere
  useEffect(() => {
    const handleStorageChange = () => {
      const stored = storage.getInventory();
      setItems(stored);
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const addItem = useCallback(
    (itemData: Omit<InventoryItem, 'id' | 'lastUpdated'> & { id?: string }): InventoryItem => {
      const newItem: InventoryItem = {
        ...itemData,
        id: itemData.id || `prod-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        lastUpdated: new Date().toISOString(),
      };

      setItems((prev) => {
        const next = [newItem, ...prev];
        storage.setInventory(next);
        return next;
      });

      return newItem;
    },
    []
  );

  const updateItem = useCallback((id: string, updates: Partial<InventoryItem>): boolean => {
    let found = false;
    setItems((prev) => {
      const index = prev.findIndex((item) => item.id === id);
      if (index === -1) return prev;

      found = true;
      const updatedList = [...prev];
      updatedList[index] = {
        ...updatedList[index],
        ...updates,
        lastUpdated: new Date().toISOString(),
      };
      storage.setInventory(updatedList);
      return updatedList;
    });
    return found;
  }, []);

  const deleteItem = useCallback((id: string): boolean => {
    let found = false;
    setItems((prev) => {
      const next = prev.filter((item) => {
        if (item.id === id) {
          found = true;
          return false;
        }
        return true;
      });
      if (found) {
        storage.setInventory(next);
      }
      return next;
    });
    return found;
  }, []);

  const importItems = useCallback(
    (newItems: InventoryItem[], mode: 'append' | 'replace' = 'append') => {
      setItems((prev) => {
        const next = mode === 'replace' ? newItems : [...newItems, ...prev];
        storage.setInventory(next);
        return next;
      });
    },
    []
  );

  const resetToDemo = useCallback(() => {
    storage.resetToDemo();
    const demoItems = storage.getInventory();
    setItems(demoItems);
  }, []);

  return {
    items,
    loading,
    addItem,
    updateItem,
    deleteItem,
    importItems,
    resetToDemo,
    refresh,
  };
}

export default useInventory;
