import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import Modal from '../components/Modal';
import Icon from '../components/Icon';

function Announcements({ user, appId }) {
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

export default Announcements;
