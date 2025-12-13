/**
 * Firebase APIラッパー関数
 * Firestoreクエリをコンポーネントから分離
 */

import { collection, getDocs, doc, getDoc, query, where, Query, addDoc, Timestamp } from 'firebase/firestore';
import { db } from './config';
import type { Gym, GymDetail, GymsResponse, CalendarResponse, SearchConditions, StatusCode, ScheduleSlot } from '@/types';

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

    // 日付を取得（表示用のschedule生成に使用）
    let targetDate: string | null = null;
    if (conditions.date) {
      const dateParts = conditions.date.split(',')[0].trim();
      const match = dateParts.match(/(\d+)月(\d+)日/);
      if (match) {
        const month = parseInt(match[1], 10);
        const day = parseInt(match[2], 10);
        const now = new Date();
        const year = now.getFullYear();
        const targetYear = month < now.getMonth() + 1 ? year + 1 : year;
        targetDate = `${targetYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      } else if (conditions.date.includes('-')) {
        targetDate = conditions.date;
      }
    } else {
      // 日付が指定されていない場合は今日の日付を使用
      const today = new Date();
      targetDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    }

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

    for (const gymDocId of uniqueGymIds) {
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
          
          // 指定日（または今日）のスロットをフィルタリングしてschedule形式に変換
          const todaySlots = targetDate 
            ? gymSlots.filter(slot => slot.date === targetDate)
            : gymSlots;
          
          // 時間帯ごとに集約（同じ時間帯のスロットをまとめる）
          const timeSlotMap: Record<string, { status: string; status_code: string }> = {};
          todaySlots.forEach(slot => {
            const timeKey = slot.start_time;
            // 複数のスロットがある場合は、最も空いているものを優先
            if (!timeSlotMap[timeKey] || 
                (slot.status === 'available' && timeSlotMap[timeKey].status_code !== 'available') ||
                (slot.status === 'few' && timeSlotMap[timeKey].status_code === 'full')) {
              timeSlotMap[timeKey] = {
                status: slot.status === 'available' ? '○' : slot.status === 'few' ? '△' : slot.status === 'full' ? '×' : '-',
                status_code: slot.status,
              };
            }
          });
          
          // schedule配列に変換（時間順にソート）
          const schedule = Object.entries(timeSlotMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([time, status]) => ({
              time,
              status: status.status as '○' | '△' | '×' | '-',
              status_code: status.status_code as StatusCode,
            }));
          
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
    
    // open_slotsから該当gymのスロットを取得
    const gymId = `gym_${gymDocId}`;
    let schedule: ScheduleSlot[] = [];
    
    try {
      // 日付が指定されていない場合は今日の日付を使用
      const date = targetDate || (() => {
        const today = new Date();
        return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      })();
      
      const slotsSnapshot = await getDocs(
        query(
          collection(db, 'open_slots'),
          where('gym_id', '==', gymId),
          where('date', '==', date),
          where('status', 'in', ['available', 'few'])
        )
      );
      
      // 時間帯ごとに集約
      const timeSlotMap: Record<string, { status: string; status_code: string }> = {};
      slotsSnapshot.docs.forEach(doc => {
        const slot = doc.data();
        const timeKey = slot.start_time;
        if (!timeSlotMap[timeKey] || 
            (slot.status === 'available' && timeSlotMap[timeKey].status_code !== 'available') ||
            (slot.status === 'few' && timeSlotMap[timeKey].status_code === 'full')) {
          timeSlotMap[timeKey] = {
            status: slot.status === 'available' ? '○' : slot.status === 'few' ? '△' : slot.status === 'full' ? '×' : '-',
            status_code: slot.status,
          };
        }
      });
      
      // schedule配列に変換（時間順にソート）
      schedule = Object.entries(timeSlotMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([time, status]) => ({
          time,
          status: status.status as '○' | '△' | '×' | '-',
          status_code: status.status_code as StatusCode,
        }));
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
export async function registerGymSource(url: string): Promise<{
  sourceId: string;
  gymId?: string;
  slotsAdded?: number;
}> {
  try {
    console.log('📝 Registering gym source URL:', url);
    
    // URLからタイプを判定（PDFかWebか）
    const type = url.toLowerCase().endsWith('.pdf') ? 'pdf' : 'web';
    
    // sourcesコレクションに追加
    const docRef = await addDoc(collection(db, 'sources'), {
      gym_id: null, // まだgym_idが不明な場合はnull（後でパーサーが設定）
      type: type,
      url: url,
      last_checked_at: Timestamp.now(),
      parser_version: 'v1.0',
    });
    
    const sourceId = docRef.id;
    console.log('✅ Source registered with ID:', sourceId);
    
    // PDFの場合は自動的にパーサーを実行
    if (type === 'pdf') {
      try {
        console.log('🔄 Starting automatic PDF parsing...');
        const response = await fetch('/api/parse-pdf', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sourceId,
            url,
          }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to parse PDF');
        }
        
        const result = await response.json();
        console.log('✅ PDF parsing completed:', result);
        
        if (!result.success) {
          throw new Error(result.message || 'PDF parsing failed');
        }
        
        return {
          sourceId,
          gymId: result.gymId,
          slotsAdded: result.slotsAdded,
        };
      } catch (parseError) {
        console.error('❌ PDF parsing failed:', parseError);
        // エラーを再スローして、フロントエンドで適切に処理できるようにする
        const errorMessage = parseError instanceof Error 
          ? parseError.message 
          : 'PDF解析に失敗しました';
        throw new Error(`PDF解析エラー: ${errorMessage}`);
      }
    }
    
    // Webの場合はパーサーを実行しない（将来実装）
    return {
      sourceId,
    };
  } catch (error) {
    console.error('Error registering gym source:', error);
    throw error;
  }
}

