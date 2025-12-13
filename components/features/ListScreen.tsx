'use client';

import React, { useState } from 'react';
import { X, Calendar as CalendarIcon, List as ListIcon, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { GymCard } from './GymCard';
import { RegisterGymModal } from './RegisterGymModal';
import { useGyms } from '@/hooks/useGyms';
import { useMockGyms } from '@/hooks/useMockData';
import { registerGymSource } from '@/lib/firebase/api';
import type { Gym, SearchConditions } from '@/types';

interface ListScreenProps {
  onBack: () => void;
  onSelectGym: (gym: Gym) => void;
  searchConditions?: SearchConditions;
}

export const ListScreen: React.FC<ListScreenProps> = ({ onBack, onSelectGym, searchConditions }) => {
    const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
    const [selectedDate, setSelectedDate] = useState<number | null>(null);
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    
    // Firebaseからデータを取得（エラー時はモックデータにフォールバック）
    const { gyms: firebaseGyms, loading, error } = useGyms(searchConditions);
    const { gyms: mockGyms } = useMockGyms();
    const gyms = error ? mockGyms : firebaseGyms;

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
                        <Badge color="teal">日時: {searchConditions.date}</Badge>
                    )}
                    {searchConditions.area && (
                        <Badge color="gray" variant="outline">エリア: {searchConditions.area}</Badge>
                    )}
                    {searchConditions.sport && (
                        <Badge color="gray" variant="outline">{searchConditions.sport}</Badge>
                    )}
                    {searchConditions.keyword && (
                        <Badge color="gray" variant="outline">キーワード: {searchConditions.keyword}</Badge>
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
                                <GymCard key={gym.id} data={gym} onClick={() => onSelectGym(gym)} />
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
                            <p className="font-bold text-gray-800 mb-4">2023年 11月</p>
                             <div className="grid grid-cols-7 gap-1">
                                {['日','月','火','水','木','金','土'].map(d => (
                                    <div key={d} className="text-center text-[10px] text-gray-400">{d}</div>
                                ))}
                                {Array.from({ length: 30 }, (_, i) => i + 1).map(d => (
                                    <button
                                        key={d}
                                        onClick={() => setSelectedDate(d)}
                                        className={`flex flex-col justify-between h-[60px] p-1 rounded-lg border transition-all ${
                                          selectedDate === d 
                                            ? 'bg-teal-50 border-teal-200' 
                                            : 'bg-transparent border-gray-100 hover:bg-gray-50'
                                        }`}
                                    >
                                        <span className="text-xs text-gray-600">{d}</span>
                                        {[10, 15, 20, 25, 29].includes(d) && (
                                            <span className="bg-teal-500 text-white text-[9px] px-1 rounded-sm w-full text-center">
                                                5件
                                            </span>
                                        )}
                                    </button>
                                ))}
                             </div>
                        </div>
                        {selectedDate && (
                             <div className="animate-fade-in">
                                 <p className="text-sm font-bold mb-2 text-teal-600">11月{selectedDate}日の空き状況</p>
                                 {gyms.length > 0 ? (
                                     <GymCard data={gyms[0]} onClick={() => onSelectGym(gyms[0])} />
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
