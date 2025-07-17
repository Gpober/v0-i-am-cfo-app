import './globals.css';
import { Inter } from 'next/font/google'
import Link from 'next/link'
import RequireIAMCFOLogin from '@/components/RequireIAMCFOLogin'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'I AM CFO Dashboard',
  description: 'Live financial insights for property operators',
  icons: {
    icon: '/favicon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const isLoginPage = typeof window !== 'undefined' && window.location.pathname === '/IAMCFO_LOGIN'

  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" href="/favicon.png" />
      </head>
      <body className={inter.className + ' bg-gray-50 font-sans'}>
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
          {/* Don’t wrap the login page */}
          {isLoginPage ? children : <RequireIAMCFOLogin>{children}</RequireIAMCFOLogin>}
        </main>
      </body>
    </html>
  )
}
