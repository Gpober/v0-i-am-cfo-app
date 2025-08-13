'use client'

import { useState } from 'react'
import { Menu, X, ChevronLeft } from 'lucide-react'

interface Transaction {
  date: string
  amount: number
}

interface Category {
  name: string
  total: number
  transactions: Transaction[]
}

interface PropertyData {
  id: string
  name: string
  revenue: number
  expenses: number
  netIncome: number
  margin: number
  revenueCategories: Category[]
  expenseCategories: Category[]
}

interface DashboardData {
  companyTotal: {
    totalRevenue: number
    totalExpenses: number
    netIncome: number
    profitMargin: number
    revenueCategories: Category[]
    expenseCategories: Category[]
  }
  properties: PropertyData[]
}

const data: DashboardData = {
  companyTotal: {
    totalRevenue: 450000,
    totalExpenses: 320000,
    netIncome: 130000,
    profitMargin: 28.9,
    revenueCategories: [
      {
        name: 'Rent',
        total: 300000,
        transactions: [
          { date: '2024-01-01', amount: 4000 },
          { date: '2024-01-15', amount: 4000 },
        ],
      },
      {
        name: 'Fees',
        total: 150000,
        transactions: [{ date: '2024-01-05', amount: 5000 }],
      },
    ],
    expenseCategories: [
      {
        name: 'Maintenance',
        total: 120000,
        transactions: [{ date: '2024-01-10', amount: 2000 }],
      },
      {
        name: 'Utilities',
        total: 200000,
        transactions: [{ date: '2024-01-20', amount: 3000 }],
      },
    ],
  },
  properties: [
    {
      id: 'prop-a',
      name: 'Property A',
      revenue: 125000,
      expenses: 89000,
      netIncome: 36000,
      margin: 28.8,
      revenueCategories: [
        {
          name: 'Rent',
          total: 80000,
          transactions: [{ date: '2024-01-01', amount: 3000 }],
        },
        {
          name: 'Fees',
          total: 45000,
          transactions: [{ date: '2024-01-05', amount: 2000 }],
        },
      ],
      expenseCategories: [
        {
          name: 'Utilities',
          total: 20000,
          transactions: [{ date: '2024-01-12', amount: 500 }],
        },
        {
          name: 'Repairs',
          total: 69000,
          transactions: [{ date: '2024-01-25', amount: 1000 }],
        },
      ],
    },
    {
      id: 'prop-b',
      name: 'Property B',
      revenue: 180000,
      expenses: 120000,
      netIncome: 60000,
      margin: 33.3,
      revenueCategories: [
        {
          name: 'Rent',
          total: 100000,
          transactions: [{ date: '2024-01-03', amount: 5000 }],
        },
        {
          name: 'Fees',
          total: 80000,
          transactions: [{ date: '2024-01-18', amount: 3000 }],
        },
      ],
      expenseCategories: [
        {
          name: 'Utilities',
          total: 40000,
          transactions: [{ date: '2024-01-11', amount: 1200 }],
        },
        {
          name: 'Repairs',
          total: 80000,
          transactions: [{ date: '2024-01-27', amount: 1500 }],
        },
      ],
    },
  ],
}

