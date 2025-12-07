'use client';

import React from 'react';
import { ChevronLeft, MapPin, Clock, Info, Car, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import type { Gym, GymDetail } from '@/types';

interface DetailScreenProps {
  gym: Gym | GymDetail;
  onBack: () => void;
}

function isGymDetail(gym: Gym | GymDetail): gym is GymDetail {
  return 'format' in gym;
}

export const DetailScreen: React.FC<DetailScreenProps> = ({ gym, onBack }) => {
    return (
        <div className="min-h-screen bg-gray-50 pb-24">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center shadow-sm">
                <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 rounded-full mr-2">
                    <ChevronLeft size={24} className="text-gray-800" />
                </button>
                <h2 className="text-base font-bold text-gray-800 line-clamp-1">{gym.name}</h2>
            </div>
            <div className="p-6 space-y-6">
                {/* Basic Info Card */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                    <Badge color="teal" variant="solid">個人開放あり</Badge>
                    <h1 className="text-2xl font-bold text-gray-900 mt-3 mb-2">{gym.name}</h1>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {gym.tags.map(tag => (
                            <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                                #{tag}
                            </span>
                        ))}
                    </div>
                    
                    <div className="flex items-start space-x-3 text-gray-600 mb-2">
                        <MapPin className="mt-0.5 flex-shrink-0 text-teal-500" size={18} />
                        <div>
                            <p className="text-sm font-bold text-gray-800">住所</p>
                            <p className="text-sm">{gym.address}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{gym.distance}</p>
                        </div>
                    </div>
                </div>
                {/* Schedule Section */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center space-x-2 mb-4">
                        <Clock className="text-teal-500" size={20} />
                        <h3 className="text-lg font-bold text-gray-800">空いている時間</h3>
                    </div>
                    <div className="space-y-3">
                        <p className="text-sm text-gray-500">本日 (11/29)</p>
                        <div className="grid grid-cols-3 gap-3">
                            {gym.schedule.map((slot, idx) => (
                                <div 
                                    key={idx} 
                                    className={`flex flex-col items-center justify-center p-3 rounded-xl border ${
                                        slot.status === '○' ? 'bg-teal-50 border-teal-200' :
                                        slot.status === '△' ? 'bg-orange-50 border-orange-200' :
                                        'bg-gray-100 border-transparent opacity-60'
                                    }`}
                                >
                                    <span className="text-xs font-bold text-gray-600">{slot.time}</span>
                                    <span className={`text-xl font-bold ${
                                        slot.status === '○' ? 'text-teal-600' : 
                                        slot.status === '△' ? 'text-orange-500' : 
                                        'text-gray-400'
                                    }`}>
                                        {slot.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                {/* Details List */}
                {isGymDetail(gym) && (
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 space-y-6">
                      {/* Format */}
                      <div className="flex items-start space-x-3">
                          <Info className="mt-0.5 flex-shrink-0 text-teal-500" size={20} />
                          <div>
                              <h3 className="text-sm font-bold text-gray-800 mb-1">利用形式</h3>
                              <p className="text-sm text-gray-600">{gym.format}</p>
                          </div>
                      </div>
                      <div className="border-t border-gray-100" />
                      
                      {/* Parking */}
                      <div className="flex items-start space-x-3">
                          <Car className="mt-0.5 flex-shrink-0 text-teal-500" size={20} />
                          <div>
                              <h3 className="text-sm font-bold text-gray-800 mb-1">駐車場</h3>
                              <p className="text-sm text-gray-600">{gym.parking}</p>
                          </div>
                      </div>
                      <div className="border-t border-gray-100" />
                      {/* Restrictions */}
                      <div className="flex items-start space-x-3">
                          <AlertCircle className="mt-0.5 flex-shrink-0 text-teal-500" size={20} />
                          <div>
                              <h3 className="text-sm font-bold text-gray-800 mb-1">制限・注意事項</h3>
                              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                                  {gym.restrictions.map((rule, idx) => (
                                      <li key={idx}>{rule}</li>
                                  ))}
                              </ul>
                          </div>
                      </div>
                  </div>
                )}
            </div>
            
            {/* CTA Button */}
            <div className="fixed bottom-16 left-0 right-0 p-4 bg-gradient-to-t from-gray-50 to-transparent">
                 <button className="w-full max-w-md mx-auto bg-teal-500 text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-teal-600 active:scale-[0.98] transition-all">
                    予約 / 公式サイトへ
                 </button>
            </div>
        </div>
    );
};

