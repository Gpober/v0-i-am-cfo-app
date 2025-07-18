"use client";

import React, { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, Minus, Download, RefreshCw, TrendingUp, DollarSign, PieChart, BarChart3, ChevronDown, ChevronRight, Menu, X, Eye, EyeOff } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Cell, Pie, ComposedChart } from 'recharts';

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

// Supabase Configuration
const SUPABASE_URL = 'https://pjaieumtjszcwussmwel.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYWlldW10anN6Y3d1c3Ntd2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwNDQyMTgsImV4cCI6MjA2NzYyMDIxOH0.E1y-qx4EW7dbdN_2sijZaiQVO7ZcqnwC9hTSIccChP0';

// P&L Account Classification
const classifyAccount = (accountType, accountDetailType, accountName) => {
  const type = (accountType || '').toLowerCase().trim();
  const detailType = (accountDetailType || '').toLowerCase().trim();
  const name = (accountName || '').toLowerCase().trim();
  
  // Exclude Balance Sheet accounts
  const balanceSheetTypes = [
    'asset', 'assets', 'current asset', 'fixed asset', 'other asset',
    'liability', 'liabilities', 'current liability', 'long term liability',
    'equity', 'owner equity', 'retained earnings', 'capital', 'stockholder equity',
    'accounts receivable', 'accounts payable', 'cash', 'bank', 'inventory',
    'equipment', 'property', 'building', 'loan', 'credit card', 'payroll liability'
  ];
  
  if (balanceSheetTypes.some(bsType => type.includes(bsType) || detailType.includes(bsType))) {
    return null;
  }
  
  // P&L accounts only
  if (type === 'income' || type === 'revenue' || type === 'sales') {
    return 'Revenue';
  }
  
  if (type === 'cost of goods sold' || type === 'cogs' || 
      detailType.includes('cost of goods sold') || 
      detailType.includes('cogs')) {
    return 'COGS';
  }
  
  if (type === 'other income' || detailType.includes('other income')) {
    return 'Other Income';
  }
  
  if (type === 'other expense' || detailType.includes('other expense')) {
    return 'Other Expenses';
  }
  
  if (type === 'expense' || type === 'expenses') {
    return 'Operating Expenses';
  }
  
  if (type.includes('income') || type.includes('revenue')) {
    return 'Revenue';
  } else if (type.includes('expense') || type.includes('cost')) {
    return 'Operating Expenses';
  }
  
  return null;
};

// Hardcoded properties
const HARDCODED_PROPERTIES = [
  'All Properties',
  'Cleveland',
  'Columbus IN', 
  'Detroit',
  'General',
  'Hastings MN',
  'Lisbon',
  'McHenry IL',
  'Mokena IL',
  'Pine Terrace',
  'Rockford',
  'Terra2',
  'Terra3',
  'Terraview',
  'Wesley'
];

