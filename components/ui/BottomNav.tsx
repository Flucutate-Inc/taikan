'use client';

import React from 'react';
import { Search, Heart, History } from 'lucide-react';
import type { NavTab } from '@/types';

interface BottomNavProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const navItems: Array<{ id: NavTab; icon: typeof Search; label: string }> = [
    { id: 'search', icon: Search, label: '検索' },
    { id: 'favorites', icon: Heart, label: 'お気に入り' },
    { id: 'history', icon: History, label: '閲覧履歴' },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 pb-[env(safe-area-inset-bottom)] z-40 shadow-[0_-2px_10px_rgba(0,0,0,0.02)]">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex flex-col items-center justify-center w-full space-y-1 ${
              activeTab === item.id ? 'text-teal-500' : 'text-gray-400'
            }`}
          >
            <item.icon size={20} strokeWidth={activeTab === item.id ? 2.5 : 2} />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};


