'use client';

import React, { useState } from 'react';
import { Activity, Check } from 'lucide-react';

interface SportModalContentProps {
  onSelect: (value: string) => void;
  initialValue?: string;
}

const SPORTS = ['バドミントン', '卓球', 'バスケットボール', 'バレーボール', 'フットサル', 'プール'];

export const SportModalContent: React.FC<SportModalContentProps> = ({ onSelect, initialValue = '' }) => {
  const [selectedSports, setSelectedSports] = useState<string[]>(
    initialValue ? initialValue.split(',').map(s => s.trim()) : []
  );

  const toggleSport = (sport: string) => {
    setSelectedSports(prev => 
      prev.includes(sport) 
        ? prev.filter(s => s !== sport)
        : [...prev, sport]
    );
  };

  const handleConfirm = () => {
    onSelect(selectedSports.join(', '));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {SPORTS.map(sport => {
          const isSelected = selectedSports.includes(sport);
          return (
            <button
              key={sport}
              onClick={() => toggleSport(sport)}
              className={`flex items-center justify-between px-4 py-4 border rounded-xl transition-all text-left ${
                isSelected 
                  ? 'border-teal-500 bg-teal-50' 
                  : 'border-gray-200 hover:border-teal-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center">
                <Activity size={18} className={`mr-2 ${isSelected ? 'text-teal-500' : 'text-gray-400'}`} />
                <span className={`text-sm font-medium ${isSelected ? 'text-teal-700' : 'text-gray-700'}`}>
                  {sport}
                </span>
              </div>
              {isSelected && (
                <Check size={18} className="text-teal-500" />
              )}
            </button>
          );
        })}
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => {
            setSelectedSports([]);
          }}
          className="px-4 py-3 rounded-xl font-bold transition-all bg-gray-200 text-gray-600 hover:bg-gray-300 active:scale-[0.98]"
        >
          クリア
        </button>
        <button
          onClick={handleConfirm}
          className="flex-1 py-3 bg-teal-500 text-white rounded-xl font-bold hover:bg-teal-600 transition-colors"
        >
          決定
        </button>
      </div>
    </div>
  );
};
