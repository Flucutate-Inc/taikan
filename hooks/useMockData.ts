/**
 * モックデータ用Hook（開発用）
 */

import { Gym } from '@/types';

export const MOCK_GYM_DATA: Gym[] = [
  {
    id: 1,
    name: '渋谷区スポーツセンター',
    distance: '現在地から 1.2km',
    address: '東京都渋谷区西原1-40-18',
    courts: { badminton: 6, tableTennis: 12 },
    tags: ['バドミントン', '卓球'],
    schedule: [
      { date: '2026-03-21', label: '3/21(土)', status: '○', status_code: 'available' },
      { date: '2026-03-22', label: '3/22(日)', status: '○', status_code: 'available' },
      { date: '2026-03-23', label: '3/23(月)', status: '×', status_code: 'full' },
      { date: '2026-03-25', label: '3/25(水)', status: '○', status_code: 'available' },
      { date: '2026-03-26', label: '3/26(木)', status: '○', status_code: 'available' },
    ],
  },
  {
    id: 2,
    name: '新宿コズミックセンター',
    distance: '現在地から 2.5km',
    address: '東京都新宿区大久保3-1-2',
    courts: { badminton: 8 },
    tags: ['バドミントン'],
    schedule: [
      { date: '2026-03-21', label: '3/21(土)', status: '×', status_code: 'full' },
      { date: '2026-03-22', label: '3/22(日)', status: '○', status_code: 'available' },
      { date: '2026-03-23', label: '3/23(月)', status: '○', status_code: 'available' },
    ],
  },
  {
    id: 3,
    name: '中央区立総合スポーツセンター',
    distance: '現在地から 4.8km',
    address: '東京都中央区日本橋浜町2-59-1',
    courts: { tableTennis: 20, badminton: 4 },
    tags: ['卓球', 'バドミントン', '弓道'],
    schedule: [
      { date: '2026-03-21', label: '3/21(土)', status: '○', status_code: 'available' },
      { date: '2026-03-22', label: '3/22(日)', status: '○', status_code: 'available' },
      { date: '2026-03-25', label: '3/25(水)', status: '○', status_code: 'available' },
      { date: '2026-03-26', label: '3/26(木)', status: '○', status_code: 'available' },
      { date: '2026-03-28', label: '3/28(土)', status: '○', status_code: 'available' },
    ],
  },
];

export function useMockGyms() {
  return { gyms: MOCK_GYM_DATA, loading: false, error: null };
}


