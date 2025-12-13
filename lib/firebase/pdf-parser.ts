/**
 * PDFパーサからopen_slotsへの変換機能
 */

import { collection, addDoc, doc, getDoc, getDocs, query, where, Timestamp } from 'firebase/firestore';
import { db } from './config';

/**
 * PDFパーサの出力形式
 */
export interface ParsedPDFSlot {
  date: string; // YYYY-MM-DD
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  sport_name: string; // 競技名（例: "バドミントン"）
  status: 'available' | 'few' | 'full' | 'closed';
  capacity?: number | null;
  remaining?: number | null;
  reception_type?: 'same_day' | 'reservation' | 'lottery';
  target?: string; // 対象者（例: "高校生以上"）
  notes?: string; // 備考
}

/**
 * PDFパーサの出力（1つのPDFから複数のスロットを抽出）
 */
export interface ParsedPDFData {
  gym_id: string; // "gym_xxx"形式
  source_id: string; // "source_xxx"形式
  slots: ParsedPDFSlot[];
  metadata?: {
    parsed_at: Date;
    parser_version: string;
    page_count?: number;
  };
}

/**
 * 競技名からsport_idを取得
 */
async function getSportId(sportName: string): Promise<string | null> {
  try {
    const { collection, getDocs, query, where } = await import('firebase/firestore');
    const sportsSnapshot = await getDocs(
      query(collection(db, 'sports'), where('name', '==', sportName))
    );
    
    if (!sportsSnapshot.empty) {
      return sportsSnapshot.docs[0].id;
    }
    
    console.warn(`⚠️ Sport not found: ${sportName}`);
    return null;
  } catch (error) {
    console.error('Error fetching sport:', error);
    return null;
  }
}

/**
 * gym_idからarea_idを取得
 */
async function getAreaIdFromGym(gymId: string): Promise<string | null> {
  try {
    // "gym_xxx"から"xxx"を抽出
    const gymDocId = gymId.replace('gym_', '');
    const gymDoc = await getDoc(doc(db, 'gyms', gymDocId));
    
    if (gymDoc.exists()) {
      const data = gymDoc.data();
      const areaId = data.area_id;
      
      // area_idが存在する場合
      if (areaId) {
        // area_idが既に"area_xxx"形式でない場合は変換
        if (typeof areaId === 'string' && !areaId.startsWith('area_')) {
          return `area_${areaId}`;
        }
        return areaId;
      }
      
      console.warn(`⚠️ Gym ${gymId} has no area_id`);
      return null;
    }
    
    console.warn(`⚠️ Gym ${gymId} not found`);
    return null;
  } catch (error) {
    console.error('Error fetching gym:', error);
    return null;
  }
}

/**
 * PDFパーサの出力をopen_slots形式に変換してFirestoreに投入
 */
