import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase/config';
import { collection, query, onSnapshot, addDoc, doc, getDoc, setDoc, where, orderBy, serverTimestamp } from 'firebase/firestore';
import Icon from '../components/Icon';

function Chat({ user, appId }) {
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
            
            const generalChatRef = doc(db, "artifacts", appId, "public", "data", "chatRooms", "general");
            getDoc(generalChatRef).then(docSnap => {
                if (!docSnap.exists()) {
                     setDoc(generalChatRef, {
                        name: "公開聊天室",
                        type: "group",
                        members: users.map(u => u.id),
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
        
        setActiveChat({
            id: chatRoomId,
            type: 'direct',
            name: targetUser.displayName,
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
                    <h3 className="p-3 text-sm font-semibold text-gray-500">群組</h3>
                     <ul>
                        {chatRooms.filter(r => r.type === 'group').map(room => (
                            <li key={room.id} onClick={() => setActiveChat(room)} className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-100 ${activeChat?.id === room.id ? 'bg-gray-200' : ''}`}>
                                <img src={getChatPhoto(room)} alt="group avatar" className="w-10 h-10 rounded-full" />
                                <span className="font-medium">{getChatName(room)}</span>
                            </li>
                        ))}
                    </ul>
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

export default Chat;
