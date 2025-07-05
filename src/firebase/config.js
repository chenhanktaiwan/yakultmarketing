// Firebase 官方提供的各種功能工具箱
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// --- 你的 Firebase 連接設定 ---
const firebaseConfig = {
  apiKey: "AIzaSyA2tq_5whGRqB-6lqneEsdUEJ8DSD_-hII",
  authDomain: "yakulttwmarketing.firebaseapp.com",
  projectId: "yakulttwmarketing",
  storageBucket: "yakulttwmarketing.firebasestorage.app",
  messagingSenderId: "1023004807231",
  appId: "1:1023004807231:web:cf5b79d2709f548381a88a",
  measurementId: "G-6G7GCT6GLB"
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
