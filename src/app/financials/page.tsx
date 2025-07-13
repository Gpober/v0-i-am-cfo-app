"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ArrowUp,
  ArrowDown,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  BarChart3,
  PieChart,
  DollarSign,
  TrendingUp,
} from "lucide-react";
import dayjs from "dayjs";
import Papa from "papaparse";
import { createClient } from '@supabase/supabase-js';

// ====== SUPABASE CLIENT INIT ======
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ijeuusvwqcnljctkvjdi.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "YOUR_SUPABASE_ANON_KEY";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ====== CONFIGURATION ======
const BRAND_COLORS = {
  primary: "#56B6E9",
  secondary: "#3A9BD1",
  warning: "#F39C12",
  success: "#27AE60",
  gray: { 50: "#F8FAFC" },
};

// ... [rest of the imports and types remain the same] ...

// ====== DATA FETCHING HELPERS ======
async function fetchCOA(): Promise<AccountCOA[]> {
  const { data, error } = await supabase
    .from('accounts')
    .select('account_name, account_type');
  
  if (error) throw new Error("Failed to fetch COA: " + error.message);
  return data || [];
}

async function fetchJournalEntries({
  startDate,
  endDate,
  properties,
  bankAccounts,
}: {
  startDate: string;
  endDate: string;
  properties?: string[];
  bankAccounts?: string[];
}): Promise<JournalEntry[]> {
  let query = supabase
    .from('journal_entries')
    .select('*')
    .gte('transaction_date', startDate)
    .lte('transaction_date', endDate)
    .order('transaction_date');

  if (properties && properties.length && !properties.includes("All Properties")) {
    query = query.in('property_class', properties);
  }

  if (bankAccounts && bankAccounts.length && !bankAccounts.includes("All Accounts")) {
    query = query.in('account_name', bankAccounts);
  }

  const { data, error } = await query;

  if (error) throw new Error("Failed to fetch Journal Entries: " + error.message);
  return data || [];
}

async function fetchProperties(): Promise<string[]> {
  const { data, error } = await supabase
    .from('journal_entries')
    .select('property_class');

  if (error) return ["All Properties"];
  
const props = Array.from(
  new Set(data.map((d: any) => d.property_class).filter(Boolean))
);

  
  return ["All Properties", ...props];
}

async function fetchBankAccounts(): Promise<string[]> {
  const { data, error } = await supabase
    .from('accounts')
    .select('account_name, account_type')
    .ilike('account_type', '%bank%');

  if (error) return ["All Accounts"];
  
  const banks = data.map((a: any) => a.account_name);
  return ["All Accounts", ...banks];
}

// ... [rest of the code remains exactly the same] ...

// ====== COA PARSING & ACCOUNT TREE ======
function buildAccountTree(
  coa: AccountCOA[],
  entries: JournalEntry[]
): AccountNode[] {
  const root: Record<string, AccountNode> = {};
  const getOrCreate = (path: string[], type: AccountType): AccountNode => {
    let node: AccountNode | undefined;
    let fullName = "";
    let parent: AccountNode | undefined;
    for (let i = 0; i < path.length; ++i) {
      fullName = path.slice(0, i + 1).join(":");
      if (!root[fullName]) {
        root[fullName] = {
          name: path[i],
          fullName,
          type: type,
          children: [],
          entries: [],
          total: 0,
          months: {},
          parent,
        };
        if (parent) parent.children.push(root[fullName]);
      }
      parent = root[fullName];
    }
    return root[fullName];
  };

  for (const acc of coa) {
    const path = acc.account_name.split(":").map((s) => s.trim());
    const type = mapAccountType(acc.account_type);
    getOrCreate(path, type);
  }

  for (const je of entries) {
    let match: AccountNode | undefined;
    let jePath = je.account_name.split(":").map((s) => s.trim());
    while (jePath.length) {
      const tryName = jePath.join(":");
      if (root[tryName]) {
        match = root[tryName];
        break;
      }
      jePath.pop();
    }
    if (!match) {
      for (const key in root) {
        if (
          key.endsWith(je.account_name) ||
          key.split(":").pop() === je.account_name
        ) {
          match = root[key];
          break;
        }
      }
    }
    if (!match) {
      if (!root["Other"]) {
        root["Other"] = {
          name: "Other",
          fullName: "Other",
          type: "Other",
          children: [],
          entries: [],
          total: 0,
          months: {},
        };
      }
      match = root["Other"];
    }
    match.entries.push(je);
  }

  function calcTotals(node: AccountNode) {
    node.total = node.entries.reduce(
      (sum, je) => sum + (je.line_amount ?? je.debit_amount - je.credit_amount),
      0
    );
    node.months = {};
    node.entries.forEach((je) => {
      const m = dayjs(je.transaction_date).format("MMMM YYYY");
      node.months[m] = (node.months[m] || 0) + (je.line_amount ?? je.debit_amount - je.credit_amount);
    });
    node.children.forEach((child) => {
      calcTotals(child);
      node.total += child.total;
      for (const m in child.months) {
        node.months[m] = (node.months[m] || 0) + child.months[m];
      }
    });
  }
  const topNodes = Object.values(root).filter((n) => !n.parent);
  topNodes.forEach(calcTotals);
  return topNodes;
}

