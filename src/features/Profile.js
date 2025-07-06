import React, { useState, useEffect, useRef } from 'react';
import { updateProfile } from 'firebase/auth';
import { doc, updateDoc, collection, onSnapshot, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import Icon from '../components/Icon';

function Profile({ user, userData, appId }) {
    // --- Cloudinary Settings ---
    const CLOUDINARY_CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
    const CLOUDINARY_UPLOAD_PRESET = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;
    
    // 個人資料編輯狀態
    const [displayName, setDisplayName] = useState(userData.displayName);
    const [personalInfo, setPersonalInfo] = useState(userData.personalInfo);
    const [photo, setPhoto] = useState(null);
    const [photoURL, setPhotoURL] = useState(userData.photoURL);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);

    // 【新增功能】: 團隊成員列表狀態
    const [allUsers, setAllUsers] = useState([]);

    // 【新增功能】: 取得所有團隊成員的資料
    useEffect(() => {
        const usersRef = collection(db, "artifacts", appId, "users");
        const unsubscribe = onSnapshot(usersRef, (snapshot) => {
            const userList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setAllUsers(userList);
        });
        return () => unsubscribe();
    }, [appId]);


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
    
    // 更新個人資料 (邏輯不變)
    const handleUpdateProfile = async () => {
        if (!CLOUDINARY_CLOUD_NAME) {
            alert("Cloudinary 設定未載入，請檢查環境變數！");
            return;
        }
        setIsUploading(true);
        let newPhotoURL = userData.photoURL;

        if (photo) {
            const formData = new FormData();
            formData.append('file', photo);
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

            try {
                const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: formData });
                const data = await response.json();
                if (data.secure_url) newPhotoURL = data.secure_url;
                else throw new Error('圖片上傳至 Cloudinary 失敗');
            } catch (error) {
                console.error("Cloudinary 上傳錯誤:", error);
                alert("上傳大頭貼時發生錯誤。");
                setIsUploading(false);
                return;
            }
        }

        try {
            await updateProfile(auth.currentUser, { displayName, photoURL: newPhotoURL });
            const userDocRef = doc(db, "artifacts", appId, "users", user.uid);
            await updateDoc(userDocRef, { displayName, personalInfo, photoURL: newPhotoURL });
            alert("個人資料已更新！");
        } catch (error) {
            console.error("更新個人資料失敗:", error);
            alert("更新個人資料時發生錯誤。");
        } finally {
            setIsUploading(false);
        }
    };

    // 【新增功能】: 變更使用者角色
    const handleRoleChange = async (targetUserId, newRole) => {
        if (!window.confirm(`確定要將這位成員的角色變更為 ${newRole ? '管理員' : '一般成員'} 嗎？`)) return;
        const userDocRef = doc(db, "artifacts", appId, "users", targetUserId);
        try {
            await updateDoc(userDocRef, { isAdmin: newRole });
            alert("角色已更新！");
        } catch (error) {
            console.error("變更角色失敗:", error);
            alert("變更角色時發生錯誤。");
        }
    };

    // 【新增功能】: 移除團隊成員
    const handleRemoveUser = async (targetUserId, targetUserName) => {
        if (!window.confirm(`警告：您即將從團隊中永久移除成員「${targetUserName}」。此操作無法復原，確定要繼續嗎？`)) return;
        const userDocRef = doc(db, "artifacts", appId, "users", targetUserId);
        try {
            await deleteDoc(userDocRef);
            alert(`成員 ${targetUserName} 已被移除。`);
            // 注意：此處不會從 Firebase Authentication 中刪除帳號，僅從團隊資料庫移除。
        } catch (error) {
            console.error("移除成員失敗:", error);
            alert("移除成員時發生錯誤。");
        }
    };

    return (
        <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-6">成員專區</h2>
            
            {/* 【新增功能】: 團隊成員管理區塊 */}
            {userData.isAdmin && (
                <div className="mb-8 bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-xl font-semibold text-[#4A666F] mb-4">團隊成員管理</h3>
                    <div className="space-y-3">
                        {allUsers.map(member => (
                            <div key={member.id} className="flex items-center justify-between p-3 rounded-md hover:bg-gray-50">
                                <div className="flex items-center gap-4">
                                    <img src={member.photoURL || `https://placehold.co/40x40/5F828B/FFFFFF?text=${member.displayName[0]}`} alt="avatar" className="w-10 h-10 rounded-full" />
                                    <div>
                                        <p className="font-semibold text-gray-800 flex items-center gap-2">
                                            {member.displayName}
                                            {member.isAdmin && <Icon name="shield-check" className="text-blue-500 w-5 h-5" title="管理員" />}
                                        </p>
                                        <p className="text-sm text-gray-500">{member.email}</p>
                                    </div>
                                </div>
                                {user.uid !== member.id && (
                                    <div className="flex items-center gap-2">
                                        {member.isAdmin ? (
                                            <button onClick={() => handleRoleChange(member.id, false)} className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full hover:bg-yellow-200">降為成員</button>
                                        ) : (
                                            <button onClick={() => handleRoleChange(member.id, true)} className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full hover:bg-blue-200">設為管理員</button>
                                        )}
                                        <button onClick={() => handleRemoveUser(member.id, member.displayName)} className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded-full hover:bg-red-200">移除</button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}


            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* 個人資訊編輯區塊 */}
                <div className="md:col-span-2 bg-white p-8 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-xl font-semibold text-[#4A666F] mb-6">我的個人資訊</h3>
                    <div className="flex items-center space-x-6 mb-8">
                        <img src={photoURL || `https://placehold.co/100x100/5F828B/FFFFFF?text=${displayName[0]}`} alt="avatar" className="w-24 h-24 rounded-full object-cover cursor-pointer" onClick={() => fileInputRef.current.click()} />
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
                {/* 安全性設定 (保持不變) */}
                <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-xl font-semibold text-[#4A666F] mb-6">安全性設定</h3>
                    <div className="space-y-6">
                        <div className="p-4 border border-dashed border-gray-300 rounded-lg">
                            <div className="flex items-center gap-3"> <Icon name="key" className="text-gray-500" /> <h4 className="font-semibold text-gray-800">登入密碼</h4> </div>
                            <p className="text-sm text-gray-600 mt-2 mb-3">此功能正在開發中。您將能夠設定一組獨立的密碼，用於非 Google 管道登入。</p>
                            <button disabled className="w-full bg-gray-300 text-gray-500 px-4 py-2 rounded-lg cursor-not-allowed">設定密碼</button>
                        </div>
                         <div className="p-4 border border-dashed border-gray-300 rounded-lg">
                            <div className="flex items-center gap-3"> <Icon name="shield-check" className="text-gray-500" /> <h4 className="font-semibold text-gray-800">兩步驟驗證 (2FA)</h4> </div>
                            <p className="text-sm text-gray-600 mt-2 mb-3">此功能正在開發中。啟用後，登入時需額外輸入 Google Authenticator 產生的驗證碼。</p>
                            <button disabled className="w-full bg-gray-300 text-gray-500 px-4 py-2 rounded-lg cursor-not-allowed">啟用 2FA</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Profile;
