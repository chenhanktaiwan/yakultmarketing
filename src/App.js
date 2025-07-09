import React, { useState, useEffect, useRef } from 'react';
import { 
    onAuthStateChanged, 
    signOut,
    GoogleAuthProvider,
    signInWithPopup,
    multiFactor,
    PhoneAuthProvider,
    PhoneMultiFactorGenerator
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';

import { auth, db } from './firebase/config';
import Icon from './components/Icon';
import Modal from './components/Modal'; // 引用 Modal
import Announcements from './features/Announcements';
import Calendar from './features/Calendar';
import Chat from './features/Chat';
import Profile from './features/Profile';
import LoadingScreen from './features/LoadingScreen';
import PendingApprovalScreen from './features/PendingApprovalScreen';

// --- 【全新功能】: 處理 2FA 登入的彈出視窗 ---
function MfaLoginModal({ resolver, onClose }) {
    const [verificationCode, setVerificationCode] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    
    // 在這個 Modal 中，我們只處理手機簡訊
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
            await resolver.resolveSignIn(multiFactorAssertion);
            // 登入成功，關閉視窗
            onClose();
        } catch (error) {
            console.error("2FA 登入驗證失敗:", error);
            setError("驗證碼錯誤或已過期，請再試一次。");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title="兩步驟驗證">
            <form onSubmit={handleVerifyCode}>
                <p className="mb-4">我們已將驗證碼發送到您的手機 <span className="font-semibold">{phoneFactor.phoneNumber}</span>。請輸入以完成登入。</p>
                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="mfa-code">6 位數驗證碼</label>
                    <input 
                        id="mfa-code"
                        type="text" 
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        placeholder="123456"
                        maxLength="6"
                        className="text-center text-2xl tracking-[.5em] w-full shadow appearance-none border rounded py-2 px-3"
                    />
                </div>
                {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                <div className="flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300">取消</button>
                    <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600" disabled={isLoading}>
                        {isLoading ? '驗證中...' : '登入'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}


// --- 【全新修正】: 登入畫面，現在能處理 2FA 錯誤 ---
function LoginScreen({ onMfaRequired }) {
    const handleGoogleLogin = async () => {
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            if (error.code === 'auth/multi-factor-required') {
                // 如果需要 2FA，就把 resolver 交給 App 元件處理
                console.log("需要兩步驟驗證，開啟 Modal...");
                onMfaRequired(error.resolver);
            } else {
                console.error("Google 登入失敗:", error);
                alert("登入時發生錯誤，請查看控制台以獲取更多資訊。");
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
                    <svg className="w-6 h-6" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path><path fill="none" d="M0 0h48v48H0z"></path></svg>
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
    // 【全新狀態】: 用來處理 2FA 登入流程
    const [mfaResolver, setMfaResolver] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                const userDocRef = doc(db, "artifacts", appId, "users", currentUser.uid);
                const userDocSnap = await getDoc(userDocRef);

                if (userDocSnap.exists()) {
                    setUserData(userDocSnap.data());
                } else {
                    const newUserProfile = {
                        uid: currentUser.uid,
                        email: currentUser.email || 'N/A',
                        displayName: currentUser.displayName || `成員${currentUser.uid.substring(0, 5)}`,
                        photoURL: currentUser.photoURL || '',
                        personalInfo: '新成員',
                        isApproved: true,
                        isAdmin: false,
                        createdAt: serverTimestamp()
                    };
                    await setDoc(userDocRef, newUserProfile);
                    setUserData(newUserProfile);
                }
                setUser(currentUser);

                const generalChatRef = doc(db, "artifacts", appId, "public", "data", "chatRooms", "general");
                const generalChatSnap = await getDoc(generalChatRef);
                if (generalChatSnap.exists()) {
                    await updateDoc(generalChatRef, { members: arrayUnion(currentUser.uid) });
                } else {
                    await setDoc(generalChatRef, {
                        name: "公開聊天室", type: "group", members: [currentUser.uid],
                        createdAt: serverTimestamp(), lastMessage: '歡迎來到聊天室！', lastMessageTimestamp: serverTimestamp()
                    });
                }
            } else {
                setUser(null);
                setUserData(null);
            }
            setLoading(false);
            // 登入狀態改變後，清除舊的 2FA resolver
            setMfaResolver(null);
        });
        return () => unsubscribe();
    }, [appId]);

    if (loading) {
        return <LoadingScreen message="載入中..." />;
    }

    // 如果需要 2FA 驗證，顯示驗證 Modal
    if (mfaResolver) {
        return <MfaLoginModal resolver={mfaResolver} onClose={() => setMfaResolver(null)} />;
    }

    if (!user) {
        return <LoginScreen onMfaRequired={setMfaResolver} />;
    }

    if (!userData) {
        return <LoadingScreen message="正在讀取使用者資料..." />;
    }

    if (!userData.isApproved) {
        return <PendingApprovalScreen />;
    }

    return <MainApp user={user} userData={userData} appId={appId} />;
}

// --- 主要 App 介面框架 ---
function MainApp({ user, userData, appId }) {
    const [activeTab, setActiveTab] = useState('announcements');

    const renderContent = () => {
        switch (activeTab) {
            case 'announcements':
                return <Announcements user={user} userData={userData} appId={appId} />;
            case 'calendar':
                return <Calendar user={user} appId={appId} />;
            case 'chat':
                return <Chat user={user} appId={appId} />;
            case 'profile':
                return <Profile user={user} userData={userData} appId={appId} />;
            default:
                return <Announcements user={user} userData={userData} appId={appId} />;
        }
    };

    return (
        <div className="h-screen w-screen bg-[#F0F3F4] flex flex-col font-sans">
            <header className="bg-white shadow-md w-full p-4 flex justify-between items-center z-10 sticky top-0">
                <h1 className="text-2xl font-bold text-[#4A666F]">養樂多行銷團隊工作站</h1>
                <nav className="flex items-center space-x-6">
                    <NavItem icon="bell" label="最新公告" active={activeTab === 'announcements'} onClick={() => setActiveTab('announcements')} />
                    <NavItem icon="calendar" label="行事曆" active={activeTab === 'calendar'} onClick={() => setActiveTab('calendar')} />
                    <NavItem icon="message-circle" label="聊天" active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} />
                    <NavItem icon="users" label="成員專區" active={activeTab === 'profile'} onClick={() => setActiveTab('profile')} />
                    <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
                        <img src={userData.photoURL || `https://placehold.co/40x40/5F828B/FFFFFF?text=${userData.displayName[0]}`} alt="avatar" className="w-10 h-10 rounded-full" />
                        <span className="text-gray-700 font-medium">{userData.displayName}</span>
                        <button onClick={() => signOut(auth)} className="text-gray-500 hover:text-[#5F828B] transition-colors">
                            <Icon name="log-out" />
                        </button>
                    </div>
                </nav>
            </header>
            <main className="flex-grow p-8 overflow-y-auto">
                {renderContent()}
            </main>
        </div>
    );
}

// --- 導覽列按鈕 ---
const NavItem = ({ icon, label, active, onClick }) => (
    <button onClick={onClick} className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${active ? 'bg-[#5F828B] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
        <Icon name={icon} className="w-5 h-5" />
        <span className="font-medium">{label}</span>
    </button>
);

export default App;
