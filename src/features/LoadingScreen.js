import React from 'react';

function LoadingScreen({ message }) {
     return <div className="flex items-center justify-center h-screen bg-gray-100"><div className="text-xl p-4 text-center">{message}</div></div>;
}

export default LoadingScreen;
