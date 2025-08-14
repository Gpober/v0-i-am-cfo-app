"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import {
  Menu,
  X,
  ChevronLeft,
  TrendingUp,
  Award,
  AlertTriangle,
  CheckCircle,
  Target,
  type LucideIcon,
} from "lucide-react"
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
  gray: {
    50: "#F8FAFC",
    100: "#F1F5F9",
    200: "#E2E8F0",
  },
}

interface PropertySummary {
  name: string
  revenue?: number
  expenses?: number
  netIncome?: number
  operating?: number
  financing?: number
  investing?: number // NEW: Add investing
  transfers?: number // NEW: Add transfers
}

interface Category {
  name: string
  total: number
}

interface Transaction {
  date: string
  amount: number
  running: number
  payee?: string | null
  memo?: string | null
  className?: string | null
}

interface JournalRow {
  account: string
  account_type: string | null
  debit: number | null
  credit: number | null
  class: string | null
  report_category?: string | null
  normal_balance?: number | null
  date: string
  memo?: string | null
  customer?: string | null
  vendor?: string | null
  name?: string | null
  entry_bank_account?: string | null // NEW: Add bank account field
}

const getMonthName = (m: number) => new Date(0, m - 1).toLocaleString("en-US", { month: "long" })

// TIMEZONE-INDEPENDENT DATE UTILITIES (from P&L component)
// Extract date parts directly from string without timezone conversion
const getDateParts = (dateString: string) => {
  const dateOnly = dateString.split("T")[0] // Get YYYY-MM-DD part only
  const [year, month, day] = dateOnly.split("-").map(Number)
  return { year, month, day, dateOnly }
}

// Get month name from date string without timezone issues
const getMonthYear = (dateString: string) => {
  const { year, month } = getDateParts(dateString)
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
  return `${monthNames[month - 1]} ${year}`
}

// Compare dates as strings (YYYY-MM-DD format)
const isDateInRange = (dateString: string, startDate: string, endDate: string): boolean => {
  const { dateOnly } = getDateParts(dateString)
  return dateOnly >= startDate && dateOnly <= endDate
}

// Format date for display without timezone conversion
const formatDateDisplay = (dateString: string) => {
  const { year, month, day } = getDateParts(dateString)
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  return `${monthNames[month - 1]} ${day}, ${year}`
}

type Insight = {
  title: string
  message: string
  icon: LucideIcon
  type: "success" | "warning" | "info"
}

