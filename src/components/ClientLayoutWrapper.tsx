'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import RequireIAMCFOLogin from '@/components/RequireIAMCFOLogin'

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/login'

  return (
    <>
      <nav className="bg-white shadow px-6 py-4 flex items-center justify-between">
        <div className="flex space-x-4">
          <Link href="/">Dashboard</Link>
          <Link href="/reservations">Reservations</Link>
          <Link href="/financials">Financials</Link>
          <Link href="/payroll">Payroll</Link>
          <Link href="/statements">Statements</Link>
        </div>
        <button
          onClick={() => {
            localStorage.removeItem('IAMCFO_LOGIN')
            localStorage.removeItem('IAMCFO_EMAIL')
            window.location.href = '/login'
          }}
          className="text-sm text-gray-600 hover:text-red-600 underline"
        >
          Logout
        </button>
      </nav>

      <main className="px-6 py-4">
        {isLoginPage ? children : <RequireIAMCFOLogin>{children}</RequireIAMCFOLogin>}
      </main>
    </>
  )
}
