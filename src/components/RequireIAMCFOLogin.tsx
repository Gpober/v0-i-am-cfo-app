'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { approvedEmails } from '@/lib/approvedEmails'

export default function RequireIAMCFOLogin({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (pathname === '/login') {
      setLoading(false)
      return
    }

    const loggedIn = localStorage.getItem('IAMCFO_LOGIN') === 'true'
    const email = localStorage.getItem('IAMCFO_EMAIL')?.toLowerCase()

    if (!loggedIn || !email || !approvedEmails.includes(email)) {
      router.push('/login')
    } else {
      setLoading(false)
    }
  }, [pathname])

  if (loading) return <div className="p-6">🔐 Verifying access...</div>
  return <>{children}</>
}
