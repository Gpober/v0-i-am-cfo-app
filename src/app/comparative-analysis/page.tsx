"use client"

import React, { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { formatCurrency } from "@/lib/utils"
import { KPICard } from "@/components/KPICard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
} from "recharts"
import {
  RefreshCw,
  Download,
} from "lucide-react"

type KPI = "revenue" | "cogs" | "grossProfit" | "opex" | "netIncome"

interface Mover {
  account: string
  A: number
  B: number
  variance: number
  variancePct: number | null
}

interface Dataset {
  accounts: Map<string, number>
  kpis: Record<KPI, number>
  timeseries: { date: string } & Record<KPI, number>[]
}

const classifyPLAccount = (
  accountType: string,
  accountName: string,
  reportCategory: string,
): "INCOME" | "EXPENSES" | null => {
  const typeLower = accountType?.toLowerCase() || ""
  const nameLower = accountName?.toLowerCase() || ""
  const categoryLower = reportCategory?.toLowerCase() || ""

  const isTransfer =
    categoryLower === "transfer" || nameLower.includes("transfer")
  const isCashAccount =
    typeLower.includes("bank") ||
    typeLower.includes("cash") ||
    nameLower.includes("checking") ||
    nameLower.includes("savings") ||
    nameLower.includes("cash")

  if (isCashAccount || isTransfer) return null

  const isIncomeAccount =
    typeLower === "income" ||
    typeLower === "other income" ||
    typeLower.includes("income") ||
    typeLower.includes("revenue")

  const isExpenseAccount =
    typeLower === "expense" ||
    typeLower === "other expense" ||
    typeLower === "cost of goods sold" ||
    typeLower.includes("expense")

  if (isIncomeAccount) return "INCOME"
  if (isExpenseAccount) return "EXPENSES"
  return null
}

const fetchDataset = async (
  start: string,
  end: string,
  property: string,
): Promise<Dataset> => {
  let query = supabase
    .from("journal_entry_lines")
    .select(
      "date, class, account, account_type, report_category, debit, credit",
    )
    .gte("date", start)
    .lte("date", end)

  if (property && property !== "All Properties") {
    query = query.eq("class", property)
  }

  const { data, error } = await query
  if (error) throw error

  const accounts = new Map<string, number>()
  const daily = new Map<string, { revenue: number; cogs: number; opex: number }>()
  let revenue = 0
  let cogs = 0
  let opex = 0

  data.forEach((tx) => {
    const classification = classifyPLAccount(
      tx.account_type,
      tx.account,
      tx.report_category,
    )
    if (!classification) return

    const debit = tx.debit ? Number.parseFloat(tx.debit) : 0
    const credit = tx.credit ? Number.parseFloat(tx.credit) : 0
    const amount =
      classification === "INCOME" ? credit - debit : debit - credit

    const typeLower = tx.account_type?.toLowerCase() || ""
    const accountLower = tx.account?.toLowerCase() || ""

    if (classification === "INCOME") {
      revenue += amount
    } else if (
      typeLower === "cost of goods sold" ||
      accountLower.includes("cogs")
    ) {
      cogs += amount
    } else {
      opex += amount
    }

    accounts.set(tx.account, (accounts.get(tx.account) || 0) + amount)

    const dateOnly = tx.date.split("T")[0]
    const day =
      daily.get(dateOnly) || { revenue: 0, cogs: 0, opex: 0 }
    if (classification === "INCOME") day.revenue += amount
    else if (typeLower === "cost of goods sold" || accountLower.includes("cogs"))
      day.cogs += amount
    else day.opex += amount
    daily.set(dateOnly, day)
  })

  const grossProfit = revenue - cogs
  const netIncome = grossProfit - opex

  const timeseries = Array.from(daily.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => ({
      date,
      revenue: d.revenue,
      cogs: d.cogs,
      grossProfit: d.revenue - d.cogs,
      opex: d.opex,
      netIncome: d.revenue - d.cogs - d.opex,
    }))

  return {
    accounts,
    kpis: { revenue, cogs, grossProfit, opex, netIncome },
    timeseries,
  }
}

