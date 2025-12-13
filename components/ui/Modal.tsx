'use client';

import React from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/50 transition-opacity backdrop-blur-sm" 
        onClick={onClose}
      />
      {/* Content */}
      <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl transform transition-all duration-300 scale-100 max-h-[85vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-6 pb-2 shrink-0">
          <h3 className="text-xl font-bold text-gray-800">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 pt-2">
           {children}
        </div>
      </div>
    </div>
  );
};


