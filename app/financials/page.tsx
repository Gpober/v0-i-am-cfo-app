"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { RequireIAMCFOLogin } from "@/components/RequireIAMCFOLogin"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface FinancialData {
  id: string
  date: string
  description: string
  amount: number
  category: string
  type: "income" | "expense"
}

export default function FinancialsPage() {
  const [financialData, setFinancialData] = useState<FinancialData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchFinancialData()
  }, [])

  const fetchFinancialData = async () => {
    try {
      const { data, error } = await supabase.from("transactions").select("*").order("date", { ascending: false })

      if (error) {
        console.error("Error fetching financial data:", error)
      } else {
        setFinancialData(data || [])
      }
    } catch (error) {
      console.error("Error:", error)
    } finally {
      setLoading(false)
    }
  }

  const totalIncome = financialData.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0)

  const totalExpenses = financialData
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + item.amount, 0)

  const netProfit = totalIncome - totalExpenses

  if (loading) {
    return (
      <RequireIAMCFOLogin>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading financial data...</div>
        </div>
      </RequireIAMCFOLogin>
    )
  }

  return (
    <RequireIAMCFOLogin>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financial Overview</h1>
          <p className="text-gray-600">Comprehensive view of your financial data</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">Total Income</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalIncome.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-red-600">Total Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalExpenses.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className={netProfit >= 0 ? "text-green-600" : "text-red-600"}>Net Profit</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${netProfit.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList>
            <TabsTrigger value="all">All Transactions</TabsTrigger>
            <TabsTrigger value="income">Income</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <Card>
              <CardHeader>
                <CardTitle>All Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {financialData.length === 0 ? (
                    <p className="text-gray-500">No transactions found</p>
                  ) : (
                    financialData.map((item) => (
                      <div key={item.id} className="flex justify-between items-center p-4 border rounded-lg">
                        <div>
                          <h3 className="font-medium">{item.description}</h3>
                          <p className="text-sm text-gray-500">
                            {item.date} • {item.category}
                          </p>
                        </div>
                        <span className={`font-bold ${item.type === "income" ? "text-green-600" : "text-red-600"}`}>
                          {item.type === "income" ? "+" : "-"}${Math.abs(item.amount).toLocaleString()}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="income">
            <Card>
              <CardHeader>
                <CardTitle>Income Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {financialData
                    .filter((item) => item.type === "income")
                    .map((item) => (
                      <div key={item.id} className="flex justify-between items-center p-4 border rounded-lg">
                        <div>
                          <h3 className="font-medium">{item.description}</h3>
                          <p className="text-sm text-gray-500">
                            {item.date} • {item.category}
                          </p>
                        </div>
                        <span className="font-bold text-green-600">+${item.amount.toLocaleString()}</span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expenses">
            <Card>
              <CardHeader>
                <CardTitle>Expense Transactions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {financialData
                    .filter((item) => item.type === "expense")
                    .map((item) => (
                      <div key={item.id} className="flex justify-between items-center p-4 border rounded-lg">
                        <div>
                          <h3 className="font-medium">{item.description}</h3>
                          <p className="text-sm text-gray-500">
                            {item.date} • {item.category}
                          </p>
                        </div>
                        <span className="font-bold text-red-600">-${Math.abs(item.amount).toLocaleString()}</span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </RequireIAMCFOLogin>
  )
}
