/**
 * Firebase APIラッパー関数
 * Firestoreクエリをコンポーネントから分離
 */

import { collection, getDocs, doc, getDoc, query, where, Query, addDoc, Timestamp } from 'firebase/firestore';
import { db } from './config';
import type { Gym, GymDetail, GymsResponse, CalendarResponse, CalendarDay, SearchConditions, StatusCode, ScheduleSlot } from '@/types';

/**
 * 施設検索・一覧取得（open_slotsベース）
 */
export async function searchGyms(conditions: SearchConditions): Promise<GymsResponse> {
  try {
    console.log('🔍 searchGyms called with conditions:', conditions);
    
    // 検索条件がない場合は、すべてのopen_slotsを取得
    // open_slotsから検索条件に一致するスロットを取得
    let slotsQuery: Query = collection(db, 'open_slots');

    // 日付条件
    if (conditions.date) {
      console.log('📅 Filtering by date:', conditions.date);
      // 日付形式をYYYY-MM-DDに変換
      // "11月29日, 12月1日"のような形式から最初の日付を取得
      const dateParts = conditions.date.split(',')[0].trim();
      let dateStr = '';
      
      // "11月29日"形式をYYYY-MM-DDに変換
      const match = dateParts.match(/(\d+)月(\d+)日/);
      if (match) {
        const month = parseInt(match[1], 10);
        const day = parseInt(match[2], 10);
        const now = new Date();
        const year = now.getFullYear();
        // 月が現在より前の場合は来年
        const targetYear = month < now.getMonth() + 1 ? year + 1 : year;
        dateStr = `${targetYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      } else if (conditions.date.includes('-')) {
        // 既にYYYY-MM-DD形式の場合
        dateStr = conditions.date;
      }
      
      if (dateStr) {
        console.log('📅 Converted date:', dateStr);
        slotsQuery = query(slotsQuery, where('date', '==', dateStr));
      }
    }

    // エリア条件
    if (conditions.area) {
      console.log('📍 Filtering by area:', conditions.area);
      // area名からarea_idを取得
      const areasSnapshot = await getDocs(query(collection(db, 'areas'), where('name', '==', conditions.area)));
      if (!areasSnapshot.empty) {
        const areaId = areasSnapshot.docs[0].id;
        console.log('📍 Found area_id:', areaId);
        slotsQuery = query(slotsQuery, where('area_id', '==', `area_${areaId}`));
      } else {
        console.warn('⚠️ Area not found:', conditions.area);
        return { total: 0, items: [] };
      }
    }

    // 競技条件
    if (conditions.sport) {
      console.log('🏃 Filtering by sport:', conditions.sport);
      // sport名からsport_idを取得
      const sportsSnapshot = await getDocs(query(collection(db, 'sports'), where('name', '==', conditions.sport)));
      if (!sportsSnapshot.empty) {
        const sportId = sportsSnapshot.docs[0].id;
        console.log('🏃 Found sport_id:', sportId);
        slotsQuery = query(slotsQuery, where('sport_id', '==', `sport_${sportId}`));
      } else {
        console.warn('⚠️ Sport not found:', conditions.sport);
        return { total: 0, items: [] };
      }
    }

    // ステータスでフィルタリング（availableまたはfewのみ）
    slotsQuery = query(slotsQuery, where('status', 'in', ['available', 'few']));

    console.log('📡 Fetching open_slots from Firestore...');
    const slotsSnapshot = await getDocs(slotsQuery);
    console.log('📊 Firestore returned:', slotsSnapshot.docs.length, 'slots');

    // ユニークなgym_idを取得
    const uniqueGymIds = new Set<string>();
    slotsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const gymId = data.gym_id; // "gym_xxx"形式
      if (gymId) {
        // "gym_"プレフィックスを削除してドキュメントIDを取得
        const gymDocId = gymId.replace('gym_', '');
        uniqueGymIds.add(gymDocId);
      }
    });

    console.log('🏋️ Found unique gyms:', uniqueGymIds.size);
    
    // open_slotsが0件の場合で、検索条件がない場合は、gymsコレクションから直接取得
    if (uniqueGymIds.size === 0 && !conditions.date && !conditions.area && !conditions.sport && !conditions.keyword) {
      console.log('📋 No open_slots found and no search conditions, fetching all gyms...');
      const allGymsSnapshot = await getDocs(collection(db, 'gyms'));
      allGymsSnapshot.docs.forEach(doc => {
        uniqueGymIds.add(doc.id);
      });
      console.log('🏋️ Found all gyms:', uniqueGymIds.size);
    }

    // gymsコレクションから該当する施設を取得
    const gyms: Gym[] = [];
    const areasSnapshot = await getDocs(collection(db, 'areas'));
    const areaIdToNameMap: Record<string, string> = {};
    areasSnapshot.docs.forEach(doc => {
      areaIdToNameMap[doc.id] = doc.data().name;
    });

    // 今日の日付（今日以降のスロットのみ表示）
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // gym_idごとのスロットをマップ
    const slotsByGymId: Record<string, any[]> = {};
    slotsSnapshot.docs.forEach(doc => {
      const slotData = doc.data();
      const gymId = slotData.gym_id;
      if (gymId) {
        if (!slotsByGymId[gymId]) {
          slotsByGymId[gymId] = [];
        }
        slotsByGymId[gymId].push(slotData);
      }
    });

    for (const gymDocId of Array.from(uniqueGymIds)) {
      try {
        const gymDoc = await getDoc(doc(db, 'gyms', gymDocId));
        if (gymDoc.exists()) {
          const data = gymDoc.data();
          // area_idからarea名を取得（area_idが"area_xxx"形式の場合とそうでない場合に対応）
          const areaId = data.area_id;
          const areaDocId = areaId && typeof areaId === 'string' 
            ? areaId.replace('area_', '') 
            : areaId;
          const areaName = areaDocId ? areaIdToNameMap[areaDocId] : undefined;
          
          // 該当gymのスロットを取得
          const gymId = `gym_${gymDocId}`;
          const gymSlots = slotsByGymId[gymId] || [];
          
          // 今日以降のスロットを日付ごとにグループ化
          const weekDayNames = ['日', '月', '火', '水', '木', '金', '土'];
          const dateHasAvailable = new Set<string>();
          const allDates = new Set<string>();
          
          gymSlots.forEach(slot => {
            if (slot.date >= todayStr) {
              allDates.add(slot.date);
              if (slot.status === 'available' || slot.status === 'few') {
                dateHasAvailable.add(slot.date);
              }
            }
          });
          
          // 日付順にソートしてschedule配列に変換
          const schedule: ScheduleSlot[] = Array.from(allDates)
            .sort()
            .map(dateStr => {
              const [y, m, d] = dateStr.split('-').map(Number);
              const dateObj = new Date(y, m - 1, d);
              const dow = weekDayNames[dateObj.getDay()];
              const hasAvail = dateHasAvailable.has(dateStr);
              return {
                date: dateStr,
                label: `${m}/${d}(${dow})`,
                status: hasAvail ? '○' as const : '×' as const,
                status_code: hasAvail ? 'available' as StatusCode : 'full' as StatusCode,
              };
            });
          
          gyms.push({
            id: data.id,
            name: data.name,
            distance: data.distance || '距離不明',
            area_id: data.area_id,
            address: data.address,
            tel: data.tel,
            courts: data.courts || {},
            tags: data.tags || [],
            // 詳細情報も含める
            format: data.format || '',
            restrictions: data.restrictions || [],
            parking: data.parking || '',
            // 表示用にscheduleを追加（型定義には含めない）
            schedule: schedule,
            // 表示用にarea名を追加（型定義には含めない）
            ...(areaName && { area: areaName }),
          } as any);
        }
      } catch (error) {
        console.warn(`⚠️ Failed to fetch gym ${gymDocId}:`, error);
      }
    }

    console.log('✅ searchGyms returning:', gyms.length, 'items');
    return {
      total: gyms.length,
      items: gyms,
    };
  } catch (error) {
    console.error('❌ Error fetching gyms:', error);
    return { total: 0, items: [] };
  }
}

/**
 * 施設詳細取得
 */
export async function getGymDetail(id: number, targetDate?: string): Promise<GymDetail | null> {
  try {
    const snapshot = await getDocs(query(collection(db, 'gyms'), where('id', '==', id)));
    
    if (snapshot.empty) {
      return null;
    }

    const data = snapshot.docs[0];
    const gymData = data.data();
    const gymDocId = data.id;
    
    // area_idからarea名を取得
    let areaName: string | undefined;
    if (gymData.area_id) {
      const areaDoc = await getDoc(doc(db, 'areas', gymData.area_id));
      if (areaDoc.exists()) {
        areaName = areaDoc.data().name;
      }
    }
    
    // open_slotsから該当gymのスロットを取得（今日以降の全日付）
    const gymId = `gym_${gymDocId}`;
    let schedule: ScheduleSlot[] = [];
    
    try {
      const todayForDetail = new Date();
      const todayStrForDetail = `${todayForDetail.getFullYear()}-${String(todayForDetail.getMonth() + 1).padStart(2, '0')}-${String(todayForDetail.getDate()).padStart(2, '0')}`;
      
      const slotsSnapshot = await getDocs(
        query(
          collection(db, 'open_slots'),
          where('gym_id', '==', gymId),
          where('date', '>=', todayStrForDetail),
          where('status', 'in', ['available', 'few'])
        )
      );
      
      const weekDayNames = ['日', '月', '火', '水', '木', '金', '土'];
      const dateHasAvailable = new Set<string>();
      const allDates = new Set<string>();
      
      slotsSnapshot.docs.forEach(d => {
        const slot = d.data();
        allDates.add(slot.date);
        if (slot.status === 'available' || slot.status === 'few') {
          dateHasAvailable.add(slot.date);
        }
      });
      
      schedule = Array.from(allDates)
        .sort()
        .map(dateStr => {
          const [y, m, d] = dateStr.split('-').map(Number);
          const dateObj = new Date(y, m - 1, d);
          const dow = weekDayNames[dateObj.getDay()];
          const hasAvail = dateHasAvailable.has(dateStr);
          return {
            date: dateStr,
            label: `${m}/${d}(${dow})`,
            status: hasAvail ? '○' as const : '×' as const,
            status_code: hasAvail ? 'available' as StatusCode : 'full' as StatusCode,
          };
        });
    } catch (error) {
      console.warn('⚠️ Failed to fetch schedule:', error);
    }
    
    return {
      id: gymData.id,
      name: gymData.name,
      distance: gymData.distance || '距離不明',
      area_id: gymData.area_id,
      address: gymData.address,
      tel: gymData.tel,
      courts: gymData.courts || {},
      tags: gymData.tags || [],
      format: gymData.format || '',
      restrictions: gymData.restrictions || [],
      parking: gymData.parking || '',
      // 表示用にscheduleを追加（型定義には含めない）
      schedule: schedule,
      // 表示用にarea名を追加（型定義には含めない）
      ...(areaName && { area: areaName }),
    } as any;
  } catch (error) {
    console.error('Error fetching gym detail:', error);
    return null;
  }
}

/**
 * カレンダー用月間空き状況取得（open_slotsベース）
 */
export async function getCalendarAvailability(
  year: number,
  month: number,
  conditions?: Partial<SearchConditions>
): Promise<CalendarResponse | null> {
  try {
    console.log('📅 getCalendarAvailability called:', { year, month, conditions });
    
    // 月の開始日と終了日を計算
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
    
    // open_slotsから該当月のデータを取得
    // Firestoreでは1つのフィールドに対して1つの範囲クエリしか使えないので、
    // date >= startDateで取得してから、クライアント側でdate <= endDateでフィルタリング
    let slotsQuery: Query = query(
      collection(db, 'open_slots'),
      where('date', '>=', startDate)
    );
    
    // エリア条件
    if (conditions?.area) {
      const areasSnapshot = await getDocs(query(collection(db, 'areas'), where('name', '==', conditions.area)));
      if (!areasSnapshot.empty) {
        const areaId = areasSnapshot.docs[0].id;
        slotsQuery = query(slotsQuery, where('area_id', '==', `area_${areaId}`));
      }
    }
    
    // 競技条件
    if (conditions?.sport) {
      const sportsSnapshot = await getDocs(query(collection(db, 'sports'), where('name', '==', conditions.sport)));
      if (!sportsSnapshot.empty) {
        const sportId = sportsSnapshot.docs[0].id;
        slotsQuery = query(slotsQuery, where('sport_id', '==', `sport_${sportId}`));
      }
    }
    
    // ステータスでフィルタリング（availableまたはfewのみ）
    slotsQuery = query(slotsQuery, where('status', 'in', ['available', 'few']));
    
    const slotsSnapshot = await getDocs(slotsQuery);
    
    // 日付ごとに集計（endDate以下でフィルタリング）
    const dayCounts: Record<number, number> = {};
    slotsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const dateStr = data.date; // "YYYY-MM-DD"
      
      // endDate以下でフィルタリング（文字列比較でOK）
      if (dateStr <= endDate) {
        const day = parseInt(dateStr.split('-')[2], 10);
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      }
    });
    
    // カレンダー日データに変換
    const days: CalendarDay[] = Object.entries(dayCounts).map(([day, count]) => ({
      day: parseInt(day, 10),
      available_count: count,
      status: count > 5 ? 'available' : count > 0 ? 'few' : 'full',
    }));
    
    return {
      year,
      month,
      days,
    };
  } catch (error) {
    console.error('Error fetching calendar:', error);
    return null;
  }
}

/**
 * マスターデータ取得（エリア）
 */
export async function getAreas(): Promise<string[]> {
  try {
    const snapshot = await getDocs(collection(db, 'areas'));
    return snapshot.docs.map(doc => doc.data().name);
  } catch (error) {
    console.error('Error fetching areas:', error);
    return [];
  }
}

/**
 * マスターデータ取得（競技）
 */
export async function getSports(): Promise<string[]> {
  try {
    const snapshot = await getDocs(collection(db, 'sports'));
    return snapshot.docs.map(doc => doc.data().name);
  } catch (error) {
    console.error('Error fetching sports:', error);
    return [];
  }
}

/**
 * 体育館のURLを登録（sourcesコレクションに追加）
 * 登録後、自動的にPDFパーサーを実行してgyms/open_slotsに追加
 */
export async function updateGymName(gymId: string, gymName: string): Promise<void> {
  const response = await fetch('/api/update-gym', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gymId, gymName }),
  });
  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || '施設名の更新に失敗しました');
  }
}

export async function registerGymSource(url: string): Promise<{
  sourceId: string;
  gymId?: string;
  gymName?: string;
  gymNameAutoDetected?: boolean;
  areaName?: string;
  slotsAdded?: number;
  slotsFailed?: number;
  summary?: {
    totalSlots: number;
    dates: string[];
    sports: string[];
    dateCount: number;
    sportCount: number;
  };
}> {
  try {
    console.log('📝 Registering gym source URL:', url);
    
    const type = url.toLowerCase().endsWith('.pdf') ? 'pdf' : 'web';
    
    const sourcePromise = addDoc(collection(db, 'sources'), {
      gym_id: null,
      type: type,
      url: url,
      last_checked_at: Timestamp.now(),
      parser_version: 'v2.0',
    });
    
    const docRef = await Promise.race([
      sourcePromise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Firebaseへの接続に失敗しました。エミュレーターが起動しているか確認してください（npm run firebase:emulators）')), 10000)
      ),
    ]);
    
    const sourceId = docRef.id;
    console.log('✅ Source registered with ID:', sourceId);
    
    if (type === 'pdf') {
      try {
        console.log('🔄 Starting automatic PDF parsing...');
        const response = await fetch('/api/parse-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceId, url }),
        });
        
        const result = await response.json();
        
        if (!response.ok || !result.success) {
          throw new Error(result.message || 'PDF解析に失敗しました');
        }
        
        console.log('✅ PDF parsing completed:', result);
        
        return {
          sourceId,
          gymId: result.gymId,
          gymName: result.gymName,
          gymNameAutoDetected: result.gymNameAutoDetected,
          areaName: result.areaName,
          slotsAdded: result.slotsAdded,
          slotsFailed: result.slotsFailed,
          summary: result.summary,
        };
      } catch (parseError) {
        console.error('❌ PDF parsing failed:', parseError);
        const errorMessage = parseError instanceof Error 
          ? parseError.message 
          : 'PDF解析に失敗しました';
        throw new Error(`PDF解析エラー: ${errorMessage}`);
      }
    }
    
    return { sourceId };
  } catch (error) {
    console.error('Error registering gym source:', error);
    throw error;
  }
}

