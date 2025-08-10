"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BarChart3,
  DollarSign,
  FileText,
  TrendingUp,
  Users,
  Calendar,
  CreditCard,
  PieChart,
  Receipt,
  Building,
} from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { name: "Financials", href: "/financials", icon: DollarSign },
  { name: "Balance Sheet", href: "/balance-sheet", icon: PieChart },
  { name: "Cash Flow", href: "/cash-flow", icon: TrendingUp },
  { name: "Accounts Payable", href: "/accounts-payable", icon: CreditCard },
  { name: "Accounts Receivable", href: "/accounts-receivable", icon: Receipt },
  { name: "Statements", href: "/statements", icon: FileText },
  { name: "Payroll", href: "/payroll", icon: Users },
  { name: "Reservations", href: "/reservations", icon: Calendar },
]

export default function ClientLayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [sidebarVisible, setSidebarVisible] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* Hover trigger area */}
      <div className="fixed left-0 top-0 w-2 h-full z-40 bg-transparent" onMouseEnter={() => setSidebarVisible(true)} />

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out ${
          sidebarVisible ? "translate-x-0" : "-translate-x-full"
        }`}
        onMouseLeave={() => setSidebarVisible(false)}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 px-4 bg-blue-600">
            <Building className="h-8 w-8 text-white" />
            <span className="ml-2 text-xl font-bold text-white">I AM CFO</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                    isActive ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 rounded-full bg-gray-300"></div>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">CFO User</p>
                <p className="text-xs text-gray-500">Administrator</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1">
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  )
}
