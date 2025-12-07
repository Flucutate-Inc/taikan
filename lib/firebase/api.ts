/**
 * Firebase APIラッパー関数
 * Firestoreクエリをコンポーネントから分離
 */

import { collection, getDocs, doc, getDoc, query, where, Query } from 'firebase/firestore';
import { db } from './config';
import type { Gym, GymDetail, GymsResponse, CalendarResponse, SearchConditions } from '@/types';

/**
 * 施設検索・一覧取得
 */
export async function searchGyms(conditions: SearchConditions): Promise<GymsResponse> {
  try {
    let q: Query = collection(db, 'gyms');

    // 検索条件の適用
    if (conditions.area) {
      q = query(q, where('area', '==', conditions.area));
    }
    if (conditions.sport) {
      q = query(q, where('tags', 'array-contains', conditions.sport));
    }

    const snapshot = await getDocs(q);
    const items: Gym[] = snapshot.docs.map(doc => ({
      id: doc.data().id,
      name: doc.data().name,
      distance: doc.data().distance || '距離不明',
      area: doc.data().area,
      address: doc.data().address,
      courts: doc.data().courts || {},
      tags: doc.data().tags || [],
      schedule: doc.data().schedule || [],
    }));

    return {
      total: items.length,
      items,
    };
  } catch (error) {
    console.error('Error fetching gyms:', error);
    return { total: 0, items: [] };
  }
}

/**
 * 施設詳細取得
 */
export async function getGymDetail(id: number): Promise<GymDetail | null> {
  try {
    const snapshot = await getDocs(query(collection(db, 'gyms'), where('id', '==', id)));
    
    if (snapshot.empty) {
      return null;
    }

    const data = snapshot.docs[0].data();
    return {
      id: data.id,
      name: data.name,
      distance: data.distance || '距離不明',
      area: data.area,
      address: data.address,
      tel: data.tel,
      courts: data.courts || {},
      tags: data.tags || [],
      format: data.format || '',
      restrictions: data.restrictions || [],
      parking: data.parking || '',
      schedule: data.schedule || [],
    };
  } catch (error) {
    console.error('Error fetching gym detail:', error);
    return null;
  }
}

/**
 * カレンダー用月間空き状況取得
 */
export async function getCalendarAvailability(
  year: number,
  month: number,
  conditions?: Partial<SearchConditions>
): Promise<CalendarResponse | null> {
  try {
    // 実装例：実際のAPIまたはFirestoreクエリを使用
    // この例ではモックデータを返す
    return {
      year,
      month,
      days: [],
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

