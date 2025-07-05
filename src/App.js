import React, { useState, useEffect, useRef } from 'react';
// Firebase app is initialized in this file, no longer imported from a separate file.
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    onAuthStateChanged, 
    signOut,
    updateProfile,
    signInWithPopup,
    GoogleAuthProvider,
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
    serverTimestamp,
    Timestamp,
    getDocs,
    where,
    orderBy
} from 'firebase/firestore';

// --- Firebase Configuration ---
// This configuration is now complete with your provided values.
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
let firebaseApp;
try {
    firebaseApp = initializeApp(firebaseConfig);
} catch (e) {
    console.error("Firebase aponitialization error before component mount:", e);
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
        'chevron-left': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>,
        'chevron-right': <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>,
    };
    return <span className={className}>{icons[name]}</span>;
};

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg m-4">
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl leading-none">&times;</button>
                </div>
                <div className="p-6 max-h-[70vh] overflow-y-auto">
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
        if (firebaseConfig.apiKey === "YOUR_API_KEY") {
            setError("設定錯誤：請在 GitHub 的 src/App.js 檔案中，將 firebaseConfig 的預留位置換成您自己的真實設定。");
            setLoading(false);
            return; 
        }

        try {
            const firebaseAuth = getAuth(firebaseApp);
            const firestoreDb = getFirestore(firebaseApp);
            
            setAuth(firebaseAuth);
            setDb(firestoreDb);

            const unsubscribe = onAuthStateChanged(firebaseAuth, async (currentUser) => {
                if (currentUser) {
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
                    setUser(null);
                    setUserData(null);
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

    if (!user) {
        return <LoginScreen auth={auth} />;
    }

    if (!userData) {
        return <LoadingScreen message="正在讀取使用者資料..." />;
    }

    if (!userData.isApproved) {
        return <PendingApprovalScreen />;
    }

    return <MainApp user={user} userData={userData} auth={auth} db={db} appId={appId} />;
}


function LoadingScreen({ message }) {
     return <div className="flex items-center justify-center h-screen bg-gray-100"><div className="text-xl p-4 text-center">{message}</div></div>;
}


function LoginScreen({ auth }) {
    const handleGoogleLogin = async () => {
        if (!auth) {
            alert("驗證服務尚未準備好，請稍後再試。");
            return;
        }
        const provider = new GoogleAuthProvider();
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Google 登入失敗:", error);
            alert("登入時發生錯誤，請查看控制台以獲取更多資訊。");
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-[#F0F3F4]">
            <div className="text-center p-10 bg-white rounded-xl shadow-lg">
                <h1 className="text-4xl font-bold text-[#4A666F] mb-2">養樂多行銷工作站</h1>
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

    const renderContent = () => {
        switch (activeTab) {
            case 'announcements':
                return <Announcements db={db} user={user} appId={appId} />;
            case 'calendar':
                return <Calendar db={db} user={user} appId={appId} />;
            case 'chat':
                return <Chat db={db} user={user} appId={appId} />;
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

function Calendar({ db, user, appId }) {
    // --- Cloudinary Settings ---
    const CLOUDINARY_CLOUD_NAME = "duagjowes";
    const CLOUDINARY_UPLOAD_PRESET = "yakult-preset";

    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState([]);
    const [users, setUsers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    
    // Form state
    const [eventTitle, setEventTitle] = useState('');
    const [eventStart, setEventStart] = useState('');
    const [eventEnd, setEventEnd] = useState('');
    const [eventDescription, setEventDescription] = useState('');
    const [eventLink, setEventLink] = useState('');
    const [eventImageFile, setEventImageFile] = useState(null);
    const [eventParticipants, setEventParticipants] = useState([]);
    const [isUploading, setIsUploading] = useState(false);


    useEffect(() => {
        if (!db || !appId) return;

        // Fetch users for participant selection
        const fetchUsers = async () => {
            const usersCollectionRef = collection(db, "artifacts", appId, "users");
            const userSnapshot = await getDocs(usersCollectionRef);
            const userList = userSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
            setUsers(userList);
        };
        fetchUsers();

        // Fetch events
        const eventsCollectionRef = collection(db, "artifacts", appId, "public", "data", "events");
        const q = query(eventsCollectionRef);
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const eventsData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                start: doc.data().start.toDate(),
                end: doc.data().end.toDate(),
            }));
            setEvents(eventsData);
        });
        return () => unsubscribe();
    }, [db, appId]);
    
    // Helper to format date for datetime-local input, considering timezone
    const formatDateTimeLocal = (date) => {
        const d = new Date(date);
        // Adjust for timezone offset to display correctly in the local time of the user's browser
        const timezoneOffset = d.getTimezoneOffset() * 60000; // in milliseconds
        const localDate = new Date(d.getTime() - timezoneOffset);
        return localDate.toISOString().slice(0, 16);
    };


    const handleOpenModal = (event = null, date = null) => {
        if (event) {
            setSelectedEvent(event);
            setEventTitle(event.title);
            setEventStart(formatDateTimeLocal(event.start));
            setEventEnd(formatDateTimeLocal(event.end));
            setEventDescription(event.description || '');
            setEventLink(event.link || '');
            setEventParticipants(event.participants.map(p => p.uid));
        } else {
            setSelectedEvent(null);
            setEventTitle('');
            const initialDate = date ? new Date(date) : new Date();
            if(date) initialDate.setHours(9,0); // Default to 9:00 AM if a date is clicked
            
            setEventStart(formatDateTimeLocal(initialDate));
            // Default end time to one hour after start
            const endDate = new Date(initialDate.getTime() + 60 * 60 * 1000);
            setEventEnd(formatDateTimeLocal(endDate));

            setEventDescription('');
            setEventLink('');
            setEventParticipants([]);
        }
        setEventImageFile(null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => setIsModalOpen(false);

    const handleParticipantChange = (uid) => {
        setEventParticipants(prev => 
            prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
        );
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!eventTitle) {
            alert("請輸入活動標題");
            return;
        }
        setIsUploading(true);

        let imageUrl = selectedEvent?.imageUrl || '';

        if (eventImageFile) {
            const formData = new FormData();
            formData.append('file', eventImageFile);
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
            try {
                const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
                    method: 'POST',
                    body: formData,
                });
                const data = await response.json();
                if (data.secure_url) {
                    imageUrl = data.secure_url;
                } else {
                    throw new Error('圖片上傳失敗');
                }
            } catch (uploadError) {
                console.error("附件上傳錯誤:", uploadError);
                alert("上傳附件時發生錯誤。");
                setIsUploading(false);
                return;
            }
        }
        
        const start = new Date(eventStart);
        const end = new Date(eventEnd);

        const participantsData = users.filter(u => eventParticipants.includes(u.uid)).map(u => ({ uid: u.uid, displayName: u.displayName }));

        const eventData = {
            title: eventTitle,
            start: Timestamp.fromDate(start),
            end: Timestamp.fromDate(end),
            description: eventDescription,
            link: eventLink,
            imageUrl: imageUrl,
            participants: participantsData,
            authorId: user.uid,
            authorName: user.displayName
        };

        try {
            if (selectedEvent) {
                const eventRef = doc(db, "artifacts", appId, "public", "data", "events", selectedEvent.id);
                await updateDoc(eventRef, eventData);
            } else {
                await addDoc(collection(db, "artifacts", appId, "public", "data", "events"), eventData);
            }
            handleCloseModal();
        } catch (dbError) {
            console.error("儲存行程失敗:", dbError);
            alert("儲存行程時發生錯誤。");
        } finally {
            setIsUploading(false);
        }
    };

    const handleDelete = async () => {
        if (selectedEvent && window.confirm("確定要刪除這個活動嗎？")) {
            const eventRef = doc(db, "artifacts", appId, "public", "data", "events", selectedEvent.id);
            await deleteDoc(eventRef);
            handleCloseModal();
        }
    };

    const monthNames = ["一月", "二月", "三月", "四月", "五月", "六月", "七月", "八月", "九月", "十月", "十一月", "十二月"];
    const days = ['日', '一', '二', '三', '四', '五', '六'];

    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDate = new Date(startOfMonth);
    startDate.setDate(startDate.getDate() - startOfMonth.getDay());
    const endDate = new Date(endOfMonth);
    endDate.setDate(endDate.getDate() + (6 - endOfMonth.getDay()));

    const calendarDays = [];
    let day = new Date(startDate);
    while (day <= endDate) {
        calendarDays.push(new Date(day));
        day.setDate(day.getDate() + 1);
    }
    
    const changeMonth = (offset) => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-100"><Icon name="chevron-left" /></button>
                    <h2 className="text-2xl font-bold text-gray-800">{currentDate.getFullYear()} 年 {monthNames[currentDate.getMonth()]}</h2>
                    <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-100"><Icon name="chevron-right" /></button>
                </div>
                <button onClick={() => handleOpenModal()} className="flex items-center gap-2 bg-[#5F828B] text-white px-4 py-2 rounded-lg shadow hover:bg-[#4A666F] transition-colors">
                    <Icon name="plus" />
                    <span>新增行程</span>
                </button>
            </div>
            
            <div className="grid grid-cols-7 gap-px bg-gray-200 border-t border-l border-gray-200">
                {days.map(d => <div key={d} className="text-center font-medium text-gray-600 py-2 bg-gray-50">{d}</div>)}
                {calendarDays.map((d, i) => {
                    const isToday = new Date().toDateString() === d.toDateString();
                    const isCurrentMonth = d.getMonth() === currentDate.getMonth();
                    const dayEvents = events.filter(e => d >= new Date(e.start.setHours(0,0,0,0)) && d <= e.end);

                    return (
                        <div key={i} className={`relative min-h-[120px] bg-white p-2 border-b border-r border-gray-200 ${!isCurrentMonth ? 'bg-gray-50 text-gray-400' : ''}`} onClick={() => handleOpenModal(null, d)}>
                            <div className={`absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-[#5F828B] text-white' : ''}`}>{d.getDate()}</div>
                            <div className="mt-8 space-y-1">
                                {dayEvents.map(e => (
                                    <div key={e.id} onClick={(ev) => { ev.stopPropagation(); handleOpenModal(e); }} className="bg-[#A2C4C9] text-white text-sm p-1 rounded-md truncate cursor-pointer hover:bg-[#5F828B]">
                                        {e.title}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={selectedEvent ? "編輯行程" : "新增行程"}>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="event-title">標題</label>
                        <input id="event-title" type="text" value={eventTitle} onChange={e => setEventTitle(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="event-start">開始時間</label>
                            <input id="event-start" type="datetime-local" value={eventStart} onChange={e => setEventStart(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" />
                        </div>
                        <div>
                            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="event-end">結束時間</label>
                            <input id="event-end" type="datetime-local" value={eventEnd} onChange={e => setEventEnd(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" />
                        </div>
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="event-description">備註事項</label>
                        <textarea id="event-description" value={eventDescription} onChange={e => setEventDescription(e.target.value)} rows="4" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700"></textarea>
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="event-link">相關連結</label>
                        <input id="event-link" type="url" value={eventLink} onChange={e => setEventLink(e.target.value)} placeholder="https://example.com" className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700" />
                    </div>
                    <div className="mb-4">
                        <label className="block text-gray-700 text-sm font-bold mb-2">上傳附件</label>
                        <input type="file" onChange={e => setEventImageFile(e.target.files[0])} accept="image/*" className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[#A2C4C9] file:text-white hover:file:bg-[#5F828B]" />
                        {selectedEvent && selectedEvent.imageUrl && !eventImageFile && (
                            <div className="mt-2">
                                <p className="text-sm text-gray-600">目前附件：</p>
                                <img src={selectedEvent.imageUrl} alt="Event attachment" className="max-h-40 rounded-md mt-1" />
                            </div>
                        )}
                    </div>
                    <div className="mb-6">
                        <label className="block text-gray-700 text-sm font-bold mb-2">參與成員</label>
                        <div className="grid grid-cols-3 gap-2">
                            {users.map(u => (
                                <label key={u.uid} className="flex items-center gap-2 p-2 border rounded-md">
                                    <input type="checkbox" checked={eventParticipants.includes(u.uid)} onChange={() => handleParticipantChange(u.uid)} />
                                    <span>{u.displayName}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div className="flex justify-between items-center">
                        <div>
                            {selectedEvent && user.uid === selectedEvent.authorId && (
                                <button type="button" onClick={handleDelete} className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600" disabled={isUploading}>刪除</button>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={handleCloseModal} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300">取消</button>
                            <button type="submit" className="bg-[#5F828B] text-white px-4 py-2 rounded-lg hover:bg-[#4A666F]" disabled={isUploading}>
                                {isUploading ? '儲存中...' : '儲存'}
                            </button>
                        </div>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

function Chat({ db, user, appId }) {
    const [users, setUsers] = useState([]);
    const [chatRooms, setChatRooms] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);

    // Fetch all users for the chat list
    useEffect(() => {
        if (!db || !appId) return;
        const usersCollectionRef = collection(db, "artifacts", appId, "users");
        const unsubscribe = onSnapshot(usersCollectionRef, (snapshot) => {
            const userList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUsers(userList);
        });
        return unsubscribe;
    }, [db, appId]);

    // Fetch chat rooms the current user is part of
    useEffect(() => {
        if (!db || !user) return;
        const chatRoomsRef = collection(db, "artifacts", appId, "public", "data", "chatRooms");
        const q = query(chatRoomsRef, where("members", "array-contains", user.uid));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const rooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Ensure General chat exists
            const generalChatRef = doc(db, "artifacts", appId, "public", "data", "chatRooms", "general");
            getDoc(generalChatRef).then(docSnap => {
                if (!docSnap.exists()) {
                     setDoc(generalChatRef, {
                        name: "公開聊天室",
                        type: "group",
                        members: users.map(u => u.id), // Add all users to general chat
                        createdAt: serverTimestamp()
                    });
                }
            })
            setChatRooms(rooms);
            if (!activeChat) {
                setActiveChat({ id: 'general', name: '公開聊天室', type: 'group', members: users.map(u=>u.id) });
            }
        });

        return unsubscribe;
    }, [db, user, appId, users, activeChat]);

    // Fetch messages for the active chat room
    useEffect(() => {
        if (!db || !activeChat) return;
        const messagesRef = collection(db, "artifacts", appId, "public", "data", "chatRooms", activeChat.id, "messages");
        const q = query(messagesRef, orderBy("timestamp", "asc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMessages(msgs);
        });
        return unsubscribe;
    }, [db, activeChat, appId]);
    
    // Scroll to bottom of messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (newMessage.trim() === '' || !activeChat) return;

        const messagesRef = collection(db, "artifacts", appId, "public", "data", "chatRooms", activeChat.id, "messages");
        await addDoc(messagesRef, {
            text: newMessage,
            senderId: user.uid,
            senderName: user.displayName,
            senderPhotoURL: user.photoURL,
            timestamp: serverTimestamp()
        });
        setNewMessage('');
    };
    
    const startDirectChat = async (targetUser) => {
        if (targetUser.id === user.uid) return;
        
        const chatRoomId = [user.uid, targetUser.id].sort().join('_');
        const chatRoomRef = doc(db, "artifacts", appId, "public", "data", "chatRooms", chatRoomId);
        
        const docSnap = await getDoc(chatRoomRef);
        if (!docSnap.exists()) {
            await setDoc(chatRoomRef, {
                type: 'direct',
                members: [user.uid, targetUser.id],
                memberNames: {[user.uid]: user.displayName, [targetUser.id]: targetUser.displayName},
                memberPhotos: {[user.uid]: user.photoURL || '', [targetUser.id]: targetUser.photoURL || ''},
                createdAt: serverTimestamp()
            });
        }
        
        // Construct a complete object for setActiveChat to prevent crashes
        setActiveChat({
            id: chatRoomId,
            type: 'direct',
            name: targetUser.displayName, // For display in header
            members: [user.uid, targetUser.id],
            memberNames: {[user.uid]: user.displayName, [targetUser.id]: targetUser.displayName},
            memberPhotos: {[user.uid]: user.photoURL || '', [targetUser.id]: targetUser.photoURL || ''}
        });
    };

    const getChatName = (room) => {
        if (!room) return '';
        if (room.type === 'group') {
            return room.name;
        }
        const otherUserId = room.members.find(id => id !== user.uid);
        return room.memberNames?.[otherUserId] || '私人訊息';
    };
    
    const getChatPhoto = (room) => {
        if (!room) return '';
        if (room.type === 'group') {
            return `https://placehold.co/40x40/A2C4C9/FFFFFF?text=${room.name ? room.name[0] : 'G'}`;
        }
        const otherUserId = room.members.find(id => id !== user.uid);
        const photo = room.memberPhotos?.[otherUserId];
        const name = room.memberNames?.[otherUserId];
        return photo || `https://placehold.co/40x40/5F828B/FFFFFF?text=${name ? name[0] : '?'}`;
    }

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[80vh] flex">
            {/* Sidebar */}
            <div className="w-1/3 border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b">
                    <h2 className="text-xl font-bold text-gray-800">聊天室</h2>
                </div>
                <div className="flex-grow overflow-y-auto">
                    {/* Group Chats */}
                    <h3 className="p-3 text-sm font-semibold text-gray-500">群組</h3>
                     <ul>
                        {chatRooms.filter(r => r.type === 'group').map(room => (
                            <li key={room.id} onClick={() => setActiveChat(room)} className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-100 ${activeChat?.id === room.id ? 'bg-gray-200' : ''}`}>
                                <img src={getChatPhoto(room)} alt="group avatar" className="w-10 h-10 rounded-full" />
                                <span className="font-medium">{getChatName(room)}</span>
                            </li>
                        ))}
                    </ul>
                    {/* Direct Messages */}
                    <h3 className="p-3 text-sm font-semibold text-gray-500 border-t mt-2">成員</h3>
                    <ul>
                        {users.filter(u => u.id !== user.uid).map(u => (
                             <li key={u.id} onClick={() => startDirectChat(u)} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-100">
                                <img src={u.photoURL || `https://placehold.co/40x40/5F828B/FFFFFF?text=${u.displayName[0]}`} alt="user avatar" className="w-10 h-10 rounded-full" />
                                <span className="font-medium">{u.displayName}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="w-2/3 flex flex-col">
                {activeChat ? (
                    <>
                        <div className="p-4 border-b flex items-center gap-4">
                            <img src={getChatPhoto(activeChat)} alt="chat avatar" className="w-10 h-10 rounded-full" />
                            <h3 className="font-bold text-lg">{getChatName(activeChat)}</h3>
                        </div>
                        <div className="flex-grow p-6 overflow-y-auto bg-gray-50">
                            <div className="space-y-4">
                                {messages.map(msg => (
                                    <div key={msg.id} className={`flex items-end gap-3 ${msg.senderId === user.uid ? 'justify-end' : 'justify-start'}`}>
                                        {msg.senderId !== user.uid && (
                                            <img src={msg.senderPhotoURL || `https://placehold.co/40x40/5F828B/FFFFFF?text=${msg.senderName ? msg.senderName[0] : '?'}`} alt="sender" className="w-8 h-8 rounded-full" />
                                        )}
                                        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-xl ${msg.senderId === user.uid ? 'bg-[#5F828B] text-white' : 'bg-white'}`}>
                                            <p className="text-sm">{msg.text}</p>
                                            <p className={`text-xs mt-1 ${msg.senderId === user.uid ? 'text-gray-300' : 'text-gray-500'}`}>{msg.timestamp ? new Date(msg.timestamp.seconds * 1000).toLocaleTimeString() : ''}</p>
                                        </div>
                                         {msg.senderId === user.uid && (
                                            <img src={user.photoURL || `https://placehold.co/40x40/5F828B/FFFFFF?text=${user.displayName[0]}`} alt="sender" className="w-8 h-8 rounded-full" />
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div ref={messagesEndRef} />
                        </div>
                        <div className="p-4 bg-white border-t">
                            <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                                <input 
                                    type="text" 
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    placeholder="輸入訊息..." 
                                    className="flex-grow border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#5F828B]"
                                />
                                <button type="submit" className="bg-[#5F828B] text-white p-2 rounded-lg hover:bg-[#4A666F] disabled:bg-gray-300" disabled={!newMessage.trim()}>
                                    <Icon name="send" />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        選擇一個聊天室開始對話
                    </div>
                )}
            </div>
        </div>
    );
}

function Profile({ user, userData, auth, db, appId }) {
    // --- Cloudinary Settings ---
    const CLOUDINARY_CLOUD_NAME = "duagjowes";
    const CLOUDINARY_UPLOAD_PRESET = "yakult-preset";
    
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
