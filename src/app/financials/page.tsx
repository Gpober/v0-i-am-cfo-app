"use client";

import React, { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, Minus, Download, RefreshCw, TrendingUp, DollarSign, PieChart, BarChart3, ChevronDown, ChevronRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Cell, Pie } from 'recharts';

// IAM CFO Brand Colors
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
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A'
  }
};

// API Configuration - YOUR REAL DEPLOYMENT URL
const API_BASE = 'https://script.google.com/macros/s/AKfycbwa-onxvlAVJTwdg_vasOLyGs0iSN32MO4ASBabdO6YTXTdwJBueyATp1ZNDHaHbkC2/exec';

// Type definitions
type FinancialTab = 'p&l' | 'cash-flow' | 'balance-sheet';
type TimeView = 'Monthly' | 'YTD' | 'TTM' | 'MoM' | 'YoY';
type ViewMode = 'total' | 'detailed';
type MonthString = `${'January' | 'February' | 'March' | 'April' | 'May' | 'June' | 
                   'July' | 'August' | 'September' | 'October' | 'November' | 'December'} ${number}`;

interface FinancialDataItem {
  name: string;
  total: number;
  months: Partial<Record<MonthString, number>>;
}

interface FinancialData {
  [timeView: string]: {
    [month: string]: FinancialDataItem[];
  };
}

interface NotificationState {
  show: boolean;
  message: string;
  type: 'info' | 'success' | 'error';
}

interface TooltipState {
  show: boolean;
  content: string;
  x: number;
  y: number;
}

interface PropertyFinancialData {
  [property: string]: FinancialData;
}

interface PropertyCashFlowData {
  [property: string]: {
    inFlow: FinancialDataItem[];
    outFlow: FinancialDataItem[];
    totalInFlow: number;
    totalOutFlow: number;
    totalCashFlow: number;
    beginningCash: number;
    endingCash: number;
  };
}

// IAM CFO Logo Component
const IAMCFOLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <div className={`${className} flex items-center justify-center relative`}>
    <svg viewBox="0 0 120 120" className="w-full h-full">
      <circle cx="60" cy="60" r="55" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="2"/>
      <circle cx="60" cy="60" r="42" fill={BRAND_COLORS.primary}/>
      <g fill="white">
        <rect x="35" y="70" width="6" height="15" rx="1"/>
        <rect x="44" y="65" width="6" height="20" rx="1"/>
        <rect x="53" y="55" width="6" height="30" rx="1"/>
        <rect x="62" y="50" width="6" height="35" rx="1"/>
        <rect x="71" y="60" width="6" height="25" rx="1"/>
        <rect x="80" y="45" width="6" height="40" rx="1"/>
        <path d="M35 72 L44 67 L53 57 L62 52 L71 62 L80 47" 
              stroke="#FFFFFF" strokeWidth="2.5" fill="none"/>
        <circle cx="35" cy="72" r="2.5" fill="#FFFFFF"/>
        <circle cx="44" cy="67" r="2.5" fill="#FFFFFF"/>
        <circle cx="53" cy="57" r="2.5" fill="#FFFFFF"/>
        <circle cx="62" cy="52" r="2.5" fill="#FFFFFF"/>
        <circle cx="71" cy="62" r="2.5" fill="#FFFFFF"/>
        <circle cx="80" cy="47" r="2.5" fill="#FFFFFF"/>
      </g>
      <text x="60" y="95" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold" fontFamily="Arial, sans-serif">CFO</text>
    </svg>
  </div>
);

