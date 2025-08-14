"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { RefreshCw, X } from "lucide-react"
import { supabase } from "@/lib/supabaseClient"

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

// Balance Sheet Data Structures
interface BalanceSheetAccount {
  account: string
  accountType: string
  balance: number
  beginningBalance: number
  periodActivity: number
  transactions: TransactionDetail[]
}

interface TransactionDetail {
  date: string
  account: string
  memo: string | null
  debit: number
  credit: number
  impact: number
  bankAccount?: string
  entryNumber?: string
  customer?: string
  vendor?: string
  class?: string
  name?: string
  accountType?: string
  reportCategory?: string
}

interface BalanceSheetSection {
  title: string
  accounts: BalanceSheetAccount[]
  total: number
}

type TimePeriod = "Monthly" | "Quarterly" | "YTD" | "Trailing 12" | "Custom"

// Generate months and years lists
const monthsList = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]

const yearsList = Array.from({ length: 10 }, (_, i) => (new Date().getFullYear() - 5 + i).toString())

export default function BalanceSheetPage() {
  // State variables
  const [selectedMonth, setSelectedMonth] = useState<string>("June")
  const [selectedYear, setSelectedYear] = useState<string>("2024")
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("Monthly")
  const [selectedProperty, setSelectedProperty] = useState("All Properties")
  const [customStartDate, setCustomStartDate] = useState("")
  const [customEndDate, setCustomEndDate] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  // Balance sheet data
  const [assets, setAssets] = useState<BalanceSheetSection>({ title: "Assets", accounts: [], total: 0 })
  const [liabilities, setLiabilities] = useState<BalanceSheetSection>({ title: "Liabilities", accounts: [], total: 0 })
  const [equity, setEquity] = useState<BalanceSheetSection>({ title: "Equity", accounts: [], total: 0 })

  // Common state
  const [availableProperties, setAvailableProperties] = useState<string[]>(["All Properties"])
  const [error, setError] = useState<string | null>(null)
  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [transactionDetails, setTransactionDetails] = useState<TransactionDetail[]>([])
  const [modalTitle, setModalTitle] = useState("")
  const [asOfDate, setAsOfDate] = useState<string>("")

  // Extract date parts directly from string
  const getDateParts = (dateString: string) => {
    const datePart = dateString.split("T")[0]
    const [year, month, day] = datePart.split("-").map(Number)
    return { year, month, day }
  }

  // Get month from date string
  const getMonthFromDate = (dateString: string): number => {
    const { month } = getDateParts(dateString)
    return month
  }

  // Get year from date string
  const getYearFromDate = (dateString: string): number => {
    const { year } = getDateParts(dateString)
    return year
  }

  // Format date for display
  const formatDateSafe = (dateString: string): string => {
    const { year, month, day } = getDateParts(dateString)
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value || 0)
  }

  const formatDate = (dateString: string) => {
    return formatDateSafe(dateString)
  }

  const getMonthName = (month: number) => {
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ]
    return monthNames[month - 1]
  }

  // Calculate date range based on selected period
  const calculateDateRange = () => {
    const now = new Date()
    let startDate: string
    let endDate: string

    if (timePeriod === "Custom") {
      startDate = customStartDate || "2024-01-01"
      endDate = customEndDate || "2024-12-31"
    } else if (timePeriod === "YTD") {
      startDate = `${now.getFullYear()}-01-01`
      endDate = now.toISOString().split("T")[0]
    } else if (timePeriod === "Monthly") {
      const monthIndex = monthsList.indexOf(selectedMonth)
      const year = Number.parseInt(selectedYear)

      startDate = `${year}-01-01` // Start from beginning of year for beginning balance
      const lastDay = new Date(year, monthIndex + 1, 0).getDate()
      endDate = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
    } else if (timePeriod === "Quarterly") {
      const monthIndex = monthsList.indexOf(selectedMonth)
      const year = Number.parseInt(selectedYear)
      const quarter = Math.floor(monthIndex / 3)
      const quarterStartMonth = quarter * 3
      startDate = `${year}-01-01` // Start from beginning of year for beginning balance
      const quarterEndMonth = quarterStartMonth + 2
      const lastDay = new Date(year, quarterEndMonth + 1, 0).getDate()
      endDate = `${year}-${String(quarterEndMonth + 1).padStart(2, "0")}-${lastDay}`
    } else {
      // Trailing 12
      const twelveMonthsAgo = new Date(now)
      twelveMonthsAgo.setMonth(now.getMonth() - 12)
      startDate = twelveMonthsAgo.toISOString().split("T")[0]
      endDate = now.toISOString().split("T")[0]
    }

    return { startDate, endDate }
  }

  // Calculate period start for activity calculation
  const calculatePeriodStart = () => {
    const now = new Date()

    if (timePeriod === "Custom") {
      return customStartDate || "2024-01-01"
    } else if (timePeriod === "YTD") {
      return `${now.getFullYear()}-01-01`
    } else if (timePeriod === "Monthly") {
      const monthIndex = monthsList.indexOf(selectedMonth)
      const year = Number.parseInt(selectedYear)
      return `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`
    } else if (timePeriod === "Quarterly") {
      const monthIndex = monthsList.indexOf(selectedMonth)
      const year = Number.parseInt(selectedYear)
      const quarter = Math.floor(monthIndex / 3)
      const quarterStartMonth = quarter * 3
      return `${year}-${String(quarterStartMonth + 1).padStart(2, "0")}-01`
    } else {
      // Trailing 12
      const twelveMonthsAgo = new Date(now)
      twelveMonthsAgo.setMonth(now.getMonth() - 12)
      return twelveMonthsAgo.toISOString().split("T")[0]
    }
  }

  // Fetch available properties
  const fetchFilters = async () => {
    try {
      const { data: propertyData, error: propertyError } = await supabase
        .from("journal_entry_lines")
        .select("class")
        .not("class", "is", null)

      if (propertyError) throw propertyError

      const properties = new Set<string>()
      propertyData.forEach((row: any) => {
        if (row.class) properties.add(row.class)
      })

      setAvailableProperties(["All Properties", ...Array.from(properties).sort()])
    } catch (err) {
      console.error("Error fetching filters:", err)
    }
  }

  // Smart logging function
  const smartLog = (message: string, data?: any) => {
    if (data && typeof data === "object" && data.length !== undefined) {
      console.log(`${message}: ${data.length} items`, data.slice(0, 3))
    } else {
      console.log(message, data)
    }
  }

  // Parse date safely
  const parseDate = (dateString: string | null): string => {
    if (!dateString) return "N/A"
    try {
      return dateString.split("T")[0]
    } catch {
      return "N/A"
    }
  }

  // Load balance sheet data
  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const { startDate, endDate } = calculateDateRange()
      const periodStart = calculatePeriodStart()

      setAsOfDate(endDate)

      smartLog(`🔍 BALANCE SHEET DATA LOAD`)
      smartLog(`📅 Period: ${startDate} to ${endDate}`)
      smartLog(`📊 Period Activity From: ${periodStart}`)
      smartLog(`🏢 Property Filter: "${selectedProperty}"`)

      // Build query for all transactions up to the as-of date
      let query = supabase
        .from("journal_entry_lines")
        .select(
          "entry_number, class, date, account, account_type, debit, credit, memo, customer, vendor, name, entry_bank_account, normal_balance, report_category",
        )
        .lte("date", endDate)
        .order("date", { ascending: true })

      if (selectedProperty !== "All Properties") {
        query = query.eq("class", selectedProperty)
      }

      const { data: allTransactions, error } = await query

      if (error) throw error

      smartLog(`📊 Found transactions`, allTransactions)

      // Process transactions by account
      const accountMap = new Map<string, any>()

      allTransactions.forEach((transaction: any) => {
        const account = transaction.account
        const accountType = transaction.account_type || "Unknown"

        if (!accountMap.has(account)) {
          accountMap.set(account, {
            account,
            accountType,
            allTransactions: [],
            periodTransactions: [],
            balance: 0,
            beginningBalance: 0,
            periodActivity: 0,
          })
        }

        const accountData = accountMap.get(account)!

        // FIXED: Safe handling of normal_balance
        const normalBalance = (transaction.normal_balance?.toString() || "").toLowerCase().trim()
        let transactionImpact = 0

        if (normalBalance) {
          // Use the pre-calculated normal_balance if available
          transactionImpact = Number.parseFloat(transaction.normal_balance) || 0
        } else {
          // Fallback to debit/credit calculation
          const debit = Number.parseFloat(transaction.debit) || 0
          const credit = Number.parseFloat(transaction.credit) || 0

          // Determine impact based on account type
          const accountTypeLower = accountType.toLowerCase()
          if (
            accountTypeLower.includes("asset") ||
            accountTypeLower.includes("expense") ||
            accountTypeLower.includes("cost")
          ) {
            // Assets and Expenses: Debit increases, Credit decreases
            transactionImpact = debit - credit
          } else {
            // Liabilities, Equity, Income: Credit increases, Debit decreases
            transactionImpact = credit - debit
          }
        }

        // Add to all transactions
        accountData.allTransactions.push({
          ...transaction,
          impact: transactionImpact,
        })

        // Calculate running balance
        accountData.balance += transactionImpact

        // Check if transaction is in the current period for activity calculation
        const transactionDate = parseDate(transaction.date)
        if (transactionDate !== "N/A" && transactionDate >= periodStart) {
          accountData.periodTransactions.push({
            ...transaction,
            impact: transactionImpact,
          })
          accountData.periodActivity += transactionImpact
        }
      })

      // Calculate beginning balances
      accountMap.forEach((accountData) => {
        accountData.beginningBalance = accountData.balance - accountData.periodActivity
      })

      // Override with manually stored beginning balances
      const manualBalanceQuery = supabase
        .from("balance_sheet_balances")
        .select(
          "balance_amount, balance_date, property_class, balance_sheet_accounts(account_name)",
        )
        .lte("balance_date", endDate)

      if (selectedProperty !== "All Properties") {
        manualBalanceQuery.eq("property_class", selectedProperty)
      }

      const { data: storedBeginningBalances, error: storedBeginningBalancesError } =
        await manualBalanceQuery

      if (storedBeginningBalancesError) {
        smartLog("❌ Error fetching stored beginning balances", storedBeginningBalancesError)
      } else if (storedBeginningBalances) {
        storedBeginningBalances.forEach((row: any) => {
          const accountName = row.balance_sheet_accounts?.account_name
          const savedDate = parseDate(row.balance_date)
          const storedBalance = Number.parseFloat(row.balance_amount) || 0

          if (!accountName || savedDate === "N/A") return

          const acc = accountMap.get(accountName)
          if (!acc) return

          // Compute balance as of saved date
          const computedBalanceAtSavedDate = acc.allTransactions
            .filter((tx: any) => {
              const txDate = parseDate(tx.date)
              return txDate !== "N/A" && txDate <= savedDate
            })
            .reduce((sum: number, tx: any) => sum + tx.impact, 0)

          const delta = storedBalance - computedBalanceAtSavedDate
          if (Math.abs(delta) < 0.01) return

          // Apply delta to balances
          acc.balance += delta
          if (savedDate < periodStart) {
            acc.beginningBalance += delta
          } else {
            acc.periodActivity += delta
          }

          // Preserve Beginning Balance transaction entry
          const beginningEntry = {
            date: savedDate,
            account: accountName,
            memo: "Beginning Balance",
            debit: delta > 0 ? delta : 0,
            credit: delta < 0 ? -delta : 0,
            impact: delta,
          }

          acc.allTransactions.push(beginningEntry)
          if (savedDate >= periodStart) {
            acc.periodTransactions.push(beginningEntry)
          }

          // Keep transactions chronological
          acc.allTransactions.sort((a, b) =>
            parseDate(a.date).localeCompare(parseDate(b.date)),
          )

          // Recalculate beginning balance after adjustment
          acc.beginningBalance = acc.balance - acc.periodActivity
        })
      }

      // Apply beginning balances saved in localStorage
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("beginningBalances")
        if (saved) {
          try {
            const parsed = JSON.parse(saved) as {
              date: string
              balances: { account: string; balance: number }[]
            }
            const savedDate = parseDate(parsed.date)
            if (savedDate !== "N/A") {
              parsed.balances.forEach((b) => {
                let acc = accountMap.get(b.account)
                if (!acc) {
                  const lower = b.account.toLowerCase()
                  let inferredType = "Asset"
                  if (
                    lower.includes("cash") ||
                    lower.includes("bank") ||
                    lower.includes("checking") ||
                    lower.includes("savings")
                  ) {
                    inferredType = "Bank"
                  }
                  acc = {
                    account: b.account,
                    accountType: inferredType,
                    allTransactions: [],
                    periodTransactions: [],
                    balance: 0,
                    beginningBalance: 0,
                    periodActivity: 0,
                  }
                  accountMap.set(b.account, acc)
                }

                const computedBalanceAtSavedDate = acc.allTransactions
                  .filter((tx: any) => {
                    const txDate = parseDate(tx.date)
                    return txDate !== "N/A" && txDate <= savedDate
                  })
                  .reduce((sum: number, tx: any) => sum + tx.impact, 0)

                const delta = b.balance - computedBalanceAtSavedDate
                if (Math.abs(delta) < 0.01) return

                acc.balance += delta
                if (savedDate < periodStart) {
                  acc.beginningBalance += delta
                } else {
                  acc.periodActivity += delta
                }

                const beginningEntry = {
                  date: savedDate,
                  account: b.account,
                  memo: "Beginning Balance",
                  debit: delta > 0 ? delta : 0,
                  credit: delta < 0 ? -delta : 0,
                  impact: delta,
                }

                acc.allTransactions.push(beginningEntry)
                if (savedDate >= periodStart) {
                  acc.periodTransactions.push(beginningEntry)
                }

                acc.allTransactions.sort((a, b) =>
                  parseDate(a.date).localeCompare(parseDate(b.date)),
                )

                acc.beginningBalance = acc.balance - acc.periodActivity
              })
            }
          } catch (e) {
            smartLog("❌ Error parsing local beginning balances", e)
          }
        }
      }

      smartLog(`🎯 Processed accounts`, Array.from(accountMap.keys()))

      // Categorize accounts
      const assetAccounts: BalanceSheetAccount[] = []
      const liabilityAccounts: BalanceSheetAccount[] = []
      const equityAccounts: BalanceSheetAccount[] = []

      accountMap.forEach((accountData) => {
        const accountType = accountData.accountType.toLowerCase()
        const balanceSheetAccount: BalanceSheetAccount = {
          account: accountData.account,
          accountType: accountData.accountType,
          balance: accountData.balance,
          beginningBalance: accountData.beginningBalance,
          periodActivity: accountData.periodActivity,
          transactions: accountData.allTransactions,
        }

        // Only include accounts with non-zero balances or activity
        if (Math.abs(balanceSheetAccount.balance) > 0.01 || Math.abs(balanceSheetAccount.periodActivity) > 0.01) {
          if (
            accountType.includes("asset") ||
            accountType.includes("bank") ||
            accountType.includes("cash") ||
            accountType.includes("receivable") ||
            accountType.includes("inventory") ||
            accountType.includes("prepaid") ||
            accountType.includes("fixed asset") ||
            accountType.includes("other asset")
          ) {
            assetAccounts.push(balanceSheetAccount)
          } else if (
            accountType.includes("liability") ||
            accountType.includes("payable") ||
            accountType.includes("credit card") ||
            accountType.includes("loan") ||
            accountType.includes("mortgage") ||
            accountType.includes("line of credit")
          ) {
            liabilityAccounts.push(balanceSheetAccount)
          } else if (accountType.includes("equity") || accountType.includes("retained earnings")) {
            equityAccounts.push(balanceSheetAccount)
          }
        }
      })

      // Sort accounts by balance (largest first)
      const sortByBalance = (a: BalanceSheetAccount, b: BalanceSheetAccount) =>
        Math.abs(b.balance) - Math.abs(a.balance)

      assetAccounts.sort(sortByBalance)
      liabilityAccounts.sort(sortByBalance)
      equityAccounts.sort(sortByBalance)

      // Calculate totals
      const assetTotal = assetAccounts.reduce((sum, acc) => sum + acc.balance, 0)
      const liabilityTotal = liabilityAccounts.reduce((sum, acc) => sum + acc.balance, 0)
      const equityTotal = equityAccounts.reduce((sum, acc) => sum + acc.balance, 0)

      setAssets({ title: "Assets", accounts: assetAccounts, total: assetTotal })
      setLiabilities({ title: "Liabilities", accounts: liabilityAccounts, total: liabilityTotal })
      setEquity({ title: "Equity", accounts: equityAccounts, total: equityTotal })

      smartLog(`✅ Balance Sheet Summary:`)
      smartLog(`   Assets: ${assetAccounts.length} accounts, Total: ${formatCurrency(assetTotal)}`)
      smartLog(`   Liabilities: ${liabilityAccounts.length} accounts, Total: ${formatCurrency(liabilityTotal)}`)
      smartLog(`   Equity: ${equityAccounts.length} accounts, Total: ${formatCurrency(equityTotal)}`)
      smartLog(`   Balance Check: ${formatCurrency(assetTotal - liabilityTotal - equityTotal)}`)
    } catch (err) {
      smartLog("❌ Data load failed", err)
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setIsLoading(false)
    }
  }

  // Show transaction details
  const showTransactionDetails = (account: BalanceSheetAccount) => {
    setModalTitle(`${account.account} - Transaction Details`)

    const transactionDetails: TransactionDetail[] = account.transactions.map((tx: any) => ({
      date: tx.date,
      account: tx.account,
      memo: tx.memo,
      debit: Number.parseFloat(tx.debit) || 0,
      credit: Number.parseFloat(tx.credit) || 0,
      impact: tx.impact,
      entryNumber: tx.entry_number,
      customer: tx.customer,
      vendor: tx.vendor,
      name: tx.name,
      class: tx.class,
      bankAccount: tx.entry_bank_account,
      accountType: tx.account_type,
      reportCategory: tx.report_category,
    }))

    setTransactionDetails(transactionDetails)
    setShowTransactionModal(true)
  }

  // Load data on component mount and when filters change
  useEffect(() => {
    fetchFilters()
  }, [])

  useEffect(() => {
    loadData()
  }, [timePeriod, selectedMonth, selectedYear, customStartDate, customEndDate, selectedProperty])

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Balance Sheet</h1>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                As of{" "}
                {asOfDate
                  ? formatDate(asOfDate)
                  : timePeriod === "Monthly"
                    ? `${selectedMonth} ${selectedYear}`
                    : timePeriod === "Quarterly"
                      ? `Q${Math.floor(monthsList.indexOf(selectedMonth) / 3) + 1} ${selectedYear}`
                      : `${timePeriod} Period`}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                💰 Enhanced with beginning balances and period activity tracking
              </p>
            </div>

            <button
              onClick={loadData}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile-Friendly Filters */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
          {/* Mobile: Horizontal scrollable filters */}
          <div className="flex gap-3 overflow-x-auto pb-2 sm:pb-0 sm:flex-wrap sm:items-center scrollbar-hide">
            {/* Time Period */}
            <select
              value={timePeriod}
              onChange={(e) => setTimePeriod(e.target.value as TimePeriod)}
              className="flex-shrink-0 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg bg-white text-xs sm:text-sm hover:border-blue-500 focus:outline-none focus:ring-2 transition-all"
              style={{ "--tw-ring-color": BRAND_COLORS.secondary + "33" } as React.CSSProperties}
            >
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly</option>
              <option value="YTD">Year to Date</option>
              <option value="Trailing 12">Trailing 12 Months</option>
              <option value="Custom">Custom Date Range</option>
            </select>

            {/* Month Dropdown - Show for Monthly and Quarterly */}
            {(timePeriod === "Monthly" || timePeriod === "Quarterly") && (
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="flex-shrink-0 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg bg-white text-xs sm:text-sm hover:border-blue-500 focus:outline-none focus:ring-2 transition-all"
                style={{ "--tw-ring-color": BRAND_COLORS.secondary + "33" } as React.CSSProperties}
              >
                {monthsList.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>
            )}

            {/* Year Dropdown - Show for Monthly and Quarterly */}
            {(timePeriod === "Monthly" || timePeriod === "Quarterly") && (
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="flex-shrink-0 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg bg-white text-xs sm:text-sm hover:border-blue-500 focus:outline-none focus:ring-2 transition-all"
                style={{ "--tw-ring-color": BRAND_COLORS.secondary + "33" } as React.CSSProperties}
              >
                {yearsList.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            )}

            {/* Custom Date Range - Show for Custom */}
            {timePeriod === "Custom" && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg bg-white text-xs sm:text-sm hover:border-blue-500 focus:outline-none focus:ring-2 transition-all"
                  style={{ "--tw-ring-color": BRAND_COLORS.secondary + "33" } as React.CSSProperties}
                />
                <span className="text-gray-500 text-xs">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg bg-white text-xs sm:text-sm hover:border-blue-500 focus:outline-none focus:ring-2 transition-all"
                  style={{ "--tw-ring-color": BRAND_COLORS.secondary + "33" } as React.CSSProperties}
                />
              </div>
            )}

            {/* Property Filter */}
            <select
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className="flex-shrink-0 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg bg-white text-xs sm:text-sm hover:border-blue-500 focus:outline-none focus:ring-2 transition-all"
              style={{ "--tw-ring-color": BRAND_COLORS.secondary + "33" } as React.CSSProperties}
            >
              {availableProperties.map((property) => (
                <option key={property} value={property}>
                  {property}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="space-y-6 sm:space-y-8">
          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 sm:p-4">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mr-2" />
              <span className="text-sm sm:text-base">Loading balance sheet data...</span>
            </div>
          )}

          {/* Summary Cards */}
          {!isLoading &&
            (assets.accounts.length > 0 || liabilities.accounts.length > 0 || equity.accounts.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
                  <div className="text-center">
                    <div className="text-xs sm:text-sm text-gray-600">Total Assets</div>
                    <div
                      className={`text-lg sm:text-xl font-bold ${assets.total >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {formatCurrency(assets.total)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{assets.accounts.length} accounts</div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
                  <div className="text-center">
                    <div className="text-xs sm:text-sm text-gray-600">Total Liabilities</div>
                    <div
                      className={`text-lg sm:text-xl font-bold ${liabilities.total >= 0 ? "text-red-600" : "text-green-600"}`}
                    >
                      {formatCurrency(Math.abs(liabilities.total))}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{liabilities.accounts.length} accounts</div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200">
                  <div className="text-center">
                    <div className="text-xs sm:text-sm text-gray-600">Total Equity</div>
                    <div
                      className={`text-lg sm:text-xl font-bold ${equity.total >= 0 ? "text-blue-600" : "text-red-600"}`}
                    >
                      {formatCurrency(equity.total)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{equity.accounts.length} accounts</div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 border border-gray-200 border-l-4 border-l-blue-500">
                  <div className="text-center">
                    <div className="text-xs sm:text-sm text-blue-700 font-semibold">Balance Check</div>
                    <div
                      className={`text-lg sm:text-xl font-bold ${
                        Math.abs(assets.total - liabilities.total - equity.total) < 1
                          ? "text-green-700"
                          : "text-red-700"
                      }`}
                    >
                      {formatCurrency(assets.total - liabilities.total - equity.total)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Should be $0</div>
                  </div>
                </div>
              </div>
            )}

          {/* Assets Section */}
          {!isLoading && assets.accounts.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-gray-200 bg-green-50">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-green-800 flex items-center">
                    <span className="w-4 h-4 bg-green-500 rounded-full mr-3"></span>
                    Assets
                  </h3>
                  <span className={`text-xl font-bold ${assets.total >= 0 ? "text-green-700" : "text-red-700"}`}>
                    {formatCurrency(assets.total)}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Account
                      </th>
                      <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Beginning
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Activity
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ending Balance
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {assets.accounts.map((account, index) => (
                      <tr key={account.account} className="hover:bg-gray-50">
                        <td className="px-3 sm:px-6 py-4 text-sm font-medium text-gray-900">
                          <button
                            onClick={() => showTransactionDetails(account)}
                            className="text-left hover:text-blue-600 hover:underline"
                          >
                            <div className="truncate max-w-[150px] sm:max-w-none" title={account.account}>
                              {account.account}
                            </div>
                            <div className="sm:hidden text-xs text-gray-500 mt-1">{account.accountType}</div>
                          </button>
                        </td>
                        <td className="hidden sm:table-cell px-6 py-4 text-sm text-gray-500">{account.accountType}</td>
                        <td className="px-3 sm:px-6 py-4 text-sm text-right">
                          <span className={account.beginningBalance >= 0 ? "text-green-600" : "text-red-600"}>
                            {formatCurrency(account.beginningBalance)}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-4 text-sm text-right">
                          <span className={account.periodActivity >= 0 ? "text-green-600" : "text-red-600"}>
                            {account.periodActivity !== 0 ? formatCurrency(account.periodActivity) : "-"}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-4 text-sm text-right">
                          <span className={`font-bold ${account.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {formatCurrency(account.balance)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Liabilities Section */}
          {!isLoading && liabilities.accounts.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-gray-200 bg-red-50">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-red-800 flex items-center">
                    <span className="w-4 h-4 bg-red-500 rounded-full mr-3"></span>
                    Liabilities
                  </h3>
                  <span className={`text-xl font-bold ${liabilities.total >= 0 ? "text-red-700" : "text-green-700"}`}>
                    {formatCurrency(Math.abs(liabilities.total))}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Account
                      </th>
                      <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Beginning
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Activity
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ending Balance
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {liabilities.accounts.map((account, index) => (
                      <tr key={account.account} className="hover:bg-gray-50">
                        <td className="px-3 sm:px-6 py-4 text-sm font-medium text-gray-900">
                          <button
                            onClick={() => showTransactionDetails(account)}
                            className="text-left hover:text-blue-600 hover:underline"
                          >
                            <div className="truncate max-w-[150px] sm:max-w-none" title={account.account}>
                              {account.account}
                            </div>
                            <div className="sm:hidden text-xs text-gray-500 mt-1">{account.accountType}</div>
                          </button>
                        </td>
                        <td className="hidden sm:table-cell px-6 py-4 text-sm text-gray-500">{account.accountType}</td>
                        <td className="px-3 sm:px-6 py-4 text-sm text-right">
                          <span className={account.beginningBalance <= 0 ? "text-red-600" : "text-green-600"}>
                            {formatCurrency(Math.abs(account.beginningBalance))}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-4 text-sm text-right">
                          <span className={account.periodActivity <= 0 ? "text-red-600" : "text-green-600"}>
                            {account.periodActivity !== 0 ? formatCurrency(Math.abs(account.periodActivity)) : "-"}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-4 text-sm text-right">
                          <span className={`font-bold ${account.balance <= 0 ? "text-red-600" : "text-green-600"}`}>
                            {formatCurrency(Math.abs(account.balance))}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Equity Section */}
          {!isLoading && equity.accounts.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 sm:p-6 border-b border-gray-200 bg-blue-50">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-semibold text-blue-800 flex items-center">
                    <span className="w-4 h-4 bg-blue-500 rounded-full mr-3"></span>
                    Equity
                  </h3>
                  <span className={`text-xl font-bold ${equity.total >= 0 ? "text-blue-700" : "text-red-700"}`}>
                    {formatCurrency(equity.total)}
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Account
                      </th>
                      <th className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Beginning
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Activity
                      </th>
                      <th className="px-3 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ending Balance
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {equity.accounts.map((account, index) => (
                      <tr key={account.account} className="hover:bg-gray-50">
                        <td className="px-3 sm:px-6 py-4 text-sm font-medium text-gray-900">
                          <button
                            onClick={() => showTransactionDetails(account)}
                            className="text-left hover:text-blue-600 hover:underline"
                          >
                            <div className="truncate max-w-[150px] sm:max-w-none" title={account.account}>
                              {account.account}
                            </div>
                            <div className="sm:hidden text-xs text-gray-500 mt-1">{account.accountType}</div>
                          </button>
                        </td>
                        <td className="hidden sm:table-cell px-6 py-4 text-sm text-gray-500">{account.accountType}</td>
                        <td className="px-3 sm:px-6 py-4 text-sm text-right">
                          <span className={account.beginningBalance >= 0 ? "text-blue-600" : "text-red-600"}>
                            {formatCurrency(account.beginningBalance)}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-4 text-sm text-right">
                          <span className={account.periodActivity >= 0 ? "text-blue-600" : "text-red-600"}>
                            {account.periodActivity !== 0 ? formatCurrency(account.periodActivity) : "-"}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-4 text-sm text-right">
                          <span className={`font-bold ${account.balance >= 0 ? "text-blue-600" : "text-red-600"}`}>
                            {formatCurrency(account.balance)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* No Data State */}
          {!isLoading &&
            assets.accounts.length === 0 &&
            liabilities.accounts.length === 0 &&
            equity.accounts.length === 0 && (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <p className="text-gray-500">No balance sheet data found for the selected period and filters.</p>
                <p className="text-xs text-gray-400 mt-2">Try adjusting your date range or property filter.</p>
              </div>
            )}
        </div>
      </main>

      {/* Mobile-Friendly Transaction Detail Modal */}
      {showTransactionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900">{modalTitle}</h3>
                  <p className="text-xs sm:text-sm text-gray-600">{transactionDetails.length} transactions</p>
                </div>
                <button onClick={() => setShowTransactionModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5 sm:w-6 sm:h-6" />
                </button>
              </div>

              {/* Transaction Totals */}
              {transactionDetails.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
                  <div className="text-center">
                    <div className="text-xs text-gray-600">Total Debits</div>
                    <div className="text-sm sm:text-lg font-semibold text-red-600">
                      {formatCurrency(transactionDetails.reduce((sum, t) => sum + t.debit, 0))}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-600">Total Credits</div>
                    <div className="text-sm sm:text-lg font-semibold text-green-600">
                      {formatCurrency(transactionDetails.reduce((sum, t) => sum + t.credit, 0))}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-gray-600">Net Impact</div>
                    <div
                      className={`text-sm sm:text-lg font-semibold ${
                        transactionDetails.reduce((sum, t) => sum + t.impact, 0) >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {formatCurrency(transactionDetails.reduce((sum, t) => sum + t.impact, 0))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 sm:p-6 overflow-auto max-h-[70vh]">
              {/* Mobile: Card List */}
              <div className="sm:hidden space-y-3">
                {transactionDetails.map((transaction, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-3 border">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-sm font-medium text-gray-900">{formatDate(transaction.date)}</div>
                      <div className="text-right">
                        <div
                          className={`text-sm font-bold ${transaction.impact >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {formatCurrency(transaction.impact)}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-700 mb-1">{transaction.account}</div>
                    {transaction.memo && <div className="text-xs text-gray-500 mb-2 truncate">{transaction.memo}</div>}
                    <div className="flex justify-between text-xs">
                      <div className="text-red-600">
                        {transaction.debit > 0 ? `Dr: ${formatCurrency(transaction.debit)}` : ""}
                      </div>
                      <div className="text-green-600">
                        {transaction.credit > 0 ? `Cr: ${formatCurrency(transaction.credit)}` : ""}
                      </div>
                    </div>
                    {(transaction.entryNumber || transaction.bankAccount) && (
                      <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500">
                        {transaction.entryNumber && <div>Entry: {transaction.entryNumber}</div>}
                        {transaction.bankAccount && <div>Bank: {transaction.bankAccount}</div>}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Desktop: Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Account
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Memo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Entry #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Bank Account
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Debit
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Credit
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Impact
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transactionDetails.map((transaction, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(transaction.date)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{transaction.account}</td>
                        <td
                          className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate"
                          title={transaction.memo || "N/A"}
                        >
                          {transaction.memo || "N/A"}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">{transaction.entryNumber || "N/A"}</td>
                        <td className="px-6 py-4 text-sm text-blue-600">{transaction.bankAccount || "N/A"}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">
                          {transaction.debit > 0 ? formatCurrency(transaction.debit) : ""}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-green-600">
                          {transaction.credit > 0 ? formatCurrency(transaction.credit) : ""}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                          <span className={transaction.impact >= 0 ? "text-green-600" : "text-red-600"}>
                            {formatCurrency(transaction.impact)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
