/**
 * PDF解析API Route
 * URL登録時に自動的に呼び出される
 */

import { NextRequest, NextResponse } from 'next/server';
import { collection, addDoc, doc, updateDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { convertPDFToOpenSlots, type ParsedPDFData, type ParsedPDFSlot } from '@/lib/firebase/pdf-parser';
import path from 'path';

/**
 * URLドメインからエリア名（市区町村）を推測
 * 例: www.city.kawaguchi.lg.jp → 川口市
 */
function guessAreaNameFromUrl(url: string): string | undefined {
  try {
    const hostname = new URL(url).hostname;
    // www.city.XXX.lg.jp パターン
    const cityMatch = hostname.match(/(?:www\.)?city\.([a-z]+)\.lg\.jp/i);
    if (cityMatch) {
      const cityMap: Record<string, string> = {
        kawaguchi: '川口市',
        saitama: 'さいたま市',
        warabi: '蕨市',
        toda: '戸田市',
        hatogaya: '鳩ヶ谷市',
        urawa: '浦和市',
        omiya: '大宮市',
        ageo: '上尾市',
        koshigaya: '越谷市',
        kasukabe: '春日部市',
        tokorozawa: '所沢市',
        kawagoe: '川越市',
        kumagaya: '熊谷市',
        yokohama: '横浜市',
        chiba: '千葉市',
        funabashi: '船橋市',
        ichikawa: '市川市',
        matsudo: '松戸市',
        nerima: '練馬区',
        setagaya: '世田谷区',
        shinjuku: '新宿区',
        shibuya: '渋谷区',
        adachi: '足立区',
        itabashi: '板橋区',
        kita: '北区',
      };
      return cityMap[cityMatch[1].toLowerCase()];
    }
  } catch {
    // URL parse failed
  }
  return undefined;
}

interface PdfTextItem {
  text: string;
  x: number;
  y: number;
}

interface TableColumn {
  facility: string;
  period: 'am' | 'pm';
  month: number;
  year: number;
  centerX: number;
  startTime: string;
  endTime: string;
}

function toHalfWidth(s: string): string {
  return s.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0));
}

function parseTimeText(text: string): { start: string; end: string } | null {
  const hw = toHalfWidth(text);
  const m = hw.match(/(\d{1,2})時(?:(\d{1,2})分)?～(\d{1,2})時(?:(\d{1,2})分)?/);
  if (!m) return null;
  return {
    start: `${m[1].padStart(2, '0')}:${m[2] || '00'}`,
    end: `${m[3].padStart(2, '0')}:${m[4] || '00'}`,
  };
}

function inferYearFromUrl(url: string, month: number): number {
  const match = url.match(/(\d{4})(\d{2})/);
  if (match) {
    const urlYear = parseInt(match[1], 10);
    const urlMonth = parseInt(match[2], 10);
    if (urlYear >= 2020 && urlYear <= 2030 && urlMonth >= 1 && urlMonth <= 12) {
      if (month < urlMonth) return urlYear + 1;
      return urlYear;
    }
  }
  return new Date().getFullYear();
}

function createSlotFromColumn(date: string, col: TableColumn): ParsedPDFSlot {
  return {
    date,
    start_time: col.startTime,
    end_time: col.endTime,
    sport_name: '体育館個人開放',
    status: 'available',
    capacity: null,
    remaining: null,
    reception_type: 'same_day',
    target: '',
    notes: '',
  };
}

/**
 * pdfjs-distの座標付きテキスト抽出でテーブル構造を直接解析。
 * AI不要のため高速・正確。月/施設の区別も座標から確定。
 */
