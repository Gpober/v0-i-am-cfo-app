"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  BarChart3,
  Building2,
  TrendingUp,
  CreditCard,
  Users,
  Settings,
  Search,
  Bell,
  User,
  Menu,
  X,
} from "lucide-react"

// IAM CFO Brand Colors
const BRAND_COLORS = {
  primary: "#56B6E9",
  secondary: "#3A9BD1",
  tertiary: "#7CC4ED",
  accent: "#2E86C1",
  success: "#27AE60",
  warning: "#F39C12",
  danger: "#E74C3C",
  gray: {
    50: "#F8FAFC",
    100: "#F1F5F9",
    200: "#E2E8F0",
    300: "#CBD5E1",
    400: "#94A3B8",
    500: "#64748B",
    600: "#475569",
    700: "#334155",
    800: "#1E293B",
    900: "#0F172A",
  },
}

// IAM CFO Logo Component
const IAMCFOLogo = ({ className = "w-8 h-8" }) => (
  <div className={`${className} flex items-center justify-center relative`}>
    <svg viewBox="0 0 120 120" className="w-full h-full">
      <circle cx="60" cy="60" r="55" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="2" />
      <circle cx="60" cy="60" r="42" fill={BRAND_COLORS.primary} />
      <g fill="white">
        <rect x="35" y="70" width="6" height="15" rx="1" />
        <rect x="44" y="65" width="6" height="20" rx="1" />
        <rect x="53" y="55" width="6" height="30" rx="1" />
        <rect x="62" y="50" width="6" height="35" rx="1" />
        <rect x="71" y="60" width="6" height="25" rx="1" />
        <rect x="80" y="45" width="6" height="40" rx="1" />
        <path d="M35 72 L44 67 L53 57 L62 52 L71 62 L80 47" stroke="#FFFFFF" strokeWidth="2.5" fill="none" />
        <circle cx="35" cy="72" r="2.5" fill="#FFFFFF" />
        <circle cx="44" cy="67" r="2.5" fill="#FFFFFF" />
        <circle cx="53" cy="57" r="2.5" fill="#FFFFFF" />
        <circle cx="62" cy="52" r="2.5" fill="#FFFFFF" />
        <circle cx="71" cy="62" r="2.5" fill="#FFFFFF" />
        <circle cx="80" cy="47" r="2.5" fill="#FFFFFF" />
      </g>
      <text
        x="60"
        y="95"
        textAnchor="middle"
        fill="white"
        fontSize="11"
        fontWeight="bold"
        fontFamily="Arial, sans-serif"
      >
        CFO
      </text>
    </svg>
  </div>
)

// Navigation items
const navigationItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    current: false,
  },
  {
    name: "P&L Statement",
    href: "/financials",
    icon: BarChart3,
    current: false,
  },
  {
    name: "Balance Sheet",
    href: "/balance-sheet",
    icon: Building2,
    current: false,
  },
  {
    name: "Cash Flow",
    href: "/cash-flow",
    icon: TrendingUp,
    current: false,
  },
  {
    name: "Accounts Receivable",
    href: "/accounts-receivable",
    icon: CreditCard,
    current: false,
  },
  {
    name: "Accounts Payable",
    href: "/accounts-payable",
    icon: Users,
    current: false,
  },
]

export default function ClientRootLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const pathname = usePathname()

  // Update current navigation item based on pathname
  const updatedNavigationItems = navigationItems.map((item) => ({
    ...item,
    current: pathname === item.href,
  }))

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo and brand */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <div className="flex items-center">
              <IAMCFOLogo className="w-8 h-8 mr-3" />
              <div>
                <h1 className="text-lg font-bold text-gray-900">IAM CFO</h1>
                <p className="text-xs text-gray-500">Financial Dashboard</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
            {updatedNavigationItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    item.current
                      ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* User section */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">Admin User</p>
                <p className="text-xs text-gray-500">admin@iamcfo.com</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:ml-0">
        {/* Top navigation */}
        <div className="bg-white shadow-sm border-b border-gray-200 lg:hidden">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                <Menu className="w-6 h-6" />
              </button>

              <div className="flex items-center">
                <IAMCFOLogo className="w-6 h-6 mr-2" />
                <span className="text-lg font-bold text-gray-900">IAM CFO</span>
              </div>

              <div className="flex items-center space-x-2">
                <button className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100">
                  <Bell className="w-5 h-5" />
                </button>
                <button className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100">
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Search bar - Desktop only */}
        <div className="hidden lg:block bg-white border-b border-gray-200">
          <div className="px-6 py-4">
            <div className="relative max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
