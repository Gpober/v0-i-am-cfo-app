"use client"

import React, { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import {
  BarChart as ReBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type KPIs = {
  revenue: number
  cogs: number
  grossProfit: number
  opEx: number
  netIncome: number
}

export default function ComparativeAnalysisPage() {
  const [mode, setMode] = useState<"period" | "class">("period")
  const [startA, setStartA] = useState("")
  const [endA, setEndA] = useState("")
  const [startB, setStartB] = useState("")
  const [endB, setEndB] = useState("")
  const [classA, setClassA] = useState("All Properties")
  const [classB, setClassB] = useState("All Properties")
  const [classes, setClasses] = useState<string[]>([])
  const [dataA, setDataA] = useState<KPIs | null>(null)
  const [dataB, setDataB] = useState<KPIs | null>(null)
  const [varianceRows, setVarianceRows] = useState<any[]>([])
  const [lineData, setLineData] = useState<any[]>([])
  const [selectedKpi, setSelectedKpi] = useState<keyof KPIs>("revenue")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchClasses()
  }, [])

  const fetchClasses = async () => {
    const { data } = await supabase
      .from("journal_entry_lines")
      .select("class")
    if (data) {
      const unique = Array.from(
        new Set(
          data
            .map((d) => d.class)
            .filter((c) => c && c.trim())
            .map((c) => c.trim()),
        ),
      )
      setClasses(["All Properties", ...unique])
    }
  }

  const fetchLines = async (
    start: string,
    end: string,
    property?: string,
  ) => {
    let query = supabase
      .from("journal_entry_lines")
      .select("account, account_type, debit, credit, class, date")
      .gte("date", start)
      .lte("date", end)

    if (property && property !== "All Properties") {
      query = query.eq("class", property)
    }

    const { data, error } = await query
    if (error) throw error
    return data || []
  }

  const computeKPIs = (lines: any[]): KPIs => {
    let revenue = 0,
      cogs = 0,
      opEx = 0
    lines.forEach((l) => {
      const amount =
        (Number(l.credit) || 0) - (Number(l.debit) || 0)
      const type = (l.account_type || "").toLowerCase()
      if (type.includes("income") || type.includes("revenue")) {
        revenue += amount
      } else if (type.includes("cost of goods sold")) {
        cogs += amount
      } else if (type.includes("expense")) {
        opEx += amount
      }
    })
    const grossProfit = revenue + cogs
    const netIncome = grossProfit + opEx
    return { revenue, cogs, grossProfit, opEx, netIncome }
  }

  const aggregateDaily = (lines: any[], kpi: keyof KPIs) => {
    const map = new Map<string, number>()
    lines.forEach((l) => {
      const date = l.date.slice(0, 10)
      const amount =
        (Number(l.credit) || 0) - (Number(l.debit) || 0)
      const type = (l.account_type || "").toLowerCase()
      let include = false
      if (
        kpi === "revenue" &&
        (type.includes("income") || type.includes("revenue"))
      )
        include = true
      else if (kpi === "cogs" && type.includes("cost of goods sold"))
        include = true
      else if (
        kpi === "opEx" &&
        type.includes("expense") &&
        !type.includes("cost of goods sold")
      )
        include = true
      else if (kpi === "grossProfit") include = true
      else if (kpi === "netIncome") include = true

      if (include) {
        map.set(date, (map.get(date) || 0) + amount)
      }
    })
    return map
  }

  const computeVarianceTable = (linesA: any[], linesB: any[]) => {
    const map = new Map<
      string,
      { account: string; a: number; b: number }
    >()
    linesA.forEach((l) => {
      const amount =
        (Number(l.credit) || 0) - (Number(l.debit) || 0)
      const key = l.account
      const existing = map.get(key) || { account: key, a: 0, b: 0 }
      existing.a += amount
      map.set(key, existing)
    })
    linesB.forEach((l) => {
      const amount =
        (Number(l.credit) || 0) - (Number(l.debit) || 0)
      const key = l.account
      const existing = map.get(key) || { account: key, a: 0, b: 0 }
      existing.b += amount
      map.set(key, existing)
    })
    const rows = Array.from(map.values()).map((r) => ({
      ...r,
      var: r.a - r.b,
      varPct: r.b ? (r.a - r.b) / Math.abs(r.b) : null,
    }))
    rows.sort((a, b) => Math.abs(b.var) - Math.abs(a.var))
    return rows
  }

  const buildLineData = (
    linesA: any[],
    linesB: any[],
    kpi: keyof KPIs,
  ) => {
    const mapA = aggregateDaily(linesA, kpi)
    const mapB = aggregateDaily(linesB, kpi)
    const dates = Array.from(new Set([...mapA.keys(), ...mapB.keys()])).sort()
    return dates.map((d) => ({
      date: d,
      A: mapA.get(d) || 0,
      B: mapB.get(d) || 0,
    }))
  }

  const fetchData = async () => {
    if (mode === "period" && (!startA || !endA || !startB || !endB)) return
    if (mode === "class" && (!startA || !endA)) return

    setLoading(true)
    setError(null)
    try {
      const [linesA, linesB] = await Promise.all([
        fetchLines(startA, endA, mode === "class" ? classA : undefined),
        fetchLines(
          mode === "period" ? startB : startA,
          mode === "period" ? endB : endA,
          mode === "class" ? classB : undefined,
        ),
      ])
      const kpiA = computeKPIs(linesA)
      const kpiB = computeKPIs(linesB)
      setDataA(kpiA)
      setDataB(kpiB)
      setVarianceRows(computeVarianceTable(linesA, linesB))
      setLineData(buildLineData(linesA, linesB, selectedKpi))
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const barChartData =
    dataA && dataB
      ? [
          { kpi: "Revenue", A: dataA.revenue, B: dataB.revenue },
          { kpi: "COGS", A: dataA.cogs, B: dataB.cogs },
          {
            kpi: "Gross Profit",
            A: dataA.grossProfit,
            B: dataB.grossProfit,
          },
          { kpi: "OpEx", A: dataA.opEx, B: dataB.opEx },
          {
            kpi: "Net Income",
            A: dataA.netIncome,
            B: dataB.netIncome,
          },
        ]
      : []

  const percent = (diff: number, base: number) => {
    if (!base) return 0
    return (diff / Math.abs(base)) * 100
  }

  const summaryBullets = () => {
    if (!dataA || !dataB) return []
    const bullets = []
    const revPct = percent(dataA.revenue - dataB.revenue, dataB.revenue)
    if (revPct)
      bullets.push(
        `Revenue ${revPct > 0 ? "up" : "down"} ${Math.abs(revPct).toFixed(
          1,
        )}%`,
      )
    const opPct = percent(dataA.opEx - dataB.opEx, dataB.opEx)
    if (opPct)
      bullets.push(
        `OpEx ${opPct > 0 ? "up" : "down"} ${Math.abs(opPct).toFixed(1)}%`,
      )
    const netPct = percent(
      dataA.netIncome - dataB.netIncome,
      dataB.netIncome,
    )
    if (netPct)
      bullets.push(
        `Net Income ${netPct > 0 ? "up" : "down"} ${Math.abs(netPct).toFixed(
          1,
        )}%`,
      )
    return bullets.slice(0, 3)
  }

  const handleExport = () => {
    const header = "Account,A,B,Var $,Var %\n"
    const rows = varianceRows
      .map((r) =>
        [
          r.account,
          r.a.toFixed(2),
          r.b.toFixed(2),
          r.var.toFixed(2),
          r.varPct !== null ? (r.varPct * 100).toFixed(2) + "%" : "",
        ].join(","),
      )
      .join("\n")
    const csv = header + rows
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "comparative-analysis.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  const summary = summaryBullets()

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold mb-2">Comparative Analysis</h1>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col">
          <label className="text-sm text-gray-700 mb-1">Mode</label>
          <Select value={mode} onValueChange={(v) => setMode(v as any)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="period">Period vs Period</SelectItem>
              <SelectItem value="class">Class vs Class</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col">
          <label className="text-sm text-gray-700 mb-1">Start A</label>
          <input
            type="date"
            value={startA}
            onChange={(e) => setStartA(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-gray-700 mb-1">End A</label>
          <input
            type="date"
            value={endA}
            onChange={(e) => setEndA(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          />
        </div>

        {mode === "period" && (
          <>
            <div className="flex flex-col">
              <label className="text-sm text-gray-700 mb-1">Start B</label>
              <input
                type="date"
                value={startB}
                onChange={(e) => setStartB(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-gray-700 mb-1">End B</label>
              <input
                type="date"
                value={endB}
                onChange={(e) => setEndB(e.target.value)}
                className="border rounded px-2 py-1 text-sm"
              />
            </div>
          </>
        )}

        {mode === "class" && (
          <>
            <div className="flex flex-col">
              <label className="text-sm text-gray-700 mb-1">Class A</label>
              <Select value={classA} onValueChange={(v) => setClassA(v)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col">
              <label className="text-sm text-gray-700 mb-1">Class B</label>
              <Select value={classB} onValueChange={(v) => setClassB(v)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        <Button onClick={fetchData} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </Button>
        <Button onClick={handleExport} variant="outline">
          Export CSV
        </Button>
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      {summary.length > 0 && (
        <div className="bg-gray-50 p-4 rounded-md">
          {summary.map((s, idx) => (
            <p key={idx} className="text-sm text-gray-700">
              • {s}
            </p>
          ))}
        </div>
      )}

      {barChartData.length > 0 && (
        <div className="w-full h-64">
          <ResponsiveContainer>
            <ReBarChart data={barChartData}>
              <XAxis dataKey="kpi" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="A" fill="#56B6E9" />
              <Bar dataKey="B" fill="#94A3B8" />
            </ReBarChart>
          </ResponsiveContainer>
        </div>
      )}

      {lineData.length > 0 && (
        <div className="w-full h-64">
          <ResponsiveContainer>
            <LineChart data={lineData}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="A" stroke="#56B6E9" />
              <Line type="monotone" dataKey="B" stroke="#94A3B8" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {varianceRows.length > 0 && (
        <div className="overflow-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Account
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  A
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  B
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  Var $
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                  Var %
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {varianceRows.map((r) => (
                <tr key={r.account}>
                  <td className="px-4 py-2 text-sm text-gray-700">
                    {r.account}
                  </td>
                  <td className="px-4 py-2 text-sm text-right">
                    {r.a.toLocaleString(undefined, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </td>
                  <td className="px-4 py-2 text-sm text-right">
                    {r.b.toLocaleString(undefined, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </td>
                  <td className="px-4 py-2 text-sm text-right">
                    {r.var.toLocaleString(undefined, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </td>
                  <td className="px-4 py-2 text-sm text-right">
                    {r.varPct !== null
                      ? (r.varPct * 100).toFixed(1) + "%"
                      : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

