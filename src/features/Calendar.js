import React, { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, onSnapshot, addDoc, updateDoc, deleteDoc, doc, getDocs, Timestamp } from 'firebase/firestore';
import Modal from '../components/Modal';
import Icon from '../components/Icon';

function Calendar({ user, appId }) {
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
    
    const formatDateTimeLocal = (date) => {
        const d = new Date(date);
        const timezoneOffset = d.getTimezoneOffset() * 60000;
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
            if(date) initialDate.setHours(9,0);
            
            setEventStart(formatDateTimeLocal(initialDate));
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

export default Calendar;
