/**
 * Firebase設定（シングルトンパターン + エミュレーター対応）
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, Auth, connectAuthEmulator } from 'firebase/auth';
import { getStorage, FirebaseStorage, connectStorageEmulator } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Firebase App初期化（HMR対応）
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Firestore
const db = getFirestore(app);

// Auth
const auth = getAuth(app);

// Storage
const storage = getStorage(app);

// エミュレーター接続（開発環境のみ、かつ未接続の場合）
if (process.env.NODE_ENV === 'development') {
  // Firestoreエミュレーター
  try {
    // @ts-ignore - _settingsは内部プロパティだが接続チェックに使用
    if (!db._settings?.host?.includes('localhost')) {
      connectFirestoreEmulator(db, 'localhost', 8080);
      console.log('✅ Connected to Firestore Emulator');
    }
  } catch (error) {
    console.log('ℹ️ Firestore Emulator already connected');
  }

  // Authエミュレーター
  try {
    // @ts-ignore
    if (!auth.config.emulator) {
      connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
      console.log('✅ Connected to Auth Emulator');
    }
  } catch (error) {
    console.log('ℹ️ Auth Emulator already connected');
  }

  // Storageエミュレーター
  try {
    // @ts-ignore
    if (!storage._host?.includes('localhost')) {
      connectStorageEmulator(storage, 'localhost', 9199);
      console.log('✅ Connected to Storage Emulator');
    }
  } catch (error) {
    console.log('ℹ️ Storage Emulator already connected');
  }
}

export { app, db, auth, storage };

