'use client';

import React from 'react';
import { History } from 'lucide-react';
import { GymCard } from './GymCard';
import { useHistory } from '@/hooks/useHistory';
import { useFavorites } from '@/hooks/useFavorites';
import type { Gym } from '@/types';

interface HistoryScreenProps {
  onSelectGym: (gym: Gym) => void;
}

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ onSelectGym }) => {
  const { history, remove, clear } = useHistory();
  const { isFavorite, toggle } = useFavorites();

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-800">閲覧履歴</h2>
            <p className="text-xs text-gray-500 mt-1">{history.length}件</p>
          </div>
          {history.length > 0 && (
            <button
              type="button"
              onClick={clear}
              className="text-xs font-medium text-gray-500 hover:text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-100 transition-colors"
            >
              履歴をクリア
            </button>
          )}
        </div>
      </div>
      <div className="px-4 pt-4">
        {history.length > 0 ? (
          <div className="flex flex-col">
            <p className="text-xs text-gray-500 mb-3 ml-1">閲覧した体育館（新しい順）</p>
            {history.map((gym) => (
              <GymCard
                key={gym.id}
                data={gym}
                onClick={() => onSelectGym(gym)}
                showFavoriteButton
                isFavorite={isFavorite(gym.id)}
                onToggleFavorite={(e) => {
                  e.stopPropagation();
                  toggle(gym);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <History size={28} className="text-gray-400" />
            </div>
            <p className="text-gray-600 font-medium mb-1">閲覧履歴はまだありません</p>
            <p className="text-sm text-gray-500 max-w-[260px]">
              検索結果から体育館の詳細を開くと、ここに履歴として表示されます。
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
