"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabaseClient"
import { format, startOfMonth, endOfMonth } from "date-fns"
import { ChevronLeft, ChevronRight, Download, X, TrendingUp, TrendingDown } from "lucide-react"

interface Transaction {
  id: string
  date: string
  memo: string
  bank_account: string
  account_type: string
  report_category: string
  amount: number
  property?: string
}

interface CashFlowData {
  [key: string]: {
    [key: string]: {
      transactions: Transaction[]
      total: number
    }
  }
}

interface TransactionModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  transactions: Transaction[]
  total: number
}

const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, title, transactions, total }) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="text-sm text-gray-600 mt-1">{transactions.length} cash flow transactions</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Summary */}
          <div className="mb-6 text-center">
            <div className="text-2xl font-bold text-center">
              Cash Flow Impact:{" "}
              <span className={total >= 0 ? "text-green-600" : "text-red-600"}>
                ${Math.abs(total).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Transaction List */}
          <div className="overflow-auto max-h-96">
            <table className="w-full">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left p-3 font-medium text-gray-700">MEMO</th>
                  <th className="text-left p-3 font-medium text-gray-700">BANK ACCOUNT</th>
                  <th className="text-left p-3 font-medium text-gray-700">ACCOUNT TYPE</th>
                  <th className="text-left p-3 font-medium text-gray-700">REPORT CATEGORY</th>
                  <th className="text-right p-3 font-medium text-gray-700">IMPACT</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction, index) => (
                  <tr key={transaction.id || index} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-sm">{transaction.memo}</td>
                    <td className="p-3 text-sm">{transaction.bank_account}</td>
                    <td className="p-3 text-sm">{transaction.account_type}</td>
                    <td className="p-3 text-sm">{transaction.report_category}</td>
                    <td className="p-3 text-sm text-right">
                      <span className={transaction.amount >= 0 ? "text-green-600" : "text-red-600"}>
                        {transaction.amount >= 0 ? "+" : ""}${Math.abs(transaction.amount).toLocaleString()}
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
  )
}

