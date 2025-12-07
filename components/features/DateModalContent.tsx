'use client';

import React, { useState } from 'react';

interface DateModalContentProps {
  onSelect: (value: string) => void;
}

export const DateModalContent: React.FC<DateModalContentProps> = ({ onSelect }) => {
  const todayDay = 29;
  const currentMonthVisibleDays = [26, 27, 28, 29, 30];
  const currentMonthOffset = 0;
  const nextMonthDays = Array.from({ length: 31 }, (_, i) => i + 1);
  const nextMonthOffset = 5;
  const weekDays = ['日','月','火','水','木','金','土'];
  const [selectedDates, setSelectedDates] = useState<string[]>([]);

  const toggleDate = (dateStr: string) => {
    if (selectedDates.includes(dateStr)) {
      setSelectedDates(selectedDates.filter(d => d !== dateStr));
    } else {
      setSelectedDates([...selectedDates, dateStr]);
    }
  };

  const renderCalendar = (title: string, days: number[], startOffset: number, monthPrefix: string, minDay = 0) => (
    <div>
      <p className="text-lg font-bold text-gray-800 mb-3 sticky top-0 bg-white z-10 py-2">{title}</p>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(d => (
          <div key={d} className="text-center text-xs font-bold text-gray-400 py-1">{d}</div>
        ))}
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`empty-${title}-${i}`} />
        ))}
        {days.map(d => {
          const dateStr = `${monthPrefix}${d}日`;
          const isSelected = selectedDates.includes(dateStr);
          const isDisabled = minDay > 0 && d < minDay;
          return (
            <button
              key={d}
              disabled={isDisabled}
              onClick={() => toggleDate(dateStr)}
              className={`relative w-full pt-[100%] rounded-full flex items-center justify-center transition-all duration-200 ${
                isDisabled 
                  ? 'text-gray-300 bg-gray-50 cursor-not-allowed'
                  : isSelected
                    ? 'bg-teal-500 text-white font-bold shadow-md transform scale-105'
                    : 'text-gray-700 hover:bg-gray-100 active:scale-95'
              }`}
            >
              <span className="absolute inset-0 flex items-center justify-center text-sm">
                {d}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col relative h-full">
      <div className="mb-6 flex-shrink-0">
        <p className="text-sm font-bold text-gray-800 mb-3">時間帯 (開始 - 終了)</p>
        <div className="flex items-center gap-2 mb-2">
           <select className="flex-1 p-3 bg-gray-100 rounded-xl text-sm border-none focus:ring-2 focus:ring-teal-500 outline-none">
             <option>09:00</option>
             <option>11:00</option>
           </select>
           <span className="text-gray-400 font-bold">~</span>
           <select className="flex-1 p-3 bg-gray-100 rounded-xl text-sm border-none focus:ring-2 focus:ring-teal-500 outline-none">
             <option>21:00</option>
             <option>19:00</option>
           </select>
        </div>
      </div>
      <div className="border-t border-gray-100 my-2 flex-shrink-0"></div>
      <div className="space-y-8 pb-4 flex-1">
        {renderCalendar('2023年 11月', currentMonthVisibleDays, currentMonthOffset, '11月', todayDay)}
        {renderCalendar('2023年 12月', nextMonthDays, nextMonthOffset, '12月')}
      </div>
      <div className="sticky bottom-0 bg-white pt-4 pb-2 border-t border-gray-100 mt-auto">
        <button 
          onClick={() => onSelect(selectedDates.length > 0 ? selectedDates.join(', ') : '')}
          disabled={selectedDates.length === 0}
          className={`w-full py-4 rounded-xl font-bold shadow-lg transition-all ${
            selectedDates.length > 0 
              ? 'bg-teal-500 text-white hover:bg-teal-600 active:scale-[0.98]' 
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          決定 {selectedDates.length > 0 && `(${selectedDates.length})`}
        </button>
      </div>
    </div>
  );
};

