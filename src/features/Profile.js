import React, { useState, useEffect, useRef } from 'react';
import { 
    updateProfile, 
    updatePassword, 
    EmailAuthProvider, 
    reauthenticateWithCredential,
    multiFactor,
    TotpMultiFactorGenerator
} from 'firebase/auth';
import { doc, updateDoc, collection, onSnapshot, deleteDoc } from 'firebase/firestore';
import { auth, db } from '../firebase/config';
import Icon from '../components/Icon';
import Modal from '../components/Modal';

// --- 主要 Profile 元件 ---
function Profile({ user, userData, appId }) {
    if (!user || !userData) {
        return <div className="text-center p-8">正在載入成員資料...</div>;
    }

    // --- Cloudinary Settings ---
    const CLOUDINARY_CLOUD_NAME = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
    const CLOUDINARY_UPLOAD_PRESET = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;
    
    // 個人資料編輯狀態 (加上 || '' 保護，避免初始值為 undefined)
    const [displayName, setDisplayName] = useState(userData.displayName || '');
    const [personalInfo, setPersonalInfo] = useState(userData.personalInfo || '');
    const [photo, setPhoto] = useState(null);
    const [photoURL, setPhotoURL] = useState(userData.photoURL || '');
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);

    // 團隊成員列表狀態
    const [allUsers, setAllUsers] = useState([]);

    // 安全性 Modal 的開關狀態
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [is2faModalOpen, setIs2faModalOpen] = useState(false);
    
    // 【最終修正】: 使用 ?? 運算子提供預設值，徹底避免 undefined 錯誤。
    const is2faEnabled = (user.multiFactor?.enrolledFactors?.length ?? 0) > 0;

    // 取得所有團隊成員的資料
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
            await updateProfile(user, { displayName, photoURL: newPhotoURL });
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
    
    const handleRemoveUser = async (targetUserId, targetUserName) => {
        if (!window.confirm(`警告：您即將從團隊中永久移除成員「${targetUserName}」。此操作無法復原，確定要繼續嗎？`)) return;
        const userDocRef = doc(db, "artifacts", appId, "users", targetUserId);
        try {
            await deleteDoc(userDocRef);
            alert(`成員 ${targetUserName} 已被移除。`);
        } catch (error) {
            console.error("移除成員失敗:", error);
            alert("移除成員時發生錯誤。");
        }
    };

    const handleDisable2FA = async () => {
        if (!window.confirm("確定要停用兩步驟驗證嗎？這會降低您帳號的安全性。")) return;
        try {
            const multiFactorUser = multiFactor(user);
            const factorId = multiFactorUser.enrolledFactors[0].uid;
            await multiFactorUser.unenroll(factorId);
            alert("兩步驟驗證已成功停用。");
            window.location.reload();
        } catch (error) {
            console.error("停用 2FA 失敗:", error);
            alert(`停用 2FA 時發生錯誤: ${error.message}`);
        }
    };

    return (
        <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-6">成員專區</h2>
            
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
                        <div><label className="block text-sm font-medium text-gray-700">電子郵件</label><input type="email" value={user.email || 'N/A'} disabled className="mt-1 block w-full bg-gray-100 border-gray-300 rounded-md shadow-sm p-2" /></div>
                        <div><label className="block text-sm font-medium text-gray-700">個人名稱</label><input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 focus:ring-[#5F828B] focus:border-[#5F828B]" /></div>
                        <div><label className="block text-sm font-medium text-gray-700">個人簡介</label><textarea value={personalInfo} onChange={(e) => setPersonalInfo(e.target.value)} rows="3" className="mt-1 block w-full border-gray-300 rounded-md shadow-sm p-2 focus:ring-[#5F828B] focus:border-[#5F828B]"></textarea></div>
                    </div>
                    <div className="mt-8 text-right"><button onClick={handleUpdateProfile} disabled={isUploading} className="bg-[#5F828B] text-white px-5 py-2 rounded-lg shadow hover:bg-[#4A666F] transition-colors disabled:bg-gray-400">{isUploading ? '更新中...' : '儲存變更'}</button></div>
                </div>
                
                <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200">
                    <h3 className="text-xl font-semibold text-[#4A666F] mb-6">安全性設定</h3>
                    <div className="space-y-6">
                        <div className="p-4 border border-gray-200 rounded-lg">
                            <div className="flex items-center gap-3"><Icon name="key" className="text-gray-500" /><h4 className="font-semibold text-gray-800">登入密碼</h4></div>
                            <p className="text-sm text-gray-600 mt-2 mb-3">您可以為您的 Google 帳號新增一組獨立密碼，用於備用登入。</p>
                            <button onClick={() => setIsPasswordModalOpen(true)} className="w-full bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300">設定/變更密碼</button>
                        </div>
                         <div className="p-4 border border-gray-200 rounded-lg">
                            <div className="flex items-center gap-3"><Icon name="shield-check" className="text-gray-500" /><h4 className="font-semibold text-gray-800">兩步驟驗證 (2FA)</h4></div>
                            <p className="text-sm text-gray-600 mt-2 mb-3">使用驗證器 App 掃描 QR Code，大幅提升帳號安全性。</p>
                            {is2faEnabled ? (
                                <button onClick={handleDisable2FA} className="w-full bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600">停用 2FA</button>
                            ) : (
                                <button onClick={() => setIs2faModalOpen(true)} className="w-full bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600">啟用 2FA</button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <PasswordModal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} user={user} />
            <TwoFactorAuthModal isOpen={is2faModalOpen} onClose={() => setIs2faModalOpen(false)} user={user} />
        </div>
    );
}

// --- 密碼設定 Modal 元件 ---
function PasswordModal({ isOpen, onClose, user }) {
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (newPassword.length < 6) {
            setError("密碼長度至少需要 6 個字元。");
            return;
        }
        if (newPassword !== confirmPassword) {
            setError("兩次輸入的密碼不相符。");
            return;
        }
        setIsLoading(true);
        try {
            await updatePassword(user, newPassword);
            alert("密碼已成功更新！");
            onClose();
        } catch (error) {
            console.error("密碼更新失敗:", error);
            if (error.code === 'auth/requires-recent-login') {
                setError("這是一個敏感操作，請您先登出再重新登入後，才能變更密碼。");
            } else {
                setError(`發生錯誤：${error.message}`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="設定/變更密碼">
            <form onSubmit={handleSubmit}>
                <p className="text-sm text-gray-600 mb-4">如果您是使用 Google 登入，設定密碼可以讓您多一種登入方式。如果忘記密碼，請洽管理員協助。</p>
                <div className="mb-4">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="new-password">新密碼</label>
                    <input id="new-password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3" />
                </div>
                <div className="mb-6">
                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="confirm-password">確認新密碼</label>
                    <input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3" />
                </div>
                {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                <div className="flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300">取消</button>
                    <button type="submit" className="bg-[#5F828B] text-white px-4 py-2 rounded-lg hover:bg-[#4A666F]" disabled={isLoading}>
                        {isLoading ? '儲存中...' : '儲存密碼'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

// --- 2FA 設定 Modal 元件 ---
function TwoFactorAuthModal({ isOpen, onClose, user }) {
    const [secret, setSecret] = useState(null);
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && user) {
            const generateTfaSecret = async () => {
                try {
                    const multiFactorSession = await multiFactor(user).getSession();
                    const tfaSecret = await TotpMultiFactorGenerator.generateSecret(multiFactorSession);
                    setSecret(tfaSecret);
                    
                    const otpauthUri = `otpauth://totp/YakultWorkstation:${user.email}?secret=${tfaSecret.secretKey}&issuer=YakultWorkstation`;
                    setQrCodeUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUri)}`);
                } catch (error) {
                    console.error("產生 2FA secret 失敗:", error);
                    setError("無法產生驗證資訊，請稍後再試。");
                }
            };
            generateTfaSecret();
        } else {
            setSecret(null);
            setQrCodeUrl('');
            setVerificationCode('');
            setError('');
        }
    }, [isOpen, user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (verificationCode.length !== 6) {
            setError("請輸入 6 位數的驗證碼。");
            return;
        }
        setIsLoading(true);

        try {
            const multiFactorAssertion = TotpMultiFactorGenerator.assertionForEnrollment(secret, verificationCode);
            await multiFactor(user).enroll(multiFactorAssertion, '我的手機驗證器');
            alert("兩步驟驗證已成功啟用！");
            window.location.reload();
        } catch (error) {
            console.error("啟用 2FA 失敗:", error);
            setError("驗證碼錯誤或已過期，請再試一次。");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="啟用兩步驟驗證 (2FA)">
            <div className="text-center">
                <p className="mb-4">請使用您的驗證器 App (如 Google Authenticator) 掃描下方的 QR Code。</p>
                {qrCodeUrl ? (
                    <img src={qrCodeUrl} alt="2FA QR Code" className="mx-auto border rounded-lg" />
                ) : (
                    <p>正在產生 QR Code...</p>
                )}
                <p className="mt-4 mb-2 text-sm text-gray-600">掃描後，在下方輸入 App 顯示的 6 位數驗證碼以完成設定。</p>
                <form onSubmit={handleSubmit}>
                    <input 
                        type="text" 
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        placeholder="123456"
                        maxLength="6"
                        className="text-center text-2xl tracking-[.5em] w-48 mx-auto shadow appearance-none border rounded py-2 px-3"
                    />
                    {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
                    <div className="flex justify-end gap-3 mt-6">
                        <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300">取消</button>
                        <button type="submit" className="bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600" disabled={isLoading}>
                            {isLoading ? '驗證中...' : '驗證並啟用'}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}

export default Profile;
