"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import {
  BarChart3,
  TrendingUp,
  Calculator,
  CreditCard,
  Banknote,
  Menu,
  X,
  LogOut,
  User,
  Settings,
  Home,
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
const IAMCFOLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
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

interface ClientRootLayoutProps {
  children: React.ReactNode
}

export default function ClientRootLayout({ children }: ClientRootLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  // Navigation items
  const navigationItems = [
    { name: "Dashboard", href: "/dashboard", icon: Home, current: pathname === "/dashboard" },
    { name: "P&L Statement", href: "/financials", icon: BarChart3, current: pathname === "/financials" },
    { name: "Balance Sheet", href: "/balance-sheet", icon: Calculator, current: pathname === "/balance-sheet" },
    { name: "Cash Flow", href: "/cash-flow", icon: TrendingUp, current: pathname === "/cash-flow" },
    {
      name: "Accounts Receivable",
      href: "/accounts-receivable",
      icon: CreditCard,
      current: pathname === "/accounts-receivable",
    },
    { name: "Accounts Payable", href: "/accounts-payable", icon: Banknote, current: pathname === "/accounts-payable" },
  ]

  const handleLogout = () => {
    // Clear any stored authentication data
    localStorage.removeItem("iamcfo_authenticated")
    localStorage.removeItem("iamcfo_user_email")

    // Redirect to login page
    router.push("/login")
  }

  const handleNavigation = (href: string) => {
    router.push(href)
    setSidebarOpen(false) // Close mobile sidebar after navigation
  }

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuOpen) {
        setUserMenuOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [userMenuOpen])

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:flex lg:flex-col`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <IAMCFOLogo className="w-8 h-8" />
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
        <nav className="flex-1 mt-6 px-3">
          <div className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.name}
                  onClick={() => handleNavigation(item.href)}
                  className={`w-full group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    item.current
                      ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                      : "text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                  }`}
                >
                  <Icon
                    className={`mr-3 h-5 w-5 ${
                      item.current ? "text-blue-700" : "text-gray-400 group-hover:text-gray-500"
                    }`}
                  />
                  {item.name}
                </button>
              )
            })}
          </div>
        </nav>

        {/* User section at bottom of sidebar */}
        <div className="border-t border-gray-200 p-4">
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="w-full flex items-center px-3 py-2 text-sm text-gray-700 rounded-md hover:bg-gray-100 transition-colors"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3"
                style={{ backgroundColor: BRAND_COLORS.primary }}
              >
                <User className="w-4 h-4" />
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-gray-900">Admin User</div>
                <div className="text-xs text-gray-500">admin@iamcfo.com</div>
              </div>
            </button>

            {/* User dropdown menu */}
            {userMenuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-md shadow-lg border border-gray-200 py-1">
                <button
                  onClick={() => {
                    setUserMenuOpen(false)
                    // Handle settings navigation
                  }}
                  className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <Settings className="w-4 h-4 mr-3" />
                  Settings
                </button>
                <button
                  onClick={() => {
                    setUserMenuOpen(false)
                    handleLogout()
                  }}
                  className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <LogOut className="w-4 h-4 mr-3" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:ml-0">
        {/* Top navigation for mobile */}
        <div className="sticky top-0 z-40 bg-white shadow-sm border-b border-gray-200 lg:hidden">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-3">
              <IAMCFOLogo className="w-6 h-6" />
              <span className="text-lg font-bold text-gray-900">IAM CFO</span>
            </div>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 bg-gray-50">{children}</main>
      </div>
    </div>
  )
}
