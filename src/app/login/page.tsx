'use client';
import { useState } from 'react';

export default function Login() {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnectQuickBooks = () => {
    setIsConnecting(true);
    // Redirect to FastAPI OAuth initiation endpoint
    window.location.href = 'http://localhost:8000/auth/qbo/initiate';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        {/* I AM CFO Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent">
            I AM CFO
          </h1>
          <p className="text-gray-600 mt-2">Connect your QuickBooks to get started</p>
        </div>

        {/* QuickBooks Connection Card */}
        <div className="border rounded-lg p-6 mb-6">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7v10c0 5.55 3.84 9.95 9 11 5.16-1.05 9-5.45 9-11V7l-10-5z"/>
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">QuickBooks Online</h3>
              <p className="text-sm text-gray-600">Sync your financial data securely</p>
            </div>
          </div>
          
          <button 
            onClick={handleConnectQuickBooks}
            disabled={isConnecting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConnecting ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Connecting...
              </div>
            ) : (
              'Connect QuickBooks'
            )}
          </button>
        </div>

        {/* Security Notice */}
        <div className="text-center text-sm text-gray-500">
          <div className="flex items-center justify-center mb-2">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            Secure OAuth Connection
          </div>
          <p>Your data is encrypted and we never store your QuickBooks credentials</p>
        </div>

        {/* What happens next */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">What happens next:</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• Authorize I AM CFO to access your QuickBooks</li>
            <li>• We'll sync your financial data securely</li>
            <li>• Get instant insights into your unit economics</li>
          </ul>
        </div>
      </div>
    </div>
  );
}