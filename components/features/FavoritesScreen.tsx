'use client';

import React from 'react';
import { Heart } from 'lucide-react';
import { GymCard } from './GymCard';
import { useFavorites } from '@/hooks/useFavorites';
import type { Gym } from '@/types';

interface FavoritesScreenProps {
  onSelectGym: (gym: Gym) => void;
}

export const FavoritesScreen: React.FC<FavoritesScreenProps> = ({ onSelectGym }) => {
  const { favorites, remove, isFavorite } = useFavorites();

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-4">
        <h2 className="text-lg font-bold text-gray-800">お気に入り</h2>
        <p className="text-xs text-gray-500 mt-1">{favorites.length}件</p>
      </div>
      <div className="px-4 pt-4">
        {favorites.length > 0 ? (
          <div className="flex flex-col">
            <p className="text-xs text-gray-500 mb-3 ml-1">登録した体育館</p>
            {favorites.map((gym) => (
              <GymCard
                key={gym.id}
                data={gym}
                onClick={() => onSelectGym(gym)}
                isFavorite={true}
                onToggleFavorite={(e) => {
                  e.stopPropagation();
                  remove(gym.id);
                }}
                showFavoriteButton
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Heart size={28} className="text-gray-400" />
            </div>
            <p className="text-gray-600 font-medium mb-1">お気に入りはまだありません</p>
            <p className="text-sm text-gray-500 max-w-[260px]">
              検索結果の体育館からハートマークをタップして登録すると、ここに一覧で表示されます。
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
