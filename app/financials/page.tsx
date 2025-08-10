"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabaseClient"
import type { Transaction, BalanceSheetItem, CashFlowItem } from "@/types"

export default function FinancialsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [balanceSheet, setBalanceSheet] = useState<BalanceSheetItem[]>([])
  const [cashFlow, setCashFlow] = useState<CashFlowItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFinancialData()
  }, [])

  const fetchFinancialData = async () => {
    try {
      // Fetch transactions
      const { data: transactionData, error: transactionError } = await supabase
        .from("transactions")
        .select("*")
        .order("date", { ascending: false })

      if (transactionError) {
        console.error("Error fetching transactions:", transactionError)
      } else {
        setTransactions(transactionData || [])
      }

      // Fetch balance sheet items
      const { data: balanceData, error: balanceError } = await supabase.from("balance_sheet_items").select("*")

      if (balanceError) {
        console.error("Error fetching balance sheet:", balanceError)
      } else {
        setBalanceSheet(balanceData || [])
      }

      // Fetch cash flow items
      const { data: cashFlowData, error: cashFlowError } = await supabase
        .from("cash_flow_items")
        .select("*")
        .order("date", { ascending: false })

      if (cashFlowError) {
        console.error("Error fetching cash flow:", cashFlowError)
      } else {
        setCashFlow(cashFlowData || [])
      }
    } catch (error) {
      console.error("Error fetching financial data:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading financial data...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Financial Statements</h2>
        <div className="flex items-center space-x-2">
          <Button>Export PDF</Button>
          <Button variant="outline">Print</Button>
        </div>
      </div>

      <Tabs defaultValue="income-statement" className="space-y-4">
        <TabsList>
          <TabsTrigger value="income-statement">Income Statement</TabsTrigger>
          <TabsTrigger value="balance-sheet">Balance Sheet</TabsTrigger>
          <TabsTrigger value="cash-flow">Cash Flow</TabsTrigger>
        </TabsList>

        <TabsContent value="income-statement" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Income Statement</CardTitle>
              <CardDescription>Revenue and expenses for the current period</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-4">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="font-semibold">Revenue</span>
                    <span className="font-semibold">
                      $
                      {transactions
                        .filter((t) => t.type === "income")
                        .reduce((sum, t) => sum + t.amount, 0)
                        .toLocaleString()}
                    </span>
                  </div>
                  {transactions
                    .filter((t) => t.type === "income")
                    .slice(0, 5)
                    .map((transaction) => (
                      <div key={transaction.id} className="flex justify-between items-center">
                        <span>{transaction.description}</span>
                        <span>${transaction.amount.toLocaleString()}</span>
                      </div>
                    ))}

                  <div className="flex justify-between items-center border-b pb-2 mt-6">
                    <span className="font-semibold">Expenses</span>
                    <span className="font-semibold">
                      $
                      {transactions
                        .filter((t) => t.type === "expense")
                        .reduce((sum, t) => sum + t.amount, 0)
                        .toLocaleString()}
                    </span>
                  </div>
                  {transactions
                    .filter((t) => t.type === "expense")
                    .slice(0, 5)
                    .map((transaction) => (
                      <div key={transaction.id} className="flex justify-between items-center">
                        <span>{transaction.description}</span>
                        <span>-${transaction.amount.toLocaleString()}</span>
                      </div>
                    ))}

                  <div className="flex justify-between items-center border-t pt-4 text-lg font-bold">
                    <span>Net Income</span>
                    <span>
                      $
                      {(
                        transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0) -
                        transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0)
                      ).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balance-sheet" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Balance Sheet</CardTitle>
              <CardDescription>Assets, liabilities, and equity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-3">
                <div>
                  <h3 className="font-semibold mb-4">Assets</h3>
                  <div className="space-y-2">
                    {balanceSheet
                      .filter((item) => item.type === "asset")
                      .map((item) => (
                        <div key={item.id} className="flex justify-between">
                          <span>{item.subcategory}</span>
                          <span>${item.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    <div className="border-t pt-2 font-semibold">
                      <div className="flex justify-between">
                        <span>Total Assets</span>
                        <span>
                          $
                          {balanceSheet
                            .filter((item) => item.type === "asset")
                            .reduce((sum, item) => sum + item.amount, 0)
                            .toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-4">Liabilities</h3>
                  <div className="space-y-2">
                    {balanceSheet
                      .filter((item) => item.type === "liability")
                      .map((item) => (
                        <div key={item.id} className="flex justify-between">
                          <span>{item.subcategory}</span>
                          <span>${item.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    <div className="border-t pt-2 font-semibold">
                      <div className="flex justify-between">
                        <span>Total Liabilities</span>
                        <span>
                          $
                          {balanceSheet
                            .filter((item) => item.type === "liability")
                            .reduce((sum, item) => sum + item.amount, 0)
                            .toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-4">Equity</h3>
                  <div className="space-y-2">
                    {balanceSheet
                      .filter((item) => item.type === "equity")
                      .map((item) => (
                        <div key={item.id} className="flex justify-between">
                          <span>{item.subcategory}</span>
                          <span>${item.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    <div className="border-t pt-2 font-semibold">
                      <div className="flex justify-between">
                        <span>Total Equity</span>
                        <span>
                          $
                          {balanceSheet
                            .filter((item) => item.type === "equity")
                            .reduce((sum, item) => sum + item.amount, 0)
                            .toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cash-flow" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Cash Flow Statement</CardTitle>
              <CardDescription>Cash flows from operating, investing, and financing activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-4">Operating Activities</h3>
                  <div className="space-y-2">
                    {cashFlow
                      .filter((item) => item.type === "operating")
                      .map((item) => (
                        <div key={item.id} className="flex justify-between">
                          <span>{item.category}</span>
                          <span>${item.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    <div className="border-t pt-2 font-semibold">
                      <div className="flex justify-between">
                        <span>Net Cash from Operating</span>
                        <span>
                          $
                          {cashFlow
                            .filter((item) => item.type === "operating")
                            .reduce((sum, item) => sum + item.amount, 0)
                            .toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-4">Investing Activities</h3>
                  <div className="space-y-2">
                    {cashFlow
                      .filter((item) => item.type === "investing")
                      .map((item) => (
                        <div key={item.id} className="flex justify-between">
                          <span>{item.category}</span>
                          <span>${item.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    <div className="border-t pt-2 font-semibold">
                      <div className="flex justify-between">
                        <span>Net Cash from Investing</span>
                        <span>
                          $
                          {cashFlow
                            .filter((item) => item.type === "investing")
                            .reduce((sum, item) => sum + item.amount, 0)
                            .toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-4">Financing Activities</h3>
                  <div className="space-y-2">
                    {cashFlow
                      .filter((item) => item.type === "financing")
                      .map((item) => (
                        <div key={item.id} className="flex justify-between">
                          <span>{item.category}</span>
                          <span>${item.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    <div className="border-t pt-2 font-semibold">
                      <div className="flex justify-between">
                        <span>Net Cash from Financing</span>
                        <span>
                          $
                          {cashFlow
                            .filter((item) => item.type === "financing")
                            .reduce((sum, item) => sum + item.amount, 0)
                            .toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Net Change in Cash</span>
                    <span>${cashFlow.reduce((sum, item) => sum + item.amount, 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
