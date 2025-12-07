'use client';

import React from 'react';
import { Activity } from 'lucide-react';

interface SportModalContentProps {
  onSelect: (value: string) => void;
}

const SPORTS = ['バドミントン', '卓球', 'バスケットボール', 'バレーボール', 'フットサル', 'プール'];

export const SportModalContent: React.FC<SportModalContentProps> = ({ onSelect }) => (
  <div className="grid grid-cols-2 gap-3 pb-2">
    {SPORTS.map(sport => (
      <button
        key={sport}
        onClick={() => onSelect(sport)}
        className="flex items-center px-4 py-4 border border-gray-200 rounded-xl hover:border-teal-500 hover:bg-teal-50 transition-colors text-left group"
      >
        <Activity size={18} className="text-gray-400 mr-2 group-hover:text-teal-500" />
        <span className="text-sm font-medium text-gray-700 group-hover:text-teal-600">{sport}</span>
      </button>
    ))}
  </div>
);

