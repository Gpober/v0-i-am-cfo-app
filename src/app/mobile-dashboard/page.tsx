"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Menu, X, ChevronLeft } from "lucide-react";
import Image from "next/image";
import { supabase } from "@/lib/supabaseClient";

interface PropertySummary {
  name: string;
  revenue?: number;
  expenses?: number;
  netIncome?: number;
  operating?: number;
  financing?: number;
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

interface JournalRow {
  account: string;
  account_type: string | null;
  debit: number | null;
  credit: number | null;
  class: string | null;
  date: string;
}

type PlSummary = {
  revenue: number;
  expenses: number;
  net: number;
  margin: number;
};

type CfSummary = {
  operating: number;
  financing: number;
  net: number;
  margin: number;
};

export default function MobileDashboard() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportType, setReportType] = useState<"pl" | "cf">("pl");
  const [reportPeriod, setReportPeriod] = useState<
    "Monthly" | "Custom" | "Year to Date" | "Trailing 12" | "Quarterly"
  >("Monthly");
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [view, setView] = useState<"overview" | "summary" | "report" | "detail">(
    "overview",
  );
  const [properties, setProperties] = useState<PropertySummary[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [plData, setPlData] = useState<{ revenue: Category[]; expenses: Category[] }>(
    { revenue: [], expenses: [] },
  );
  const [cfData, setCfData] = useState<{
    operating: Category[];
    financing: Category[];
  }>({ operating: [], financing: [] });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const getDateRange = useCallback(() => {
    const y = year;
    const m = month;
    if (reportPeriod === "Custom" && customStart && customEnd) {
      return { start: customStart, end: customEnd };
    }
    if (reportPeriod === "Monthly") {
      const startDate = new Date(y, m - 1, 1);
      const endDate = new Date(y, m, 0);
      return {
        start: startDate.toISOString().split("T")[0],
        end: endDate.toISOString().split("T")[0],
      };
    }
    if (reportPeriod === "Quarterly") {
      const qStart = Math.floor((m - 1) / 3) * 3;
      const startDate = new Date(y, qStart, 1);
      const endDate = new Date(y, qStart + 3, 0);
      return {
        start: startDate.toISOString().split("T")[0],
        end: endDate.toISOString().split("T")[0],
      };
    }
    if (reportPeriod === "Year to Date") {
      const startDate = new Date(y, 0, 1);
      const endDate = new Date(y, m, 0);
      return {
        start: startDate.toISOString().split("T")[0],
        end: endDate.toISOString().split("T")[0],
      };
    }
    if (reportPeriod === "Trailing 12") {
      const endDate = new Date(y, m, 0);
      const startDate = new Date(endDate);
      startDate.setMonth(startDate.getMonth() - 11);
      startDate.setDate(1);
      return {
        start: startDate.toISOString().split("T")[0],
        end: endDate.toISOString().split("T")[0],
      };
    }
    return { start: `${y}-01-01`, end: `${y}-12-31` };
  }, [reportPeriod, month, year, customStart, customEnd]);
  useEffect(() => {
    const load = async () => {
      const { start, end } = getDateRange();
      const query = supabase
        .from("journal_entry_lines")
        .select("account_type, debit, credit, class, date")
        .gte("date", start)
        .lte("date", end);
      const { data } = await query;
      const map: Record<string, PropertySummary> = {};
      ((data as JournalRow[]) || []).forEach((row) => {
        const cls = row.class || "General";
        if (!map[cls]) {
          map[cls] = { name: cls, revenue: 0, expenses: 0, netIncome: 0, operating: 0, financing: 0 };
        }
        const debit = Number(row.debit) || 0;
        const credit = Number(row.credit) || 0;
        const t = (row.account_type || "").toLowerCase();
        if (reportType === "pl") {
          if (t.includes("income") || t.includes("revenue")) {
            map[cls].revenue = (map[cls].revenue || 0) + (credit - debit);
            map[cls].netIncome = (map[cls].netIncome || 0) + (credit - debit);
          } else if (t.includes("expense") || t.includes("cogs")) {
            const amt = debit - credit;
            map[cls].expenses = (map[cls].expenses || 0) + amt;
            map[cls].netIncome = (map[cls].netIncome || 0) - amt;
          }
        } else {
          const cash = credit - debit;
          if (t.includes("operating")) {
            map[cls].operating = (map[cls].operating || 0) + cash;
          } else if (t.includes("financing")) {
            map[cls].financing = (map[cls].financing || 0) + cash;
          }
        }
      });
      const list = Object.values(map).filter((p) => {
        return reportType === "pl"
          ? (p.revenue || 0) !== 0 || (p.expenses || 0) !== 0 || (p.netIncome || 0) !== 0
          : (p.operating || 0) !== 0 || (p.financing || 0) !== 0;
      });
      setProperties(list);
    };
    load();
  }, [reportType, reportPeriod, month, year, customStart, customEnd, getDateRange]);

  const revenueKing = useMemo(() => {
    if (reportType !== "pl" || !properties.length) return null;
    return properties.reduce((max, p) =>
      (p.revenue || 0) > (max.revenue || 0) ? p : max,
    properties[0]).name;
  }, [properties, reportType]);

  const marginMaster = useMemo(() => {
    if (reportType !== "pl" || !properties.length) return null;
    return properties.reduce((max, p) => {
      const marginP = p.revenue ? (p.netIncome || 0) / p.revenue : 0;
      const marginM = max.revenue ? (max.netIncome || 0) / max.revenue : 0;
      return marginP > marginM ? p : max;
    }, properties[0]).name;
  }, [properties, reportType]);

  const companyTotals = properties.reduce(
    (acc, p) => {
      if (reportType === "pl") {
        acc.revenue += p.revenue || 0;
        acc.expenses += p.expenses || 0;
        acc.net += p.netIncome || 0;
      } else {
        acc.operating += p.operating || 0;
        acc.financing += p.financing || 0;
        acc.net += (p.operating || 0) + (p.financing || 0);
      }
      return acc;
    },
    { revenue: 0, expenses: 0, net: 0, operating: 0, financing: 0 },
  );

  const margin = reportType === "pl"
    ? companyTotals.revenue
      ? (companyTotals.net / companyTotals.revenue) * 100
      : 0
    : companyTotals.operating
    ? (companyTotals.net / companyTotals.operating) * 100
    : 0;

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);

  const currentSummary: PlSummary | CfSummary = selectedProperty
    ? (() => {
        const p = properties.find((pr) => pr.name === selectedProperty);
        if (!p)
          return reportType === "pl"
            ? { revenue: 0, expenses: 0, net: 0, margin: 0 }
            : { operating: 0, financing: 0, net: 0, margin: 0 };
        return reportType === "pl"
          ? {
              revenue: p.revenue || 0,
              expenses: p.expenses || 0,
              net: p.netIncome || 0,
              margin: p.revenue ? ((p.netIncome || 0) / p.revenue) * 100 : 0,
            }
          : {
              operating: p.operating || 0,
              financing: p.financing || 0,
              net: (p.operating || 0) + (p.financing || 0),
              margin: p.operating
                ? (((p.operating || 0) + (p.financing || 0)) / (p.operating || 0)) * 100
                : 0,
            };
      })()
    : reportType === "pl"
    ? {
        revenue: companyTotals.revenue,
        expenses: companyTotals.expenses,
        net: companyTotals.net,
        margin,
      }
    : {
        operating: companyTotals.operating,
        financing: companyTotals.financing,
        net: companyTotals.net,
        margin,
      };

  const handlePropertySelect = (name: string | null) => {
    setSelectedProperty(name);
    setView("summary");
  };

  const loadPL = async () => {
    const { start, end } = getDateRange();
    let query = supabase
      .from("journal_entry_lines")
      .select("account, account_type, debit, credit, class, date")
      .gte("date", start)
      .lte("date", end);
    if (selectedProperty) {
      query =
        selectedProperty === "General"
          ? query.is("class", null)
          : query.eq("class", selectedProperty);
    }
    const { data } = await query;
    const rev: Record<string, number> = {};
    const exp: Record<string, number> = {};
    ((data as JournalRow[]) || []).forEach((row) => {
      const debit = Number(row.debit) || 0;
      const credit = Number(row.credit) || 0;
      const t = (row.account_type || "").toLowerCase();
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

  const loadCF = async () => {
    const { start, end } = getDateRange();
    let query = supabase
      .from("journal_entry_lines")
      .select("account, account_type, debit, credit, class, date")
      .gte("date", start)
      .lte("date", end);
    if (selectedProperty) {
      query =
        selectedProperty === "General"
          ? query.is("class", null)
          : query.eq("class", selectedProperty);
    }
    const { data } = await query;
    const op: Record<string, number> = {};
    const fin: Record<string, number> = {};
    ((data as JournalRow[]) || []).forEach((row) => {
      const debit = Number(row.debit) || 0;
      const credit = Number(row.credit) || 0;
      const t = (row.account_type || "").toLowerCase();
      const amount = credit - debit;
      if (t.includes("operating")) {
        op[row.account] = (op[row.account] || 0) + amount;
      } else if (t.includes("financing")) {
        fin[row.account] = (fin[row.account] || 0) + amount;
      }
    });
    setCfData({
      operating: Object.entries(op).map(([name, total]) => ({ name, total })),
      financing: Object.entries(fin).map(([name, total]) => ({ name, total })),
    });
  };

  const handleViewReport = async () => {
    if (reportType === "pl") await loadPL();
    else await loadCF();
    setView("report");
  };

  const handleCategory = async (
    account: string,
    type: "revenue" | "expense" | "operating" | "financing",
  ) => {
    const { start, end } = getDateRange();
    let query = supabase
      .from("journal_entry_lines")
      .select("date, debit, credit, account, class")
      .eq("account", account)
      .gte("date", start)
      .lte("date", end);
    if (selectedProperty) {
      query =
        selectedProperty === "General"
          ? query.is("class", null)
          : query.eq("class", selectedProperty);
    }
    const { data } = await query;
    const list: Transaction[] = ((data as JournalRow[]) || [])
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((row) => {
        const debit = Number(row.debit) || 0;
        const credit = Number(row.credit) || 0;
        let amount = 0;
        if (reportType === "pl") {
          amount = type === "revenue" ? credit - debit : debit - credit;
        } else {
          amount = credit - debit;
        }
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
    if (view === "detail") setView("report");
    else if (view === "report") setView("summary");
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
        <div className="flex items-center gap-2">
          <Image
            src="/placeholder-logo.svg"
            alt="I AM CFO"
            width={32}
            height={32}
          />
          <span className="text-lg font-bold">I AM CFO</span>
        </div>
      </header>

      {menuOpen && (
        <nav className="mb-4 space-y-4 text-sm">
          <div>
            <label className="block mb-1 font-semibold">Report Type</label>
            <select
              className="w-full p-2 border rounded"
              value={reportType}
              onChange={(e) => setReportType(e.target.value as "pl" | "cf")}
            >
              <option value="pl">P&L</option>
              <option value="cf">Cash Flow</option>
            </select>
          </div>
          <div>
            <label className="block mb-1 font-semibold">Report Period</label>
            <select
              className="w-full p-2 border rounded"
              value={reportPeriod}
              onChange={(e) =>
                setReportPeriod(
                  e.target.value as
                    | "Monthly"
                    | "Custom"
                    | "Year to Date"
                    | "Trailing 12"
                    | "Quarterly",
                )
              }
            >
              <option value="Monthly">Monthly</option>
              <option value="Custom">Custom</option>
              <option value="Year to Date">Year to Date</option>
              <option value="Trailing 12">Trailing 12</option>
              <option value="Quarterly">Quarterly</option>
            </select>
          </div>
          {reportPeriod === "Custom" ? (
            <div className="flex gap-2">
              <input
                type="date"
                className="p-2 border rounded w-1/2"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
              />
              <input
                type="date"
                className="p-2 border rounded w-1/2"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
            </div>
          ) : (
            <div className="flex gap-2">
              <select
                className="p-2 border rounded w-1/2"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(0, i).toLocaleString("en", { month: "short" })}
                  </option>
                ))}
              </select>
              <select
                className="p-2 border rounded w-1/2"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
              >
                {Array.from({ length: 5 }, (_, i) => {
                  const y = new Date().getFullYear() - 2 + i;
                  return (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  );
                })}
              </select>
            </div>
          )}
          <button
            className="menu-item p-2 rounded w-full text-center"
            onClick={() => setMenuOpen(false)}
          >
            Apply
          </button>
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
              {formatCurrency(companyTotals.net)}
            </span>
          </div>
          <div className="flex flex-wrap justify-between gap-3">
            {properties.map((p) => {
              const isRevenueKing = p.name === revenueKing;
              const isMarginMaster = p.name === marginMaster;
              return (
                <div
                  key={p.name}
                  className={`property-kpi p-3 flex flex-col justify-between ${selectedProperty === p.name ? "active" : ""}`}
                  onClick={() => handlePropertySelect(p.name)}
                >
                  <span className="font-semibold flex justify-between items-center">
                    {p.name}
                    {reportType === "pl" && (
                      <span>
                        {isRevenueKing && <span title="Revenue King">👑</span>}
                        {isMarginMaster && <span title="Margin Master">🏅</span>}
                      </span>
                    )}
                  </span>
                  {reportType === "pl" ? (
                    <>
                      <span className="text-xs">Revenue {formatCurrency(p.revenue || 0)}</span>
                      <span className="text-xs">Expenses {formatCurrency(p.expenses || 0)}</span>
                      <span className="text-xs">Net {formatCurrency(p.netIncome || 0)}</span>
                      {isRevenueKing && (
                        <span className="text-xs">👑 Revenue King</span>
                      )}
                      {isMarginMaster && (
                        <span className="text-xs">🏅 Margin Master</span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="text-xs">Operating {formatCurrency(p.operating || 0)}</span>
                      <span className="text-xs">Financing {formatCurrency(p.financing || 0)}</span>
                      <span className="text-xs">Net {formatCurrency((p.operating || 0) + (p.financing || 0))}</span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === "summary" && (
        <div>
          <button className="flex items-center mb-4 text-sm" onClick={back}>
            <ChevronLeft className="mr-1" size={16} /> Back
          </button>
          {reportType === "pl" ? (
            <>
              <div className="summary-card revenue-card" onClick={handleViewReport}>
                <div className="flex justify-between">
                  <span>Total Revenue</span>
                  <span>{formatCurrency((currentSummary as PlSummary).revenue)}</span>
                </div>
              </div>
              <div className="summary-card expense-card" onClick={handleViewReport}>
                <div className="flex justify-between">
                  <span>Total Expenses</span>
                  <span>{formatCurrency((currentSummary as PlSummary).expenses)}</span>
                </div>
              </div>
              <div className="summary-card net-income-card" onClick={handleViewReport}>
                <div className="flex justify-between">
                  <span>Net Income</span>
                  <span>{formatCurrency((currentSummary as PlSummary).net)}</span>
                </div>
              </div>
              <div className="summary-card margin-card" onClick={handleViewReport}>
                <div className="flex justify-between">
                  <span>Profit Margin</span>
                  <span>{(currentSummary as PlSummary).margin.toFixed(1)}%</span>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="summary-card revenue-card" onClick={handleViewReport}>
                <div className="flex justify-between">
                  <span>Operating Cash</span>
                  <span>{formatCurrency((currentSummary as CfSummary).operating)}</span>
                </div>
              </div>
              <div className="summary-card expense-card" onClick={handleViewReport}>
                <div className="flex justify-between">
                  <span>Financing Cash</span>
                  <span>{formatCurrency((currentSummary as CfSummary).financing)}</span>
                </div>
              </div>
              <div className="summary-card net-income-card" onClick={handleViewReport}>
                <div className="flex justify-between">
                  <span>Net Cash</span>
                  <span>{formatCurrency((currentSummary as CfSummary).net)}</span>
                </div>
              </div>
              <div className="summary-card margin-card" onClick={handleViewReport}>
                <div className="flex justify-between">
                  <span>Cash Margin</span>
                  <span>{(currentSummary as CfSummary).margin.toFixed(1)}%</span>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {view === "report" && (
        <div>
          <button className="flex items-center mb-4 text-sm" onClick={back}>
            <ChevronLeft className="mr-1" size={16} /> Back
          </button>
          {reportType === "pl" ? (
            <>
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
            </>
          ) : (
            <>
              <h2 className="font-semibold mb-2">Operating</h2>
              {cfData.operating.map((cat) => (
                <div
                  key={cat.name}
                  className="summary-card revenue-card"
                  onClick={() => handleCategory(cat.name, "operating")}
                >
                  <div className="flex justify-between">
                    <span>{cat.name}</span>
                    <span>{formatCurrency(cat.total)}</span>
                  </div>
                </div>
              ))}
              <h2 className="font-semibold mt-4 mb-2">Financing</h2>
              {cfData.financing.map((cat) => (
                <div
                  key={cat.name}
                  className="summary-card expense-card"
                  onClick={() => handleCategory(cat.name, "financing")}
                >
                  <div className="flex justify-between">
                    <span>{cat.name}</span>
                    <span>{formatCurrency(cat.total)}</span>
                  </div>
                </div>
              ))}
            </>
          )}
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
