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
  payeeCustomer: string | null
  memo: string | null
  class: string | null
  amount: number
  // Keep some additional fields for reference
  account: string
  debit: number
  credit: number
  impact: number
  entryNumber?: string
  accountType?: string
}

interface BalanceSheetSection {
  title: string
  accounts: BalanceSheetAccount[]
  total: number
}

type TimePeriod = "Monthly" | "Quarterly" | "YTD" | "Trailing 12" | "Custom"

// Generate months and years lists
const monthsList = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

const yearsList = Array.from({ length: 10 }, (_, i) => (new Date().getFullYear() - 5 + i).toString())

export default function BalanceSheetPage() {
  // State variables
  const [selectedMonth, setSelectedMonth] = useState<string>("December")
  const [selectedYear, setSelectedYear] = useState<string>("2023")
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

  // Utility functions
  const parseDate = (dateString: string | null): string => {
    if (!dateString) return "N/A"
    try {
      return dateString.split("T")[0]
    } catch {
      return "N/A"
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value || 0)
  }

  const formatDate = (dateString: string) => {
    const { year, month, day } = getDateParts(dateString)
    const date = new Date(year, month - 1, day)
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  const getDateParts = (dateString: string) => {
    const datePart = dateString.split("T")[0]
    const [year, month, day] = datePart.split("-").map(Number)
    return { year, month, day }
  }

  const smartLog = (message: string, data?: any) => {
    if (data && typeof data === "object" && data.length !== undefined) {
      console.log(`${message}: ${data.length} items`, data.slice(0, 3))
    } else {
      console.log(message, data)
    }
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
      const lastDay = new Date(year, monthIndex + 1, 0).getDate()
      startDate = `${year}-01-01`
      endDate = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
    } else if (timePeriod === "Quarterly") {
      const monthIndex = monthsList.indexOf(selectedMonth)
      const year = Number.parseInt(selectedYear)
      const quarter = Math.floor(monthIndex / 3)
      const quarterEndMonth = quarter * 3 + 2
      const lastDay = new Date(year, quarterEndMonth + 1, 0).getDate()
      startDate = `${year}-01-01`
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

  // Helper function to apply manual beginning balances
  const applyManualBeginningBalances = async (accountMap: Map<string, any>, endDate: string) => {
    // Apply beginning balances from database
    try {
      let manualBalanceQuery = supabase
        .from("balance_sheet_balances")
        .select(
          "balance_amount, balance_date, property_class, balance_sheet_accounts(account_name)",
        )
        .lte("balance_date", endDate)
        .order("balance_date", { ascending: false })

      if (selectedProperty !== "All Properties") {
        manualBalanceQuery = manualBalanceQuery.eq("property_class", selectedProperty)
      }

      const { data: storedBeginningBalances, error: storedBeginningBalancesError } =
        await manualBalanceQuery

      if (storedBeginningBalancesError) {
        smartLog("❌ Error fetching stored beginning balances", storedBeginningBalancesError)
      } else if (storedBeginningBalances) {
        const latestBalancesByAccount = new Map<string, any>()
        
        storedBeginningBalances.forEach((row: any) => {
          const accountName = row.balance_sheet_accounts?.account_name
          if (accountName) {
            const currentDate = parseDate(row.balance_date)
            if (!latestBalancesByAccount.has(accountName) || 
                currentDate > parseDate(latestBalancesByAccount.get(accountName).balance_date)) {
              latestBalancesByAccount.set(accountName, row)
            }
          }
        })

        latestBalancesByAccount.forEach((row: any) => {
          const accountName = row.balance_sheet_accounts?.account_name
          const savedDate = parseDate(row.balance_date)
          const storedBalance = Number.parseFloat(row.balance_amount) || 0

          if (!accountName || savedDate === "N/A") return

          let acc = accountMap.get(accountName)
          if (!acc) {
            acc = {
              account: accountName,
              accountType: "Asset",
              allTransactions: [],
              manualBalanceApplied: false,
            }
            accountMap.set(accountName, acc)
          }

          const beginningEntry = {
            date: savedDate,
            account: accountName,
            memo: "Manual Beginning Balance (Database)",
            debit: storedBalance > 0 ? storedBalance : 0,
            credit: storedBalance < 0 ? -storedBalance : 0,
            impact: storedBalance,
            entry_number: "MANUAL-DB",
          }

          acc.allTransactions.push(beginningEntry)
          acc.manualBalanceApplied = true
        })
      }
    } catch (err) {
      smartLog("❌ Error applying database beginning balances", err)
    }

    // Apply beginning balances from localStorage
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("beginningBalances")
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as {
            date: string
            balances: {
              account: string
              balance: number
              accountType?: string
            }[]
          }
          const savedDate = parseDate(parsed.date)
          
          if (savedDate !== "N/A" && savedDate <= endDate) {
            parsed.balances.forEach((b) => {
              let acc = accountMap.get(b.account)
              if (!acc) {
                const lower = b.account.toLowerCase()
                let inferredType = b.accountType || "Asset"
                if (
                  !b.accountType &&
                  (lower.includes("cash") ||
                    lower.includes("bank") ||
                    lower.includes("checking") ||
                    lower.includes("savings"))
                ) {
                  inferredType = "Bank"
                }
                acc = {
                  account: b.account,
                  accountType: inferredType,
                  allTransactions: [],
                  manualBalanceApplied: false,
                }
                accountMap.set(b.account, acc)
              }

              if (!acc.manualBalanceApplied) {
                const beginningEntry = {
                  date: savedDate,
                  account: b.account,
                  memo: "Manual Beginning Balance (Local)",
                  debit: b.balance > 0 ? b.balance : 0,
                  credit: b.balance < 0 ? -b.balance : 0,
                  impact: b.balance,
                  entry_number: "MANUAL-LOCAL",
                }

                acc.allTransactions.push(beginningEntry)
              }
            })
          }
        } catch (e) {
          smartLog("❌ Error parsing local beginning balances", e)
        }
      }
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

  // Main data loading function with corrected balance calculation
  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const { endDate } = calculateDateRange()
      const periodStart = calculatePeriodStart()

      setAsOfDate(endDate)

      smartLog(`🔍 BALANCE SHEET DATA LOAD`)
      smartLog(`📅 As Of Date: ${endDate}`)
      smartLog(`📊 Period Activity From: ${periodStart}`)
      smartLog(`🏢 Property Filter: "${selectedProperty}"`)

      // SINGLE QUERY: Get ALL balance sheet transactions up to as-of date
      // We'll classify them in memory rather than multiple queries
      let query = supabase
        .from("journal_entry_lines")
        .select(
          "entry_number, class, date, account, account_type, debit, credit, memo, customer, vendor, name, normal_balance",
        )
        .lte("date", endDate)
        .order("date", { ascending: true })

      if (selectedProperty !== "All Properties") {
        query = query.eq("class", selectedProperty)
      }

      const { data: allTransactions, error } = await query

      if (error) throw error

      smartLog(`📊 Found ${allTransactions.length} total balance sheet transactions`)

      // Initialize account map
      const accountMap = new Map<string, any>()

      // First, apply manual beginning balances
      await applyManualBeginningBalances(accountMap, endDate)

      // Process ALL transactions and store them by account
      allTransactions.forEach((transaction: any) => {
        const account = transaction.account
        const accountType = transaction.account_type || "Unknown"

        if (!accountMap.has(account)) {
          accountMap.set(account, {
            account,
            accountType,
            allTransactions: [], // ALL transactions for this account
            manualBalanceApplied: false,
          })
        }

        const accountData = accountMap.get(account)!

        // Calculate transaction impact
        let transactionImpact = 0

        if (transaction.normal_balance !== null && transaction.normal_balance !== undefined) {
          transactionImpact = Number.parseFloat(transaction.normal_balance) || 0
        } else {
          const debit = Number.parseFloat(transaction.debit) || 0
          const credit = Number.parseFloat(transaction.credit) || 0

          const accountTypeLower = accountType.toLowerCase()
          if (
            accountTypeLower.includes("asset") ||
            accountTypeLower.includes("expense") ||
            accountTypeLower.includes("cost") ||
            accountTypeLower.includes("bank") ||
            accountTypeLower.includes("cash") ||
            accountTypeLower.includes("receivable") ||
            accountTypeLower.includes("inventory") ||
            accountTypeLower.includes("prepaid") ||
            accountTypeLower.includes("fixed asset") ||
            accountTypeLower.includes("other asset")
          ) {
            // ASSETS: Debit increases, Credit decreases
            transactionImpact = debit - credit
          } else if (
            accountTypeLower.includes("liability") ||
            accountTypeLower.includes("payable") ||
            accountTypeLower.includes("credit card") ||
            accountTypeLower.includes("loan") ||
            accountTypeLower.includes("mortgage") ||
            accountTypeLower.includes("line of credit") ||
            accountTypeLower.includes("equity") ||
            accountTypeLower.includes("retained earnings") ||
            accountTypeLower.includes("revenue") ||
            accountTypeLower.includes("income")
          ) {
            // LIABILITIES, EQUITY, REVENUE: Credit increases, Debit decreases
            transactionImpact = credit - debit
          } else {
            // Default fallback: treat as debit normal (like assets)
            transactionImpact = debit - credit
          }
        }

        // Store ALL transactions - we'll classify them later for drill-down
        accountData.allTransactions.push({
          ...transaction,
          impact: transactionImpact,
        })
      })

      // Sort all transactions by date for each account
      accountMap.forEach((accountData) => {
        accountData.allTransactions.sort((a, b) =>
          parseDate(a.date).localeCompare(parseDate(b.date))
        )
      })

      // CLASSIFICATION: Now calculate balances by classifying the transactions
      accountMap.forEach((accountData) => {
        let beginningBalance = 0
        let periodActivity = 0
        let endingBalance = 0

        // Classify each transaction and calculate running balances
        accountData.allTransactions.forEach((tx: any) => {
          const transactionDate = parseDate(tx.date)
          
          // Add to ending balance (all transactions)
          endingBalance += tx.impact
          
          // Classify: before period = beginning, during period = activity
          if (transactionDate !== "N/A" && transactionDate < periodStart) {
            beginningBalance += tx.impact
          } else if (transactionDate !== "N/A" && transactionDate >= periodStart) {
            periodActivity += tx.impact
          }
        })

        // Store classifications
        accountData.beginningBalance = beginningBalance
        accountData.periodActivity = periodActivity
        accountData.endingBalance = endingBalance

        // Debug logging for specific accounts
        if (accountData.account.includes("Cerro Vista") || accountData.account.includes("Vista")) {
          smartLog(`🔍 ${accountData.account} Classifications:`, {
            totalTransactions: accountData.allTransactions.length,
            beginningBalance: `${formatCurrency(beginningBalance)} (${accountData.allTransactions.filter(tx => parseDate(tx.date) < periodStart).length} txns)`,
            periodActivity: `${formatCurrency(periodActivity)} (${accountData.allTransactions.filter(tx => parseDate(tx.date) >= periodStart).length} txns)`,
            endingBalance: `${formatCurrency(endingBalance)} (all ${accountData.allTransactions.length} txns)`,
            periodStart,
          })
        }
      })

      smartLog(`✅ Processed ${accountMap.size} accounts with transaction classifications`)

      // Rest of the categorization logic remains the same...
      const assetAccounts: BalanceSheetAccount[] = []
      const liabilityAccounts: BalanceSheetAccount[] = []
      const equityAccounts: BalanceSheetAccount[] = []

      accountMap.forEach((accountData) => {
        const accountType = accountData.accountType.toLowerCase()
        
        // Only include accounts with non-zero balances or activity
        if (Math.abs(accountData.endingBalance) > 0.01 || Math.abs(accountData.periodActivity) > 0.01) {
          const balanceSheetAccount: BalanceSheetAccount = {
            account: accountData.account,
            accountType: accountData.accountType,
            balance: accountData.endingBalance,
            beginningBalance: accountData.beginningBalance,
            periodActivity: accountData.periodActivity,
            transactions: accountData.allTransactions, // ALL transactions available for drill-down
          }

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

      // Sort accounts by absolute balance (largest first)
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

  // Show transaction details modal with different filter types
  const showTransactionDetails = (
    account: BalanceSheetAccount, 
    filterType: 'all' | 'beginning' | 'period' | 'ending' = 'all'
  ) => {
    let filteredTransactions: any[] = []
    let title = ""

    switch (filterType) {
      case 'beginning':
        // Show transactions that contribute to beginning balance (before period start)
        filteredTransactions = account.transactions.filter((tx: any) => {
          const txDate = parseDate(tx.date)
          return txDate !== "N/A" && txDate < calculatePeriodStart()
        })
        title = `${account.account} - Beginning Balance Transactions`
        break
      
      case 'period':
        // Show transactions within the current period
        filteredTransactions = account.transactions.filter((tx: any) => {
          const txDate = parseDate(tx.date)
          const periodStart = calculatePeriodStart()
          return txDate !== "N/A" && txDate >= periodStart
        })
        title = `${account.account} - Period Activity Transactions`
        break
      
      case 'ending':
        // Show all transactions up to as-of date
        filteredTransactions = account.transactions
        title = `${account.account} - All Transactions (Ending Balance)`
        break
      
      default:
        filteredTransactions = account.transactions
        title = `${account.account} - All Transaction Details`
        break
    }

    setModalTitle(title)

    const transactionDetails: TransactionDetail[] = filteredTransactions.map((tx: any) => {
      // Determine Payee/Customer - prioritize customer, then vendor, then name
      const payeeCustomer = tx.customer || tx.vendor || tx.name || "N/A"
      
      // Calculate amount (positive for increases to the account, negative for decreases)
      const amount = tx.impact || 0

      return {
        date: tx.date,
        payeeCustomer,
        memo: tx.memo,
        class: tx.class,
        amount,
        account: tx.account,
        debit: Number.parseFloat(tx.debit) || 0,
        credit: Number.parseFloat(tx.credit) || 0,
        impact: tx.impact,
        entryNumber: tx.entry_number,
        accountType: tx.account_type,
      }
    })

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
                💰 Enhanced with corrected beginning balance calculations
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

      {/* Filters */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
          <div className="flex gap-3 overflow-x-auto pb-2 sm:pb-0 sm:flex-wrap sm:items-center scrollbar-hide">
            <select
              value={timePeriod}
              onChange={(e) => setTimePeriod(e.target.value as TimePeriod)}
              className="flex-shrink-0 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg bg-white text-xs sm:text-sm hover:border-blue-500 focus:outline-none focus:ring-2 transition-all"
            >
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly</option>
              <option value="YTD">Year to Date</option>
              <option value="Trailing 12">Trailing 12 Months</option>
              <option value="Custom">Custom Date Range</option>
            </select>

            {(timePeriod === "Monthly" || timePeriod === "Quarterly") && (
              <>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="flex-shrink-0 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg bg-white text-xs sm:text-sm hover:border-blue-500 focus:outline-none focus:ring-2 transition-all"
                >
                  {monthsList.map((month) => (
                    <option key={month} value={month}>
                      {month}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="flex-shrink-0 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg bg-white text-xs sm:text-sm hover:border-blue-500 focus:outline-none focus:ring-2 transition-all"
                >
                  {yearsList.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </>
            )}

            {timePeriod === "Custom" && (
              <div className="flex items-center gap-2 flex-shrink-0">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg bg-white text-xs sm:text-sm hover:border-blue-500 focus:outline-none focus:ring-2 transition-all"
                />
                <span className="text-gray-500 text-xs">to</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg bg-white text-xs sm:text-sm hover:border-blue-500 focus:outline-none focus:ring-2 transition-all"
                />
              </div>
            )}

            <select
              value={selectedProperty}
              onChange={(e) => setSelectedProperty(e.target.value)}
              className="flex-shrink-0 px-3 sm:px-4 py-2 border border-gray-300 rounded-lg bg-white text-xs sm:text-sm hover:border-blue-500 focus:outline-none focus:ring-2 transition-all"
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
                    {assets.accounts.map((account) => (
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
                          <button
                            onClick={() => showTransactionDetails(account, 'beginning')}
                            className={`hover:underline ${account.beginningBalance >= 0 ? "text-green-600" : "text-red-600"} ${
                              account.beginningBalance !== 0 ? "hover:bg-green-50" : "cursor-default"
                            } px-2 py-1 rounded transition-colors`}
                            disabled={account.beginningBalance === 0}
                          >
                            {formatCurrency(account.beginningBalance)}
                          </button>
                        </td>
                        <td className="px-3 sm:px-6 py-4 text-sm text-right">
                          <button
                            onClick={() => showTransactionDetails(account, 'period')}
                            className={`hover:underline ${account.periodActivity >= 0 ? "text-green-600" : "text-red-600"} ${
                              account.periodActivity !== 0 ? "hover:bg-blue-50" : "cursor-default"
                            } px-2 py-1 rounded transition-colors`}
                            disabled={account.periodActivity === 0}
                          >
                            {account.periodActivity !== 0 ? formatCurrency(account.periodActivity) : "-"}
                          </button>
                        </td>
                        <td className="px-3 sm:px-6 py-4 text-sm text-right">
                          <button
                            onClick={() => showTransactionDetails(account, 'ending')}
                            className={`font-bold hover:underline ${account.balance >= 0 ? "text-green-600" : "text-red-600"} hover:bg-gray-50 px-2 py-1 rounded transition-colors`}
                          >
                            {formatCurrency(account.balance)}
                          </button>
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
                    {liabilities.accounts.map((account) => (
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
                          <button
                            onClick={() => showTransactionDetails(account, 'beginning')}
                            className={`hover:underline ${account.beginningBalance <= 0 ? "text-red-600" : "text-green-600"} ${
                              account.beginningBalance !== 0 ? "hover:bg-red-50" : "cursor-default"
                            } px-2 py-1 rounded transition-colors`}
                            disabled={account.beginningBalance === 0}
                          >
                            {formatCurrency(Math.abs(account.beginningBalance))}
                          </button>
                        </td>
                        <td className="px-3 sm:px-6 py-4 text-sm text-right">
                          <button
                            onClick={() => showTransactionDetails(account, 'period')}
                            className={`hover:underline ${account.periodActivity <= 0 ? "text-red-600" : "text-green-600"} ${
                              account.periodActivity !== 0 ? "hover:bg-blue-50" : "cursor-default"
                            } px-2 py-1 rounded transition-colors`}
                            disabled={account.periodActivity === 0}
                          >
                            {account.periodActivity !== 0 ? formatCurrency(Math.abs(account.periodActivity)) : "-"}
                          </button>
                        </td>
                        <td className="px-3 sm:px-6 py-4 text-sm text-right">
                          <button
                            onClick={() => showTransactionDetails(account, 'ending')}
                            className={`font-bold hover:underline ${account.balance <= 0 ? "text-red-600" : "text-green-600"} hover:bg-gray-50 px-2 py-1 rounded transition-colors`}
                          >
                            {formatCurrency(Math.abs(account.balance))}
                          </button>
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
                    {equity.accounts.map((account) => (
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
                          <button
                            onClick={() => showTransactionDetails(account, 'beginning')}
                            className={`hover:underline ${account.beginningBalance >= 0 ? "text-blue-600" : "text-red-600"} ${
                              account.beginningBalance !== 0 ? "hover:bg-blue-50" : "cursor-default"
                            } px-2 py-1 rounded transition-colors`}
                            disabled={account.beginningBalance === 0}
                          >
                            {formatCurrency(account.beginningBalance)}
                          </button>
                        </td>
                        <td className="px-3 sm:px-6 py-4 text-sm text-right">
                          <button
                            onClick={() => showTransactionDetails(account, 'period')}
                            className={`hover:underline ${account.periodActivity >= 0 ? "text-blue-600" : "text-red-600"} ${
                              account.periodActivity !== 0 ? "hover:bg-blue-50" : "cursor-default"
                            } px-2 py-1 rounded transition-colors`}
                            disabled={account.periodActivity === 0}
                          >
                            {account.periodActivity !== 0 ? formatCurrency(account.periodActivity) : "-"}
                          </button>
                        </td>
                        <td className="px-3 sm:px-6 py-4 text-sm text-right">
                          <button
                            onClick={() => showTransactionDetails(account, 'ending')}
                            className={`font-bold hover:underline ${account.balance >= 0 ? "text-blue-600" : "text-red-600"} hover:bg-gray-50 px-2 py-1 rounded transition-colors`}
                          >
                            {formatCurrency(account.balance)}
                          </button>
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

      {/* Transaction Detail Modal */}
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

              {/* Enhanced Transaction Summary with Period Info */}
              {transactionDetails.length > 0 && (
                <div className="mt-4 space-y-3">
                  {/* Main Totals */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <div className="text-xs text-gray-600">Total Amount</div>
                      <div
                        className={`text-sm sm:text-lg font-semibold ${
                          transactionDetails.reduce((sum, t) => sum + t.amount, 0) >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {formatCurrency(transactionDetails.reduce((sum, t) => sum + t.amount, 0))}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-gray-600">Transaction Count</div>
                      <div className="text-sm sm:text-lg font-semibold text-blue-600">
                        {transactionDetails.length}
                      </div>
                    </div>
                  </div>

                  {/* Period Breakdown */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-4 p-3 sm:p-4 bg-blue-50 rounded-lg">
                    <div className="text-center">
                      <div className="text-xs text-blue-700 font-medium">
                        Before {formatDate(calculatePeriodStart())}
                      </div>
                      <div className="text-sm sm:text-base font-semibold text-blue-800">
                        {formatCurrency(
                          transactionDetails
                            .filter(t => parseDate(t.date) < calculatePeriodStart())
                            .reduce((sum, t) => sum + t.amount, 0)
                        )}
                      </div>
                      <div className="text-xs text-blue-600">
                        ({transactionDetails.filter(t => parseDate(t.date) < calculatePeriodStart()).length} transactions)
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-blue-700 font-medium">
                        From {formatDate(calculatePeriodStart())}
                      </div>
                      <div className="text-sm sm:text-base font-semibold text-blue-800">
                        {formatCurrency(
                          transactionDetails
                            .filter(t => parseDate(t.date) >= calculatePeriodStart())
                            .reduce((sum, t) => sum + t.amount, 0)
                        )}
                      </div>
                      <div className="text-xs text-blue-600">
                        ({transactionDetails.filter(t => parseDate(t.date) >= calculatePeriodStart()).length} transactions)
                      </div>
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
                          className={`text-sm font-bold ${transaction.amount >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {formatCurrency(transaction.amount)}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-gray-700">
                        <span className="font-medium">Payee/Customer:</span> {transaction.payeeCustomer}
                      </div>
                      {transaction.memo && (
                        <div className="text-sm text-gray-600">
                          <span className="font-medium">Memo:</span> {transaction.memo}
                        </div>
                      )}
                      {transaction.class && (
                        <div className="text-sm text-blue-600">
                          <span className="font-medium">Class:</span> {transaction.class}
                        </div>
                      )}
                    </div>
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
                        Payee/Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Memo
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Class
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {transactionDetails.map((transaction, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(transaction.date)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                          <div className="truncate" title={transaction.payeeCustomer || "N/A"}>
                            {transaction.payeeCustomer || "N/A"}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                          <div className="truncate" title={transaction.memo || "N/A"}>
                            {transaction.memo || "N/A"}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-blue-600 max-w-xs">
                          <div className="truncate" title={transaction.class || "N/A"}>
                            {transaction.class || "N/A"}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                          <span className={transaction.amount >= 0 ? "text-green-600" : "text-red-600"}>
                            {formatCurrency(transaction.amount)}
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
