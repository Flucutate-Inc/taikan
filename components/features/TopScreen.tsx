'use client';

import React, { useState } from 'react';
import { Search, MapPin, Calendar as CalendarIcon, Activity } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { SearchField } from '@/components/ui/SearchField';
import { LocationModalContent } from './LocationModalContent';
import { DateModalContent } from './DateModalContent';
import { SportModalContent } from './SportModalContent';
import type { ModalType, SearchConditions } from '@/types';

interface TopScreenProps {
  onSearch: (conditions: SearchConditions) => void;
}

export const TopScreen: React.FC<TopScreenProps> = ({ onSearch }) => {
  const [modalState, setModalState] = useState<{ type: ModalType; isOpen: boolean }>({ 
    type: null, 
    isOpen: false 
  });
  const [conditions, setConditions] = useState({ area: '', date: '', sport: '' });
  const [keyword, setKeyword] = useState('');

  const openModal = (type: Exclude<ModalType, null>) => setModalState({ type, isOpen: true });
  const closeModal = () => setModalState({ ...modalState, isOpen: false });

  const handleSelect = (value: string) => {
    if (modalState.type) {
      setConditions(prev => ({ ...prev, [modalState.type as string]: value }));
    }
    closeModal();
  };

  const handleSelectLocation = (lat: number, lng: number) => {
    setConditions(prev => ({ ...prev, area: '現在地周辺' }));
    // 位置情報を検索条件に含める（検索時に使用）
    const searchConditions: SearchConditions = {
      ...(conditions.date && { date: conditions.date }),
      ...(conditions.sport && { sport: conditions.sport }),
      ...(keyword && { keyword }),
      lat,
      lng,
    };
    onSearch(searchConditions);
    closeModal();
  };

  const handleSportSelect = (value: string) => {
    setConditions(prev => ({ ...prev, sport: value }));
    closeModal();
  };

  const handleSearch = () => {
    console.log('🔍 Search button clicked', { conditions, keyword });
    const searchConditions: SearchConditions = {
      ...(conditions.area && { area: conditions.area }),
      ...(conditions.date && { date: conditions.date }),
      ...(conditions.sport && { sport: conditions.sport }),
      ...(keyword && { keyword }),
    };
    console.log('🔍 Search conditions:', searchConditions);
    console.log('🔍 onSearch function:', typeof onSearch);
    if (typeof onSearch === 'function') {
      onSearch(searchConditions);
    } else {
      console.error('❌ onSearch is not a function:', onSearch);
    }
  };

  const hasConditions = conditions.area || conditions.date || conditions.sport;

  return (
    <div className="pt-8 px-6 pb-32 min-h-screen bg-gray-50">
      <div className="flex flex-col space-y-8">
        <div>
           <h1 className="text-2xl font-extrabold text-gray-800 leading-tight">
             さあ、<br/>
             いい汗をかこう。
           </h1>
           <p className="text-sm text-gray-500 mt-2">
             個人開放の体育館をスマートに検索
           </p>
        </div>
        <div>
            <p className="text-xs font-bold text-gray-500 mb-2">キーワードから探す</p>
            <input
                type="text"
                placeholder="体育館名・競技名など"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
        </div>
        <div>
            <div className="flex justify-between items-baseline mb-2">
                <p className="text-xs font-bold text-gray-500">条件を指定して探す</p>
                {hasConditions && <p className="text-xs font-bold text-teal-500">3件の条件</p>}
            </div>
            <div className="flex flex-col space-y-3">
                <SearchField
                    placeholder="エリア・駅・現在地"
                    value={conditions.area}
                    icon={MapPin}
                    onClick={() => openModal('area')}
                />
                <SearchField
                    placeholder="日時 (今月・来月)"
                    value={conditions.date}
                    icon={CalendarIcon}
                    onClick={() => openModal('date')}
                />
                <SearchField
                    placeholder="競技 (複数選択可)"
                    value={conditions.sport}
                    icon={Activity}
                    onClick={() => openModal('sport')}
                />
            </div>
        </div>
        <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleSearch();
            }}
            className="w-full h-[60px] bg-teal-500 text-white rounded-2xl text-lg font-bold shadow-lg hover:bg-teal-600 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center cursor-pointer relative z-50"
        >
            検索
        </button>
      </div>
      <Modal 
        isOpen={modalState.isOpen && modalState.type === 'area'} 
        onClose={closeModal} 
        title="エリアを選択"
      >
        <LocationModalContent 
          onSelect={handleSelect} 
          onSelectLocation={handleSelectLocation}
          initialValue={conditions.area} 
        />
      </Modal>
      <Modal 
        isOpen={modalState.isOpen && modalState.type === 'date'} 
        onClose={closeModal} 
        title="日時を選択"
      >
        <DateModalContent onSelect={handleSelect} initialValue={conditions.date} />
      </Modal>
      <Modal 
        isOpen={modalState.isOpen && modalState.type === 'sport'} 
        onClose={closeModal} 
        title="競技を選択"
        fixedHeight={false}
      >
        <SportModalContent onSelect={handleSportSelect} initialValue={conditions.sport} />
      </Modal>
    </div>
  );
};
