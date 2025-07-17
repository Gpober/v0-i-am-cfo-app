import './globals.css';
import { Inter } from 'next/font/google'
import Link from 'next/link'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'I AM CFO Dashboard',
  description: 'Live financial insights for property operators',
  icons: {
    icon: '/favicon.png',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" href="/favicon.png" />
      </head>
      <body className={inter.className + ' bg-gray-50 font-sans'}>
        <nav className="bg-white shadow px-6 py-4 flex items-center justify-between">
          {/* Left side nav links */}
          <div className="flex space-x-4">
            <Link href="/">Dashboard</Link>
            <Link href="/reservations">Reservations</Link>
            <Link href="/financials">Financials</Link>
            <Link href="/payroll">Payroll</Link>
            <Link href="/statements">Statements</Link>
          </div>

          {/* Right side logout button */}
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

        <main className="px-6 py-4">{children}</main>
      </body>
    </html>
  )
}
