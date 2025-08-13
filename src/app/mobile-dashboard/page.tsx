"use client";

import { useState, useMemo } from "react";
import { Menu, X, ChevronLeft, TrendingUp, DollarSign, PieChart, Award, AlertTriangle, CheckCircle, Target } from "lucide-react";

// I AM CFO Brand Colors
const BRAND_COLORS = {
  primary: '#56B6E9',
  secondary: '#3A9BD1', 
  tertiary: '#7CC4ED',
  accent: '#2E86C1',
  success: '#27AE60',
  warning: '#F39C12',
  danger: '#E74C3C',
  gray: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0'
  }
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

export default function EnhancedMobileDashboard() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportType, setReportType] = useState<"pl" | "cf">("pl");
  const [reportPeriod, setReportPeriod] = useState<
    "Monthly" | "Custom" | "Year to Date" | "Trailing 12" | "Quarterly"
  >("Monthly");
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [view, setView] = useState<"overview" | "summary" | "report" | "detail">("overview");
  const properties: PropertySummary[] = [
    { name: "Property A", revenue: 125000, expenses: 89000, netIncome: 36000, cogs: 25000, grossProfit: 100000, operating: 45000, financing: -12000 },
    { name: "Property B", revenue: 180000, expenses: 120000, netIncome: 60000, cogs: 35000, grossProfit: 145000, operating: 65000, financing: -8000 },
    { name: "Property C", revenue: 95000, expenses: 75000, netIncome: 20000, cogs: 15000, grossProfit: 80000, operating: 25000, financing: -5000 },
    { name: "Downtown Loft", revenue: 210000, expenses: 140000, netIncome: 70000, cogs: 42000, grossProfit: 168000, operating: 80000, financing: -15000 },
    { name: "Beach House", revenue: 165000, expenses: 110000, netIncome: 55000, cogs: 28000, grossProfit: 137000, operating: 60000, financing: -10000 }
  ];
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const plData: { revenue: Category[]; expenses: Category[] } = {
    revenue: [
      { name: "Rental Income", total: 650000 },
      { name: "Service Fees", total: 125000 },
      { name: "Late Fees", total: 8500 }
    ],
    expenses: [
      { name: "Property Management", total: 85000 },
      { name: "Maintenance & Repairs", total: 125000 },
      { name: "Insurance", total: 45000 },
      { name: "Property Taxes", total: 95000 },
      { name: "Utilities", total: 65000 },
      { name: "Marketing", total: 25000 },
      { name: "Legal & Professional", total: 15000 }
    ]
  };
  const cfData: {
    operating: Category[];
    financing: Category[];
  } = {
    operating: [
      { name: "Operating Cash Inflow", total: 275000 },
      { name: "Working Capital Changes", total: -15000 },
      { name: "Net Operating Activities", total: 260000 }
    ],
    financing: [
      { name: "Loan Payments", total: -45000 },
      { name: "New Financing", total: 25000 },
      { name: "Owner Distributions", total: -30000 }
    ]
  };
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);

  const formatCompactCurrency = (n: number) => {
    if (Math.abs(n) >= 1000000) {
      return `$${(n / 1000000).toFixed(1)}M`;
    } else if (Math.abs(n) >= 1000) {
      return `$${(n / 1000).toFixed(1)}K`;
    }
    return formatCurrency(n);
  };

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

  // Generate portfolio insights
  const generateInsights = () => {
    if (reportType === "pl") {
      const avgMargin = properties.reduce((acc, p) => 
        acc + (p.revenue ? ((p.netIncome || 0) / p.revenue) * 100 : 0), 0
      ) / properties.length;

      const strongProperties = properties.filter(p => 
        p.revenue ? ((p.netIncome || 0) / p.revenue) * 100 > 25 : false
      ).length;

      const totalRevenue = companyTotals.revenue;
      const revenueTrend = totalRevenue > 700000 ? "up" : "stable";

      return [
        {
          type: "success",
          icon: CheckCircle,
          title: `Portfolio Performance`,
          message: `${strongProperties} of ${properties.length} properties achieving 25%+ margins`
        },
        {
          type: avgMargin > 20 ? "success" : "warning", 
          icon: avgMargin > 20 ? TrendingUp : AlertTriangle,
          title: "Average Margin",
          message: `${avgMargin.toFixed(1)}% average profit margin across portfolio`
        },
        {
          type: revenueTrend === "up" ? "success" : "info",
          icon: revenueTrend === "up" ? TrendingUp : Target,
          title: "Revenue Trend",
          message: `${formatCompactCurrency(totalRevenue)} total revenue ${revenueTrend === "up" ? "exceeding targets" : "within expectations"}`
        }
      ];
    } else {
      const positiveOperating = properties.filter(p => (p.operating || 0) > 0).length;
      const totalCashFlow = companyTotals.net;
      const strongCashFlow = totalCashFlow > 100000;

      return [
        {
          type: "success",
          icon: CheckCircle,
          title: "Cash Generation", 
          message: `${positiveOperating} of ${properties.length} properties generating positive operating cash`
        },
        {
          type: strongCashFlow ? "success" : "warning",
          icon: strongCashFlow ? TrendingUp : AlertTriangle,
          title: "Net Cash Flow",
          message: `${formatCompactCurrency(totalCashFlow)} net cash flow ${strongCashFlow ? "indicating strong liquidity" : "requires monitoring"}`
        },
        {
          type: "info",
          icon: PieChart,
          title: "Cash Mix",
          message: `Operating: ${formatCompactCurrency(companyTotals.operating)} | Financing: ${formatCompactCurrency(companyTotals.financing)}`
        }
      ];
    }
  };

  const insights = generateInsights();

  const getMonthName = (m: number) => {
    return new Date(2024, m - 1, 1).toLocaleDateString('en-US', { month: 'long' });
  };

  const handlePropertySelect = (name: string | null) => {
    setSelectedProperty(name);
    setView("report"); // Go directly to P&L/Cash Flow report
  };

  const handleCategory = async (account: string) => {
    // Mock transaction data
    const mockTransactions: Transaction[] = [
      { date: "2024-08-01", amount: 2500, running: 2500 },
      { date: "2024-08-05", amount: 3200, running: 5700 },
      { date: "2024-08-12", amount: 2800, running: 8500 },
      { date: "2024-08-18", amount: 3100, running: 11600 },
      { date: "2024-08-25", amount: 2900, running: 14500 }
    ];
    
    setTransactions(mockTransactions);
    setSelectedCategory(account);
    setView("detail");
  };

  const back = () => {
    if (view === "detail") setView("report");
    else if (view === "report") setView("overview");
    else if (view === "summary") setView("overview");
  };

  return (
    <div style={{ 
      minHeight: '100vh',
      background: BRAND_COLORS.gray[50],
      padding: '16px',
      position: 'relative'
    }}>
      <style jsx>{`
        @keyframes slideDown {
          0% {
            opacity: 0;
            transform: translateY(-10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      {/* Enhanced Header */}
      <header style={{
        background: `linear-gradient(135deg, ${BRAND_COLORS.primary}, ${BRAND_COLORS.secondary})`,
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
        color: 'white',
        boxShadow: `0 8px 32px ${BRAND_COLORS.primary}33`
      }}>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '8px',
              padding: '8px',
              color: 'white'
            }}
          >
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="flex items-center gap-2">
            <DollarSign size={32} />
            <span style={{ fontSize: '20px', fontWeight: 'bold' }}>I AM CFO</span>
          </div>
        </div>

        {/* Dashboard Summary */}
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
            {reportType === "pl" ? "P&L Dashboard" : "Cash Flow Dashboard"}
          </h1>
          <p style={{ fontSize: '14px', opacity: 0.9 }}>
            {getMonthName(month)} {year} • {properties.length} Properties
          </p>
        </div>

        {/* Company Total - Enhanced */}
        <div
          onClick={() => handlePropertySelect(null)}
          style={{
            background: 'rgba(255, 255, 255, 0.15)',
            borderRadius: '12px',
            padding: '20px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '14px', opacity: 0.9 }}>Company Total</span>
            <div style={{ fontSize: '32px', fontWeight: 'bold', margin: '8px 0' }}>
              {formatCompactCurrency(companyTotals.net)}
            </div>
          </div>
          
          {reportType === "pl" ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                  {formatCompactCurrency(companyTotals.revenue)}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>Revenue</div>
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                  {formatCompactCurrency(companyTotals.expenses)}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>Expenses</div>
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                  {formatCompactCurrency(companyTotals.net)}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>Net Income</div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', textAlign: 'center' }}>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                  {formatCompactCurrency(companyTotals.operating)}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>Operating</div>
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                  {formatCompactCurrency(companyTotals.financing)}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>Financing</div>
              </div>
              <div>
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                  {formatCompactCurrency(companyTotals.net)}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.8 }}>Net Cash</div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hamburger Dropdown Menu */}
      {menuOpen && (
        <div style={{
          position: 'absolute',
          top: '80px',
          left: '16px',
          right: '16px',
          background: 'white',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 8px 40px rgba(0, 0, 0, 0.15)',
          border: `2px solid ${BRAND_COLORS.gray[200]}`,
          zIndex: 1000,
          animation: 'slideDown 0.3s ease-out'
        }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: BRAND_COLORS.accent }}>
              Report Type
            </label>
            <select
              style={{
                width: '100%',
                padding: '12px',
                border: `2px solid ${BRAND_COLORS.gray[200]}`,
                borderRadius: '8px',
                fontSize: '16px'
              }}
              value={reportType}
              onChange={(e) => setReportType(e.target.value as "pl" | "cf")}
            >
              <option value="pl">P&L Statement</option>
              <option value="cf">Cash Flow Statement</option>
            </select>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: BRAND_COLORS.accent }}>
              Report Period
            </label>
            <select
              style={{
                width: '100%',
                padding: '12px',
                border: `2px solid ${BRAND_COLORS.gray[200]}`,
                borderRadius: '8px',
                fontSize: '16px'
              }}
              value={reportPeriod}
              onChange={(e) =>
                setReportPeriod(e.target.value as "Monthly" | "Custom" | "Year to Date" | "Trailing 12" | "Quarterly")
              }
            >
              <option value="Monthly">Monthly</option>
              <option value="Custom">Custom Range</option>
              <option value="Year to Date">Year to Date</option>
              <option value="Trailing 12">Trailing 12 Months</option>
              <option value="Quarterly">Quarterly</option>
            </select>
          </div>
          {reportPeriod === "Custom" ? (
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <input
                type="date"
                style={{
                  flex: 1,
                  padding: '12px',
                  border: `2px solid ${BRAND_COLORS.gray[200]}`,
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
              />
              <input
                type="date"
                style={{
                  flex: 1,
                  padding: '12px',
                  border: `2px solid ${BRAND_COLORS.gray[200]}`,
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <select
                style={{
                  flex: 1,
                  padding: '12px',
                  border: `2px solid ${BRAND_COLORS.gray[200]}`,
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(0, i).toLocaleString("en", { month: "long" })}
                  </option>
                ))}
              </select>
              <select
                style={{
                  flex: 1,
                  padding: '12px',
                  border: `2px solid ${BRAND_COLORS.gray[200]}`,
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
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
            style={{
              width: '100%',
              padding: '12px',
              background: `linear-gradient(135deg, ${BRAND_COLORS.primary}, ${BRAND_COLORS.secondary})`,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
            onClick={() => setMenuOpen(false)}
          >
            Apply Filters
          </button>
        </div>
      )}

      {view === "overview" && (
        <div>
          {/* Portfolio Insights */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '20px',
            marginBottom: '24px',
            border: `1px solid ${BRAND_COLORS.gray[200]}`,
            boxShadow: '0 4px 20px rgba(86, 182, 233, 0.1)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <Target size={20} style={{ color: BRAND_COLORS.accent }} />
              <h3 style={{ fontSize: '18px', fontWeight: '600', color: BRAND_COLORS.accent }}>
                Portfolio Insights
              </h3>
            </div>
            
            {/* Awards Section */}
            <div style={{
              background: `linear-gradient(135deg, ${BRAND_COLORS.gray[50]}, #f0f9ff)`,
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
              border: `1px solid ${BRAND_COLORS.tertiary}33`
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                <Award size={16} style={{ color: BRAND_COLORS.primary }} />
                <span style={{ fontSize: '14px', fontWeight: '600', color: BRAND_COLORS.primary }}>
                  Property Champions
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                {reportType === "pl" ? (
                  <>
                    <div style={{
                      background: 'white',
                      borderRadius: '8px',
                      padding: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      border: `1px solid ${BRAND_COLORS.warning}33`
                    }}>
                      <span style={{ fontSize: '20px' }}>👑</span>
                      <div>
                        <div style={{ fontSize: '11px', color: BRAND_COLORS.warning, fontWeight: '600' }}>
                          REV CHAMP
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>
                          {revenueKing}
                        </div>
                      </div>
                    </div>
                    <div style={{
                      background: 'white',
                      borderRadius: '8px',
                      padding: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      border: `1px solid ${BRAND_COLORS.success}33`
                    }}>
                      <span style={{ fontSize: '20px' }}>🏅</span>
                      <div>
                        <div style={{ fontSize: '11px', color: BRAND_COLORS.success, fontWeight: '600' }}>
                          MARGIN MASTER
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>
                          {marginMaster}
                        </div>
                      </div>
                    </div>
                    <div style={{
                      background: 'white',
                      borderRadius: '8px',
                      padding: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      border: `1px solid ${BRAND_COLORS.primary}33`
                    }}>
                      <span style={{ fontSize: '20px' }}>💎</span>
                      <div>
                        <div style={{ fontSize: '11px', color: BRAND_COLORS.primary, fontWeight: '600' }}>
                          PROFIT STAR
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>
                          {properties.find(p => (p.netIncome || 0) === Math.max(...properties.map(prop => prop.netIncome || 0)))?.name}
                        </div>
                      </div>
                    </div>
                    <div style={{
                      background: 'white',
                      borderRadius: '8px',
                      padding: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      border: `1px solid ${BRAND_COLORS.tertiary}33`
                    }}>
                      <span style={{ fontSize: '20px' }}>🚀</span>
                      <div>
                        <div style={{ fontSize: '11px', color: BRAND_COLORS.tertiary, fontWeight: '600' }}>
                          GROWTH HERO
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>
                          {properties[Math.floor(Math.random() * properties.length)].name}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{
                      background: 'white',
                      borderRadius: '8px',
                      padding: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      border: `1px solid ${BRAND_COLORS.primary}33`
                    }}>
                      <span style={{ fontSize: '20px' }}>💰</span>
                      <div>
                        <div style={{ fontSize: '11px', color: BRAND_COLORS.primary, fontWeight: '600' }}>
                          CASH KING
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>
                          {properties.find(p => (p.operating || 0) === Math.max(...properties.map(prop => prop.operating || 0)))?.name}
                        </div>
                      </div>
                    </div>
                    <div style={{
                      background: 'white',
                      borderRadius: '8px',
                      padding: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      border: `1px solid ${BRAND_COLORS.success}33`
                    }}>
                      <span style={{ fontSize: '20px' }}>⚡</span>
                      <div>
                        <div style={{ fontSize: '11px', color: BRAND_COLORS.success, fontWeight: '600' }}>
                          FLOW MASTER
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>
                          {properties.find(p => ((p.operating || 0) + (p.financing || 0)) === Math.max(...properties.map(prop => (prop.operating || 0) + (prop.financing || 0))))?.name}
                        </div>
                      </div>
                    </div>
                    <div style={{
                      background: 'white',
                      borderRadius: '8px',
                      padding: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      border: `1px solid ${BRAND_COLORS.warning}33`
                    }}>
                      <span style={{ fontSize: '20px' }}>🎯</span>
                      <div>
                        <div style={{ fontSize: '11px', color: BRAND_COLORS.warning, fontWeight: '600' }}>
                          EFFICIENCY ACE
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>
                          {properties[Math.floor(Math.random() * properties.length)].name}
                        </div>
                      </div>
                    </div>
                    <div style={{
                      background: 'white',
                      borderRadius: '8px',
                      padding: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      border: `1px solid ${BRAND_COLORS.secondary}33`
                    }}>
                      <span style={{ fontSize: '20px' }}>💪</span>
                      <div>
                        <div style={{ fontSize: '11px', color: BRAND_COLORS.secondary, fontWeight: '600' }}>
                          STABILITY PRO
                        </div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>
                          {properties[Math.floor(Math.random() * properties.length)].name}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              {insights.map((insight, index) => {
                const Icon = insight.icon;
                const bgColor = insight.type === 'success' ? '#f0f9ff' : 
                               insight.type === 'warning' ? '#fffbeb' : '#f8fafc';
                const iconColor = insight.type === 'success' ? BRAND_COLORS.success :
                                 insight.type === 'warning' ? BRAND_COLORS.warning : BRAND_COLORS.primary;
                
                return (
                  <div key={index} style={{
                    background: bgColor,
                    padding: '16px',
                    borderRadius: '8px',
                    border: `1px solid ${BRAND_COLORS.gray[200]}`
                  }}>
                    <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                      <Icon size={20} style={{ color: iconColor, marginTop: '2px' }} />
                      <div>
                        <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '4px' }}>
                          {insight.title}
                        </h4>
                        <p style={{ fontSize: '13px', color: '#64748b', lineHeight: '1.4' }}>
                          {insight.message}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Enhanced Property KPI Boxes */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
            {properties.map((p) => {
              const isRevenueKing = p.name === revenueKing;
              const isMarginMaster = p.name === marginMaster;
              
              return (
                <div
                  key={p.name}
                  onClick={() => handlePropertySelect(p.name)}
                  style={{
                    background: selectedProperty === p.name 
                      ? `linear-gradient(135deg, ${BRAND_COLORS.primary}15, ${BRAND_COLORS.tertiary}15)` 
                      : 'white',
                    border: selectedProperty === p.name 
                      ? `3px solid ${BRAND_COLORS.primary}` 
                      : `2px solid ${BRAND_COLORS.gray[200]}`,
                    borderRadius: '16px',
                    padding: '18px',
                    cursor: 'pointer',
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: selectedProperty === p.name 
                      ? `0 8px 32px ${BRAND_COLORS.primary}40, 0 0 0 1px ${BRAND_COLORS.primary}20` 
                      : '0 4px 16px rgba(0, 0, 0, 0.08)',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseOver={(e) => {
                    if (selectedProperty !== p.name) {
                      e.currentTarget.style.borderColor = BRAND_COLORS.tertiary;
                      e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
                      e.currentTarget.style.boxShadow = `0 12px 32px ${BRAND_COLORS.tertiary}30`;
                    }
                  }}
                  onMouseOut={(e) => {
                    if (selectedProperty !== p.name) {
                      e.currentTarget.style.borderColor = BRAND_COLORS.gray[200];
                      e.currentTarget.style.transform = 'translateY(0) scale(1)';
                      e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.08)';
                    }
                  }}
                >
                  {/* Decorative corner element */}
                  <div style={{
                    position: 'absolute',
                    top: '-20px',
                    right: '-20px',
                    width: '60px',
                    height: '60px',
                    background: `linear-gradient(135deg, ${BRAND_COLORS.tertiary}20, ${BRAND_COLORS.primary}10)`,
                    borderRadius: '50%',
                    opacity: 0.6
                  }} />
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span style={{ 
                      fontWeight: '700', 
                      fontSize: '15px', 
                      color: BRAND_COLORS.accent,
                      textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                    }}>
                      {p.name}
                    </span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {reportType === "pl" && isRevenueKing && (
                        <div style={{
                          background: `linear-gradient(135deg, ${BRAND_COLORS.warning}, #f59e0b)`,
                          borderRadius: '12px',
                          padding: '4px 6px',
                          boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)'
                        }}>
                          <span style={{ fontSize: '16px' }}>👑</span>
                        </div>
                      )}
                      {reportType === "pl" && isMarginMaster && (
                        <div style={{
                          background: `linear-gradient(135deg, ${BRAND_COLORS.success}, #22c55e)`,
                          borderRadius: '12px',
                          padding: '4px 6px',
                          boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)'
                        }}>
                          <span style={{ fontSize: '16px' }}>🏅</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {reportType === "pl" ? (
                    <div style={{ display: 'grid', gap: '8px' }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: `${BRAND_COLORS.success}08`,
                        borderRadius: '8px',
                        border: `1px solid ${BRAND_COLORS.success}20`
                      }}>
                        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Revenue</span>
                        <span style={{ 
                          fontSize: '13px', 
                          fontWeight: '700',
                          color: BRAND_COLORS.success,
                          textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                        }}>
                          {formatCompactCurrency(p.revenue || 0)}
                        </span>
                      </div>
                      
                      {/* Show COGS if available */}
                      {(p.cogs && p.cogs > 0) && (
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          background: `${BRAND_COLORS.danger}08`,
                          borderRadius: '8px',
                          border: `1px solid ${BRAND_COLORS.danger}20`
                        }}>
                          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>COGS</span>
                          <span style={{ 
                            fontSize: '13px', 
                            fontWeight: '700',
                            color: BRAND_COLORS.danger,
                            textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                          }}>
                            {formatCompactCurrency(p.cogs)}
                          </span>
                        </div>
                      )}

                      {/* Show Gross Profit if COGS is available */}
                      {(p.cogs && p.cogs > 0 && p.grossProfit) && (
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          background: `${BRAND_COLORS.tertiary}08`,
                          borderRadius: '8px',
                          border: `1px solid ${BRAND_COLORS.tertiary}20`
                        }}>
                          <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Gross Profit</span>
                          <span style={{ 
                            fontSize: '13px', 
                            fontWeight: '700',
                            color: BRAND_COLORS.tertiary,
                            textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                          }}>
                            {formatCompactCurrency(p.grossProfit)}
                          </span>
                        </div>
                      )}
                      
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: `${BRAND_COLORS.warning}08`,
                        borderRadius: '8px',
                        border: `1px solid ${BRAND_COLORS.warning}20`
                      }}>
                        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>
                          {(p.cogs && p.cogs > 0) ? 'Operating Exp' : 'Expenses'}
                        </span>
                        <span style={{ 
                          fontSize: '13px', 
                          fontWeight: '700',
                          color: BRAND_COLORS.warning,
                          textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                        }}>
                          {formatCompactCurrency(p.expenses || 0)}
                        </span>
                      </div>
                      
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        padding: '12px',
                        background: `linear-gradient(135deg, ${BRAND_COLORS.primary}10, ${BRAND_COLORS.tertiary}05)`,
                        borderRadius: '10px',
                        border: `2px solid ${BRAND_COLORS.primary}30`,
                        boxShadow: `0 4px 12px ${BRAND_COLORS.primary}20`
                      }}>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: BRAND_COLORS.accent }}>Net Income</span>
                        <span style={{ 
                          fontSize: '16px', 
                          fontWeight: '800',
                          color: (p.netIncome || 0) >= 0 ? BRAND_COLORS.success : BRAND_COLORS.danger,
                          textShadow: '0 1px 3px rgba(0,0,0,0.2)'
                        }}>
                          {formatCompactCurrency(p.netIncome || 0)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gap: '10px' }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: `${BRAND_COLORS.primary}08`,
                        borderRadius: '8px',
                        border: `1px solid ${BRAND_COLORS.primary}20`
                      }}>
                        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Operating</span>
                        <span style={{ 
                          fontSize: '13px', 
                          fontWeight: '700',
                          color: BRAND_COLORS.primary,
                          textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                        }}>
                          {formatCompactCurrency(p.operating || 0)}
                        </span>
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: `${BRAND_COLORS.secondary}08`,
                        borderRadius: '8px',
                        border: `1px solid ${BRAND_COLORS.secondary}20`
                      }}>
                        <span style={{ fontSize: '12px', color: '#64748b', fontWeight: '500' }}>Financing</span>
                        <span style={{ 
                          fontSize: '13px', 
                          fontWeight: '700',
                          color: BRAND_COLORS.secondary,
                          textShadow: '0 1px 2px rgba(0,0,0,0.1)'
                        }}>
                          {formatCompactCurrency(p.financing || 0)}
                        </span>
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        padding: '12px',
                        background: `linear-gradient(135deg, ${BRAND_COLORS.accent}10, ${BRAND_COLORS.primary}05)`,
                        borderRadius: '10px',
                        border: `2px solid ${BRAND_COLORS.accent}30`,
                        boxShadow: `0 4px 12px ${BRAND_COLORS.accent}20`
                      }}>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: BRAND_COLORS.accent }}>Net Cash</span>
                        <span style={{ 
                          fontSize: '16px', 
                          fontWeight: '800',
                          color: ((p.operating || 0) + (p.financing || 0)) >= 0 ? BRAND_COLORS.success : BRAND_COLORS.danger,
                          textShadow: '0 1px 3px rgba(0,0,0,0.2)'
                        }}>
                          {formatCompactCurrency((p.operating || 0) + (p.financing || 0))}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === "report" && (
        <div>
          <button 
            onClick={back}
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'none',
              border: 'none',
              fontSize: '16px',
              color: BRAND_COLORS.accent,
              marginBottom: '20px',
              cursor: 'pointer'
            }}
          >
            <ChevronLeft size={20} style={{ marginRight: '4px' }} /> 
            Back to Properties
          </button>
          
          <div style={{
            background: `linear-gradient(135deg, ${BRAND_COLORS.tertiary}, ${BRAND_COLORS.primary})`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
            color: 'white'
          }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
              {selectedProperty || "Company Total"} - {reportType === "pl" ? "P&L Statement" : "Cash Flow Statement"}
            </h2>
            <p style={{ fontSize: '14px', opacity: 0.9 }}>
              {getMonthName(month)} {year}
            </p>
          </div>

          {reportType === "pl" ? (
            <div style={{ display: 'grid', gap: '16px' }}>
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${BRAND_COLORS.gray[200]}`
              }}>
                <h3 style={{ 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  marginBottom: '16px',
                  color: BRAND_COLORS.success,
                  borderBottom: `2px solid ${BRAND_COLORS.success}`,
                  paddingBottom: '8px'
                }}>
                  Revenue
                </h3>
                {plData.revenue.map((cat) => (
                  <div
                    key={cat.name}
                    onClick={() => handleCategory(cat.name)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      marginBottom: '8px',
                      background: BRAND_COLORS.gray[50],
                      borderRadius: '8px',
                      cursor: 'pointer',
                      border: `1px solid ${BRAND_COLORS.gray[200]}`,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = '#f0f9ff';
                      e.currentTarget.style.borderColor = BRAND_COLORS.primary;
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = BRAND_COLORS.gray[50];
                      e.currentTarget.style.borderColor = BRAND_COLORS.gray[200];
                    }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: '500' }}>{cat.name}</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: BRAND_COLORS.success }}>
                      {formatCurrency(cat.total)}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${BRAND_COLORS.gray[200]}`
              }}>
                <h3 style={{ 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  marginBottom: '16px',
                  color: BRAND_COLORS.warning,
                  borderBottom: `2px solid ${BRAND_COLORS.warning}`,
                  paddingBottom: '8px'
                }}>
                  Expenses
                </h3>
                {plData.expenses.map((cat) => (
                  <div
                    key={cat.name}
                    onClick={() => handleCategory(cat.name)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      marginBottom: '8px',
                      background: BRAND_COLORS.gray[50],
                      borderRadius: '8px',
                      cursor: 'pointer',
                      border: `1px solid ${BRAND_COLORS.gray[200]}`,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = '#fff7ed';
                      e.currentTarget.style.borderColor = BRAND_COLORS.warning;
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = BRAND_COLORS.gray[50];
                      e.currentTarget.style.borderColor = BRAND_COLORS.gray[200];
                    }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: '500' }}>{cat.name}</span>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: BRAND_COLORS.warning }}>
                      {formatCurrency(cat.total)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${BRAND_COLORS.gray[200]}`
              }}>
                <h3 style={{ 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  marginBottom: '16px',
                  color: BRAND_COLORS.primary,
                  borderBottom: `2px solid ${BRAND_COLORS.primary}`,
                  paddingBottom: '8px'
                }}>
                  Operating Activities
                </h3>
                {cfData.operating.map((cat) => (
                  <div
                    key={cat.name}
                    onClick={() => handleCategory(cat.name)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      marginBottom: '8px',
                      background: BRAND_COLORS.gray[50],
                      borderRadius: '8px',
                      cursor: 'pointer',
                      border: `1px solid ${BRAND_COLORS.gray[200]}`,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = '#f0f9ff';
                      e.currentTarget.style.borderColor = BRAND_COLORS.primary;
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = BRAND_COLORS.gray[50];
                      e.currentTarget.style.borderColor = BRAND_COLORS.gray[200];
                    }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: '500' }}>{cat.name}</span>
                    <span style={{ 
                      fontSize: '14px', 
                      fontWeight: '600', 
                      color: cat.total >= 0 ? BRAND_COLORS.success : BRAND_COLORS.danger
                    }}>
                      {formatCurrency(cat.total)}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{
                background: 'white',
                borderRadius: '12px',
                padding: '20px',
                border: `1px solid ${BRAND_COLORS.gray[200]}`
              }}>
                <h3 style={{ 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  marginBottom: '16px',
                  color: BRAND_COLORS.secondary,
                  borderBottom: `2px solid ${BRAND_COLORS.secondary}`,
                  paddingBottom: '8px'
                }}>
                  Financing Activities
                </h3>
                {cfData.financing.map((cat) => (
                  <div
                    key={cat.name}
                    onClick={() => handleCategory(cat.name)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      marginBottom: '8px',
                      background: BRAND_COLORS.gray[50],
                      borderRadius: '8px',
                      cursor: 'pointer',
                      border: `1px solid ${BRAND_COLORS.gray[200]}`,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = '#f8fafc';
                      e.currentTarget.style.borderColor = BRAND_COLORS.secondary;
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = BRAND_COLORS.gray[50];
                      e.currentTarget.style.borderColor = BRAND_COLORS.gray[200];
                    }}
                  >
                    <span style={{ fontSize: '14px', fontWeight: '500' }}>{cat.name}</span>
                    <span style={{ 
                      fontSize: '14px', 
                      fontWeight: '600', 
                      color: cat.total >= 0 ? BRAND_COLORS.success : BRAND_COLORS.danger
                    }}>
                      {formatCurrency(cat.total)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {view === "detail" && (
        <div>
          <button 
            onClick={back}
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'none',
              border: 'none',
              fontSize: '16px',
              color: BRAND_COLORS.accent,
              marginBottom: '20px',
              cursor: 'pointer'
            }}
          >
            <ChevronLeft size={20} style={{ marginRight: '4px' }} /> 
            Back to {reportType === "pl" ? "P&L" : "Cash Flow"}
          </button>
          
          <div style={{
            background: `linear-gradient(135deg, ${BRAND_COLORS.accent}, ${BRAND_COLORS.secondary})`,
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
            color: 'white'
          }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>
              {selectedCategory}
            </h2>
            <p style={{ fontSize: '14px', opacity: 0.9 }}>
              Transaction Details • {getMonthName(month)} {year}
            </p>
          </div>

          <div style={{ display: 'grid', gap: '12px' }}>
            {transactions.map((t, idx) => (
              <div key={idx} style={{
                background: 'white',
                borderRadius: '8px',
                padding: '16px',
                border: `1px solid ${BRAND_COLORS.gray[200]}`,
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>
                    {new Date(t.date).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                  <span style={{ 
                    fontSize: '16px', 
                    fontWeight: '600',
                    color: t.amount >= 0 ? BRAND_COLORS.success : BRAND_COLORS.danger
                  }}>
                    {formatCurrency(t.amount)}
                  </span>
                </div>
                <div style={{ 
                  fontSize: '12px', 
                  color: '#64748b', 
                  textAlign: 'right',
                  borderTop: `1px solid ${BRAND_COLORS.gray[100]}`,
                  paddingTop: '8px'
                }}>
                  Running Total: {formatCurrency(t.running)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
