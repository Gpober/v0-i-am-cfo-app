"use client"

import type React from "react"
import { useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { BarChart3, TrendingUp, Building2, CreditCard, Users, Home } from "lucide-react"

// IAM CFO Brand Colors
const BRAND_COLORS = {
  primary: "#56B6E9",
  secondary: "#3A9BD1",
  tertiary: "#7CC4ED",
  accent: "#2E86C1",
  success: "#27AE60",
  warning: "#F39C12",
  danger: "#E74C3C",
}

const navigation = [
  { name: "Overview", href: "/", icon: Home },
  { name: "P&L", href: "/financials", icon: BarChart3 },
  { name: "Cash Flow", href: "/cash-flow", icon: TrendingUp },
  { name: "Balance Sheet", href: "/balance-sheet", icon: Building2 },
  { name: "A/R", href: "/accounts-receivable", icon: CreditCard },
  { name: "A/P", href: "/accounts-payable", icon: Users },
]

export default function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isSidebarVisible, setIsSidebarVisible] = useState(false)

  // Don't show navigation on login page
  if (pathname === "/login") {
    return <>{children}</>
  }

  const handleMouseEnterTrigger = () => {
    setIsSidebarVisible(true)
  }

  const handleMouseLeaveSidebar = () => {
    setIsSidebarVisible(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Hover trigger area - invisible but detects mouse */}
      <div
        className="fixed left-0 top-0 w-6 h-full z-40 bg-transparent"
        onMouseEnter={handleMouseEnterTrigger}
        style={{ cursor: "pointer" }}
      />

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full w-64 bg-white shadow-xl border-r border-gray-200 z-50 transform transition-transform duration-300 ease-in-out ${
          isSidebarVisible ? "translate-x-0" : "-translate-x-full"
        }`}
        onMouseLeave={handleMouseLeaveSidebar}
      >
        {/* Logo */}
        <div className="flex items-center p-4 border-b border-gray-200">
          <div className="w-8 h-8 flex items-center justify-center relative mr-3">
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
          <div>
            <h1 className="text-lg font-bold text-gray-900">IAM CFO</h1>
            <p className="text-xs text-gray-600">Financial Dashboard</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="mt-4">
          {navigation.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-blue-50 text-blue-700 border-r-4"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
                style={{
                  borderRightColor: isActive ? BRAND_COLORS.primary : undefined,
                  backgroundColor: isActive ? BRAND_COLORS.primary + "10" : undefined,
                  color: isActive ? BRAND_COLORS.primary : undefined,
                }}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Top Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              {/* Logo */}
              <div className="flex-shrink-0 flex items-center">
                <div className="flex items-center">
                  <div className="w-8 h-8 flex items-center justify-center relative mr-3">
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
                        <path
                          d="M35 72 L44 67 L53 57 L62 52 L71 62 L80 47"
                          stroke="#FFFFFF"
                          strokeWidth="2.5"
                          fill="none"
                        />
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
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">IAM CFO</h1>
                    <p className="text-xs text-gray-600">Financial Dashboard</p>
                  </div>
                </div>
              </div>

              {/* Navigation Links */}
              <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
                {navigation.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors ${
                        isActive
                          ? "border-blue-500 text-gray-900"
                          : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                      }`}
                      style={{
                        borderBottomColor: isActive ? BRAND_COLORS.primary : undefined,
                        color: isActive ? BRAND_COLORS.primary : undefined,
                      }}
                    >
                      <item.icon className="w-4 h-4 mr-2" />
                      {item.name}
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* Right side - could add user menu, notifications, etc. */}
            <div className="flex items-center">
              <div className="text-sm text-gray-600">Welcome to IAM CFO Dashboard</div>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1 border-t border-gray-200">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`block pl-3 pr-4 py-2 text-base font-medium transition-colors ${
                    isActive
                      ? "bg-blue-50 border-r-4 text-blue-700"
                      : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                  style={{
                    borderRightColor: isActive ? BRAND_COLORS.primary : undefined,
                    backgroundColor: isActive ? BRAND_COLORS.primary + "10" : undefined,
                    color: isActive ? BRAND_COLORS.primary : undefined,
                  }}
                >
                  <div className="flex items-center">
                    <item.icon className="w-4 h-4 mr-3" />
                    {item.name}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>{children}</main>
    </div>
  )
}
