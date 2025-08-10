'use client'

import { useRouter } from 'next/navigation'

export default function NotFound() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <h1 className="text-4xl font-bold text-red-600 mb-2">404</h1>
      <p className="text-lg mb-6 text-gray-700">Page not found.</p>
      <button
        onClick={() => router.push('/')}
        className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
      >
        Back to Dashboard
      </button>
    </div>
  )
}
