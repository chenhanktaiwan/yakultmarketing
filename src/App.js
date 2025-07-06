import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';

// --- 從我們的新家匯入需要的東西 ---
import { auth, db } from './firebase/config';
import Icon from './components/Icon';
import Announcements from './features/Announcements';
import Calendar from './features/Calendar';
import Chat from './features/Chat';
import Profile from './features/Profile';
import LoginScreen from './features/LoginScreen';
import LoadingScreen from './features/LoadingScreen';
import PendingApprovalScreen from './features/PendingApprovalScreen';

// --- 主應用程式 ---
function App() {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [appId] = useState('default-app-id');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                // 1. 取得或建立使用者個人資料
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
                        isAdmin: false, // 【修改處】: 新成員預設不是管理員
                        createdAt: serverTimestamp()
                    };
                    await setDoc(userDocRef, newUserProfile);
                    setUserData(newUserProfile);
                }
                setUser(currentUser);

                // 2. 確保「公開聊天室」存在，並將目前使用者加入
                const generalChatRef = doc(db, "artifacts", appId, "public", "data", "chatRooms", "general");
                const generalChatSnap = await getDoc(generalChatRef);

                if (generalChatSnap.exists()) {
                    await updateDoc(generalChatRef, {
                        members: arrayUnion(currentUser.uid)
                    });
                } else {
                    await setDoc(generalChatRef, {
                        name: "公開聊天室",
                        type: "group",
                        members: [currentUser.uid],
                        createdAt: serverTimestamp(),
                        lastMessage: '歡迎來到聊天室！',
                        lastMessageTimestamp: serverTimestamp()
                    });
                }

            } else {
                setUser(null);
                setUserData(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [appId]);

    if (loading) {
        return <LoadingScreen message="載入中..." />;
    }

    if (!user) {
        return <LoginScreen />;
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
                <h1 className="text-2xl font-bold text-[#4A666F]">養樂多行銷工作站</h1>
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