// Fetch properties
const fetchProperties = async () => {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/financial_transactions?select=class`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      const classValues = data
        .map((item) => item.class)
        .filter((cls) => cls && cls.trim() !== '');
      
      const uniqueClasses = [...new Set(classValues)].sort();
      const allProperties = [...new Set([...HARDCODED_PROPERTIES.slice(1), ...uniqueClasses])].sort();
      return ['All Properties', ...allProperties];
    }
    
    return HARDCODED_PROPERTIES;
    
  } catch (error) {
    console.error('Property fetch error:', error);
    return HARDCODED_PROPERTIES;
  }
};

// Fetch time series data
const fetchTimeSeriesData = async (property = 'All Properties', monthYear, timePeriod, viewMode) => {
  try {
    const [month, year] = monthYear.split(' ');
    const selectedDate = new Date(`${month} 1, ${year}`);
    
    let dateRanges = [];
    
    if (timePeriod === 'Monthly') {
      const monthNum = selectedDate.getMonth() + 1;
      const startDate = `${year}-${monthNum.toString().padStart(2, '0')}-01`;
      const lastDay = new Date(parseInt(year), monthNum, 0).getDate();
      const endDate = `${year}-${monthNum.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
      dateRanges = [{ start: startDate, end: endDate, label: monthYear }];
    } else if (timePeriod === 'Trailing 12') {
      for (let i = 11; i >= 0; i--) {
        const monthDate = new Date(selectedDate);
        monthDate.setMonth(monthDate.getMonth() - i);
        
        const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
        const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
        
        const monthName = monthStart.toLocaleDateString('en-US', { month: 'short' });
        const monthYear = monthStart.getFullYear();
        
        dateRanges.push({
          start: monthStart.toISOString().split('T')[0],
          end: monthEnd.toISOString().split('T')[0],
          label: `${monthName} ${monthYear}`
        });
      }
    }
    
    const allData = {};
    let totalEntriesProcessed = 0;
    let availableProperties = [];
    
    for (const range of dateRanges) {
      let url = `${SUPABASE_URL}/rest/v1/financial_transactions?select=*&date=gte.${range.start}&date=lte.${range.end}&limit=10000`;
      
      if (viewMode !== 'by-property' && property !== 'All Properties') {
        url += `&class=eq.${encodeURIComponent(property)}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const rawData = await response.json();
        totalEntriesProcessed += rawData.length;
        
        if (viewMode === 'by-property') {
          const propertiesInData = [...new Set(rawData.map((row) => row.class).filter((cls) => cls && cls.trim() !== ''))].sort();
          if (availableProperties.length === 0) {
            availableProperties = propertiesInData;
          }
          
          const groupedByAccount = rawData.reduce((acc, row) => {
            const accountName = row.account || 'Unknown Account';
            const propertyName = row.class || 'No Property';
            
            const category = classifyAccount(row.account_type, row.account_detail_type, accountName);
            if (category === null) {
              return acc;
            }
            
            if (!acc[accountName]) {
              acc[accountName] = {
                name: accountName,
                category: category,
                type: category,
                total: 0,
                entries: [],
                account_type: row.account_type,
                account_detail_type: row.account_detail_type,
                propertyTotals: {},
                propertyEntries: {}
              };
            }
            
            propertiesInData.forEach(prop => {
              if (!acc[accountName].propertyTotals[prop]) {
                acc[accountName].propertyTotals[prop] = 0;
                acc[accountName].propertyEntries[prop] = [];
              }
            });
            
            acc[accountName].total += (row.amount || 0);
            acc[accountName].propertyTotals[propertyName] += (row.amount || 0);
            acc[accountName].entries.push(row);
            acc[accountName].propertyEntries[propertyName].push(row);
            
            return acc;
          }, {});
          
          allData[range.label] = groupedByAccount;
        } else {
          const grouped = rawData.reduce((acc, row) => {
            const accountName = row.account || 'Unknown Account';
            
            const category = classifyAccount(row.account_type, row.account_detail_type, accountName);
            if (category === null) {
              return acc;
            }
            
            if (!acc[accountName]) {
              acc[accountName] = {
                name: accountName,
                category: category,
                type: category,
                total: 0,
                entries: [],
                account_type: row.account_type,
                account_detail_type: row.account_detail_type
              };
            }
            
            acc[accountName].total += (row.amount || 0);
            acc[accountName].entries.push(row);
            
            return acc;
          }, {});
          
          allData[range.label] = grouped;
        }
      } else {
        allData[range.label] = {};
      }
    }
    
    // For Trailing 12 aggregation
    if (timePeriod === 'Trailing 12') {
      if (viewMode === 'by-property') {
        const aggregatedData = {};
        let allAvailableProperties = [];
        
        dateRanges.forEach((range) => {
          const monthData = allData[range.label] || {};
          Object.values(monthData).forEach((account) => {
            if (account.propertyTotals) {
              Object.keys(account.propertyTotals).forEach(prop => {
                if (!allAvailableProperties.includes(prop)) {
                  allAvailableProperties.push(prop);
                }
              });
            }
          });
        });
        
        dateRanges.forEach((range) => {
          const monthData = allData[range.label] || {};
          
          Object.values(monthData).forEach((account) => {
            const accountName = account.name;
            
            if (!aggregatedData[accountName]) {
              aggregatedData[accountName] = {
                name: accountName,
                category: account.category,
                type: account.category,
                total: 0,
                entries: [],
                account_type: account.account_type,
                account_detail_type: account.account_detail_type,
                propertyTotals: {},
                propertyEntries: {}
              };
              
              allAvailableProperties.forEach(prop => {
                aggregatedData[accountName].propertyTotals[prop] = 0;
                aggregatedData[accountName].propertyEntries[prop] = [];
              });
            }
            
            aggregatedData[accountName].total += account.total;
            aggregatedData[accountName].entries.push(...account.entries);
            
            if (account.propertyTotals) {
              Object.entries(account.propertyTotals).forEach(([prop, amount]) => {
                aggregatedData[accountName].propertyTotals[prop] += amount;
              });
            }
            
            if (account.propertyEntries) {
              Object.entries(account.propertyEntries).forEach(([prop, entries]) => {
                aggregatedData[accountName].propertyEntries[prop].push(...entries);
              });
            }
          });
        });
        
        return {
          success: true,
          data: { 'Trailing 12 Months': aggregatedData },
          periods: ['Trailing 12 Months'],
          availableProperties: allAvailableProperties.sort(),
          summary: {
            timePeriod,
            viewMode,
            property: property === 'All Properties' ? 'ALL PROPERTIES' : property,
            totalEntriesProcessed,
            periodsGenerated: 1,
            monthsAggregated: dateRanges.length
          }
        };
      } else {
        const aggregatedData = {};
        
        dateRanges.forEach((range) => {
          const monthData = allData[range.label] || {};
          
          Object.values(monthData).forEach((account) => {
            const accountName = account.name;
            
            if (!aggregatedData[accountName]) {
              aggregatedData[accountName] = {
                name: accountName,
                category: account.category,
                type: account.category,
                total: 0,
                entries: [],
                account_type: account.account_type,
                account_detail_type: account.account_detail_type
              };
            }
            
            aggregatedData[accountName].total += account.total;
            aggregatedData[accountName].entries.push(...account.entries);
          });
        });
        
        return {
          success: true,
          data: { 'Trailing 12 Months': aggregatedData },
          periods: ['Trailing 12 Months'],
          availableProperties: [],
          summary: {
            timePeriod,
            viewMode,
            property: property === 'All Properties' ? 'ALL PROPERTIES' : property,
            totalEntriesProcessed,
            periodsGenerated: 1,
            monthsAggregated: dateRanges.length
          }
        };
      }
    }
    
    return {
      success: true,
      data: allData,
      periods: dateRanges.map(r => r.label),
      availableProperties: viewMode === 'by-property' ? availableProperties : [],
      summary: {
        timePeriod,
        viewMode,
        property: property === 'All Properties' ? 'ALL PROPERTIES' : property,
        dateRanges: dateRanges,
        totalEntriesProcessed,
        periodsGenerated: dateRanges.length
      }
    };
    
  } catch (error) {
    console.error('Error fetching time series data:', error);
    return {
      success: false,
      error: error.message,
      data: {}
    };
  }
};

// IAM CFO Logo Component
const IAMCFOLogo = ({ className = "w-8 h-8" }) => (
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

const COLORS = [BRAND_COLORS.primary, BRAND_COLORS.success, BRAND_COLORS.warning, BRAND_COLORS.danger, BRAND_COLORS.secondary, BRAND_COLORS.tertiary];

export default function MobileFinancialDashboard() {
  const [selectedMonth, setSelectedMonth] = useState('May 2025');
  const [timePeriod, setTimePeriod] = useState('Trailing 12');
  const [viewMode, setViewMode] = useState('by-property');
  const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });
  const [selectedProperties, setSelectedProperties] = useState(new Set(['All Properties']));
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [activeKPICard, setActiveKPICard] = useState(null);
  const [selectedPropertyForPL, setSelectedPropertyForPL] = useState(null);
  const [showPropertyPL, setShowPropertyPL] = useState(false);
  const [showTransactionDetail, setShowTransactionDetail] = useState(false);
  const [showCompanyPL, setShowCompanyPL] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Data states
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [dataError, setDataError] = useState(null);
  const [availableProperties, setAvailableProperties] = useState(HARDCODED_PROPERTIES);
  const [selectedAccountDetails, setSelectedAccountDetails] = useState(null);
  const [timeSeriesData, setTimeSeriesData] = useState(null);

  // Generate months list
  const generateMonthsList = () => {
    const months = [];
    const currentYear = new Date().getFullYear();
    
    for (let year = 2020; year <= currentYear + 2; year++) {
      for (let month = 1; month <= 12; month++) {
        const monthNames = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        months.push(`${monthNames[month - 1]} ${year}`);
      }
    }
    return months;
  };

  const monthsList = generateMonthsList();

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Load data when filters change
  useEffect(() => {
    loadRealFinancialData();
  }, [selectedProperties, selectedMonth, timePeriod, viewMode]);

  const loadInitialData = async () => {
    try {
      setIsLoadingData(true);
      const properties = await fetchProperties();
      setAvailableProperties(properties);
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
      
      let propertyFilter = 'All Properties';
      if (viewMode !== 'by-property' && selectedProperties.size > 0 && !selectedProperties.has('All Properties')) {
        propertyFilter = Array.from(selectedProperties)[0];
      }
      
      const timeSeriesResult = await fetchTimeSeriesData(propertyFilter, selectedMonth, timePeriod, viewMode);
      
      if (timeSeriesResult.success) {
        setTimeSeriesData(timeSeriesResult);
        setDataError(null);
      } else {
        setDataError(timeSeriesResult.error || 'Failed to load time series data');
      }
      
      showNotification(`Loaded data for ${timePeriod} ${viewMode} view`, 'success');
      
    } catch (error) {
      console.error('Failed to load financial data:', error);
      setDataError('Failed to load financial data');
      showNotification('Failed to load financial data', 'error');
    } finally {
      setIsLoadingData(false);
    }
  };

  // Helper functions
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatCompactCurrency = (value) => {
    if (Math.abs(value) >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (Math.abs(value) >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return formatCurrency(value);
  };

  const showNotification = (message, type = 'info') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'info' });
    }, 3000);
  };

  // Get current financial data
  const getCurrentFinancialData = () => {
    if (timeSeriesData) {
      if (viewMode === 'by-property') {
        const firstPeriodKey = timeSeriesData.periods[0];
        const firstPeriodData = timeSeriesData.data[firstPeriodKey] || {};
        return Object.values(firstPeriodData);
      } else {
        if (timePeriod === 'Trailing 12') {
          const trailingData = timeSeriesData.data['Trailing 12 Months'] || {};
          return Object.values(trailingData);
        } else {
          const firstPeriodKey = timeSeriesData.periods[0];
          const firstPeriodData = timeSeriesData.data[firstPeriodKey] || {};
          return Object.values(firstPeriodData);
        }
      }
    }
    return [];
  };

  const currentData = getCurrentFinancialData();

  // Calculate KPIs
  const calculateKPIs = () => {
    if (!currentData || currentData.length === 0) {
      return {
        revenue: 0,
        cogs: 0,
        grossProfit: 0,
        operatingExpenses: 0,
        netOperatingIncome: 0,
        otherIncome: 0,
        otherExpenses: 0,
        netIncome: 0,
        grossMargin: 0,
        operatingMargin: 0,
        netMargin: 0
      };
    }

    const revenue = currentData
      .filter((item) => item.category === 'Revenue')
      .reduce((sum, item) => sum + item.total, 0);

    const cogs = currentData
      .filter((item) => item.category === 'COGS')
      .reduce((sum, item) => sum + Math.abs(item.total), 0);

    const operatingExpenses = currentData
      .filter((item) => item.category === 'Operating Expenses')
      .reduce((sum, item) => sum + Math.abs(item.total), 0);

    const otherIncome = currentData
      .filter((item) => item.category === 'Other Income')
      .reduce((sum, item) => sum + item.total, 0);

    const otherExpenses = currentData
      .filter((item) => item.category === 'Other Expenses')
      .reduce((sum, item) => sum + Math.abs(item.total), 0);

    const grossProfit = revenue - cogs;
    const netOperatingIncome = grossProfit - operatingExpenses;
    const netIncome = netOperatingIncome + otherIncome - otherExpenses;

    return {
      revenue,
      cogs,
      grossProfit,
      operatingExpenses,
      netOperatingIncome,
      otherIncome,
      otherExpenses,
      netIncome,
      grossMargin: revenue ? (grossProfit / revenue) * 100 : 0,
      operatingMargin: revenue ? (netOperatingIncome / revenue) * 100 : 0,
      netMargin: revenue ? (netIncome / revenue) * 100 : 0
    };
  };

  const kpis = calculateKPIs();

  // Mobile KPI Cards
  const renderMobileKPICards = () => {
    const kpiData = [
      { key: 'revenue', label: 'Revenue', value: kpis.revenue, icon: DollarSign, color: BRAND_COLORS.primary },
      { key: 'grossProfit', label: 'Gross Profit', value: kpis.grossProfit, icon: BarChart3, color: BRAND_COLORS.warning, margin: kpis.grossMargin },
      { key: 'netOperatingIncome', label: 'Operating Income', value: kpis.netOperatingIncome, icon: TrendingUp, color: BRAND_COLORS.success, margin: kpis.operatingMargin },
      { key: 'netIncome', label: 'Net Income', value: kpis.netIncome, icon: PieChart, color: BRAND_COLORS.secondary, margin: kpis.netMargin }
    ];

    return (
      <div className="grid grid-cols-2 gap-3">
        {kpiData.map((kpi) => (
          <div 
            key={kpi.key}
            className={`bg-white p-4 rounded-lg shadow-sm border-l-4 transition-all ${
              activeKPICard === kpi.key ? 'shadow-md scale-105' : ''
            }`}
            style={{ borderLeftColor: kpi.color }}
            onClick={() => setActiveKPICard(activeKPICard === kpi.key ? null : kpi.key)}
          >
            <div className="flex items-center justify-between mb-2">
              <kpi.icon className="w-5 h-5" style={{ color: kpi.color }} />
              {activeKPICard === kpi.key && (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </div>
            <div className="text-xs text-gray-600 mb-1">{kpi.label}</div>
            <div className="text-lg font-bold text-gray-900">{formatCompactCurrency(kpi.value)}</div>
            {kpi.margin && activeKPICard === kpi.key && (
              <div className="text-xs text-green-600 mt-1">
                {kpi.margin.toFixed(1)}% Margin
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // Company Scorecard
  const renderCompanyScorecard = () => {
    return (
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-all"
           onClick={() => setShowCompanyPL(true)}>
        <div className="p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold">🏢 Company Total</h3>
              <div className="text-sm opacity-90">
                {timePeriod} Portfolio Performance
              </div>
            </div>
            <div className="text-xs bg-white bg-opacity-20 px-3 py-1 rounded-full">
              Tap for full P&L
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs opacity-75 mb-1">Total Revenue</div>
              <div className="text-2xl font-bold">{formatCompactCurrency(kpis.revenue)}</div>
            </div>

            <div>
              <div className="text-xs opacity-75 mb-1">Net Income</div>
              <div className={`text-2xl font-bold ${kpis.netIncome >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                {formatCompactCurrency(kpis.netIncome)}
              </div>
            </div>

            <div>
              <div className="text-xs opacity-75 mb-1">Gross Profit</div>
              <div className="text-xl font-semibold">{formatCompactCurrency(kpis.grossProfit)}</div>
              <div className="text-xs opacity-75">{kpis.grossMargin.toFixed(1)}% margin</div>
            </div>

            <div>
              <div className="text-xs opacity-75 mb-1">Operating Income</div>
              <div className={`text-xl font-semibold ${kpis.netOperatingIncome >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                {formatCompactCurrency(kpis.netOperatingIncome)}
              </div>
              <div className="text-xs opacity-75">{kpis.operatingMargin.toFixed(1)}% margin</div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-white border-opacity-20">
            <div className="flex justify-between items-center text-sm">
              <span className="opacity-75">Properties:</span>
              <span className="font-semibold">{timeSeriesData?.availableProperties?.length || 0}</span>
            </div>
            <div className="flex justify-between items-center text-sm mt-1">
              <span className="opacity-75">Net Margin:</span>
              <span className={`font-semibold ${kpis.netMargin >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                {kpis.netMargin.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Property Cards
  const renderPropertyCards = () => {
    if (!timeSeriesData?.availableProperties || timeSeriesData.availableProperties.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          <PieChart className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p className="text-lg font-medium text-gray-600">No property data available</p>
          <p className="text-sm mt-2 text-gray-500">Switch to "By Property" view to see property breakdown</p>
        </div>
      );
    }

    const propertyData = timeSeriesData.availableProperties.map((property) => {
      const revenue = currentData
        .filter((item) => item.category === 'Revenue')
        .reduce((sum, item) => sum + (item.propertyTotals?.[property] || 0), 0);
      
      const cogs = currentData
        .filter((item) => item.category === 'COGS')
        .reduce((sum, item) => sum + Math.abs(item.propertyTotals?.[property] || 0), 0);
      
      const operatingExpenses = currentData
        .filter((item) => item.category === 'Operating Expenses')
        .reduce((sum, item) => sum + Math.abs(item.propertyTotals?.[property] || 0), 0);
      
      const otherIncome = currentData
        .filter((item) => item.category === 'Other Income')
        .reduce((sum, item) => sum + (item.propertyTotals?.[property] || 0), 0);
      
      const otherExpenses = currentData
        .filter((item) => item.category === 'Other Expenses')
        .reduce((sum, item) => sum + Math.abs(item.propertyTotals?.[property] || 0), 0);

      const totalExpenses = cogs + operatingExpenses + otherExpenses;
      const profit = revenue - totalExpenses + otherIncome;

      return {
        name: property,
        revenue,
        expenses: totalExpenses,
        profit,
        data: { revenue, cogs, operatingExpenses, otherIncome, otherExpenses }
      };
    }).sort((a, b) => b.profit - a.profit);

    return (
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Property Performance</h3>
              <div className="text-sm text-gray-600 mt-1">
                {timePeriod} period • {propertyData.length} properties • Sorted by profit
              </div>
            </div>
            <div className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full">
              🏢 Tap to view P&L
            </div>
          </div>
        </div>

        <div className="p-4">
          <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {propertyData.map((property, index) => (
              <div
                key={property.name}
                className="flex-shrink-0 w-36 bg-gradient-to-br from-white to-gray-50 rounded-lg border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all cursor-pointer"
                onClick={() => {
                  setSelectedPropertyForPL(property);
                  setShowPropertyPL(true);
                }}
                style={{
                  minWidth: '144px',
                  boxShadow: index === 0 ? `0 4px 6px -1px ${BRAND_COLORS.primary}33` : undefined
                }}
              >
                <div className="text-sm font-semibold text-gray-900 mb-3 truncate" title={property.name}>
                  {property.name}
                  {index === 0 && <span className="ml-1 text-xs">🏆</span>}
                </div>

                <div className="mb-3">
                  <div className="text-xs text-gray-500 mb-1">Revenue</div>
                  <div className="text-lg font-bold text-green-600">
                    {formatCurrency(property.revenue)}
                  </div>
                </div>

                <div className="mb-3">
                  <div className="text-xs text-gray-500 mb-1">Expenses</div>
                  <div className="text-lg font-bold text-red-600">
                    {formatCurrency(property.expenses)}
                  </div>
                </div>

                <div className="mb-2">
                  <div className="text-xs text-gray-500 mb-1">Profit</div>
                  <div className={`text-lg font-bold ${property.profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {formatCurrency(property.profit)}
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-gray-200">
                  <div className="text-xs text-gray-500">
                    {property.revenue > 0 ? 
                      `${((property.profit / property.revenue) * 100).toFixed(1)}% margin` :
                      'No revenue'
                    }
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-4 pb-4">
          <div className="text-xs text-gray-500 text-center">
            👈 Scroll horizontally to see all properties
          </div>
        </div>
      </div>
    );
  };

  // Mobile filter controls
  const renderMobileFilters = () => (
    <div className={`${mobileFilterOpen ? 'block' : 'hidden'} absolute top-full right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4 space-y-4`} style={{ minWidth: '280px' }}>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
        <select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
        >
          {monthsList.map((month) => (
            <option key={month} value={month}>
              {month}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Time Period</label>
        <select
          value={timePeriod}
          onChange={(e) => setTimePeriod(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm"
        >
          {['Monthly', 'Trailing 12'].map((period) => (
            <option key={period} value={period}>
              {period}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <IAMCFOLogo className="w-6 h-6 mr-3" />
              <div>
                <h1 className="text-lg font-bold text-gray-900">IAM CFO</h1>
                <p className="text-xs text-gray-600">Mobile Financial Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 relative">
              <button
                onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
                className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
              
              <button
                onClick={loadRealFinancialData}
                disabled={isLoadingData}
                className="flex items-center gap-1 px-3 py-2 bg-gray-600 text-white rounded-lg text-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingData ? 'animate-spin' : ''}`} />
              </button>
              
              {renderMobileFilters()}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-4 py-6 space-y-6">
        {/* Loading State */}
        {isLoadingData && (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin mr-2" />
            <span>Loading financial data...</span>
          </div>
        )}

        {/* Error State */}
        {dataError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{dataError}</p>
          </div>
        )}

        {/* KPI Cards */}
        {renderMobileKPICards()}

        {/* Main Content */}
        <div className="space-y-6">
          {renderCompanyScorecard()}
          {renderPropertyCards()}
        </div>
      </main>

      {/* Notification */}
      {notification.show && (
        <div className={`fixed top-5 right-5 z-50 px-4 py-3 rounded-lg text-white font-medium shadow-lg transition-transform ${
          notification.type === 'success' ? 'bg-green-500' :
          notification.type === 'error' ? 'bg-red-500' :
          'bg-blue-500'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Click outside to close filters */}
      {mobileFilterOpen && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setMobileFilterOpen(false)}
        />
      )}
    </div>
  );
}