export default function MobileDashboard() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [selectedProperty, setSelectedProperty] = useState<PropertyData | null>(null)
  const [view, setView] = useState<'overview' | 'summary' | 'pnl' | 'details'>('overview')
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)

  const scope = selectedProperty ? selectedProperty.name : 'Company Total'
  const scopeData = selectedProperty ? selectedProperty : data.companyTotal

  type Scope = typeof scopeData

  const getRevenue = (s: Scope) =>
    'totalRevenue' in s ? s.totalRevenue : s.revenue
  const getExpenses = (s: Scope) =>
    'totalExpenses' in s ? s.totalExpenses : s.expenses
  const getMargin = (s: Scope) =>
    'profitMargin' in s ? s.profitMargin : s.margin

  const openSummary = (property: PropertyData | null) => {
    setSelectedProperty(property)
    setView('summary')
  }

  const formatCurrency = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

  return (
    <div className="dashboard-container">
      <header className="flex items-center justify-between mb-4">
        <button
          aria-label="Menu"
          onClick={() => setMenuOpen(!menuOpen)}
          className="hamburger-menu"
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
        <h1 className="text-lg font-bold">I AM CFO</h1>
      </header>

      {menuOpen && (
        <nav className="bg-white rounded-lg shadow-md p-4 mb-4">
          {['Overview', 'Time Periods', 'Reports', 'Settings'].map((item) => (
            <div key={item} className="menu-item text-center">
              {item}
            </div>
          ))}
        </nav>
      )}

      {view === 'overview' && (
        <div>
          <div
            className="company-total cursor-pointer"
            onClick={() => openSummary(null)}
          >
            <div className="text-sm">Company Total</div>
            <div className="text-2xl font-bold">
              {formatCurrency(data.companyTotal.netIncome)}
            </div>
            <div className="text-xs">Net Income</div>
          </div>

          <div className="flex flex-wrap justify-between">
            {data.properties.map((p) => (
              <div
                key={p.id}
                className="property-kpi cursor-pointer"
                onClick={() => openSummary(p)}
              >
                <div className="font-semibold mb-1">{p.name}</div>
                <div className="text-sm text-gray-600">
                  {formatCurrency(p.netIncome)} net
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'summary' && (
        <div>
          <button
            onClick={() => {
              setView('overview')
              setSelectedProperty(null)
            }}
            className="flex items-center mb-4 text-sm text-primary"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </button>
          <h2 className="text-lg font-semibold mb-4">{scope} Summary</h2>
          <div>
            <div
              className="summary-card revenue-card cursor-pointer"
              onClick={() => setView('pnl')}
            >
              <div className="text-sm text-text-medium">Total Revenue</div>
              <div className="text-xl font-bold">{formatCurrency(getRevenue(scopeData))}</div>
            </div>
            <div
              className="summary-card expense-card cursor-pointer"
              onClick={() => setView('pnl')}
            >
              <div className="text-sm text-text-medium">Total Expenses</div>
              <div className="text-xl font-bold">{formatCurrency(getExpenses(scopeData))}</div>
            </div>
            <div
              className="summary-card net-income-card cursor-pointer"
              onClick={() => setView('pnl')}
            >
              <div className="text-sm text-text-medium">Net Income</div>
              <div className="text-xl font-bold">
                {formatCurrency(scopeData.netIncome)}
              </div>
            </div>
            <div
              className="summary-card margin-card cursor-pointer"
              onClick={() => setView('pnl')}
            >
              <div className="text-sm text-text-medium">Profit Margin</div>
              <div className="text-xl font-bold">{getMargin(scopeData).toFixed(1)}%</div>
            </div>
          </div>
        </div>
      )}

      {view === 'pnl' && (
        <div>
          <button
            onClick={() => setView('summary')}
            className="flex items-center mb-4 text-sm text-primary"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </button>
          <h2 className="text-lg font-semibold mb-4">P&amp;L Summary</h2>
          <div className="mb-4">
            {scopeData.revenueCategories.map((c) => (
              <div
                key={c.name}
                className="summary-card revenue-card cursor-pointer"
                onClick={() => {
                  setSelectedCategory(c)
                  setView('details')
                }}
              >
                <div className="text-sm text-text-medium">{c.name}</div>
                <div className="text-xl font-bold">{formatCurrency(c.total)}</div>
              </div>
            ))}
          </div>
          <div>
            {scopeData.expenseCategories.map((c) => (
              <div
                key={c.name}
                className="summary-card expense-card cursor-pointer"
                onClick={() => {
                  setSelectedCategory(c)
                  setView('details')
                }}
              >
                <div className="text-sm text-text-medium">{c.name}</div>
                <div className="text-xl font-bold">{formatCurrency(c.total)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'details' && selectedCategory && (
        <div>
          <button
            onClick={() => setView('pnl')}
            className="flex items-center mb-4 text-sm text-primary"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </button>
          <h2 className="text-lg font-semibold mb-4">{selectedCategory.name}</h2>
          <div className="space-y-2">
            {selectedCategory.transactions.map((t, idx) => (
              <div key={idx} className="summary-card">
                <div className="text-sm text-text-medium">{t.date}</div>
                <div className="text-lg font-bold">{formatCurrency(t.amount)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

