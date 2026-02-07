'use client';

import React, { useState } from 'react';
import { X, Calendar as CalendarIcon, List as ListIcon, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { GymCard } from './GymCard';
import { RegisterGymModal } from './RegisterGymModal';
import { useGyms } from '@/hooks/useGyms';
import { useMockGyms } from '@/hooks/useMockData';
import { useFavorites } from '@/hooks/useFavorites';
import { registerGymSource } from '@/lib/firebase/api';
import type { Gym, SearchConditions } from '@/types';

interface ListScreenProps {
  onBack: () => void;
  onSelectGym: (gym: Gym) => void;
  searchConditions?: SearchConditions;
  onRemoveCondition?: (key: keyof SearchConditions) => void;
}

export const ListScreen: React.FC<ListScreenProps> = ({ onBack, onSelectGym, searchConditions, onRemoveCondition }) => {
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [selectedDate, setSelectedDate] = useState<{month: 'current' | 'next', day: number} | null>(null);
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    
    // カレンダー表示用の日付計算（DateModalContentと同じロジック）
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1; // 1-12
    const todayDay = today.getDate();
    
    // 今月の日数を取得
    const currentMonthDays = new Date(currentYear, currentMonth, 0).getDate();
    
    // 今週の最初の日（日曜日）を計算
    const todayDayOfWeek = today.getDay(); // 0=日曜日, 6=土曜日
    const weekStartDay = todayDay - todayDayOfWeek; // 今週の日曜日の日付
    
    // 今週の最初の日から今月末までの日付を表示
    const startDay = Math.max(1, weekStartDay);
    const currentMonthVisibleDays = Array.from(
        { length: currentMonthDays - startDay + 1 },
        (_, i) => startDay + i
    );
    
    // 今週の最初の日の曜日を計算
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
    
    // カレンダー表示用の関数
    const renderCalendar = (title: string, days: number[], startOffset: number, monthPrefix: string, monthType: 'current' | 'next', minDay = 0, weekStart = 0) => (
        <div>
            <p className="font-bold text-gray-800 mb-4">{title}</p>
            <div className="grid grid-cols-7 gap-1 mb-4">
                {weekDays.map(d => (
                    <div key={d} className="text-center text-[10px] text-gray-400">{d}</div>
                ))}
                {Array.from({ length: startOffset }).map((_, i) => (
                    <div key={`empty-${title}-${i}`} />
                ))}
                {days.map(d => {
                    const isPast = minDay > 0 && d < minDay;
                    const isBeforeWeekStart = weekStart > 0 && d < weekStart;
                    const isSelected = selectedDate?.month === monthType && selectedDate?.day === d;
                    
                    if (isBeforeWeekStart) {
                        return null;
                    }
                    
                    return (
                        <button
                            key={d}
                            disabled={isPast}
                            onClick={() => !isPast && setSelectedDate({month: monthType, day: d})}
                            className={`flex flex-col justify-between h-[60px] p-1 rounded-lg border transition-all ${
                                isPast
                                    ? 'bg-gray-50 border-gray-100 opacity-50 cursor-not-allowed'
                                    : isSelected
                                        ? 'bg-teal-50 border-teal-200'
                                        : 'bg-transparent border-gray-100 hover:bg-gray-50'
                            }`}
                        >
                            <span className={`text-xs ${isPast ? 'text-gray-300' : 'text-gray-600'}`}>{d}</span>
                            {/* 空き状況の表示は後で実装 */}
                        </button>
                    );
                })}
            </div>
        </div>
    );
    
    // Firebaseからデータを取得（エラー時はモックデータにフォールバック）
    const { gyms: firebaseGyms, loading, error } = useGyms(searchConditions);
    const { gyms: mockGyms } = useMockGyms();
    const gyms = error ? mockGyms : firebaseGyms;
    const { isFavorite, toggle } = useFavorites();

    // デバッグログ
    console.log('🔍 ListScreen Debug:', { 
        loading, 
        error, 
        firebaseGymsCount: firebaseGyms.length, 
        mockGymsCount: mockGyms.length,
        gymsCount: gyms.length,
        searchConditions
    });

    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
                <button onClick={onBack} className="p-1 -ml-1 hover:bg-gray-100 rounded-full">
                    <X size={20} className="text-gray-600" />
                </button>
                <h2 className="text-base font-bold text-gray-800">
                    検索結果 ({loading ? '...' : gyms.length}件)
                    {error && <span className="text-xs text-orange-500 ml-2">(モック)</span>}
                </h2>
                <button
                    onClick={() => setViewMode(viewMode === 'list' ? 'calendar' : 'list')}
                    className="flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-medium text-teal-600 hover:bg-teal-50"
                >
                    {viewMode === 'list' ? <CalendarIcon size={14} /> : <ListIcon size={14} />}
                    <span>{viewMode === 'list' ? 'カレンダー' : 'リスト'}</span>
                </button>
            </div>
            {searchConditions && (searchConditions.date || searchConditions.area || searchConditions.sport || searchConditions.keyword) && (
                <div className="flex overflow-x-auto px-4 py-3 gap-2 no-scrollbar">
                    {searchConditions.date && (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-teal-500 text-white text-xs font-bold rounded">
                            <span>日時: {searchConditions.date}</span>
                            {onRemoveCondition && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemoveCondition('date');
                                    }}
                                    className="ml-1 hover:bg-teal-600 rounded-full p-0.5 transition-colors"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    )}
                    {searchConditions.area && (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-bold rounded border border-gray-200">
                            <span>エリア: {searchConditions.area}</span>
                            {onRemoveCondition && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemoveCondition('area');
                                    }}
                                    className="ml-1 hover:bg-gray-200 rounded-full p-0.5 transition-colors"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    )}
                    {searchConditions.sport && (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-bold rounded border border-gray-200">
                            <span>{searchConditions.sport}</span>
                            {onRemoveCondition && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemoveCondition('sport');
                                    }}
                                    className="ml-1 hover:bg-gray-200 rounded-full p-0.5 transition-colors"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    )}
                    {searchConditions.keyword && (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-bold rounded border border-gray-200">
                            <span>キーワード: {searchConditions.keyword}</span>
                            {onRemoveCondition && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemoveCondition('keyword');
                                    }}
                                    className="ml-1 hover:bg-gray-200 rounded-full p-0.5 transition-colors"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
            <div className="px-4">
                {loading ? (
                    <div className="flex justify-center items-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
                    </div>
                ) : viewMode === 'list' ? (
                    <div className="flex flex-col">
                        <p className="text-xs text-gray-500 mb-3 ml-1">現在地から近い順</p>
                        {gyms.length > 0 ? (
                            gyms.map(gym => (
                                <GymCard
                                    key={gym.id}
                                    data={gym}
                                    onClick={() => onSelectGym(gym)}
                                    showFavoriteButton
                                    isFavorite={isFavorite(gym.id)}
                                    onToggleFavorite={(e) => {
                                        e.stopPropagation();
                                        toggle(gym);
                                    }}
                                />
                            ))
                        ) : (
                            <div className="text-center py-12">
                                <p className="text-gray-500 mb-6">条件に一致する施設が見つかりませんでした</p>
                                <button
                                    onClick={() => setIsRegisterModalOpen(true)}
                                    className="flex items-center justify-center space-x-2 px-6 py-3 bg-teal-500 text-white rounded-xl font-bold hover:bg-teal-600 active:scale-[0.98] transition-all mx-auto"
                                >
                                    <Plus size={18} />
                                    <span>体育館を登録する</span>
                                </button>
                            </div>
                        )}
                    </div>
                ) : (
                    <div>
                        <div className="bg-white p-4 rounded-2xl shadow-sm mb-4 border border-gray-100">
                            {renderCalendar(`${currentYear}年 ${currentMonthName}`, currentMonthVisibleDays, currentMonthOffset, currentMonthName, 'current', todayDay, weekStartDay)}
                        </div>
                        <div className="bg-white p-4 rounded-2xl shadow-sm mb-4 border border-gray-100">
                            {renderCalendar(`${nextYear}年 ${nextMonthName}`, nextMonthVisibleDays, nextMonthOffset, nextMonthName, 'next')}
                        </div>
                        {selectedDate && (
                             <div className="animate-fade-in">
                                 <p className="text-sm font-bold mb-2 text-teal-600">{selectedDate.month === 'current' ? `${currentMonthName}${selectedDate.day}日` : `${nextMonthName}${selectedDate.day}日`}の空き状況</p>
                                 {gyms.length > 0 ? (
                                     <GymCard
                                         data={gyms[0]}
                                         onClick={() => onSelectGym(gyms[0])}
                                         showFavoriteButton
                                         isFavorite={isFavorite(gyms[0].id)}
                                         onToggleFavorite={(e) => {
                                             e.stopPropagation();
                                             toggle(gyms[0]);
                                         }}
                                     />
                                 ) : (
                                     <div className="text-center py-12">
                                         <p className="text-gray-500 mb-6">条件に一致する施設が見つかりませんでした</p>
                                         <button
                                             onClick={() => setIsRegisterModalOpen(true)}
                                             className="flex items-center justify-center space-x-2 px-6 py-3 bg-teal-500 text-white rounded-xl font-bold hover:bg-teal-600 active:scale-[0.98] transition-all mx-auto"
                                         >
                                             <Plus size={18} />
                                             <span>体育館を登録する</span>
                                         </button>
                                     </div>
                                 )}
                             </div>
                        )}
                        {!selectedDate && gyms.length === 0 && (
                            <div className="text-center py-12">
                                <p className="text-gray-500 mb-6">条件に一致する施設が見つかりませんでした</p>
                                <button
                                    onClick={() => setIsRegisterModalOpen(true)}
                                    className="flex items-center justify-center space-x-2 px-6 py-3 bg-teal-500 text-white rounded-xl font-bold hover:bg-teal-600 active:scale-[0.98] transition-all mx-auto"
                                >
                                    <Plus size={18} />
                                    <span>体育館を登録する</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            {/* Register Gym Modal */}
            <RegisterGymModal
                isOpen={isRegisterModalOpen}
                onClose={() => setIsRegisterModalOpen(false)}
                onSubmit={async (url) => {
                    try {
                        console.log('📝 Registering URL:', url);
                        const result = await registerGymSource(url);
                        console.log('✅ Registration result:', result);
                        if (result.gymId && result.slotsAdded !== undefined) {
                            alert(`URLを登録し、${result.slotsAdded}件の空き時間情報を追加しました。`);
                            // ページをリロードして検索結果を更新
                            window.location.reload();
                        } else {
                            alert('URLを登録しました。PDFの解析を開始しています...');
                        }
                    } catch (error) {
                        console.error('❌ Failed to register URL:', error);
                        const errorMessage = error instanceof Error 
                            ? error.message 
                            : 'URLの登録に失敗しました';
                        alert(`エラー: ${errorMessage}\n\nもう一度お試しください。`);
                    }
                }}
            />
        </div>
    );
};
