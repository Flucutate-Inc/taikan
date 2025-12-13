/**
 * API仕様に基づく型定義
 */

// ステータスコード定義
export type StatusCode = 'available' | 'few' | 'full' | 'unknown';

// ステータス表示
export interface ScheduleSlot {
  time: string;
  status: '○' | '△' | '×' | '-';
  status_code: StatusCode;
}

// コート情報
export interface Courts {
  badminton?: number;
  tableTennis?: number;
  basketball?: number;
  volleyball?: number;
  futsal?: number;
  pool?: number;
}

// 施設情報（一覧用）
export interface Gym {
  id: number;
  name: string;
  distance: string;
  area_id?: string; // areasコレクションのドキュメントID
  address: string;
  courts: Courts;
  tags: string[];
}

// 施設詳細情報
export interface GymDetail extends Gym {
  tel?: string;
  format: string;
  restrictions: string[];
  parking: string;
}

// 施設検索レスポンス
export interface GymsResponse {
  total: number;
  items: Gym[];
}

// カレンダー日データ
export interface CalendarDay {
  day: number;
  available_count: number;
  status: 'available' | 'few' | 'full';
}

// カレンダーレスポンス
export interface CalendarResponse {
  year: number;
  month: number;
  days: CalendarDay[];
}

// エラーレスポンス
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

// 検索条件
export interface SearchConditions {
  area?: string;
  date?: string;
  sport?: string;
  keyword?: string;
  lat?: number;
  lng?: number;
}

// ページタイプ
export type PageType = 'top' | 'list' | 'detail';

// ナビゲーションタブ
export type NavTab = 'search' | 'favorites' | 'history';

// モーダルタイプ
export type ModalType = 'area' | 'date' | 'sport' | null;

// 都道府県データ
export interface PrefectureData {
  [prefecture: string]: string[];
}


