import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, PhoneAuthProvider, PhoneMultiFactorGenerator } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';

import { auth, db } from './firebase/config';
import Icon from './components/Icon';
import Announcements from './features/Announcements';
import Calendar from './features/Calendar';
import Chat from './features/Chat';
import Profile from './features/Profile';
import LoadingScreen from './features/LoadingScreen';
import PendingApprovalScreen from './features/PendingApprovalScreen';

// 【修正重點】MfaVerificationScreen 保持不變，它本身設計得很好
function MfaVerificationScreen({ resolver, onCancel }) {
    const [verificationCode, setVerificationCode] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    const phoneFactor = resolver.hints.find(hint => hint.factorId === PhoneMultiFactorGenerator.FACTOR_ID);

    const handleVerifyCode = async (e) => {
        e.preventDefault();
        setError('');
        if (verificationCode.length !== 6) {
            setError("請輸入 6 位數的驗證碼。");
            return;
        }
        setIsLoading(true);
        try {
            const cred = PhoneAuthProvider.credential(resolver.verificationId, verificationCode);
            const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(cred);
            // 驗證成功後，Firebase 會自動更新登入狀態，App 元件會因 onAuthStateChanged 重新渲染
            await resolver.resolveSignIn(multiFactorAssertion);
        } catch (error) {
            console.error("2FA 登入驗證失敗:", error);
            setError("驗證碼錯誤或已過期，請再試一次。");
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-[#F0F3F4]">
            <div className="w-full max-w-md text-center p-8 bg-white rounded-xl shadow-lg">
                <h1 className="text-3xl font-bold text-[#4A666F] mb-4">兩步驟驗證</h1>
                <p className="mb-6 text-gray-600">
                    為了保護您的帳號安全，我們已將 6 位數驗證碼發送到您的手機 <span className="font-semibold">{phoneFactor?.phoneNumber}</span>。
                </p>
                <form onSubmit={handleVerifyCode}>
                    <div className="mb-4">
                        <input 
                            type="text" 
                            value={verificationCode}
                            onChange={(e) => setVerificationCode(e.target.value)}
                            placeholder="1 2 3 4 5 6"
                            maxLength="6"
                            className="text-center text-3xl tracking-[.5em] w-full shadow-inner appearance-none border rounded py-3 px-4"
                        />
                    </div>
                    {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                    <div className="flex flex-col sm:flex-row justify-center gap-3 mt-6">
                        <button type="submit" className="w-full bg-green-500 text-white font-bold px-4 py-3 rounded-lg hover:bg-green-600 transition-colors disabled:bg-gray-400" disabled={isLoading}>
                            {isLoading ? '驗證中...' : '驗證並登入'}
                        </button>
                        <button type="button" onClick={onCancel} className="w-full bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors">
                            取消
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// 【修正重點】LoginScreen 保持不變，確保它能把 MFA 需求往上傳遞
function LoginScreen({ onMfaRequired, onLoginError }) {
    const handleGoogleLogin = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
            // 成功登入（無論是否需要MFA）後，onAuthStateChanged 會處理後續
        } catch (error) {
            // 【關鍵】捕捉到 MFA 需求，並將 resolver 傳遞給 App 元件
            if (error.code === 'auth/multi-factor-required') {
                onMfaRequired(error.resolver);
            } else {
                // 其他所有類型的登入錯誤
                console.error("Google 登入失敗:", error);
                onLoginError("登入時發生錯誤，請稍後再試。");
            }
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-[#F0F3F4]">
            <div className="text-center p-10 bg-white rounded-xl shadow-lg">
                <h1 className="text-4xl font-bold text-[#4A666F] mb-2">養樂多行銷團隊工作站</h1>
                <p className="text-gray-600 mb-8">專業團隊的協作平台</p>
                <button
                    onClick={handleGoogleLogin}
                    className="flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 font-semibold py-3 px-6 rounded-lg shadow-md hover:bg-gray-50 transition-all duration-300"
                >
                    <svg className="w-6 h-6" viewBox="0 0 48 48">...</svg>
                    使用 Google 帳號登入 / 申請加入
                </button>
            </div>
        </div>
    );
}


// --- 主應用程式 ---
function App() {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [appId] = useState('default-app-id');
    const [mfaResolver, setMfaResolver] = useState(null); // 【關鍵狀態】

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setLoading(true); // 開始處理登入狀態時，顯示讀取畫面
            setMfaResolver(null); // 【重要】每次登入狀態改變，都重置 MFA 狀態

            if (currentUser) {
                // ... (您原本處理使用者資料的邏輯保持不變)
                const userDocRef = doc(db, "artifacts", appId, "users", currentUser.uid);
                const userDocSnap = await getDoc(userDocRef);
                if (userDocSnap.exists()) {
                    setUserData(userDocSnap.data());
                } else {
                    const newUserProfile = { uid: currentUser.uid, email: currentUser.email, displayName: currentUser.displayName, photoURL: currentUser.photoURL, isApproved: true, isAdmin: false, createdAt: serverTimestamp() };
                    await setDoc(userDocRef, newUserProfile);
                    setUserData(newUserProfile);
                }
                setUser(currentUser);
            } else {
                // 使用者為 null (登出或未登入)
                setUser(null);
                setUserData(null);
            }
            setLoading(false); // 處理完畢，關閉讀取畫面
        });
        return () => unsubscribe();
    }, [appId]);

    // 【關鍵渲染邏輯】
    // 1. 優先顯示載入畫面
    if (loading) {
        return <LoadingScreen message="驗證使用者身份中..." />;
    }

    // 2. 如果偵測到 MFA 需求，就顯示 MFA 驗證畫面
    if (mfaResolver) {
        return <MfaVerificationScreen 
                    resolver={mfaResolver} 
                    onCancel={() => setMfaResolver(null)} // 允許使用者取消 MFA
                />;
    }

    // 3. 如果沒有登入的使用者，顯示登入畫面
    if (!user) {
        return <LoginScreen 
                    onMfaRequired={setMfaResolver} // 將設定 MFA 狀態的函式傳下去
                    onLoginError={(msg) => alert(msg)} // 處理其他登入錯誤
                />;
    }

    // 4. 如果使用者資料還沒載入好，顯示另一個讀取畫面
    if (!userData) {
        return <LoadingScreen message="正在讀取使用者資料..." />;
    }
    
    // 5. 檢查使用者是否被核准
    if (!userData.isApproved) {
        return <PendingApprovalScreen />;
    }

    // 6. 所有檢查通過，顯示主應用程式
    return <MainApp user={user} userData={userData} appId={appId} />;
}

// --- MainApp 和 NavItem 元件保持不變 ---
function MainApp({ user, userData, appId }) { /* ... */ }
const NavItem = ({ icon, label, active, onClick }) => { /* ... */ };

export default App;
