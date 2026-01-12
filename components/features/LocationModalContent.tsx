'use client';

import React, { useState } from 'react';
import { Train, Navigation, ChevronDown, ChevronUp, Check } from 'lucide-react';

interface LocationModalContentProps {
  onSelect: (value: string) => void;
  onSelectLocation?: (lat: number, lng: number) => void;
  initialValue?: string;
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

export const LocationModalContent: React.FC<LocationModalContentProps> = ({ onSelect, onSelectLocation, initialValue = '' }) => {
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const handleGetCurrentLocation = () => {
    // エラーメッセージをクリア
    setLocationError(null);
    
    if (!navigator.geolocation) {
      setLocationError('位置情報サービスが利用できません');
      return;
    }

    // 既に取得中の場合は何もしない（重複リクエストを防ぐ）
    if (isGettingLocation) {
      return;
    }

    setIsGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setIsGettingLocation(false);
        if (onSelectLocation) {
          onSelectLocation(latitude, longitude);
        } else {
          onSelect('現在地周辺');
        }
      },
      (error) => {
        console.error('位置情報の取得に失敗しました:', error);
        setIsGettingLocation(false);
        let errorMessage = '位置情報の取得に失敗しました';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = '位置情報の使用が許可されていません';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = '位置情報が利用できません';
            break;
          case error.TIMEOUT:
            errorMessage = '位置情報の取得がタイムアウトしました';
            break;
        }
        setLocationError(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0  // キャッシュを使わず、毎回新しい位置情報を取得
      }
    );
  };
  // 初期値から選択状態を復元
  const parseInitialValue = (value: string) => {
    if (!value) return { areas: [], stations: [] };
    const items = value.split(',').map(s => s.trim());
    const allCities = Object.values(PREFECTURES).flat();
    const areas: string[] = [];
    const stations: string[] = [];
    
    items.forEach(item => {
      if (allCities.includes(item)) {
        areas.push(item);
      } else if (STATIONS.includes(item)) {
        stations.push(item);
      }
    });
    
    return { areas, stations };
  };

  const { areas: initialAreas, stations: initialStations } = parseInitialValue(initialValue);
  
  const [tab, setTab] = useState<'area' | 'station' | 'current'>('area');
  const [expandedPrefectures, setExpandedPrefectures] = useState(() => {
    // 選択されたエリアがある都道府県を展開
    const prefsWithSelection = Object.keys(PREFECTURES).filter(pref => 
      initialAreas.some(area => PREFECTURES[pref].includes(area))
    );
    return prefsWithSelection.length > 0 ? prefsWithSelection : ['東京都'];
  });
  const [selectedAreas, setSelectedAreas] = useState<string[]>(initialAreas);
  const [selectedStations, setSelectedStations] = useState<string[]>(initialStations);

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

  const selectAllCitiesInPrefecture = (pref: string) => {
    const cities = PREFECTURES[pref];
    const allSelected = cities.every(city => selectedAreas.includes(city));
    if (allSelected) {
      // 既に全て選択されている場合は、その都道府県の市町村を全て解除
      setSelectedAreas(selectedAreas.filter(a => !cities.includes(a)));
    } else {
      // 全て選択されていない場合は、その都道府県の市町村を全て選択（重複を除く）
      const newAreas = [...selectedAreas];
      cities.forEach(city => {
        if (!newAreas.includes(city)) {
          newAreas.push(city);
        }
      });
      setSelectedAreas(newAreas);
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
                        {(() => {
                          const allSelected = cities.every(city => selectedAreas.includes(city));
                          return (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                selectAllCitiesInPrefecture(pref);
                              }}
                              className={`w-full mb-2 px-3 py-3 rounded-lg text-sm font-medium transition-colors border flex items-center justify-center relative ${
                                allSelected
                                  ? 'text-teal-700 bg-teal-50 border-teal-200'
                                  : 'text-gray-600 bg-white hover:bg-gray-50 border-gray-100'
                              }`}
                            >
                              <span>すべて</span>
                              {allSelected && <Check size={14} className="text-teal-500 shrink-0 absolute right-3" />}
                            </button>
                          );
                        })()}
                        <div className="grid grid-cols-2 gap-2">
                           {cities.map(city => {
                             const isSelected = selectedAreas.includes(city);
                             return (
                               <button
                                 key={city}
                                 onClick={() => toggleArea(city)}
                                 className={`flex items-center justify-between px-3 py-3 rounded-lg text-sm font-medium transition-all border ${
                                    isSelected 
                                      ? 'bg-teal-50 text-teal-700 border-teal-200' 
                                      : 'bg-white text-gray-600 hover:bg-gray-50 border-gray-100'
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
          <div className="space-y-4">
            <button 
              onClick={handleGetCurrentLocation}
              disabled={isGettingLocation}
              className="w-full flex items-center justify-center space-x-2 py-4 border-2 border-teal-500 text-teal-600 rounded-xl font-bold hover:bg-teal-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Navigation size={18} />
              <span>{isGettingLocation ? '位置情報を取得中...' : '現在地周辺を探す'}</span>
            </button>
            {locationError && (
              <p className="text-sm text-red-500 text-center">{locationError}</p>
            )}
          </div>
        )}
      </div>
      {(tab === 'area' || tab === 'station') && (
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 shadow-lg rounded-b-3xl z-10">
          <div className="flex gap-2">
            <button 
              onClick={() => {
                setSelectedAreas([]);
                setSelectedStations([]);
              }}
              className="px-4 py-4 rounded-xl font-bold transition-all bg-gray-200 text-gray-600 hover:bg-gray-300 active:scale-[0.98]"
            >
              クリア
            </button>
            <button 
              onClick={handleConfirm}
              className="flex-1 py-4 rounded-xl font-bold shadow-lg transition-all bg-teal-500 text-white hover:bg-teal-600 active:scale-[0.98]"
            >
              決定
            </button>
          </div>
        </div>
      )}
    </div>
  );
};


