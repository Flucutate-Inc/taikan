'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Gym } from '@/types';

const STORAGE_KEY = 'taikan_history';
const MAX_ITEMS = 50;

function loadHistory(): Gym[] {
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

function saveHistory(items: Gym[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Failed to save history', e);
  }
}

export function useHistory() {
  const [history, setHistory] = useState<Gym[]>([]);

  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  const add = useCallback((gym: Gym) => {
    setHistory((prev) => {
      const without = prev.filter((g) => g.id !== gym.id);
      const next = [gym, ...without].slice(0, MAX_ITEMS);
      saveHistory(next);
      return next;
    });
  }, []);

  const remove = useCallback((gymId: number) => {
    setHistory((prev) => {
      const next = prev.filter((g) => g.id !== gymId);
      saveHistory(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setHistory([]);
    saveHistory([]);
  }, []);

  return { history, add, remove, clear };
}
