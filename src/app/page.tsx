"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { TrendingUp, Building2, CreditCard, BarChart3 } from "lucide-react"

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

export default function OverviewPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState("May 2025")
  const router = useRouter()

  useEffect(() => {
    // Redirect to dashboard on load
    router.push("/dashboard")
  }, [router])

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value || 0)
  }

  const formatCompactCurrency = (value) => {
    if (Math.abs(value) >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`
    } else if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(1)}K`
    }
    return formatCurrency(value)
  }

  // Mock overview data - this would come from Supabase in a real implementation
  const overviewData = {
    kpis: {
      revenue: 2450000,
      netIncome: 635000,
      totalAssets: 11515000,
      totalLiabilities: 4255000,
      cashFlow: 420000,
      arBalance: 285000,
      apBalance: 195000,
    },
    trends: {
      revenueGrowth: 8.5,
      profitMargin: 25.9,
      assetGrowth: 3.2,
      cashFlowTrend: 12.1,
    },
    alerts: [
      {
        id: 1,
        type: "warning",
        title: "High A/R Aging",
        message: "32% of receivables are past due",
        action: "Review A/R",
        href: "/accounts-receivable",
      },
      {
        id: 2,
        type: "info",
        title: "Strong Cash Flow",
        message: "Operating cash flow up 12.1% this month",
        action: "View Cash Flow",
        href: "/cash-flow",
      },
      {
        id: 3,
        type: "success",
        title: "Profitable Properties",
        message: "8 of 10 properties showing positive margins",
        action: "View P&L",
        href: "/financials",
      },
    ],
    quickActions: [
      {
        title: "View P&L Statement",
        description: "Detailed profit and loss analysis",
        href: "/financials",
        icon: BarChart3,
        color: BRAND_COLORS.primary,
      },
      {
        title: "Cash Flow Analysis",
        description: "Track cash inflows and outflows",
        href: "/cash-flow",
        icon: TrendingUp,
        color: BRAND_COLORS.success,
      },
      {
        title: "Balance Sheet",
        description: "Assets, liabilities, and equity",
        href: "/balance-sheet",
        icon: Building2,
        color: BRAND_COLORS.secondary,
      },
      {
        title: "Accounts Receivable",
        description: "Customer payments and aging",
        href: "/accounts-receivable",
        icon: CreditCard,
        color: BRAND_COLORS.warning,
      },
    ],
  }

  const refreshData = async () => {
    setIsLoading(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading dashboard...</p>
      </div>
    </div>
  )
}
