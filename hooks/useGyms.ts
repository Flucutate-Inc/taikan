'use client';

import { useState, useEffect } from 'react';
import { searchGyms } from '@/lib/firebase/api';
import type { Gym, SearchConditions } from '@/types';

export function useGyms(conditions?: SearchConditions) {
  const [gyms, setGyms] = useState<Gym[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!conditions) return;

    const fetchGyms = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await searchGyms(conditions);
        setGyms(result.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : '施設の取得に失敗しました');
      } finally {
        setLoading(false);
      }
    };

    fetchGyms();
  }, [conditions]);

  return { gyms, loading, error };
}

