'use client';

import React, { useState } from 'react';
import { Search, MapPin, Calendar as CalendarIcon, Activity } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { SearchField } from '@/components/ui/SearchField';
import { LocationModalContent } from './LocationModalContent';
import { DateModalContent } from './DateModalContent';
import { SportModalContent } from './SportModalContent';
import type { ModalType } from '@/types';

interface TopScreenProps {
  onSearch: () => void;
}

export const TopScreen: React.FC<TopScreenProps> = ({ onSearch }) => {
  const [modalState, setModalState] = useState<{ type: ModalType; isOpen: boolean }>({ 
    type: null, 
    isOpen: false 
  });
  const [conditions, setConditions] = useState({ area: '', date: '', sport: '' });

  const openModal = (type: Exclude<ModalType, null>) => setModalState({ type, isOpen: true });
  const closeModal = () => setModalState({ ...modalState, isOpen: false });

  const handleSelect = (value: string) => {
    if (modalState.type) {
      setConditions(prev => ({ ...prev, [modalState.type as string]: value }));
    }
    closeModal();
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
            <SearchField
                placeholder="体育館名・競技名など"
                icon={Search}
                isReadOnly={false}
                onClick={() => {}}
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
            onClick={onSearch}
            className="w-full h-[60px] bg-teal-500 text-white rounded-2xl text-lg font-bold shadow-lg hover:bg-teal-600 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center"
        >
            検索 {hasConditions ? '(20件)' : ''}
        </button>
      </div>
      <Modal 
        isOpen={modalState.isOpen && modalState.type === 'area'} 
        onClose={closeModal} 
        title="エリアを選択"
      >
        <LocationModalContent onSelect={handleSelect} />
      </Modal>
      <Modal 
        isOpen={modalState.isOpen && modalState.type === 'date'} 
        onClose={closeModal} 
        title="日時を選択"
      >
        <DateModalContent onSelect={handleSelect} />
      </Modal>
      <Modal 
        isOpen={modalState.isOpen && modalState.type === 'sport'} 
        onClose={closeModal} 
        title="競技を選択"
      >
        <SportModalContent onSelect={handleSelect} />
      </Modal>
    </div>
  );
};

