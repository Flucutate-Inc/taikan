'use client';

import React from 'react';
import { LucideIcon, ChevronRight } from 'lucide-react';

interface SearchFieldProps {
  label?: string;
  value?: string;
  placeholder: string;
  icon: LucideIcon;
  onClick?: (value?: string) => void;
  isReadOnly?: boolean;
}

export const SearchField: React.FC<SearchFieldProps> = ({ 
  label, 
  value = '', 
  placeholder, 
  icon: IconComp, 
  onClick, 
  isReadOnly = true 
}) => (
  <div className="w-full cursor-pointer" onClick={() => onClick && onClick()}>
    {label && <p className="text-xs text-gray-500 mb-1.5 font-bold">{label}</p>}
    <div className="flex items-center h-[52px] px-4 bg-white rounded-2xl border border-gray-200 shadow-sm transition-all hover:border-teal-300 hover:shadow-md active:border-teal-500">
      <IconComp className="text-teal-500 mr-3" size={20} />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        readOnly={isReadOnly}
        className={`w-full bg-transparent text-gray-800 text-sm font-medium placeholder-gray-400 focus:outline-none ${isReadOnly ? 'pointer-events-none' : ''}`}
        onChange={(e) => !isReadOnly && onClick && onClick(e.target.value)}
      />
      {isReadOnly && <ChevronRight className="text-gray-300 ml-2" size={16} />}
    </div>
  </div>
);


