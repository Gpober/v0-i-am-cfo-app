"use client"

import { useState } from "react"
import Link from "next/link"
import {
  DollarSign,
  TrendingUp,
  Building2,
  CreditCard,
  Users,
  ArrowUpRight,
  RefreshCw,
  BarChart3,
  PieChart,
  AlertTriangle,
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
}

export default function OverviewPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedPeriod, setSelectedPeriod] = useState("May 2025")

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Financial Overview</h1>
              <p className="text-sm text-gray-600 mt-1">
                Comprehensive view of your financial performance and key metrics
              </p>
            </div>

            <div className="flex items-center space-x-4">
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm hover:border-blue-500 focus:outline-none focus:ring-2 transition-all"
                style={{ "--tw-ring-color": BRAND_COLORS.secondary + "33" }}
              >
                <option value="May 2025">May 2025</option>
                <option value="April 2025">April 2025</option>
                <option value="March 2025">March 2025</option>
              </select>

              <button
                onClick={refreshData}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Key Performance Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div
              className="bg-white p-6 rounded-lg shadow-sm border-l-4"
              style={{ borderLeftColor: BRAND_COLORS.primary }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-600 text-sm font-medium mb-2">Total Revenue</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCompactCurrency(overviewData.kpis.revenue)}
                  </div>
                  <div className="flex items-center text-xs text-green-600 font-medium mt-1">
                    <ArrowUpRight className="w-3 h-3 mr-1" />+{overviewData.trends.revenueGrowth}% vs last month
                  </div>
                </div>
                <DollarSign className="w-8 h-8" style={{ color: BRAND_COLORS.primary }} />
              </div>
            </div>

            <div
              className="bg-white p-6 rounded-lg shadow-sm border-l-4"
              style={{ borderLeftColor: BRAND_COLORS.success }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-600 text-sm font-medium mb-2">Net Income</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCompactCurrency(overviewData.kpis.netIncome)}
                  </div>
                  <div className="text-xs text-green-600 font-medium mt-1">
                    {overviewData.trends.profitMargin}% profit margin
                  </div>
                </div>
                <TrendingUp className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div
              className="bg-white p-6 rounded-lg shadow-sm border-l-4"
              style={{ borderLeftColor: BRAND_COLORS.secondary }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-600 text-sm font-medium mb-2">Total Assets</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCompactCurrency(overviewData.kpis.totalAssets)}
                  </div>
                  <div className="flex items-center text-xs text-green-600 font-medium mt-1">
                    <ArrowUpRight className="w-3 h-3 mr-1" />+{overviewData.trends.assetGrowth}% growth
                  </div>
                </div>
                <Building2 className="w-8 h-8" style={{ color: BRAND_COLORS.secondary }} />
              </div>
            </div>

            <div
              className="bg-white p-6 rounded-lg shadow-sm border-l-4"
              style={{ borderLeftColor: BRAND_COLORS.warning }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-600 text-sm font-medium mb-2">Cash Flow</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCompactCurrency(overviewData.kpis.cashFlow)}
                  </div>
                  <div className="flex items-center text-xs text-green-600 font-medium mt-1">
                    <ArrowUpRight className="w-3 h-3 mr-1" />+{overviewData.trends.cashFlowTrend}% this month
                  </div>
                </div>
                <TrendingUp className="w-8 h-8" style={{ color: BRAND_COLORS.warning }} />
              </div>
            </div>
          </div>

          {/* Financial Health Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Quick Actions */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
                <div className="text-sm text-gray-600 mt-1">Access key financial reports and analysis</div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {overviewData.quickActions.map((action) => (
                    <Link
                      key={action.title}
                      href={action.href}
                      className="group p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center mb-3">
                        <action.icon className="w-6 h-6 mr-3" style={{ color: action.color }} />
                        <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                          {action.title}
                        </h4>
                      </div>
                      <p className="text-sm text-gray-600">{action.description}</p>
                      <div className="mt-2 text-xs text-blue-600 font-medium">View Details →</div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Alerts & Notifications */}
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Alerts & Insights</h3>
                <div className="text-sm text-gray-600 mt-1">Important financial notifications and trends</div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {overviewData.alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-lg border-l-4 ${
                        alert.type === "warning"
                          ? "bg-yellow-50 border-yellow-400"
                          : alert.type === "success"
                            ? "bg-green-50 border-green-400"
                            : "bg-blue-50 border-blue-400"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center mb-1">
                            {alert.type === "warning" && <AlertTriangle className="w-4 h-4 text-yellow-600 mr-2" />}
                            {alert.type === "success" && <TrendingUp className="w-4 h-4 text-green-600 mr-2" />}
                            {alert.type === "info" && <BarChart3 className="w-4 h-4 text-blue-600 mr-2" />}
                            <h4 className="font-semibold text-gray-900">{alert.title}</h4>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{alert.message}</p>
                          <Link
                            href={alert.href}
                            className={`text-xs font-medium hover:underline ${
                              alert.type === "warning"
                                ? "text-yellow-700"
                                : alert.type === "success"
                                  ? "text-green-700"
                                  : "text-blue-700"
                            }`}
                          >
                            {alert.action} →
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Financial Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">A/R Balance</h3>
                <CreditCard className="w-6 h-6" style={{ color: BRAND_COLORS.warning }} />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-2">{formatCurrency(overviewData.kpis.arBalance)}</div>
              <div className="text-sm text-gray-600 mb-3">Outstanding receivables</div>
              <Link href="/accounts-receivable" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                View Details →
              </Link>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">A/P Balance</h3>
                <Users className="w-6 h-6" style={{ color: BRAND_COLORS.danger }} />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-2">{formatCurrency(overviewData.kpis.apBalance)}</div>
              <div className="text-sm text-gray-600 mb-3">Outstanding payables</div>
              <Link href="/accounts-payable" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                View Details →
              </Link>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Net Worth</h3>
                <PieChart className="w-6 h-6" style={{ color: BRAND_COLORS.success }} />
              </div>
              <div className="text-2xl font-bold text-gray-900 mb-2">
                {formatCurrency(overviewData.kpis.totalAssets - overviewData.kpis.totalLiabilities)}
              </div>
              <div className="text-sm text-gray-600 mb-3">Assets minus liabilities</div>
              <Link href="/balance-sheet" className="text-sm font-medium text-blue-600 hover:text-blue-700">
                View Balance Sheet →
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
