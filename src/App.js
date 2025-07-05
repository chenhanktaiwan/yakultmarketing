import React, { useState, useEffect, useRef } from 'react';
// Firebase app is initialized in this file, no longer imported from a separate file.
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged, 
    signOut,
    updateProfile,
    signInAnonymously,
    // signInWithCustomToken is not typically used in a deployed app
} from 'firebase/auth';
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    collection, 
    addDoc, 
    query, 
    onSnapshot,
    deleteDoc,
    updateDoc,
    serverTimestamp
} from 'firebase/firestore';

// --- Firebase Configuration ---
// !! 非常重要 !!
// TODO: 請將下方所有 "YOUR_..." 的預留位置，完整替換成您在 Firebase 控制台取得的真實設定。
const firebaseConfig = {
  apiKey: "AIzaSyA2tq_5whGRqB-6lqneEsdUEJ8DSD_-hII",
  authDomain: "yakulttwmarketing.firebaseapp.com",
  projectId: "yakulttwmarketing",
  storageBucket: "yakulttwmarketing.firebasestorage.app",
  messagingSenderId: "1023004807231",
  appId: "1:1023004807231:web:cf5b79d2709f548381a88a",
  measurementId: "G-6G7GCT6GLB"
};

// Initialize Firebase
// We will initialize it inside the component to handle potential config errors.
let firebaseApp;
try {
    firebaseApp = initializeApp(firebaseConfig);
} catch (e) {
    console.error("Firebase aponitialization error before component mount:", e);
    // This error will be caught and displayed within the App component.
}


// --- Helper Components & Icons ---

const Icon = ({ name, className }) => {
    const icons = {
        'bell': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>,
        'calendar': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>,
        'message-circle': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>,
        'users': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
        'log-out': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>,
        'plus': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>,
        'edit': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>,
        'trash': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>,
        'send': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>,
        'key': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="7.5" cy="15.5" r="5.5"/><path d="m21 2-9.6 9.6"/><path d="m15.5 7.5 3 3L22 7l-3-3"/></svg>,
        'shield-check': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></svg>,
    };
    return <span className={className}>{icons[name]}</span>;
};

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md m-4">
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800">&times;</button>
                </div>
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
};

// --- Main Application Components ---

function App() {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // Firebase state
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [appId, setAppId] = useState('default-app-id'); // Use a default for deployed apps

    useEffect(() => {
        // Add a check for placeholder values
        if (firebaseConfig.apiKey === "YOUR_API_KEY") {
            setError("設定錯誤：請在 GitHub 的 src/App.js 檔案中，將 firebaseConfig 的預留位置換成您自己的真實設定。");
            setLoading(false);
            return; // Stop execution if config is not set
        }

        try {
            // firebaseApp is now initialized in this file
            const firebaseAuth = getAuth(firebaseApp);
            const firestoreDb = getFirestore(firebaseApp);
            
            setAuth(firebaseAuth);
            setDb(firestoreDb);

            const unsubscribe = onAuthStateChanged(firebaseAuth, async (currentUser) => {
                if (currentUser) {
                    // For a real app, you might want a more robust way to get the appId
                    const userDocRef = doc(firestoreDb, "artifacts", appId, "users", currentUser.uid);
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
                            createdAt: serverTimestamp()
                        };
                        await setDoc(userDocRef, newUserProfile);
                        setUserData(newUserProfile);
                    }
                    setUser(currentUser);
                } else {
                    // If no user, sign in anonymously for this demo
                    signInAnonymously(firebaseAuth).catch(err => {
                        console.error("Anonymous sign-in failed", err);
                        setError("無法匿名登入，部分功能可能無法使用。");
                    });
                }
                setLoading(false);
            });

            return () => unsubscribe();
        } catch (e) {
            console.error("Firebase 初始化失敗:", e);
            if (e.message.includes("api-key-not-valid")) {
                setError("Firebase API 金鑰不正確，請檢查貼上的設定。");
            } else {
                setError("Firebase 初始化失敗，請檢查設定。");
            }
            setLoading(false);
        }
    }, [appId]);

    if (loading) {
        return <LoadingScreen message="載入中..." />;
    }
    
    if (error) {
        return <LoadingScreen message={`錯誤: ${error}`} />;
    }

    if (!user || !userData) {
        return <LoginScreen />;
    }

    if (!userData.isApproved) {
        return <PendingApprovalScreen />;
    }

    return <MainApp user={user} userData={userData} auth={auth} db={db} appId={appId} />;
}


