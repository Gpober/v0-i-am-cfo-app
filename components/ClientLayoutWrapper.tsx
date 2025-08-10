"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  DollarSign,
  FileText,
  TrendingUp,
  Users,
  CreditCard,
  BarChart3,
  PieChart,
  Calendar,
} from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Financials", href: "/financials", icon: DollarSign },
  { name: "Balance Sheet", href: "/balance-sheet", icon: BarChart3 },
  { name: "Cash Flow", href: "/cash-flow", icon: TrendingUp },
  { name: "Accounts Payable", href: "/accounts-payable", icon: CreditCard },
  { name: "Accounts Receivable", href: "/accounts-receivable", icon: FileText },
  { name: "Statements", href: "/statements", icon: PieChart },
  { name: "Payroll", href: "/payroll", icon: Users },
  { name: "Reservations", href: "/reservations", icon: Calendar },
]

export function ClientLayoutWrapper({ children }: { children: React.ReactNode }) {
  const [sidebarVisible, setSidebarVisible] = useState(false)
  const pathname = usePathname()

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Hover trigger area */}
      <div className="fixed left-0 top-0 w-2 h-full z-40 bg-transparent" onMouseEnter={() => setSidebarVisible(true)} />

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-50 ${
          sidebarVisible ? "translate-x-0" : "-translate-x-full"
        }`}
        onMouseLeave={() => setSidebarVisible(false)}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center px-6 py-4 border-b">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">CF</span>
              </div>
              <span className="ml-2 text-xl font-bold text-gray-900">I AM CFO</span>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <item.icon className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* User section */}
          <div className="border-t px-4 py-4">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Admin User</p>
                <p className="text-xs text-gray-500">admin@iamcfo.com</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1">
        <main className="py-6 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  )
}
