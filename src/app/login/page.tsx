'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { approvedEmails } from '@/lib/approvedEmails'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isConnecting, setIsConnecting] = useState(false)
  const router = useRouter()

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()

    const isAllowed = approvedEmails.includes(email.trim().toLowerCase())
    if (!isAllowed) return setError('Access denied: email not authorized.')

    if (password !== 'your_secure_password') {
      return setError('Incorrect password.')
    }

    localStorage.setItem('IAMCFO_LOGIN', 'true')
    localStorage.setItem('IAMCFO_EMAIL', email.trim().toLowerCase())
    setError('')
    setIsConnecting(true)

    // Replace with your FastAPI auth URL
    window.location.href = 'http://localhost:8000/auth/qbo/initiate'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-700">I AM CFO</h1>
          <p className="text-gray-600 mt-2">Log in to connect your QuickBooks</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && <p className="text-red-600 text-center">{error}</p>}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded"
          />
          <button
            type="submit"
            disabled={isConnecting}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConnecting ? 'Connecting...' : 'Connect QuickBooks'}
          </button>
        </form>

        <div className="text-center text-sm text-gray-500 mt-6">
          <div className="flex items-center justify-center mb-2">
            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            Secure OAuth Connection
          </div>
          <p>Your data is encrypted and we never store your QuickBooks credentials</p>
        </div>
      </div>
    </div>
  )
}
