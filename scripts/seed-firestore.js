/**
 * Firestoreにモックデータを投入するスクリプト
 * 
 * 使い方:
 * 1. Firebaseエミュレーターを起動: npm run firebase:emulators
 * 2. 別のターミナルでこのスクリプトを実行: node scripts/seed-firestore.js
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs, deleteDoc, connectFirestoreEmulator, Timestamp } = require('firebase/firestore');

// Firebase設定（エミュレーター用）
const firebaseConfig = {
  projectId: 'demo-taikan',
};

// Firebase初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// エミュレーターに接続（必ず初期化直後に実行）
try {
  connectFirestoreEmulator(db, 'localhost', 8080);
  console.log('🔌 Firestoreエミュレーターに接続しました');
} catch (error) {
  console.log('ℹ️  既にエミュレーターに接続済みです');
}

// モックデータ
const mockGyms = [
  {
    id: 1,
    name: '渋谷区スポーツセンター',
    area: '渋谷区', // area_idマッピング用（投入時に削除）
    address: '東京都渋谷区西原1-40-18',
    tel: '03-3468-9051',
    distance: '現在地から 1.2km',
    location: { lat: 35.6629, lng: 139.6654 },
    courts: { badminton: 6, tableTennis: 12 },
    tags: ['バドミントン', '卓球', 'プール'],
    parking: 'あり',
    official_url: 'https://www.city.shibuya.tokyo.jp/sports/',
    format: '個人開放（当日受付）',
    restrictions: [
      '中学生以下は保護者同伴',
      '室内シューズ必須',
      'ラケット・ボール等は持参',
    ],
  },
  {
    id: 2,
    name: '新宿コズミックセンター',
    area: '新宿区', // area_idマッピング用（投入時に削除）
    address: '東京都新宿区大久保3-1-2',
    tel: '03-3232-7701',
    distance: '現在地から 2.5km',
    location: { lat: 35.7014, lng: 139.7003 },
    courts: { basketball: 2, badminton: 8 },
    tags: ['バスケットボール', 'バドミントン'],
    parking: 'なし',
    official_url: 'https://www.shinjuku-sportscenter.jp/',
    format: '個人開放（事前予約制）',
    restrictions: [
      '高校生以上',
      '予約は1週間前から',
      '室内シューズ必須',
    ],
  },
  {
    id: 3,
    name: '中央区立総合スポーツセンター',
    area: '中央区', // area_idマッピング用（投入時に削除）
    address: '東京都中央区日本橋浜町2-59-1',
    tel: '03-3666-1501',
    distance: '現在地から 4.8km',
    location: { lat: 35.6869, lng: 139.7824 },
    courts: { tableTennis: 20, badminton: 4 },
    tags: ['卓球', 'バドミントン', '弓道'],
    parking: 'あり',
    official_url: 'https://www.city.chuo.lg.jp/sports/',
    format: '個人開放（当日受付・予約可）',
    restrictions: [
      '小学生以上',
      '室内シューズ必須',
      '用具レンタルあり（有料）',
    ],
  },
];

const mockAreas = [
  { name: '渋谷区' },
  { name: '新宿区' },
  { name: '中央区' },
  { name: '港区' },
  { name: '世田谷区' },
  { name: '杉並区' },
  { name: '品川区' },
  { name: '目黒区' },
];

const mockSports = [
  { name: 'バドミントン' },
  { name: '卓球' },
  { name: 'バスケットボール' },
  { name: 'バレーボール' },
  { name: 'フットサル' },
  { name: 'テニス' },
  { name: 'プール' },
  { name: '弓道' },
];

// open_slots: 空き時間スロット情報（大量のダミーデータを生成）
function generateMockOpenSlots() {
  const slots = [];
  
  // 日付範囲: 今日から30日後まで
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30);
  
  // 時間帯
  const timeSlots = [
    { start: '09:00', end: '11:00' },
    { start: '11:00', end: '13:00' },
    { start: '13:00', end: '15:00' },
    { start: '15:00', end: '17:00' },
    { start: '17:00', end: '19:00' },
    { start: '19:00', end: '21:00' },
  ];
  
  // 体育館と競技のマッピング
  const gymSports = [
    { gym_id: 1, area_id: '渋谷区', sports: ['バドミントン', '卓球'], reception_type: 'same_day', target: '高校生以上', notes: 'ラケット持参' },
    { gym_id: 2, area_id: '新宿区', sports: ['バスケットボール', 'バドミントン'], reception_type: 'reservation', target: '高校生以上', notes: '予約は1週間前から' },
    { gym_id: 3, area_id: '中央区', sports: ['卓球', 'バドミントン'], reception_type: 'same_day', target: '小学生以上', notes: '用具レンタルあり（有料）' },
  ];
  
  // ステータスと残り数のパターン
  const statusPatterns = [
    { status: 'available', capacity: 24, remaining: 15 },
    { status: 'available', capacity: 24, remaining: 8 },
    { status: 'few', capacity: 24, remaining: 3 },
    { status: 'few', capacity: 24, remaining: 1 },
    { status: 'full', capacity: 24, remaining: 0 },
    { status: 'closed', capacity: null, remaining: null },
  ];
  
  // 日付ごとにスロットを生成
  for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0];
    const dayOfWeek = d.getDay(); // 0=日曜日, 6=土曜日
    
    // 各体育館・競技の組み合わせでスロットを生成
    for (const gymSport of gymSports) {
      for (const sport of gymSport.sports) {
        // 時間帯ごとにスロットを生成（ただし、日曜日と月曜日は一部の時間帯のみ）
        for (let i = 0; i < timeSlots.length; i++) {
          const timeSlot = timeSlots[i];
          
          // 日曜日・月曜日は午前のみ、それ以外は全時間帯
          if ((dayOfWeek === 0 || dayOfWeek === 1) && i > 2) {
            continue;
          }
          
          // ランダムにスロットを生成（80%の確率でスロットを作成）
          if (Math.random() > 0.2) {
            const pattern = statusPatterns[Math.floor(Math.random() * statusPatterns.length)];
            
            slots.push({
              gym_id: gymSport.gym_id,
              area_id: gymSport.area_id,
              sport_id: sport,
              date: dateStr,
              start_time: timeSlot.start,
              end_time: timeSlot.end,
              status: pattern.status,
              capacity: pattern.capacity,
              remaining: pattern.remaining,
              reception_type: gymSport.reception_type,
              target: gymSport.target,
              notes: gymSport.notes,
              source_gym_id: gymSport.gym_id,
            });
          }
        }
      }
    }
  }
  
  return slots;
}

const mockOpenSlots = generateMockOpenSlots();

// sources: データソース情報（投入時にgym_idを設定）
const mockSources = [
  {
    gym_id: 1, // 渋谷区スポーツセンター（投入時に "gym_xxx" 形式に変換）
    type: 'pdf',
    url: 'https://www.city.shibuya.tokyo.jp/sports/schedule.pdf',
    parser_version: 'v1.2',
  },
  {
    gym_id: 2, // 新宿コズミックセンター
    type: 'web',
    url: 'https://www.shinjuku-sportscenter.jp/schedule',
    parser_version: 'v1.2',
  },
  {
    gym_id: 3, // 中央区立総合スポーツセンター
    type: 'pdf',
    url: 'https://www.city.chuo.lg.jp/sports/open_slots.pdf',
    parser_version: 'v1.2',
  },
];

async function clearCollection(collectionName) {
  try {
    const snapshot = await getDocs(collection(db, collectionName));
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    if (snapshot.docs.length > 0) {
      console.log(`  🗑️  ${collectionName}コレクションから${snapshot.docs.length}件を削除しました`);
    }
  } catch (error) {
    console.log(`  ℹ️  ${collectionName}コレクションの削除をスキップしました`);
  }
}

async function seedData() {
  console.log('🌱 データ投入を開始します...');

  try {
    // 既存のデータを削除
    console.log('\n🗑️  既存のデータを削除中...');
    await clearCollection('areas');
    await clearCollection('gyms');
    await clearCollection('sports');
    await clearCollection('open_slots');
    await clearCollection('sources');

    // エリアデータを先に投入し、ドキュメントIDを取得
    console.log('\n🗺️  エリアデータを投入中...');
    const areaIdMap = {}; // { areaName: areaDocId }
    for (const area of mockAreas) {
      const areaDocRef = await addDoc(collection(db, 'areas'), area);
      areaIdMap[area.name] = areaDocRef.id;
      console.log(`  ✓ ${area.name} (ID: ${areaDocRef.id})`);
    }

    // 体育館データの投入（area_idを追加、areaフィールドは削除）
    console.log('\n📍 体育館データを投入中...');
    for (const gym of mockGyms) {
      // area名から対応するarea_idを取得
      const areaId = areaIdMap[gym.area];
      if (!areaId) {
        console.warn(`  ⚠️  ${gym.name}: エリア "${gym.area}" が見つかりません`);
      }
      
      // areaフィールドを除外し、area_idを追加してデータ投入
      const { area, ...gymWithoutArea } = gym;
      const gymData = {
        ...gymWithoutArea,
        area_id: areaId || null,
      };
      await addDoc(collection(db, 'gyms'), gymData);
      console.log(`  ✓ ${gym.name} (area_id: ${areaId || 'N/A'})`);
    }

    // 競技データの投入
    console.log('\n🏃 競技データを投入中...');
    const sportIdMap = {}; // { sportName: sportDocId }
    for (const sport of mockSports) {
      const sportDocRef = await addDoc(collection(db, 'sports'), sport);
      sportIdMap[sport.name] = sportDocRef.id;
      console.log(`  ✓ ${sport.name} (ID: ${sportDocRef.id})`);
    }

    // 体育館データのIDマップを作成（gym_id → gymDocId）
    const gymIdMap = {}; // { gym.id: gymDocId }
    const gymsSnapshot = await getDocs(collection(db, 'gyms'));
    gymsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.id) {
        gymIdMap[data.id] = doc.id;
      }
    });

    // データソース情報の投入
    console.log('\n📡 データソース情報を投入中...');
    const sourceIdMap = {}; // { gym_id: sourceDocId }
    for (const source of mockSources) {
      // gym_idを文字列形式に変換
      const gymDocId = gymIdMap[source.gym_id];
      if (!gymDocId) {
        console.warn(`  ⚠️  Source skipped: gym_id ${source.gym_id} not found`);
        continue;
      }

      const sourceData = {
        gym_id: `gym_${gymDocId}`,
        type: source.type,
        url: source.url,
        last_checked_at: Timestamp.now(),
        parser_version: source.parser_version,
      };

      const sourceDocRef = await addDoc(collection(db, 'sources'), sourceData);
      sourceIdMap[source.gym_id] = sourceDocRef.id;
      console.log(`  ✓ ${source.url} (gym_id: ${source.gym_id}, type: ${source.type}, ID: ${sourceDocRef.id})`);
    }

    // 空き時間スロットデータの投入
    console.log('\n⏰ 空き時間スロットデータを投入中...');
    for (const slot of mockOpenSlots) {
      // IDを文字列形式に変換
      const gymDocId = gymIdMap[slot.gym_id];
      const areaDocId = areaIdMap[slot.area_id];
      const sportDocId = sportIdMap[slot.sport_id];
      // source_gym_idからsource_idを取得
      const sourceDocId = sourceIdMap[slot.source_gym_id];

      if (!gymDocId || !areaDocId || !sportDocId || !sourceDocId) {
        console.warn(`  ⚠️  Slot skipped: missing IDs (gym: ${gymDocId}, area: ${areaDocId}, sport: ${sportDocId}, source: ${sourceDocId})`);
        continue;
      }

      const slotData = {
        gym_id: `gym_${gymDocId}`,
        area_id: `area_${areaDocId}`,
        sport_id: `sport_${sportDocId}`,
        date: slot.date,
        start_time: slot.start_time,
        end_time: slot.end_time,
        status: slot.status,
        capacity: slot.capacity,
        remaining: slot.remaining,
        reception_type: slot.reception_type,
        target: slot.target,
        notes: slot.notes,
        source_id: `source_${sourceDocId}`,
        updated_at: Timestamp.now(),
      };

      await addDoc(collection(db, 'open_slots'), slotData);
      console.log(`  ✓ ${slot.date} ${slot.start_time}-${slot.end_time} (gym: ${slot.gym_id}, sport: ${slot.sport_id})`);
    }

    console.log('\n✅ データ投入が完了しました！');
    console.log('\n📊 投入されたデータ:');
    console.log(`  - エリア: ${mockAreas.length}件`);
    console.log(`  - 体育館: ${mockGyms.length}件`);
    console.log(`  - 競技: ${mockSports.length}件`);
    console.log(`  - 空き時間スロット: ${mockOpenSlots.length}件`);
    console.log(`  - データソース: ${mockSources.length}件`);
    console.log('\n🔗 Firebaseエミュレーター UI: http://localhost:4000');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// スクリプト実行
seedData();

