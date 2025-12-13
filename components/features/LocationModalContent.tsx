'use client';

import React, { useState } from 'react';
import { Train, Navigation, ChevronDown, ChevronUp, Check } from 'lucide-react';

interface LocationModalContentProps {
  onSelect: (value: string) => void;
}

// 都道府県データ
const PREFECTURES: Record<string, string[]> = {
  '東京都': ['千代田区', '中央区', '港区', '新宿区', '文京区', '台東区', '墨田区', '江東区', '品川区', '目黒区', '大田区', '世田谷区', '渋谷区', '中野区', '杉並区', '豊島区'],
  '神奈川県': ['横浜市', '川崎市', '相模原市', '横須賀市', '平塚市', '鎌倉市', '藤沢市'],
  '埼玉県': ['さいたま市', '川口市', '川越市', '所沢市', '越谷市'],
  '千葉県': ['千葉市', '船橋市', '松戸市', '市川市', '柏市']
};

// 駅データ
const STATIONS = [
  '新宿駅', '渋谷駅', '池袋駅', '東京駅', '品川駅', '上野駅', 
  '横浜駅', '川崎駅', '武蔵小杉駅', '大宮駅', '浦和駅', '千葉駅', '西船橋駅',
  '吉祥寺駅', '立川駅', '町田駅'
];

export const LocationModalContent: React.FC<LocationModalContentProps> = ({ onSelect }) => {
  const [tab, setTab] = useState<'area' | 'station' | 'current'>('area');
  const [expandedPrefectures, setExpandedPrefectures] = useState(['東京都']);
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);
  const [selectedStations, setSelectedStations] = useState<string[]>([]);

  const togglePrefectureExpand = (pref: string) => {
    if (expandedPrefectures.includes(pref)) {
      setExpandedPrefectures(expandedPrefectures.filter(p => p !== pref));
    } else {
      setExpandedPrefectures([...expandedPrefectures, pref]);
    }
  };

  const toggleArea = (city: string) => {
    if (selectedAreas.includes(city)) {
      setSelectedAreas(selectedAreas.filter(a => a !== city));
    } else {
      setSelectedAreas([...selectedAreas, city]);
    }
  };

  const toggleStation = (station: string) => {
    if (selectedStations.includes(station)) {
      setSelectedStations(selectedStations.filter(s => s !== station));
    } else {
      setSelectedStations([...selectedStations, station]);
    }
  };

  const handleConfirm = () => {
    const allSelected = [...selectedAreas, ...selectedStations];
    onSelect(allSelected.length > 0 ? allSelected.join(', ') : '');
  };

  const totalSelectedCount = selectedAreas.length + selectedStations.length;

  return (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-gray-100 mb-4 shrink-0">
        {(['area', 'station', 'current'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-colors ${
              tab === t ? 'border-teal-500 text-teal-600' : 'border-transparent text-gray-400'
            }`}
          >
            {t === 'area' ? 'エリア' : t === 'station' ? '駅' : '現在地'}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-[300px] overflow-y-auto pb-20">
        {tab === 'area' && (
          <div className="flex flex-col space-y-3 animate-fade-in">
             <p className="text-xs text-gray-400 mb-1 px-2">都道府県を選択して詳細を表示</p>
             {Object.keys(PREFECTURES).map(pref => {
               const isExpanded = expandedPrefectures.includes(pref);
               const cities = PREFECTURES[pref];
               const selectedCountInPref = cities.filter(c => selectedAreas.includes(c)).length;
               return (
                 <div key={pref} className="border border-gray-100 rounded-xl overflow-hidden bg-white shadow-sm transition-all">
                    <button
                      onClick={() => togglePrefectureExpand(pref)}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <span className="font-bold text-gray-800 flex items-center">
                        {pref}
                        {selectedCountInPref > 0 && (
                          <span className="ml-2 bg-teal-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                            {selectedCountInPref}
                          </span>
                        )}
                      </span>
                      {isExpanded ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                    </button>
                    {isExpanded && (
                      <div className="p-2 bg-white">
                        <div className="grid grid-cols-2 gap-2">
                           {cities.map(city => {
                             const isSelected = selectedAreas.includes(city);
                             return (
                               <button
                                 key={city}
                                 onClick={() => toggleArea(city)}
                                 className={`flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium transition-all ${
                                    isSelected 
                                      ? 'bg-teal-50 text-teal-700 ring-1 ring-teal-200' 
                                      : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
                                 }`}
                               >
                                  <span className="truncate">{city}</span>
                                  {isSelected && <Check size={14} className="text-teal-500 shrink-0 ml-1" />}
                               </button>
                             )
                           })}
                        </div>
                      </div>
                    )}
                 </div>
               );
             })}
          </div>
        )}
        
        {tab === 'station' && (
          <div className="flex flex-col space-y-1 animate-fade-in">
             <p className="text-xs text-gray-400 mb-2 px-2">主要駅から探す</p>
             {STATIONS.map(station => {
               const isSelected = selectedStations.includes(station);
               return (
                 <button
                   key={station}
                   onClick={() => toggleStation(station)}
                   className={`flex justify-between items-center text-left py-3 px-4 rounded-lg font-medium transition-colors ${
                     isSelected ? 'bg-teal-50 text-teal-700' : 'hover:bg-gray-50 text-gray-700'
                   }`}
                 >
                    <span className="flex items-center">
                      <Train size={16} className={`mr-2 ${isSelected ? 'text-teal-500' : 'text-gray-400'}`} />
                      {station}
                    </span>
                    {isSelected && <Check size={18} className="text-teal-500" />}
                 </button>
               )
             })}
          </div>
        )}
        
        {tab === 'current' && (
           <button 
             onClick={() => onSelect('現在地周辺')}
             className="w-full flex items-center justify-center space-x-2 py-4 border-2 border-teal-500 text-teal-600 rounded-xl font-bold hover:bg-teal-50 mt-4"
           >
             <Navigation size={18} />
             <span>現在地周辺を探す</span>
           </button>
        )}
      </div>
      {(tab === 'area' || tab === 'station') && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-lg rounded-b-3xl z-10">
          <button 
            onClick={handleConfirm}
            disabled={totalSelectedCount === 0}
            className={`w-full py-4 rounded-xl font-bold shadow-lg transition-all ${
              totalSelectedCount > 0 
                ? 'bg-teal-500 text-white hover:bg-teal-600 active:scale-[0.98]' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            決定 {totalSelectedCount > 0 && `(${totalSelectedCount})`}
          </button>
        </div>
      )}
    </div>
  );
};


