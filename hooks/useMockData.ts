/**
 * モックデータ用Hook（開発用）
 */

import { Gym } from '@/types';

export const MOCK_GYM_DATA: Gym[] = [
  {
    id: 1,
    name: '渋谷区スポーツセンター',
    distance: '現在地から 1.2km',
    area: '渋谷区',
    address: '東京都渋谷区西原1-40-18',
    courts: { badminton: 6, tableTennis: 12 },
    tags: ['バドミントン', '卓球', 'プール'],
    schedule: [
      { time: '09:00', status: '○', status_code: 'available' },
      { time: '11:00', status: '△', status_code: 'few' },
      { time: '13:00', status: '×', status_code: 'full' },
      { time: '15:00', status: '○', status_code: 'available' },
      { time: '17:00', status: '○', status_code: 'available' },
      { time: '19:00', status: '×', status_code: 'full' },
    ],
  },
  {
    id: 2,
    name: '新宿コズミックセンター',
    distance: '現在地から 2.5km',
    area: '新宿区',
    address: '東京都新宿区大久保3-1-2',
    courts: { basketball: 2, badminton: 8 },
    tags: ['バスケットボール', 'バドミントン'],
    schedule: [
      { time: '09:00', status: '×', status_code: 'full' },
      { time: '11:00', status: '○', status_code: 'available' },
      { time: '13:00', status: '○', status_code: 'available' },
      { time: '15:00', status: '△', status_code: 'few' },
      { time: '17:00', status: '×', status_code: 'full' },
      { time: '19:00', status: '×', status_code: 'full' },
    ],
  },
  {
    id: 3,
    name: '中央区立総合スポーツセンター',
    distance: '現在地から 4.8km',
    area: '中央区',
    address: '東京都中央区日本橋浜町2-59-1',
    courts: { tableTennis: 20, badminton: 4 },
    tags: ['卓球', 'バドミントン', '弓道'],
    schedule: [
      { time: '09:00', status: '○', status_code: 'available' },
      { time: '11:00', status: '○', status_code: 'available' },
      { time: '13:00', status: '○', status_code: 'available' },
      { time: '15:00', status: '○', status_code: 'available' },
      { time: '17:00', status: '△', status_code: 'few' },
      { time: '19:00', status: '○', status_code: 'available' },
    ],
  },
];

export function useMockGyms() {
  return { gyms: MOCK_GYM_DATA, loading: false, error: null };
}

