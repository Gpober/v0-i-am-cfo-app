"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download, RefreshCw } from "lucide-react";
import * as XLSX from "xlsx";

interface LineItem {
  date: string;
  account: string;
  account_type: string;
  class: string | null;
  debit: string | number | null;
  credit: string | number | null;
}

interface KPISet {
  revenue: number;
  cogs: number;
  grossProfit: number;
  opEx: number;
  netIncome: number;
}

interface VarianceRow {
  account: string;
  a: number;
  b: number;
  variance: number;
  variancePct: number | null;
}

type ComparisonMode = "period" | "scope";

type DailyMap = Record<string, KPISet>;

const formatCurrency = (v: number) =>
  v.toLocaleString("en-US", { style: "currency", currency: "USD" });

const emptyKpis: KPISet = {
  revenue: 0,
  cogs: 0,
  grossProfit: 0,
  opEx: 0,
  netIncome: 0,
};

const kpiKeys: { key: keyof KPISet; label: string }[] = [
  { key: "revenue", label: "Revenue" },
  { key: "cogs", label: "COGS" },
  { key: "grossProfit", label: "Gross Profit" },
  { key: "opEx", label: "OpEx" },
  { key: "netIncome", label: "Net Income" },
];

const categorize = (type: string, name: string): keyof KPISet | null => {
  const t = type?.toLowerCase() || "";
  const n = name?.toLowerCase() || "";
  if (t.includes("income") || t.includes("revenue")) return "revenue";
  if (t.includes("cost of goods") || n.includes("cogs")) return "cogs";
  if (t.includes("expense")) return "opEx";
  return null;
};

const diff = (a: number, b: number) => ({
  amount: b - a,
  pct: a === 0 ? null : ((b - a) / Math.abs(a)) * 100,
});