export default function ComparativeAnalysisPage() {
  const [mode, setMode] = useState<"period" | "class">("period")
  const [startA, setStartA] = useState("")
  const [endA, setEndA] = useState("")
  const [startB, setStartB] = useState("")
  const [endB, setEndB] = useState("")
  const [propertyA, setPropertyA] = useState("All Properties")
  const [propertyB, setPropertyB] = useState("All Properties")
  const [availableProperties, setAvailableProperties] = useState<string[]>([
    "All Properties",
  ])
  const [datasetA, setDatasetA] = useState<Dataset | null>(null)
  const [datasetB, setDatasetB] = useState<Dataset | null>(null)
  const [kpiTrend, setKpiTrend] = useState<KPI>("revenue")
  const [topMovers, setTopMovers] = useState<Mover[]>([])
  const [summary, setSummary] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const initDates = () => {
      const today = new Date()
      const currentStart = new Date(today.getFullYear(), today.getMonth(), 1)
      const currentEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      const prevStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const prevEnd = new Date(today.getFullYear(), today.getMonth(), 0)
      setStartA(prevStart.toISOString().split("T")[0])
      setEndA(prevEnd.toISOString().split("T")[0])
      setStartB(currentStart.toISOString().split("T")[0])
      setEndB(currentEnd.toISOString().split("T")[0])
    }
    initDates()
    fetchProperties()
  }, [])

  const fetchProperties = async () => {
    const { data } = await supabase
      .from("journal_entry_lines")
      .select("class", { distinct: true })
    if (data) {
      const set = new Set<string>()
      data.forEach((d) => d.class && set.add(d.class))
      setAvailableProperties(["All Properties", ...Array.from(set).sort()])
    }
  }

  const refresh = async () => {
    setLoading(true)
    try {
      const A = await fetchDataset(startA, endA, propertyA)
      const B = await fetchDataset(
        mode === "period" ? startB : startA,
        mode === "period" ? endB : endA,
        mode === "class" ? propertyB : propertyA,
      )
      setDatasetA(A)
      setDatasetB(B)
      const movers = computeTopMovers(A.accounts, B.accounts)
      setTopMovers(movers)
      buildSummary(A.kpis, B.kpis, movers)
    } finally {
      setLoading(false)
    }
  }

  const computeTopMovers = (
    accountsA: Map<string, number>,
    accountsB: Map<string, number>,
  ) => {
    const set = new Set([...accountsA.keys(), ...accountsB.keys()])
    const rows = Array.from(set).map((acct) => {
      const valA = accountsA.get(acct) || 0
      const valB = accountsB.get(acct) || 0
      const variance = valA - valB
      const variancePct = valB !== 0 ? (variance / valB) * 100 : null
      return {
        account: acct,
        A: valA,
        B: valB,
        variance,
        variancePct,
      }
    })
    rows.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))
    return rows.slice(0, 10)
  }

  const buildSummary = (
    A: Record<KPI, number>,
    B: Record<KPI, number>,
    movers: Mover[],
  ) => {
    const bullets: string[] = []
    const revVar = A.revenue - B.revenue
    if (B.revenue !== 0)
      bullets.push(
        `Revenue ${revVar >= 0 ? "up" : "down"} ${Math.abs(
          (revVar / B.revenue) * 100,
        ).toFixed(1)}%`,
      )
    const opVar = A.opex - B.opex
    if (B.opex !== 0)
      bullets.push(
        `OpEx ${opVar >= 0 ? "up" : "down"} ${Math.abs(
          (opVar / B.opex) * 100,
        ).toFixed(1)}%`,
      )
    if (movers[0])
      bullets.push(
        `${movers[0].account} moved ${formatCurrency(movers[0].variance)}`,
      )
    setSummary(bullets.slice(0, 3))
  }

  const exportCSV = () => {
    const rows = [
      ["Account", "A", "B", "Variance", "Variance %"],
      ...topMovers.map((r) => [
        r.account,
        r.A.toFixed(2),
        r.B.toFixed(2),
        r.variance.toFixed(2),
        r.variancePct !== null ? r.variancePct.toFixed(2) : "",
      ]),
    ]
    const csv = rows.map((r) => r.join(",")).join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = "comparative-analysis.csv"
    link.click()
  }

  const kpiData = () => {
    if (!datasetA || !datasetB) return []
    return [
      {
        kpi: "Revenue",
        A: datasetA.kpis.revenue,
        B: datasetB.kpis.revenue,
      },
      { kpi: "COGS", A: datasetA.kpis.cogs, B: datasetB.kpis.cogs },
      {
        kpi: "Gross Profit",
        A: datasetA.kpis.grossProfit,
        B: datasetB.kpis.grossProfit,
      },
      { kpi: "OpEx", A: datasetA.kpis.opex, B: datasetB.kpis.opex },
      {
        kpi: "Net Income",
        A: datasetA.kpis.netIncome,
        B: datasetB.kpis.netIncome,
      },
    ]
  }

  const trendData = () => {
    if (!datasetA || !datasetB) return []
    const map = new Map<string, { date: string; A: number; B: number }>()
    datasetA.timeseries.forEach((d) => {
      map.set(d.date, { date: d.date, A: d[kpiTrend], B: 0 })
    })
    datasetB.timeseries.forEach((d) => {
      const row = map.get(d.date) || { date: d.date, A: 0, B: 0 }
      row.B = d[kpiTrend]
      map.set(d.date, row)
    })
    return Array.from(map.values()).sort((a, b) =>
      a.date.localeCompare(b.date),
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Comparative Analysis</h1>

      {summary.length > 0 && (
        <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
          {summary.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      )}

      {/* Controls */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Mode</label>
            <select
              value={mode}
              onChange={(e) =>
                setMode(e.target.value as "period" | "class")
              }
              className="w-full border rounded p-2 text-sm"
            >
            <option value="period">Period vs Period</option>
            <option value="class">Class vs Class</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Start A</label>
          <input
            type="date"
            value={startA}
            onChange={(e) => setStartA(e.target.value)}
            className="w-full border rounded p-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">End A</label>
          <input
            type="date"
            value={endA}
            onChange={(e) => setEndA(e.target.value)}
            className="w-full border rounded p-2 text-sm"
          />
        </div>
        {mode === "period" && (
          <>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Start B</label>
              <input
                type="date"
                value={startB}
                onChange={(e) => setStartB(e.target.value)}
                className="w-full border rounded p-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">End B</label>
              <input
                type="date"
                value={endB}
                onChange={(e) => setEndB(e.target.value)}
                className="w-full border rounded p-2 text-sm"
              />
            </div>
          </>
        )}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Class/Property A</label>
          <select
            value={propertyA}
            onChange={(e) => setPropertyA(e.target.value)}
            className="w-full border rounded p-2 text-sm"
          >
            {availableProperties.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
        {mode === "class" && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">Class/Property B</label>
            <select
              value={propertyB}
              onChange={(e) => setPropertyB(e.target.value)}
              className="w-full border rounded p-2 text-sm"
            >
              {availableProperties.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button onClick={refresh} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
        <Button variant="outline" onClick={exportCSV} disabled={!topMovers.length}>
          <Download className="h-4 w-4 mr-1" /> Export CSV
        </Button>
      </div>

      {datasetA && datasetB && (
        <>
          {/* KPI cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {(
              [
                {
                  title: "Revenue",
                  key: "revenue",
                },
                { title: "COGS", key: "cogs" },
                { title: "Gross Profit", key: "grossProfit" },
                { title: "OpEx", key: "opex" },
                { title: "Net Income", key: "netIncome" },
              ] as { title: string; key: KPI }[]
            ).map((k) => {
              const A = datasetA.kpis[k.key]
              const B = datasetB.kpis[k.key]
              const variance = A - B
              const pct = B !== 0 ? ((variance / B) * 100).toFixed(1) : "0"
              return (
                <KPICard
                  key={k.key}
                  title={k.title}
                  value={formatCurrency(A)}
                  change={`${variance >= 0 ? "+" : ""}${pct}%`}
                  positive={variance >= 0}
                />
              )
            })}
          </div>

          {/* Bar chart */}
          <Card>
            <CardHeader>
              <CardTitle>KPIs Comparison</CardTitle>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={kpiData()}>
                  <XAxis dataKey="kpi" />
                  <YAxis tickFormatter={(v) => formatCurrency(v)} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Legend />
                  <Bar dataKey="A" fill="#56B6E9" />
                  <Bar dataKey="B" fill="#3A9BD1" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Trend chart */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Trend - {kpiTrend}</CardTitle>
              <select
                value={kpiTrend}
                onChange={(e) => setKpiTrend(e.target.value as KPI)}
                className="border rounded p-1 text-xs"
              >
                <option value="revenue">Revenue</option>
                <option value="cogs">COGS</option>
                <option value="grossProfit">Gross Profit</option>
                <option value="opex">OpEx</option>
                <option value="netIncome">Net Income</option>
              </select>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData()}>
                  <XAxis dataKey="date" />
                  <YAxis tickFormatter={(v) => formatCurrency(v)} />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Legend />
                  <Line type="monotone" dataKey="A" stroke="#56B6E9" />
                  <Line type="monotone" dataKey="B" stroke="#3A9BD1" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Top movers table */}
          <Card>
            <CardHeader>
              <CardTitle>Top Movers</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left">
                    <th className="py-2">Account</th>
                    <th className="py-2">A</th>
                    <th className="py-2">B</th>
                    <th className="py-2">Var $</th>
                    <th className="py-2">Var %</th>
                  </tr>
                </thead>
                <tbody>
                  {topMovers.map((m) => (
                    <tr key={m.account} className="border-t">
                      <td className="py-1">{m.account}</td>
                      <td className="py-1">{formatCurrency(m.A)}</td>
                      <td className="py-1">{formatCurrency(m.B)}</td>
                      <td className="py-1">{formatCurrency(m.variance)}</td>
                      <td className="py-1">
                        {m.variancePct !== null
                          ? `${m.variancePct.toFixed(1)}%`
                          : ""}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

