"use client";

import React, { useState, useEffect } from "react";
import {
  RefreshCw,
  Download,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import {
  BarChart as ReBarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

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
    300: "#CBD5E1",
    400: "#94A3B8",
    500: "#64748B",
    600: "#475569",
    700: "#334155",
    800: "#1E293B",
    900: "#0F172A",
  },
};

interface Summary {
  revenue: number;
  cogs: number;
  grossProfit: number;
  opEx: number;
  netIncome: number;
}

interface SeriesPoint extends Summary {
  date: string;
}

type Mode = "period" | "property";
type KPIKey = keyof Summary;

const displayNames: Record<KPIKey, string> = {
  revenue: "Revenue",
  cogs: "COGS",
  grossProfit: "Gross Profit",
  opEx: "OpEx",
  netIncome: "Net Income",
};

const classifyPLAccount = (
  accountType: string,
  reportCategory: string,
): "REVENUE" | "COGS" | "OPEX" | null => {
  const type = accountType?.toLowerCase() || "";
  const cat = reportCategory?.toLowerCase() || "";
  if (type.includes("income")) return "REVENUE";
  if (type.includes("cost of goods")) return "COGS";
  if (type.includes("expense")) return "OPEX";
  if (cat.includes("cogs")) return "COGS";
  return null;
};

const aggregateSeries = (series: SeriesPoint[], granularity: "daily" | "weekly") => {
  if (granularity === "daily") return series;
  const grouped: Record<string, Summary> = {};
  series.forEach((pt) => {
    const dateObj = new Date(pt.date);
    const year = dateObj.getFullYear();
    const firstDay = new Date(year, 0, 1);
    const pastDays =
      (dateObj.getTime() - firstDay.getTime()) / 86400000 + firstDay.getDay();
    const week = Math.floor(pastDays / 7) + 1;
    const key = `${year}-W${String(week).padStart(2, "0")}`;
    if (!grouped[key]) {
      grouped[key] = {
        revenue: 0,
        cogs: 0,
        grossProfit: 0,
        opEx: 0,
        netIncome: 0,
      };
    }
    grouped[key].revenue += pt.revenue;
    grouped[key].cogs += pt.cogs;
    grouped[key].grossProfit += pt.grossProfit;
    grouped[key].opEx += pt.opEx;
    grouped[key].netIncome += pt.netIncome;
  });
  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({ date, ...vals }));
};

const formatCurrency = (n: number) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD" });

