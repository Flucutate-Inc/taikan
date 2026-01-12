'use client';

import React, { useState } from 'react';

interface DateModalContentProps {
  onSelect: (value: string) => void;
  initialValue?: string;
}

export const DateModalContent: React.FC<DateModalContentProps> = ({ onSelect, initialValue = '' }) => {
  // 当日日付を取得
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth() + 1; // 1-12
  const todayDay = today.getDate();
  
  // 今月の日数を取得
  const currentMonthDays = new Date(currentYear, currentMonth, 0).getDate();
  // 今月の最初の日の曜日を取得（0=日曜日, 6=土曜日）
  const currentMonthFirstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
  
  // 今週の最初の日（日曜日）を計算
  const todayDayOfWeek = today.getDay(); // 0=日曜日, 6=土曜日
  const weekStartDay = todayDay - todayDayOfWeek; // 今週の日曜日の日付
  
  // 今週の最初の日から今月末までの日付を表示
  // 今週の最初の日が1より小さい場合は1から開始（前月の日付は表示しない）
  const startDay = Math.max(1, weekStartDay);
  const currentMonthVisibleDays = Array.from(
    { length: currentMonthDays - startDay + 1 },
    (_, i) => startDay + i
  );
  
  // 今週の最初の日の曜日を計算（今週の日曜日が今月の何日目か）
  const weekStartDate = new Date(currentYear, currentMonth - 1, startDay);
  const weekStartDayOfWeek = weekStartDate.getDay();
  const currentMonthOffset = weekStartDayOfWeek;
  
  // 来月の日数を取得
  const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
  const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
  const nextMonthDays = new Date(nextYear, nextMonth, 0).getDate();
  const nextMonthFirstDay = new Date(nextYear, nextMonth - 1, 1).getDay();
  const nextMonthVisibleDays = Array.from({ length: nextMonthDays }, (_, i) => i + 1);
  const nextMonthOffset = nextMonthFirstDay;
  
  // 月名を取得
  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  const currentMonthName = monthNames[currentMonth - 1];
  const nextMonthName = monthNames[nextMonth - 1];
  
  const weekDays = ['日','月','火','水','木','金','土'];
  // 初期値から選択状態を復元
  const parseInitialValue = (value: string) => {
    if (!value) return { dates: [], startTime: '指定なし', endTime: '指定なし' };
    // 日付と時間帯を分離（形式: "1月15日, 1月16日" または "1月15日, 1月16日 | 9:00 ~ 12:00"）
    const parts = value.split(' | ');
    const dates = parts[0] ? parts[0].split(',').map(s => s.trim()).filter(Boolean) : [];
    // 時間帯は現在の実装では保存されていないため、デフォルト値を使用
    return { dates, startTime: '指定なし', endTime: '指定なし' };
  };

  const initialData = parseInitialValue(initialValue);
  
  const [selectedDates, setSelectedDates] = useState<string[]>(initialData.dates);
  const [startTime, setStartTime] = useState<string>(initialData.startTime);
  const [endTime, setEndTime] = useState<string>(initialData.endTime);
  const [isTimePickerOpen, setIsTimePickerOpen] = useState(false);

  const startTimeOptions = ['指定なし', '9:00', '12:00', '15:00', '18:00', '21:00'];
  const endTimeOptions = ['指定なし', '9:00', '12:00', '15:00', '18:00', '21:00'];
  
  // 時刻を数値に変換（分単位）
  const timeToMinutes = (time: string): number | null => {
    if (time === '指定なし') return null;
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };
  
  // バリデーション: 開始時刻 <= 終了時刻
  const isTimeValid = (): boolean => {
    if (startTime === '指定なし' || endTime === '指定なし') return true;
    const startMinutes = timeToMinutes(startTime);
    const endMinutes = timeToMinutes(endTime);
    if (startMinutes === null || endMinutes === null) return true;
    return startMinutes <= endMinutes;
  };
  
  const getTimeDisplayText = () => {
    if (startTime === '指定なし' && endTime === '指定なし') {
      return '指定なし';
    }
    return `${startTime} ~ ${endTime}`;
  };

  const toggleDate = (dateStr: string) => {
    if (selectedDates.includes(dateStr)) {
      setSelectedDates(selectedDates.filter(d => d !== dateStr));
    } else {
      setSelectedDates([...selectedDates, dateStr]);
    }
  };

  const renderCalendar = (title: string, days: number[], startOffset: number, monthPrefix: string, minDay = 0, weekStart = 0) => (
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
          // 今日より前の日付は無効化（薄く表示）
          const isPast = minDay > 0 && d < minDay;
          // 先週以前の日付は表示しない（weekStartより前は表示しない）
          const isBeforeWeekStart = weekStart > 0 && d < weekStart;
          
          // 先週以前の日付は表示しない
          if (isBeforeWeekStart) {
            return null;
          }
          
          return (
            <button
              key={d}
              disabled={isPast}
              onClick={() => !isPast && toggleDate(dateStr)}
              className={`relative w-full pt-[100%] rounded-full flex items-center justify-center transition-all duration-200 ${
                isPast 
                  ? 'text-gray-300 bg-gray-50 cursor-not-allowed opacity-50'
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
        <p className="text-sm font-bold text-gray-800 mb-3">時間帯</p>
        {!isTimePickerOpen ? (
          <button
            onClick={() => setIsTimePickerOpen(true)}
            className="w-full p-3 bg-gray-100 rounded-xl text-sm border-none hover:bg-gray-200 transition-colors text-left flex items-center justify-between"
          >
            <span className="text-gray-800">{getTimeDisplayText()}</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 9L1 4H11L6 9Z" fill="#666666"/>
            </svg>
          </button>
        ) : (
          <div className="bg-white border-2 border-teal-500 rounded-xl p-4">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-2 font-bold">開始時刻</p>
                <div className="relative h-[120px] overflow-y-auto border border-gray-200 rounded-lg">
                  <div className="py-2">
                    {startTimeOptions.map((option, index) => (
                      <button
                        key={option}
                        onClick={() => setStartTime(option)}
                        className={`w-full py-2 px-3 text-sm text-left transition-colors ${
                          startTime === option
                            ? 'bg-teal-50 text-teal-700 font-bold'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <span className="text-gray-400 font-bold text-lg mt-6">~</span>
              <div className="flex-1">
                <p className="text-xs text-gray-500 mb-2 font-bold">終了時刻</p>
                <div className="relative h-[120px] overflow-y-auto border border-gray-200 rounded-lg">
                  <div className="py-2">
                    {endTimeOptions.map((option, index) => (
                      <button
                        key={option}
                        onClick={() => setEndTime(option)}
                        className={`w-full py-2 px-3 text-sm text-left transition-colors ${
                          endTime === option
                            ? 'bg-teal-50 text-teal-700 font-bold'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            {!isTimeValid() && (
              <p className="text-xs text-red-500 mb-2 text-center">開始時刻は終了時刻より前である必要があります</p>
            )}
            <button
              onClick={() => {
                if (isTimeValid()) {
                  setIsTimePickerOpen(false);
                }
              }}
              disabled={!isTimeValid()}
              className={`w-full py-2 rounded-lg text-sm font-bold transition-colors ${
                isTimeValid()
                  ? 'bg-teal-500 text-white hover:bg-teal-600'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              決定
            </button>
          </div>
        )}
      </div>
      <div className="border-t border-gray-100 my-2 flex-shrink-0"></div>
      <div className="space-y-8 pb-4 flex-1">
        {renderCalendar(`${currentYear}年 ${currentMonthName}`, currentMonthVisibleDays, currentMonthOffset, currentMonthName, todayDay, weekStartDay)}
        {renderCalendar(`${nextYear}年 ${nextMonthName}`, nextMonthVisibleDays, nextMonthOffset, nextMonthName)}
      </div>
      <div className="sticky bottom-0 bg-white pt-4 pb-2 border-t border-gray-100 mt-auto">
        <div className="flex gap-2">
          <button 
            onClick={() => {
              setSelectedDates([]);
              setStartTime('指定なし');
              setEndTime('指定なし');
            }}
            className="px-4 py-4 rounded-xl font-bold transition-all bg-gray-200 text-gray-600 hover:bg-gray-300 active:scale-[0.98]"
          >
            クリア
          </button>
          <button 
            onClick={() => onSelect(selectedDates.length > 0 ? selectedDates.join(', ') : '')}
            className="flex-1 py-4 rounded-xl font-bold shadow-lg transition-all bg-teal-500 text-white hover:bg-teal-600 active:scale-[0.98]"
          >
            決定
          </button>
        </div>
      </div>
    </div>
  );
};