export default function ComparativeAnalysisPage() {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    .toISOString()
    .slice(0, 10);

  const [mode, setMode] = useState<ComparisonMode>("period");
  const [startA, setStartA] = useState(monthStart);
  const [endA, setEndA] = useState(monthEnd);
  const [startB, setStartB] = useState(monthStart);
  const [endB, setEndB] = useState(monthEnd);
  const [scopeA, setScopeA] = useState("All");
  const [scopeB, setScopeB] = useState("All");
  const [scopeOptions, setScopeOptions] = useState<string[]>([]);

  const [kpiA, setKpiA] = useState<KPISet>(emptyKpis);
  const [kpiB, setKpiB] = useState<KPISet>(emptyKpis);
  const [variance, setVariance] = useState<Record<keyof KPISet, { amount: number; pct: number | null }>>();
  const [varianceRows, setVarianceRows] = useState<VarianceRow[]>([]);
  const [dailyA, setDailyA] = useState<DailyMap>({});
  const [dailyB, setDailyB] = useState<DailyMap>({});
  const [selectedKpi, setSelectedKpi] = useState<keyof KPISet>("revenue");

  const [loading, setLoading] = useState(false);

  const loadScopes = async () => {
    const { data } = await supabase
      .from("journal_entry_lines")
      .select("class")
      .not("class", "is", null);
    const opts = Array.from(new Set((data || []).map((d) => d.class as string))).sort();
    setScopeOptions(["All", ...opts]);
  };

  useEffect(() => {
    loadScopes();
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPL = async (
    start: string,
    end: string,
    scope: string,
  ): Promise<{ totals: KPISet; accounts: Record<string, number>; daily: DailyMap }> => {
    let query = supabase
      .from("journal_entry_lines")
      .select("date, account, account_type, debit, credit, class")
      .gte("date", start)
      .lte("date", end);
    if (scope !== "All") query = query.eq("class", scope);
    const { data, error } = await query;
    if (error) throw error;

    const totals: KPISet = { ...emptyKpis };
    const accounts: Record<string, number> = {};
    const daily: DailyMap = {};

    (data as LineItem[]).forEach((row) => {
      const category = categorize(row.account_type, row.account);
      if (!category) return;
      const debit = Number(row.debit) || 0;
      const credit = Number(row.credit) || 0;
      const amount = category === "revenue" ? credit - debit : debit - credit;

      totals[category] += amount;
      const day = row.date.split("T")[0];
      if (!daily[day]) daily[day] = { ...emptyKpis };
      daily[day][category] += amount;
      accounts[row.account] = (accounts[row.account] || 0) + amount;
    });

    totals.grossProfit = totals.revenue - totals.cogs;
    totals.netIncome = totals.grossProfit - totals.opEx;

    Object.values(daily).forEach((d) => {
      d.grossProfit = d.revenue - d.cogs;
      d.netIncome = d.grossProfit - d.opEx;
    });

    return { totals, accounts, daily };
  };

  const computeVarianceRows = (
    a: Record<string, number>,
    b: Record<string, number>,
  ): VarianceRow[] => {
    const all = new Set([...Object.keys(a), ...Object.keys(b)]);
    return Array.from(all)
      .map((acc) => {
        const va = a[acc] || 0;
        const vb = b[acc] || 0;
        const v = vb - va;
        const pct = va === 0 ? null : (v / Math.abs(va)) * 100;
        return { account: acc, a: va, b: vb, variance: v, variancePct: pct };
      })
      .sort((x, y) => Math.abs(y.variance) - Math.abs(x.variance));
  };

  const buildTrend = (
    da: DailyMap,
    db: DailyMap,
    key: keyof KPISet,
  ) => {
    const all = new Set([...Object.keys(da), ...Object.keys(db)]);
    return Array.from(all)
      .sort()
      .map((date) => ({
        date,
        A: da[date]?.[key] || 0,
        B: db[date]?.[key] || 0,
      }));
  };

  const refresh = async () => {
    setLoading(true);
    try {
      const rangeA = { start: startA, end: endA };
      const rangeB =
        mode === "period" ? { start: startB, end: endB } : { start: startA, end: endA };
      const scope1 = scopeA;
      const scope2 = mode === "period" ? scopeA : scopeB;

      const [dataA, dataB] = await Promise.all([
        fetchPL(rangeA.start, rangeA.end, scope1),
        fetchPL(rangeB.start, rangeB.end, scope2),
      ]);

      setKpiA(dataA.totals);
      setKpiB(dataB.totals);
      setVarianceRows(computeVarianceRows(dataA.accounts, dataB.accounts));
      setDailyA(dataA.daily);
      setDailyB(dataB.daily);
      setVariance({
        revenue: diff(dataA.totals.revenue, dataB.totals.revenue),
        cogs: diff(dataA.totals.cogs, dataB.totals.cogs),
        grossProfit: diff(dataA.totals.grossProfit, dataB.totals.grossProfit),
        opEx: diff(dataA.totals.opEx, dataB.totals.opEx),
        netIncome: diff(dataA.totals.netIncome, dataB.totals.netIncome),
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };
  const trendData = useMemo(
    () => buildTrend(dailyA, dailyB, selectedKpi),
    [dailyA, dailyB, selectedKpi],
  );

  const summaryBullets = useMemo(() => {
    if (!variance) return [];
    const bullets: string[] = [];
    ["revenue", "opEx", "netIncome"].forEach((k) => {
      const key = k as keyof KPISet;
      const v = variance[key];
      if (!v) return;
      const label = k === "opEx" ? "OpEx" : k === "netIncome" ? "Net Income" : "Revenue";
      if (v.pct === null) return;
      bullets.push(
        `${label} ${v.pct > 0 ? "up" : "down"} ${Math.abs(v.pct).toFixed(1)}% (${formatCurrency(
          v.amount,
        )})`,
      );
    });
    return bullets.slice(0, 3);
  }, [variance]);

  const exportCSV = () => {
    if (!variance) return;
    const kpiData = [
      ["KPI", "A", "B", "Var $", "Var %"],
      ...kpiKeys.map(({ key, label }) => [
        label,
        kpiA[key],
        kpiB[key],
        variance[key].amount,
        variance[key].pct ?? "",
      ]),
    ];
    const plData = [
      [],
      ["Account", "A", "B", "Var $", "Var %"],
      ...varianceRows.map((r) => [
        r.account,
        r.a,
        r.b,
        r.variance,
        r.variancePct ?? "",
      ]),
    ];
    const ws = XLSX.utils.aoa_to_sheet([...kpiData, ...plData]);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "comparative-analysis.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader className="space-y-4">
          <CardTitle>Comparative Analysis</CardTitle>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="text-sm font-medium">Mode</label>
              <Select value={mode} onValueChange={(v) => setMode(v as ComparisonMode)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="period">Period vs Period</SelectItem>
                  <SelectItem value="scope">Class/Property vs Class/Property</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {mode === "period" ? (
              <>
                <div>
                  <label className="text-sm font-medium">Start A</label>
                  <input
                    type="date"
                    value={startA}
                    onChange={(e) => setStartA(e.target.value)}
                    className="border rounded-md p-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">End A</label>
                  <input
                    type="date"
                    value={endA}
                    onChange={(e) => setEndA(e.target.value)}
                    className="border rounded-md p-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Start B</label>
                  <input
                    type="date"
                    value={startB}
                    onChange={(e) => setStartB(e.target.value)}
                    className="border rounded-md p-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">End B</label>
                  <input
                    type="date"
                    value={endB}
                    onChange={(e) => setEndB(e.target.value)}
                    className="border rounded-md p-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Scope</label>
                  <Select value={scopeA} onValueChange={setScopeA}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {scopeOptions.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="text-sm font-medium">Start</label>
                  <input
                    type="date"
                    value={startA}
                    onChange={(e) => setStartA(e.target.value)}
                    className="border rounded-md p-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">End</label>
                  <input
                    type="date"
                    value={endA}
                    onChange={(e) => setEndA(e.target.value)}
                    className="border rounded-md p-2"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Scope A</label>
                  <Select value={scopeA} onValueChange={setScopeA}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {scopeOptions.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">Scope B</label>
                  <Select value={scopeB} onValueChange={setScopeB}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {scopeOptions.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div className="flex gap-2 ml-auto">
              <Button onClick={refresh} className="flex items-center" disabled={loading}>
                <RefreshCw className="w-4 h-4 mr-2" /> Refresh
              </Button>
              <Button onClick={exportCSV} className="flex items-center" disabled={loading}>
                <Download className="w-4 h-4 mr-2" /> Export CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        {variance && (
          <CardContent className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-2">AI Summary</h3>
              <ul className="list-disc pl-5 space-y-1 text-sm">
                {summaryBullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left p-2">KPI</th>
                    <th className="text-right p-2">A</th>
                    <th className="text-right p-2">B</th>
                    <th className="text-right p-2">Var $</th>
                    <th className="text-right p-2">Var %</th>
                  </tr>
                </thead>
                <tbody>
                  {kpiKeys.map(({ key, label }) => (
                    <tr key={key} className="border-b">
                      <td className="p-2">{label}</td>
                      <td className="p-2 text-right">{formatCurrency(kpiA[key])}</td>
                      <td className="p-2 text-right">{formatCurrency(kpiB[key])}</td>
                      <td className="p-2 text-right">
                        {formatCurrency(variance[key].amount)}
                      </td>
                      <td className="p-2 text-right">
                        {variance[key].pct === null
                          ? "-"
                          : `${variance[key].pct.toFixed(1)}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={kpiKeys.map(({ key, label }) => ({
                    name: label,
                    A: kpiA[key],
                    B: kpiB[key],
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                  <Legend />
                  <Bar dataKey="A" fill="#56B6E9" />
                  <Bar dataKey="B" fill="#F39C12" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            {trendData.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">
                    Trend - {kpiKeys.find((k) => k.key === selectedKpi)?.label}
                  </h3>
                  <Select
                    value={selectedKpi}
                    onValueChange={(v) => setSelectedKpi(v as keyof KPISet)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {kpiKeys.map((k) => (
                        <SelectItem key={k.key} value={k.key}>
                          {k.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                      <Legend />
                      <Line type="monotone" dataKey="A" stroke="#56B6E9" />
                      <Line type="monotone" dataKey="B" stroke="#F39C12" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
            <div className="overflow-auto">
              <h3 className="text-lg font-semibold mb-2">
                P&L by Absolute Variance
              </h3>
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-left p-2">Account</th>
                    <th className="text-right p-2">A</th>
                    <th className="text-right p-2">B</th>
                    <th className="text-right p-2">Var $</th>
                    <th className="text-right p-2">Var %</th>
                  </tr>
                </thead>
                <tbody>
                  {varianceRows.map((r) => (
                    <tr key={r.account} className="border-b">
                      <td className="p-2">{r.account}</td>
                      <td className="p-2 text-right">{formatCurrency(r.a)}</td>
                      <td className="p-2 text-right">{formatCurrency(r.b)}</td>
                      <td className="p-2 text-right">{formatCurrency(r.variance)}</td>
                      <td className="p-2 text-right">
                        {r.variancePct === null
                          ? "-"
                          : `${r.variancePct.toFixed(1)}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