export default function ComparativeAnalysisPage() {
  const [mode, setMode] = useState<Mode>("period");
  const [startA, setStartA] = useState("2025-01-01");
  const [endA, setEndA] = useState("2025-01-31");
  const [startB, setStartB] = useState("2025-02-01");
  const [endB, setEndB] = useState("2025-02-28");
  const [propA, setPropA] = useState("All Properties");
  const [propB, setPropB] = useState("All Properties");
  const [properties, setProperties] = useState<string[]>([]);
  const [summaryA, setSummaryA] = useState<Summary | null>(null);
  const [summaryB, setSummaryB] = useState<Summary | null>(null);
  const [seriesA, setSeriesA] = useState<SeriesPoint[]>([]);
  const [seriesB, setSeriesB] = useState<SeriesPoint[]>([]);
  const [selectedKPI, setSelectedKPI] = useState<KPIKey>("revenue");
  const [granularity, setGranularity] = useState<"daily" | "weekly">("daily");

  useEffect(() => {
    const fetchProps = async () => {
      const { data } = await supabase
        .from<{ class: string | null }>("journal_entry_lines")
        .select("class")
        .not("class", "is", null);
      const props = Array.from(new Set((data ?? []).map((d) => d.class))).sort();
      setProperties(["All Properties", ...props]);
    };
    fetchProps();
  }, []);

  interface Entry {
    date: string;
    class: string | null;
    account_type: string;
    debit: number | null;
    credit: number | null;
    report_category: string | null;
  }

  const fetchSummary = async (
    rangeStart: string,
    rangeEnd: string,
    property: string,
  ) => {
    let query = supabase
      .from<Entry>("journal_entry_lines")
      .select("date, class, account_type, debit, credit, report_category")
      .gte("date", rangeStart)
      .lte("date", rangeEnd);
    if (property !== "All Properties") {
      query = query.eq("class", property);
    }
    const { data, error } = await query;
    if (error) throw error;

    let revenue = 0;
    let cogs = 0;
    let opEx = 0;
    const daily: Record<string, Summary> = {};

    (data ?? []).forEach((tx) => {
      const classification = classifyPLAccount(
        tx.account_type,
        tx.report_category || "",
      );
      if (!classification) return;
      const debit = Number(tx.debit) || 0;
      const credit = Number(tx.credit) || 0;
      const date = tx.date.split("T")[0];
      if (!daily[date]) {
        daily[date] = {
          revenue: 0,
          cogs: 0,
          grossProfit: 0,
          opEx: 0,
          netIncome: 0,
        };
      }
      if (classification === "REVENUE") {
        const val = credit - debit;
        revenue += val;
        daily[date].revenue += val;
      } else if (classification === "COGS") {
        const val = debit - credit;
        cogs -= val;
        daily[date].cogs -= val;
      } else if (classification === "OPEX") {
        const val = debit - credit;
        opEx -= val;
        daily[date].opEx -= val;
      }
    });

    Object.values(daily).forEach((d) => {
      d.grossProfit = d.revenue + d.cogs;
      d.netIncome = d.grossProfit + d.opEx;
    });

    const series = Object.entries(daily)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({ date, ...vals } as SeriesPoint));

    const summary: Summary = {
      revenue,
      cogs,
      grossProfit: revenue + cogs,
      opEx,
      netIncome: revenue + cogs + opEx,
    };
    return { summary, series };
  };

  const loadData = async () => {
    setLoading(true);
    try {
      let resA, resB;
      if (mode === "period") {
        resA = await fetchSummary(startA, endA, propA);
        resB = await fetchSummary(startB, endB, propA);
      } else {
        resA = await fetchSummary(startA, endA, propA);
        resB = await fetchSummary(startA, endA, propB);
      }
      setSummaryA(resA.summary);
      setSummaryB(resB.summary);
      setSeriesA(resA.series);
      setSeriesB(resB.series);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const exportCSV = () => {
    if (!summaryA || !summaryB) return;
    const headers = ["KPI", "A", "B", "Variance", "Variance %"];
    const keys: KPIKey[] = [
      "revenue",
      "cogs",
      "grossProfit",
      "opEx",
      "netIncome",
    ];
    const rows = keys.map((k) => {
      const a = summaryA[k];
      const b = summaryB[k];
      const variance = a - b;
      const variancePct = b !== 0 ? (variance / Math.abs(b)) * 100 : 0;
      return [
        displayNames[k],
        a.toFixed(2),
        b.toFixed(2),
        variance.toFixed(2),
        `${variancePct.toFixed(1)}%`,
      ];
    });
    const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "comparative-analysis.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const barData = [
    "revenue",
    "cogs",
    "grossProfit",
    "opEx",
    "netIncome",
  ].map((k) => ({
    name: displayNames[k as KPIKey],
    A: summaryA ? summaryA[k as KPIKey] : 0,
    B: summaryB ? summaryB[k as KPIKey] : 0,
  }));

  const sourceA = aggregateSeries(seriesA, granularity);
  const sourceB = aggregateSeries(seriesB, granularity);
  const lineData = sourceA.map((d, i) => ({
    name: d.date,
    A: d[selectedKPI],
    B: sourceB[i] ? sourceB[i][selectedKPI] : 0,
  }));

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-center mb-6">
        Comparative Analysis
      </h1>
      <div className="flex flex-wrap items-end justify-center gap-4 mb-8">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Mode
          </label>
          <select
            className="mt-1 block rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
          >
            <option value="period">Period vs Period</option>
            <option value="property">Property vs Property</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Start A
          </label>
          <input
            type="date"
            className="mt-1 block rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={startA}
            onChange={(e) => setStartA(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">
            End A
          </label>
          <input
            type="date"
            className="mt-1 block rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={endA}
            onChange={(e) => setEndA(e.target.value)}
          />
        </div>
        {mode === "period" && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Start B
              </label>
              <input
                type="date"
                className="mt-1 block rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={startB}
                onChange={(e) => setStartB(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                End B
              </label>
              <input
                type="date"
                className="mt-1 block rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={endB}
                onChange={(e) => setEndB(e.target.value)}
              />
            </div>
          </>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            {mode === "property" ? "Property A" : "Property"}
          </label>
          <select
            className="mt-1 block rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            value={propA}
            onChange={(e) => setPropA(e.target.value)}
          >
            {properties.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
        {mode === "property" && (
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Property B
            </label>
            <select
              className="mt-1 block rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={propB}
              onChange={(e) => setPropB(e.target.value)}
            >
              {properties.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
        )}
        <button
          onClick={loadData}
          className="inline-flex items-center rounded bg-blue-600 px-4 py-2 font-semibold text-white shadow hover:bg-blue-700"
        >
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </button>
        <button
          onClick={exportCSV}
          className="inline-flex items-center rounded bg-green-600 px-4 py-2 font-semibold text-white shadow hover:bg-green-700"
        >
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </button>
      </div>

      {summaryA && summaryB && (
        <div className="space-y-8">
          <h2 className="text-xl font-semibold text-center">
            P&L Variance analysis amount & % between the periods
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 rounded bg-white">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-medium text-gray-500">
                    KPI
                  </th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">
                    A
                  </th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">
                    B
                  </th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">
                    Variance ($)
                  </th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-gray-500">
                    Variance (%)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {["revenue", "cogs", "grossProfit", "opEx", "netIncome"].map(
                  (k) => {
                    const key = k as KPIKey;
                    const a = summaryA[key];
                    const b = summaryB[key];
                    const variance = a - b;
                    const variancePct =
                      b !== 0 ? (variance / Math.abs(b)) * 100 : 0;
                    return (
                      <tr key={k}>
                        <td className="px-4 py-2 text-sm text-gray-700">
                          {displayNames[key]}
                        </td>
                        <td className="px-4 py-2 text-right text-sm text-gray-700">
                          {formatCurrency(a)}
                        </td>
                        <td className="px-4 py-2 text-right text-sm text-gray-700">
                          {formatCurrency(b)}
                        </td>
                        <td className="px-4 py-2 text-right text-sm text-gray-700">
                          {formatCurrency(variance)}
                        </td>
                        <td className="px-4 py-2 text-right text-sm text-gray-700">
                          {variancePct.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer>
              <ReBarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="A" fill={BRAND_COLORS.primary} />
                <Bar dataKey="B" fill={BRAND_COLORS.secondary} />
              </ReBarChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-4">
            <div className="flex justify-center gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  KPI
                </label>
                <select
                  className="mt-1 block rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={selectedKPI}
                  onChange={(e) => setSelectedKPI(e.target.value as KPIKey)}
                >
                  {Object.entries(displayNames).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Interval
                </label>
                <select
                  className="mt-1 block rounded border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={granularity}
                  onChange={(e) =>
                    setGranularity(e.target.value as "daily" | "weekly")
                  }
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>
            </div>
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <LineChart data={lineData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="A"
                    stroke={BRAND_COLORS.primary}
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="B"
                    stroke={BRAND_COLORS.secondary}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

