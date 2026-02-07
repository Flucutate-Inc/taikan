'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Gym } from '@/types';

const STORAGE_KEY = 'taikan_favorites';

function loadFavorites(): Gym[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveFavorites(items: Gym[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save favorites', e);
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<Gym[]>([]);

  useEffect(() => {
    setFavorites(loadFavorites());
  }, []);

  const persist = useCallback((next: Gym[]) => {
    setFavorites(next);
    saveFavorites(next);
  }, []);

  const add = useCallback((gym: Gym) => {
    persist((prev) => (prev.some((g) => g.id === gym.id) ? prev : [...prev, gym]));
  }, [persist]);

  const remove = useCallback((gymId: number) => {
    setFavorites((prev) => {
      const next = prev.filter((g) => g.id !== gymId);
      saveFavorites(next);
      return next;
    });
  }, []);

  const toggle = useCallback((gym: Gym) => {
    setFavorites((prev) => {
      const exists = prev.some((g) => g.id === gym.id);
      const next = exists ? prev.filter((g) => g.id !== gym.id) : [...prev, gym];
      saveFavorites(next);
      return next;
    });
  }, []);

  const isFavorite = useCallback((gymId: number) => favorites.some((g) => g.id === gymId), [favorites]);

  return { favorites, add, remove, toggle, isFavorite };
}