export async function convertPDFToOpenSlots(parsedData: ParsedPDFData): Promise<{
  success: number;
  failed: number;
  errors: string[];
}> {
  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[],
  };

  try {
    console.log(`🔄 Converting ${parsedData.slots.length} slots from PDF...`);
    console.log(`📋 Gym ID: ${parsedData.gym_id}`);
    console.log(`📋 Source ID: ${parsedData.source_id}`);

    if (parsedData.slots.length === 0) {
      console.warn('⚠️ No slots found in PDF data');
      console.warn('⚠️ This could mean:');
      console.warn('   1. PDF parsing failed to extract slots');
      console.warn('   2. DeepSeek API returned empty slots array');
      console.warn('   3. PDF format is not supported');
      return results;
    }

    // 競技名→sport_idのマップを作成（キャッシュ）
    const sportIdMap: Record<string, string> = {};
    
    // area_idを取得
    console.log(`🔍 Fetching area_id for gym: ${parsedData.gym_id}`);
    const areaId = await getAreaIdFromGym(parsedData.gym_id);
    if (!areaId) {
      const error = `Failed to get area_id for gym: ${parsedData.gym_id}`;
      console.error(`❌ ${error}`);
      console.error(`❌ This means the gym document may not have an area_id field`);
      console.error(`❌ Please check if the gym was created correctly`);
      results.errors.push(error);
      // area_idが取得できない場合でも処理を続行（エラーを記録するが、スロットは作成しない）
      console.warn('⚠️ Skipping slot creation due to missing area_id');
      return results;
    }
    
    console.log(`✅ Found area_id: ${areaId}`);

    // 各スロットを変換
    console.log(`📝 Processing ${parsedData.slots.length} slots...`);
    for (let i = 0; i < parsedData.slots.length; i++) {
      const slot = parsedData.slots[i];
      try {
        console.log(`  [${i + 1}/${parsedData.slots.length}] Processing slot: ${slot.date} ${slot.start_time}-${slot.end_time} (${slot.sport_name})`);
        
        // 競技名からsport_idを取得（キャッシュを使用）
        let sportId = sportIdMap[slot.sport_name];
        if (!sportId) {
          console.log(`    🔍 Looking up sport_id for: ${slot.sport_name}`);
          const fetchedSportId = await getSportId(slot.sport_name);
          if (!fetchedSportId) {
            results.failed++;
            const errorMsg = `Sport not found: ${slot.sport_name}`;
            results.errors.push(errorMsg);
            console.warn(`    ⚠️ ${errorMsg} - skipping this slot`);
            continue;
          }
          sportId = fetchedSportId;
          sportIdMap[slot.sport_name] = sportId;
          console.log(`    ✅ Found sport_id: ${sportId} for ${slot.sport_name}`);
        }

        // open_slots形式に変換
        const openSlotData = {
          gym_id: parsedData.gym_id,
          area_id: areaId.startsWith('area_') ? areaId : `area_${areaId}`,
          sport_id: `sport_${sportId}`,
          date: slot.date,
          start_time: slot.start_time,
          end_time: slot.end_time,
          status: slot.status,
          capacity: slot.capacity ?? null,
          remaining: slot.remaining ?? null,
          reception_type: slot.reception_type || 'same_day',
          target: slot.target || '',
          notes: slot.notes || '',
          source_id: parsedData.source_id,
          updated_at: Timestamp.now(),
        };

        // Firestoreに投入
        console.log(`    💾 Saving to Firestore: ${JSON.stringify(openSlotData, null, 2)}`);
        await addDoc(collection(db, 'open_slots'), openSlotData);
        results.success++;
        
        console.log(`    ✅ Successfully created open_slot: ${slot.date} ${slot.start_time}-${slot.end_time} (${slot.sport_name})`);
      } catch (error) {
        results.failed++;
        const errorMsg = `Failed to convert slot: ${error instanceof Error ? error.message : String(error)}`;
        results.errors.push(errorMsg);
        console.error(`    ❌ ${errorMsg}`);
        console.error(`    ❌ Slot data: ${JSON.stringify(slot, null, 2)}`);
        if (error instanceof Error) {
          console.error(`    ❌ Error stack: ${error.stack}`);
        }
      }
    }

    console.log(`✅ Conversion completed: ${results.success} success, ${results.failed} failed`);
    return results;
  } catch (error) {
    const errorMsg = `Failed to convert PDF data: ${error instanceof Error ? error.message : String(error)}`;
    console.error(`❌ ${errorMsg}`);
    results.errors.push(errorMsg);
    return results;
  }
}

/**
 * バッチ処理用：複数のPDFデータを一括変換
 */
export async function convertMultiplePDFsToOpenSlots(
  parsedDataArray: ParsedPDFData[]
): Promise<{
  total: number;
  success: number;
  failed: number;
  errors: string[];
}> {
  const results = {
    total: parsedDataArray.length,
    success: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const parsedData of parsedDataArray) {
    const result = await convertPDFToOpenSlots(parsedData);
    results.success += result.success;
    results.failed += result.failed;
    results.errors.push(...result.errors);
  }

  return results;
}

