"use client";

import React, { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, Minus, Download, RefreshCw, TrendingUp, DollarSign, PieChart, BarChart3, ChevronDown, ChevronRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Cell, Pie } from 'recharts';
import { supabaseQueries, testSupabaseConnection, type FinancialEntry } from '@/lib/supabase';

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

interface TooltipState {
  show: boolean;
  content: string;
  x: number;
  y: number;
}

const FinancialsPage = () => {
  // State variables
  const [activeTab, setActiveTab] = useState<FinancialTab>('p&l');
  const [timeView, setTimeView] = useState<TimeView>('Monthly');
  const [viewMode, setViewMode] = useState<ViewMode>('total');
  const [selectedMonth, setSelectedMonth] = useState<string>('May 2025');
  const [selectedProperties, setSelectedProperties] = useState<Set<string>>(new Set(['All Properties']));
  const [availableProperties, setAvailableProperties] = useState<string[]>(['All Properties']);
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [financialData, setFinancialData] = useState<FinancialDataItem[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<NotificationState>({ show: false, message: '', type: 'info' });
  const [tooltip, setTooltip] = useState<TooltipState>({ show: false, content: '', x: 0, y: 0 });

  // Debug logging function
  const debugLog = (...args: any[]) => {
    console.log('🔍 FINANCIALS DEBUG:', ...args);
  };

  // Initialize and load data
  useEffect(() => {
    debugLog('🚀 Component initialized, loading initial data...');
    loadFinancialData();
  }, []);

  // Load data when filters change
  useEffect(() => {
    debugLog('📊 Filters changed, reloading data...', {
      selectedMonth,
      selectedProperties: Array.from(selectedProperties),
      activeTab
    });
    loadFinancialData();
  }, [selectedMonth, selectedProperties, activeTab]);

  // Load available properties
  useEffect(() => {
    loadAvailableProperties();
  }, []);

  const loadAvailableProperties = async () => {
    try {
      debugLog('🏠 Loading available properties...');
      const { data: entries, error } = await supabaseQueries.getJournalEntries();
      
      if (error) {
        debugLog('❌ Error loading properties:', error);
        return;
      }

      // Extract unique properties and deduplicate
      const properties = Array.from(new Set(
        entries?.map((entry: FinancialEntry) => entry.property_class).filter(Boolean) || []
      ));
      
      debugLog('🏠 Raw properties from database:', properties);
      
      // Remove duplicates and sort
      const uniqueProperties = Array.from(new Set(properties)).sort();
      const propertiesWithAll = ['All Properties', ...uniqueProperties];
      
      debugLog('🏠 Processed unique properties:', propertiesWithAll);
      setAvailableProperties(propertiesWithAll);
      
    } catch (error) {
      debugLog('❌ Exception loading properties:', error);
    }
  };

  const loadFinancialData = async () => {
    setIsLoading(true);
    try {
      debugLog('📊 Starting financial data load...', {
        selectedMonth,
        selectedProperties: Array.from(selectedProperties),
        activeTab
      });

      // Test connection first
      const connectionTest = await testSupabaseConnection();
      debugLog('🔌 Supabase connection test:', connectionTest);

      // Parse selected month
      const [monthName, yearStr] = selectedMonth.split(' ');
      const year = parseInt(yearStr);
      const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth();
      
      debugLog('📅 Date parsing:', { monthName, year, monthIndex });

      // Create date range for the selected month
      const startDate = new Date(year, monthIndex, 1);
      const endDate = new Date(year, monthIndex + 1, 0); // Last day of month
      
      debugLog('📅 Date range:', { 
        startDate: startDate.toISOString(), 
        endDate: endDate.toISOString() 
      });

      // Get journal entries
      const { data: entries, error } = await supabaseQueries.getJournalEntries();
      
      if (error) {
        debugLog('❌ Error fetching journal entries:', error);
        throw error;
      }

      debugLog('📊 Raw journal entries count:', entries?.length || 0);

      if (!entries || entries.length === 0) {
        debugLog('⚠️ No journal entries found');
        setFinancialData([]);
        return;
      }

      // Filter by date range
      const dateFilteredEntries = entries.filter((entry: FinancialEntry) => {
        const entryDate = new Date(entry.transaction_date);
        const isInRange = entryDate >= startDate && entryDate <= endDate;
        
        if (!isInRange) {
          debugLog('📅 Date filter debug:', {
            entryDate: entryDate.toISOString(),
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            isInRange,
            entry: entry.transaction_date
          });
        }
        
        return isInRange;
      });

      debugLog('📅 Date filtered entries:', dateFilteredEntries.length);

      // Property filtering with detailed debugging
      let propertyFilteredEntries = dateFilteredEntries;
      const selectedPropsArray = Array.from(selectedProperties);
      
      debugLog('🏠 Property filtering:', {
        selectedProperties: selectedPropsArray,
        isAllProperties: selectedProperties.has('All Properties'),
        selectedSize: selectedProperties.size
      });

      if (!selectedProperties.has('All Properties') && selectedProperties.size > 0) {
        debugLog('🔍 Applying property filter...');
        
        propertyFilteredEntries = dateFilteredEntries.filter((entry: FinancialEntry) => {
          const matches = selectedProperties.has(entry.property_class);
          if (!matches) {
            debugLog('🏠 Property filter:', {
              entryProperty: entry.property_class,
              selectedProperties: selectedPropsArray,
              matches
            });
          }
          return matches;
        });
        
        debugLog('🏠 Property filtered entries:', propertyFilteredEntries.length);
      }

      // Log property distribution in results
      const propertyDistribution = propertyFilteredEntries.reduce((acc: any, entry: FinancialEntry) => {
        acc[entry.property_class] = (acc[entry.property_class] || 0) + 1;
        return acc;
      }, {});
      
      debugLog('📊 Property distribution in results:', propertyDistribution);

      // Process P&L data
      if (activeTab === 'p&l') {
        const plData = processPLData(propertyFilteredEntries);
        debugLog('📊 Processed P&L data:', plData);
        setFinancialData(plData);
      }
      
    } catch (error) {
      debugLog('❌ Error in loadFinancialData:', error);
      showNotification('Error loading financial data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const processPLData = (entries: FinancialEntry[]): FinancialDataItem[] => {
    debugLog('🧮 Processing P&L data with entries:', entries.length);
    
    const accountGroups: { [key: string]: FinancialEntry[] } = {};
    
    // Group entries by account name
    entries.forEach(entry => {
      if (!accountGroups[entry.account_name]) {
        accountGroups[entry.account_name] = [];
      }
      accountGroups[entry.account_name].push(entry);
    });

    debugLog('📊 Account groups:', Object.keys(accountGroups));

    const result: FinancialDataItem[] = [];

    // Process each account group
    Object.entries(accountGroups).forEach(([accountName, accountEntries]) => {
      const firstEntry = accountEntries[0];
      const accountType = firstEntry.account_type;
      
      // Calculate totals for accounting signs
      const totalDebits = accountEntries.reduce((sum, entry) => sum + entry.debit_amount, 0);
      const totalCredits = accountEntries.reduce((sum, entry) => sum + entry.credit_amount, 0);
      
      let accountTotal = 0;
      let isAbnormal = false;
      
      // Apply proper accounting signs
      if (accountType === 'Income') {
        // Revenue accounts: Credits - Debits (normal credit balance)
        accountTotal = totalCredits - totalDebits;
        isAbnormal = accountTotal < 0; // Abnormal if debit balance
      } else if (accountType === 'Expense') {
        // Expense accounts: Debits - Credits (normal debit balance)  
        accountTotal = totalDebits - totalCredits;
        isAbnormal = accountTotal < 0; // Abnormal if credit balance
      } else {
        // For other account types, use the line_amount sum
        accountTotal = accountEntries.reduce((sum, entry) => sum + entry.line_amount, 0);
      }

      debugLog(`💰 Account "${accountName}" (${accountType}):`, {
        totalDebits,
        totalCredits,
        accountTotal,
        isAbnormal,
        entryCount: accountEntries.length
      });

      result.push({
        name: `${accountName}${isAbnormal ? ' ⚠️' : ''}`,
        total: accountTotal,
        months: { [`${selectedMonth}` as MonthString]: accountTotal },
        type: accountType,
        detail_type: firstEntry.detail_type,
        entries: accountEntries,
        mapping_method: firstEntry.mapping_method || 'automatic'
      });
    });

    // Sort by account type and total
    result.sort((a, b) => {
      const typeOrder = { 'Income': 1, 'Expense': 2 };
      const aOrder = typeOrder[a.type as keyof typeof typeOrder] || 3;
      const bOrder = typeOrder[b.type as keyof typeof typeOrder] || 3;
      
      if (aOrder !== bOrder) return aOrder - bOrder;
      return Math.abs(b.total) - Math.abs(a.total);
    });

    return result;
  };

  const toggleProperty = (property: string) => {
    debugLog('🏠 Property toggle debugging:', { 
      property, 
      currentSelected: Array.from(selectedProperties),
      isCurrentlySelected: selectedProperties.has(property)
    });
    
    const newSelected = new Set(selectedProperties);
    
    if (property === 'All Properties') {
      debugLog('🏠 Toggling "All Properties"');
      if (selectedProperties.has('All Properties')) {
        newSelected.clear();
      } else {
        newSelected.clear();
        newSelected.add('All Properties');
      }
    } else {
      debugLog('🏠 Toggling specific property:', property);
      newSelected.delete('All Properties');
      
      if (selectedProperties.has(property)) {
        newSelected.delete(property);
        if (newSelected.size === 0) {
          newSelected.add('All Properties');
        }
      } else {
        newSelected.add(property);
      }
    }
    
    debugLog('🏠 New selection after toggle:', Array.from(newSelected));
    setSelectedProperties(newSelected);
  };

  const showNotification = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'info' }), 3000);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const calculateKPI = (type: 'revenue' | 'expenses' | 'profit'): number => {
    if (!financialData || financialData.length === 0) return 0;
    
    let value = 0;
    
    if (type === 'revenue') {
      value = financialData
        .filter(item => item.type === 'Income')
        .reduce((sum, item) => sum + item.total, 0);
    } else if (type === 'expenses') {
      value = financialData
        .filter(item => item.type === 'Expense')
        .reduce((sum, item) => sum + item.total, 0);
    } else if (type === 'profit') {
      const revenue = financialData
        .filter(item => item.type === 'Income')
        .reduce((sum, item) => sum + item.total, 0);
      const expenses = financialData
        .filter(item => item.type === 'Expense')
        .reduce((sum, item) => sum + item.total, 0);
      value = revenue - expenses;
    }
    
    debugLog(`📊 KPI ${type}:`, value);
    return value;
  };

  const exportData = () => {
    const csvContent = [
      ['Account Name', 'Type', 'Amount'],
      ...financialData.map(item => [
        item.name,
        item.type || '',
        item.total.toString()
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financials-${selectedMonth.replace(' ', '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleItemExpansion = (itemName: string) => {
    const newExpanded = new Set(expandedItems);
    if (expandedItems.has(itemName)) {
      newExpanded.delete(itemName);
    } else {
      newExpanded.add(itemName);
    }
    setExpandedItems(newExpanded);
  };

  // Calculate totals for display
  const revenue = calculateKPI('revenue');
  const expenses = calculateKPI('expenses');
  const profit = calculateKPI('profit');

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Financial Dashboard</h1>
        <p className="text-gray-600">Comprehensive financial analysis and reporting</p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'p&l', name: 'Profit & Loss', icon: TrendingUp },
              { id: 'cash-flow', name: 'Cash Flow', icon: BarChart3 },
              { id: 'balance-sheet', name: 'Balance Sheet', icon:
PieChart } ].map((tab) => { const Icon = tab.icon; return ( <button key={tab.id} onClick={() => setActiveTab(tab.id as FinancialTab)} className={group inline-flex items-center px-1 py-4 border-b-2 font-medium text-sm ${                     activeTab === tab.id                       ? 'border-blue-500 text-blue-600'                       : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'                   }} > <Icon className="mr-2 h-5 w-5" /> {tab.name} </button> ); })} </nav> </div> </div>

  {/* Controls */}
  <div className="mb-6 flex flex-wrap gap-4 items-center justify-between">
    <div className="flex flex-wrap gap-4 items-center">
      {/* Month Selector */}
      <select
        value={selectedMonth}
        onChange={(e) => setSelectedMonth(e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {['January 2025', 'February 2025', 'March 2025', 'April 2025', 'May 2025', 'June 2025', 
          'July 2025', 'August 2025', 'September 2025', 'October 2025', 'November 2025', 'December 2025'].map((month) => (
          <option key={month} value={month}>{month}</option>
        ))}
      </select>

      {/* Property Selector */}
      <div className="relative">
        <button
          onClick={() => setShowPropertyDropdown(!showPropertyDropdown)}
          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px] text-left flex items-center justify-between"
        >
          <span>
            {selectedProperties.size === 1 && selectedProperties.has('All Properties')
              ? 'All Properties'
              : selectedProperties.size === 1
              ? Array.from(selectedProperties)[0]
              : `${selectedProperties.size} Properties Selected`}
          </span>
          <ChevronDown className="h-4 w-4" />
        </button>
        
        {showPropertyDropdown && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            {availableProperties.map((property) => (
              <label
                key={property}
                className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedProperties.has(property)}
                  onChange={() => toggleProperty(property)}
                  className="mr-2"
                />
                <span className="text-sm">{property}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Time View Selector */}
      <select
        value={timeView}
        onChange={(e) => setTimeView(e.target.value
No problem! Let me continue with the complete updated code. Here's the full page.tsx with all our debugging features:

"use client";

import React, { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, Minus, Download, RefreshCw, TrendingUp, DollarSign, PieChart, BarChart3, ChevronDown, ChevronRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Cell, Pie } from 'recharts';
import { supabaseQueries, testSupabaseConnection, type FinancialEntry } from '@/lib/supabase';

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

interface TooltipState {
  show: boolean;
  content: string;
  x: number;
  y: number;
}

const FinancialsPage = () => {
  // State variables
  const [activeTab, setActiveTab] = useState<FinancialTab>('p&l');
  const [timeView, setTimeView] = useState<TimeView>('Monthly');
  const [viewMode, setViewMode] = useState<ViewMode>('total');
  const [selectedMonth, setSelectedMonth] = useState<string>('May 2025');
  const [selectedProperties, setSelectedProperties] = useState<Set<string>>(new Set(['All Properties']));
  const [availableProperties, setAvailableProperties] = useState<string[]>(['All Properties']);
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [financialData, setFinancialData] = useState<FinancialDataItem[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<NotificationState>({ show: false, message: '', type: 'info' });
  const [tooltip, setTooltip] = useState<TooltipState>({ show: false, content: '', x: 0, y: 0 });

  // Debug logging function
  const debugLog = (...args: any[]) => {
    console.log('🔍 FINANCIALS DEBUG:', ...args);
  };

  // Initialize and load data
  useEffect(() => {
    debugLog('🚀 Component initialized, loading initial data...');
    loadFinancialData();
  }, []);

  // Load data when filters change
  useEffect(() => {
    debugLog('📊 Filters changed, reloading data...', {
      selectedMonth,
      selectedProperties: Array.from(selectedProperties),
      activeTab
    });
    loadFinancialData();
  }, [selectedMonth, selectedProperties, activeTab]);

  // Load available properties
  useEffect(() => {
    loadAvailableProperties();
  }, []);

  const loadAvailableProperties = async () => {
    try {
      debugLog('🏠 Loading available properties...');
      const { data: entries, error } = await supabaseQueries.getJournalEntries();
      
      if (error) {
        debugLog('❌ Error loading properties:', error);
        return;
      }

      // Extract unique properties and deduplicate
      const properties = Array.from(new Set(
        entries?.map((entry: FinancialEntry) => entry.property_class).filter(Boolean) || []
      ));
      
      debugLog('🏠 Raw properties from database:', properties);
      
      // Remove duplicates and sort
      const uniqueProperties = Array.from(new Set(properties)).sort();
      const propertiesWithAll = ['All Properties', ...uniqueProperties];
      
      debugLog('🏠 Processed unique properties:', propertiesWithAll);
      setAvailableProperties(propertiesWithAll);
      
    } catch (error) {
      debugLog('❌ Exception loading properties:', error);
    }
  };

  const loadFinancialData = async () => {
    setIsLoading(true);
    try {
      debugLog('📊 Starting financial data load...', {
        selectedMonth,
        selectedProperties: Array.from(selectedProperties),
        activeTab
      });

      // Test connection first
      const connectionTest = await testSupabaseConnection();
      debugLog('🔌 Supabase connection test:', connectionTest);

      // Parse selected month
      const [monthName, yearStr] = selectedMonth.split(' ');
      const year = parseInt(yearStr);
      const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth();
      
      debugLog('📅 Date parsing:', { monthName, year, monthIndex });

      // Create date range for the selected month
      const startDate = new Date(year, monthIndex, 1);
      const endDate = new Date(year, monthIndex + 1, 0); // Last day of month
      
      debugLog('📅 Date range:', { 
        startDate: startDate.toISOString(), 
        endDate: endDate.toISOString() 
      });

      // Get journal entries
      const { data: entries, error } = await supabaseQueries.getJournalEntries();
      
      if (error) {
        debugLog('❌ Error fetching journal entries:', error);
        throw error;
      }

      debugLog('📊 Raw journal entries count:', entries?.length || 0);

      if (!entries || entries.length === 0) {
        debugLog('⚠️ No journal entries found');
        setFinancialData([]);
        return;
      }

      // Filter by date range
      const dateFilteredEntries = entries.filter((entry: FinancialEntry) => {
        const entryDate = new Date(entry.transaction_date);
        const isInRange = entryDate >= startDate && entryDate <= endDate;
        
        if (!isInRange) {
          debugLog('📅 Date filter debug:', {
            entryDate: entryDate.toISOString(),
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            isInRange,
            entry: entry.transaction_date
          });
        }
        
        return isInRange;
      });

      debugLog('📅 Date filtered entries:', dateFilteredEntries.length);

      // Property filtering with detailed debugging
      let propertyFilteredEntries = dateFilteredEntries;
      const selectedPropsArray = Array.from(selectedProperties);
      
      debugLog('🏠 Property filtering:', {
        selectedProperties: selectedPropsArray,
        isAllProperties: selectedProperties.has('All Properties'),
        selectedSize: selectedProperties.size
      });

      if (!selectedProperties.has('All Properties') && selectedProperties.size > 0) {
        debugLog('🔍 Applying property filter...');
        
        propertyFilteredEntries = dateFilteredEntries.filter((entry: FinancialEntry) => {
          const matches = selectedProperties.has(entry.property_class);
          if (!matches) {
            debugLog('🏠 Property filter:', {
              entryProperty: entry.property_class,
              selectedProperties: selectedPropsArray,
              matches
            });
          }
          return matches;
        });
        
        debugLog('🏠 Property filtered entries:', propertyFilteredEntries.length);
      }

      // Log property distribution in results
      const propertyDistribution = propertyFilteredEntries.reduce((acc: any, entry: FinancialEntry) => {
        acc[entry.property_class] = (acc[entry.property_class] || 0) + 1;
        return acc;
      }, {});
      
      debugLog('📊 Property distribution in results:', propertyDistribution);

      // Process P&L data
      if (activeTab === 'p&l') {
        const plData = processPLData(propertyFilteredEntries);
        debugLog('📊 Processed P&L data:', plData);
        setFinancialData(plData);
      }
      
    } catch (error) {
      debugLog('❌ Error in loadFinancialData:', error);
      showNotification('Error loading financial data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const processPLData = (entries: FinancialEntry[]): FinancialDataItem[] => {
    debugLog('🧮 Processing P&L data with entries:', entries.length);
    
    const accountGroups: { [key: string]: FinancialEntry[] } = {};
    
    // Group entries by account name
    entries.forEach(entry => {
      if (!accountGroups[entry.account_name]) {
        accountGroups[entry.account_name] = [];
      }
      accountGroups[entry.account_name].push(entry);
    });

    debugLog('📊 Account groups:', Object.keys(accountGroups));

    const result: FinancialDataItem[] = [];

    // Process each account group
    Object.entries(accountGroups).forEach(([accountName, accountEntries]) => {
      const firstEntry = accountEntries[0];
      const accountType = firstEntry.account_type;
      
      // Calculate totals for accounting signs
      const totalDebits = accountEntries.reduce((sum, entry) => sum + entry.debit_amount, 0);
      const totalCredits = accountEntries.reduce((sum, entry) => sum + entry.credit_amount, 0);
      
      let accountTotal = 0;
      let isAbnormal = false;
      
      // Apply proper accounting signs
      if (accountType === 'Income') {
        // Revenue accounts: Credits - Debits (normal credit balance)
        accountTotal = totalCredits - totalDebits;
        isAbnormal = accountTotal < 0; // Abnormal if debit balance
      } else if (accountType === 'Expense') {
        // Expense accounts: Debits - Credits (normal debit balance)  
        accountTotal = totalDebits - totalCredits;
        isAbnormal = accountTotal < 0; // Abnormal if credit balance
      } else {
        // For other account types, use the line_amount sum
        accountTotal = accountEntries.reduce((sum, entry) => sum + entry.line_amount, 0);
      }

      debugLog(`💰 Account "${accountName}" (${accountType}):`, {
        totalDebits,
        totalCredits,
        accountTotal,
        isAbnormal,
        entryCount: accountEntries.length
      });

      result.push({
        name: `${accountName}${isAbnormal ? ' ⚠️' : ''}`,
        total: accountTotal,
        months: { [`${selectedMonth}` as MonthString]: accountTotal },
        type: accountType,
        detail_type: firstEntry.detail_type,
        entries: accountEntries,
        mapping_method: firstEntry.mapping_method || 'automatic'
      });
    });

    // Sort by account type and total
    result.sort((a, b) => {
      const typeOrder = { 'Income': 1, 'Expense': 2 };
      const aOrder = typeOrder[a.type as keyof typeof typeOrder] || 3;
      const bOrder = typeOrder[b.type as keyof typeof typeOrder] || 3;
      
      if (aOrder !== bOrder) return aOrder - bOrder;
      return Math.abs(b.total) - Math.abs(a.total);
    });

    return result;
  };

  const toggleProperty = (property: string) => {
    debugLog('🏠 Property toggle debugging:', { 
      property, 
      currentSelected: Array.from(selectedProperties),
      isCurrentlySelected: selectedProperties.has(property)
    });
    
    const newSelected = new Set(selectedProperties);
    
    if (property === 'All Properties') {
      debugLog('🏠 Toggling "All Properties"');
      if (selectedProperties.has('All Properties')) {
        newSelected.clear();
      } else {
        newSelected.clear();
        newSelected.add('All Properties');
      }
    } else {
      debugLog('🏠 Toggling specific property:', property);
      newSelected.delete('All Properties');
      
      if (selectedProperties.has(property)) {
        newSelected.delete(property);
        if (newSelected.size === 0) {
          newSelected.add('All Properties');
        }
      } else {
        newSelected.add(property);
      }
    }
    
    debugLog('🏠 New selection after toggle:', Array.from(newSelected));
    setSelectedProperties(newSelected);
  };

  const showNotification = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'info' }), 3000);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const calculateKPI = (type: 'revenue' | 'expenses' | 'profit'): number => {
    if (!financialData || financialData.length === 0) return 0;
    
    let value = 0;
    
    if (type === 'revenue') {
      value = financialData
        .filter(item => item.type === 'Income')
        .reduce((sum, item) => sum + item.total, 0);
    } else if (type === 'expenses') {
      value = financialData
        .filter(item => item.type === 'Expense')
        .reduce((sum, item) => sum + item.total, 0);
    } else if (type === 'profit') {
      const revenue = financialData
        .filter(item => item.type === 'Income')
        .reduce((sum, item) => sum + item.total, 0);
      const expenses = financialData
        .filter(item => item.type === 'Expense')
        .reduce((sum, item) => sum + item.total, 0);
      value = revenue - expenses;
    }
    
    debugLog(`📊 KPI ${type}:`, value);
    return value;
  };

  const exportData = () => {
    const csvContent = [
      ['Account Name', 'Type', 'Amount'],
      ...financialData.map(item => [
        item.name,
        item.type || '',
        item.total.toString()
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financials-${selectedMonth.replace(' ', '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleItemExpansion = (itemName: string) => {
    const newExpanded = new Set(expandedItems);
    if (expandedItems.has(itemName)) {
      newExpanded.delete(itemName);
    } else {
      newExpanded.add(itemName);
    }
    setExpandedItems(newExpanded);
  };

  // Calculate totals for display
  const revenue = calculateKPI('revenue');
  const expenses = calculateKPI('expenses');
  const profit = calculateKPI('profit');

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Financial Dashboard</h1>
        <p className="text-gray-600">Comprehensive financial analysis and reporting</p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'p&l', name: 'Profit & Loss', icon: TrendingUp },
              { id: 'cash-flow', name: 'Cash Flow', icon: BarChart3 },
              { id: 'balance-sheet', name: 'Balance Sheet', icon: PieChart }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as FinancialTab)}
                  className={`group inline-flex items-center px-1 py-4 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="mr-2 h-5 w-5" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-6 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Month Selector */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {['January 2025', 'February 2025', 'March 2025', 'April 2025', 'May 2025', 'June 2025', 
              'July 2025', 'August 2025', 'September 2025', 'October 2025', 'November 2025', 'December 2025'].map((month) => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>

          {/* Property Selector */}
          <div className="relative">
            <button
              onClick={() => setShowPropertyDropdown(!showPropertyDropdown)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px] text-left flex items-center justify-between"
            >
              <span>
                {selectedProperties.size === 1 && selectedProperties.has('All Properties')
                  ? 'All Properties'
                  : selectedProperties.size === 1
                  ? Array.from(selectedProperties)[0]
                  : `${selectedProperties.size} Properties Selected`}
              </span>
              <ChevronDown className="h-4 w-4" />
            </button>
            
            {showPropertyDropdown && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                {availableProperties.map((property) => (
                  <label
                    key={property}
                    className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedProperties.has(property)}
                      onChange={() => toggleProperty(property)}
                      className="mr-2"
                    />
                    <span className="text-sm">{property}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Time View Selector */}
          <select
            value={timeView}
            onChange={(e) => setTimeView(e.target.value as TimeView)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Monthly">Monthly</option>
            <option value="YTD">Year to Date</option>
            <option value="TTM">Trailing 12 Months</option>
            <option value="MoM">Month over Month</option>
            <option value="YoY">Year over Year</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex border border-gray-300 rounded-md">
            <button
              onClick={() => setViewMode('total')}
              className={`px-3 py-2 text-sm ${
                viewMode === 'total'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Total
            </button>
            <button
              onClick={() => setViewMode('detailed')}
              className={`px-3 py-2 text-sm ${
                viewMode === 'detailed'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Detailed
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => loadFinancialData()}
            disabled={isLoading}
            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={exportData}
            className="flex items-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Revenue Card */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
              <p className={`text-2xl font-bold ${revenue < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(revenue)}
              </p>
            </div>
            <div className={`p-3 rounded-full ${revenue < 0 ? 'bg-red-100' : 'bg-green-100'}`}>
              <TrendingUp className={`h-6 w-6 ${revenue < 0 ? 'text-red-600' : 'text-green-600'}`} />
            </div>
          </div>
        </div>

        {/* Expenses Card */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Expenses</p>
              
No problem! Let me continue with the complete updated code. Here's the full page.tsx with all our debugging features:

"use client";

import React, { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, Minus, Download, RefreshCw, TrendingUp, DollarSign, PieChart, BarChart3, ChevronDown, ChevronRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Cell, Pie } from 'recharts';
import { supabaseQueries, testSupabaseConnection, type FinancialEntry } from '@/lib/supabase';

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

interface TooltipState {
  show: boolean;
  content: string;
  x: number;
  y: number;
}

const FinancialsPage = () => {
  // State variables
  const [activeTab, setActiveTab] = useState<FinancialTab>('p&l');
  const [timeView, setTimeView] = useState<TimeView>('Monthly');
  const [viewMode, setViewMode] = useState<ViewMode>('total');
  const [selectedMonth, setSelectedMonth] = useState<string>('May 2025');
  const [selectedProperties, setSelectedProperties] = useState<Set<string>>(new Set(['All Properties']));
  const [availableProperties, setAvailableProperties] = useState<string[]>(['All Properties']);
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [financialData, setFinancialData] = useState<FinancialDataItem[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<NotificationState>({ show: false, message: '', type: 'info' });
  const [tooltip, setTooltip] = useState<TooltipState>({ show: false, content: '', x: 0, y: 0 });

  // Debug logging function
  const debugLog = (...args: any[]) => {
    console.log('🔍 FINANCIALS DEBUG:', ...args);
  };

  // Initialize and load data
  useEffect(() => {
    debugLog('🚀 Component initialized, loading initial data...');
    loadFinancialData();
  }, []);

  // Load data when filters change
  useEffect(() => {
    debugLog('📊 Filters changed, reloading data...', {
      selectedMonth,
      selectedProperties: Array.from(selectedProperties),
      activeTab
    });
    loadFinancialData();
  }, [selectedMonth, selectedProperties, activeTab]);

  // Load available properties
  useEffect(() => {
    loadAvailableProperties();
  }, []);

  const loadAvailableProperties = async () => {
    try {
      debugLog('🏠 Loading available properties...');
      const { data: entries, error } = await supabaseQueries.getJournalEntries();
      
      if (error) {
        debugLog('❌ Error loading properties:', error);
        return;
      }

      // Extract unique properties and deduplicate
      const properties = Array.from(new Set(
        entries?.map((entry: FinancialEntry) => entry.property_class).filter(Boolean) || []
      ));
      
      debugLog('🏠 Raw properties from database:', properties);
      
      // Remove duplicates and sort
      const uniqueProperties = Array.from(new Set(properties)).sort();
      const propertiesWithAll = ['All Properties', ...uniqueProperties];
      
      debugLog('🏠 Processed unique properties:', propertiesWithAll);
      setAvailableProperties(propertiesWithAll);
      
    } catch (error) {
      debugLog('❌ Exception loading properties:', error);
    }
  };

  const loadFinancialData = async () => {
    setIsLoading(true);
    try {
      debugLog('📊 Starting financial data load...', {
        selectedMonth,
        selectedProperties: Array.from(selectedProperties),
        activeTab
      });

      // Test connection first
      const connectionTest = await testSupabaseConnection();
      debugLog('🔌 Supabase connection test:', connectionTest);

      // Parse selected month
      const [monthName, yearStr] = selectedMonth.split(' ');
      const year = parseInt(yearStr);
      const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth();
      
      debugLog('📅 Date parsing:', { monthName, year, monthIndex });

      // Create date range for the selected month
      const startDate = new Date(year, monthIndex, 1);
      const endDate = new Date(year, monthIndex + 1, 0); // Last day of month
      
      debugLog('📅 Date range:', { 
        startDate: startDate.toISOString(), 
        endDate: endDate.toISOString() 
      });

      // Get journal entries
      const { data: entries, error } = await supabaseQueries.getJournalEntries();
      
      if (error) {
        debugLog('❌ Error fetching journal entries:', error);
        throw error;
      }

      debugLog('📊 Raw journal entries count:', entries?.length || 0);

      if (!entries || entries.length === 0) {
        debugLog('⚠️ No journal entries found');
        setFinancialData([]);
        return;
      }

      // Filter by date range
      const dateFilteredEntries = entries.filter((entry: FinancialEntry) => {
        const entryDate = new Date(entry.transaction_date);
        const isInRange = entryDate >= startDate && entryDate <= endDate;
        
        if (!isInRange) {
          debugLog('📅 Date filter debug:', {
            entryDate: entryDate.toISOString(),
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            isInRange,
            entry: entry.transaction_date
          });
        }
        
        return isInRange;
      });

      debugLog('📅 Date filtered entries:', dateFilteredEntries.length);

      // Property filtering with detailed debugging
      let propertyFilteredEntries = dateFilteredEntries;
      const selectedPropsArray = Array.from(selectedProperties);
      
      debugLog('🏠 Property filtering:', {
        selectedProperties: selectedPropsArray,
        isAllProperties: selectedProperties.has('All Properties'),
        selectedSize: selectedProperties.size
      });

      if (!selectedProperties.has('All Properties') && selectedProperties.size > 0) {
        debugLog('🔍 Applying property filter...');
        
        propertyFilteredEntries = dateFilteredEntries.filter((entry: FinancialEntry) => {
          const matches = selectedProperties.has(entry.property_class);
          if (!matches) {
            debugLog('🏠 Property filter:', {
              entryProperty: entry.property_class,
              selectedProperties: selectedPropsArray,
              matches
            });
          }
          return matches;
        });
        
        debugLog('🏠 Property filtered entries:', propertyFilteredEntries.length);
      }

      // Log property distribution in results
      const propertyDistribution = propertyFilteredEntries.reduce((acc: any, entry: FinancialEntry) => {
        acc[entry.property_class] = (acc[entry.property_class] || 0) + 1;
        return acc;
      }, {});
      
      debugLog('📊 Property distribution in results:', propertyDistribution);

      // Process P&L data
      if (activeTab === 'p&l') {
        const plData = processPLData(propertyFilteredEntries);
        debugLog('📊 Processed P&L data:', plData);
        setFinancialData(plData);
      }
      
    } catch (error) {
      debugLog('❌ Error in loadFinancialData:', error);
      showNotification('Error loading financial data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const processPLData = (entries: FinancialEntry[]): FinancialDataItem[] => {
    debugLog('🧮 Processing P&L data with entries:', entries.length);
    
    const accountGroups: { [key: string]: FinancialEntry[] } = {};
    
    // Group entries by account name
    entries.forEach(entry => {
      if (!accountGroups[entry.account_name]) {
        accountGroups[entry.account_name] = [];
      }
      accountGroups[entry.account_name].push(entry);
    });

    debugLog('📊 Account groups:', Object.keys(accountGroups));

    const result: FinancialDataItem[] = [];

    // Process each account group
    Object.entries(accountGroups).forEach(([accountName, accountEntries]) => {
      const firstEntry = accountEntries[0];
      const accountType = firstEntry.account_type;
      
      // Calculate totals for accounting signs
      const totalDebits = accountEntries.reduce((sum, entry) => sum + entry.debit_amount, 0);
      const totalCredits = accountEntries.reduce((sum, entry) => sum + entry.credit_amount, 0);
      
      let accountTotal = 0;
      let isAbnormal = false;
      
      // Apply proper accounting signs
      if (accountType === 'Income') {
        // Revenue accounts: Credits - Debits (normal credit balance)
        accountTotal = totalCredits - totalDebits;
        isAbnormal = accountTotal < 0; // Abnormal if debit balance
      } else if (accountType === 'Expense') {
        // Expense accounts: Debits - Credits (normal debit balance)  
        accountTotal = totalDebits - totalCredits;
        isAbnormal = accountTotal < 0; // Abnormal if credit balance
      } else {
        // For other account types, use the line_amount sum
        accountTotal = accountEntries.reduce((sum, entry) => sum + entry.line_amount, 0);
      }

      debugLog(`💰 Account "${accountName}" (${accountType}):`, {
        totalDebits,
        totalCredits,
        accountTotal,
        isAbnormal,
        entryCount: accountEntries.length
      });

      result.push({
        name: `${accountName}${isAbnormal ? ' ⚠️' : ''}`,
        total: accountTotal,
        months: { [`${selectedMonth}` as MonthString]: accountTotal },
        type: accountType,
        detail_type: firstEntry.detail_type,
        entries: accountEntries,
        mapping_method: firstEntry.mapping_method || 'automatic'
      });
    });

    // Sort by account type and total
    result.sort((a, b) => {
      const typeOrder = { 'Income': 1, 'Expense': 2 };
      const aOrder = typeOrder[a.type as keyof typeof typeOrder] || 3;
      const bOrder = typeOrder[b.type as keyof typeof typeOrder] || 3;
      
      if (aOrder !== bOrder) return aOrder - bOrder;
      return Math.abs(b.total) - Math.abs(a.total);
    });

    return result;
  };

  const toggleProperty = (property: string) => {
    debugLog('🏠 Property toggle debugging:', { 
      property, 
      currentSelected: Array.from(selectedProperties),
      isCurrentlySelected: selectedProperties.has(property)
    });
    
    const newSelected = new Set(selectedProperties);
    
    if (property === 'All Properties') {
      debugLog('🏠 Toggling "All Properties"');
      if (selectedProperties.has('All Properties')) {
        newSelected.clear();
      } else {
        newSelected.clear();
        newSelected.add('All Properties');
      }
    } else {
      debugLog('🏠 Toggling specific property:', property);
      newSelected.delete('All Properties');
      
      if (selectedProperties.has(property)) {
        newSelected.delete(property);
        if (newSelected.size === 0) {
          newSelected.add('All Properties');
        }
      } else {
        newSelected.add(property);
      }
    }
    
    debugLog('🏠 New selection after toggle:', Array.from(newSelected));
    setSelectedProperties(newSelected);
  };

  const showNotification = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'info' }), 3000);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const calculateKPI = (type: 'revenue' | 'expenses' | 'profit'): number => {
    if (!financialData || financialData.length === 0) return 0;
    
    let value = 0;
    
    if (type === 'revenue') {
      value = financialData
        .filter(item => item.type === 'Income')
        .reduce((sum, item) => sum + item.total, 0);
    } else if (type === 'expenses') {
      value = financialData
        .filter(item => item.type === 'Expense')
        .reduce((sum, item) => sum + item.total, 0);
    } else if (type === 'profit') {
      const revenue = financialData
        .filter(item => item.type === 'Income')
        .reduce((sum, item) => sum + item.total, 0);
      const expenses = financialData
        .filter(item => item.type === 'Expense')
        .reduce((sum, item) => sum + item.total, 0);
      value = revenue - expenses;
    }
    
    debugLog(`📊 KPI ${type}:`, value);
    return value;
  };

  const exportData = () => {
    const csvContent = [
      ['Account Name', 'Type', 'Amount'],
      ...financialData.map(item => [
        item.name,
        item.type || '',
        item.total.toString()
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financials-${selectedMonth.replace(' ', '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleItemExpansion = (itemName: string) => {
    const newExpanded = new Set(expandedItems);
    if (expandedItems.has(itemName)) {
      newExpanded.delete(itemName);
    } else {
      newExpanded.add(itemName);
    }
    setExpandedItems(newExpanded);
  };

  // Calculate totals for display
  const revenue = calculateKPI('revenue');
  const expenses = calculateKPI('expenses');
  const profit = calculateKPI('profit');

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Financial Dashboard</h1>
        <p className="text-gray-600">Comprehensive financial analysis and reporting</p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'p&l', name: 'Profit & Loss', icon: TrendingUp },
              { id: 'cash-flow', name: 'Cash Flow', icon: BarChart3 },
              { id: 'balance-sheet', name: 'Balance Sheet', icon: PieChart }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as FinancialTab)}
                  className={`group inline-flex items-center px-1 py-4 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="mr-2 h-5 w-5" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-6 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Month Selector */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {['January 2025', 'February 2025', 'March 2025', 'April 2025', 'May 2025', 'June 2025', 
              'July 2025', 'August 2025', 'September 2025', 'October 2025', 'November 2025', 'December 2025'].map((month) => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>

          {/* Property Selector */}
          <div className="relative">
            <button
              onClick={() => setShowPropertyDropdown(!showPropertyDropdown)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px] text-left flex items-center justify-between"
            >
              <span>
                {selectedProperties.size === 1 && selectedProperties.has('All Properties')
                  ? 'All Properties'
                  : selectedProperties.size === 1
                  ? Array.from(selectedProperties)[0]
                  : `${selectedProperties.size} Properties Selected`}
              </span>
              <ChevronDown className="h-4 w-4" />
            </button>
            
            {showPropertyDropdown && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                {availableProperties.map((property) => (
                  <label
                    key={property}
                    className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedProperties.has(property)}
                      onChange={() => toggleProperty(property)}
                      className="mr-2"
                    />
                    <span className="text-sm">{property}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Time View Selector */}
          <select
            value={timeView}
            onChange={(e) => setTimeView(e.target.value as TimeView)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Monthly">Monthly</option>
            <option value="YTD">Year to Date</option>
            <option value="TTM">Trailing 12 Months</option>
            <option value="MoM">Month over Month</option>
            <option value="YoY">Year over Year</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex border border-gray-300 rounded-md">
            <button
              onClick={() => setViewMode('total')}
              className={`px-3 py-2 text-sm ${
                viewMode === 'total'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Total
            </button>
            <button
              onClick={() => setViewMode('detailed')}
              className={`px-3 py-2 text-sm ${
                viewMode === 'detailed'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Detailed
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => loadFinancialData()}
            disabled={isLoading}
            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={exportData}
            className="flex items-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Revenue Card */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
              <p className={`text-2xl font-bold ${revenue < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(revenue)}
              </p>
            </div>
            <div className={`p-3 rounded-full ${revenue < 0 ? 'bg-red-100' : 'bg-green-100'}`}>
              <TrendingUp className={`h-6 w-6 ${revenue < 0 ? 'text-red-600' : 'text-green-600'}`} />
            </div>
          </div>
        </div>

        {/* Expenses Card */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Expenses</p>
              <p className={`text-2xl font-bold ${expenses < 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(expenses)}
              </p>
            </div>
            <div className={`p-3 rounded-full ${expenses < 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              <DollarSign className={`h-6 w-6 ${expenses < 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
          </div>
        </div>

        {/* Net Profit Card */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Net Profit</p>
              <p className={`text-2xl font-bold ${profit < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(profit)}
              </p>
            </div>
            <div className={`p-3 rounded-full ${profit < 0 ? 'bg-red-100' : 'bg-green-100'}`}>
              <BarChart3 className={`h-6 w-6 ${profit < 0 ? 'text-red-600' : 'text-green-600'}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Financial Data Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {activeTab === 'p&l' ? 'Profit & Loss Statement' : 
             activeTab === 'cash-flow' ? 'Cash Flow Statement' : 
             'Balance Sheet'}
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
              <span className="ml-2 text-gray-600">Loading financial data...</span>
            </div>
          ) : financialData.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No financial data available for the selected period.</p>
            </div>
          ) : (
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{selectedMonth}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">% of Revenue</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-
No problem! Let me continue with the complete updated code. Here's the full page.tsx with all our debugging features:

"use client";

import React, { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, Minus, Download, RefreshCw, TrendingUp, DollarSign, PieChart, BarChart3, ChevronDown, ChevronRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Cell, Pie } from 'recharts';
import { supabaseQueries, testSupabaseConnection, type FinancialEntry } from '@/lib/supabase';

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

interface TooltipState {
  show: boolean;
  content: string;
  x: number;
  y: number;
}

const FinancialsPage = () => {
  // State variables
  const [activeTab, setActiveTab] = useState<FinancialTab>('p&l');
  const [timeView, setTimeView] = useState<TimeView>('Monthly');
  const [viewMode, setViewMode] = useState<ViewMode>('total');
  const [selectedMonth, setSelectedMonth] = useState<string>('May 2025');
  const [selectedProperties, setSelectedProperties] = useState<Set<string>>(new Set(['All Properties']));
  const [availableProperties, setAvailableProperties] = useState<string[]>(['All Properties']);
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [financialData, setFinancialData] = useState<FinancialDataItem[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<NotificationState>({ show: false, message: '', type: 'info' });
  const [tooltip, setTooltip] = useState<TooltipState>({ show: false, content: '', x: 0, y: 0 });

  // Debug logging function
  const debugLog = (...args: any[]) => {
    console.log('🔍 FINANCIALS DEBUG:', ...args);
  };

  // Initialize and load data
  useEffect(() => {
    debugLog('🚀 Component initialized, loading initial data...');
    loadFinancialData();
  }, []);

  // Load data when filters change
  useEffect(() => {
    debugLog('📊 Filters changed, reloading data...', {
      selectedMonth,
      selectedProperties: Array.from(selectedProperties),
      activeTab
    });
    loadFinancialData();
  }, [selectedMonth, selectedProperties, activeTab]);

  // Load available properties
  useEffect(() => {
    loadAvailableProperties();
  }, []);

  const loadAvailableProperties = async () => {
    try {
      debugLog('🏠 Loading available properties...');
      const { data: entries, error } = await supabaseQueries.getJournalEntries();
      
      if (error) {
        debugLog('❌ Error loading properties:', error);
        return;
      }

      // Extract unique properties and deduplicate
      const properties = Array.from(new Set(
        entries?.map((entry: FinancialEntry) => entry.property_class).filter(Boolean) || []
      ));
      
      debugLog('🏠 Raw properties from database:', properties);
      
      // Remove duplicates and sort
      const uniqueProperties = Array.from(new Set(properties)).sort();
      const propertiesWithAll = ['All Properties', ...uniqueProperties];
      
      debugLog('🏠 Processed unique properties:', propertiesWithAll);
      setAvailableProperties(propertiesWithAll);
      
    } catch (error) {
      debugLog('❌ Exception loading properties:', error);
    }
  };

  const loadFinancialData = async () => {
    setIsLoading(true);
    try {
      debugLog('📊 Starting financial data load...', {
        selectedMonth,
        selectedProperties: Array.from(selectedProperties),
        activeTab
      });

      // Test connection first
      const connectionTest = await testSupabaseConnection();
      debugLog('🔌 Supabase connection test:', connectionTest);

      // Parse selected month
      const [monthName, yearStr] = selectedMonth.split(' ');
      const year = parseInt(yearStr);
      const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth();
      
      debugLog('📅 Date parsing:', { monthName, year, monthIndex });

      // Create date range for the selected month
      const startDate = new Date(year, monthIndex, 1);
      const endDate = new Date(year, monthIndex + 1, 0); // Last day of month
      
      debugLog('📅 Date range:', { 
        startDate: startDate.toISOString(), 
        endDate: endDate.toISOString() 
      });

      // Get journal entries
      const { data: entries, error } = await supabaseQueries.getJournalEntries();
      
      if (error) {
        debugLog('❌ Error fetching journal entries:', error);
        throw error;
      }

      debugLog('📊 Raw journal entries count:', entries?.length || 0);

      if (!entries || entries.length === 0) {
        debugLog('⚠️ No journal entries found');
        setFinancialData([]);
        return;
      }

      // Filter by date range
      const dateFilteredEntries = entries.filter((entry: FinancialEntry) => {
        const entryDate = new Date(entry.transaction_date);
        const isInRange = entryDate >= startDate && entryDate <= endDate;
        
        if (!isInRange) {
          debugLog('📅 Date filter debug:', {
            entryDate: entryDate.toISOString(),
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            isInRange,
            entry: entry.transaction_date
          });
        }
        
        return isInRange;
      });

      debugLog('📅 Date filtered entries:', dateFilteredEntries.length);

      // Property filtering with detailed debugging
      let propertyFilteredEntries = dateFilteredEntries;
      const selectedPropsArray = Array.from(selectedProperties);
      
      debugLog('🏠 Property filtering:', {
        selectedProperties: selectedPropsArray,
        isAllProperties: selectedProperties.has('All Properties'),
        selectedSize: selectedProperties.size
      });

      if (!selectedProperties.has('All Properties') && selectedProperties.size > 0) {
        debugLog('🔍 Applying property filter...');
        
        propertyFilteredEntries = dateFilteredEntries.filter((entry: FinancialEntry) => {
          const matches = selectedProperties.has(entry.property_class);
          if (!matches) {
            debugLog('🏠 Property filter:', {
              entryProperty: entry.property_class,
              selectedProperties: selectedPropsArray,
              matches
            });
          }
          return matches;
        });
        
        debugLog('🏠 Property filtered entries:', propertyFilteredEntries.length);
      }

      // Log property distribution in results
      const propertyDistribution = propertyFilteredEntries.reduce((acc: any, entry: FinancialEntry) => {
        acc[entry.property_class] = (acc[entry.property_class] || 0) + 1;
        return acc;
      }, {});
      
      debugLog('📊 Property distribution in results:', propertyDistribution);

      // Process P&L data
      if (activeTab === 'p&l') {
        const plData = processPLData(propertyFilteredEntries);
        debugLog('📊 Processed P&L data:', plData);
        setFinancialData(plData);
      }
      
    } catch (error) {
      debugLog('❌ Error in loadFinancialData:', error);
      showNotification('Error loading financial data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const processPLData = (entries: FinancialEntry[]): FinancialDataItem[] => {
    debugLog('🧮 Processing P&L data with entries:', entries.length);
    
    const accountGroups: { [key: string]: FinancialEntry[] } = {};
    
    // Group entries by account name
    entries.forEach(entry => {
      if (!accountGroups[entry.account_name]) {
        accountGroups[entry.account_name] = [];
      }
      accountGroups[entry.account_name].push(entry);
    });

    debugLog('📊 Account groups:', Object.keys(accountGroups));

    const result: FinancialDataItem[] = [];

    // Process each account group
    Object.entries(accountGroups).forEach(([accountName, accountEntries]) => {
      const firstEntry = accountEntries[0];
      const accountType = firstEntry.account_type;
      
      // Calculate totals for accounting signs
      const totalDebits = accountEntries.reduce((sum, entry) => sum + entry.debit_amount, 0);
      const totalCredits = accountEntries.reduce((sum, entry) => sum + entry.credit_amount, 0);
      
      let accountTotal = 0;
      let isAbnormal = false;
      
      // Apply proper accounting signs
      if (accountType === 'Income') {
        // Revenue accounts: Credits - Debits (normal credit balance)
        accountTotal = totalCredits - totalDebits;
        isAbnormal = accountTotal < 0; // Abnormal if debit balance
      } else if (accountType === 'Expense') {
        // Expense accounts: Debits - Credits (normal debit balance)  
        accountTotal = totalDebits - totalCredits;
        isAbnormal = accountTotal < 0; // Abnormal if credit balance
      } else {
        // For other account types, use the line_amount sum
        accountTotal = accountEntries.reduce((sum, entry) => sum + entry.line_amount, 0);
      }

      debugLog(`💰 Account "${accountName}" (${accountType}):`, {
        totalDebits,
        totalCredits,
        accountTotal,
        isAbnormal,
        entryCount: accountEntries.length
      });

      result.push({
        name: `${accountName}${isAbnormal ? ' ⚠️' : ''}`,
        total: accountTotal,
        months: { [`${selectedMonth}` as MonthString]: accountTotal },
        type: accountType,
        detail_type: firstEntry.detail_type,
        entries: accountEntries,
        mapping_method: firstEntry.mapping_method || 'automatic'
      });
    });

    // Sort by account type and total
    result.sort((a, b) => {
      const typeOrder = { 'Income': 1, 'Expense': 2 };
      const aOrder = typeOrder[a.type as keyof typeof typeOrder] || 3;
      const bOrder = typeOrder[b.type as keyof typeof typeOrder] || 3;
      
      if (aOrder !== bOrder) return aOrder - bOrder;
      return Math.abs(b.total) - Math.abs(a.total);
    });

    return result;
  };

  const toggleProperty = (property: string) => {
    debugLog('🏠 Property toggle debugging:', { 
      property, 
      currentSelected: Array.from(selectedProperties),
      isCurrentlySelected: selectedProperties.has(property)
    });
    
    const newSelected = new Set(selectedProperties);
    
    if (property === 'All Properties') {
      debugLog('🏠 Toggling "All Properties"');
      if (selectedProperties.has('All Properties')) {
        newSelected.clear();
      } else {
        newSelected.clear();
        newSelected.add('All Properties');
      }
    } else {
      debugLog('🏠 Toggling specific property:', property);
      newSelected.delete('All Properties');
      
      if (selectedProperties.has(property)) {
        newSelected.delete(property);
        if (newSelected.size === 0) {
          newSelected.add('All Properties');
        }
      } else {
        newSelected.add(property);
      }
    }
    
    debugLog('🏠 New selection after toggle:', Array.from(newSelected));
    setSelectedProperties(newSelected);
  };

  const showNotification = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'info' }), 3000);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const calculateKPI = (type: 'revenue' | 'expenses' | 'profit'): number => {
    if (!financialData || financialData.length === 0) return 0;
    
    let value = 0;
    
    if (type === 'revenue') {
      value = financialData
        .filter(item => item.type === 'Income')
        .reduce((sum, item) => sum + item.total, 0);
    } else if (type === 'expenses') {
      value = financialData
        .filter(item => item.type === 'Expense')
        .reduce((sum, item) => sum + item.total, 0);
    } else if (type === 'profit') {
      const revenue = financialData
        .filter(item => item.type === 'Income')
        .reduce((sum, item) => sum + item.total, 0);
      const expenses = financialData
        .filter(item => item.type === 'Expense')
        .reduce((sum, item) => sum + item.total, 0);
      value = revenue - expenses;
    }
    
    debugLog(`📊 KPI ${type}:`, value);
    return value;
  };

  const exportData = () => {
    const csvContent = [
      ['Account Name', 'Type', 'Amount'],
      ...financialData.map(item => [
        item.name,
        item.type || '',
        item.total.toString()
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financials-${selectedMonth.replace(' ', '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleItemExpansion = (itemName: string) => {
    const newExpanded = new Set(expandedItems);
    if (expandedItems.has(itemName)) {
      newExpanded.delete(itemName);
    } else {
      newExpanded.add(itemName);
    }
    setExpandedItems(newExpanded);
  };

  // Calculate totals for display
  const revenue = calculateKPI('revenue');
  const expenses = calculateKPI('expenses');
  const profit = calculateKPI('profit');

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Financial Dashboard</h1>
        <p className="text-gray-600">Comprehensive financial analysis and reporting</p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'p&l', name: 'Profit & Loss', icon: TrendingUp },
              { id: 'cash-flow', name: 'Cash Flow', icon: BarChart3 },
              { id: 'balance-sheet', name: 'Balance Sheet', icon: PieChart }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as FinancialTab)}
                  className={`group inline-flex items-center px-1 py-4 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="mr-2 h-5 w-5" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-6 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Month Selector */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {['January 2025', 'February 2025', 'March 2025', 'April 2025', 'May 2025', 'June 2025', 
              'July 2025', 'August 2025', 'September 2025', 'October 2025', 'November 2025', 'December 2025'].map((month) => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>

          {/* Property Selector */}
          <div className="relative">
            <button
              onClick={() => setShowPropertyDropdown(!showPropertyDropdown)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px] text-left flex items-center justify-between"
            >
              <span>
                {selectedProperties.size === 1 && selectedProperties.has('All Properties')
                  ? 'All Properties'
                  : selectedProperties.size === 1
                  ? Array.from(selectedProperties)[0]
                  : `${selectedProperties.size} Properties Selected`}
              </span>
              <ChevronDown className="h-4 w-4" />
            </button>
            
            {showPropertyDropdown && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                {availableProperties.map((property) => (
                  <label
                    key={property}
                    className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedProperties.has(property)}
                      onChange={() => toggleProperty(property)}
                      className="mr-2"
                    />
                    <span className="text-sm">{property}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Time View Selector */}
          <select
            value={timeView}
            onChange={(e) => setTimeView(e.target.value as TimeView)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Monthly">Monthly</option>
            <option value="YTD">Year to Date</option>
            <option value="TTM">Trailing 12 Months</option>
            <option value="MoM">Month over Month</option>
            <option value="YoY">Year over Year</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex border border-gray-300 rounded-md">
            <button
              onClick={() => setViewMode('total')}
              className={`px-3 py-2 text-sm ${
                viewMode === 'total'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Total
            </button>
            <button
              onClick={() => setViewMode('detailed')}
              className={`px-3 py-2 text-sm ${
                viewMode === 'detailed'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Detailed
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => loadFinancialData()}
            disabled={isLoading}
            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={exportData}
            className="flex items-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Revenue Card */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
              <p className={`text-2xl font-bold ${revenue < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(revenue)}
              </p>
            </div>
            <div className={`p-3 rounded-full ${revenue < 0 ? 'bg-red-100' : 'bg-green-100'}`}>
              <TrendingUp className={`h-6 w-6 ${revenue < 0 ? 'text-red-600' : 'text-green-600'}`} />
            </div>
          </div>
        </div>

        {/* Expenses Card */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Expenses</p>
              <p className={`text-2xl font-bold ${expenses < 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(expenses)}
              </p>
            </div>
            <div className={`p-3 rounded-full ${expenses < 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              <DollarSign className={`h-6 w-6 ${expenses < 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
          </div>
        </div>

        {/* Net Profit Card */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Net Profit</p>
              <p className={`text-2xl font-bold ${profit < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(profit)}
              </p>
            </div>
            <div className={`p-3 rounded-full ${profit < 0 ? 'bg-red-100' : 'bg-green-100'}`}>
              <BarChart3 className={`h-6 w-6 ${profit < 0 ? 'text-red-600' : 'text-green-600'}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Financial Data Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {activeTab === 'p&l' ? 'Profit & Loss Statement' : 
             activeTab === 'cash-flow' ? 'Cash Flow Statement' : 
             'Balance Sheet'}
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
              <span className="ml-2 text-gray-600">Loading financial data...</span>
            </div>
          ) : financialData.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No financial data available for the selected period.</p>
            </div>
          ) : (
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{selectedMonth}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">% of Revenue</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {financialData.map((item, index) => {
                  const isExpanded = expandedItems.has(item.name);
                  const percentOfRevenue = revenue !== 0 ? (item.total / revenue) * 100 : 0;
                  
                  return (
                    <React.Fragment key={index}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {viewMode === 'detailed' && item.entries && item.entries.length > 1 && (
                              <button
                                onClick={() => toggleItemExpansion(item.name)}
                                className="mr-2 p-1 hover:bg-gray-200 rounded"
                              >
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </button>
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900">{item.name}</div>
                              <div className="text-sm text-gray-500">{item.type}</div>
                            </div>
                          </div>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${
                          item.total < 0 ? 'text-red-600' : 'text-gray-900'
                        }`}>
                          {formatCurrency(item.total)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                          {percentOfRevenue.toFixed(1)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            {item.mapping_method || 'auto'}
                          </span>
                        </td>
                      </tr>
                      
                      {/* Expanded entries */}
                      {isExpanded && item.entries && (
                        item.entries.map((entry: FinancialEntry, entryIndex: number) => (
                          <tr key={`${index}-${entryIndex}`} className="bg-gray-50">
                            <td className="px-12 py-2 text-sm text-gray-600">
                              {entry.description || entry.je_number}
                            </td>
                            <td className="px-6 py-2 text-right text-sm text-gray-600">
                              {formatCurrency(entry.line_amount)}
                            </td>
                            <td className="px-6 py-2 text-right text-sm text-gray-500">
                              {entry.property_class}
                            </td>
                            <td className="px-6 py-2 text-center text-sm text-gray-500">
                              {new Date(entry.transaction_date).toLocaleDateString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        
No problem! Let me continue with the complete updated code. Here's the full page.tsx with all our debugging features:

"use client";

import React, { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, Minus, Download, RefreshCw, TrendingUp, DollarSign, PieChart, BarChart3, ChevronDown, ChevronRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Cell, Pie } from 'recharts';
import { supabaseQueries, testSupabaseConnection, type FinancialEntry } from '@/lib/supabase';

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

interface TooltipState {
  show: boolean;
  content: string;
  x: number;
  y: number;
}

const FinancialsPage = () => {
  // State variables
  const [activeTab, setActiveTab] = useState<FinancialTab>('p&l');
  const [timeView, setTimeView] = useState<TimeView>('Monthly');
  const [viewMode, setViewMode] = useState<ViewMode>('total');
  const [selectedMonth, setSelectedMonth] = useState<string>('May 2025');
  const [selectedProperties, setSelectedProperties] = useState<Set<string>>(new Set(['All Properties']));
  const [availableProperties, setAvailableProperties] = useState<string[]>(['All Properties']);
  const [showPropertyDropdown, setShowPropertyDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [financialData, setFinancialData] = useState<FinancialDataItem[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [notification, setNotification] = useState<NotificationState>({ show: false, message: '', type: 'info' });
  const [tooltip, setTooltip] = useState<TooltipState>({ show: false, content: '', x: 0, y: 0 });

  // Debug logging function
  const debugLog = (...args: any[]) => {
    console.log('🔍 FINANCIALS DEBUG:', ...args);
  };

  // Initialize and load data
  useEffect(() => {
    debugLog('🚀 Component initialized, loading initial data...');
    loadFinancialData();
  }, []);

  // Load data when filters change
  useEffect(() => {
    debugLog('📊 Filters changed, reloading data...', {
      selectedMonth,
      selectedProperties: Array.from(selectedProperties),
      activeTab
    });
    loadFinancialData();
  }, [selectedMonth, selectedProperties, activeTab]);

  // Load available properties
  useEffect(() => {
    loadAvailableProperties();
  }, []);

  const loadAvailableProperties = async () => {
    try {
      debugLog('🏠 Loading available properties...');
      const { data: entries, error } = await supabaseQueries.getJournalEntries();
      
      if (error) {
        debugLog('❌ Error loading properties:', error);
        return;
      }

      // Extract unique properties and deduplicate
      const properties = Array.from(new Set(
        entries?.map((entry: FinancialEntry) => entry.property_class).filter(Boolean) || []
      ));
      
      debugLog('🏠 Raw properties from database:', properties);
      
      // Remove duplicates and sort
      const uniqueProperties = Array.from(new Set(properties)).sort();
      const propertiesWithAll = ['All Properties', ...uniqueProperties];
      
      debugLog('🏠 Processed unique properties:', propertiesWithAll);
      setAvailableProperties(propertiesWithAll);
      
    } catch (error) {
      debugLog('❌ Exception loading properties:', error);
    }
  };

  const loadFinancialData = async () => {
    setIsLoading(true);
    try {
      debugLog('📊 Starting financial data load...', {
        selectedMonth,
        selectedProperties: Array.from(selectedProperties),
        activeTab
      });

      // Test connection first
      const connectionTest = await testSupabaseConnection();
      debugLog('🔌 Supabase connection test:', connectionTest);

      // Parse selected month
      const [monthName, yearStr] = selectedMonth.split(' ');
      const year = parseInt(yearStr);
      const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth();
      
      debugLog('📅 Date parsing:', { monthName, year, monthIndex });

      // Create date range for the selected month
      const startDate = new Date(year, monthIndex, 1);
      const endDate = new Date(year, monthIndex + 1, 0); // Last day of month
      
      debugLog('📅 Date range:', { 
        startDate: startDate.toISOString(), 
        endDate: endDate.toISOString() 
      });

      // Get journal entries
      const { data: entries, error } = await supabaseQueries.getJournalEntries();
      
      if (error) {
        debugLog('❌ Error fetching journal entries:', error);
        throw error;
      }

      debugLog('📊 Raw journal entries count:', entries?.length || 0);

      if (!entries || entries.length === 0) {
        debugLog('⚠️ No journal entries found');
        setFinancialData([]);
        return;
      }

      // Filter by date range
      const dateFilteredEntries = entries.filter((entry: FinancialEntry) => {
        const entryDate = new Date(entry.transaction_date);
        const isInRange = entryDate >= startDate && entryDate <= endDate;
        
        if (!isInRange) {
          debugLog('📅 Date filter debug:', {
            entryDate: entryDate.toISOString(),
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            isInRange,
            entry: entry.transaction_date
          });
        }
        
        return isInRange;
      });

      debugLog('📅 Date filtered entries:', dateFilteredEntries.length);

      // Property filtering with detailed debugging
      let propertyFilteredEntries = dateFilteredEntries;
      const selectedPropsArray = Array.from(selectedProperties);
      
      debugLog('🏠 Property filtering:', {
        selectedProperties: selectedPropsArray,
        isAllProperties: selectedProperties.has('All Properties'),
        selectedSize: selectedProperties.size
      });

      if (!selectedProperties.has('All Properties') && selectedProperties.size > 0) {
        debugLog('🔍 Applying property filter...');
        
        propertyFilteredEntries = dateFilteredEntries.filter((entry: FinancialEntry) => {
          const matches = selectedProperties.has(entry.property_class);
          if (!matches) {
            debugLog('🏠 Property filter:', {
              entryProperty: entry.property_class,
              selectedProperties: selectedPropsArray,
              matches
            });
          }
          return matches;
        });
        
        debugLog('🏠 Property filtered entries:', propertyFilteredEntries.length);
      }

      // Log property distribution in results
      const propertyDistribution = propertyFilteredEntries.reduce((acc: any, entry: FinancialEntry) => {
        acc[entry.property_class] = (acc[entry.property_class] || 0) + 1;
        return acc;
      }, {});
      
      debugLog('📊 Property distribution in results:', propertyDistribution);

      // Process P&L data
      if (activeTab === 'p&l') {
        const plData = processPLData(propertyFilteredEntries);
        debugLog('📊 Processed P&L data:', plData);
        setFinancialData(plData);
      }
      
    } catch (error) {
      debugLog('❌ Error in loadFinancialData:', error);
      showNotification('Error loading financial data', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const processPLData = (entries: FinancialEntry[]): FinancialDataItem[] => {
    debugLog('🧮 Processing P&L data with entries:', entries.length);
    
    const accountGroups: { [key: string]: FinancialEntry[] } = {};
    
    // Group entries by account name
    entries.forEach(entry => {
      if (!accountGroups[entry.account_name]) {
        accountGroups[entry.account_name] = [];
      }
      accountGroups[entry.account_name].push(entry);
    });

    debugLog('📊 Account groups:', Object.keys(accountGroups));

    const result: FinancialDataItem[] = [];

    // Process each account group
    Object.entries(accountGroups).forEach(([accountName, accountEntries]) => {
      const firstEntry = accountEntries[0];
      const accountType = firstEntry.account_type;
      
      // Calculate totals for accounting signs
      const totalDebits = accountEntries.reduce((sum, entry) => sum + entry.debit_amount, 0);
      const totalCredits = accountEntries.reduce((sum, entry) => sum + entry.credit_amount, 0);
      
      let accountTotal = 0;
      let isAbnormal = false;
      
      // Apply proper accounting signs
      if (accountType === 'Income') {
        // Revenue accounts: Credits - Debits (normal credit balance)
        accountTotal = totalCredits - totalDebits;
        isAbnormal = accountTotal < 0; // Abnormal if debit balance
      } else if (accountType === 'Expense') {
        // Expense accounts: Debits - Credits (normal debit balance)  
        accountTotal = totalDebits - totalCredits;
        isAbnormal = accountTotal < 0; // Abnormal if credit balance
      } else {
        // For other account types, use the line_amount sum
        accountTotal = accountEntries.reduce((sum, entry) => sum + entry.line_amount, 0);
      }

      debugLog(`💰 Account "${accountName}" (${accountType}):`, {
        totalDebits,
        totalCredits,
        accountTotal,
        isAbnormal,
        entryCount: accountEntries.length
      });

      result.push({
        name: `${accountName}${isAbnormal ? ' ⚠️' : ''}`,
        total: accountTotal,
        months: { [`${selectedMonth}` as MonthString]: accountTotal },
        type: accountType,
        detail_type: firstEntry.detail_type,
        entries: accountEntries,
        mapping_method: firstEntry.mapping_method || 'automatic'
      });
    });

    // Sort by account type and total
    result.sort((a, b) => {
      const typeOrder = { 'Income': 1, 'Expense': 2 };
      const aOrder = typeOrder[a.type as keyof typeof typeOrder] || 3;
      const bOrder = typeOrder[b.type as keyof typeof typeOrder] || 3;
      
      if (aOrder !== bOrder) return aOrder - bOrder;
      return Math.abs(b.total) - Math.abs(a.total);
    });

    return result;
  };

  const toggleProperty = (property: string) => {
    debugLog('🏠 Property toggle debugging:', { 
      property, 
      currentSelected: Array.from(selectedProperties),
      isCurrentlySelected: selectedProperties.has(property)
    });
    
    const newSelected = new Set(selectedProperties);
    
    if (property === 'All Properties') {
      debugLog('🏠 Toggling "All Properties"');
      if (selectedProperties.has('All Properties')) {
        newSelected.clear();
      } else {
        newSelected.clear();
        newSelected.add('All Properties');
      }
    } else {
      debugLog('🏠 Toggling specific property:', property);
      newSelected.delete('All Properties');
      
      if (selectedProperties.has(property)) {
        newSelected.delete(property);
        if (newSelected.size === 0) {
          newSelected.add('All Properties');
        }
      } else {
        newSelected.add(property);
      }
    }
    
    debugLog('🏠 New selection after toggle:', Array.from(newSelected));
    setSelectedProperties(newSelected);
  };

  const showNotification = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'info' }), 3000);
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const calculateKPI = (type: 'revenue' | 'expenses' | 'profit'): number => {
    if (!financialData || financialData.length === 0) return 0;
    
    let value = 0;
    
    if (type === 'revenue') {
      value = financialData
        .filter(item => item.type === 'Income')
        .reduce((sum, item) => sum + item.total, 0);
    } else if (type === 'expenses') {
      value = financialData
        .filter(item => item.type === 'Expense')
        .reduce((sum, item) => sum + item.total, 0);
    } else if (type === 'profit') {
      const revenue = financialData
        .filter(item => item.type === 'Income')
        .reduce((sum, item) => sum + item.total, 0);
      const expenses = financialData
        .filter(item => item.type === 'Expense')
        .reduce((sum, item) => sum + item.total, 0);
      value = revenue - expenses;
    }
    
    debugLog(`📊 KPI ${type}:`, value);
    return value;
  };

  const exportData = () => {
    const csvContent = [
      ['Account Name', 'Type', 'Amount'],
      ...financialData.map(item => [
        item.name,
        item.type || '',
        item.total.toString()
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financials-${selectedMonth.replace(' ', '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleItemExpansion = (itemName: string) => {
    const newExpanded = new Set(expandedItems);
    if (expandedItems.has(itemName)) {
      newExpanded.delete(itemName);
    } else {
      newExpanded.add(itemName);
    }
    setExpandedItems(newExpanded);
  };

  // Calculate totals for display
  const revenue = calculateKPI('revenue');
  const expenses = calculateKPI('expenses');
  const profit = calculateKPI('profit');

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Financial Dashboard</h1>
        <p className="text-gray-600">Comprehensive financial analysis and reporting</p>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'p&l', name: 'Profit & Loss', icon: TrendingUp },
              { id: 'cash-flow', name: 'Cash Flow', icon: BarChart3 },
              { id: 'balance-sheet', name: 'Balance Sheet', icon: PieChart }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as FinancialTab)}
                  className={`group inline-flex items-center px-1 py-4 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="mr-2 h-5 w-5" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Controls */}
      <div className="mb-6 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Month Selector */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {['January 2025', 'February 2025', 'March 2025', 'April 2025', 'May 2025', 'June 2025', 
              'July 2025', 'August 2025', 'September 2025', 'October 2025', 'November 2025', 'December 2025'].map((month) => (
              <option key={month} value={month}>{month}</option>
            ))}
          </select>

          {/* Property Selector */}
          <div className="relative">
            <button
              onClick={() => setShowPropertyDropdown(!showPropertyDropdown)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px] text-left flex items-center justify-between"
            >
              <span>
                {selectedProperties.size === 1 && selectedProperties.has('All Properties')
                  ? 'All Properties'
                  : selectedProperties.size === 1
                  ? Array.from(selectedProperties)[0]
                  : `${selectedProperties.size} Properties Selected`}
              </span>
              <ChevronDown className="h-4 w-4" />
            </button>
            
            {showPropertyDropdown && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                {availableProperties.map((property) => (
                  <label
                    key={property}
                    className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedProperties.has(property)}
                      onChange={() => toggleProperty(property)}
                      className="mr-2"
                    />
                    <span className="text-sm">{property}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Time View Selector */}
          <select
            value={timeView}
            onChange={(e) => setTimeView(e.target.value as TimeView)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="Monthly">Monthly</option>
            <option value="YTD">Year to Date</option>
            <option value="TTM">Trailing 12 Months</option>
            <option value="MoM">Month over Month</option>
            <option value="YoY">Year over Year</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex border border-gray-300 rounded-md">
            <button
              onClick={() => setViewMode('total')}
              className={`px-3 py-2 text-sm ${
                viewMode === 'total'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Total
            </button>
            <button
              onClick={() => setViewMode('detailed')}
              className={`px-3 py-2 text-sm ${
                viewMode === 'detailed'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              Detailed
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => loadFinancialData()}
            disabled={isLoading}
            className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={exportData}
            className="flex items-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
          >
            <Download className="mr-2 h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Revenue Card */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
              <p className={`text-2xl font-bold ${revenue < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(revenue)}
              </p>
            </div>
            <div className={`p-3 rounded-full ${revenue < 0 ? 'bg-red-100' : 'bg-green-100'}`}>
              <TrendingUp className={`h-6 w-6 ${revenue < 0 ? 'text-red-600' : 'text-green-600'}`} />
            </div>
          </div>
        </div>

        {/* Expenses Card */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Expenses</p>
              <p className={`text-2xl font-bold ${expenses < 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(expenses)}
              </p>
            </div>
            <div className={`p-3 rounded-full ${expenses < 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              <DollarSign className={`h-6 w-6 ${expenses < 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
          </div>
        </div>

        {/* Net Profit Card */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Net Profit</p>
              <p className={`text-2xl font-bold ${profit < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(profit)}
              </p>
            </div>
            <div className={`p-3 rounded-full ${profit < 0 ? 'bg-red-100' : 'bg-green-100'}`}>
              <BarChart3 className={`h-6 w-6 ${profit < 0 ? 'text-red-600' : 'text-green-600'}`} />
            </div>
          </div>
        </div>
      </div>

      {/* Financial Data Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            {activeTab === 'p&l' ? 'Profit & Loss Statement' : 
             activeTab === 'cash-flow' ? 'Cash Flow Statement' : 
             'Balance Sheet'}
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
              <span className="ml-2 text-gray-600">Loading financial data...</span>
            </div>
          ) : financialData.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No financial data available for the selected period.</p>
            </div>
          ) : (
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{selectedMonth}</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">% of Revenue</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {financialData.map((item, index) => {
                  const isExpanded = expandedItems.has(item.name);
                  const percentOfRevenue = revenue !== 0 ? (item.total / revenue) * 100 : 0;
                  
                  return (
                    <React.Fragment key={index}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {viewMode === 'detailed' && item.entries && item.entries.length > 1 && (
                              <button
                                onClick={() => toggleItemExpansion(item.name)}
                                className="mr-2 p-1 hover:bg-gray-200 rounded"
                              >
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </button>
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900">{item.name}</div>
                              <div className="text-sm text-gray-500">{item.type}</div>
                            </div>
                          </div>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-right text-sm font-medium ${
                          item.total < 0 ? 'text-red-600' : 'text-gray-900'
                        }`}>
                          {formatCurrency(item.total)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                          {percentOfRevenue.toFixed(1)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            {item.mapping_method || 'auto'}
                          </span>
                        </td>
                      </tr>
                      
                      {/* Expanded entries */}
                      {isExpanded && item.entries && (
                        item.entries.map((entry: FinancialEntry, entryIndex: number) => (
                          <tr key={`${index}-${entryIndex}`} className="bg-gray-50">
                            <td className="px-12 py-2 text-sm text-gray-600">
                              {entry.description || entry.je_number}
                            </td>
                            <td className="px-6 py-2 text-right text-sm text-gray-600">
                              {formatCurrency(entry.line_amount)}
                            </td>
                            <td className="px-6 py-2 text-right text-sm text-gray-500">
                              {entry.property_class}
                            </td>
                            <td className="px-6 py-2 text-center text-sm text-gray-500">
                              {new Date(entry.transaction_date).toLocaleDateString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Notification */}
      {notification.show && (
        <div className={`fixed top-4 right-4 p-4 rounded-md shadow-lg z-50 ${
          notification.type === 'success' ? 'bg-green-100 text-green-800' :
          notification.type === 'error' ? 'bg-red-100 text-red-800' :
          'bg-blue-100 text-blue-800'
        }`}>
          {notification.message}
        </div>
      )}

      {/* Tooltip */}
      {tooltip.show && (
        <div
          className="fixed z-50 p-2 bg-gray-900 text-white text-sm rounded shadow-lg pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
};

export default FinancialsPage;
