import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase/config';
import { collection, query, onSnapshot, addDoc, doc, getDoc, setDoc, where, orderBy, serverTimestamp, updateDoc } from 'firebase/firestore';
import Icon from '../components/Icon';

// --- 【全新功能】: 連結預覽情報員 ---
// 這個元件會接收一個網址，並去外部服務取得預覽資訊
const LinkPreview = ({ url }) => {
    const [preview, setPreview] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // 使用一個免費的代理服務來取得網址元數據，避免 CORS 問題
        fetch(`https://jsonlink.io/api/extractor?url=${encodeURIComponent(url)}`)
            .then(res => res.json())
            .then(data => {
                if (data && data.title) {
                    setPreview(data);
                }
            })
            .catch(err => console.error("無法取得連結預覽:", err))
            .finally(() => setIsLoading(false));
    }, [url]);

    // 如果正在載入或沒有預覽資訊，就不顯示任何東西
    if (isLoading || !preview) {
        return null;
    }

    return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="mt-2 block bg-gray-100 hover:bg-gray-200 p-3 rounded-lg">
            <div className="flex gap-3">
                {preview.image && (
                    <img src={preview.image} alt="Link preview" className="w-24 h-24 object-cover rounded-md flex-shrink-0" />
                )}
                <div className="flex flex-col justify-center overflow-hidden">
                    <h4 className="font-bold text-sm text-gray-800 truncate">{preview.title}</h4>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">{preview.description}</p>
                    <p className="text-xs text-gray-400 mt-2 truncate">{preview.domain}</p>
                </div>
            </div>
        </a>
    );
};


// --- 【升級功能】: 網址轉換小幫手，現在會包含連結預覽 ---
const MessageRenderer = ({ text }) => {
    if (typeof text !== 'string') {
        return <span>{text}</span>;
    }
    const urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    const parts = text.split(urlRegex);

    return (
        <span>
            {parts.map((part, index) => {
                if (part && part.match(urlRegex)) {
                    return (
                        <React.Fragment key={index}>
                            <a 
                                href={part} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {part}
                            </a>
                            <LinkPreview url={part} />
                        </React.Fragment>
                    );
                }
                return <span key={index}>{part}</span>;
            })}
        </span>
    );
};


// 時間格式化工具 (保持不變)
function formatLastMessageTime(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    
    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString('zh-TW', { hour: 'numeric', minute: '2-digit', hour12: true });
    }
    
    return date.toLocaleDateString('zh-TW', { month: 'numeric', day: 'numeric' });
}

