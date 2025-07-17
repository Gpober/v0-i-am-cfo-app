'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { approvedEmails } from '@/lib/approvedEmails'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
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
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="flex justify-center mb-6">
          <img
            src="/logo.png"
            alt="I AM CFO Logo"
            className="h-12 object-contain"
          />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-blue-700">Welcome to I AM CFO</h1>
          <p className="text-gray-600 mt-1">Log in to access your dashboard</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {error && <p className="text-red-600 text-center">{error}</p>}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded"
          />
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-semibold transition-colors"
          >
            Log In
          </button>
        </form>

        <div className="text-center text-sm text-gray-500 mt-6">
          <p>Your access is secure and encrypted</p>
        </div>
      </div>
    </div>
  )
}
