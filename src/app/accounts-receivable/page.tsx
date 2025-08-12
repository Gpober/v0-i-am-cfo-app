"use client"

import { useState } from "react"
import { CreditCard, Clock, AlertTriangle, CheckCircle, RefreshCw, Search } from "lucide-react"

// I AM CFO Brand Colors
const BRAND_COLORS = {
  primary: "#56B6E9",
  secondary: "#3A9BD1",
  tertiary: "#7CC4ED",
  accent: "#2E86C1",
  success: "#27AE60",
  warning: "#F39C12",
  danger: "#E74C3C",
}

export default function AccountsReceivablePage() {
  const [selectedPeriod, setSelectedPeriod] = useState("May 2025")
  const [isLoading, setIsLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value)
  }

  // Mock A/R data
  const arData = {
    totalAR: 285000,
    current: 195000,
    days30: 45000,
    days60: 25000,
    days90Plus: 20000,
    averageDSO: 28,
  }

  const arDetails = [
    {
      id: 1,
      customer: "Cleveland Property Management",
      amount: 45000,
      daysOutstanding: 15,
      status: "current",
      property: "Cleveland",
    },
    {
      id: 2,
      customer: "Detroit Holdings LLC",
      amount: 38000,
      daysOutstanding: 22,
      status: "current",
      property: "Detroit",
    },
    {
      id: 3,
      customer: "Columbus Investment Group",
      amount: 32000,
      daysOutstanding: 35,
      status: "30-60",
      property: "Columbus IN",
    },
    {
      id: 4,
      customer: "Rockford Real Estate",
      amount: 28000,
      daysOutstanding: 8,
      status: "current",
      property: "Rockford",
    },
    { id: 5, customer: "Wesley Property Co", amount: 25000, daysOutstanding: 45, status: "30-60", property: "Wesley" },
    {
      id: 6,
      customer: "Pine Terrace Management",
      amount: 22000,
      daysOutstanding: 65,
      status: "60-90",
      property: "Pine Terrace",
    },
    {
      id: 7,
      customer: "Terraview Investments",
      amount: 18000,
      daysOutstanding: 95,
      status: "90+",
      property: "Terraview",
    },
    {
      id: 8,
      customer: "Lisbon Property Group",
      amount: 15000,
      daysOutstanding: 12,
      status: "current",
      property: "Lisbon",
    },
  ]

  const getStatusColor = (status) => {
    switch (status) {
      case "current":
        return "text-green-600 bg-green-100"
      case "30-60":
        return "text-yellow-600 bg-yellow-100"
      case "60-90":
        return "text-orange-600 bg-orange-100"
      case "90+":
        return "text-red-600 bg-red-100"
      default:
        return "text-gray-600 bg-gray-100"
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case "current":
        return <CheckCircle className="w-4 h-4" />
      case "30-60":
        return <Clock className="w-4 h-4" />
      case "60-90":
        return <AlertTriangle className="w-4 h-4" />
      case "90+":
        return <AlertTriangle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const filteredARDetails = arDetails.filter(
    (item) =>
      item.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.property.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Accounts Receivable</h1>
              <p className="text-sm text-gray-600 mt-1">Track outstanding customer payments and aging</p>
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
                onClick={() => setIsLoading(!isLoading)}
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
          {/* A/R Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div
              className="bg-white p-6 rounded-lg shadow-sm border-l-4"
              style={{ borderLeftColor: BRAND_COLORS.primary }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-600 text-sm font-medium mb-2">Total A/R</div>
                  <div className="text-2xl font-bold text-gray-900">{formatCurrency(arData.totalAR)}</div>
                  <div className="text-xs text-blue-600 font-medium mt-1">Outstanding</div>
                </div>
                <CreditCard className="w-8 h-8" style={{ color: BRAND_COLORS.primary }} />
              </div>
            </div>

            <div
              className="bg-white p-6 rounded-lg shadow-sm border-l-4"
              style={{ borderLeftColor: BRAND_COLORS.success }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-600 text-sm font-medium mb-2">Current (0-30)</div>
                  <div className="text-2xl font-bold text-gray-900">{formatCurrency(arData.current)}</div>
                  <div className="text-xs text-green-600 font-medium mt-1">68% of total</div>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>

            <div
              className="bg-white p-6 rounded-lg shadow-sm border-l-4"
              style={{ borderLeftColor: BRAND_COLORS.warning }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-600 text-sm font-medium mb-2">Past Due</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCurrency(arData.days30 + arData.days60 + arData.days90Plus)}
                  </div>
                  <div className="text-xs text-orange-600 font-medium mt-1">32% of total</div>
                </div>
                <AlertTriangle className="w-8 h-8 text-orange-500" />
              </div>
            </div>

            <div
              className="bg-white p-6 rounded-lg shadow-sm border-l-4"
              style={{ borderLeftColor: BRAND_COLORS.secondary }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-600 text-sm font-medium mb-2">Avg DSO</div>
                  <div className="text-2xl font-bold text-gray-900">{arData.averageDSO}</div>
                  <div className="text-xs text-blue-600 font-medium mt-1">Days</div>
                </div>
                <Clock className="w-8 h-8" style={{ color: BRAND_COLORS.secondary }} />
              </div>
            </div>
          </div>

          {/* Aging Analysis */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Aging Analysis</h3>
              <div className="text-sm text-gray-600 mt-1">Breakdown by aging buckets as of {selectedPeriod}</div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">{formatCurrency(arData.current)}</div>
                  <div className="text-sm text-gray-600 mb-1">Current (0-30 days)</div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: "68%" }}></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">68%</div>
                </div>

                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-600 mb-2">{formatCurrency(arData.days30)}</div>
                  <div className="text-sm text-gray-600 mb-1">31-60 days</div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-yellow-500 h-2 rounded-full" style={{ width: "16%" }}></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">16%</div>
                </div>

                <div className="text-center">
                  <div className="text-3xl font-bold text-orange-600 mb-2">{formatCurrency(arData.days60)}</div>
                  <div className="text-sm text-gray-600 mb-1">61-90 days</div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-orange-500 h-2 rounded-full" style={{ width: "9%" }}></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">9%</div>
                </div>

                <div className="text-center">
                  <div className="text-3xl font-bold text-red-600 mb-2">{formatCurrency(arData.days90Plus)}</div>
                  <div className="text-sm text-gray-600 mb-1">90+ days</div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-red-500 h-2 rounded-full" style={{ width: "7%" }}></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">7%</div>
                </div>
              </div>
            </div>
          </div>

          {/* A/R Details */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Outstanding Receivables</h3>
                  <div className="text-sm text-gray-600 mt-1">Detailed breakdown by customer</div>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search customers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-blue-500"
                    style={{ "--tw-ring-color": BRAND_COLORS.primary + "33" }}
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Property
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Days Outstanding
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredARDetails.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{item.customer}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-600">{item.property}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-gray-900">{formatCurrency(item.amount)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="text-sm text-gray-900">{item.daysOutstanding}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}
                        >
                          {getStatusIcon(item.status)}
                          <span className="ml-1 capitalize">{item.status}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                        <button className="text-blue-600 hover:text-blue-900 mr-3">View</button>
                        <button className="text-green-600 hover:text-green-900">Collect</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
