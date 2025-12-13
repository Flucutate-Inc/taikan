/**
 * PDFパーサの使用例
 * 
 * このファイルは、PDFパーサの実装例を示すためのものです。
 * 実際のPDFパーサは別のライブラリ（pdf-parse、pdfjs-dist等）を使用します。
 */

import { convertPDFToOpenSlots, type ParsedPDFData } from './pdf-parser';

/**
 * 例：PDFパーサの実装（モック）
 * 
 * 実際の実装では、以下のような流れになります：
 * 1. PDFファイルを読み込む
 * 2. PDFからテキスト/テーブルを抽出
 * 3. 日付、時間、競技、空き状況などをパース
 * 4. ParsedPDFData形式に変換
 * 5. convertPDFToOpenSlots()を呼び出してFirestoreに投入
 */
export async function parsePDFExample(
  pdfUrl: string,
  gymId: string,
  sourceId: string
): Promise<ParsedPDFData> {
  // 実際の実装例（モック）
  // const pdfBuffer = await fetch(pdfUrl).then(res => res.arrayBuffer());
  // const pdfData = await pdfParse(pdfBuffer);
  // const text = pdfData.text;
  
  // テキストから情報を抽出（正規表現やNLPを使用）
  // const slots = extractSlotsFromText(text);
  
  // モックデータ
  const parsedData: ParsedPDFData = {
    gym_id: gymId,
    source_id: sourceId,
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
    ],
    metadata: {
      parsed_at: new Date(),
      parser_version: 'v1.2',
      page_count: 1,
    },
  };

  return parsedData;
}

/**
 * PDFパーサの実行例
 */
export async function runPDFParserExample() {
  try {
    // 1. PDFをパース
    const parsedData = await parsePDFExample(
      'https://example.com/schedule.pdf',
      'gym_xxx',
      'source_xxx'
    );

    // 2. open_slotsに変換して投入
    const result = await convertPDFToOpenSlots(parsedData);
    
    console.log('📊 Conversion result:', result);
    return result;
  } catch (error) {
    console.error('❌ PDF parsing failed:', error);
    throw error;
  }
}