function LoadingScreen({ message }) {
     return <div className="flex items-center justify-center h-screen bg-gray-100"><div className="text-xl">{message}</div></div>;
}


function LoginScreen() {
    // In a real app, you'd have a Google Sign-In button here.
    // For this deployment, we rely on the anonymous sign-in in the main App component.
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-[#F0F3F4]">
            <div className="text-center p-10 bg-white rounded-xl shadow-lg">
                <h1 className="text-4xl font-bold text-[#4A666F] mb-2">養樂多行銷工作站</h1>
                <p className="text-gray-600 mb-8">專業團隊的協作平台</p>
                <div className="text-lg text-gray-700">正在連接到工作站...</div>
            </div>
        </div>
    );
}

function PendingApprovalScreen() {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-[#F0F3F4]">
            <div className="text-center p-10 bg-white rounded-xl shadow-lg">
                <h1 className="text-3xl font-bold text-[#4A666F] mb-4">申請已提交</h1>
                <p className="text-gray-600">您的加入申請正在等待管理員核准，請耐心等候。</p>
            </div>
        </div>
    );
}

function MainApp({ user, userData, auth, db, appId }) {
    const [activeTab, setActiveTab] = useState('announcements');

    const handleLogout = async () => {
        await signOut(auth);
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'announcements':
                return <Announcements db={db} user={user} appId={appId} />;
            case 'calendar':
                return <Calendar />;
            case 'chat':
                return <Chat />;
            case 'profile':
                return <Profile user={user} userData={userData} auth={auth} db={db} appId={appId} />;
            default:
                return <Announcements db={db} user={user} appId={appId} />;
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
                        <button onClick={handleLogout} className="text-gray-500 hover:text-[#5F828B] transition-colors">
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

const NavItem = ({ icon, label, active, onClick }) => (
    <button onClick={onClick} className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${active ? 'bg-[#5F828B] text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
        <Icon name={icon} className="w-5 h-5" />
        <span className="font-medium">{label}</span>
    </button>
);


// --- Feature Components ---

function Announcements({ db, user, appId }) {
    const [announcements, setAnnouncements] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAnnouncement, setEditingAnnouncement] = useState(null);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    useEffect(() => {
        if (!db || !appId) return;
        const announcementsCollectionRef = collection(db, "artifacts", appId, "public", "data", "announcements");
        const q = query(announcementsCollectionRef);
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const announcementsData = [];
            querySnapshot.forEach((doc) => {
                announcementsData.push({ id: doc.id, ...doc.data() });
            });
            announcementsData.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
            setAnnouncements(announcementsData);
        }, (error) => {
            console.error("讀取公告失敗:", error);
        });
        return () => unsubscribe();
    }, [db, appId]);

    const handleOpenModal = (announcement = null) => {
        if (announcement) {
            setEditingAnnouncement(announcement);
            setTitle(announcement.title);
            setContent(announcement.content);
        } else {
            setEditingAnnouncement(null);
            setTitle('');
            setContent('');
        }
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingAnnouncement(null);
        setTitle('');
        setContent('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) {
            alert("標題和內容不能為空！");
            return;
        }

        const announcementsCollectionRef = collection(db, "artifacts", appId, "public", "data", "announcements");

        if (editingAnnouncement) {
            const docRef = doc(db, "artifacts", appId, "public", "data", "announcements", editingAnnouncement.id);
            await updateDoc(docRef, {
                title,
                content
            });
        } else {
            await addDoc(announcementsCollectionRef, {
                title,
                content,
                authorId: user.uid,
                authorName: user.displayName,
                createdAt: serverTimestamp()
            });
        }
        handleCloseModal();
    };
    
    const handleDelete = async (id) => {
        if (window.confirm("確定要刪除這則公告嗎？")) {
            const docRef = doc(db, "artifacts", appId, "public", "data", "announcements", id);
            await deleteDoc(docRef);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">最新公告</h2>
                <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-[#5F828B] text-white px-4 py-2 rounded-lg shadow hover:bg-[#4A666F] transition-colors">
                    <Icon name="plus" />
                    <span>新增公告</span>
                </button>
            </div>
            <div className="space-y-4">
                {announcements.map(ann => (
                    <div key={ann.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex justify-between items-start">
                             <div>
                                <h3 className="text-xl font-semibold text-[#4A666F]">{ann.title}</h3>
                                <p className="text-sm text-gray-500 mt-1">發布人: {ann.authorName} | 時間: {ann.createdAt ? new Date(ann.createdAt.seconds * 1000).toLocaleString() : '讀取中...'}</p>
                             </div>
                             {user.uid === ann.authorId && (
                                <div className="flex space-x-2">
                                    <button onClick={() => handleOpenModal(ann)} className="text-gray-500 hover:text-blue-600"><Icon name="edit" /></button>
                                    <button onClick={() => handleDelete(ann.id)} className="text-gray-500 hover:text-red-600"><Icon name="trash" /></button>
                                </div>
                             )}
                        </div>
                        <p className="text-gray-700 mt-4 whitespace-pre-wrap">{ann.content}</p>
                    </div>
                ))}
            </div>
            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingAnnouncement ? "編輯公告" : "新增公告"}>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="title">標題</label>
                        <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
                    </div>
                    <div className="mb-6">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="content">內容</label>
                        <textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} rows="5" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"></textarea>
                    </div>
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={handleCloseModal} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300">取消</button>
                        <button type="submit" className="bg-[#5F828B] text-white px-4 py-2 rounded-lg hover:bg-[#4A666F]">儲存</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

function Calendar() {
    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 h-full">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">行事曆</h2>
            <p className="text-gray-600">此功能正在開發中。您將能夠在這裡建立、編輯和刪除行程，並邀請成員參加。</p>
            <div className="mt-6 p-8 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-500">
                行事曆視圖將會顯示在這裡
            </div>
        </div>
    );
}

function Chat() {
    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">聊天</h2>
            <p className="text-gray-600 mb-4">此功能正在開發中。您將能夠在這裡與成員進行一對一或群組聊天。</p>
            <div className="flex-grow border-2 border-dashed border-gray-300 rounded-lg flex">
                <div className="w-1/3 border-r border-dashed border-gray-300 p-4">
                    <h3 className="font-semibold text-gray-500">聊天列表</h3>
                </div>
                <div className="w-2/3 p-4 flex flex-col justify-end">
                     <div className="text-center text-gray-500">選擇一個聊天室開始對話</div>
                     <div className="mt-4 flex gap-2">
                        <input type="text" placeholder="輸入訊息..." className="flex-grow border rounded-lg p-2" disabled/>
                        <button className="bg-gray-300 text-white p-2 rounded-lg cursor-not-allowed"><Icon name="send"/></button>
                     </div>
                </div>
            </div>
        </div>
    );
}

function Profile({ user, userData, auth, db, appId }) {
    // --- Cloudinary Settings ---
    // !! 非常重要 !!
    // TODO: 請將下方兩個值換成您在 Cloudinary 儀表板上找到的真實值
    const CLOUDINARY_CLOUD_NAME = "YOUR_CLOUD_NAME";
    const CLOUDINARY_UPLOAD_PRESET = "YOUR_UPLOAD_PRESET";
    
    const [displayName, setDisplayName] = useState(userData.displayName);
    const [personalInfo, setPersonalInfo] = useState(userData.personalInfo);
    const [photo, setPhoto] = useState(null);
    const [photoURL, setPhotoURL] = useState(userData.photoURL);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        if (e.target.files[0]) {
            setPhoto(e.target.files[0]);
            const reader = new FileReader();
            reader.onload = (event) => {
                setPhotoURL(event.target.result);
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };
    
    const handleUpdateProfile = async () => {
        if (!CLOUDINARY_CLOUD_NAME || CLOUDINARY_CLOUD_NAME === "YOUR_CLOUD_NAME") {
            alert("請先在程式碼中設定您的 Cloudinary Cloud Name 和 Upload Preset！");
            return;
        }
        setIsUploading(true);
        let newPhotoURL = userData.photoURL;

        // If a new photo was selected, upload it to Cloudinary
        if (photo) {
            const formData = new FormData();
            formData.append('file', photo);
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

            try {
                const response = await fetch(
                    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
                    {
                        method: 'POST',
                        body: formData,
                    }
                );
                const data = await response.json();
                if (data.secure_url) {
                    newPhotoURL = data.secure_url;
                } else {
                    throw new Error('圖片上傳至 Cloudinary 失敗');
                }
            } catch (error) {
                console.error("Cloudinary 上傳錯誤:", error);
                alert("上傳大頭貼時發生錯誤。");
                setIsUploading(false);
                return;
            }
        }

        // Update Firebase Auth profile and Firestore document
        try {
            await updateProfile(auth.currentUser, {
                displayName,
                photoURL: newPhotoURL
            });

            const userDocRef = doc(db, "artifacts", appId, "users", user.uid);
            await updateDoc(userDocRef, {
                displayName,
                personalInfo,
                photoURL: newPhotoURL
            });
            
            alert("個人資料已更新！");
        } catch (error) {
            console.error("更新個人資料失敗:", error);
            alert("更新個人資料時發生錯誤。");
        } finally {
            setIsUploading(false);
        }
    };


    return (
        <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-6">成員專區</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Profile Info */}
                <div className="md:col-span-2 bg-white p-8 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-xl font-semibold text-[#4A666F] mb-6">個人資訊</h3>
                    <div className="flex items-center space-x-6 mb-8">
                        <img 
                            src={photoURL || `https://placehold.co/100x100/5F828B/FFFFFF?text=${displayName[0]}`} 
                            alt="avatar" 
                            className="w-24 h-24 rounded-full object-cover cursor-pointer"
                            onClick={() => fileInputRef.current.click()}
                        />
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                        <div>
                            <button onClick={() => fileInputRef.current.click()} className="text-sm bg-gray-200 px-3 py-1 rounded hover:bg-gray-300">更換大頭貼</button>
                            <p className="text-xs text-gray-500 mt-2">點擊頭像或按鈕來上傳新圖片。</p>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">電子郵件</label>
                            <input type="email" value={user.email || 'N/A'} disabled className="mt-1 block w-full bg-gray-100 border-gray-300 rounded-md shadow-sm p-2" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">個人名稱</label>
                            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 focus:ring-[#5F828B] focus:border-[#5F828B]" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700">個人簡介</label>
                            <textarea value={personalInfo} onChange={(e) => setPersonalInfo(e.target.value)} rows="3" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 focus:ring-[#5F828B] focus:border-[#5F828B]"></textarea>
                        </div>
                    </div>
                    <div className="mt-8 text-right">
                        <button onClick={handleUpdateProfile} disabled={isUploading} className="bg-[#5F828B] text-white px-5 py-2 rounded-lg shadow hover:bg-[#4A666F] transition-colors disabled:bg-gray-400">
                            {isUploading ? '更新中...' : '儲存變更'}
                        </button>
                    </div>
                </div>

                {/* Security Settings */}
                <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-xl font-semibold text-[#4A666F] mb-6">安全性設定</h3>
                    <div className="space-y-6">
                        <div className="p-4 border border-dashed border-gray-300 rounded-lg">
                            <div className="flex items-center gap-3">
                                <Icon name="key" className="text-gray-500" />
                                <h4 className="font-semibold text-gray-800">登入密碼</h4>
                            </div>
                            <p className="text-sm text-gray-600 mt-2 mb-3">此功能正在開發中。您將能夠設定一組獨立的密碼，用於非 Google 管道登入。</p>
                            <button disabled className="w-full bg-gray-300 text-gray-500 px-4 py-2 rounded-lg cursor-not-allowed">設定密碼</button>
                        </div>
                         <div className="p-4 border border-dashed border-gray-300 rounded-lg">
                            <div className="flex items-center gap-3">
                                <Icon name="shield-check" className="text-gray-500" />
                                <h4 className="font-semibold text-gray-800">兩步驟驗證 (2FA)</h4>
                            </div>
                            <p className="text-sm text-gray-600 mt-2 mb-3">此功能正在開發中。啟用後，登入時需額外輸入 Google Authenticator 產生的驗證碼。</p>
                            <button disabled className="w-full bg-gray-300 text-gray-500 px-4 py-2 rounded-lg cursor-not-allowed">啟用 2FA</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;