export default function CashFlowPage() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return format(now, "yyyy-MM")
  })
  const [selectedProperty, setSelectedProperty] = useState<string>("all")
  const [cashFlowData, setCashFlowData] = useState<CashFlowData>({})
  const [properties, setProperties] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState("traditional")
  const [transactionModal, setTransactionModal] = useState<{
    isOpen: boolean
    title: string
    transactions: Transaction[]
    total: number
  }>({
    isOpen: false,
    title: "",
    transactions: [],
    total: 0,
  })

  const fetchCashFlowData = async () => {
    setLoading(true)
    try {
      const startDate = startOfMonth(new Date(selectedMonth + "-01"))
      const endDate = endOfMonth(startDate)

      let query = supabase
        .from("financial_transactions")
        .select("*")
        .gte("date", format(startDate, "yyyy-MM-dd"))
        .lte("date", format(endDate, "yyyy-MM-dd"))
        .in("account_type", ["Assets", "Liabilities"])

      if (selectedProperty !== "all") {
        query = query.eq("property", selectedProperty)
      }

      const { data, error } = await query

      if (error) {
        console.error("Error fetching cash flow data:", error)
        return
      }

      // Process data for cash flow analysis
      const processedData: CashFlowData = {}

      data?.forEach((transaction) => {
        const { account_type, report_category } = transaction

        if (!processedData[account_type]) {
          processedData[account_type] = {}
        }

        if (!processedData[account_type][report_category]) {
          processedData[account_type][report_category] = {
            transactions: [],
            total: 0,
          }
        }

        // For cash flow, we need to consider the impact on cash
        // Assets increasing = cash outflow (negative)
        // Assets decreasing = cash inflow (positive)
        // Liabilities increasing = cash inflow (positive)
        // Liabilities decreasing = cash outflow (negative)
        let cashFlowImpact = transaction.amount
        if (account_type === "Assets") {
          cashFlowImpact = -transaction.amount // Assets increase = cash decrease
        }

        processedData[account_type][report_category].transactions.push({
          ...transaction,
          amount: cashFlowImpact,
        })
        processedData[account_type][report_category].total += cashFlowImpact
      })

      setCashFlowData(processedData)
    } catch (error) {
      console.error("Error processing cash flow data:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase
        .from("financial_transactions")
        .select("property")
        .not("property", "is", null)

      if (error) {
        console.error("Error fetching properties:", error)
        return
      }

      const uniqueProperties = Array.from(new Set(data?.map((item) => item.property).filter(Boolean)))
      setProperties(uniqueProperties as string[])
    } catch (error) {
      console.error("Error processing properties:", error)
    }
  }

  useEffect(() => {
    fetchProperties()
  }, [])

  useEffect(() => {
    fetchCashFlowData()
  }, [selectedMonth, selectedProperty])

  const navigateMonth = (direction: "prev" | "next") => {
    const currentDate = new Date(selectedMonth + "-01")
    if (direction === "prev") {
      currentDate.setMonth(currentDate.getMonth() - 1)
    } else {
      currentDate.setMonth(currentDate.getMonth() + 1)
    }
    setSelectedMonth(format(currentDate, "yyyy-MM"))
  }

  const openTransactionModal = (title: string, transactions: Transaction[], total: number) => {
    setTransactionModal({
      isOpen: true,
      title,
      transactions,
      total,
    })
  }

  const closeTransactionModal = () => {
    setTransactionModal({
      isOpen: false,
      title: "",
      transactions: [],
      total: 0,
    })
  }

  const calculateTotalCashFlow = () => {
    let total = 0
    Object.values(cashFlowData).forEach((accountType) => {
      Object.values(accountType).forEach((category) => {
        total += category.total
      })
    })
    return total
  }

  const renderTraditionalView = () => (
    <div className="space-y-6">
      {Object.entries(cashFlowData).map(([accountType, categories]) => (
        <Card key={accountType}>
          <CardHeader>
            <CardTitle className="text-lg">{accountType}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(categories).map(([category, data]) => (
                <div
                  key={category}
                  className="flex justify-between items-center p-3 hover:bg-gray-50 rounded cursor-pointer"
                  onClick={() => openTransactionModal(`${accountType} - ${category}`, data.transactions, data.total)}
                >
                  <span className="font-medium">{category}</span>
                  <div className="flex items-center space-x-2">
                    <span className={`font-semibold ${data.total >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {data.total >= 0 ? "+" : ""}${Math.abs(data.total).toLocaleString()}
                    </span>
                    {data.total >= 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )

  const renderOffsetView = () => {
    const offsetData: { [key: string]: { transactions: Transaction[]; total: number } } = {}

    // Group by report_category across all account types
    Object.values(cashFlowData).forEach((accountType) => {
      Object.entries(accountType).forEach(([category, data]) => {
        if (!offsetData[category]) {
          offsetData[category] = { transactions: [], total: 0 }
        }
        offsetData[category].transactions.push(...data.transactions)
        offsetData[category].total += data.total
      })
    })

    return (
      <div className="space-y-4">
        {Object.entries(offsetData).map(([category, data]) => (
          <Card key={category}>
            <CardContent className="p-4">
              <div
                className="flex justify-between items-center cursor-pointer hover:bg-gray-50 p-2 rounded"
                onClick={() => openTransactionModal(`${category} - Cash Flow Impact`, data.transactions, data.total)}
              >
                <span className="font-medium">{category}</span>
                <div className="flex items-center space-x-2">
                  <span className={`font-semibold ${data.total >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {data.total >= 0 ? "+" : ""}${Math.abs(data.total).toLocaleString()}
                  </span>
                  {data.total >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const renderBankAccountView = () => {
    const bankData: { [key: string]: { transactions: Transaction[]; total: number } } = {}

    // Group by bank_account across all account types
    Object.values(cashFlowData).forEach((accountType) => {
      Object.values(accountType).forEach((categoryData) => {
        categoryData.transactions.forEach((transaction) => {
          const bankAccount = transaction.bank_account
          if (!bankData[bankAccount]) {
            bankData[bankAccount] = { transactions: [], total: 0 }
          }
          bankData[bankAccount].transactions.push(transaction)
          bankData[bankAccount].total += transaction.amount
        })
      })
    })

    return (
      <div className="space-y-4">
        {Object.entries(bankData).map(([bankAccount, data]) => (
          <Card key={bankAccount}>
            <CardContent className="p-4">
              <div
                className="flex justify-between items-center cursor-pointer hover:bg-gray-50 p-2 rounded"
                onClick={() => openTransactionModal(`${bankAccount} - Cash Flow Impact`, data.transactions, data.total)}
              >
                <span className="font-medium">{bankAccount}</span>
                <div className="flex items-center space-x-2">
                  <span className={`font-semibold ${data.total >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {data.total >= 0 ? "+" : ""}${Math.abs(data.total).toLocaleString()}
                  </span>
                  {data.total >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  const totalCashFlow = calculateTotalCashFlow()

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Cash Flow Statement</h1>
        <Button variant="outline" className="flex items-center space-x-2 bg-transparent">
          <Download className="w-4 h-4" />
          <span>Export</span>
        </Button>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => navigateMonth("prev")}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-medium min-w-[120px] text-center">
            {format(new Date(selectedMonth + "-01"), "MMMM yyyy")}
          </span>
          <Button variant="outline" size="sm" onClick={() => navigateMonth("next")}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <Select value={selectedProperty} onValueChange={setSelectedProperty}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select property" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Properties</SelectItem>
            {properties.map((property) => (
              <SelectItem key={property} value={property}>
                {property}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Card */}
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <h2 className="text-lg font-medium text-gray-600 mb-2">Net Cash Flow</h2>
            <div className={`text-3xl font-bold ${totalCashFlow >= 0 ? "text-green-600" : "text-red-600"}`}>
              {totalCashFlow >= 0 ? "+" : ""}${Math.abs(totalCashFlow).toLocaleString()}
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {format(new Date(selectedMonth + "-01"), "MMMM yyyy")}
              {selectedProperty !== "all" && ` • ${selectedProperty}`}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* View Tabs */}
      <Tabs value={activeView} onValueChange={setActiveView}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="traditional">Traditional</TabsTrigger>
          <TabsTrigger value="offset">By Category</TabsTrigger>
          <TabsTrigger value="bybank">By Bank Account</TabsTrigger>
        </TabsList>

        <TabsContent value="traditional" className="mt-6">
          {renderTraditionalView()}
        </TabsContent>

        <TabsContent value="offset" className="mt-6">
          {renderOffsetView()}
        </TabsContent>

        <TabsContent value="bybank" className="mt-6">
          {renderBankAccountView()}
        </TabsContent>
      </Tabs>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={transactionModal.isOpen}
        onClose={closeTransactionModal}
        title={transactionModal.title}
        transactions={transactionModal.transactions}
        total={transactionModal.total}
      />
    </div>
  )
}
