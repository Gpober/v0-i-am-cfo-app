"use client"

import { useEffect, useMemo, useState } from "react"
import {
  RefreshCw,
  Download,
} from "lucide-react"
import {
  Card,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabaseClient"
import { formatCurrency } from "@/lib/utils"
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import Papa from "papaparse"

type Scope = "All" | "Class" | "Property"

interface KPIRow {
  key: keyof KPISummary
  label: string
  icon: string
  good: boolean
}

interface KPISummary {
  revenue: number
  cogs: number
  grossProfit: number
  operatingExpenses: number
  netIncome: number
}

const KPI_CONFIG: KPIRow[] = [
  { key: "revenue", label: "Revenue", icon: "💵", good: true },
  { key: "cogs", label: "COGS", icon: "📦", good: false },
  { key: "grossProfit", label: "Gross Profit", icon: "📈", good: true },
  { key: "operatingExpenses", label: "Operating Expenses", icon: "🧾", good: false },
  { key: "netIncome", label: "Net Income", icon: "🎯", good: true },
]

const emptySummary: KPISummary = {
  revenue: 0,
  cogs: 0,
  grossProfit: 0,
  operatingExpenses: 0,
  netIncome: 0,
}

const isIncomeAccount = (type: string | null) => {
  const t = type?.toLowerCase() || ""
  return (
    t === "income" ||
    t === "other income" ||
    t.includes("income") ||
    t.includes("revenue")
  )
}

const isExpenseAccount = (type: string | null) => {
  const t = type?.toLowerCase() || ""
  return t === "expense" || t === "other expense" || t.includes("expense")
}

const isCogsAccount = (type: string | null) => {
  const t = type?.toLowerCase() || ""
  return t === "cost of goods sold" || t.includes("cost of goods sold")
}

async function fetchSummary(
  period: { start: string; end: string },
  scope: Scope,
  scopeValue?: string,
): Promise<KPISummary> {
  let query = supabase
    .from("journal_entry_lines")
    .select(
      "account_type, sum_debit:sum(debit), sum_credit:sum(credit)",
      { group: "account_type" },
    )
    .gte("date", period.start)
    .lte("date", period.end)

  if (scope !== "All" && scopeValue) {
    // dataset uses `class` for both class and property
    query = query.eq("class", scopeValue)
  }

  const { data, error } = await query
  if (error || !data) return { ...emptySummary }

  interface AggregateRow {
    account_type: string | null
    sum_debit: number | null
    sum_credit: number | null
  }

  const summary: KPISummary = { ...emptySummary }

  data.forEach((row: AggregateRow) => {
    const debit = Number(row.sum_debit) || 0
    const credit = Number(row.sum_credit) || 0
    if (isIncomeAccount(row.account_type)) {
      summary.revenue += credit - debit
    } else if (isCogsAccount(row.account_type)) {
      summary.cogs += debit - credit
    } else if (isExpenseAccount(row.account_type)) {
      summary.operatingExpenses += debit - credit
    }
  })
  summary.grossProfit = summary.revenue - summary.cogs
  summary.netIncome = summary.grossProfit - summary.operatingExpenses
  return summary
}

export default function ComparativeAnalysisPage() {
  const [periodA, setPeriodA] = useState({ start: "", end: "" })
  const [periodB, setPeriodB] = useState({ start: "", end: "" })
  const [scope, setScope] = useState<Scope>("All")
  const [scopeA, setScopeA] = useState("")
  const [scopeB, setScopeB] = useState("")
  const [options, setOptions] = useState<string[]>([])
  const [dataA, setDataA] = useState<KPISummary | null>(null)
  const [dataB, setDataB] = useState<KPISummary | null>(null)
  const [view, setView] = useState("summary")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (scope === "All") return
    ;(async () => {
      const { data } = await supabase
        .from("journal_entry_lines")
        .select("class")
        .not("class", "is", null)
        .neq("class", "")
        .order("class")
      const set = new Set<string>()
      data?.forEach((r) => set.add(r.class))
      setOptions(Array.from(set))
    })()
  }, [scope])

  const refresh = async () => {
    setLoading(true)
    const [a, b] = await Promise.all([
      fetchSummary(periodA, scope, scopeA),
      fetchSummary(periodB, scope, scopeB),
    ])
    setDataA(a)
    setDataB(b)
    setLoading(false)
  }

  const exportCsv = () => {
    if (!dataA || !dataB) return
    const rows = KPI_CONFIG.map((k) => {
      const a = dataA[k.key]
      const b = dataB[k.key]
      const variance = a - b
      const pct = b !== 0 ? (variance / Math.abs(b)) * 100 : 0
      return {
        KPI: k.label,
        A: a,
        B: b,
        variance,
        variance_pct: pct,
      }
    })
    const csv = Papa.unparse(rows)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "comparative-analysis.csv"
    link.click()
    URL.revokeObjectURL(url)
  }

  const tableData = useMemo(() => {
    if (!dataA || !dataB) return []
    return KPI_CONFIG.map((k) => {
      const a = dataA[k.key]
      const b = dataB[k.key]
      const variance = a - b
      const pct = b !== 0 ? (variance / Math.abs(b)) * 100 : 0
      const positive = k.good ? variance >= 0 : variance <= 0
      return {
        ...k,
        a,
        b,
        variance,
        pct,
        positive,
      }
    }).sort((x, y) => Math.abs(y.variance) - Math.abs(x.variance))
  }, [dataA, dataB])

  const insights = useMemo(() => {
    if (!dataA || !dataB) return []
    return tableData.slice(0, 3).map((row) => ({
      text: `${row.label} ${row.variance >= 0 ? "rose" : "fell"} ${row.pct.toFixed(1)}%`,
      positive: row.positive,
    }))
  }, [tableData, dataA, dataB])

  const chartData = KPI_CONFIG.map((k) => ({
    kpi: k.label,
    A: dataA ? dataA[k.key] : 0,
    B: dataB ? dataB[k.key] : 0,
  }))

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">
          Comparative Analysis – See Who’s Winning
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            className="border rounded-md p-2 text-sm"
            value={periodA.start}
            onChange={(e) =>
              setPeriodA({ ...periodA, start: e.target.value })
            }
            aria-label="Period A start"
          />
          <input
            type="date"
            className="border rounded-md p-2 text-sm"
            value={periodA.end}
            onChange={(e) => setPeriodA({ ...periodA, end: e.target.value })}
            aria-label="Period A end"
          />
          <input
            type="date"
            className="border rounded-md p-2 text-sm"
            value={periodB.start}
            onChange={(e) =>
              setPeriodB({ ...periodB, start: e.target.value })
            }
            aria-label="Period B start"
          />
          <input
            type="date"
            className="border rounded-md p-2 text-sm"
            value={periodB.end}
            onChange={(e) => setPeriodB({ ...periodB, end: e.target.value })}
            aria-label="Period B end"
          />
          <Select value={scope} onValueChange={(v) => setScope(v as Scope)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Scope" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="Class">Class</SelectItem>
              <SelectItem value="Property">Property</SelectItem>
            </SelectContent>
          </Select>
          {scope !== "All" && (
            <>
              <Select value={scopeA} onValueChange={setScopeA}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="A" />
                </SelectTrigger>
                <SelectContent>
                  {options.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={scopeB} onValueChange={setScopeB}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="B" />
                </SelectTrigger>
                <SelectContent>
                  {options.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={exportCsv}
            disabled={!dataA || !dataB}
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs value={view} onValueChange={setView} className="space-y-6">
        <TabsList>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="table">Full Table</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {KPI_CONFIG.map((k) => {
              const a = dataA ? dataA[k.key] : 0
              const b = dataB ? dataB[k.key] : 0
              const variance = a - b
              const pct = b !== 0 ? (variance / Math.abs(b)) * 100 : 0
              const positive = k.good ? variance >= 0 : variance <= 0
              const color = positive ? "text-green-600" : "text-red-600"
              return (
                <Card
                  key={k.key}
                  className="p-4 flex flex-col justify-between"
                >
                  <div className="text-sm text-gray-500 flex items-center gap-2">
                    <span>{k.icon}</span>
                    {k.label}
                  </div>
                  <div className="text-xl font-bold">
                    {dataA ? formatCurrency(a) : "--"}
                  </div>
                  {dataA && dataB ? (
                    <div className={`text-sm ${color}`}>
                      {formatCurrency(variance)} ({pct.toFixed(1)}%)
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400">Variance: --</div>
                  )}
                  <p className="mt-2 text-xs text-gray-500">
                    {k.label} comparison between A & B
                  </p>
                </Card>
              )
            })}
          </div>

          <div className="h-80">
            {dataA && dataB ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="kpi" />
                  <YAxis />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Bar dataKey="A" fill="#56B6E9">
                    <LabelList
                      dataKey="A"
                      position="top"
                      formatter={(v: number) => formatCurrency(v)}
                    />
                  </Bar>
                  <Bar dataKey="B" fill="#3A9BD1">
                    <LabelList
                      dataKey="B"
                      position="top"
                      formatter={(v: number) => formatCurrency(v)}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                Choose two sets to compare
              </div>
            )}
          </div>

          {dataA && dataB ? (
            <ul className="list-disc pl-5 space-y-1">
              {insights.map((i, idx) => (
                <li key={idx} className={i.positive ? "text-green-600" : "text-red-600"}>
                  {i.text}
                  <a href="#" className="ml-2 underline text-blue-600">
                    Drill Down
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <ul className="list-disc pl-5 text-gray-400">
              <li>Run a comparison to see insights</li>
            </ul>
          )}
        </TabsContent>

        <TabsContent value="table">
          {dataA && dataB ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      KPI
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      A
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      B
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Var $
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Var %
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tableData.map((row) => (
                    <tr key={row.key}>
                      <td className="px-4 py-2 whitespace-nowrap flex items-center gap-2">
                        <span>{row.icon}</span>
                        {row.label}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {formatCurrency(row.a)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {formatCurrency(row.b)}
                      </td>
                      <td
                        className={`px-4 py-2 text-right ${row.positive ? "text-green-600" : "text-red-600"}`}
                      >
                        {formatCurrency(row.variance)}
                      </td>
                      <td
                        className={`px-4 py-2 text-right ${row.positive ? "text-green-600" : "text-red-600"}`}
                      >
                        {row.pct.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-gray-400">No data</div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

