"use client";

import { useState, useEffect, useCallback } from "react";
import { Menu, X, DollarSign } from "lucide-react";
import { calculateGrossProfit } from "@/lib/calculations";

// brand colors used throughout the dashboard
const BRAND_COLORS = {
  primary: "#56B6E9",
  secondary: "#3A9BD1",
  accent: "#2E86C1",
  success: "#27AE60",
  warning: "#F39C12",
  gray: {
    50: "#F8FAFC",
    200: "#E2E8F0",
  },
};

interface PropertySummary {
  name: string;
  revenue?: number;
  expenses?: number;
  netIncome?: number;
  cogs?: number;
  grossProfit?: number;
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

export default function MobileDashboard() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportType, setReportType] = useState<"pl" | "cf">("pl");
  const [reportPeriod, setReportPeriod] = useState<
    "Monthly" | "Quarterly" | "Trailing 12" | "Year to Date" | "Custom"
  >("Monthly");
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [quarter, setQuarter] = useState<number>(
    Math.floor(new Date().getMonth() / 3) + 1,
  );
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [properties, setProperties] = useState<PropertySummary[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [plData, setPlData] = useState<{ revenue: Category[]; expenses: Category[] }>({
    revenue: [],
    expenses: [],
  });
  const [cfData, setCfData] = useState<{ operating: Category[]; financing: Category[] }>({
    operating: [],
    financing: [],
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [view, setView] = useState<"overview" | "report" | "detail">("overview");

  // pull real data on first render
  useEffect(() => {
    async function loadData() {
      try {
        const propRes = await fetch("/api/properties");
        if (propRes.ok) {
          const data: PropertySummary[] = await propRes.json();
          setProperties(
            data.map((p) => ({
              ...p,
              grossProfit: calculateGrossProfit(p.cogs ?? 0, p.revenue ?? 0),
              netIncome:
                p.netIncome ?? (p.revenue ?? 0) - (p.expenses ?? 0),
            }))
          );
        }
        const plRes = await fetch("/api/pl-data");
        if (plRes.ok) setPlData(await plRes.json());
        const cfRes = await fetch("/api/cf-data");
        if (cfRes.ok) setCfData(await cfRes.json());
      } catch (err) {
        console.error("failed to load dashboard data", err);
      }
    }
    loadData();
  }, []);

  const loadTransactions = useCallback(async (category: string) => {
    try {
      const res = await fetch(`/api/transactions?category=${encodeURIComponent(category)}`);
      if (res.ok) setTransactions(await res.json());
    } catch (err) {
      console.error("failed to load transactions", err);
    }
  }, []);

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

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);

  const handleCategory = async (name: string) => {
    await loadTransactions(name);
    setSelectedCategory(name);
    setView("detail");
  };

  return (
    <div style={{ background: BRAND_COLORS.gray[50], minHeight: "100vh", padding: 16 }}>
      <header style={{
        background: `linear-gradient(135deg, ${BRAND_COLORS.primary}, ${BRAND_COLORS.secondary})`,
        color: "white",
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
      }}>
        <div className="flex items-center justify-between">
          <button onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
          <div className="flex items-center gap-2">
            <DollarSign />
            <span style={{ fontWeight: 700 }}>I AM CFO</span>
          </div>
        </div>
        <div style={{ textAlign: "center", marginTop: 8 }}>
          <div style={{ fontSize: 24, fontWeight: 700 }}>
            {reportType === "pl" ? "P&L Dashboard" : "Cash Flow Dashboard"}
          </div>
          <div style={{ marginTop: 4 }}>{properties.length} Properties</div>
        </div>
      </header>

      {menuOpen && (
        <div
          style={{
            background: "white",
            border: `1px solid ${BRAND_COLORS.gray[200]}`,
            padding: 16,
            borderRadius: 8,
            marginBottom: 24,
          }}
        >
          <label className="block mb-2">Report Type</label>
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as "pl" | "cf")}
            style={{ border: `1px solid ${BRAND_COLORS.gray[200]}`, width: "100%", padding: 8 }}
          >
            <option value="pl">P&L Statement</option>
            <option value="cf">Cash Flow Statement</option>
          </select>

          <div style={{ marginTop: 16 }}>
            <label className="block mb-2">Report Period</label>
            <select
              value={reportPeriod}
              onChange={(e) =>
                setReportPeriod(
                  e.target.value as
                    | "Monthly"
                    | "Quarterly"
                    | "Trailing 12"
                    | "Year to Date"
                    | "Custom",
                )
              }
              style={{
                border: `1px solid ${BRAND_COLORS.gray[200]}`,
                width: "100%",
                padding: 8,
              }}
            >
              <option value="Monthly">Monthly</option>
              <option value="Quarterly">Quarterly</option>
              <option value="Year to Date">Year to Date</option>
              <option value="Trailing 12">Trailing 12</option>
              <option value="Custom">Custom Range</option>
            </select>
          </div>

          {reportPeriod === "Custom" ? (
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                style={{
                  border: `1px solid ${BRAND_COLORS.gray[200]}`,
                  padding: 8,
                  flex: 1,
                }}
              />
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                style={{
                  border: `1px solid ${BRAND_COLORS.gray[200]}`,
                  padding: 8,
                  flex: 1,
                }}
              />
            </div>
          ) : reportPeriod === "Quarterly" ? (
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <select
                value={quarter}
                onChange={(e) => setQuarter(Number(e.target.value))}
                style={{
                  border: `1px solid ${BRAND_COLORS.gray[200]}`,
                  padding: 8,
                  flex: 1,
                }}
              >
                <option value={1}>Q1</option>
                <option value={2}>Q2</option>
                <option value={3}>Q3</option>
                <option value={4}>Q4</option>
              </select>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                style={{
                  border: `1px solid ${BRAND_COLORS.gray[200]}`,
                  padding: 8,
                  flex: 1,
                }}
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
          ) : (
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                style={{
                  border: `1px solid ${BRAND_COLORS.gray[200]}`,
                  padding: 8,
                  flex: 1,
                }}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(0, i).toLocaleString("en", { month: "long" })}
                  </option>
                ))}
              </select>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                style={{
                  border: `1px solid ${BRAND_COLORS.gray[200]}`,
                  padding: 8,
                  flex: 1,
                }}
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
        </div>
      )}

      {view === "overview" && (
        <div>
          <div
            style={{
              background: "white",
              border: `1px solid ${BRAND_COLORS.gray[200]}`,
              borderRadius: 8,
              padding: 16,
              marginBottom: 24,
            }}
          >
            <div style={{ fontSize: 20, fontWeight: 700, textAlign: "center" }}>{formatCurrency(companyTotals.net)}</div>
            {reportType === "pl" ? (
              <div className="grid grid-cols-3 text-center mt-4">
                <div>
                  <div>{formatCurrency(companyTotals.revenue)}</div>
                  <div className="text-xs">Revenue</div>
                </div>
                <div>
                  <div>{formatCurrency(companyTotals.expenses)}</div>
                  <div className="text-xs">Expenses</div>
                </div>
                <div>
                  <div>{formatCurrency(companyTotals.net)}</div>
                  <div className="text-xs">Net Income</div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 text-center mt-4">
                <div>
                  <div>{formatCurrency(companyTotals.operating)}</div>
                  <div className="text-xs">Operating</div>
                </div>
                <div>
                  <div>{formatCurrency(companyTotals.financing)}</div>
                  <div className="text-xs">Financing</div>
                </div>
                <div>
                  <div>{formatCurrency(companyTotals.net)}</div>
                  <div className="text-xs">Net Cash</div>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {properties.map((p) => (
              <div
                key={p.name}
                onClick={() => {
                  setSelectedProperty(p.name);
                  setView("report");
                }}
                style={{
                  background: "white",
                  border: `1px solid ${BRAND_COLORS.gray[200]}`,
                  borderRadius: 8,
                  padding: 12,
                  cursor: "pointer",
                }}
              >
                <div style={{ fontWeight: 600 }}>{p.name}</div>
                <div style={{ color: BRAND_COLORS.success }}>{formatCurrency(p.netIncome || 0)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === "report" && selectedProperty && (
        <div>
          <button onClick={() => setView("overview")}>Back</button>
          <h2 className="text-lg font-bold mt-4 mb-2">{selectedProperty}</h2>
          {reportType === "pl" ? (
            <div>
              {plData.revenue.map((cat) => (
                <div key={cat.name} className="flex justify-between py-2 border-b" onClick={() => handleCategory(cat.name)}>
                  <span>{cat.name}</span>
                  <span>{formatCurrency(cat.total)}</span>
                </div>
              ))}
              {plData.expenses.map((cat) => (
                <div key={cat.name} className="flex justify-between py-2 border-b" onClick={() => handleCategory(cat.name)}>
                  <span>{cat.name}</span>
                  <span>{formatCurrency(cat.total)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div>
              {cfData.operating.map((cat) => (
                <div key={cat.name} className="flex justify-between py-2 border-b" onClick={() => handleCategory(cat.name)}>
                  <span>{cat.name}</span>
                  <span>{formatCurrency(cat.total)}</span>
                </div>
              ))}
              {cfData.financing.map((cat) => (
                <div key={cat.name} className="flex justify-between py-2 border-b" onClick={() => handleCategory(cat.name)}>
                  <span>{cat.name}</span>
                  <span>{formatCurrency(cat.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {view === "detail" && (
        <div>
          <button onClick={() => setView("report")}>Back</button>
          <h2 className="text-lg font-bold mt-4 mb-2">{selectedCategory}</h2>
          <div>
            {transactions.map((t, idx) => (
              <div key={idx} className="flex justify-between py-2 border-b">
                <span>{new Date(t.date).toLocaleDateString()}</span>
                <span>{formatCurrency(t.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

