"use client"

import React, { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line } from "recharts"
import { supabase } from "@/lib/supabaseClient"
import Papa from "papaparse"

type KPISet = {
  revenue: number
  cogs: number
  grossProfit: number
  opEx: number
  netIncome: number
  byAccount: Record<string, number>
  trend: Record<string, number>
}

const isIncome = (t: string | null) => {
  const type = (t || "").toLowerCase()
  return type === "income" || type === "other income" || type.includes("income") || type.includes("revenue")
}

const isExpense = (t: string | null) => {
  const type = (t || "").toLowerCase()
  return type === "expense" || type === "other expense" || type.includes("expense")
}

const isCogs = (t: string | null) => {
  const type = (t || "").toLowerCase()
  return type === "cost of goods sold" || type.includes("cogs") || type.includes("cost of goods")
}

const computeKPIs = (rows: any[]): KPISet => {
  const result: KPISet = {
    revenue: 0,
    cogs: 0,
    grossProfit: 0,
    opEx: 0,
    netIncome: 0,
    byAccount: {},
    trend: {},
  }

  rows.forEach((r) => {
    const debit = Number(r.debit) || 0
    const credit = Number(r.credit) || 0
    const account = r.account || "Unknown"
    const date = r.date?.split("T")[0]
    const week = date ? new Date(date) : null
    const weekKey = week ? `${week.getFullYear()}-W${String(Math.ceil((week.getDate() - week.getDay() + 1) / 7)).padStart(2, "0")}` : ""

    if (isIncome(r.account_type)) {
      const amt = credit - debit
      result.revenue += amt
      result.byAccount[account] = (result.byAccount[account] || 0) + amt
      if (weekKey) result.trend[weekKey] = (result.trend[weekKey] || 0) + amt
    } else if (isCogs(r.account_type)) {
      const amt = debit - credit
      result.cogs += amt
      result.byAccount[account] = (result.byAccount[account] || 0) - amt
      if (weekKey) result.trend[weekKey] = (result.trend[weekKey] || 0) - amt
    } else if (isExpense(r.account_type)) {
      const amt = debit - credit
      result.opEx += amt
      result.byAccount[account] = (result.byAccount[account] || 0) - amt
      if (weekKey) result.trend[weekKey] = (result.trend[weekKey] || 0) - amt
    }
  })

  result.grossProfit = result.revenue - result.cogs
  result.netIncome = result.grossProfit - result.opEx
  return result
}

const kpiOrder = ["Revenue", "COGS", "Gross Profit", "OpEx", "Net Income"]

