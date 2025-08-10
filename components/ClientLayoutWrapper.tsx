"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  LayoutDashboard,
  FileText,
  CreditCard,
  DollarSign,
  TrendingUp,
  Users,
  Calendar,
  Settings,
  LogOut,
} from "lucide-react"

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Financials", href: "/financials", icon: FileText },
  { name: "Accounts Payable", href: "/accounts-payable", icon: CreditCard },
  { name: "Accounts Receivable", href: "/accounts-receivable", icon: DollarSign },
  { name: "Cash Flow", href: "/cash-flow", icon: TrendingUp },
  { name: "Balance Sheet", href: "/balance-sheet", icon: FileText },
  { name: "Payroll", href: "/payroll", icon: Users },
  { name: "Reservations", href: "/reservations", icon: Calendar },
  { name: "Statements", href: "/statements", icon: FileText },
]

export default function ClientLayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const [sidebarVisible, setSidebarVisible] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      {/* Hover trigger area */}
      <div className="fixed left-0 top-0 w-2 h-full z-40 bg-transparent" onMouseEnter={() => setSidebarVisible(true)} />

      {/* Sidebar */}
      <div
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-64 bg-card border-r border-border transition-transform duration-300 ease-in-out",
          sidebarVisible ? "translate-x-0" : "-translate-x-full",
        )}
        onMouseLeave={() => setSidebarVisible(false)}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center border-b px-4">
            <Link href="/" className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-primary rounded-md flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">CF</span>
              </div>
              <span className="font-bold text-lg">I AM CFO</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="border-t p-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                <span className="text-xs font-medium">JD</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">John Doe</p>
                <p className="text-xs text-muted-foreground truncate">CFO</p>
              </div>
            </div>
            <div className="space-y-1">
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Button>
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <LogOut className="mr-2 h-4 w-4" />
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="transition-all duration-300 ease-in-out">{children}</main>
    </div>
  )
}
