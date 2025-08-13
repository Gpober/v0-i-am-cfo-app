"use client";

import { useState, useEffect } from "react";
import { Menu, X, ChevronLeft } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

interface PropertySummary {
  name: string;
  revenue: number;
  operatingExpenses: number;
  netIncome: number;
  cogs: number;
}

interface Category {
  name: string;
  total: number;
}

interface Transaction {
  date: string;
  amount: number;
  running: number;
}

export default function MobileDashboard() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [view, setView] = useState<"overview" | "summary" | "pl" | "detail">(
    "overview",
  );
  const [properties, setProperties] = useState<PropertySummary[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [plData, setPlData] = useState<{
    revenue: Category[];
    expenses: Category[];
  }>({ revenue: [], expenses: [] });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(
        "/api/organizations/1/dashboard-summary?includeProperties=true",
      );
      const json = await res.json();
      setProperties(json.propertyBreakdown || []);
    };
    load();
  }, []);

  const companyTotals = properties.reduce(
    (acc, p) => {
      acc.revenue += p.revenue;
      acc.expenses += p.operatingExpenses + p.cogs;
      acc.netIncome += p.netIncome;
      return acc;
    },
    { revenue: 0, expenses: 0, netIncome: 0 },
  );

  const margin = companyTotals.revenue
    ? (companyTotals.netIncome / companyTotals.revenue) * 100
    : 0;

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);

  const currentSummary = selectedProperty
    ? (() => {
        const p = properties.find((pr) => pr.name === selectedProperty);
        if (!p) return { revenue: 0, expenses: 0, netIncome: 0, margin: 0 };
        return {
          revenue: p.revenue,
          expenses: p.operatingExpenses + p.cogs,
          netIncome: p.netIncome,
          margin: p.revenue ? (p.netIncome / p.revenue) * 100 : 0,
        };
      })()
    : {
        revenue: companyTotals.revenue,
        expenses: companyTotals.expenses,
        netIncome: companyTotals.netIncome,
        margin,
      };

  const handlePropertySelect = (name: string | null) => {
    setSelectedProperty(name);
    setView("summary");
  };

  const loadPL = async () => {
    const year = new Date().getFullYear();
    const start = `${year}-01-01`;
    const end = `${year}-12-31`;
    let query = supabase
      .from("journal_entry_lines")
      .select("account, account_type, debit, credit, class, date")
      .gte("date", start)
      .lte("date", end);
    if (selectedProperty) {
      query = query.eq("class", selectedProperty);
    }
    const { data } = await query;
    const rev: Record<string, number> = {};
    const exp: Record<string, number> = {};
    (data || []).forEach((row) => {
      const debit = Number(row.debit) || 0;
      const credit = Number(row.credit) || 0;
      const t = row.account_type?.toLowerCase() || "";
      const amount = credit - debit;
      if (t.includes("income") || t.includes("revenue")) {
        rev[row.account] = (rev[row.account] || 0) + amount;
      } else if (t.includes("expense")) {
        const expAmount = debit - credit;
        exp[row.account] = (exp[row.account] || 0) + expAmount;
      }
    });
    setPlData({
      revenue: Object.entries(rev).map(([name, total]) => ({ name, total })),
      expenses: Object.entries(exp).map(([name, total]) => ({ name, total })),
    });
  };

  const handleViewPL = async () => {
    await loadPL();
    setView("pl");
  };

  const handleCategory = async (
    account: string,
    type: "revenue" | "expense",
  ) => {
    const year = new Date().getFullYear();
    const start = `${year}-01-01`;
    const end = `${year}-12-31`;
    let query = supabase
      .from("journal_entry_lines")
      .select("date, debit, credit, account, class")
      .eq("account", account)
      .gte("date", start)
      .lte("date", end);
    if (selectedProperty) {
      query = query.eq("class", selectedProperty);
    }
    const { data } = await query;
    const list: Transaction[] = (data || [])
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((row) => {
        const amount =
          type === "revenue"
            ? (Number(row.credit) || 0) - (Number(row.debit) || 0)
            : (Number(row.debit) || 0) - (Number(row.credit) || 0);
        return { date: row.date, amount, running: 0 };
      });
    let run = 0;
    list.forEach((t) => {
      run += t.amount;
      t.running = run;
    });
    setTransactions(list);
    setSelectedCategory(account);
    setView("detail");
  };

  const back = () => {
    if (view === "detail") setView("pl");
    else if (view === "pl") setView("summary");
    else if (view === "summary") setView("overview");
  };

  return (
    <div className="dashboard-container">
      <header className="flex items-center justify-between mb-6">
        <button
          className="p-2 text-white hamburger-menu rounded-md"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
        <h1 className="text-lg font-bold">I AM CFO</h1>
      </header>

      {menuOpen && (
        <nav className="mb-4">
          <ul className="space-y-2 text-sm">
            <li
              className="menu-item p-2 rounded"
              onClick={() => {
                setView("overview");
                setMenuOpen(false);
              }}
            >
              Overview
            </li>
            <li className="menu-item p-2 rounded">Time Periods</li>
            <li className="menu-item p-2 rounded">Reports</li>
            <li className="menu-item p-2 rounded">Settings</li>
          </ul>
        </nav>
      )}

      {view === "overview" && (
        <div>
          <div
            className="company-total flex flex-col justify-center p-4"
            onClick={() => handlePropertySelect(null)}
          >
            <span className="text-sm">Company Total</span>
            <span className="text-2xl font-bold">
              {formatCurrency(companyTotals.netIncome)}
            </span>
          </div>
          <div className="flex flex-wrap justify-between gap-3">
            {properties.map((p) => (
              <div
                key={p.name}
                className={`property-kpi p-3 flex flex-col justify-between ${selectedProperty === p.name ? "active" : ""}`}
                onClick={() => handlePropertySelect(p.name)}
              >
                <span className="font-semibold">{p.name}</span>
                <span className="text-xs">
                  Revenue {formatCurrency(p.revenue)}
                </span>
                <span className="text-xs">
                  Expenses {formatCurrency(p.operatingExpenses + p.cogs)}
                </span>
                <span className="text-xs">
                  Net {formatCurrency(p.netIncome)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === "summary" && (
        <div>
          <button className="flex items-center mb-4 text-sm" onClick={back}>
            <ChevronLeft className="mr-1" size={16} /> Back
          </button>
          <div className="summary-card revenue-card" onClick={handleViewPL}>
            <div className="flex justify-between">
              <span>Total Revenue</span>
              <span>{formatCurrency(currentSummary.revenue)}</span>
            </div>
          </div>
          <div className="summary-card expense-card" onClick={handleViewPL}>
            <div className="flex justify-between">
              <span>Total Expenses</span>
              <span>{formatCurrency(currentSummary.expenses)}</span>
            </div>
          </div>
          <div className="summary-card net-income-card" onClick={handleViewPL}>
            <div className="flex justify-between">
              <span>Net Income</span>
              <span>{formatCurrency(currentSummary.netIncome)}</span>
            </div>
          </div>
          <div className="summary-card margin-card" onClick={handleViewPL}>
            <div className="flex justify-between">
              <span>Profit Margin</span>
              <span>{currentSummary.margin.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      )}

      {view === "pl" && (
        <div>
          <button className="flex items-center mb-4 text-sm" onClick={back}>
            <ChevronLeft className="mr-1" size={16} /> Back
          </button>
          <h2 className="font-semibold mb-2">Revenue</h2>
          {plData.revenue.map((cat) => (
            <div
              key={cat.name}
              className="summary-card revenue-card"
              onClick={() => handleCategory(cat.name, "revenue")}
            >
              <div className="flex justify-between">
                <span>{cat.name}</span>
                <span>{formatCurrency(cat.total)}</span>
              </div>
            </div>
          ))}
          <h2 className="font-semibold mt-4 mb-2">Expenses</h2>
          {plData.expenses.map((cat) => (
            <div
              key={cat.name}
              className="summary-card expense-card"
              onClick={() => handleCategory(cat.name, "expense")}
            >
              <div className="flex justify-between">
                <span>{cat.name}</span>
                <span>{formatCurrency(cat.total)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {view === "detail" && (
        <div>
          <button className="flex items-center mb-4 text-sm" onClick={back}>
            <ChevronLeft className="mr-1" size={16} /> Back
          </button>
          <h2 className="font-semibold mb-2">{selectedCategory}</h2>
          <div className="space-y-2">
            {transactions.map((t, idx) => (
              <div key={idx} className="summary-card">
                <div className="flex justify-between">
                  <span>{t.date}</span>
                  <span>{formatCurrency(t.amount)}</span>
                </div>
                <div className="text-xs text-right">
                  Running {formatCurrency(t.running)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