export default function EnhancedMobileDashboard() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [reportType, setReportType] = useState<"pl" | "cf">("pl")
  const [reportPeriod, setReportPeriod] = useState<"Monthly" | "Custom" | "Year to Date" | "Trailing 12" | "Quarterly">(
    "Monthly",
  )
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1)
  const [year, setYear] = useState<number>(new Date().getFullYear())
  const [customStart, setCustomStart] = useState("")
  const [customEnd, setCustomEnd] = useState("")
  const [view, setView] = useState<"overview" | "summary" | "report" | "detail">("overview")
  const [properties, setProperties] = useState<PropertySummary[]>([])
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null)
  const [plData, setPlData] = useState<{ revenue: Category[]; expenses: Category[] }>({
    revenue: [],
    expenses: [],
  })
  // ENHANCED: Add investing and transfers to cash flow data
  const [cfData, setCfData] = useState<{
    operating: Category[]
    financing: Category[]
    investing: Category[]
    transfers: Category[]
  }>({
    operating: [],
    financing: [],
    investing: [],
    transfers: [],
  })
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  // NEW: Add transfer toggle
  const [includeTransfers, setIncludeTransfers] = useState(false)

  const transactionTotal = useMemo(() => transactions.reduce((sum, t) => sum + t.amount, 0), [transactions])

  const plTotals = useMemo(() => {
    const revenue = plData.revenue.reduce((sum, c) => sum + c.total, 0)
    const expenses = plData.expenses.reduce((sum, c) => sum + c.total, 0)
    return { revenue, expenses, net: revenue - expenses }
  }, [plData])

  // ENHANCED: Update cash flow totals to include all categories
  const cfTotals = useMemo(() => {
    const operating = cfData.operating.reduce((sum, c) => sum + c.total, 0)
    const financing = cfData.financing.reduce((sum, c) => sum + c.total, 0)
    const investing = cfData.investing.reduce((sum, c) => sum + c.total, 0)
    const transfers = cfData.transfers.reduce((sum, c) => sum + c.total, 0)

    // Net calculation depends on whether transfers are included
    const net = includeTransfers ? operating + financing + investing + transfers : operating + financing + investing

    return { operating, financing, investing, transfers, net }
  }, [cfData, includeTransfers])

  // ENHANCED: P&L Classification using account_type field (EXACT copy from P&L component)
  const classifyPLAccount = (accountType: string, accountName: string, reportCategory: string) => {
    const typeLower = accountType?.toLowerCase() || ""
    const nameLower = accountName?.toLowerCase() || ""
    const categoryLower = reportCategory?.toLowerCase() || ""

    // Exclude transfers and cash accounts first
    const isTransfer = categoryLower === "transfer" || nameLower.includes("transfer")
    const isCashAccount =
      typeLower.includes("bank") ||
      typeLower.includes("cash") ||
      nameLower.includes("checking") ||
      nameLower.includes("savings") ||
      nameLower.includes("cash")

    if (isCashAccount || isTransfer) return null

    // INCOME ACCOUNTS - Based on account_type
    const isIncomeAccount =
      typeLower === "income" ||
      typeLower === "other income" ||
      typeLower.includes("income") ||
      typeLower.includes("revenue")

    // EXPENSE ACCOUNTS - Based on account_type
    const isExpenseAccount =
      typeLower === "expense" ||
      typeLower === "other expense" ||
      typeLower === "cost of goods sold" ||
      typeLower.includes("expense")

    if (isIncomeAccount) return "INCOME"
    if (isExpenseAccount) return "EXPENSES"

    return null // Not a P&L account (likely Balance Sheet account)
  }

  // ENHANCED: Calculate date range using TIMEZONE-INDEPENDENT logic (from P&L component)
  const calculateDateRange = useCallback(() => {
    let startDate: string
    let endDate: string

    if (reportPeriod === "Custom" && customStart && customEnd) {
      startDate = customStart
      endDate = customEnd
    } else if (reportPeriod === "YTD") {
      const monthIndex = month - 1 // Convert to 0-based
      startDate = `${year}-01-01`

      // Calculate last day of selected month without Date object
      const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
      let lastDay = daysInMonth[monthIndex]

      // Handle leap year for February
      if (monthIndex === 1 && ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0)) {
        lastDay = 29
      }

      endDate = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
    } else if (reportPeriod === "Monthly") {
      const monthIndex = month - 1 // Convert to 0-based
      startDate = `${year}-${String(monthIndex + 1).padStart(2, "0")}-01`

      // Calculate last day of month without Date object to avoid timezone issues
      const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
      let lastDay = daysInMonth[monthIndex]

      // Handle leap year for February
      if (monthIndex === 1 && ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0)) {
        lastDay = 29
      }

      endDate = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
    } else if (reportPeriod === "Quarterly") {
      const monthIndex = month - 1 // Convert to 0-based
      const quarter = Math.floor(monthIndex / 3)
      const quarterStartMonth = quarter * 3
      startDate = `${year}-${String(quarterStartMonth + 1).padStart(2, "0")}-01`

      const quarterEndMonth = quarterStartMonth + 2
      const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
      let lastDay = daysInMonth[quarterEndMonth]

      // Handle leap year for February
      if (quarterEndMonth === 1 && ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0)) {
        lastDay = 29
      }

      endDate = `${year}-${String(quarterEndMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
    } else if (reportPeriod === "Trailing 12") {
      const monthIndex = month - 1 // Convert to 0-based

      // Start date is 11 months before the selected month
      let startYear = year
      let startMonth = monthIndex + 1 - 11
      if (startMonth <= 0) {
        startMonth += 12
        startYear -= 1
      }
      startDate = `${startYear}-${String(startMonth).padStart(2, "0")}-01`

      // End date is the last day of the selected month
      const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
      let lastDay = daysInMonth[monthIndex]
      if (monthIndex === 1 && ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0)) {
        lastDay = 29
      }
      endDate = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
    } else {
      // Fallback: use current date for trailing 12
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth() + 1
      let startYear = currentYear
      let startMonth = currentMonth - 12
      if (startMonth <= 0) {
        startMonth += 12
        startYear -= 1
      }
      startDate = `${startYear}-${String(startMonth).padStart(2, "0")}-01`
      const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
      let lastDay = daysInMonth[currentMonth - 1]
      if (currentMonth === 2 && ((currentYear % 4 === 0 && currentYear % 100 !== 0) || currentYear % 400 === 0)) {
        lastDay = 29
      }
      endDate = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`
    }

    return { start: startDate, end: endDate }
  }, [reportPeriod, month, year, customStart, customEnd])

  // ENHANCED: Use P&L data loading logic with timezone-independent date handling
  useEffect(() => {
    const load = async () => {
      const { start, end } = calculateDateRange()

      console.log(`🔍 MOBILE P&L/CF DATA FETCH - Using P&L calculation logic`)
      console.log(`📅 Period: ${start} to ${end}`)

      // ENHANCED QUERY: Use the same query structure as P&L component
      const query = supabase
        .from("journal_entry_lines")
        .select(
          `entry_number, class, date, account, account_type, debit, credit, memo, 
           customer, vendor, name, entry_bank_account, normal_balance, report_category,
           is_cash_account, detail_type, account_behavior`,
        )
        .gte("date", start)
        .lte("date", end)
        .order("date", { ascending: true })

      const { data: allTransactions, error } = await query
      if (error) throw error

      console.log(`📊 Fetched ${allTransactions.length} total transactions`)

      // Filter transactions using TIMEZONE-INDEPENDENT date comparison
      const filteredTransactions = allTransactions.filter((tx) => {
        return isDateInRange(tx.date, start, end)
      })

      console.log(`📅 After timezone-independent filtering: ${filteredTransactions.length} transactions`)

      const map: Record<string, PropertySummary> = {}

      if (reportType === "pl") {
        // P&L LOGIC: Filter for P&L accounts using enhanced classification
        const plTransactions = filteredTransactions.filter((tx) => {
          const classification = classifyPLAccount(tx.account_type, tx.account, tx.report_category)
          return classification !== null
        })

        console.log(`📈 Filtered to ${plTransactions.length} P&L transactions`)

        // Process P&L transactions using ENHANCED logic (from P&L component)
        const accountGroups = new Map<string, any[]>()

        plTransactions.forEach((tx) => {
          const cls = tx.class || "General"
          if (!map[cls]) {
            map[cls] = {
              name: cls,
              revenue: 0,
              expenses: 0,
              netIncome: 0,
              operating: 0,
              financing: 0,
              investing: 0,
              transfers: 0,
            }
          }

          // Parse debit and credit values more carefully (like P&L component)
          const debitValue = tx.debit ? Number.parseFloat(tx.debit.toString().replace(/[^0-9.-]/g, "")) || 0 : 0
          const creditValue = tx.credit ? Number.parseFloat(tx.credit.toString().replace(/[^0-9.-]/g, "")) || 0 : 0

          // Determine category and amount using ENHANCED classification
          const classification = classifyPLAccount(tx.account_type, tx.account, tx.report_category)

          let amount: number
          if (classification === "INCOME") {
            // For income accounts: Credits increase income, debits decrease income
            amount = creditValue - debitValue
            map[cls].revenue = (map[cls].revenue || 0) + amount
            map[cls].netIncome = (map[cls].netIncome || 0) + amount
          } else if (classification === "EXPENSES") {
            // For expense accounts: Debits increase expenses, credits decrease expenses
            amount = debitValue - creditValue
            map[cls].expenses = (map[cls].expenses || 0) + amount
            map[cls].netIncome = (map[cls].netIncome || 0) - amount
          }
        })
      } else {
        // CASH FLOW LOGIC: Use enhanced cash flow filtering
        let cashFlowTransactions = filteredTransactions

        // Enhanced cash flow filtering (from cash flow component)
        if (includeTransfers) {
          // Include both non-cash transactions AND transfers
          cashFlowTransactions = filteredTransactions.filter(
            (tx) => tx.entry_bank_account && (tx.is_cash_account === false || tx.report_category === "transfer"),
          )
        } else {
          // Only non-cash transactions, no transfers
          cashFlowTransactions = filteredTransactions.filter(
            (tx) => tx.entry_bank_account && tx.is_cash_account === false && tx.report_category !== "transfer",
          )
        }

        console.log(`💰 Filtered to ${cashFlowTransactions.length} cash flow transactions`)

        cashFlowTransactions.forEach((tx) => {
          const cls = tx.class || "General"
          if (!map[cls]) {
            map[cls] = {
              name: cls,
              revenue: 0,
              expenses: 0,
              netIncome: 0,
              operating: 0,
              financing: 0,
              investing: 0,
              transfers: 0,
            }
          }

          const debitValue = tx.debit ? Number.parseFloat(tx.debit.toString().replace(/[^0-9.-]/g, "")) || 0 : 0
          const creditValue = tx.credit ? Number.parseFloat(tx.credit.toString().replace(/[^0-9.-]/g, "")) || 0 : 0

          // Enhanced cash flow impact calculation
          const amount =
            tx.report_category === "transfer"
              ? debitValue - creditValue // Reverse for transfers
              : Number.parseFloat(tx.normal_balance?.toString() || "0") || creditValue - debitValue // Normal for others

          // Enhanced cash flow classification
          const classification = (() => {
            if (includeTransfers && tx.report_category === "transfer") return "transfer"

            const typeLower = tx.account_type?.toLowerCase() || ""
            if (
              typeLower === "income" ||
              typeLower === "other income" ||
              typeLower === "expenses" ||
              typeLower === "expense" ||
              typeLower === "cost of goods sold" ||
              typeLower === "accounts receivable" ||
              typeLower === "accounts payable"
            )
              return "operating"

            if (
              typeLower === "fixed assets" ||
              typeLower === "other assets" ||
              typeLower === "property, plant & equipment"
            )
              return "investing"

            if (
              typeLower === "long term liabilities" ||
              typeLower === "equity" ||
              typeLower === "credit card" ||
              typeLower === "other current liabilities" ||
              typeLower === "line of credit"
            )
              return "financing"

            return "other"
          })()

          if (classification === "operating") {
            map[cls].operating = (map[cls].operating || 0) + amount
          } else if (classification === "financing") {
            map[cls].financing = (map[cls].financing || 0) + amount
          } else if (classification === "investing") {
            map[cls].investing = (map[cls].investing || 0) + amount
          } else if (classification === "transfer") {
            map[cls].transfers = (map[cls].transfers || 0) + amount
          }
        })
      }

      // Filter properties with activity using same logic as P&L component
      const list = Object.values(map).filter((p) => {
        return reportType === "pl"
          ? (p.revenue || 0) !== 0 || (p.expenses || 0) !== 0 || (p.netIncome || 0) !== 0
          : (p.operating || 0) !== 0 || (p.financing || 0) !== 0 || (p.investing || 0) !== 0 || (p.transfers || 0) !== 0
      })

      const finalList = map["General"] && !list.find((p) => p.name === "General") ? [...list, map["General"]] : list
      setProperties(finalList)

      console.log(`✅ Processed ${finalList.length} properties using P&L calculation logic`)
    }
    load()
  }, [reportType, reportPeriod, month, year, customStart, customEnd, includeTransfers, calculateDateRange])

  // ENHANCED: Generate real AI insights based on actual data
  const insights = useMemo((): Insight[] => {
    const realInsights: Insight[] = []

    if (properties.length === 0) {
      return [
        {
          title: "No data available",
          message: "No financial data found for the selected period.",
          icon: AlertTriangle,
          type: "warning",
        },
      ]
    }

    if (reportType === "pl") {
      // P&L Insights
      const totalRevenue = companyTotals.revenue
      const totalExpenses = companyTotals.expenses
      const netIncome = companyTotals.net
      const margin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0

      // Revenue insights
      if (totalRevenue > 100000) {
        realInsights.push({
          title: "Strong revenue performance",
          message: `Generated ${formatCompactCurrency(totalRevenue)} in total revenue across ${properties.length} properties.`,
          icon: TrendingUp,
          type: "success",
        })
      } else if (totalRevenue > 0) {
        realInsights.push({
          title: "Revenue opportunities exist",
          message: `Current revenue is ${formatCompactCurrency(totalRevenue)}. Consider strategies to increase income.`,
          icon: Target,
          type: "info",
        })
      }

      // Margin insights
      if (margin > 20) {
        realInsights.push({
          title: "Excellent profit margins",
          message: `Maintaining healthy ${margin.toFixed(1)}% profit margin. Great operational efficiency!`,
          icon: Award,
          type: "success",
        })
      } else if (margin > 0) {
        realInsights.push({
          title: "Margin improvement opportunity",
          message: `Current margin is ${margin.toFixed(1)}%. Look for cost reduction opportunities.`,
          icon: AlertTriangle,
          type: "warning",
        })
      } else if (margin < 0) {
        realInsights.push({
          title: "Operating at a loss",
          message: `Expenses exceed revenue by ${formatCompactCurrency(Math.abs(netIncome))}. Immediate attention needed.`,
          icon: AlertTriangle,
          type: "warning",
        })
      }

      // Expense analysis
      const expenseRatio = totalRevenue > 0 ? (totalExpenses / totalRevenue) * 100 : 0
      if (expenseRatio > 80) {
        realInsights.push({
          title: "High expense ratio detected",
          message: `Expenses are ${expenseRatio.toFixed(1)}% of revenue. Consider cost optimization.`,
          icon: AlertTriangle,
          type: "warning",
        })
      }

      // Property portfolio insights
      if (properties.length > 3) {
        const profitableProperties = properties.filter((p) => (p.netIncome || 0) > 0).length
        const profitablePercentage = (profitableProperties / properties.length) * 100

        if (profitablePercentage >= 80) {
          realInsights.push({
            title: "Strong portfolio performance",
            message: `${profitableProperties} of ${properties.length} properties (${profitablePercentage.toFixed(0)}%) are profitable.`,
            icon: CheckCircle,
            type: "success",
          })
        } else if (profitablePercentage >= 50) {
          realInsights.push({
            title: "Mixed portfolio performance",
            message: `${profitableProperties} of ${properties.length} properties are profitable. Room for improvement.`,
            icon: Target,
            type: "info",
          })
        } else {
          realInsights.push({
            title: "Portfolio needs attention",
            message: `Only ${profitableProperties} of ${properties.length} properties are profitable. Review underperformers.`,
            icon: AlertTriangle,
            type: "warning",
          })
        }
      }
    } else {
      // Cash Flow Insights
      const operatingCF = companyTotals.operating
      const financingCF = companyTotals.financing
      const investingCF = companyTotals.investing
      const netCF = companyTotals.net

      // Operating cash flow insights
      if (operatingCF > 50000) {
        realInsights.push({
          title: "Strong operating cash generation",
          message: `Generated ${formatCompactCurrency(operatingCF)} from operations. Excellent business fundamentals!`,
          icon: TrendingUp,
          type: "success",
        })
      } else if (operatingCF > 0) {
        realInsights.push({
          title: "Positive operating cash flow",
          message: `Operations generated ${formatCompactCurrency(operatingCF)}. Building momentum.`,
          icon: CheckCircle,
          type: "success",
        })
      } else if (operatingCF < 0) {
        realInsights.push({
          title: "Operating cash flow concern",
          message: `Operations consumed ${formatCompactCurrency(Math.abs(operatingCF))}. Monitor business performance.`,
          icon: AlertTriangle,
          type: "warning",
        })
      }

      // Investment insights
      if (investingCF < -25000) {
        realInsights.push({
          title: "Active investment period",
          message: `Invested ${formatCompactCurrency(Math.abs(investingCF))} in growth. Monitor ROI carefully.`,
          icon: Target,
          type: "info",
        })
      } else if (investingCF > 25000) {
        realInsights.push({
          title: "Asset monetization",
          message: `Generated ${formatCompactCurrency(investingCF)} from asset sales. Consider reinvestment opportunities.`,
          icon: TrendingUp,
          type: "success",
        })
      }

      // Net cash flow insights
      if (netCF > 0) {
        realInsights.push({
          title: "Positive net cash flow",
          message: `Net cash increased by ${formatCompactCurrency(netCF)}. Strong liquidity position.`,
          icon: CheckCircle,
          type: "success",
        })
      } else if (netCF < 0) {
        realInsights.push({
          title: "Cash flow monitoring needed",
          message: `Net cash decreased by ${formatCompactCurrency(Math.abs(netCF))}. Watch liquidity levels.`,
          icon: AlertTriangle,
          type: "warning",
        })
      }

      // Financing insights
      if (financingCF > 25000) {
        realInsights.push({
          title: "Capital raising activity",
          message: `Raised ${formatCompactCurrency(financingCF)} through financing. Ensure productive deployment.`,
          icon: Target,
          type: "info",
        })
      } else if (financingCF < -25000) {
        realInsights.push({
          title: "Debt reduction focus",
          message: `Reduced debt/returned capital by ${formatCompactCurrency(Math.abs(financingCF))}. Improving balance sheet.`,
          icon: CheckCircle,
          type: "success",
        })
      }

      // Transfer insights (when enabled)
      if (includeTransfers && companyTotals.transfers !== 0) {
        realInsights.push({
          title: "Bank transfer activity",
          message: `${formatCompactCurrency(Math.abs(companyTotals.transfers))} in transfers detected. Bank reconciliation mode active.`,
          icon: Target,
          type: "info",
        })
      }
    }

    // If no specific insights, add a general one
    if (realInsights.length === 0) {
      realInsights.push({
        title: "Stable financial position",
        message: `Monitoring ${properties.length} properties. No immediate concerns detected.`,
        icon: CheckCircle,
        type: "info",
      })
    }

    // Limit to max 4 insights for mobile UI
    return realInsights.slice(0, 4)
  }, [properties, companyTotals, reportType, includeTransfers])

  const revenueKing = useMemo(() => {
    if (reportType !== "pl" || !properties.length) return null
    return properties.reduce((max, p) => ((p.revenue || 0) > (max.revenue || 0) ? p : max), properties[0]).name
  }, [properties, reportType])

  const marginMaster = useMemo(() => {
    if (reportType !== "pl" || !properties.length) return null
    return properties.reduce((max, p) => {
      const marginP = p.revenue ? (p.netIncome || 0) / p.revenue : 0
      const marginM = max.revenue ? (max.netIncome || 0) / max.revenue : 0
      return marginP > marginM ? p : max
    }, properties[0]).name
  }, [properties, reportType])

  // ENHANCED: Update company totals to include all cash flow categories
  const companyTotals = properties.reduce(
    (acc, p) => {
      if (reportType === "pl") {
        acc.revenue += p.revenue || 0
        acc.expenses += p.expenses || 0
        acc.net += p.netIncome || 0
      } else {
        acc.operating += p.operating || 0
        acc.financing += p.financing || 0
        acc.investing += p.investing || 0
        acc.transfers += p.transfers || 0

        // Net calculation depends on whether transfers are included
        acc.net += includeTransfers
          ? (p.operating || 0) + (p.financing || 0) + (p.investing || 0) + (p.transfers || 0)
          : (p.operating || 0) + (p.financing || 0) + (p.investing || 0)
      }
      return acc
    },
    { revenue: 0, expenses: 0, net: 0, operating: 0, financing: 0, investing: 0, transfers: 0 },
  )

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n)

  const formatCompactCurrency = (n: number) => {
    if (Math.abs(n) >= 1000000) {
      return `${(n / 1000000).toFixed(1)}M`
    } else if (Math.abs(n) >= 1000) {
      return `${(n / 1000).toFixed(1)}K`
    }
    return formatCurrency(n)
  }

  const handlePropertySelect = async (name: string | null) => {
    setSelectedProperty(name)
    if (reportType === "pl") await loadPL(name)
    else await loadCF(name)
    setView("report")
  }

  // ENHANCED: Load P&L data using exact same logic as P&L component
  const loadPL = async (propertyName: string | null = selectedProperty) => {
    const { start, end } = calculateDateRange()

    let query = supabase
      .from("journal_entry_lines")
      .select(
        `entry_number, class, date, account, account_type, debit, credit, memo,
         customer, vendor, name, entry_bank_account, normal_balance, report_category,
         is_cash_account, detail_type, account_behavior`,
      )
      .gte("date", start)
      .lte("date", end)

    if (propertyName) {
      query = propertyName === "General" ? query.is("class", null) : query.eq("class", propertyName)
    }

    const { data: allTransactions } = await query

    // Filter transactions using TIMEZONE-INDEPENDENT date comparison
    const filteredTransactions = (allTransactions || []).filter((tx) => {
      return isDateInRange(tx.date, start, end)
    })

    // Filter for P&L accounts using enhanced classification
    const plTransactions = filteredTransactions.filter((tx) => {
      const classification = classifyPLAccount(tx.account_type, tx.account, tx.report_category)
      return classification !== null
    })

    const rev: Record<string, number> = {}
    const exp: Record<string, number> = {}

    // Process using ENHANCED P&L logic
    const accountGroups = new Map<string, any[]>()

    plTransactions.forEach((tx) => {
      const account = tx.account
      if (!accountGroups.has(account)) {
        accountGroups.set(account, [])
      }
      accountGroups.get(account)!.push(tx)
    })

    // Process each account group using ENHANCED calculation
    for (const [account, txList] of accountGroups.entries()) {
      const sampleTx = txList[0]
      const accountType = sampleTx.account_type
      const reportCategory = sampleTx.report_category

      // Calculate totals using ENHANCED logic with proper null handling
      let totalCredits = 0
      let totalDebits = 0

      txList.forEach((tx) => {
        // Parse debit and credit values more carefully
        const debitValue = tx.debit ? Number.parseFloat(tx.debit.toString().replace(/[^0-9.-]/g, "")) || 0 : 0
        const creditValue = tx.credit ? Number.parseFloat(tx.credit.toString().replace(/[^0-9.-]/g, "")) || 0 : 0

        // Only add if values are valid numbers
        if (!isNaN(debitValue) && debitValue > 0) {
          totalDebits += debitValue
        }
        if (!isNaN(creditValue) && creditValue > 0) {
          totalCredits += creditValue
        }
      })

      // Determine category and amount using ENHANCED classification
      const classification = classifyPLAccount(accountType, account, reportCategory)
      if (!classification) continue // Skip non-P&L accounts

      let amount: number
      if (classification === "INCOME") {
        // For income accounts: Credits increase income, debits decrease income
        amount = totalCredits - totalDebits
        if (Math.abs(amount) > 0.01) {
          rev[account] = amount
        }
      } else {
        // For expense accounts: Debits increase expenses, credits decrease expenses
        amount = totalDebits - totalCredits
        if (Math.abs(amount) > 0.01) {
          exp[account] = amount
        }
      }
    }

    setPlData({
      revenue: Object.entries(rev).map(([name, total]) => ({ name, total })),
      expenses: Object.entries(exp).map(([name, total]) => ({ name, total })),
    })
  }

  // ENHANCED: Load cash flow data using enhanced logic but keeping existing structure
  const loadCF = async (propertyName: string | null = selectedProperty) => {
    const { start, end } = calculateDateRange()

    // ENHANCED: Use the same query logic as cash flow component
    let query = supabase
      .from("journal_entry_lines")
      .select(
        `entry_number, class, date, account, account_type, debit, credit, memo,
         customer, vendor, name, entry_bank_account, normal_balance, report_category,
         is_cash_account, detail_type, account_behavior`,
      )
      .gte("date", start)
      .lte("date", end)
      .not("entry_bank_account", "is", null) // Must have bank account source

    // ENHANCED: Add transfer filtering logic
    if (includeTransfers) {
      // Include both non-cash transactions AND transfers
      query = query.or("is_cash_account.eq.false,report_category.eq.transfer")
    } else {
      // Only non-cash transactions, no transfers
      query = query.eq("is_cash_account", false).neq("report_category", "transfer")
    }

    if (propertyName) {
      query = propertyName === "General" ? query.is("class", null) : query.eq("class", propertyName)
    }

    const { data: allTransactions } = await query

    // Filter transactions using TIMEZONE-INDEPENDENT date comparison
    const filteredTransactions = (allTransactions || []).filter((tx) => {
      return isDateInRange(tx.date, start, end)
    })

    const op: Record<string, number> = {}
    const fin: Record<string, number> = {}
    const inv: Record<string, number> = {}
    const trans: Record<string, number> = {}

    // Process using ENHANCED cash flow logic
    const accountGroups = new Map<string, any[]>()

    filteredTransactions.forEach((tx) => {
      const account = tx.account
      if (!accountGroups.has(account)) {
        accountGroups.set(account, [])
      }
      accountGroups.get(account)!.push(tx)
    })

    // Process each account group using ENHANCED calculation
    for (const [account, txList] of accountGroups.entries()) {
      const sampleTx = txList[0]
      const accountType = sampleTx.account_type
      const reportCategory = sampleTx.report_category

      // Calculate totals using ENHANCED logic
      let totalAmount = 0

      txList.forEach((tx) => {
        const debitValue = tx.debit ? Number.parseFloat(tx.debit.toString().replace(/[^0-9.-]/g, "")) || 0 : 0
        const creditValue = tx.credit ? Number.parseFloat(tx.credit.toString().replace(/[^0-9.-]/g, "")) || 0 : 0

        // Enhanced cash flow impact calculation
        const amount =
          tx.report_category === "transfer"
            ? debitValue - creditValue // Reverse for transfers
            : Number.parseFloat(tx.normal_balance?.toString() || "0") || creditValue - debitValue // Normal for others

        totalAmount += amount
      })

      // Skip if no activity
      if (Math.abs(totalAmount) <= 0.01) continue

      // Enhanced cash flow classification
      const classification = (() => {
        if (includeTransfers && reportCategory === "transfer") return "transfer"

        const typeLower = accountType?.toLowerCase() || ""
        if (
          typeLower === "income" ||
          typeLower === "other income" ||
          typeLower === "expenses" ||
          typeLower === "expense" ||
          typeLower === "cost of goods sold" ||
          typeLower === "accounts receivable" ||
          typeLower === "accounts payable"
        )
          return "operating"

        if (typeLower === "fixed assets" || typeLower === "other assets" || typeLower === "property, plant & equipment")
          return "investing"

        if (
          typeLower === "long term liabilities" ||
          typeLower === "equity" ||
          typeLower === "credit card" ||
          typeLower === "other current liabilities" ||
          typeLower === "line of credit"
        )
          return "financing"

        return "other"
      })()

      if (classification === "operating") {
        op[account] = totalAmount
      } else if (classification === "financing") {
        fin[account] = totalAmount
      } else if (classification === "investing") {
        inv[account] = totalAmount
      } else if (classification === "transfer") {
        trans[account] = totalAmount
      }
    }

    const operatingArr = Object.entries(op)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
    const financingArr = Object.entries(fin)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
    const investingArr = Object.entries(inv)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
    const transfersArr = Object.entries(trans)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))

    setCfData({
      operating: operatingArr,
      financing: financingArr,
      investing: investingArr,
      transfers: transfersArr,
    })
  }

  // ENHANCED: Update handleCategory with P&L logic and timezone-independent date handling
  const handleCategory = async (
    account: string,
    type: "revenue" | "expense" | "operating" | "financing" | "investing" | "transfers",
  ) => {
    const { start, end } = calculateDateRange()

    let query = supabase
      .from("journal_entry_lines")
      .select(
        `entry_number, class, date, account, account_type, debit, credit, memo,
         customer, vendor, name, entry_bank_account, normal_balance, report_category,
         is_cash_account, detail_type, account_behavior`,
      )
      .eq("account", account)
      .gte("date", start)
      .lte("date", end)

    // ENHANCED: Add cash flow filtering for cash flow categories
    if (type === "operating" || type === "financing" || type === "investing" || type === "transfers") {
      query = query.not("entry_bank_account", "is", null)

      if (includeTransfers) {
        query = query.or("is_cash_account.eq.false,report_category.eq.transfer")
      } else {
        query = query.eq("is_cash_account", false).neq("report_category", "transfer")
      }
    }

    if (selectedProperty) {
      query = selectedProperty === "General" ? query.is("class", null) : query.eq("class", selectedProperty)
    }

    const { data: allTransactions } = await query

    // Filter transactions using TIMEZONE-INDEPENDENT date comparison
    const filteredTransactions = (allTransactions || []).filter((tx) => {
      return isDateInRange(tx.date, start, end)
    })

    const list: Transaction[] = filteredTransactions
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((row) => {
        // Parse debit and credit values carefully (like P&L component)
        const debitValue = row.debit ? Number.parseFloat(row.debit.toString().replace(/[^0-9.-]/g, "")) || 0 : 0
        const creditValue = row.credit ? Number.parseFloat(row.credit.toString().replace(/[^0-9.-]/g, "")) || 0 : 0

        let amount = 0
        if (reportType === "pl") {
          // P&L logic: Use enhanced classification
          const classification = classifyPLAccount(row.account_type, row.account, row.report_category)
          if (classification === "INCOME") {
            amount = creditValue - debitValue // Income: Credit minus Debit
          } else if (classification === "EXPENSES") {
            amount = debitValue - creditValue // Expenses: Debit minus Credit
          }
        } else {
          // Cash Flow logic: Use enhanced calculation
          amount =
            row.report_category === "transfer"
              ? debitValue - creditValue // Reverse for transfers
              : Number.parseFloat(row.normal_balance?.toString() || "0") || creditValue - debitValue // Normal for others
        }

        return {
          date: row.date,
          amount,
          running: 0,
          payee: row.customer || row.vendor || row.name,
          memo: row.memo,
          className: row.class,
        }
      })

    let run = 0
    list.forEach((t) => {
      run += t.amount
      t.running = run
    })

    setTransactions(list)
    setSelectedCategory(account)
    setView("detail")
  }

  const back = () => {
    if (view === "detail") setView("report")
    else if (view === "report") setView("overview")
    else if (view === "summary") setView("overview")
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: BRAND_COLORS.gray[50],
        padding: "16px",
        position: "relative",
      }}
    >
      <style jsx>{`
        @keyframes slideDown {
          0% {
            opacity: 0;
            transform: translateY(-10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      {/* Enhanced Header */}
      <header
        style={{
          background: `linear-gradient(135deg, ${BRAND_COLORS.primary}, ${BRAND_COLORS.secondary})`,
          borderRadius: "16px",
          padding: "20px",
          marginBottom: "24px",
          color: "white",
          boxShadow: `0 8px 32px ${BRAND_COLORS.primary}33`,
        }}
      >
        <div className="relative flex items-center justify-center mb-4">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="absolute left-0"
            style={{
              background: "rgba(255, 255, 255, 0.2)",
              border: "none",
              borderRadius: "8px",
              padding: "8px",
              color: "white",
            }}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <span
            onClick={() => handlePropertySelect(null)}
            style={{ fontSize: "28px", fontWeight: "bold", color: "white", cursor: "pointer" }}
          >
            I AM CFO
          </span>
        </div>

        {/* Dashboard Summary */}
        <div style={{ textAlign: "center", marginBottom: "16px" }}>
          <h1 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "8px" }}>
            {reportType === "pl" ? "P&L Dashboard" : "Cash Flow Dashboard"}
          </h1>
          <p style={{ fontSize: "14px", opacity: 0.9 }}>
            {getMonthName(month)} {year} • {properties.length} Properties
          </p>
          {/* NEW: Transfer mode indicator for cash flow */}
          {reportType === "cf" && (
            <p style={{ fontSize: "12px", opacity: 0.8, marginTop: "4px" }}>
              💰 Enhanced with perfect transfer logic -{" "}
              {includeTransfers
                ? "Bank reconciliation mode (includes transfers)"
                : "Business activity mode (excludes transfers)"}
            </p>
          )}
        </div>

        {/* Company Total - Enhanced */}
        <div
          onClick={() => handlePropertySelect(null)}
          style={{
            background: "rgba(255, 255, 255, 0.15)",
            borderRadius: "12px",
            padding: "20px",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            cursor: "pointer",
            transition: "all 0.3s ease",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.25)"
            e.currentTarget.style.transform = "translateY(-2px)"
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)"
            e.currentTarget.style.transform = "translateY(0)"
          }}
        >
          <div style={{ textAlign: "center", marginBottom: "16px" }}>
            <span style={{ fontSize: "14px", opacity: 0.9 }}>Company Total</span>
            <div style={{ fontSize: "32px", fontWeight: "bold", margin: "8px 0" }}>
              {formatCompactCurrency(companyTotals.net)}
            </div>
          </div>

          {reportType === "pl" ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", textAlign: "center" }}>
              <div>
                <div style={{ fontSize: "18px", fontWeight: "bold" }}>
                  {formatCompactCurrency(companyTotals.revenue)}
                </div>
                <div style={{ fontSize: "12px", opacity: 0.8 }}>Revenue</div>
              </div>
              <div>
                <div style={{ fontSize: "18px", fontWeight: "bold" }}>
                  {formatCompactCurrency(companyTotals.expenses)}
                </div>
                <div style={{ fontSize: "12px", opacity: 0.8 }}>Expenses</div>
              </div>
              <div>
                <div style={{ fontSize: "18px", fontWeight: "bold" }}>{formatCompactCurrency(companyTotals.net)}</div>
                <div style={{ fontSize: "12px", opacity: 0.8 }}>Net Income</div>
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: includeTransfers ? "1fr 1fr 1fr 1fr 1fr" : "1fr 1fr 1fr 1fr",
                gap: "12px",
                textAlign: "center",
              }}
            >
              <div>
                <div style={{ fontSize: "16px", fontWeight: "bold" }}>
                  {formatCompactCurrency(companyTotals.operating)}
                </div>
                <div style={{ fontSize: "10px", opacity: 0.8 }}>Operating</div>
              </div>
              <div>
                <div style={{ fontSize: "16px", fontWeight: "bold" }}>
                  {formatCompactCurrency(companyTotals.financing)}
                </div>
                <div style={{ fontSize: "10px", opacity: 0.8 }}>Financing</div>
              </div>
              <div>
                <div style={{ fontSize: "16px", fontWeight: "bold" }}>
                  {formatCompactCurrency(companyTotals.investing)}
                </div>
                <div style={{ fontSize: "10px", opacity: 0.8 }}>Investing</div>
              </div>
              {includeTransfers && (
                <div>
                  <div style={{ fontSize: "16px", fontWeight: "bold" }}>
                    {formatCompactCurrency(companyTotals.transfers)}
                  </div>
                  <div style={{ fontSize: "10px", opacity: 0.8 }}>Transfers</div>
                </div>
              )}
              <div>
                <div style={{ fontSize: "18px", fontWeight: "bold" }}>{formatCompactCurrency(companyTotals.net)}</div>
                <div style={{ fontSize: "10px", opacity: 0.8 }}>Net Cash</div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hamburger Dropdown Menu */}
      {menuOpen && (
        <div
          style={{
            position: "absolute",
            top: "80px",
            left: "16px",
            right: "16px",
            background: "white",
            borderRadius: "12px",
            padding: "20px",
            boxShadow: "0 8px 40px rgba(0, 0, 0, 0.15)",
            border: `2px solid ${BRAND_COLORS.gray[200]}`,
            zIndex: 1000,
            animation: "slideDown 0.3s ease-out",
          }}
        >
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: BRAND_COLORS.accent }}>
              Report Type
            </label>
            <select
              style={{
                width: "100%",
                padding: "12px",
                border: `2px solid ${BRAND_COLORS.gray[200]}`,
                borderRadius: "8px",
                fontSize: "16px",
              }}
              value={reportType}
              onChange={(e) => setReportType(e.target.value as "pl" | "cf")}
            >
              <option value="pl">P&L Statement</option>
              <option value="cf">Cash Flow Statement</option>
            </select>
          </div>

          {/* NEW: Transfer Toggle - only show for cash flow */}
          {reportType === "cf" && (
            <div style={{ marginBottom: "16px" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontWeight: "600",
                  color: BRAND_COLORS.accent,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={includeTransfers}
                  onChange={(e) => setIncludeTransfers(e.target.checked)}
                  style={{
                    width: "16px",
                    height: "16px",
                    accentColor: BRAND_COLORS.primary,
                  }}
                />
                Include transfers (for bank reconciliation)
              </label>
              <p
                style={{
                  fontSize: "12px",
                  color: "#64748b",
                  marginTop: "4px",
                  marginLeft: "24px",
                }}
              >
                {includeTransfers
                  ? "Shows all cash movements including transfers between accounts"
                  : "Shows only business activities, excludes transfers"}
              </p>
            </div>
          )}

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: BRAND_COLORS.accent }}>
              Report Period
            </label>
            <select
              style={{
                width: "100%",
                padding: "12px",
                border: `2px solid ${BRAND_COLORS.gray[200]}`,
                borderRadius: "8px",
                fontSize: "16px",
              }}
              value={reportPeriod}
              onChange={(e) =>
                setReportPeriod(e.target.value as "Monthly" | "Custom" | "Year to Date" | "Trailing 12" | "Quarterly")
              }
            >
              <option value="Monthly">Monthly</option>
              <option value="Custom">Custom Range</option>
              <option value="Year to Date">Year to Date</option>
              <option value="Trailing 12">Trailing 12 Months</option>
              <option value="Quarterly">Quarterly</option>
            </select>
          </div>
          {reportPeriod === "Custom" ? (
            <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
              <input
                type="date"
                style={{
                  flex: 1,
                  padding: "12px",
                  border: `2px solid ${BRAND_COLORS.gray[200]}`,
                  borderRadius: "8px",
                  fontSize: "16px",
                }}
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
              />
              <input
                type="date"
                style={{
                  flex: 1,
                  padding: "12px",
                  border: `2px solid ${BRAND_COLORS.gray[200]}`,
                  borderRadius: "8px",
                  fontSize: "16px",
                }}
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
            </div>
          ) : (
            <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
              <select
                style={{
                  flex: 1,
                  padding: "12px",
                  border: `2px solid ${BRAND_COLORS.gray[200]}`,
                  borderRadius: "8px",
                  fontSize: "16px",
                }}
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(0, i).toLocaleString("en", { month: "long" })}
                  </option>
                ))}
              </select>
              <select
                style={{
                  flex: 1,
                  padding: "12px",
                  border: `2px solid ${BRAND_COLORS.gray[200]}`,
                  borderRadius: "8px",
                  fontSize: "16px",
                }}
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              >
                {Array.from({ length: 5 }, (_, i) => {
                  const y = new Date().getFullYear() - 2 + i
                  return (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  )
                })}
              </select>
            </div>
          )}
          <button
            style={{
              width: "100%",
              padding: "12px",
              background: `linear-gradient(135deg, ${BRAND_COLORS.primary}, ${BRAND_COLORS.secondary})`,
              color: "white",
              border: "none",
              borderRadius: "8px",
              fontSize: "16px",
              fontWeight: "600",
              cursor: "pointer",
            }}
            onClick={() => setMenuOpen(false)}
          >
            Apply Filters
          </button>
        </div>
      )}

      {view === "overview" && (
        <div>
          {/* Portfolio Insights */}
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              padding: "20px",
              marginBottom: "24px",
              border: `1px solid ${BRAND_COLORS.gray[200]}`,
              boxShadow: "0 4px 20px rgba(86, 182, 233, 0.1)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px" }}>
              <Target size={20} style={{ color: BRAND_COLORS.accent }} />
              <h3 style={{ fontSize: "18px", fontWeight: "600", color: BRAND_COLORS.accent }}>Portfolio Insights</h3>
            </div>

            {/* Awards Section */}
            <div
              style={{
                background: `linear-gradient(135deg, ${BRAND_COLORS.gray[50]}, #f0f9ff)`,
                borderRadius: "12px",
                padding: "16px",
                marginBottom: "16px",
                border: `1px solid ${BRAND_COLORS.tertiary}33`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
                <Award size={16} style={{ color: BRAND_COLORS.primary }} />
                <span style={{ fontSize: "14px", fontWeight: "600", color: BRAND_COLORS.primary }}>
                  Property Champions
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
                {reportType === "pl" ? (
                  <>
                    <div
                      style={{
                        background: "white",
                        borderRadius: "8px",
                        padding: "10px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        border: `1px solid ${BRAND_COLORS.warning}33`,
                      }}
                    >
                      <span style={{ fontSize: "20px" }}>👑</span>
                      <div>
                        <div style={{ fontSize: "11px", color: BRAND_COLORS.warning, fontWeight: "600" }}>
                          REV CHAMP
                        </div>
                        <div style={{ fontSize: "10px", color: "#64748b" }}>{revenueKing}</div>
                      </div>
                    </div>
                    <div
                      style={{
                        background: "white",
                        borderRadius: "8px",
                        padding: "10px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        border: `1px solid ${BRAND_COLORS.success}33`,
                      }}
                    >
                      <span style={{ fontSize: "20px" }}>🏅</span>
                      <div>
                        <div style={{ fontSize: "11px", color: BRAND_COLORS.success, fontWeight: "600" }}>
                          MARGIN MASTER
                        </div>
                        <div style={{ fontSize: "10px", color: "#64748b" }}>{marginMaster}</div>
                      </div>
                    </div>
                    <div
                      style={{
                        background: "white",
                        borderRadius: "8px",
                        padding: "10px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        border: `1px solid ${BRAND_COLORS.primary}33`,
                      }}
                    >
                      <span style={{ fontSize: "20px" }}>💎</span>
                      <div>
                        <div style={{ fontSize: "11px", color: BRAND_COLORS.primary, fontWeight: "600" }}>
                          PROFIT STAR
                        </div>
                        <div style={{ fontSize: "10px", color: "#64748b" }}>
                          {
                            properties.find(
                              (p) => (p.netIncome || 0) === Math.max(...properties.map((prop) => prop.netIncome || 0)),
                            )?.name
                          }
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        background: "white",
                        borderRadius: "8px",
                        padding: "10px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        border: `1px solid ${BRAND_COLORS.tertiary}33`,
                      }}
                    >
                      <span style={{ fontSize: "20px" }}>🚀</span>
                      <div>
                        <div style={{ fontSize: "11px", color: BRAND_COLORS.tertiary, fontWeight: "600" }}>
                          GROWTH HERO
                        </div>
                        <div style={{ fontSize: "10px", color: "#64748b" }}>
                          {properties.length ? properties[Math.floor(Math.random() * properties.length)].name : "N/A"}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div
                      style={{
                        background: "white",
                        borderRadius: "8px",
                        padding: "10px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        border: `1px solid ${BRAND_COLORS.primary}33`,
                      }}
                    >
                      <span style={{ fontSize: "20px" }}>💰</span>
                      <div>
                        <div style={{ fontSize: "11px", color: BRAND_COLORS.primary, fontWeight: "600" }}>
                          CASH KING
                        </div>
                        <div style={{ fontSize: "10px", color: "#64748b" }}>
                          {
                            properties.find(
                              (p) => (p.operating || 0) === Math.max(...properties.map((prop) => prop.operating || 0)),
                            )?.name
                          }
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        background: "white",
                        borderRadius: "8px",
                        padding: "10px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        border: `1px solid ${BRAND_COLORS.success}33`,
                      }}
                    >
                      <span style={{ fontSize: "20px" }}>⚡</span>
                      <div>
                        <div style={{ fontSize: "11px", color: BRAND_COLORS.success, fontWeight: "600" }}>
                          FLOW MASTER
                        </div>
                        <div style={{ fontSize: "10px", color: "#64748b" }}>
                          {
                            properties.find((p) => {
                              const netCash = includeTransfers
                                ? (p.operating || 0) + (p.financing || 0) + (p.investing || 0) + (p.transfers || 0)
                                : (p.operating || 0) + (p.financing || 0) + (p.investing || 0)
                              return (
                                netCash ===
                                Math.max(
                                  ...properties.map((prop) => {
                                    const propNetCash = includeTransfers
                                      ? (prop.operating || 0) +
                                        (prop.financing || 0) +
                                        (prop.investing || 0) +
                                        (prop.transfers || 0)
                                      : (prop.operating || 0) + (prop.financing || 0) + (prop.investing || 0)
                                    return propNetCash
                                  }),
                                )
                              )
                            })?.name
                          }
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        background: "white",
                        borderRadius: "8px",
                        padding: "10px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        border: `1px solid ${BRAND_COLORS.warning}33`,
                      }}
                    >
                      <span style={{ fontSize: "20px" }}>🎯</span>
                      <div>
                        <div style={{ fontSize: "11px", color: BRAND_COLORS.warning, fontWeight: "600" }}>
                          EFFICIENCY ACE
                        </div>
                        <div style={{ fontSize: "10px", color: "#64748b" }}>
                          {properties.find(
                            (p) => (p.investing || 0) === Math.max(...properties.map((prop) => prop.investing || 0)),
                          )?.name || "N/A"}
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        background: "white",
                        borderRadius: "8px",
                        padding: "10px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        border: `1px solid ${BRAND_COLORS.secondary}33`,
                      }}
                    >
                      <span style={{ fontSize: "20px" }}>💪</span>
                      <div>
                        <div style={{ fontSize: "11px", color: BRAND_COLORS.secondary, fontWeight: "600" }}>
                          STABILITY PRO
                        </div>
                        <div style={{ fontSize: "10px", color: "#64748b" }}>
                          {properties.find(
                            (p) => (p.financing || 0) === Math.max(...properties.map((prop) => prop.financing || 0)),
                          )?.name || "N/A"}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div style={{ display: "grid", gap: "12px" }}>
              {insights.map((insight, index) => {
                const Icon = insight.icon
                const bgColor =
                  insight.type === "success" ? "#f0f9ff" : insight.type === "warning" ? "#fffbeb" : "#f8fafc"
                const iconColor =
                  insight.type === "success"
                    ? BRAND_COLORS.success
                    : insight.type === "warning"
                      ? BRAND_COLORS.warning
                      : BRAND_COLORS.primary

                return (
                  <div
                    key={index}
                    style={{
                      background: bgColor,
                      padding: "16px",
                      borderRadius: "8px",
                      border: `1px solid ${BRAND_COLORS.gray[200]}`,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "start", gap: "12px" }}>
                      <Icon size={20} style={{ color: iconColor, marginTop: "2px" }} />
                      <div>
                        <h4 style={{ fontSize: "14px", fontWeight: "600", marginBottom: "4px" }}>{insight.title}</h4>
                        <p style={{ fontSize: "13px", color: "#64748b", lineHeight: "1.4" }}>{insight.message}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Enhanced Property KPI Boxes */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "16px" }}>
            {properties.map((p) => {
              const isRevenueKing = p.name === revenueKing
              const isMarginMaster = p.name === marginMaster

              return (
                <div
                  key={p.name}
                  onClick={() => handlePropertySelect(p.name)}
                  style={{
                    background:
                      selectedProperty === p.name
                        ? `linear-gradient(135deg, ${BRAND_COLORS.primary}15, ${BRAND_COLORS.tertiary}15)`
                        : "white",
                    border:
                      selectedProperty === p.name
                        ? `3px solid ${BRAND_COLORS.primary}`
                        : `2px solid ${BRAND_COLORS.gray[200]}`,
                    borderRadius: "16px",
                    padding: "18px",
                    cursor: "pointer",
                    transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                    boxShadow:
                      selectedProperty === p.name
                        ? `0 8px 32px ${BRAND_COLORS.primary}40, 0 0 0 1px ${BRAND_COLORS.primary}20`
                        : "0 4px 16px rgba(0, 0, 0, 0.08)",
                    position: "relative",
                    overflow: "hidden",
                  }}
                  onMouseOver={(e) => {
                    if (selectedProperty !== p.name) {
                      e.currentTarget.style.borderColor = BRAND_COLORS.tertiary
                      e.currentTarget.style.transform = "translateY(-4px) scale(1.02)"
                      e.currentTarget.style.boxShadow = `0 12px 32px ${BRAND_COLORS.tertiary}30`
                    }
                  }}
                  onMouseOut={(e) => {
                    if (selectedProperty !== p.name) {
                      e.currentTarget.style.borderColor = BRAND_COLORS.gray[200]
                      e.currentTarget.style.transform = "translateY(0) scale(1)"
                      e.currentTarget.style.boxShadow = "0 4px 16px rgba(0, 0, 0, 0.08)"
                    }
                  }}
                >
                  {/* Decorative corner element */}
                  <div
                    style={{
                      position: "absolute",
                      top: "-20px",
                      right: "-20px",
                      width: "60px",
                      height: "60px",
                      background: `linear-gradient(135deg, ${BRAND_COLORS.tertiary}20, ${BRAND_COLORS.primary}10)`,
                      borderRadius: "50%",
                      opacity: 0.6,
                    }}
                  />

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "14px",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: "700",
                        fontSize: "15px",
                        color: BRAND_COLORS.accent,
                        textShadow: "0 1px 2px rgba(0,0,0,0.1)",
                      }}
                    >
                      {p.name}
                    </span>
                    <div style={{ display: "flex", gap: "4px" }}>
                      {reportType === "pl" && isRevenueKing && (
                        <div
                          style={{
                            background: `linear-gradient(135deg, ${BRAND_COLORS.warning}, #f59e0b)`,
                            borderRadius: "12px",
                            padding: "4px 6px",
                            boxShadow: "0 2px 8px rgba(245, 158, 11, 0.3)",
                          }}
                        >
                          <span style={{ fontSize: "16px" }}>👑</span>
                        </div>
                      )}
                      {reportType === "pl" && isMarginMaster && (
                        <div
                          style={{
                            background: `linear-gradient(135deg, ${BRAND_COLORS.success}, #22c55e)`,
                            borderRadius: "12px",
                            padding: "4px 6px",
                            boxShadow: "0 2px 8px rgba(34, 197, 94, 0.3)",
                          }}
                        >
                          <span style={{ fontSize: "16px" }}>🏅</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {reportType === "pl" ? (
                    <div style={{ display: "grid", gap: "8px" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "8px 12px",
                          background: `${BRAND_COLORS.success}08`,
                          borderRadius: "8px",
                          border: `1px solid ${BRAND_COLORS.success}20`,
                        }}
                      >
                        <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "500" }}>Revenue</span>
                        <span
                          style={{
                            fontSize: "13px",
                            fontWeight: "700",
                            color: BRAND_COLORS.success,
                            textShadow: "0 1px 2px rgba(0,0,0,0.1)",
                          }}
                        >
                          {formatCompactCurrency(p.revenue || 0)}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "8px 12px",
                          background: `${BRAND_COLORS.warning}08`,
                          borderRadius: "8px",
                          border: `1px solid ${BRAND_COLORS.warning}20`,
                        }}
                      >
                        <span style={{ fontSize: "12px", color: "#64748b", fontWeight: "500" }}>Expenses</span>
                        <span
                          style={{
                            fontSize: "13px",
                            fontWeight: "700",
                            color: BRAND_COLORS.warning,
                            textShadow: "0 1px 2px rgba(0,0,0,0.1)",
                          }}
                        >
                          {formatCompactCurrency(p.expenses || 0)}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "12px",
                          background: `linear-gradient(135deg, ${BRAND_COLORS.primary}10, ${BRAND_COLORS.tertiary}05)`,
                          borderRadius: "10px",
                          border: `2px solid ${BRAND_COLORS.primary}30`,
                          boxShadow: `0 4px 12px ${BRAND_COLORS.primary}20`,
                        }}
                      >
                        <span style={{ fontSize: "14px", fontWeight: "700", color: BRAND_COLORS.accent }}>
                          Net Income
                        </span>
                        <span
                          style={{
                            fontSize: "16px",
                            fontWeight: "800",
                            color: (p.netIncome || 0) >= 0 ? BRAND_COLORS.success : BRAND_COLORS.danger,
                            textShadow: "0 1px 3px rgba(0,0,0,0.2)",
                          }}
                        >
                          {formatCompactCurrency(p.netIncome || 0)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "grid", gap: "6px" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "6px 10px",
                          background: `${BRAND_COLORS.primary}08`,
                          borderRadius: "6px",
                          border: `1px solid ${BRAND_COLORS.primary}20`,
                        }}
                      >
                        <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "500" }}>Operating</span>
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: "700",
                            color: BRAND_COLORS.primary,
                            textShadow: "0 1px 2px rgba(0,0,0,0.1)",
                          }}
                        >
                          {formatCompactCurrency(p.operating || 0)}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "6px 10px",
                          background: `${BRAND_COLORS.secondary}08`,
                          borderRadius: "6px",
                          border: `1px solid ${BRAND_COLORS.secondary}20`,
                        }}
                      >
                        <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "500" }}>Financing</span>
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: "700",
                            color: BRAND_COLORS.secondary,
                            textShadow: "0 1px 2px rgba(0,0,0,0.1)",
                          }}
                        >
                          {formatCompactCurrency(p.financing || 0)}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "6px 10px",
                          background: `${BRAND_COLORS.warning}08`,
                          borderRadius: "6px",
                          border: `1px solid ${BRAND_COLORS.warning}20`,
                        }}
                      >
                        <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "500" }}>Investing</span>
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: "700",
                            color: BRAND_COLORS.warning,
                            textShadow: "0 1px 2px rgba(0,0,0,0.1)",
                          }}
                        >
                          {formatCompactCurrency(p.investing || 0)}
                        </span>
                      </div>
                      {includeTransfers && (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            padding: "6px 10px",
                            background: `#9333ea08`,
                            borderRadius: "6px",
                            border: `1px solid #9333ea20`,
                          }}
                        >
                          <span style={{ fontSize: "11px", color: "#64748b", fontWeight: "500" }}>Transfers</span>
                          <span
                            style={{
                              fontSize: "12px",
                              fontWeight: "700",
                              color: "#9333ea",
                              textShadow: "0 1px 2px rgba(0,0,0,0.1)",
                            }}
                          >
                            {formatCompactCurrency(p.transfers || 0)}
                          </span>
                        </div>
                      )}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "10px",
                          background: `linear-gradient(135deg, ${BRAND_COLORS.accent}10, ${BRAND_COLORS.primary}05)`,
                          borderRadius: "8px",
                          border: `2px solid ${BRAND_COLORS.accent}30`,
                          boxShadow: `0 4px 12px ${BRAND_COLORS.accent}20`,
                        }}
                      >
                        <span style={{ fontSize: "13px", fontWeight: "700", color: BRAND_COLORS.accent }}>
                          Net Cash
                        </span>
                        <span
                          style={{
                            fontSize: "15px",
                            fontWeight: "800",
                            color: (() => {
                              const netCash = includeTransfers
                                ? (p.operating || 0) + (p.financing || 0) + (p.investing || 0) + (p.transfers || 0)
                                : (p.operating || 0) + (p.financing || 0) + (p.investing || 0)
                              return netCash >= 0 ? BRAND_COLORS.success : BRAND_COLORS.danger
                            })(),
                            textShadow: "0 1px 3px rgba(0,0,0,0.2)",
                          }}
                        >
                          {(() => {
                            const netCash = includeTransfers
                              ? (p.operating || 0) + (p.financing || 0) + (p.investing || 0) + (p.transfers || 0)
                              : (p.operating || 0) + (p.financing || 0) + (p.investing || 0)
                            return formatCompactCurrency(netCash)
                          })()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div
            onClick={() => handlePropertySelect(null)}
            style={{
              marginTop: "24px",
              background: "white",
              borderRadius: "16px",
              padding: "18px",
              cursor: "pointer",
              border: `2px solid ${BRAND_COLORS.gray[200]}`,
              textAlign: "center",
              boxShadow: "0 4px 16px rgba(0, 0, 0, 0.08)",
            }}
          >
            <span
              style={{
                fontWeight: "700",
                fontSize: "15px",
                color: BRAND_COLORS.accent,
              }}
            >
              Company Total Net {reportType === "pl" ? "Income" : "Cash"}
            </span>
            <div
              style={{
                fontSize: "20px",
                fontWeight: "800",
                marginTop: "4px",
                color: companyTotals.net >= 0 ? BRAND_COLORS.success : BRAND_COLORS.danger,
              }}
            >
              {formatCompactCurrency(companyTotals.net)}
            </div>
          </div>
        </div>
      )}

      {view === "report" && (
        <div>
          <button
            onClick={back}
            style={{
              display: "flex",
              alignItems: "center",
              background: "none",
              border: "none",
              fontSize: "16px",
              color: BRAND_COLORS.accent,
              marginBottom: "20px",
              cursor: "pointer",
            }}
          >
            <ChevronLeft size={20} style={{ marginRight: "4px" }} />
            Back to Properties
          </button>

          <div
            style={{
              background: `linear-gradient(135deg, ${BRAND_COLORS.tertiary}, ${BRAND_COLORS.primary})`,
              borderRadius: "12px",
              padding: "20px",
              marginBottom: "24px",
              color: "white",
            }}
          >
            <h2 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "8px" }}>
              {selectedProperty || "Company Total"} - {reportType === "pl" ? "P&L Statement" : "Cash Flow Statement"}
            </h2>
            <p style={{ fontSize: "14px", opacity: 0.9 }}>
              {getMonthName(month)} {year}
            </p>
            {/* NEW: Transfer mode indicator for cash flow */}
            {reportType === "cf" && (
              <p style={{ fontSize: "12px", opacity: 0.8, marginTop: "4px" }}>
                {includeTransfers
                  ? "Bank reconciliation mode (includes transfers)"
                  : "Business activity mode (excludes transfers)"}
              </p>
            )}
          </div>

          {reportType === "pl" ? (
            <>
              <div style={{ display: "grid", gap: "16px" }}>
                <div
                  style={{
                    background: "white",
                    borderRadius: "12px",
                    padding: "20px",
                    border: `1px solid ${BRAND_COLORS.gray[200]}`,
                  }}
                >
                  <h3
                    style={{
                      fontSize: "18px",
                      fontWeight: "600",
                      marginBottom: "16px",
                      color: BRAND_COLORS.success,
                      borderBottom: `2px solid ${BRAND_COLORS.success}`,
                      paddingBottom: "8px",
                    }}
                  >
                    Revenue
                  </h3>
                  {plData.revenue.map((cat) => (
                    <div
                      key={cat.name}
                      onClick={() => handleCategory(cat.name, "revenue")}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px",
                        marginBottom: "8px",
                        background: BRAND_COLORS.gray[50],
                        borderRadius: "8px",
                        cursor: "pointer",
                        border: `1px solid ${BRAND_COLORS.gray[200]}`,
                        transition: "all 0.2s ease",
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = "#f0f9ff"
                        e.currentTarget.style.borderColor = BRAND_COLORS.primary
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = BRAND_COLORS.gray[50]
                        e.currentTarget.style.borderColor = BRAND_COLORS.gray[200]
                      }}
                    >
                      <span style={{ fontSize: "14px", fontWeight: "500" }}>{cat.name}</span>
                      <span style={{ fontSize: "14px", fontWeight: "600", color: BRAND_COLORS.success }}>
                        {formatCurrency(cat.total)}
                      </span>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    background: "white",
                    borderRadius: "12px",
                    padding: "20px",
                    border: `1px solid ${BRAND_COLORS.gray[200]}`,
                  }}
                >
                  <h3
                    style={{
                      fontSize: "18px",
                      fontWeight: "600",
                      marginBottom: "16px",
                      color: BRAND_COLORS.warning,
                      borderBottom: `2px solid ${BRAND_COLORS.warning}`,
                      paddingBottom: "8px",
                    }}
                  >
                    Expenses
                  </h3>
                  {plData.expenses.map((cat) => (
                    <div
                      key={cat.name}
                      onClick={() => handleCategory(cat.name, "expense")}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px",
                        marginBottom: "8px",
                        background: BRAND_COLORS.gray[50],
                        borderRadius: "8px",
                        cursor: "pointer",
                        border: `1px solid ${BRAND_COLORS.gray[200]}`,
                        transition: "all 0.2s ease",
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = "#fff7ed"
                        e.currentTarget.style.borderColor = BRAND_COLORS.warning
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = BRAND_COLORS.gray[50]
                        e.currentTarget.style.borderColor = BRAND_COLORS.gray[200]
                      }}
                    >
                      <span style={{ fontSize: "14px", fontWeight: "500" }}>{cat.name}</span>
                      <span style={{ fontSize: "14px", fontWeight: "600", color: BRAND_COLORS.warning }}>
                        {formatCurrency(cat.total)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div
                style={{
                  marginTop: "8px",
                  textAlign: "right",
                  fontSize: "16px",
                  fontWeight: "600",
                  color: plTotals.net >= 0 ? BRAND_COLORS.success : BRAND_COLORS.danger,
                }}
              >
                Net Income: {formatCurrency(plTotals.net)}
              </div>
            </>
          ) : (
            <>
              <div style={{ display: "grid", gap: "16px" }}>
                <div
                  style={{
                    background: "white",
                    borderRadius: "12px",
                    padding: "20px",
                    border: `1px solid ${BRAND_COLORS.gray[200]}`,
                  }}
                >
                  <h3
                    style={{
                      fontSize: "18px",
                      fontWeight: "600",
                      marginBottom: "16px",
                      color: BRAND_COLORS.primary,
                      borderBottom: `2px solid ${BRAND_COLORS.primary}`,
                      paddingBottom: "8px",
                    }}
                  >
                    Operating Activities
                  </h3>
                  {cfData.operating.map((cat) => (
                    <div
                      key={cat.name}
                      onClick={() => handleCategory(cat.name, "operating")}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px",
                        marginBottom: "8px",
                        background: BRAND_COLORS.gray[50],
                        borderRadius: "8px",
                        cursor: "pointer",
                        border: `1px solid ${BRAND_COLORS.gray[200]}`,
                        transition: "all 0.2s ease",
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = "#f0f9ff"
                        e.currentTarget.style.borderColor = BRAND_COLORS.primary
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = BRAND_COLORS.gray[50]
                        e.currentTarget.style.borderColor = BRAND_COLORS.gray[200]
                      }}
                    >
                      <span style={{ fontSize: "14px", fontWeight: "500" }}>{cat.name}</span>
                      <span
                        style={{
                          fontSize: "14px",
                          fontWeight: "600",
                          color: cat.total >= 0 ? BRAND_COLORS.success : BRAND_COLORS.danger,
                        }}
                      >
                        {formatCurrency(cat.total)}
                      </span>
                    </div>
                  ))}
                </div>

                <div
                  style={{
                    background: "white",
                    borderRadius: "12px",
                    padding: "20px",
                    border: `1px solid ${BRAND_COLORS.gray[200]}`,
                  }}
                >
                  <h3
                    style={{
                      fontSize: "18px",
                      fontWeight: "600",
                      marginBottom: "16px",
                      color: BRAND_COLORS.secondary,
                      borderBottom: `2px solid ${BRAND_COLORS.secondary}`,
                      paddingBottom: "8px",
                    }}
                  >
                    Financing Activities
                  </h3>
                  {cfData.financing.map((cat) => (
                    <div
                      key={cat.name}
                      onClick={() => handleCategory(cat.name, "financing")}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px",
                        marginBottom: "8px",
                        background: BRAND_COLORS.gray[50],
                        borderRadius: "8px",
                        cursor: "pointer",
                        border: `1px solid ${BRAND_COLORS.gray[200]}`,
                        transition: "all 0.2s ease",
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = "#f8fafc"
                        e.currentTarget.style.borderColor = BRAND_COLORS.secondary
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = BRAND_COLORS.gray[50]
                        e.currentTarget.style.borderColor = BRAND_COLORS.gray[200]
                      }}
                    >
                      <span style={{ fontSize: "14px", fontWeight: "500" }}>{cat.name}</span>
                      <span
                        style={{
                          fontSize: "14px",
                          fontWeight: "600",
                          color: cat.total >= 0 ? BRAND_COLORS.success : BRAND_COLORS.danger,
                        }}
                      >
                        {formatCurrency(cat.total)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* NEW: Investing Activities Section */}
                <div
                  style={{
                    background: "white",
                    borderRadius: "12px",
                    padding: "20px",
                    border: `1px solid ${BRAND_COLORS.gray[200]}`,
                  }}
                >
                  <h3
                    style={{
                      fontSize: "18px",
                      fontWeight: "600",
                      marginBottom: "16px",
                      color: BRAND_COLORS.warning,
                      borderBottom: `2px solid ${BRAND_COLORS.warning}`,
                      paddingBottom: "8px",
                    }}
                  >
                    Investing Activities
                  </h3>
                  {cfData.investing.map((cat) => (
                    <div
                      key={cat.name}
                      onClick={() => handleCategory(cat.name, "investing")}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "12px",
                        marginBottom: "8px",
                        background: BRAND_COLORS.gray[50],
                        borderRadius: "8px",
                        cursor: "pointer",
                        border: `1px solid ${BRAND_COLORS.gray[200]}`,
                        transition: "all 0.2s ease",
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = "#fff7ed"
                        e.currentTarget.style.borderColor = BRAND_COLORS.warning
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = BRAND_COLORS.gray[50]
                        e.currentTarget.style.borderColor = BRAND_COLORS.gray[200]
                      }}
                    >
                      <span style={{ fontSize: "14px", fontWeight: "500" }}>{cat.name}</span>
                      <span
                        style={{
                          fontSize: "14px",
                          fontWeight: "600",
                          color: cat.total >= 0 ? BRAND_COLORS.success : BRAND_COLORS.danger,
                        }}
                      >
                        {formatCurrency(cat.total)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* NEW: Transfer Activities Section (only if includeTransfers is true) */}
                {includeTransfers && (
                  <div
                    style={{
                      background: "white",
                      borderRadius: "12px",
                      padding: "20px",
                      border: `1px solid ${BRAND_COLORS.gray[200]}`,
                    }}
                  >
                    <h3
                      style={{
                        fontSize: "18px",
                        fontWeight: "600",
                        marginBottom: "16px",
                        color: "#9333ea",
                        borderBottom: `2px solid #9333ea`,
                        paddingBottom: "8px",
                      }}
                    >
                      Transfer Activities
                    </h3>
                    {cfData.transfers.map((cat) => (
                      <div
                        key={cat.name}
                        onClick={() => handleCategory(cat.name, "transfers")}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "12px",
                          marginBottom: "8px",
                          background: BRAND_COLORS.gray[50],
                          borderRadius: "8px",
                          cursor: "pointer",
                          border: `1px solid ${BRAND_COLORS.gray[200]}`,
                          transition: "all 0.2s ease",
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.background = "#faf5ff"
                          e.currentTarget.style.borderColor = "#9333ea"
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.background = BRAND_COLORS.gray[50]
                          e.currentTarget.style.borderColor = BRAND_COLORS.gray[200]
                        }}
                      >
                        <span style={{ fontSize: "14px", fontWeight: "500" }}>{cat.name}</span>
                        <span
                          style={{
                            fontSize: "14px",
                            fontWeight: "600",
                            color: cat.total >= 0 ? BRAND_COLORS.success : BRAND_COLORS.danger,
                          }}
                        >
                          {formatCurrency(cat.total)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div
                style={{
                  marginTop: "8px",
                  textAlign: "right",
                  fontSize: "16px",
                  fontWeight: "600",
                  color: cfTotals.net >= 0 ? BRAND_COLORS.success : BRAND_COLORS.danger,
                }}
              >
                Net Cash Flow: {formatCurrency(cfTotals.net)}
              </div>
            </>
          )}
        </div>
      )}

      {view === "detail" && (
        <div>
          <button
            onClick={back}
            style={{
              display: "flex",
              alignItems: "center",
              background: "none",
              border: "none",
              fontSize: "16px",
              color: BRAND_COLORS.accent,
              marginBottom: "20px",
              cursor: "pointer",
            }}
          >
            <ChevronLeft size={20} style={{ marginRight: "4px" }} />
            Back to {reportType === "pl" ? "P&L" : "Cash Flow"}
          </button>

          <div
            style={{
              background: `linear-gradient(135deg, ${BRAND_COLORS.accent}, ${BRAND_COLORS.secondary})`,
              borderRadius: "12px",
              padding: "20px",
              marginBottom: "24px",
              color: "white",
            }}
          >
            <h2 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "8px" }}>{selectedCategory}</h2>
            <p style={{ fontSize: "14px", opacity: 0.9 }}>
              Transaction Details • {getMonthName(month)} {year}
            </p>
            {/* NEW: Enhanced transaction details with P&L calculation info */}
            {reportType === "cf" ? (
              <p style={{ fontSize: "12px", opacity: 0.8, marginTop: "4px" }}>
                💰 Enhanced with entry_bank_account field - Perfect cash flow tracking using P&L calculation logic
              </p>
            ) : (
              <p style={{ fontSize: "12px", opacity: 0.8, marginTop: "4px" }}>
                📊 Enhanced P&L using timezone-independent date handling and precise account classification
              </p>
            )}
          </div>

          <div style={{ display: "grid", gap: "12px" }}>
            {transactions.map((t, idx) => (
              <div
                key={idx}
                style={{
                  background: "white",
                  borderRadius: "8px",
                  padding: "16px",
                  border: `1px solid ${BRAND_COLORS.gray[200]}`,
                  boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: "8px",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "500" }}>
                      {new Date(t.date).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                    {t.payee && <div style={{ fontSize: "13px", color: "#475569" }}>{t.payee}</div>}
                    {t.className && (
                      <div
                        style={{
                          fontSize: "12px",
                          fontWeight: "600",
                          color: BRAND_COLORS.accent,
                          background: `${BRAND_COLORS.primary}20`,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          display: "inline-block",
                          marginTop: "2px",
                        }}
                      >
                        {t.className}
                      </div>
                    )}
                    {t.memo && <div style={{ fontSize: "12px", color: "#64748b" }}>{t.memo}</div>}
                  </div>
                  <span
                    style={{
                      fontSize: "16px",
                      fontWeight: "600",
                      color: t.amount >= 0 ? BRAND_COLORS.success : BRAND_COLORS.danger,
                    }}
                  >
                    {formatCurrency(t.amount)}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#64748b",
                    textAlign: "right",
                    borderTop: `1px solid ${BRAND_COLORS.gray[100]}`,
                    paddingTop: "8px",
                  }}
                >
                  Running Total: {formatCurrency(t.running)}
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: "16px",
              textAlign: "right",
              fontSize: "14px",
              fontWeight: "600",
              color: transactionTotal >= 0 ? BRAND_COLORS.success : BRAND_COLORS.danger,
            }}
          >
            {reportType === "pl" ? "Total Net Income" : "Total Net Cash Flow"}: {formatCurrency(transactionTotal)}
          </div>
        </div>
      )}
    </div>
  )
}
