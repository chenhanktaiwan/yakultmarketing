import React from 'react';

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

export default PendingApprovalScreen;