function mapAccountType(type: string): AccountType {
  if (!type) return "Other";
  const t = type.toLowerCase();
  if (t.includes("income") || t.includes("revenue")) return "Revenue";
  if (t.includes("expense")) return "Expenses";
  if (t.includes("asset")) return "Assets";
  if (t.includes("liabilit")) return "Liabilities";
  if (t.includes("equity")) return "Equity";
  return "Other";
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function getMonthRange(start: string, end: string): string[] {
  const result: string[] = [];
  let current = dayjs(start).startOf("month");
  const last = dayjs(end).startOf("month");
  while (current.isBefore(last) || current.isSame(last)) {
    result.push(current.format("MMMM YYYY"));
    current = current.add(1, "month");
  }
  return result;
}

// ====== MAIN COMPONENT ======
const defaultTimeView: TimeView = "Monthly";
const defaultViewMode: ViewMode = "detailed";

export default function FinancialsPage() {
  console.log("SUPABASE KEY:", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const [activeTab, setActiveTab] = useState<FinancialTab>("p&l");
  const [selectedMonth, setSelectedMonth] = useState(() =>
    dayjs().format("MMMM YYYY")
  );
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);
  const [timeView, setTimeView] = useState<TimeView>(defaultTimeView);
  const [notification, setNotification] = useState<NotificationState>({
    show: false,
    message: "",
    type: "info",
  });
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(
    new Set()
  );
  const [propertyDropdownOpen, setPropertyDropdownOpen] = useState(false);
  const [selectedProperties, setSelectedProperties] = useState<Set<string>>(
    new Set(["All Properties"])
  );
  const [bankDropdownOpen, setBankDropdownOpen] = useState(false);
  const [selectedBanks, setSelectedBanks] = useState<Set<string>>(
    new Set(["All Accounts"])
  );

  const [isLoading, setIsLoading] = useState(false);
  const [coa, setCOA] = useState<AccountCOA[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [properties, setProperties] = useState<string[]>(["All Properties"]);
  const [bankAccounts, setBankAccounts] = useState<string[]>(["All Accounts"]);
  const [dataError, setDataError] = useState<string | null>(null);

  const currentMonth = dayjs(selectedMonth, "MMMM YYYY");
  const [dateRange, setDateRange] = useState<{
    start: string;
    end: string;
    months: string[];
  }>({
    start: currentMonth.startOf("month").format("YYYY-MM-DD"),
    end: currentMonth.endOf("month").format("YYYY-MM-DD"),
    months: [selectedMonth],
  });

  useEffect(() => {
    let start = currentMonth.startOf("month");
    let end = currentMonth.endOf("month");
    let months = [selectedMonth];
    if (timeView === "YTD") {
      start = currentMonth.startOf("year");
      months = getMonthRange(start.format("YYYY-MM-DD"), end.format("YYYY-MM-DD"));
    } else if (timeView === "TTM") {
      start = currentMonth.subtract(11, "month").startOf("month");
      months = getMonthRange(start.format("YYYY-MM-DD"), end.format("YYYY-MM-DD"));
    } else if (timeView === "Quarterly") {
      start = currentMonth.startOf("quarter");
      end = currentMonth.endOf("quarter");
      months = getMonthRange(start.format("YYYY-MM-DD"), end.format("YYYY-MM-DD"));
    }
    setDateRange({
      start: start.format("YYYY-MM-DD"),
      end: end.format("YYYY-MM-DD"),
      months,
    });
  }, [selectedMonth, timeView]);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const [coaData, propData, bankData] = await Promise.all([
          fetchCOA(),
          fetchProperties(),
          fetchBankAccounts(),
        ]);
        setCOA(coaData);
        setProperties(propData);
        setBankAccounts(bankData);
      } catch (e: any) {
        setDataError("Failed to load initial data: " + e.message);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const entries = await fetchJournalEntries({
          startDate: dateRange.start,
          endDate: dateRange.end,
          properties: Array.from(selectedProperties),
          bankAccounts: activeTab === "cash-flow" ? Array.from(selectedBanks) : undefined,
        });
        setJournalEntries(entries);
        setDataError(null);
      } catch (e: any) {
        setDataError("Failed to load journal entries: " + e.message);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [dateRange, selectedProperties, selectedBanks, activeTab]);

  const accountTree = useMemo(() => {
    if (!coa.length || !journalEntries.length) return [];
    return buildAccountTree(coa, journalEntries);
  }, [coa, journalEntries]);

  const kpis = useMemo(() => {
    let revenue = 0,
      operatingExpenses = 0,
      netIncome = 0;
    function walk(node: AccountNode) {
      if (node.type === "Revenue") revenue += node.total;
      if (node.type === "Expenses") operatingExpenses += node.total;
      node.children.forEach(walk);
    }
    accountTree.forEach(walk);
    netIncome = revenue - operatingExpenses;
    return {
      revenue,
      operatingExpenses,
      netIncome,
      netMargin: revenue ? (netIncome / revenue) * 100 : 0,
    };
  }, [accountTree]);

  function exportToCSV() {
    let rows: any[] = [];
    function walk(node: AccountNode, depth = 0) {
      rows.push({
        Account: "  ".repeat(depth) + node.name,
        Total: node.total,
        ...node.months,
      });
      node.children.forEach((child) => walk(child, depth + 1));
    }
    accountTree.forEach((node) => walk(node));
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "financials.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleAccountExpansion(accountFullName: string) {
    setExpandedAccounts((prev) => {
      const next = new Set(prev);
      if (next.has(accountFullName)) next.delete(accountFullName);
      else next.add(accountFullName);
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex items-center">
          <IAMCFOLogo className="w-10 h-10 mr-4" />
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">IAM CFO</h1>
              <span className="text-sm px-3 py-1 rounded-full text-white" style={{ backgroundColor: BRAND_COLORS.primary }}>
                Financial Management
              </span>
              <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                Supabase Connected
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1">
              Real-time Financials • {journalEntries.length} entries loaded
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-wrap gap-4 items-center mb-6">
          {/* Month Selector */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm"
          >
            {Array.from({ length: 36 }).map((_, i) => {
              const m = dayjs().subtract(i, "month").format("MMMM YYYY");
              return (
                <option key={m} value={m}>
                  {m}
                </option>
              );
            })}
          </select>
          {/* Property Selector */}
          <div className="relative">
            <button
              onClick={() => setPropertyDropdownOpen((v) => !v)}
              className="flex items-center px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm"
            >
              {selectedProperties.size === 1
                ? Array.from(selectedProperties)[0]
                : `${selectedProperties.size} Properties`}
              <ChevronDown className="w-4 h-4 ml-2" />
            </button>
            {propertyDropdownOpen && (
              <div className="absolute z-10 bg-white border border-gray-300 rounded-lg mt-1 w-56 max-h-60 overflow-y-auto">
                {properties.map((p) => (
                  <div
                    key={p}
                    className="flex items-center px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                    onClick={() => {
                      const next = new Set(selectedProperties);
                      if (p === "All Properties") {
                        next.clear();
                        next.add("All Properties");
                      } else {
                        next.delete("All Properties");
                        if (next.has(p)) next.delete(p);
                        else next.add(p);
                        if (next.size === 0) next.add("All Properties");
                      }
                      setSelectedProperties(next);
                      setPropertyDropdownOpen(false);
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedProperties.has(p)}
                      readOnly
                      className="mr-3 h-4 w-4 border-gray-300 rounded"
                      style={{ accentColor: BRAND_COLORS.primary }}
                    />
                    <span>{p}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Bank Selector (Cash Flow) */}
          {activeTab === "cash-flow" && (
            <div className="relative">
              <button
                onClick={() => setBankDropdownOpen((v) => !v)}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm"
              >
                {selectedBanks.size === 1
                  ? Array.from(selectedBanks)[0]
                  : `${selectedBanks.size} Banks`}
                <ChevronDown className="w-4 h-4 ml-2" />
              </button>
              {bankDropdownOpen && (
                <div className="absolute z-10 bg-white border border-gray-300 rounded-lg mt-1 w-56 max-h-60 overflow-y-auto">
                  {bankAccounts.map((b) => (
                    <div
                      key={b}
                      className="flex items-center px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                      onClick={() => {
                        const next = new Set(selectedBanks);
                        if (b === "All Accounts") {
                          next.clear();
                          next.add("All Accounts");
                        } else {
                          next.delete("All Accounts");
                          if (next.has(b)) next.delete(b);
                          else next.add(b);
                          if (next.size === 0) next.add("All Accounts");
                        }
                        setSelectedBanks(next);
                        setBankDropdownOpen(false);
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedBanks.has(b)}
                        readOnly
                        className="mr-3 h-4 w-4 border-gray-300 rounded"
                        style={{ accentColor: BRAND_COLORS.primary }}
                      />
                      <span>{b}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* Time View Selector */}
          <select
            value={timeView}
            onChange={(e) => setTimeView(e.target.value as TimeView)}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm"
          >
            {["Monthly", "YTD", "TTM", "Quarterly"].map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
          {/* View Mode */}
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value as ViewMode)}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm"
          >
            <option value="detailed">Detailed</option>
            <option value="total">Total</option>
          </select>
          {/* Export Button */}
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 text-white rounded-lg"
            style={{ backgroundColor: BRAND_COLORS.primary }}
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          {/* Refresh Button */}
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("p&l")}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              activeTab === "p&l"
                ? "text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
            style={{
              backgroundColor: activeTab === "p&l" ? BRAND_COLORS.primary : undefined,
            }}
          >
            P&L
          </button>
          <button
            onClick={() => setActiveTab("cash-flow")}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              activeTab === "cash-flow"
                ? "text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
            style={{
              backgroundColor: activeTab === "cash-flow" ? BRAND_COLORS.primary : undefined,
            }}
          >
            Cash Flow
          </button>
          <button
            onClick={() => setActiveTab("balance-sheet")}
            className={`px-3 py-1 text-xs rounded transition-colors ${
              activeTab === "balance-sheet"
                ? "text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
            style={{
              backgroundColor: activeTab === "balance-sheet" ? BRAND_COLORS.primary : undefined,
            }}
          >
            Balance Sheet
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4" style={{ borderLeftColor: BRAND_COLORS.primary }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-600 text-sm font-medium mb-2">Revenue</div>
                <div className="text-2xl font-bold text-gray-900 mb-1">{formatCurrency(kpis.revenue)}</div>
                <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full inline-block">
                  Top Line
                </div>
              </div>
              <DollarSign className="w-8 h-8" style={{ color: BRAND_COLORS.primary }} />
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4" style={{ borderLeftColor: BRAND_COLORS.warning }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-600 text-sm font-medium mb-2">Operating Expenses</div>
                <div className="text-2xl font-bold text-gray-900 mb-1">{formatCurrency(kpis.operatingExpenses)}</div>
                <div className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full inline-block">
                  Operating Costs
                </div>
              </div>
              <BarChart3 className="w-8 h-8" style={{ color: BRAND_COLORS.warning }} />
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border-l-4" style={{ borderLeftColor: BRAND_COLORS.success }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-600 text-sm font-medium mb-2">Net Income</div>
                <div className="text-2xl font-bold text-gray-900 mb-1">{formatCurrency(kpis.netIncome)}</div>
                <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full inline-block">
                  {kpis.netMargin.toFixed(1)}% Margin
                </div>
              </div>
              <TrendingUp className="w-8 h-8" style={{ color: BRAND_COLORS.success }} />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-xl font-semibold text-gray-900">
              {activeTab === "p&l"
                ? "Profit & Loss Statement"
                : activeTab === "cash-flow"
                ? "Cash Flow Statement"
                : "Balance Sheet"}
            </h3>
          </div>
          <div className="p-6 overflow-x-auto">
            {/* P&L Table */}
            {activeTab === "p&l" && (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Account
                    </th>
                    {viewMode === "detailed"
                      ? dateRange.months.map((m) => (
                          <th
                            key={m}
                            className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {m}
                          </th>
                        ))
                      : (
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                      )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {accountTree.map((node) => (
                    <AccountRow
                      key={node.fullName}
                      node={node}
                      expandedAccounts={expandedAccounts}
                      toggleAccountExpansion={toggleAccountExpansion}
                      viewMode={viewMode}
                      months={dateRange.months}
                      depth={0}
                    />
                  ))}
                </tbody>
              </table>
            )}
            {/* Cash Flow Table */}
            {activeTab === "cash-flow" && (
              <div>
                <div className="mb-4 text-sm text-gray-600">
                  <strong>Bank Filter:</strong>{" "}
                  {selectedBanks.size === 1
                    ? Array.from(selectedBanks)[0]
                    : `${selectedBanks.size} Banks`}
                </div>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Account
                      </th>
                      {viewMode === "detailed"
                        ? dateRange.months.map((m) => (
                            <th
                              key={m}
                              className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              {m}
                            </th>
                          ))
                        : (
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Total
                          </th>
                        )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {accountTree.map((node) => (
                      <AccountRow
                        key={node.fullName}
                        node={node}
                        expandedAccounts={expandedAccounts}
                        toggleAccountExpansion={toggleAccountExpansion}
                        viewMode={viewMode}
                        months={dateRange.months}
                        depth={0}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {/* Balance Sheet Table */}
            {activeTab === "balance-sheet" && (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Account
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Balance
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {accountTree
                    .filter(
                      (node) =>
                        node.type === "Assets" ||
                        node.type === "Liabilities" ||
                        node.type === "Equity"
                    )
                    .map((node) => (
                      <AccountRow
                        key={node.fullName}
                        node={node}
                        expandedAccounts={expandedAccounts}
                        toggleAccountExpansion={toggleAccountExpansion}
                        viewMode="total"
                        months={dateRange.months}
                        depth={0}
                      />
                    ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      {/* Notification */}
      {notification.show && (
        <div
          className={`fixed top-5 right-5 z-50 px-6 py-4 rounded-lg text-white font-medium shadow-lg transition-transform ${
            notification.type === "success"
              ? "bg-green-500"
              : notification.type === "error"
              ? "bg-red-500"
              : "bg-blue-500"
          } ${notification.show ? "translate-x-0" : "translate-x-full"}`}
        >
          {notification.message}
        </div>
      )}
    </div>
  );
}

// ====== ACCOUNT ROW COMPONENT ======
function AccountRow({
  node,
  expandedAccounts,
  toggleAccountExpansion,
  viewMode,
  months,
  depth,
}: {
  node: AccountNode;
  expandedAccounts: Set<string>;
  toggleAccountExpansion: (name: string) => void;
  viewMode: ViewMode;
  months: string[];
  depth: number;
}) {
  const isExpandable = node.children.length > 0;
  const isExpanded = expandedAccounts.has(node.fullName);

  return (
    <>
      <tr className={depth === 0 ? "bg-gray-50" : ""}>
        <td className="px-6 py-2 text-left text-sm" style={{ paddingLeft: `${depth * 24 + 24}px` }}>
          <div className="flex items-center">
            {isExpandable && (
              <button
                onClick={() => toggleAccountExpansion(node.fullName)}
                className="mr-2 hover:bg-gray-200 p-1 rounded transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                )}
              </button>
            )}
            <span>{node.name}</span>
          </div>
        </td>
        {viewMode === "detailed"
          ? months.map((m) => (
              <td
                key={m}
                className={`px-4 py-2 text-right text-sm ${
                  node.total >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {formatCurrency(node.months[m] || 0)}
              </td>
            ))
          : (
            <td
              className={`px-4 py-2 text-right text-sm ${
                node.total >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {formatCurrency(node.total)}
            </td>
          )}
      </tr>
      {isExpandable && isExpanded &&
        node.children.map((child) => (
          <AccountRow
            key={child.fullName}
            node={child}
            expandedAccounts={expandedAccounts}
            toggleAccountExpansion={toggleAccountExpansion}
            viewMode={viewMode}
            months={months}
            depth={depth + 1}
          />
        ))}
    </>
  );
}