async function extractWithCoordinates(buffer: Buffer, url: string): Promise<{
  gymName: string;
  gymNameAutoDetected: boolean;
  areaName?: string;
  tel?: string;
  slots: ParsedPDFSlot[];
  rawText: string;
} | null> {
  try {
    const pdfjsLib = await import(/* webpackIgnore: true */ 'pdfjs-dist/legacy/build/pdf.mjs');
    const cMapUrl = path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'cmaps') + '/';
    const doc = await (pdfjsLib as any).getDocument({
      data: new Uint8Array(buffer),
      cMapUrl,
      cMapPacked: true,
    }).promise;

    const allSlots: ParsedPDFSlot[] = [];
    let gymName = '';
    let gymNameAutoDetected = false;
    let tel: string | undefined;
    let rawText = '';

    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
      const page = await doc.getPage(pageNum);
      const vp = page.getViewport({ scale: 1.0 });
      const tc = await page.getTextContent();

      const items: PdfTextItem[] = tc.items
        .filter((i: any) => i.str && i.str.trim())
        .map((i: any) => ({
          text: i.str.trim(),
          x: Math.round(i.transform[4]),
          y: Math.round(vp.height - i.transform[5]),
        }))
        .sort((a: PdfTextItem, b: PdfTextItem) => a.y - b.y || a.x - b.x);

      rawText += items.map(i => i.text).join(' ') + '\n';
      if (items.length === 0) continue;

      if (pageNum === 1 && !gymName) {
        for (const item of items) {
          const nm = item.text.match(/([^\s]*(?:スポーツセンター|体育館|アリーナ|体育センター|総合体育館|武道館))/);
          if (nm) { gymName = nm[1]; gymNameAutoDetected = true; break; }
        }
        if (!gymName) gymName = extractGymName(items.map(i => i.text).join(' '), url);
      }

      if (!tel) {
        for (const item of items) {
          const tm = item.text.match(/(0\d{1,4}[-ー]?\d{1,4}[-ー]?\d{4})/);
          if (tm) { tel = tm[1]; break; }
        }
      }

      // 月ヘッダー検出（"3月" or 全角 "３" near "体" chars）
      const monthHeaders: { month: number; year: number; x: number }[] = [];
      for (const item of items) {
        const mm = item.text.match(/^(\d{1,2})月$/);
        if (mm) {
          const month = parseInt(mm[1], 10);
          monthHeaders.push({ month, year: inferYearFromUrl(url, month), x: item.x });
        }
      }
      if (monthHeaders.length === 0) {
        const headerFacilityChars = items.filter(i => i.text === '体');
        if (headerFacilityChars.length > 0) {
          const hdrY = Math.min(...headerFacilityChars.map(f => f.y));
          for (const item of items) {
            if (Math.abs(item.y - hdrY) > 5) continue;
            if (/^[０-９]+$/.test(item.text)) {
              const month = parseInt(toHalfWidth(item.text), 10);
              if (month >= 1 && month <= 12) {
                monthHeaders.push({ month, year: inferYearFromUrl(url, month), x: item.x });
              }
            }
          }
        }
      }
      if (monthHeaders.length === 0) continue;
      monthHeaders.sort((a, b) => a.x - b.x);

      // 午前/午後ヘッダーから列を定義
      const periodHeaders: { period: 'am' | 'pm'; x: number; y: number }[] = [];
      for (const item of items) {
        if (item.text === '午前') periodHeaders.push({ period: 'am', x: item.x, y: item.y });
        else if (item.text === '午後') periodHeaders.push({ period: 'pm', x: item.x, y: item.y });
      }
      periodHeaders.sort((a, b) => a.x - b.x);

      // === FORMAT 2: 時間テキスト方式（セルに時間テキストが直接記載されるフォーマット） ===
      if (periodHeaders.length < 2) {
        const badTexts = items.filter(i => i.text.includes('バドミントン'));
        if (badTexts.length > 0) {
          const sectionBounds: { month: number; year: number; leftX: number; rightX: number; gymMinX: number; gymMaxX: number }[] = [];
          for (let mi = 0; mi < monthHeaders.length; mi++) {
            const mh = monthHeaders[mi];
            const leftX = mi > 0 ? (monthHeaders[mi - 1].x + mh.x) / 2 : 0;
            const rightX = mi < monthHeaders.length - 1 ? (mh.x + monthHeaders[mi + 1].x) / 2 : 9999;
            const sectionBads = badTexts.filter(b => b.x >= leftX && b.x < rightX);
            if (sectionBads.length === 0) continue;
            sectionBounds.push({
              month: mh.month, year: mh.year,
              leftX, rightX,
              gymMinX: sectionBads[0].x - 20,
              gymMaxX: sectionBads[0].x + 60,
            });
          }

          const badHeaderY = Math.min(...badTexts.map(b => b.y));
          const dataStartY = badHeaderY + 10;
          const dataItems = items.filter(i => i.y >= dataStartY);

          const rowMap = new Map<number, PdfTextItem[]>();
          for (const item of dataItems) {
            const key = Math.round(item.y / 13) * 13;
            if (!rowMap.has(key)) rowMap.set(key, []);
            rowMap.get(key)!.push(item);
          }

          for (const [, rowItems] of [...rowMap.entries()].sort((a, b) => a[0] - b[0])) {
            const sorted = rowItems.sort((a, b) => a.x - b.x);
            for (const section of sectionBounds) {
              const sectionItems = sorted.filter(i => i.x >= section.leftX && i.x < section.rightX);
              if (sectionItems.length === 0) continue;

              const dayItem = sectionItems.find(i => {
                const hw = toHalfWidth(i.text);
                const n = parseInt(hw, 10);
                return !isNaN(n) && n >= 1 && n <= 31 && /^[０-９\d]+$/.test(i.text);
              });
              if (!dayItem) continue;

              const day = parseInt(toHalfWidth(dayItem.text), 10);
              const dateStr = `${section.year}-${String(section.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dateObj = new Date(section.year, section.month - 1, day);
              if (dateObj.getMonth() + 1 !== section.month || dateObj.getDate() !== day) continue;

              const gymItems = sectionItems.filter(i =>
                i.x >= section.gymMinX && i.x <= section.gymMaxX
              );

              let timeRange: { start: string; end: string } | null = null;
              for (const gi of gymItems) {
                const parsed = parseTimeText(gi.text);
                if (parsed) { timeRange = parsed; break; }
              }
              if (!timeRange) continue;

              allSlots.push({
                date: dateStr,
                start_time: timeRange.start,
                end_time: timeRange.end,
                sport_name: '体育館個人開放',
                status: 'available',
              });
            }
          }

          console.log(`📊 Page ${pageNum} (time-text format): ${sectionBounds.map(s => s.month + '月').join(', ')}, ${allSlots.length} slots so far`);
        }
        continue;
      }

      // === FORMAT 1: ○/× with 午前/午後 ===
      const headerY = Math.min(...periodHeaders.map(p => p.y));

      // セクション分割（大きなx間隔 > 80px で分離）
      const sectionGroups: typeof periodHeaders[] = [[]];
      for (let i = 0; i < periodHeaders.length; i++) {
        if (i > 0 && periodHeaders[i].x - periodHeaders[i - 1].x > 80) {
          sectionGroups.push([]);
        }
        sectionGroups[sectionGroups.length - 1].push(periodHeaders[i]);
      }

      const sectionDividers: number[] = [];
      for (let s = 0; s < sectionGroups.length - 1; s++) {
        const rightMost = Math.max(...sectionGroups[s].map(p => p.x));
        const leftMost = Math.min(...sectionGroups[s + 1].map(p => p.x));
        sectionDividers.push((rightMost + leftMost) / 2);
      }

      // 各セクションに月を割り当て
      const sectionMonths: { month: number; year: number }[] = [];
      for (let s = 0; s < sectionGroups.length; s++) {
        const centerX = sectionGroups[s].reduce((sum, p) => sum + p.x, 0) / sectionGroups[s].length;
        let nearest = monthHeaders[0];
        let minDist = Infinity;
        for (const mh of monthHeaders) {
          const d = Math.abs(centerX - mh.x);
          if (d < minDist) { minDist = d; nearest = mh; }
        }
        sectionMonths.push({ month: nearest.month, year: nearest.year });
      }

      // 施設種別を「体」「プ」文字の座標から判定
      const facilityChars = items.filter(i =>
        i.y >= headerY - 25 && i.y < headerY &&
        (i.text === '体' || i.text === 'プ')
      );

      // 列定義を構築
      const columns: TableColumn[] = [];
      for (let s = 0; s < sectionGroups.length; s++) {
        for (const ph of sectionGroups[s]) {
          let facility = '体育館';
          let minDist = Infinity;
          for (const fc of facilityChars) {
            const d = Math.abs(fc.x - ph.x);
            if (d < minDist) { minDist = d; facility = fc.text === 'プ' ? 'プール' : '体育館'; }
          }
          columns.push({
            facility,
            period: ph.period,
            month: sectionMonths[s].month,
            year: sectionMonths[s].year,
            centerX: ph.x,
            startTime: ph.period === 'am' ? '09:00' : '13:00',
            endTime: ph.period === 'am' ? '13:00' : '16:45',
          });
        }
      }

      // 時間帯をサブヘッダーから取得
      const timeItems = items.filter(i =>
        i.y > headerY + 5 && i.y < headerY + 35 &&
        /\d{1,2}[：:]\d{2}/.test(i.text)
      );
      for (const col of columns) {
        const nearby = timeItems
          .filter(t => Math.abs(t.x - col.centerX) < 25)
          .sort((a, b) => a.y - b.y);
        if (nearby.length >= 1) {
          const m1 = nearby[0].text.match(/(\d{1,2})[：:](\d{2})/);
          if (m1 && (nearby[0].text.includes('～') || nearby[0].text.includes('~'))) {
            col.startTime = `${m1[1].padStart(2, '0')}:${m1[2]}`;
          }
        }
        if (nearby.length >= 2) {
          const m2 = nearby[1].text.match(/(\d{1,2})[：:](\d{2})/);
          if (m2 && !nearby[1].text.includes('～') && !nearby[1].text.includes('~')) {
            col.endTime = `${m2[1].padStart(2, '0')}:${m2[2]}`;
          }
        }
      }

      const gymColumns = columns.filter(c => c.facility === '体育館');
      console.log(`📊 Page ${pageNum}: ${columns.length} columns (${gymColumns.length} gym), months: ${monthHeaders.map(m => m.month + '月').join(', ')}`);

      if (gymColumns.length === 0) continue;

      // 体育館のAM/PMペアを構築
      const gymPairs: { am: TableColumn; pm: TableColumn; sectionIdx: number }[] = [];
      for (let s = 0; s < sectionGroups.length; s++) {
        const sectionGym = gymColumns.filter(c =>
          c.month === sectionMonths[s].month && c.year === sectionMonths[s].year
        );
        const am = sectionGym.find(c => c.period === 'am');
        const pm = sectionGym.find(c => c.period === 'pm');
        if (am || pm) {
          gymPairs.push({ am: am || pm!, pm: pm || am!, sectionIdx: s });
        }
      }

      // データ行を処理
      const dataStartY = headerY + 40;
      const dataItems = items.filter(i => i.y >= dataStartY);

      const rowMap = new Map<number, PdfTextItem[]>();
      for (const item of dataItems) {
        const key = Math.round(item.y / 17) * 17;
        if (!rowMap.has(key)) rowMap.set(key, []);
        rowMap.get(key)!.push(item);
      }

      const getSectionIdx = (x: number) => {
        for (let i = 0; i < sectionDividers.length; i++) {
          if (x < sectionDividers[i]) return i;
        }
        return sectionDividers.length;
      };

      for (const [, rowItems] of [...rowMap.entries()].sort((a, b) => a[0] - b[0])) {
        const sorted = rowItems.sort((a, b) => a.x - b.x);

        for (const pair of gymPairs) {
          const sectionItems = sorted.filter(i => getSectionIdx(i.x) === pair.sectionIdx);
          if (sectionItems.length === 0) continue;

          const dayItem = sectionItems.find(i =>
            /^\d{1,2}$/.test(i.text) && parseInt(i.text) >= 1 && parseInt(i.text) <= 31
          );
          if (!dayItem) continue;

          const day = parseInt(dayItem.text, 10);
          const dateStr = `${pair.am.year}-${String(pair.am.month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

          const dateObj = new Date(pair.am.year, pair.am.month - 1, day);
          if (dateObj.getMonth() + 1 !== pair.am.month || dateObj.getDate() !== day) continue;

          const gymMinX = pair.am.centerX - 30;
          const gymMaxX = pair.pm.centerX + 30;

          // 「中止」テキストの範囲が体育館列と重なるかチェック
          const hasCancellation = sectionItems.some(i => {
            if (!i.text.includes('中止')) return false;
            const textRight = i.x + i.text.length * 13;
            return i.x <= gymMaxX && textRight >= gymMinX;
          });
          if (hasCancellation) continue;

          const statusMarks = sectionItems.filter(i =>
            i.x >= gymMinX && i.x <= gymMaxX &&
            /^[○〇◯×✕✖]$/.test(i.text)
          );
          if (statusMarks.length === 0) continue;

          for (const mark of statusMarks) {
            if (mark.text === '×' || mark.text === '✕' || mark.text === '✖') continue;

            const distToAm = Math.abs(mark.x - pair.am.centerX);
            const distToPm = Math.abs(mark.x - pair.pm.centerX);

            if (distToAm < 15) {
              allSlots.push(createSlotFromColumn(dateStr, pair.am));
            } else if (distToPm < 15) {
              allSlots.push(createSlotFromColumn(dateStr, pair.pm));
            } else {
              // AM/PMの中間 → 休日の全日開放パターン（両方のスロットを作成）
              allSlots.push(createSlotFromColumn(dateStr, pair.am));
              allSlots.push(createSlotFromColumn(dateStr, pair.pm));
            }
          }
        }
      }
    }

    console.log(`✅ Coordinate extraction: ${allSlots.length} gym slots found (gymName auto: ${gymNameAutoDetected})`);
    return {
      gymName: gymName || '体育館',
      gymNameAutoDetected,
      areaName: guessAreaNameFromUrl(url),
      tel,
      slots: allSlots,
      rawText,
    };
  } catch (error) {
    console.warn('⚠️ Coordinate extraction failed:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * PDFから体育館情報を抽出
 * 1) pdfjs-dist座標解析（高速・正確・AI不要）
 * 2) DeepSeek AI（フォールバック）
 */
async function parsePDF(url: string): Promise<{
  gymName: string;
  gymNameAutoDetected: boolean;
  address?: string;
  tel?: string;
  areaName?: string;
  slots: ParsedPDFSlot[];
}> {
  console.log('📄 Parsing PDF:', url);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`PDF download failed: ${response.status} ${response.statusText}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());

  // 方法1: 座標ベース解析（推奨・高速）
  console.log('📐 Attempting coordinate-based extraction...');
  const coordResult = await extractWithCoordinates(buffer, url);

  if (coordResult && coordResult.slots.length > 0) {
    console.log(`✅ Coordinate extraction succeeded: ${coordResult.slots.length} slots`);
    return {
      gymName: coordResult.gymName,
      gymNameAutoDetected: coordResult.gymNameAutoDetected,
      areaName: coordResult.areaName || guessAreaNameFromUrl(url),
      tel: coordResult.tel,
      slots: coordResult.slots,
    };
  }

  // 方法2: DeepSeek AIフォールバック
  console.log('🤖 Falling back to DeepSeek AI extraction...');
  let text = coordResult?.rawText || '';

  if (!text.trim()) {
    try {
      // @ts-ignore
      const pdfParseModule = require('pdf-parse');
      const parseFn = typeof pdfParseModule === 'function' ? pdfParseModule : pdfParseModule.default;
      const result = await parseFn(buffer);
      text = result.text || '';
    } catch {
      throw new Error('PDFテキスト抽出に失敗しました');
    }
  }

  if (!text.trim()) {
    throw new Error('PDFからテキストを抽出できませんでした');
  }

  const extractedData = await extractWithDeepSeek(text, url);
  const validatedSlots = validateSlotDatesAgainstPdf(extractedData.slots, text);

  const areaName = extractedData.areaName?.trim() || guessAreaNameFromUrl(url);

  console.log('✅ DeepSeek extraction:', {
    gymName: extractedData.gymName,
    areaName,
    slotsCount: validatedSlots.length,
  });

  return {
    gymName: extractedData.gymName,
    gymNameAutoDetected: true,
    areaName,
    address: extractedData.address,
    tel: extractedData.tel,
    slots: validatedSlots,
  };
}

/**
 * DeepSeek APIを使用してPDFテキストから情報を抽出
 * コンパクトTSV出力で高速化
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
    throw new Error('DEEPSEEK_API_KEY environment variable is not set');
  }
  
  const maxTextLength = 12000;
  const inputText = text.length > maxTextLength
    ? text.substring(0, maxTextLength) + '\n...(省略)'
    : text;
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  const prompt = `体育館の個人開放スケジュールPDFテキストを解析してください。

本日: ${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}
PDF URL: ${url}
PDFテキスト:
${inputText}

以下の形式で出力してください。ヘッダー行の後に、1行1スロットでTSV（タブ区切り）で出力。

INFO\t施設名\tエリア名（市区町村名）\t電話番号
SLOT\tYYYY-MM-DD\tHH:mm\tHH:mm\t競技名\tavailable/few/full/closed\t備考

ルール:
- 和暦→西暦変換: 令和N年 = 2018+N年（R6=2024, R7=2025, R8=2026）
- 重要: 日本の「年度」は4月始まり。「令和7年度3月」=2026年3月、「令和7年度4月」は存在しない（4月は令和8年度）。PDFの日付が本日（${currentYear}年）より1年以上過去になる場合は年度計算を見直すこと
- ○/〇→available, △→few, ×→full, 中止→closed
- 「1 日」「5 木」= 日付+曜日。月はヘッダー(3月等)から判定
- 体育館の個人開放スロットのみ出力する。プール・水泳・トレーニングルーム・浴室・庭球場など体育館以外の施設は無視すること
- 体育館個人開放(卓球・バドミントン等が利用可能)→競技名は"体育館個人開放"
- 午前/午後の時間帯はPDF記載の時間を使用。なければ午前=09:00-13:00, 午後=13:00-17:00
- ×(未実施)のスロットは出力しない。○(実施)のスロットのみ出力
- 複数月のデータがあればすべて出力
- エリア名はPDFテキストまたはURLのドメイン（例: www.city.kawaguchi.lg.jp→川口市）から推測。必ず出力すること
- TSVのみ出力。説明文不要`;

  console.log(`📄 Sending ${inputText.length} chars to DeepSeek...`);
  const startTime = Date.now();
  
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90000);
  
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
          { role: 'system', content: 'スケジュールPDF解析AI。指定のTSV形式のみ出力。' },
          { role: 'user', content: prompt },
        ],
        temperature: 0,
        max_tokens: 4000,
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ DeepSeek responded in ${elapsed}s`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} ${errorText}`);
    }
    
    const data = await response.json();
    const content = data.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('DeepSeek APIからレスポンスがありません');
    }
    
    console.log(`📝 Response length: ${content.length} chars`);
    return parseTsvResponse(content);
  } catch (error: any) {
    clearTimeout(timeout);
    if (error.name === 'AbortError') {
      throw new Error('AI解析がタイムアウトしました（90秒）。PDFが大きすぎる可能性があります。');
    }
    throw error;
  }
}

/**
 * AIのTSVレスポンスをパースしてスロット配列に変換
 */
function parseTsvResponse(content: string): {
  gymName: string;
  address?: string;
  tel?: string;
  areaName?: string;
  slots: ParsedPDFSlot[];
} {
  const lines = content.trim().split('\n').filter(l => l.trim());
  
  let gymName = '体育館';
  let areaName: string | undefined;
  let tel: string | undefined;
  const slots: ParsedPDFSlot[] = [];
  
  for (const line of lines) {
    const cols = line.split('\t').map(c => c.trim());
    
    if (cols[0] === 'INFO' && cols.length >= 3) {
      gymName = cols[1] || '体育館';
      areaName = cols[2] || undefined;
      tel = cols[3] || undefined;
      continue;
    }
    
    if (cols[0] === 'SLOT' && cols.length >= 6) {
      const status = cols[5] as 'available' | 'few' | 'full' | 'closed';
      if (status === 'full' || status === 'closed') continue;
      
      slots.push({
        date: cols[1],
        start_time: cols[2],
        end_time: cols[3],
        sport_name: cols[4],
        status,
        capacity: null,
        remaining: null,
        reception_type: 'same_day',
        target: '',
        notes: cols[6] || '',
      });
      continue;
    }
    
    // フォールバック: タブ区切りでINFO/SLOTプレフィックスがない場合
    if (cols.length >= 5 && /^\d{4}-\d{2}-\d{2}$/.test(cols[0])) {
      const status = (cols[4] || 'available') as 'available' | 'few' | 'full' | 'closed';
      if (status === 'full' || status === 'closed') continue;
      
      slots.push({
        date: cols[0],
        start_time: cols[1],
        end_time: cols[2],
        sport_name: cols[3],
        status,
        capacity: null,
        remaining: null,
        reception_type: 'same_day',
        target: '',
        notes: cols[5] || '',
      });
    }
  }
  
  // 体育館以外の施設スロットを除外
  const NON_GYM_KEYWORDS = ['水泳', 'プール', 'トレーニング', '浴室', '庭球', 'テニスコート', 'サウナ'];
  const filteredSlots = slots.filter(
    slot => !NON_GYM_KEYWORDS.some(kw => slot.sport_name.includes(kw))
  );
  
  const removed = slots.length - filteredSlots.length;
  if (removed > 0) {
    console.log(`🏋️ Filtered: ${removed} non-gym slots removed (pool, training room, etc.)`);
  }
  console.log(`📊 Parsed: ${gymName} (${areaName}), ${filteredSlots.length} gym slots`);
  
  return { gymName, areaName, tel, slots: filteredSlots };
}


/**
 * AIが出力したスロットの日付をPDFテキストと照合し、
 * PDFに実際に記載されている日付のみを残す。
 *
 * PDFテキストから "5 木" "20 祝" のような (日, 曜日) ペアを抽出し、
 * 各候補月でカレンダー上の曜日と一致するか検証する。
 */
function validateSlotDatesAgainstPdf(slots: ParsedPDFSlot[], pdfText: string): ParsedPDFSlot[] {
  if (slots.length === 0) return slots;

  const dowNames = ['日', '月', '火', '水', '木', '金', '土'];
  // PDFテキストから (日, 曜日/祝) ペアを抽出
  // (?=\s|$) は lookahead で、スペースを消費しないため同一行の複数ペアを拾える
  const datePatterns = [...pdfText.matchAll(/(\d{1,2})\s+(日|月|火|水|木|金|土|祝)(?=\s|$)/gm)];

  if (datePatterns.length === 0) {
    console.log('🗓️ No date patterns found in PDF text — skipping date validation');
    return slots;
  }

  console.log(`🗓️ Found ${datePatterns.length} date-dayOfWeek pairs in PDF text`);

  // スロットに含まれる月の一覧を取得
  const monthSet = new Set(slots.map(s => s.date.substring(0, 7)));

  // 有効な YYYY-MM-DD の集合を構築
  const validDates = new Set<string>();

  for (const [, dayStr, dow] of datePatterns) {
    const day = parseInt(dayStr, 10);

    for (const yearMonth of monthSet) {
      const [y, m] = yearMonth.split('-').map(Number);

      // この月にこの日が存在するか
      const dateObj = new Date(y, m - 1, day);
      if (dateObj.getMonth() + 1 !== m || dateObj.getDate() !== day) continue;

      const actualDow = dowNames[dateObj.getDay()];

      // 曜日が一致、または「祝」（祝日はどの曜日でもOK）
      if (dow === actualDow || dow === '祝') {
        validDates.add(`${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
      }
    }
  }

  console.log(`🗓️ Valid dates from PDF: ${[...validDates].sort().join(', ')}`);

  const filtered = slots.filter(s => validDates.has(s.date));
  const removed = slots.length - filtered.length;
  if (removed > 0) {
    const removedDates = [...new Set(slots.filter(s => !validDates.has(s.date)).map(s => s.date))].sort();
    console.log(`🗓️ Removed ${removed} slots (${removedDates.length} dates not in PDF): ${removedDates.join(', ')}`);
  }

  return filtered;
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
 * Promiseにタイムアウトを付与するヘルパー
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label}がタイムアウトしました（${ms / 1000}秒）。Firebaseエミュレーターが起動しているか確認してください。`)), ms)
    ),
  ]);
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
    
    // Step 1: PDF解析（テキスト抽出 + AI構造化）
    console.log('📄 Step 1: Parsing PDF...');
    const parsedData = await parsePDF(url);
    console.log('✅ PDF parsed:', {
      gymName: parsedData.gymName,
      areaName: parsedData.areaName,
      slotsCount: parsedData.slots.length,
    });
    
    if (parsedData.slots.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No slots extracted',
        message: 'PDFからスケジュール情報を抽出できませんでした。表の形式が対応していない可能性があります。',
        gymName: parsedData.gymName,
      }, { status: 422 });
    }
    
    // Step 2: 体育館情報をgymsに追加（10秒タイムアウト）
    console.log('🏋️ Step 2: Adding gym to Firestore...');
    const gymId = await withTimeout(
      addGymToFirestore(parsedData.gymName, parsedData.areaName, parsedData.address, parsedData.tel, url),
      10000,
      'Firestore書き込み'
    );
    console.log('✅ Gym added:', gymId);
    
    // Step 3: 空き時間情報をopen_slotsに追加（30秒タイムアウト）
    console.log('📅 Step 3: Converting slots to open_slots...');
    const parsedPDFData: ParsedPDFData = {
      gym_id: gymId,
      source_id: `source_${sourceId}`,
      slots: parsedData.slots,
      metadata: {
        parsed_at: new Date(),
        parser_version: 'v2.0',
      },
    };
    
    const conversionResult = await withTimeout(
      convertPDFToOpenSlots(parsedPDFData),
      30000,
      'スロット保存'
    );
    
    // Step 4: sourcesのgym_idを更新
    try {
      const sourceRef = doc(db, 'sources', sourceId);
      await withTimeout(
        updateDoc(sourceRef, { gym_id: gymId, last_checked_at: Timestamp.now() }),
        5000,
        'ソース更新'
      );
    } catch (e) {
      console.warn('⚠️ Source update failed (non-critical):', e instanceof Error ? e.message : e);
    }
    
    console.log('✅ All done:', {
      gymId,
      slotsAdded: conversionResult.success,
      slotsFailed: conversionResult.failed,
    });
    
    const uniqueDates = Array.from(new Set(parsedData.slots.map(s => s.date))).sort();
    const uniqueSports = Array.from(new Set(parsedData.slots.map(s => s.sport_name)));
    
    return NextResponse.json({
      success: true,
      gymId,
      gymName: parsedData.gymName,
      gymNameAutoDetected: parsedData.gymNameAutoDetected,
      areaName: parsedData.areaName,
      slotsAdded: conversionResult.success,
      slotsFailed: conversionResult.failed,
      errors: conversionResult.errors,
      summary: {
        totalSlots: parsedData.slots.length,
        dates: uniqueDates,
        sports: uniqueSports,
        dateCount: uniqueDates.length,
        sportCount: uniqueSports.length,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Error parsing PDF:', errorMessage);
    
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