function Chat({ user, appId }) {
    const [users, setUsers] = useState([]);
    const [chatRooms, setChatRooms] = useState([]);
    const [activeChat, setActiveChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);
    const [sidebarView, setSidebarView] = useState('list');

    useEffect(() => {
        if (!db || !appId) return;
        const usersCollectionRef = collection(db, "artifacts", appId, "users");
        const unsubscribe = onSnapshot(usersCollectionRef, (snapshot) => {
            const userList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUsers(userList);
        });
        return unsubscribe;
    }, [db, appId]);

    useEffect(() => {
        if (!db || !user) return;
        const chatRoomsRef = collection(db, "artifacts", appId, "public", "data", "chatRooms");
        const q = query(chatRoomsRef, where("members", "array-contains", user.uid), orderBy("lastMessageTimestamp", "desc"));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const rooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setChatRooms(rooms);

            if (!activeChat && rooms.length > 0) {
                setActiveChat(rooms[0]); 
            }
        });
        return unsubscribe;
    }, [db, user, appId]);

    useEffect(() => {
        if (!db || !activeChat) {
            setMessages([]);
            return;
        };
        const messagesRef = collection(db, "artifacts", appId, "public", "data", "chatRooms", activeChat.id, "messages");
        const q = query(messagesRef, orderBy("timestamp", "asc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMessages(msgs);
        });
        return unsubscribe;
    }, [db, activeChat, appId]);
    
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (newMessage.trim() === '' || !activeChat) return;
        const currentMessage = newMessage;
        setNewMessage(''); 
        const messagesRef = collection(db, "artifacts", appId, "public", "data", "chatRooms", activeChat.id, "messages");
        await addDoc(messagesRef, {
            text: currentMessage,
            senderId: user.uid,
            senderName: user.displayName,
            senderPhotoURL: user.photoURL,
            timestamp: serverTimestamp()
        });
        const chatRoomRef = doc(db, "artifacts", appId, "public", "data", "chatRooms", activeChat.id);
        await updateDoc(chatRoomRef, {
            lastMessage: currentMessage,
            lastMessageTimestamp: serverTimestamp()
        });
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
                createdAt: serverTimestamp(),
                lastMessage: '聊天室已建立',
                lastMessageTimestamp: serverTimestamp()
            });
        }
        const newActiveChat = (await getDoc(chatRoomRef)).data();
        setActiveChat({id: chatRoomId, ...newActiveChat});
        setSidebarView('list');
    };

    const getChatName = (room) => {
        if (!room) return '';
        if (room.type === 'group') return room.name;
        const otherUserId = room.members.find(id => id !== user.uid);
        return room.memberNames?.[otherUserId] || '私人訊息';
    };
    const getChatPhoto = (room) => {
        if (!room) return '';
        if (room.type === 'group') return `https://placehold.co/40x40/A2C4C9/FFFFFF?text=${room.name ? room.name[0] : 'G'}`;
        const otherUserId = room.members.find(id => id !== user.uid);
        const photo = room.memberPhotos?.[otherUserId];
        const name = room.memberNames?.[otherUserId];
        return photo || `https://placehold.co/40x40/5F828B/FFFFFF?text=${name ? name[0] : '?'}`;
    }

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[80vh] flex">
            {/* Sidebar */}
            <div className="w-1/3 border-r border-gray-200 flex flex-col">
                {sidebarView === 'list' ? (
                    <>
                        <div className="p-4 border-b flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-800">聊天室</h2>
                            <button onClick={() => setSidebarView('newUser')} className="text-gray-500 hover:text-[#5F828B]" title="新增聊天">
                                <Icon name="plus" className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="flex-grow overflow-y-auto">
                            <ul>
                                {chatRooms.map(room => (
                                    <li key={room.id} onClick={() => setActiveChat(room)} className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-100 border-b border-gray-100 ${activeChat?.id === room.id ? 'bg-gray-200' : ''}`}>
                                        <img src={getChatPhoto(room)} alt="chat avatar" className="w-12 h-12 rounded-full flex-shrink-0" />
                                        <div className="flex-grow overflow-hidden">
                                            <div className="flex justify-between items-center">
                                                <p className="font-semibold text-gray-800 truncate">{getChatName(room)}</p>
                                                <p className="text-xs text-gray-500 flex-shrink-0">{formatLastMessageTime(room.lastMessageTimestamp)}</p>
                                            </div>
                                            <p className="text-sm text-gray-600 truncate">{room.lastMessage}</p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="p-4 border-b flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-800">選擇成員</h2>
                            <button onClick={() => setSidebarView('list')} className="text-gray-500 hover:text-[#5F828B]" title="返回">
                                <Icon name="chevron-left" className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="flex-grow overflow-y-auto">
                            <ul>
                                {users.filter(u => u.id !== user.uid).map(u => (
                                    <li key={u.id} onClick={() => startDirectChat(u)} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-100 border-b border-gray-100">
                                        <img src={u.photoURL || `https://placehold.co/40x40/5F828B/FFFFFF?text=${u.displayName[0]}`} alt="user avatar" className="w-10 h-10 rounded-full" />
                                        <span className="font-medium">{u.displayName}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </>
                )}
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
                                        {msg.senderId !== user.uid && ( <img src={msg.senderPhotoURL || `https://placehold.co/40x40/5F828B/FFFFFF?text=${msg.senderName ? msg.senderName[0] : '?'}`} alt="sender" className="w-8 h-8 rounded-full" /> )}
                                        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-xl ${msg.senderId === user.uid ? 'bg-[#5F828B] text-white' : 'bg-white shadow-sm'}`}>
                                            {/* 【修改處】: 使用新的 MessageRenderer 元件來顯示訊息 */}
                                            <p className="text-sm break-words"><MessageRenderer text={msg.text} /></p>
                                            <p className={`text-xs mt-1 text-right ${msg.senderId === user.uid ? 'text-gray-300' : 'text-gray-500'}`}>{msg.timestamp ? new Date(msg.timestamp.seconds * 1000).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</p>
                                        </div>
                                         {msg.senderId === user.uid && ( <img src={user.photoURL || `https://placehold.co/40x40/5F828B/FFFFFF?text=${user.displayName[0]}`} alt="sender" className="w-8 h-8 rounded-full" /> )}
                                    </div>
                                ))}
                            </div>
                            <div ref={messagesEndRef} />
                        </div>
                        <div className="p-4 bg-white border-t">
                            <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                                <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="輸入訊息..." className="flex-grow border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-[#5F828B]" />
                                <button type="submit" className="bg-[#5F828B] text-white p-2 rounded-lg hover:bg-[#4A666F] disabled:bg-gray-300" disabled={!newMessage.trim()}>
                                    <Icon name="send" />
                                </button>
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-500">
                        選擇或建立一個聊天室開始對話
                    </div>
                )}
            </div>
        </div>
    );
}

export default Chat;
