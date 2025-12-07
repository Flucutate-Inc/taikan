'use client';

import React, { useState } from 'react';
import { BottomNav } from '@/components/ui/BottomNav';
import { TopScreen } from '@/components/features/TopScreen';
import { ListScreen } from '@/components/features/ListScreen';
import { DetailScreen } from '@/components/features/DetailScreen';
import type { PageType, NavTab, Gym } from '@/types';

export default function Home() {
  const [currentPage, setCurrentPage] = useState<PageType>('top');
  const [activeTab, setActiveTab] = useState<NavTab>('search');
  const [selectedGym, setSelectedGym] = useState<Gym | null>(null);

  const handleSelectGym = (gym: Gym) => {
      setSelectedGym(gym);
      setCurrentPage('detail');
  };

  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen relative font-sans text-gray-900">
      {/* Screen Routing */}
      {currentPage === 'top' && (
        <TopScreen onSearch={() => setCurrentPage('list')} />
      )}
      {currentPage === 'list' && (
        <ListScreen 
            onBack={() => setCurrentPage('top')} 
            onSelectGym={handleSelectGym}
        />
      )}
      {currentPage === 'detail' && selectedGym && (
        <DetailScreen 
            gym={selectedGym} 
            onBack={() => setCurrentPage('list')} 
        />
      )}
      {/* Footer Navigation (Persists) */}
      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}

