/**
 * 特定の体育館とその関連データを削除するスクリプト
 * 
 * 使い方:
 * node scripts/delete-gym.js "体育館名"
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, deleteDoc, doc, connectFirestoreEmulator } = require('firebase/firestore');

// Firebase設定（エミュレーター用）
const firebaseConfig = {
  projectId: 'demo-taikan',
};

// Firebase初期化
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// エミュレーターに接続
try {
  connectFirestoreEmulator(db, 'localhost', 8080);
  console.log('🔌 Firestoreエミュレーターに接続しました');
} catch (error) {
  console.log('ℹ️  既にエミュレーターに接続済みです');
}

/**
 * 体育館名で体育館を検索して削除
 */
async function deleteGym(gymName) {
  try {
    console.log(`🔍 体育館「${gymName}」を検索中...`);
    
    // 1. gymsコレクションから体育館を検索
    const gymsSnapshot = await getDocs(
      query(collection(db, 'gyms'), where('name', '==', gymName))
    );
    
    if (gymsSnapshot.empty) {
      console.log(`❌ 体育館「${gymName}」が見つかりませんでした`);
      return;
    }
    
    const gymDoc = gymsSnapshot.docs[0];
    const gymDocId = gymDoc.id;
    const gymData = gymDoc.data();
    const gymId = `gym_${gymDocId}`;
    
    console.log(`✅ 体育館を発見: ${gymName} (ID: ${gymDocId})`);
    
    // 2. 関連するopen_slotsを削除
    console.log('🔍 関連する空き時間スロットを検索中...');
    const slotsSnapshot = await getDocs(
      query(collection(db, 'open_slots'), where('gym_id', '==', gymId))
    );
    
    console.log(`  📋 見つかったスロット: ${slotsSnapshot.size}件`);
    for (const slotDoc of slotsSnapshot.docs) {
      await deleteDoc(doc(db, 'open_slots', slotDoc.id));
      console.log(`  ✓ スロットを削除: ${slotDoc.id}`);
    }
    
    // 3. 関連するsourcesを削除
    console.log('🔍 関連するソースを検索中...');
    const sourcesSnapshot = await getDocs(
      query(collection(db, 'sources'), where('gym_id', '==', gymId))
    );
    
    console.log(`  📋 見つかったソース: ${sourcesSnapshot.size}件`);
    for (const sourceDoc of sourcesSnapshot.docs) {
      await deleteDoc(doc(db, 'sources', sourceDoc.id));
      console.log(`  ✓ ソースを削除: ${sourceDoc.id}`);
    }
    
    // 4. gymsコレクションから体育館を削除
    await deleteDoc(doc(db, 'gyms', gymDocId));
    console.log(`✅ 体育館を削除: ${gymName}`);
    
    console.log('\n🎉 削除完了！');
    console.log(`  - 体育館: 1件`);
    console.log(`  - 空き時間スロット: ${slotsSnapshot.size}件`);
    console.log(`  - ソース: ${sourcesSnapshot.size}件`);
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

// コマンドライン引数から体育館名を取得
const gymName = process.argv[2];

if (!gymName) {
  console.error('❌ 使用方法: node scripts/delete-gym.js "体育館名"');
  console.error('例: node scripts/delete-gym.js "川口市スポーツセンター"');
  process.exit(1);
}

// 削除実行
deleteGym(gymName).then(() => {
  console.log('\n✅ 処理が完了しました');
  process.exit(0);
}).catch((error) => {
  console.error('❌ エラー:', error);
  process.exit(1);
});

