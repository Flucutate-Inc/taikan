'use client';

import React from 'react';
import { MapPin, Heart } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { Gym } from '@/types';

interface GymCardProps {
  data: Gym;
  onClick: () => void;
  /** お気に入りボタンを表示するか */
  showFavoriteButton?: boolean;
  /** お気に入り登録済みか */
  isFavorite?: boolean;
  /** お気に入りトグル（ハート押下時。showFavoriteButton 時は必須） */
  onToggleFavorite?: (e: React.MouseEvent) => void;
}

export const GymCard: React.FC<GymCardProps> = ({ data, onClick, showFavoriteButton, isFavorite, onToggleFavorite }) => (
  <div
    className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 mb-4 cursor-pointer transition-transform active:scale-[0.98]"
    onClick={onClick}
  >
    {/* Header Info */}
    <div className="p-4 pb-2 flex justify-between items-start">
      <div className="flex flex-col items-start space-y-1 max-w-[70%]">
        <Badge color="teal">個人開放あり</Badge>
        <h3 className="text-base font-bold text-gray-900 leading-tight line-clamp-1">{data.name}</h3>
        <div className="flex items-center space-x-1 text-gray-500">
          <MapPin size={12} />
          <span className="text-xs">{data.distance}</span>
        </div>
      </div>
      <div className="flex flex-col items-end space-y-1 gap-1">
        {showFavoriteButton && onToggleFavorite && (
          <button
            type="button"
            onClick={onToggleFavorite}
            className="p-2 -m-2 rounded-full hover:bg-gray-100 transition-colors touch-manipulation"
            aria-label={isFavorite ? 'お気に入りを解除' : 'お気に入りに追加'}
          >
            <Heart
              size={22}
              className={isFavorite ? 'text-red-500 fill-red-500' : 'text-gray-400'}
              fill={isFavorite ? 'currentColor' : 'none'}
            />
          </button>
        )}
        {data.courts.badminton && <Badge color="orange" variant="outline">バド {data.courts.badminton}面</Badge>}
        {data.courts.tableTennis && <Badge color="blue" variant="outline">卓球 {data.courts.tableTennis}台</Badge>}
      </div>
    </div>
    {/* Scrollable Schedule */}
    {(data as any).schedule && (data as any).schedule.length > 0 && (
      <div className="px-4 py-2 bg-gray-50">
        <p className="text-[10px] text-gray-500 mb-1">本日の空き状況 (横スクロール)</p>
        <div className="flex overflow-x-auto gap-2 pb-2 no-scrollbar">
          {((data as any).schedule as Array<{ time: string; status: string; status_code: string }>).map((slot, idx) => (
            <div
              key={idx}
              className={`flex flex-col items-center justify-center min-w-[50px] py-2 rounded-lg border ${
                slot.status === '×' ? 'bg-gray-200 border-transparent opacity-60' : 'bg-white border-gray-200'
              }`}
            >
              <span className="text-[10px] font-bold text-gray-600 mb-1">{slot.time}</span>
              <span className={`text-lg font-bold ${
                slot.status === '○' ? 'text-teal-500' : slot.status === '△' ? 'text-orange-400' : 'text-gray-400'
              }`}>
                {slot.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    )}
    {/* Tags */}
    <div className="p-4 pt-2 flex flex-wrap gap-2 overflow-hidden">
      {data.tags.map(tag => (
        <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
          #{tag}
        </span>
      ))}
    </div>
  </div>
);


