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

// Mock Supabase Configuration (replace with your actual config)
const SUPABASE_URL = 'https://ijeuusvwqcnljctkvjdi.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZXV1c3Z3cWNubGpjdGt2amRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxMjE4MDUsImV4cCI6MjA2NzY5NzgwNX0.O9Mb_X47wbXEMXbPQ8Cr3dzDn_E5DYG9b222FPy4LEU';

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
  type?: string;
  original_type?: string;
  detail_type?: string;
  entries?: any[];
  mapping_method?: string;
}

interface FinancialEntry {
  id: number;
  je_number: string;
  transaction_date: string;
  account_name: string;
  account_type: string;
  detail_type: string;
  property_class: string;
  debit_amount: number;
  credit_amount: number;
  line_amount: number;
  posting_type: string;
  description: string;
  balance: number;
  created_by: string;
  last_modified: string;
  created_at: string;
  updated_at: string;
  classification?: string;
  mapping_method?: string;
}

interface NotificationState {
  show: boolean;
  message: string;
  type: 'info' | 'success' | 'error';
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

// Improved Supabase client with better error handling
const createSupabaseClient = () => {
  const makeRequest = async (url: string) => {
    try {
      const response = await fetch(url, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return { data, error: null };
    } catch (error) {
      console.error('Supabase request failed:', error);
      return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  };

  return {
    from: (table: string) => ({
      select: (columns: string = '*') => ({
        eq: (column: string, value: string) => ({
          order: (orderBy: string) => makeRequest(
            `${SUPABASE_URL}/rest/v1/${table}?select=${columns}&${column}=eq.${encodeURIComponent(value)}&order=${orderBy}`
          )
        }),
        gte: (column: string, value: string) => ({
          lte: (column2: string, value2: string) => ({
            order: (orderBy: string) => makeRequest(
              `${SUPABASE_URL}/rest/v1/${table}?select=${columns}&${column}=gte.${encodeURIComponent(value)}&${column2}=lte.${encodeURIComponent(value2)}&order=${orderBy}`
            )
          })
        }),
        order: (orderBy: string) => makeRequest(
          `${SUPABASE_URL}/rest/v1/${table}?select=${columns}&order=${orderBy}`
        )
      })
    })
  };
};

const supabase = createSupabaseClient();

// Improved property fetching with better error handling
const fetchProperties = async (): Promise<string[]> => {
  try {
    console.log('🏠 Fetching properties from Supabase...');
    
    const { data, error } = await supabase
      .from('journal_entries')
      .select('property_class')
      .order('property_class');

    if (error) {
      console.error('❌ Error fetching properties:', error);
      return getDefaultProperties();
    }

    if (!data || data.length === 0) {
      console.warn('⚠️ No property data found');
      return getDefaultProperties();
    }

    // Extract unique property classes
    const uniqueProperties = [...new Set(
      data
        .map((item: any) => item.property_class)
        .filter((pc: any) => pc && pc.trim() !== '')
    )];

    const result = ['All Properties', ...uniqueProperties.sort()];
    console.log('✅ Properties loaded:', result);
    return result;

  } catch (error) {
    console.error('❌ Property fetch error:', error);
    return getDefaultProperties();
  }
};

const getDefaultProperties = (): string[] => [
  'All Properties',
  'Cleveland',
  'Columbus, IN',
  'Detroit',
  'General', 
  'Hastings MN',
  'Lisbon',
  'McHenry IL',    
  'Mokena IL',
  'Pine Terrace',
  'Rockford',
  'Terraview',
  'Wesley'
];

// Improved financial data fetching with better filtering
const fetchFinancialData = async (
  property: string = 'All Properties',
  monthYear: string
) => {
  try {
    console.log('🔍 FETCHING FINANCIAL DATA:', { property, monthYear });
    
    // Parse month and year
    const [month, year] = monthYear.split(' ');
    const monthNum = new Date(`${month} 1, ${year}`).getMonth() + 1;
    
    // Create date range
    const startDate = `${year}-${monthNum.toString().padStart(2, '0')}-01`;
    const lastDay = new Date(parseInt(year), monthNum, 0).getDate();
    const endDate = `${year}-${monthNum.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
    
    console.log(`📅 Date range: ${startDate} to ${endDate}`);

    // Build query based on property selection
    let query = supabase
      .from('journal_entries')
      .select('*')
      .gte('transaction_date', startDate)
      .lte('transaction_date', endDate);

    // Add property filter if not "All Properties"
    if (property !== 'All Properties') {
      query = query.eq('property_class', property);
      console.log('🏠 Filtering by property:', property);
    }

    const { data: journalData, error: journalError } = await query.order('transaction_date,account_name');

    if (journalError) {
      throw new Error(`Journal entries fetch failed: ${journalError}`);
    }

    // Also fetch accounts for mapping
    const { data: accountsData, error: accountsError } = await supabase
      .from('accounts')
      .select('*')
      .order('account_name');

    if (accountsError) {
      console.warn('⚠️ Accounts fetch failed:', accountsError);
    }

    console.log('📊 Journal entries loaded:', journalData?.length || 0);
    
    // Additional client-side date validation
    const filteredData = (journalData || []).filter((entry: any) => {
      const entryDate = new Date(entry.transaction_date);
      const entryYear = entryDate.getFullYear();
      const entryMonth = entryDate.getMonth() + 1;
      
      const isCorrectPeriod = entryYear === parseInt(year) && entryMonth === monthNum;
      
      if (!isCorrectPeriod) {
        console.warn(`⚠️ Filtered out entry ${entry.je_number} dated ${entry.transaction_date}`);
      }
      
      return isCorrectPeriod;
    });

    console.log(`✅ Final filtered entries: ${filteredData.length}`);

    return {
      success: true,
      data: filteredData,
      accountsData: accountsData || [],
      summary: {
        filteredEntries: filteredData.length,
        originalEntries: journalData?.length || 0,
        dateRange: `${startDate} to ${endDate}`,
        filters: { property, monthYear },
        dataSource: 'Supabase with improved filtering'
      }
    };

  } catch (error) {
    console.error('❌ Error fetching financial data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      data: []
    };
  }
};

// Enhanced data transformation
const transformFinancialData = (entries: FinancialEntry[], monthYear: string) => {
  console.log('🔄 Transforming financial data:', entries.length, 'entries');

  const groupedData = entries.reduce((acc, entry) => {
    // Clean account name
    let accountName = entry.account_name?.trim() || '';
    accountName = accountName.replace(/^[^:]*:/, '').trim();
    
    if (!accountName || accountName === 'Journal Entry' || accountName === 'RJE') {
      accountName = entry.description?.trim() || `${entry.account_type || 'Other'} Account`;
    }

    const key = accountName;
    
    if (!acc[key]) {
      // Classify account type
      let classification = 'Other';
      const name = accountName.toLowerCase();
      const accountType = entry.account_type?.toLowerCase() || '';
      
      if (accountType.includes('income') || name.includes('revenue') || name.includes('rental')) {
        classification = 'Revenue';
      } else if (accountType.includes('expense') || name.includes('expense')) {
        classification = 'Expenses';
      } else if (accountType.includes('asset') || name.includes('asset')) {
        classification = 'Assets';
      } else if (accountType.includes('liability') || name.includes('liability')) {
        classification = 'Liabilities';
      }

      acc[key] = {
        name: accountName,
        type: classification,
        original_type: entry.account_type,
        detail_type: entry.detail_type || entry.account_type,
        total: 0,
        months: {},
        entries: [],
        mapping_method: 'Auto-classified'
      };
    }
    
    // Calculate amount based on account type with proper normal balances
    let amount = 0;
    switch (acc[key].type) {
      case 'Revenue':
        // Revenue: Normal Credit Balance (Credits - Debits)
        // Positive = normal credit balance, Negative = abnormal debit balance
        amount = entry.line_amount || (entry.credit_amount - entry.debit_amount);
        break;
      case 'Expenses':
        // Expenses: Normal Debit Balance (Debits - Credits)  
        // Positive = normal debit balance, Negative = abnormal credit balance
        amount = entry.line_amount || (entry.debit_amount - entry.credit_amount);
        break;
      case 'Assets':
        // Assets: Normal Debit Balance
        amount = entry.line_amount || (entry.debit_amount - entry.credit_amount);
        break;
      case 'Liabilities':
        // Liabilities: Normal Credit Balance
        amount = entry.line_amount || (entry.credit_amount - entry.debit_amount);
        break;
      default:
        amount = entry.line_amount || (entry.debit_amount - entry.credit_amount);
    }
    
    acc[key].total += amount;
    acc[key].months[monthYear as MonthString] = (acc[key].months[monthYear as MonthString] || 0) + amount;
    acc[key].entries.push({
      je_number: entry.je_number,
      transaction_date: entry.transaction_date,
      amount_used: amount,
      property: entry.property_class,
      original_description: entry.description
    });
    
    return acc;
  }, {} as Record<string, any>);

  // Sort and filter data
  const sortedData = Object.values(groupedData)
    .filter((item: any) => Math.abs(item.total) > 0.01)
    .sort((a: any, b: any) => {
      const typeOrder: Record<string, number> = {
        'Revenue': 1, 'Expenses': 2, 'Assets': 3, 'Liabilities': 4, 'Other': 99
      };
      
      const aOrder = typeOrder[a.type] || 99;
      const bOrder = typeOrder[b.type] || 99;
      
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.name.localeCompare(b.name);
    });

  console.log('✅ Data transformation complete:', sortedData.length, 'accounts');

  return {
    propertyFinancialData: {
      'All Properties': {
        Monthly: {
          [monthYear]: sortedData
        }
      }
    }
  };
};

export default function ImprovedFinancialDashboard() {
  const [activeTab, setActiveTab] = useState<FinancialTab>('p&l');
  const [selectedMonth, setSelectedMonth] = useState<MonthString>('May 2025');
  const [notification, setNotification] = useState<NotificationState>({ show: false, message: '', type: 'info' });
  const [propertyDropdownOpen, setPropertyDropdownOpen] = useState(false);
  const [selectedProperties, setSelectedProperties] = useState<Set<string>>(new Set(['All Properties']));

  // Data state
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [realData, setRealData] = useState<any>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [availableProperties, setAvailableProperties] = useState<string[]>(['All Properties']);

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
        months.push(`${monthNames[month - 1]} ${year}` as MonthString);
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
    if (availableProperties.length > 1) { // Don't load until properties are fetched
      loadRealFinancialData();
    }
  }, [selectedProperties, selectedMonth, availableProperties]);

  const loadInitialData = async () => {
    try {
      setIsLoadingData(true);
      
      console.log('🚀 Loading initial data...');
      const properties = await fetchProperties();
      setAvailableProperties(properties);
      
      console.log('✅ Initial data loaded');
      
    } catch (error) {
      console.error('❌ Failed to load initial data:', error);
      setDataError('Failed to load initial data');
      showNotification('Failed to load initial data', 'error');
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadRealFinancialData = async () => {
    try {
      setIsLoadingData(true);
      setDataError(null);
      
      // Determine property filter
      let propertyFilter = 'All Properties';
      if (selectedProperties.size > 0 && !selectedProperties.has('All Properties')) {
        propertyFilter = Array.from(selectedProperties)[0]; // Use first selected property
      }
      
      console.log('🔍 Loading data with filters:', {
        selectedProperties: Array.from(selectedProperties),
        propertyFilter,
        month: selectedMonth
      });
      
      const rawData = await fetchFinancialData(propertyFilter, selectedMonth);
      
      if (rawData.success) {
        const entries = rawData.data as FinancialEntry[];
        const transformedData = transformFinancialData(entries, selectedMonth);

        const combinedData = {
          success: true,
          ...transformedData,
          summary: {
            ...rawData.summary,
            selectedFilters: {
              properties: Array.from(selectedProperties),
              month: selectedMonth
            }
          }
        };

        setRealData(combinedData);
        setDataError(null);
        
        const propertyText = selectedProperties.has('All Properties') 
          ? 'all properties' 
          : `${Array.from(selectedProperties).join(', ')}`;
          
        showNotification(`Loaded ${entries.length} entries for ${propertyText} in ${selectedMonth}`, 'success');
        
      } else {
        setDataError(rawData.error || 'Failed to load financial data');
        showNotification('Failed to load financial data', 'error');
      }
      
    } catch (error) {
      console.error('❌ Failed to load financial data:', error);
      setDataError('Failed to load financial data');
      showNotification('Failed to load financial data', 'error');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handlePropertyToggle = (property: string) => {
    const newSelected = new Set(selectedProperties);
    
    if (property === 'All Properties') {
      newSelected.clear();
      newSelected.add('All Properties');
    } else {
      newSelected.delete('All Properties');
      
      if (newSelected.has(property)) {
        newSelected.delete(property);
      } else {
        newSelected.add(property);
      }
      
      if (newSelected.size === 0) {
        newSelected.add('All Properties');
      }
    }
    
    setSelectedProperties(newSelected);
    console.log('🏠 Property selection changed:', Array.from(newSelected));
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

  const showNotification = (message: string, type: 'info' | 'success' | 'error' = 'info'): void => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'info' });
    }, 3000);
  };

  // Get current financial data
  const getCurrentFinancialData = () => {
    if (realData && realData.propertyFinancialData) {
      const propertyKey = Object.keys(realData.propertyFinancialData)[0] || 'All Properties';
      const monthlyData = realData.propertyFinancialData[propertyKey]?.Monthly;
      return monthlyData?.[selectedMonth] || [];
    }
    return [];
  };

  const currentData = getCurrentFinancialData();

  // Calculate KPIs
  const calculateKPIs = () => {
    if (!currentData || currentData.length === 0) {
      return {
        revenue: 0,
        expenses: 0,
        netIncome: 0,
        netMargin: 0
      };
    }

    const revenue = currentData
      .filter(item => item.type === 'Revenue')
      .reduce((sum, item) => sum + item.total, 0); // Keep natural sign - positive for credit balance, negative for debit balance

    const expenses = currentData
      .filter(item => item.type === 'Expenses')
      .reduce((sum, item) => sum + item.total, 0); // Keep natural sign - positive for debit balance, negative for credit balance

    const netIncome = revenue - expenses;

    return {
      revenue,
      expenses,
      netIncome,
      netMargin: revenue ? (netIncome / revenue) * 100 : 0
    };
  };

  const kpis = calculateKPIs();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
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
                    Connected
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Real-time P&L by Property Class • Improved Filtering
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
            <h2 className="text-3xl font-bold" style={{ color: BRAND_COLORS.primary }}>
              Financial Dashboard
            </h2>
            
            <div className="flex flex-wrap gap-4 items-center">
              {/* Month Selector */}
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value as MonthString)}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm hover:border-blue-500 focus:outline-none focus:ring-2 transition-all"
                disabled={isLoadingData}
              >
                {monthsList.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>

              {/* Property Selector */}
              <div className="relative">
                <button
                  onClick={() => setPropertyDropdownOpen(!propertyDropdownOpen)}
                  className="flex items-center justify-between w-56 px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm hover:border-blue-500 focus:outline-none focus:ring-2 transition-all disabled:opacity-50"
                  disabled={isLoadingData}
                >
                  <span className="truncate">
                    {getSelectedPropertiesText()}
                  </span>
                  <ChevronDown className={`w-4 h-4 ml-2 transition-transform ${propertyDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {propertyDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
                    {/* All Properties Option */}
                    <div
                      className="flex items-center px-4 py-3 hover:bg-blue-50 cursor-pointer text-sm border-b border-gray-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePropertyToggle('All Properties');
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedProperties.has('All Properties')}
                        onChange={() => {}}
                        className="mr-3 h-4 w-4 border-gray-300 rounded"
                        style={{ accentColor: BRAND_COLORS.primary }}
                      />
                      <span className="font-medium text-blue-900">
                        All Properties
                      </span>
                    </div>
                    
                    {/* Individual Properties */}
                    <div className="max-h-60 overflow-y-auto">
                      {availableProperties.length > 1 ? (
                        availableProperties
                          .filter(property => property !== 'All Properties')
                          .map((property) => (
                            <div
                              key={property}
                              className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePropertyToggle(property);
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={selectedProperties.has(property)}
                                onChange={() => {}}
                                className="mr-3 h-4 w-4 border-gray-300 rounded"
                                style={{ accentColor: BRAND_COLORS.primary }}
                              />
                              <span className="text-gray-700">
                                {property}
                              </span>
                            </div>
                          ))
                      ) : (
                        <div className="px-4 py-3 text-sm text-gray-500 italic">
                          Loading properties...
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Refresh Button */}
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
          {realData && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-green-800 text-sm">
                <strong>Data Status:</strong> Loaded {realData.summary.filteredEntries} entries from Supabase
                <div className="mt-1 text-xs">
                  <strong>Current Filters:</strong> {getSelectedPropertiesText()} • {selectedMonth}
                </div>
                <div className="mt-1 text-xs">
                  <strong>Date Range:</strong> {realData.summary.dateRange}
                </div>
              </div>
            </div>
          )}

          {/* Error State */}
          {dataError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="text-red-800 text-sm">
                <strong>Error:</strong> {dataError}
              </div>
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border-l-4" style={{ borderLeftColor: BRAND_COLORS.primary }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-600 text-sm font-medium mb-2">Revenue</div>
                  <div className="text-2xl font-bold text-gray-900">{formatCurrency(kpis.revenue)}</div>
                </div>
                <DollarSign className="w-8 h-8" style={{ color: BRAND_COLORS.primary }} />
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border-l-4" style={{ borderLeftColor: BRAND_COLORS.danger }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-600 text-sm font-medium mb-2">Expenses</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {kpis.expenses >= 0 ? formatCurrency(kpis.expenses) : `(${formatCurrency(Math.abs(kpis.expenses))})`}
                  </div>
                </div>
                <BarChart3 className="w-8 h-8" style={{ color: BRAND_COLORS.danger }} />
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border-l-4" style={{ borderLeftColor: BRAND_COLORS.success }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-600 text-sm font-medium mb-2">Net Income</div>
                  <div className="text-2xl font-bold text-gray-900">{formatCurrency(kpis.netIncome)}</div>
                </div>
                <TrendingUp className="w-8 h-8" style={{ color: BRAND_COLORS.success }} />
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border-l-4" style={{ borderLeftColor: BRAND_COLORS.warning }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-600 text-sm font-medium mb-2">Net Margin</div>
                  <div className="text-2xl font-bold text-gray-900">{kpis.netMargin.toFixed(1)}%</div>
                </div>
                <PieChart className="w-8 h-8" style={{ color: BRAND_COLORS.warning }} />
              </div>
            </div>
          </div>

          {/* Financial Table */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900">
                Profit & Loss Statement
              </h3>
            </div>

            <div className="overflow-x-auto">
              {isLoadingData ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                  <span>Loading financial data...</span>
                </div>
              ) : currentData.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No financial data available for the selected filters
                  <div className="text-sm mt-2">
                    Try selecting a different month or property, or check your Supabase connection
                  </div>
                </div>
              ) : (
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Account
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {selectedMonth}
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Type
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {/* Revenue Section */}
                    <tr className="bg-green-50">
                      <td className="px-6 py-4 text-left text-lg font-bold text-green-900">
                        💰 REVENUE
                      </td>
                      <td className="px-4 py-4 text-right text-lg font-bold text-green-900">
                        {formatCurrency(kpis.revenue)}
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-green-700">
                        Income
                      </td>
                    </tr>
                    
                    {currentData
                      .filter(item => item.type === 'Revenue')
                      .map((item) => (
                        <tr key={`revenue-${item.name}`} className="hover:bg-gray-50">
                          <td className="px-6 py-2 text-left text-sm text-gray-700 pl-12">
                            {item.name}
                            {item.entries && item.entries.length > 0 && (
                              <span className="ml-2 text-xs text-gray-500">
                                ({item.entries.length} entries)
                              </span>
                            )}
                          </td>
                          <td className={`px-4 py-2 text-right text-sm ${
                            item.total >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {item.total >= 0 ? formatCurrency(item.total) : `(${formatCurrency(Math.abs(item.total))})`}
                            {item.total < 0 && (
                              <span className="ml-1 text-xs text-red-500" title="Abnormal debit balance in revenue account">⚠️</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right text-sm text-gray-500">
                            {item.original_type}
                          </td>
                        </tr>
                      ))}

                    {/* Expenses Section */}
                    <tr className="bg-red-50 border-t-4 border-red-200">
                      <td className="px-6 py-4 text-left text-lg font-bold text-red-900">
                        💸 EXPENSES
                      </td>
                      <td className="px-4 py-4 text-right text-lg font-bold text-red-600">
                        {kpis.expenses >= 0 ? `(${formatCurrency(kpis.expenses)})` : formatCurrency(Math.abs(kpis.expenses))}
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-red-700">
                        Costs
                      </td>
                    </tr>
                    
                    {currentData
                      .filter(item => item.type === 'Expenses')
                      .map((item) => (
                        <tr key={`expense-${item.name}`} className="hover:bg-gray-50">
                          <td className="px-6 py-2 text-left text-sm text-gray-700 pl-12">
                            {item.name}
                            {item.entries && item.entries.length > 0 && (
                              <span className="ml-2 text-xs text-gray-500">
                                ({item.entries.length} entries)
                              </span>
                            )}
                          </td>
                          <td className={`px-4 py-2 text-right text-sm ${
                            item.total >= 0 ? 'text-red-600' : 'text-green-600'
                          }`}>
                            {item.total >= 0 ? `(${formatCurrency(item.total)})` : formatCurrency(Math.abs(item.total))}
                            {item.total < 0 && (
                              <span className="ml-1 text-xs text-green-500" title="Abnormal credit balance in expense account">⚠️</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-right text-sm text-gray-500">
                            {item.original_type}
                          </td>
                        </tr>
                      ))}

                    {/* Net Income */}
                    <tr className="border-t-4" style={{ 
                      backgroundColor: BRAND_COLORS.primary + '20', 
                      borderTopColor: BRAND_COLORS.primary 
                    }}>
                      <td className="px-6 py-5 text-left text-xl font-bold" style={{ color: BRAND_COLORS.primary }}>
                        🏆 NET INCOME
                      </td>
                      <td className={`px-4 py-5 text-right text-xl font-bold ${
                        kpis.netIncome >= 0 ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {formatCurrency(kpis.netIncome)}
                      </td>
                      <td className="px-4 py-5 text-right text-lg font-bold" style={{ color: BRAND_COLORS.primary }}>
                        {kpis.netMargin.toFixed(1)}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
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

          {/* Click outside to close dropdown */}
          {propertyDropdownOpen && (
            <div
              className="fixed inset-0 z-10"
              onClick={() => setPropertyDropdownOpen(false)}
            />
          )}
        </div>
      </main>
    </div>
  );
}
