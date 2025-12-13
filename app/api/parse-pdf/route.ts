/**
 * PDF解析API Route
 * URL登録時に自動的に呼び出される
 */

import { NextRequest, NextResponse } from 'next/server';
import { collection, addDoc, doc, updateDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { convertPDFToOpenSlots, type ParsedPDFData, type ParsedPDFSlot } from '@/lib/firebase/pdf-parser';

/**
 * DeepSeek APIを使用してPDFから体育館情報を抽出
 */
async function parsePDF(url: string): Promise<{
  gymName: string;
  address?: string;
  tel?: string;
  areaName?: string;
  slots: ParsedPDFSlot[];
}> {
  console.log('📄 Parsing PDF from URL with DeepSeek AI:', url);
  
  try {
    // PDFをダウンロード
    const response = await fetch(url);
    if (!response.ok) {
      const errorMessage = `PDF download failed: ${response.status} ${response.statusText}`;
      console.error(`❌ ${errorMessage}`);
      throw new Error(errorMessage);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // pdf-parseでテキストを抽出
    // requireを使用（next.config.jsでexternalizeされているため）
    let pdfData: any;
    try {
      // @ts-ignore - pdf-parseはCommonJSモジュールで型定義が不完全
      const pdfParseModule = require('pdf-parse');
      
      // pdf-parse v2.4.5以降はPDFParseクラスを提供
      // まず、関数として直接呼び出せるか確認
      let pdfParse: any;
      if (typeof pdfParseModule === 'function') {
        // 関数として直接呼び出し可能
        pdfParse = pdfParseModule;
      } else if (pdfParseModule.default && typeof pdfParseModule.default === 'function') {
        // default exportが関数
        pdfParse = pdfParseModule.default;
      } else if (pdfParseModule.PDFParse) {
        // PDFParseクラスの場合、インスタンスを作成してload/getTextメソッドを使用
        const PDFParseClass = pdfParseModule.PDFParse;
        if (typeof PDFParseClass === 'function') {
          // クラスコンストラクタの場合、オプションオブジェクトを渡す
          // verbosityプロパティを設定（ログレベル: 0=エラーのみ, 1=警告, 2=情報）
          pdfParse = async (buf: Buffer) => {
            // PDFParseクラスのコンストラクタにdataを渡し、その後load()を引数なしで呼び出す
            const parser = new PDFParseClass({ verbosity: 0, data: buf });
            await parser.load();
            const text = parser.getText();
            console.log('📝 getText() result type:', typeof text);
            console.log('📝 getText() result length:', text ? text.length : 'null/undefined');
            // getText()がundefinedやnullを返す場合の処理
            if (text === undefined || text === null) {
              console.warn('⚠️ getText() returned undefined/null, trying alternative method');
              // 代替方法: 全ページのテキストを取得
              const doc = parser.doc;
              if (doc) {
                let fullText = '';
                const numPages = doc.numPages || 0;
                for (let i = 1; i <= numPages; i++) {
                  const pageText = parser.getPageText(i);
                  if (pageText) {
                    fullText += pageText + '\n';
                  }
                }
                return { text: fullText || '' };
              }
              return { text: '' };
            }
            return { text: text || '' };
          };
        } else {
          throw new Error(`PDFParse is not a constructor. Type: ${typeof PDFParseClass}`);
        }
      } else {
        const errorMessage = `pdf-parse module is not available. Type: ${typeof pdfParseModule}, Keys: ${Object.keys(pdfParseModule || {}).join(', ')}`;
        console.error(`❌ ${errorMessage}`);
        throw new Error(errorMessage);
      }
      
      pdfData = await pdfParse(buffer);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to parse PDF';
      console.error(`❌ Failed to require/use pdf-parse: ${errorMessage}`);
      throw new Error(`PDF parsing failed: ${errorMessage}`);
    }
    
    const text = pdfData.text;
    
    console.log('📄 PDF text extracted, length:', text.length);
    
    // DeepSeek APIを使用して情報を抽出
    const extractedData = await extractWithDeepSeek(text, url);
    
    // areaNameがnullや空文字列の場合はundefinedに変換
    const normalizedData = {
      ...extractedData,
      areaName: extractedData.areaName && extractedData.areaName.trim() 
        ? extractedData.areaName.trim() 
        : undefined,
    };
    
    console.log('✅ Extracted with AI:', {
      gymName: normalizedData.gymName,
      areaName: normalizedData.areaName,
      address: normalizedData.address,
      tel: normalizedData.tel,
      slotsCount: normalizedData.slots.length,
    });
    
    return normalizedData;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred during PDF parsing';
    console.error(`❌ Error parsing PDF: ${errorMessage}`);
    throw new Error(`PDF parsing failed: ${errorMessage}`);
  }
}

/**
 * DeepSeek APIを使用してPDFテキストから情報を抽出
 */
async function extractWithDeepSeek(text: string, url: string): Promise<{
  gymName: string;
  address?: string;
  tel?: string;
  areaName?: string;
  slots: ParsedPDFSlot[];
}> {
  const deepSeekApiKey = process.env.DEEPSEEK_API_KEY;
  
  if (!deepSeekApiKey) {
    const errorMessage = 'DEEPSEEK_API_KEY environment variable is not set';
    console.error(`❌ ${errorMessage}`);
    throw new Error(errorMessage);
  }
  
  // PDFテキストが長すぎる場合は最初の部分を使用（トークン制限対策）
  const maxTextLength = 8000; // DeepSeekのコンテキスト制限を考慮
  const truncatedText = text.length > maxTextLength 
    ? text.substring(0, maxTextLength) + '\n\n... (テキストが長いため省略)'
    : text;
  
  const prompt = `あなたは体育館の個人開放スケジュールPDFを解析する専門家です。以下のPDFテキストから、体育館情報と空き時間スロットを抽出してください。

PDFテキスト:
${truncatedText}

以下のJSON形式で回答してください。存在しない情報はnullまたは空配列にしてください。

{
  "gymName": "体育館名（例: 渋谷区スポーツセンター）",
  "areaName": "エリア名（例: 渋谷区）",
  "address": "住所（例: 東京都渋谷区西原1-40-18）",
  "tel": "電話番号（例: 03-3468-9051）",
  "slots": [
    {
      "date": "YYYY-MM-DD形式の日付（例: 2024-12-15）",
      "start_time": "HH:mm形式の開始時間（例: 09:00）",
      "end_time": "HH:mm形式の終了時間（例: 11:00）",
      "sport_name": "競技名（例: バドミントン、卓球、バスケットボールなど）",
      "status": "空き状況（available: 空き、few: 少、full: 満、closed: 閉）",
      "capacity": 定員数（不明な場合はnull）,
      "remaining": 残り枠数（不明な場合はnull）,
      "reception_type": "受付方法（same_day: 当日、reservation: 予約制、lottery: 抽選）",
      "target": "対象者（例: 高校生以上）",
      "notes": "備考（例: ラケット持参）"
    }
  ]
}

重要:
- 日付は必ずYYYY-MM-DD形式に変換してください（例: "11月29日" → "2024-11-29"）
- 現在の年を基準に日付を決定してください（2024年または2025年）
- 空き状況は記号（○、△、×、休など）や文字列（空き、少、満、閉など）から適切に判定してください
- 競技名は一般的な名称に統一してください（例: "バレー" → "バレーボール"）
- 時間は24時間形式でHH:mmに統一してください
- スロットが見つからない場合は空配列[]を返してください`;

  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${deepSeekApiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'あなたは体育館の個人開放スケジュールPDFを解析する専門家です。JSON形式で正確に情報を抽出してください。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3, // より一貫性のある結果を得るため低めに設定
        max_tokens: 2000,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content from DeepSeek API');
    }
    
    // JSONを抽出（コードブロックがある場合を考慮）
    let jsonText = content.trim();
    
    // コードブロックを除去
    if (jsonText.startsWith('```')) {
      const lines = jsonText.split('\n');
      const startIndex = lines.findIndex((line: string) => line.includes('{'));
      const endIndex = lines.findLastIndex((line: string) => line.includes('}'));
      jsonText = lines.slice(startIndex, endIndex + 1).join('\n');
    }
    
    // JSONをパース
    const parsed = JSON.parse(jsonText);
    
    // 型を確認して返す（nullや空文字列はundefinedに変換）
    return {
      gymName: parsed.gymName && parsed.gymName.trim() ? parsed.gymName.trim() : '体育館',
      areaName: parsed.areaName && parsed.areaName.trim() ? parsed.areaName.trim() : undefined,
      address: parsed.address && parsed.address.trim() ? parsed.address.trim() : undefined,
      tel: parsed.tel && parsed.tel.trim() ? parsed.tel.trim() : undefined,
      slots: Array.isArray(parsed.slots) ? parsed.slots : [],
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred during DeepSeek API call';
    console.error(`❌ DeepSeek API error: ${errorMessage}`);
    throw new Error(`DeepSeek API extraction failed: ${errorMessage}`);
  }
}

/**
 * 体育館名を抽出
 */
function extractGymName(text: string, url: string): string {
  // パターン1: 「○○体育館」「○○スポーツセンター」などの形式
  const patterns = [
    /([^\s]+(?:体育館|スポーツセンター|コズミック|総合体育館|アリーナ|体育センター))/,
    /([^\s]+(?:Gym|GYM|Sports|SPORTS))/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  // パターン2: URLから推測
  const urlLower = url.toLowerCase();
  if (urlLower.includes('kawaguchi')) {
    return '川口市スポーツセンター';
  } else if (urlLower.includes('shibuya')) {
    return '渋谷区スポーツセンター';
  } else if (urlLower.includes('shinjuku')) {
    return '新宿コズミックセンター';
  } else if (urlLower.includes('chuo')) {
    return '中央区立総合スポーツセンター';
  }
  
  // デフォルト
  return '体育館';
}

/**
 * エリア名を抽出
 */
function extractAreaName(text: string, url: string): string | undefined {
  // パターン1: 「○○市」「○○区」などの形式
  const areaPattern = /([^\s]+(?:市|区|町|村))/;
  const match = text.match(areaPattern);
  if (match && match[1]) {
    return match[1].trim();
  }
  
  // パターン2: URLから推測
  const urlLower = url.toLowerCase();
  if (urlLower.includes('kawaguchi')) {
    return '川口市';
  } else if (urlLower.includes('shibuya')) {
    return '渋谷区';
  } else if (urlLower.includes('shinjuku')) {
    return '新宿区';
  } else if (urlLower.includes('chuo')) {
    return '中央区';
  }
  
  return undefined;
}

/**
 * 住所を抽出
 */
function extractAddress(text: string): string | undefined {
  // 日本の住所パターン（都道府県 + 市区町村 + 番地）
  const addressPatterns = [
    /([都道府県][^\s]+[市区町村][^\s]+[0-9\-]+[^\s]*)/,
    /([東京都|大阪府|京都府|北海道][^\s]+[市区町村][^\s]+[0-9\-]+[^\s]*)/,
  ];
  
  for (const pattern of addressPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return undefined;
}

/**
 * 電話番号を抽出
 */
function extractTel(text: string): string | undefined {
  // 日本の電話番号パターン
  const telPatterns = [
    /(0\d{1,4}[-ー]?\d{1,4}[-ー]?\d{4})/,
    /(0\d{2,3}[-ー]?\d{1,4}[-ー]?\d{4})/,
  ];
  
  for (const pattern of telPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return undefined;
}

/**
 * 空き時間スロットを抽出
 */
function extractSlots(text: string): ParsedPDFSlot[] {
  const slots: ParsedPDFSlot[] = [];
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  // 日付パターン（例: 11月29日、12/1、2024-12-15など）
  const datePatterns = [
    /(\d{1,2})月(\d{1,2})日/g,
    /(\d{4})[-/](\d{1,2})[-/](\d{1,2})/g,
    /(\d{1,2})[/-](\d{1,2})/g,
  ];
  
  // 時間パターン（例: 9:00-11:00、09:00～11:00など）
  const timePattern = /(\d{1,2}):(\d{2})[-～~〜](\d{1,2}):(\d{2})/g;
  
  // 競技名パターン
  const sportPatterns = [
    /(バドミントン|卓球|バスケットボール|バレーボール|テニス|バレー|バスケ|ゲートボール)/g,
  ];
  
  // 空き状況パターン（○、△、×、空き、満、少など）
  const statusPatterns = [
    { pattern: /[○◯〇]|空き|available/i, status: 'available' as const },
    { pattern: /[△▲]|少|few/i, status: 'few' as const },
    { pattern: /[×✕✖]|満|full|×/i, status: 'full' as const },
    { pattern: /休|closed|閉/i, status: 'closed' as const },
  ];
  
  // テキストを行ごとに分割
  const lines = text.split('\n');
  
  // 各行から情報を抽出
  let currentDate: string | null = null;
  let currentSport: string | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // 日付を抽出
    for (const datePattern of datePatterns) {
      const dateMatch = line.match(datePattern);
      if (dateMatch) {
        if (dateMatch[0].includes('月') && dateMatch[0].includes('日')) {
          // "11月29日"形式
          const month = parseInt(dateMatch[1], 10);
          const day = parseInt(dateMatch[2], 10);
          const year = month < currentMonth ? currentYear + 1 : currentYear;
          currentDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        } else if (dateMatch.length >= 3) {
          // "2024-12-15"形式
          const year = dateMatch[1] || String(currentYear);
          const month = dateMatch[2] || String(currentMonth);
          const day = dateMatch[3] || '1';
          currentDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
        break;
      }
    }
    
    // 競技名を抽出
    for (const sportPattern of sportPatterns) {
      const sportMatch = line.match(sportPattern);
      if (sportMatch) {
        currentSport = sportMatch[1];
        break;
      }
    }
    
    // 時間と空き状況を抽出
    const timeMatch = line.match(timePattern);
    if (timeMatch && currentDate) {
      const startHour = parseInt(timeMatch[1], 10);
      const startMin = parseInt(timeMatch[2], 10);
      const endHour = parseInt(timeMatch[3], 10);
      const endMin = parseInt(timeMatch[4], 10);
      
      const startTime = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;
      const endTime = `${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;
      
      // 空き状況を判定
      let status: 'available' | 'few' | 'full' | 'closed' = 'available';
      for (const statusPattern of statusPatterns) {
        if (statusPattern.pattern.test(line)) {
          status = statusPattern.status;
          break;
        }
      }
      
      // スロットを作成
      slots.push({
        date: currentDate,
        start_time: startTime,
        end_time: endTime,
        sport_name: currentSport || 'バドミントン', // デフォルト
        status,
        capacity: null,
        remaining: null,
        reception_type: 'same_day',
        target: '',
        notes: '',
      });
    }
  }
  
  // スロットが見つからない場合は、デフォルトのスロットを生成
  if (slots.length === 0) {
    console.log('⚠️  No slots found in PDF, generating default slots');
    const today = new Date().toISOString().split('T')[0];
    slots.push({
      date: today,
      start_time: '09:00',
      end_time: '11:00',
      sport_name: 'バドミントン',
      status: 'available',
      capacity: null,
      remaining: null,
      reception_type: 'same_day',
      target: '',
      notes: '',
    });
  }
  
  return slots;
}


/**
 * 体育館情報をgymsコレクションに追加
 */
async function addGymToFirestore(
  gymName: string,
  areaName?: string,
  address?: string,
  tel?: string,
  officialUrl?: string
): Promise<string> {
  try {
    // 既に同じ名前の体育館が存在するかチェック
    const existingGyms = await getDocs(
      query(collection(db, 'gyms'), where('name', '==', gymName))
    );
    
    if (!existingGyms.empty) {
      const existingGymId = existingGyms.docs[0].id;
      console.log('ℹ️  Gym already exists:', existingGymId);
      return `gym_${existingGymId}`;
    }
    
    // area_idを取得（areaNameが有効な値の場合のみ）
    let areaId: string | undefined;
    if (areaName && areaName.trim()) {
      const normalizedAreaName = areaName.trim();
      console.log(`🔍 Looking up area: ${normalizedAreaName}`);
      const areasSnapshot = await getDocs(
        query(collection(db, 'areas'), where('name', '==', normalizedAreaName))
      );
      if (!areasSnapshot.empty) {
        areaId = areasSnapshot.docs[0].id;
        console.log(`✅ Found existing area_id: ${areaId}`);
      } else {
        // エリアが存在しない場合は作成
        console.log(`📝 Creating new area: ${normalizedAreaName}`);
        const areaRef = await addDoc(collection(db, 'areas'), {
          name: normalizedAreaName,
        });
        areaId = areaRef.id;
        console.log(`✅ Created new area: ${normalizedAreaName} ${areaId}`);
      }
    } else {
      console.warn(`⚠️ No areaName provided, gym will be created without area_id`);
    }
    
    // 体育館情報を追加
    const gymData: any = {
      id: Date.now(), // 一時的なID（後で更新可能）
      name: gymName,
      address: address || '',
      tel: tel || '',
      distance: '距離不明',
      location: null,
      courts: {},
      tags: [],
      parking: '不明',
      official_url: officialUrl || '',
      format: '個人開放',
      restrictions: [],
    };
    
    // area_idが存在する場合のみ追加（undefinedはFirestoreで許可されない）
    if (areaId) {
      gymData.area_id = `area_${areaId}`;
    }
    
    const gymRef = await addDoc(collection(db, 'gyms'), gymData);
    
    const gymId = `gym_${gymRef.id}`;
    console.log('✅ Created new gym:', gymName, gymId);
    return gymId;
  } catch (error) {
    console.error('Error adding gym to Firestore:', error);
    throw error;
  }
}

/**
 * POST /api/parse-pdf
 * PDFを解析してgyms/open_slotsに追加
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sourceId, url } = body;
    
    if (!sourceId || !url) {
      return NextResponse.json(
        { error: 'sourceId and url are required' },
        { status: 400 }
      );
    }
    
    console.log('🚀 Starting PDF parsing for source:', sourceId);
    
    // 1. PDFを解析
    console.log('📄 Step 1: Parsing PDF...');
    const parsedData = await parsePDF(url);
    console.log('✅ PDF parsing completed:', {
      gymName: parsedData.gymName,
      areaName: parsedData.areaName,
      address: parsedData.address,
      tel: parsedData.tel,
      slotsCount: parsedData.slots.length,
    });
    
    // 2. 体育館情報をgymsに追加
    console.log('🏋️ Step 2: Adding gym to Firestore...');
    const gymId = await addGymToFirestore(
      parsedData.gymName,
      parsedData.areaName,
      parsedData.address,
      parsedData.tel,
      url
    );
    console.log('✅ Gym added with ID:', gymId);
    
    // 3. 空き時間情報をopen_slotsに追加
    console.log('📅 Step 3: Converting slots to open_slots...');
    const parsedPDFData: ParsedPDFData = {
      gym_id: gymId,
      source_id: `source_${sourceId}`,
      slots: parsedData.slots,
      metadata: {
        parsed_at: new Date(),
        parser_version: 'v1.0',
      },
    };
    
    const conversionResult = await convertPDFToOpenSlots(parsedPDFData);
    console.log('✅ Slot conversion completed:', conversionResult);
    
    // 4. sourcesのgym_idを更新
    const sourceRef = doc(db, 'sources', sourceId);
    await updateDoc(sourceRef, {
      gym_id: gymId,
      last_checked_at: Timestamp.now(),
    });
    
    console.log('✅ PDF parsing completed:', {
      gymId,
      slotsAdded: conversionResult.success,
      slotsFailed: conversionResult.failed,
    });
    
    return NextResponse.json({
      success: true,
      gymId,
      slotsAdded: conversionResult.success,
      slotsFailed: conversionResult.failed,
      errors: conversionResult.errors,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Error parsing PDF:', errorMessage);
    console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to parse PDF',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}