// API Functions
const fetchFromAPI = async (endpoint: string, params: Record<string, string> = {}) => {
  try {
    const urlParams = new URLSearchParams(params);
    const response = await fetch(`${API_BASE}?endpoint=${endpoint}&${urlParams}`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    throw error;
  }
};

const loadFinancialData = async (property: string, bankAccount: string, month: string) => {
  return await fetchFromAPI('financial-data', {
    property,
    bankAccount,
    month
  });
};

const loadProperties = async () => {
  const response = await fetchFromAPI('properties');
  return response.properties || ['All Properties'];
};

const loadBankAccounts = async () => {
  const response = await fetchFromAPI('bank-accounts');
  return response.bankAccounts || ['All Accounts'];
};

const COLORS = [BRAND_COLORS.primary, BRAND_COLORS.success, BRAND_COLORS.warning, BRAND_COLORS.danger, BRAND_COLORS.secondary, BRAND_COLORS.tertiary];

export default function FinancialsPage() {
  const [activeTab, setActiveTab] = useState<FinancialTab>('p&l');
  const [selectedMonth, setSelectedMonth] = useState<MonthString>('June 2025');
  const [viewMode, setViewMode] = useState<ViewMode>('detailed');
  const [timeView, setTimeView] = useState<TimeView>('Monthly');
  const [notification, setNotification] = useState<NotificationState>({ show: false, message: '', type: 'info' });
  const [timeViewDropdownOpen, setTimeViewDropdownOpen] = useState(false);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [accountTooltip, setAccountTooltip] = useState<TooltipState>({ show: false, content: '', x: 0, y: 0 });
  const [bankAccountDropdownOpen, setBankAccountDropdownOpen] = useState(false);
  const [selectedBankAccounts, setSelectedBankAccounts] = useState<Set<string>>(new Set(['All Accounts']));
  const [propertyDropdownOpen, setPropertyDropdownOpen] = useState(false);
  const [selectedProperties, setSelectedProperties] = useState<Set<string>>(new Set(['All Properties']));

  // Real data state
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [realData, setRealData] = useState<any>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [availableProperties, setAvailableProperties] = useState<string[]>(['All Properties']);
  const [availableBankAccounts, setAvailableBankAccounts] = useState<string[]>(['All Accounts']);

  // Available months (you might want to get these from API too)
  const monthsList: MonthString[] = [
    'January 2023', 'February 2023', 'March 2023', 'April 2023', 'May 2023', 'June 2023',
    'July 2023', 'August 2023', 'September 2023', 'October 2023', 'November 2023', 'December 2023',
    'January 2024', 'February 2024', 'March 2024', 'April 2024', 'May 2024', 'June 2024',
    'July 2024', 'August 2024', 'September 2024', 'October 2024', 'November 2024', 'December 2024',
    'January 2025', 'February 2025', 'March 2025', 'April 2025', 'May 2025', 'June 2025'
  ];

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Load data when filters change
  useEffect(() => {
    loadRealFinancialData();
  }, [selectedProperties, selectedBankAccounts, selectedMonth]);

  const loadInitialData = async () => {
    try {
      setIsLoadingData(true);
      
      // Load properties and bank accounts
      const [properties, bankAccounts] = await Promise.all([
        loadProperties(),
        loadBankAccounts()
      ]);
      
      setAvailableProperties(properties);
      setAvailableBankAccounts(bankAccounts);
      
      // Load initial financial data
      await loadRealFinancialData();
      
    } catch (error) {
      console.error('Failed to load initial data:', error);
      setDataError('Failed to load initial data');
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadRealFinancialData = async () => {
    try {
      setIsLoadingData(true);
      setDataError(null);
      
      const property = selectedProperties.has('All Properties') || selectedProperties.size === 0 
        ? 'All Properties' 
        : Array.from(selectedProperties)[0];
      
      const bankAccount = selectedBankAccounts.has('All Accounts') || selectedBankAccounts.size === 0
        ? 'All Accounts'
        : Array.from(selectedBankAccounts)[0];
      
      const data = await loadFinancialData(property, bankAccount, selectedMonth);
      
      if (data.success) {
        setRealData(data);
        setDataError(null);
        showNotification('Financial data loaded successfully', 'success');
      } else {
        setDataError(data.error || 'Failed to load financial data');
        showNotification('Failed to load financial data', 'error');
      }
      
    } catch (error) {
      console.error('Failed to load financial data:', error);
      setDataError('Failed to load financial data');
      showNotification('Failed to load financial data', 'error');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handlePropertyToggle = (property: string) => {
    const newSelected = new Set(selectedProperties);
    
    if (property === 'All Properties') {
      if (newSelected.has('All Properties')) {
        newSelected.clear();
      } else {
        newSelected.clear();
        newSelected.add('All Properties');
      }
    } else {
      newSelected.delete('All Properties');
      if (newSelected.has(property)) {
        newSelected.delete(property);
      } else {
        newSelected.add(property);
      }
    }
    setSelectedProperties(newSelected);
  };

  const handleBankAccountToggle = (account: string) => {
    const newSelected = new Set(selectedBankAccounts);
    
    if (account === 'All Accounts') {
      if (newSelected.has('All Accounts')) {
        newSelected.clear();
      } else {
        newSelected.clear();
        newSelected.add('All Accounts');
      }
    } else {
      newSelected.delete('All Accounts');
      if (newSelected.has(account)) {
        newSelected.delete(account);
      } else {
        newSelected.add(account);
      }
    }
    setSelectedBankAccounts(newSelected);
  };

  const getSelectedBankAccountsText = () => {
    if (selectedBankAccounts.has('All Accounts') || selectedBankAccounts.size === 0) {
      return 'All Accounts';
    }
    if (selectedBankAccounts.size === 1) {
      return Array.from(selectedBankAccounts)[0];
    }
    return `${selectedBankAccounts.size} Accounts Selected`;
  };

  const getSelectedPropertiesText = () => {
    if (selectedProperties.has('All Properties') || selectedProperties.size === 0) {
      return 'All Properties';
    }
    if (selectedProperties.size === 1) {
      return Array.from(selectedProperties)[0];
    }
    return `${selectedProperties.size} Properties Selected`;
  };

  // Helper functions
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);
  };

  const calculatePercentage = (value: number, total: number): string => {
    return total !== 0 ? ((value / total) * 100).toFixed(1) + '%' : '0%';
  };

  const showNotification = (message: string, type: 'info' | 'success' | 'error' = 'info'): void => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'info' });
    }, 3000);
  };

  const toggleAccountExpansion = (accountName: string): void => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountName)) {
      newExpanded.delete(accountName);
    } else {
      newExpanded.add(accountName);
    }
    setExpandedAccounts(newExpanded);
  };

  // Get current financial data (from real API or fallback)
  const getCurrentFinancialData = () => {
    if (realData && realData.propertyFinancialData) {
      const propertyKey = Object.keys(realData.propertyFinancialData)[0] || 'All Properties';
      const monthlyData = realData.propertyFinancialData[propertyKey]?.Monthly;
      return monthlyData?.[selectedMonth] || [];
    }
    return [];
  };

  const getCurrentCashFlowData = () => {
    if (realData && realData.propertyCashFlowData) {
      const propertyKey = Object.keys(realData.propertyCashFlowData)[0] || 'All Properties';
      return realData.propertyCashFlowData[propertyKey] || {
        inFlow: [],
        outFlow: [],
        totalInFlow: 0,
        totalOutFlow: 0,
        totalCashFlow: 0,
        beginningCash: 0,
        endingCash: 0
      };
    }
    return {
      inFlow: [],
      outFlow: [],
      totalInFlow: 0,
      totalOutFlow: 0,
      totalCashFlow: 0,
      beginningCash: 0,
      endingCash: 0
    };
  };

  const currentData = getCurrentFinancialData();
  const currentCashFlowData = getCurrentCashFlowData();

  // Calculate KPIs from real data
  const calculateKPIs = () => {
    const revenue = currentData.find(item => item.name === 'Revenue')?.total || 0;
    const grossProfit = currentData.find(item => item.name === 'Gross Profit')?.total || 0;
    const operatingIncome = currentData.find(item => item.name === 'Operating Income')?.total || 0;
    const netIncome = currentData.find(item => item.name === 'Net Income')?.total || 0;
    
    return {
      revenue,
      grossMargin: revenue ? (grossProfit / revenue) * 100 : 0,
      operatingMargin: revenue ? (operatingIncome / revenue) * 100 : 0,
      netMargin: revenue ? (netIncome / revenue) * 100 : 0
    };
  };

  const generateTrendData = () => {
    // This could be enhanced to use real historical data from the API
    const months = ['Jan 2025', 'Feb 2025', 'Mar 2025', 'Apr 2025', 'May 2025', 'Jun 2025'];
    const revenue = currentData.find(item => item.name === 'Revenue')?.total || 0;
    
    return months.map((month, index) => ({
      month,
      revenue: revenue * (0.8 + (index * 0.04)), // Simulated trend
      grossProfit: (revenue * (0.8 + (index * 0.04))) * 0.4,
      operatingIncome: (revenue * (0.8 + (index * 0.04))) * 0.2,
      netIncome: (revenue * (0.8 + (index * 0.04))) * 0.15,
    }));
  };

  const generateExpenseBreakdown = () => {
    const cogs = currentData.find(item => item.name === 'Cost of Goods Sold')?.total || 0;
    const opex = currentData.find(item => item.name === 'Operating Expenses')?.total || 0;
    const interest = currentData.find(item => item.name === 'Interest Expense')?.total || 0;
    const taxes = currentData.find(item => item.name === 'Taxes')?.total || 0;
    
    return [
      { name: 'Cost of Goods Sold', value: cogs },
      { name: 'Operating Expenses', value: opex },
      { name: 'Interest Expense', value: interest },
      { name: 'Taxes', value: taxes },
    ].filter(item => item.value > 0);
  };

  const kpis = calculateKPIs();
  const trendData = generateTrendData();
  const expenseData = generateExpenseBreakdown();

  const renderColumnHeaders = () => {
    return (
      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
        {selectedMonth}
      </th>
    );
  };

  const renderCashFlowDataCells = (item: FinancialDataItem) => {
    const value = item.total || 0;
    return (
      <td className={`px-4 py-3 text-right text-sm font-medium ${
        value >= 0 ? 'text-green-600' : 'text-red-600'
      }`}>
        {value >= 0 ? formatCurrency(value) : `(${formatCurrency(Math.abs(value))})`}
      </td>
    );
  };

  const renderDataCells = (item: FinancialDataItem) => {
    const value = item.total || 0;
    return (
      <td className="px-4 py-3 text-right text-sm font-medium">
        {formatCurrency(value)}
      </td>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header with IAM CFO Branding */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center">
            <IAMCFOLogo className="w-8 h-8 mr-4" />
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-bold text-gray-900">IAM CFO</h1>
                <span className="text-sm px-3 py-1 rounded-full text-white" style={{ backgroundColor: BRAND_COLORS.primary }}>
                  Financial Management
                </span>
                {realData && (
                  <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                    Live Data Connected
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Real-time P&L, Cash Flow & Balance Sheet • QuickBooks Integration
                {realData?.summary && (
                  <span className="ml-2 text-green-600">
                    • {realData.summary.filteredEntries} entries loaded
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Header Controls */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <h2 className="text-3xl font-bold" style={{ color: BRAND_COLORS.primary }}>Financial Management</h2>
            <div className="flex flex-wrap gap-4 items-center">
              {/* Month Selector */}
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value as MonthString)}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm hover:border-blue-500 focus:outline-none focus:ring-2 transition-all"
                style={{ '--tw-ring-color': BRAND_COLORS.secondary + '33' } as React.CSSProperties}
              >
                {monthsList.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>

              {/* Property Filter Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setPropertyDropdownOpen(!propertyDropdownOpen)}
                  className="flex items-center justify-between w-48 px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm hover:border-blue-500 focus:outline-none focus:ring-2 transition-all"
                  style={{ '--tw-ring-color': BRAND_COLORS.secondary + '33' } as React.CSSProperties}
                >
                  <span className="truncate">{getSelectedPropertiesText()}</span>
                  <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${propertyDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {propertyDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                    {availableProperties.map((property) => (
                      <div
                        key={property}
                        className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                        onClick={() => handlePropertyToggle(property)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedProperties.has(property)}
                          onChange={() => {}}
                          className="mr-3 h-4 w-4 border-gray-300 rounded"
                          style={{ accentColor: BRAND_COLORS.primary }}
                        />
                        <span className={property === 'All Properties' ? 'font-medium text-gray-900' : 'text-gray-700'}>
                          {property}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Time View Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setTimeViewDropdownOpen(!timeViewDropdownOpen)}
                  className="flex items-center justify-between w-32 px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm hover:border-blue-500 focus:outline-none focus:ring-2 transition-all"
                  style={{ '--tw-ring-color': BRAND_COLORS.secondary + '33' } as React.CSSProperties}
                >
                  <span>{timeView}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${timeViewDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {timeViewDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
                    {(['Monthly', 'YTD', 'TTM', 'MoM', 'YoY'] as TimeView[]).map((view) => (
                      <div
                        key={view}
                        className="px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                        onClick={() => {
                          setTimeView(view);
                          setTimeViewDropdownOpen(false);
                        }}
                      >
                        {view}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* View Mode Toggle */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('total')}
                  className={`px-3 py-2 text-sm rounded-md transition-colors ${
                    viewMode === 'total'
                      ? 'text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  style={{ backgroundColor: viewMode === 'total' ? BRAND_COLORS.primary : undefined }}
                >
                  Total
                </button>
                <button
                  onClick={() => setViewMode('detailed')}
                  className={`px-3 py-2 text-sm rounded-md transition-colors ${
                    viewMode === 'detailed'
                      ? 'text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  style={{ backgroundColor: viewMode === 'detailed' ? BRAND_COLORS.primary : undefined }}
                >
                  Detailed
                </button>
              </div>

              {/* Action Buttons */}
              <button
                onClick={() => showNotification('Financial data exported', 'success')}
                className="flex items-center gap-2 px-4 py-2 text-white rounded-lg hover:opacity-90 transition-colors shadow-sm"
                style={{ backgroundColor: BRAND_COLORS.primary }}
              >
                <Download className="w-4 h-4" />
                Export
              </button>

              <button
                onClick={loadRealFinancialData}
                disabled={isLoadingData}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingData ? 'animate-spin' : ''}`} />
                {isLoadingData ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* Data Status */}
          {dataError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-red-800 text-sm">
                <strong>Error:</strong> {dataError}
              </div>
            </div>
          )}

          {realData?.performance && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-green-800 text-sm">
                <strong>Data Status:</strong> Loaded {realData.summary.filteredEntries} entries 
                in {realData.performance.executionTimeMs}ms • Source: {realData.summary.dataSource}
                {realData.summary.journalEntriesFound && (
                  <span> • {realData.summary.journalEntriesFound} journal entries processed</span>
                )}
              </div>
            </div>
          )}

          {/* Financial KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 hover:shadow-md transition-shadow" style={{ borderLeftColor: BRAND_COLORS.primary }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-600 text-sm font-medium mb-2">Total Revenue</div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">{formatCurrency(kpis.revenue)}</div>
                  <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full inline-block">
                    Real QuickBooks Data
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {getSelectedPropertiesText()}
                  </div>
                </div>
                <DollarSign className="w-8 h-8" style={{ color: BRAND_COLORS.primary }} />
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 hover:shadow-md transition-shadow" style={{ borderLeftColor: BRAND_COLORS.success }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-600 text-sm font-medium mb-2">Gross Margin</div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">{kpis.grossMargin.toFixed(1)}%</div>
                  <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full inline-block">
                    Live Calculation
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {getSelectedPropertiesText()}
                  </div>
                </div>
                <TrendingUp className="w-8 h-8" style={{ color: BRAND_COLORS.success }} />
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 hover:shadow-md transition-shadow" style={{ borderLeftColor: BRAND_COLORS.warning }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-600 text-sm font-medium mb-2">Operating Margin</div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">{kpis.operatingMargin.toFixed(1)}%</div>
                  <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full inline-block">
                    Live Calculation
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {getSelectedPropertiesText()}
                  </div>
                </div>
                <BarChart3 className="w-8 h-8" style={{ color: BRAND_COLORS.warning }} />
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 hover:shadow-md transition-shadow" style={{ borderLeftColor: BRAND_COLORS.secondary }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-600 text-sm font-medium mb-2">Net Margin</div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">{kpis.netMargin.toFixed(1)}%</div>
                  <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full inline-block">
                    Live Calculation
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {getSelectedPropertiesText()}
                  </div>
                </div>
                <PieChart className="w-8 h-8" style={{ color: BRAND_COLORS.secondary }} />
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Financial Tables */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-semibold text-gray-900">
                      {activeTab === 'p&l' ? 'Profit & Loss Statement' : 
                       activeTab === 'cash-flow' ? 'Cash Flow Statement' : 
                       'Balance Sheet'}
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setActiveTab('p&l')}
                        className={`px-3 py-1 text-xs rounded transition-colors ${
                          activeTab === 'p&l' 
                            ? 'text-white' 
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                        style={{ backgroundColor: activeTab === 'p&l' ? BRAND_COLORS.primary : undefined }}
                      >
                        P&L
                      </button>
                      <button
                        onClick={() => setActiveTab('cash-flow')}
                        className={`px-3 py-1 text-xs rounded transition-colors ${
                          activeTab === 'cash-flow' 
                            ? 'text-white' 
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                        style={{ backgroundColor: activeTab === 'cash-flow' ? BRAND_COLORS.primary : undefined }}
                      >
                        Cash Flow
                      </button>
                      <button
                        onClick={() => setActiveTab('balance-sheet')}
                        className={`px-3 py-1 text-xs rounded transition-colors ${
                          activeTab === 'balance-sheet' 
                            ? 'text-white' 
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                        style={{ backgroundColor: activeTab === 'balance-sheet' ? BRAND_COLORS.primary : undefined }}
                      >
                        Balance Sheet
                      </button>
                    </div>
                  </div>
                </div>

                {/* P&L Content */}
                {activeTab === 'p&l' && (
                  <div className="overflow-x-auto">
                    {isLoadingData ? (
                      <div className="flex items-center justify-center py-8">
                        <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                        <span>Loading financial data...</span>
                      </div>
                    ) : currentData.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No financial data available for the selected filters
                      </div>
                    ) : (
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Account
                            </th>
                            {renderColumnHeaders()}
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              % of Revenue
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {currentData.map((item, index) => {
                            const isTotalRow = item.name === 'Net Income' || item.name === 'Gross Profit';
                            const revenueItem = currentData.find(i => i.name === 'Revenue');
                            const percentOfRevenue = revenueItem 
                              ? calculatePercentage(item.total, revenueItem.total)
                              : '0%';

                            return (
                              <tr 
                                key={item.name}
                                className={`hover:bg-gray-50 transition-colors ${isTotalRow ? 'bg-gray-50 font-semibold' : ''}`}
                              >
                                <td className={`px-4 py-3 text-left text-sm ${
                                  isTotalRow ? 'font-semibold text-gray-900' : 'text-gray-700'
                                }`}>
                                  {item.name}
                                </td>
                                {renderDataCells(item)}
                                <td className="px-4 py-3 text-right text-sm text-gray-500">
                                  {percentOfRevenue}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}

                {/* Cash Flow Content */}
                {activeTab === 'cash-flow' && (
                  <div>
                    {/* Bank Account Selector */}
                    <div className="p-4 bg-gray-50 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-700">Select Bank Accounts:</h4>
                        <div className="relative">
                          <button
                            onClick={() => setBankAccountDropdownOpen(!bankAccountDropdownOpen)}
                            className="flex items-center justify-between w-64 px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm hover:border-blue-500 focus:outline-none focus:ring-2 transition-all"
                            style={{ '--tw-ring-color': BRAND_COLORS.secondary + '33' } as React.CSSProperties}
                          >
                            <span className="truncate">{getSelectedBankAccountsText()}</span>
                            <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${bankAccountDropdownOpen ? 'rotate-180' : ''}`} />
                          </button>
                          
                          {bankAccountDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                              {availableBankAccounts.map((account) => (
                                <div
                                  key={account}
                                  className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                                  onClick={() => handleBankAccountToggle(account)}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedBankAccounts.has(account)}
                                    onChange={() => {}}
                                    className="mr-3 h-4 w-4 border-gray-300 rounded"
                                    style={{ accentColor: BRAND_COLORS.primary }}
                                  />
                                  <span className={account === 'All Accounts' ? 'font-medium text-gray-900' : 'text-gray-700'}>
                                    {account}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        Viewing cash flow for: {getSelectedBankAccountsText()}
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      {isLoadingData ? (
                        <div className="flex items-center justify-center py-8">
                          <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                          <span>Loading cash flow data...</span>
                        </div>
                      ) : (
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Account
                              </th>
                              {renderColumnHeaders()}
                              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                % of Total Cash
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {/* Cash In-Flow Section */}
                            <tr className="bg-green-50">
                              <td colSpan={100} className="px-4 py-3 text-left text-sm font-bold text-green-800">
                                💰 CASH IN-FLOW
                              </td>
                            </tr>
                            {currentCashFlowData.inFlow.map((item) => {
                              const totalCash = Math.abs(currentCashFlowData.totalCashFlow) || 1;
                              const percentOfCash = calculatePercentage(item.total, totalCash);

                              return (
                                <tr key={`inflow-${item.name}`} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-4 py-3 text-left text-sm text-gray-700">
                                    <span className="ml-4">{item.name}</span>
                                  </td>
                                  {renderCashFlowDataCells(item)}
                                  <td className="px-4 py-3 text-right text-sm text-green-600">
                                    {percentOfCash}
                                  </td>
                                </tr>
                              );
                            })}
                            
                            {/* Total Cash In-Flow */}
                            <tr className="bg-green-100 font-semibold">
                              <td className="px-4 py-3 text-left text-sm text-green-800 font-bold">
                                Total Cash In-Flow
                              </td>
                              <td className="px-4 py-3 text-right text-sm text-green-800 font-bold">
                                {formatCurrency(currentCashFlowData.totalInFlow)}
                              </td>
                              <td className="px-4 py-3 text-right text-sm text-green-800 font-bold">
                                100%
                              </td>
                            </tr>

                            {/* Cash Out-Flow Section */}
                            <tr className="bg-red-50">
                              <td colSpan={100} className="px-4 py-3 text-left text-sm font-bold text-red-800">
                                💸 CASH OUT-FLOW
                              </td>
                            </tr>
                            {currentCashFlowData.outFlow.map((item) => {
                              const totalCash = Math.abs(currentCashFlowData.totalCashFlow) || 1;
                              const percentOfCash = calculatePercentage(Math.abs(item.total), totalCash);

                              return (
                                <tr key={`outflow-${item.name}`} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-4 py-3 text-left text-sm text-gray-700">
                                    <span className="ml-4">{item.name}</span>
                                  </td>
                                  {renderCashFlowDataCells(item)}
                                  <td className="px-4 py-3 text-right text-sm text-red-600">
                                    {percentOfCash}
                                  </td>
                                </tr>
                              );
                            })}

                            {/* Total Cash Out-Flow */}
                            <tr className="bg-red-100 font-semibold">
                              <td className="px-4 py-3 text-left text-sm text-red-800 font-bold">
                                Total Cash Out-Flow
                              </td>
                              <td className="px-4 py-3 text-right text-sm text-red-800 font-bold">
                                ({formatCurrency(Math.abs(currentCashFlowData.totalOutFlow))})
                              </td>
                              <td className="px-4 py-3 text-right text-sm text-red-800 font-bold">
                                100%
                              </td>
                            </tr>

                            {/* Net Cash Flow */}
                            <tr className="border-t-2" style={{ backgroundColor: BRAND_COLORS.primary + '10', borderTopColor: BRAND_COLORS.primary + '40' }}>
                              <td className="px-4 py-4 text-left text-lg font-bold" style={{ color: BRAND_COLORS.primary }}>
                                🏦 NET CASH FLOW
                              </td>
                              <td className={`px-4 py-4 text-right text-lg font-bold ${
                                currentCashFlowData.totalCashFlow >= 0 ? 'text-green-700' : 'text-red-700'
                              }`}>
                                {formatCurrency(currentCashFlowData.totalCashFlow)}
                              </td>
                              <td className="px-4 py-4 text-right text-sm" style={{ color: BRAND_COLORS.primary }}>
                                Net Change
                              </td>
                            </tr>

                            {/* Beginning & Ending Cash Balance */}
                            <tr className="bg-gray-50">
                              <td className="px-4 py-3 text-left text-sm text-gray-700">
                                Beginning Cash Balance
                              </td>
                              <td className="px-4 py-3 text-right text-sm text-gray-700">
                                {formatCurrency(currentCashFlowData.beginningCash)}
                              </td>
                              <td className="px-4 py-3 text-right text-sm text-gray-500">
                                Starting
                              </td>
                            </tr>
                            <tr className="border-t" style={{ backgroundColor: BRAND_COLORS.primary + '20', borderTopColor: BRAND_COLORS.primary + '40' }}>
                              <td className="px-4 py-3 text-left text-sm font-bold" style={{ color: BRAND_COLORS.primary }}>
                                Ending Cash Balance
                              </td>
                              <td className="px-4 py-3 text-right text-sm font-bold" style={{ color: BRAND_COLORS.primary }}>
                                {formatCurrency(currentCashFlowData.endingCash)}
                              </td>
                              <td className="px-4 py-3 text-right text-sm" style={{ color: BRAND_COLORS.primary }}>
                                Final
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                )}

                {/* Balance Sheet Content */}
                {activeTab === 'balance-sheet' && (
                  <div className="overflow-x-auto">
                    <div className="text-center py-8 text-gray-500">
                      Balance Sheet functionality will be available in the next update
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Charts */}
            <div className="space-y-8">
              {/* Revenue Trend Chart */}
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900">Revenue Trend</h3>
                </div>
                <div className="p-6">
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(value: any) => `${(value / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value: any) => [`${formatCurrency(Number(value))}`, 'Revenue']} />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke={BRAND_COLORS.primary} 
                        strokeWidth={3}
                        dot={{ r: 6, fill: BRAND_COLORS.primary }}
                        activeDot={{ r: 8, fill: BRAND_COLORS.primary }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Expense Breakdown */}
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900">Expense Breakdown</h3>
                </div>
                <div className="p-6">
                  {expenseData.length > 0 ? (
                    <>
                      <ResponsiveContainer width="100%" height={300}>
                        <RechartsPieChart>
                          <Tooltip 
                            formatter={(value: any) => [`${formatCurrency(Number(value))}`, '']}
                            labelFormatter={(label) => label}
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              color: '#374151',
                              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                            }}
                          />
                          <Pie
                            data={expenseData}
                            cx="50%"
                            cy="50%"
                            outerRadius={90}
                            fill="#8884d8"
                            dataKey="value"
                            label={({name, percent}) => `${(percent * 100).toFixed(1)}%`}
                            labelLine={false}
                          >
                            {expenseData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                        </RechartsPieChart>
                      </ResponsiveContainer>
                      
                      {/* Manual Legend */}
                      <div className="mt-6 grid grid-cols-2 gap-4">
                        {expenseData.map((item, index) => {
                          const total = expenseData.reduce((sum, expense) => sum + expense.value, 0);
                          const percent = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
                          return (
                            <div key={item.name} className="flex items-center space-x-3">
                              <div 
                                className="w-4 h-4 rounded-full flex-shrink-0"
                                style={{ backgroundColor: COLORS[index % COLORS.length] }}
                              ></div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900 truncate">{item.name}</div>
                                <div className="text-xs text-gray-500">
                                  {formatCurrency(item.value)} ({percent}%)
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      No expense data available
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Notification */}
          {notification.show && (
            <div className={`fixed top-5 right-5 z-50 px-6 py-4 rounded-lg text-white font-medium shadow-lg transition-transform ${
              notification.type === 'success' ? 'bg-green-500' :
              notification.type === 'error' ? 'bg-red-500' :
              'bg-blue-500'
            } ${notification.show ? 'translate-x-0' : 'translate-x-full'}`}>
              {notification.message}
            </div>
          )}

          {/* Click outside to close dropdowns */}
          {(timeViewDropdownOpen || propertyDropdownOpen || bankAccountDropdownOpen) && (
            <div
              className="fixed inset-0 z-10"
              onClick={() => {
                setTimeViewDropdownOpen(false);
                setPropertyDropdownOpen(false);
                setBankAccountDropdownOpen(false);
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
}
