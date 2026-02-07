'use client';

import React, { useState, useEffect } from 'react';
import { BottomNav } from '@/components/ui/BottomNav';
import { TopScreen } from '@/components/features/TopScreen';
import { ListScreen } from '@/components/features/ListScreen';
import { DetailScreen } from '@/components/features/DetailScreen';
import { FavoritesScreen } from '@/components/features/FavoritesScreen';
import { HistoryScreen } from '@/components/features/HistoryScreen';
import { RegisterScreen } from '@/components/features/RegisterScreen';
import { useHistory } from '@/hooks/useHistory';
import type { PageType, NavTab, Gym, SearchConditions } from '@/types';

type DetailReturnTo = 'list' | 'favorites' | 'history';

export default function Home() {
  const [currentPage, setCurrentPage] = useState<PageType>('top');
  const [activeTab, setActiveTab] = useState<NavTab>('search');
  const [selectedGym, setSelectedGym] = useState<Gym | null>(null);
  const [searchConditions, setSearchConditions] = useState<SearchConditions>({});
  const [detailReturnTo, setDetailReturnTo] = useState<DetailReturnTo>('list');
  const { add: addToHistory } = useHistory();

  useEffect(() => {
    if (activeTab === 'favorites') setCurrentPage('favorites');
    if (activeTab === 'history') setCurrentPage('history');
    if (activeTab === 'register') setCurrentPage('register');
    if (activeTab === 'search') setCurrentPage('top');
  }, [activeTab]);

  const handleSearch = (conditions: SearchConditions) => {
    setSearchConditions(conditions);
    setCurrentPage('list');
  };

  const handleSelectGymFromList = (gym: Gym) => {
    addToHistory(gym);
    setDetailReturnTo('list');
    setSelectedGym(gym);
    setCurrentPage('detail');
  };

  const handleSelectGymFromFavorites = (gym: Gym) => {
    setDetailReturnTo('favorites');
    setSelectedGym(gym);
    setCurrentPage('detail');
  };

  const handleSelectGymFromHistory = (gym: Gym) => {
    addToHistory(gym);
    setDetailReturnTo('history');
    setSelectedGym(gym);
    setCurrentPage('detail');
  };

  const handleBackFromDetail = () => setCurrentPage(detailReturnTo);

  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen relative font-sans text-gray-900">
      {/* Search tab: Top / List / Detail */}
      {activeTab === 'search' && currentPage === 'top' && (
        <TopScreen onSearch={handleSearch} />
      )}
      {activeTab === 'search' && currentPage === 'list' && (
        <ListScreen
          onBack={() => setCurrentPage('top')}
          onSelectGym={handleSelectGymFromList}
          searchConditions={searchConditions}
          onRemoveCondition={(key) => {
            setSearchConditions((prev) => {
              const updated = { ...prev };
              delete updated[key];
              return updated;
            });
          }}
        />
      )}
      {activeTab === 'search' && currentPage === 'detail' && selectedGym && (
        <DetailScreen gym={selectedGym} onBack={handleBackFromDetail} />
      )}

      {/* Favorites tab: Favorites list / Detail */}
      {activeTab === 'favorites' && currentPage === 'favorites' && (
        <FavoritesScreen onSelectGym={handleSelectGymFromFavorites} />
      )}
      {activeTab === 'favorites' && currentPage === 'detail' && selectedGym && (
        <DetailScreen gym={selectedGym} onBack={handleBackFromDetail} />
      )}

      {/* History tab: History list / Detail */}
      {activeTab === 'history' && currentPage === 'history' && (
        <HistoryScreen onSelectGym={handleSelectGymFromHistory} />
      )}
      {activeTab === 'history' && currentPage === 'detail' && selectedGym && (
        <DetailScreen gym={selectedGym} onBack={handleBackFromDetail} />
      )}

      {/* Register tab */}
      {activeTab === 'register' && <RegisterScreen />}

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
