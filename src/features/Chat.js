import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase/config';
import { collection, query, onSnapshot, addDoc, doc, getDoc, setDoc, where, orderBy, serverTimestamp, updateDoc } from 'firebase/firestore';
import Icon from '../components/Icon';

// 【新增功能】: 這是一個小工具，用來美化時間顯示
function formatLastMessageTime(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    
    // 如果是今天，只顯示時間
    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString('zh-TW', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    }
    
    // 如果是昨天或更早，顯示日期
    return date.toLocaleDateString('zh-TW', {
        month: 'numeric',
        day: 'numeric'
    });
}


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
        
        // 【修改功能】: 增加 orderBy，讓列表按照最後訊息時間排序
        const q = query(chatRoomsRef, where("members", "array-contains", user.uid), orderBy("lastMessageTimestamp", "desc"));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const rooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // 這段確保「公開聊天室」存在的邏輯保持不變
            const generalChatRef = doc(db, "artifacts", appId, "public", "data", "chatRooms", "general");
            getDoc(generalChatRef).then(docSnap => {
                if (!docSnap.exists() && users.length > 0) { // 確保有使用者資料後再建立
                     setDoc(generalChatRef, {
                        name: "公開聊天室",
                        type: "group",
                        members: users.map(u => u.id),
                        createdAt: serverTimestamp(),
                        lastMessage: '歡迎來到聊天室！', // 【新增功能】
                        lastMessageTimestamp: serverTimestamp() // 【新增功能】
                    });
                }
            })

            setChatRooms(rooms);

            if (!activeChat && rooms.length > 0) {
                // 自動選擇第一個 (最新的) 聊天室
                setActiveChat(rooms[0]); 
            }
        });

        return unsubscribe;
    }, [db, user, appId, users]); // 依賴 users，確保它已載入

    // Fetch messages for the active chat room
    useEffect(() => {
        if (!db || !activeChat) {
            setMessages([]); // 清空訊息
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
        setNewMessage(''); // 先清空輸入框，讓體驗更好

        // 1. 新增訊息到聊天室的 "messages" 子集合
        const messagesRef = collection(db, "artifacts", appId, "public", "data", "chatRooms", activeChat.id, "messages");
        await addDoc(messagesRef, {
            text: currentMessage,
            senderId: user.uid,
            senderName: user.displayName,
            senderPhotoURL: user.photoURL,
            timestamp: serverTimestamp()
        });

        // 【新增功能】: 2. 同時更新聊天室本身的「最後訊息」欄位
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
                lastMessage: '', // 【新增功能】: 建立新聊天室時，也要有這個欄位
                lastMessageTimestamp: serverTimestamp() // 【新增功能】
            });
        }
        
        const newActiveChat = (await getDoc(chatRoomRef)).data();
        setActiveChat({id: chatRoomId, ...newActiveChat});
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