export default function ComparativeAnalysis() {
  const today = new Date().toISOString().split("T")[0]
  const [mode, setMode] = useState<"period" | "scope">("period")
  const [startA, setStartA] = useState(today)
  const [endA, setEndA] = useState(today)
  const [startB, setStartB] = useState(today)
  const [endB, setEndB] = useState(today)
  const [scopeA, setScopeA] = useState("All")
  const [scopeB, setScopeB] = useState("All")
  const [dataA, setDataA] = useState<KPISet | null>(null)
  const [dataB, setDataB] = useState<KPISet | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const filters = async (start: string, end: string, scope: string) => {
        let query = supabase
          .from("journal_entry_lines")
          .select("date, class, account, account_type, debit, credit")
          .gte("date", start)
          .lte("date", end)
        if (scope !== "All") {
          query = query.eq("class", scope)
        }
        const { data } = await query
        return data || []
      }

      const rowsA = await filters(startA, endA, scopeA)
      const rowsB = await filters(mode === "period" ? startB : startA, mode === "period" ? endB : endA, scopeB)
      setDataA(computeKPIs(rowsA))
      setDataB(computeKPIs(rowsB))
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchData()
  }, [])

  const kpiData = kpiOrder.map((k) => {
    const key = k
    const map: any = {
      Revenue: { a: dataA?.revenue || 0, b: dataB?.revenue || 0 },
      COGS: { a: dataA?.cogs || 0, b: dataB?.cogs || 0 },
      "Gross Profit": { a: dataA?.grossProfit || 0, b: dataB?.grossProfit || 0 },
      OpEx: { a: dataA?.opEx || 0, b: dataB?.opEx || 0 },
      "Net Income": { a: dataA?.netIncome || 0, b: dataB?.netIncome || 0 },
    }
    return { kpi: key, A: map[key].a, B: map[key].b }
  })

  const topMovers = (() => {
    const accs = new Set<string>([
      ...(dataA ? Object.keys(dataA.byAccount) : []),
      ...(dataB ? Object.keys(dataB.byAccount) : []),
    ])
    const arr = Array.from(accs).map((acct) => {
      const a = dataA?.byAccount[acct] || 0
      const b = dataB?.byAccount[acct] || 0
      const varAmt = a - b
      const varPct = b === 0 ? 0 : (varAmt / Math.abs(b)) * 100
      return { account: acct, A: a, B: b, varAmt, varPct }
    })
    return arr.sort((x, y) => Math.abs(y.varAmt) - Math.abs(x.varAmt)).slice(0, 10)
  })()

  const trendData = (() => {
    const keys = new Set<string>([
      ...(dataA ? Object.keys(dataA.trend) : []),
      ...(dataB ? Object.keys(dataB.trend) : []),
    ])
    return Array.from(keys)
      .sort()
      .map((k) => ({
        period: k,
        A: dataA?.trend[k] || 0,
        B: dataB?.trend[k] || 0,
      }))
  })()

  const summary = (() => {
    if (!dataA || !dataB) return []
    const revVarPct = ((dataA.revenue - dataB.revenue) / (dataB.revenue || 1)) * 100
    const opVarPct = ((dataA.opEx - dataB.opEx) / (dataB.opEx || 1)) * 100
    const niVarPct = ((dataA.netIncome - dataB.netIncome) / (Math.abs(dataB.netIncome) || 1)) * 100
    return [
      `Revenue ${revVarPct >= 0 ? "up" : "down"} ${Math.abs(revVarPct).toFixed(1)}%`,
      `OpEx ${opVarPct >= 0 ? "up" : "down"} ${Math.abs(opVarPct).toFixed(1)}%`,
      `Net Income ${niVarPct >= 0 ? "up" : "down"} ${Math.abs(niVarPct).toFixed(1)}%`,
    ]
  })()

  const exportCSV = () => {
    const csv = Papa.unparse(topMovers)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "comparative-analysis.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Comparative Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <Select value={mode} onValueChange={(v) => setMode(v as any)}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="period">Period vs Period</SelectItem>
                <SelectItem value="scope">Class/Property vs Class/Property</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={startA} onChange={(e) => setStartA(e.target.value)} />
            <Input type="date" value={endA} onChange={(e) => setEndA(e.target.value)} />
            {mode === "period" ? (
              <>
                <Input type="date" value={startB} onChange={(e) => setStartB(e.target.value)} />
                <Input type="date" value={endB} onChange={(e) => setEndB(e.target.value)} />
              </>
            ) : (
              <>
                <Input value={scopeA} onChange={(e) => setScopeA(e.target.value)} placeholder="Scope A" />
                <Input value={scopeB} onChange={(e) => setScopeB(e.target.value)} placeholder="Scope B" />
              </>
            )}
            <Button onClick={fetchData} disabled={loading}>{loading ? "Loading" : "Refresh"}</Button>
            <Button className="bg-white text-black border" onClick={exportCSV}>Export CSV</Button>
          </div>

          {summary.length > 0 && (
            <ul className="list-disc pl-5 text-sm">
              {summary.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          )}

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kpiData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="kpi" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="A" fill="#56B6E9" />
                <Bar dataKey="B" fill="#94A3B8" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="A" stroke="#56B6E9" />
                <Line type="monotone" dataKey="B" stroke="#94A3B8" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="p-2">Account</th>
                  <th className="p-2">A</th>
                  <th className="p-2">B</th>
                  <th className="p-2">Var $</th>
                  <th className="p-2">Var %</th>
                </tr>
              </thead>
              <tbody>
                {topMovers.map((row) => (
                  <tr key={row.account} className="border-t">
                    <td className="p-2">{row.account}</td>
                    <td className="p-2">{row.A.toFixed(2)}</td>
                    <td className="p-2">{row.B.toFixed(2)}</td>
                    <td className="p-2">{row.varAmt.toFixed(2)}</td>
                    <td className="p-2">{row.varPct.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

