// Firebase 官方提供的各種功能工具箱
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// --- 你的 Firebase 連接設定 (現在從保險箱讀取) ---
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
};

// --- 初始化 Firebase App ---
// 這就像是啟動與雲端伺服器的連線
const firebaseApp = initializeApp(firebaseConfig);

// --- 建立並匯出我們需要的功能 ---
// 我們把「認證功能」和「資料庫功能」準備好，並把它們匯出 (export)
// 這樣其他檔案就可以 import (匯入) 來使用
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export default firebaseApp;
