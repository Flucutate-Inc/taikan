/**
 * PDFパーサからopen_slotsへの変換スクリプト
 * 
 * 使い方:
 * 1. Firebaseエミュレーターを起動: npm run firebase:emulators
 * 2. このスクリプトを実行: npx ts-node scripts/parse-pdf-to-slots.ts
 */

import { convertPDFToOpenSlots, type ParsedPDFData } from '../lib/firebase/pdf-parser';

/**
 * モックPDFパーサの出力データ
 * 実際の実装では、PDFパーサライブラリから取得したデータを使用
 */
const mockParsedPDFData: ParsedPDFData = {
  gym_id: 'gym_3c9fH7pQrtkWN7Ldq9uG', // 渋谷区スポーツセンター（実際のIDに置き換える）
  source_id: 'source_ya6BkbnZ4zC7eh0cl01h', // 実際のIDに置き換える
  slots: [
    {
      date: '2024-12-20',
      start_time: '09:00',
      end_time: '11:00',
      sport_name: 'バドミントン',
      status: 'available',
      capacity: 24,
      remaining: 10,
      reception_type: 'same_day',
      target: '高校生以上',
      notes: 'ラケット持参',
    },
    {
      date: '2024-12-20',
      start_time: '11:00',
      end_time: '13:00',
      sport_name: 'バドミントン',
      status: 'few',
      capacity: 24,
      remaining: 3,
      reception_type: 'same_day',
      target: '高校生以上',
      notes: 'ラケット持参',
    },
    {
      date: '2024-12-20',
      start_time: '15:00',
      end_time: '17:00',
      sport_name: '卓球',
      status: 'available',
      capacity: 12,
      remaining: 8,
      reception_type: 'same_day',
      target: '中学生以上',
      notes: '',
    },
    {
      date: '2024-12-21',
      start_time: '09:00',
      end_time: '11:00',
      sport_name: 'バドミントン',
      status: 'available',
      capacity: 24,
      remaining: 15,
      reception_type: 'same_day',
      target: '高校生以上',
      notes: 'ラケット持参',
    },
    {
      date: '2024-12-21',
      start_time: '13:00',
      end_time: '15:00',
      sport_name: '卓球',
      status: 'full',
      capacity: 12,
      remaining: 0,
      reception_type: 'same_day',
      target: '中学生以上',
      notes: '',
    },
  ],
  metadata: {
    parsed_at: new Date(),
    parser_version: 'v1.2',
    page_count: 1,
  },
};

async function main() {
  console.log('🔄 Starting PDF to open_slots conversion...\n');
  
  try {
    const result = await convertPDFToOpenSlots(mockParsedPDFData);
    
    console.log('\n📊 Conversion Summary:');
    console.log(`  ✅ Success: ${result.success} slots`);
    console.log(`  ❌ Failed: ${result.failed} slots`);
    
    if (result.errors.length > 0) {
      console.log('\n⚠️ Errors:');
      result.errors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    if (result.success > 0) {
      console.log('\n✅ PDF data successfully converted to open_slots!');
      console.log('🔗 Check Firebase Emulator UI: http://localhost:4000');
    }
  } catch (error) {
    console.error('❌ Conversion failed:', error);
    process.exit(1);
  }
}

// スクリプト実行
if (require.main === module) {
  main();
}

