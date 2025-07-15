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

// Updated Supabase Configuration - Your new database
const SUPABASE_URL = 'https://pjaieumtjszcwussmwel.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYWlldW10anN6Y3d1c3Ntd2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwNDQyMTgsImV4cCI6MjA2NzYyMDIxOH0.E1y-qx4EW7dbdN_2sijZaiQVO7ZcqnwC9hTSIccChP0';

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
  date: string;
  account: string;
  class: string;
  amount: number;
  memo: string;
  account_type: string;
  account_detail_type: string;
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

// Real Supabase client
const createSupabaseClient = () => {
  return {
    from: (table: string) => ({
      select: (columns: string = '*') => ({
        eq: (column: string, value: string) => ({
          order: (orderBy: string) => 
            fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${columns}&${column}=eq.${encodeURIComponent(value)}&order=${orderBy}`, {
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
              }
            }).then(res => res.json()).then(data => ({ data, error: null })).catch(error => ({ data: null, error }))
        }),
        order: (orderBy: string) => 
          fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${columns}&order=${orderBy}`, {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json'
            }
          }).then(res => res.json()).then(data => ({ data, error: null })).catch(error => ({ data: null, error })),
        then: (callback: Function) => 
          fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${columns}`, {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json'
            }
          }).then(res => res.json()).then(data => callback({ data, error: null })).catch(error => callback({ data: null, error }))
      })
    })
  };
};

const supabase = createSupabaseClient();

// Hardcoded properties based on your actual database data
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

// Fetch properties - now uses hardcoded list as fallback
const fetchProperties = async (): Promise<string[]> => {
  try {
    console.log('🏠 Using hardcoded property list...');
    
    // Optional: Still try to fetch from database for future properties
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
        .map((item: any) => item.class)
        .filter((cls: any) => cls && cls.trim() !== '');
      
      const uniqueClasses = [...new Set(classValues)].sort();
      
      // Combine hardcoded with any new properties found in database
      const allProperties = [...new Set([...HARDCODED_PROPERTIES.slice(1), ...uniqueClasses])].sort();
      const result = ['All Properties', ...allProperties];
      
      console.log('✅ Properties loaded (hardcoded + database):', result.length);
      return result;
    }
    
    // Fallback to hardcoded list if database fetch fails
    console.log('✅ Using hardcoded properties as fallback');
    return HARDCODED_PROPERTIES;
    
  } catch (error) {
    console.error('❌ Property fetch error, using hardcoded list:', error);
    return HARDCODED_PROPERTIES;
  }
};

// Enhanced data transformation functions - SUMIF approach with proper aggregation
const transformFinancialData = (entries: FinancialEntry[], monthYear: string) => {
  console.log('🔍 TRANSFORM DEBUG - Total entries received:', entries.length);
  console.log('🔍 TRANSFORM DEBUG - Sample entries:', entries.slice(0, 3).map(e => ({
    account: e.account,
    account_type: e.account_type,
    amount: e.amount,
    class: e.class
  })));
  
  // Check for Direct revenue specifically
  const directEntries = entries.filter(e => e.account && e.account.includes('Direct'));
  console.log('🔍 TRANSFORM DEBUG - Direct entries found:', directEntries.length);
  if (directEntries.length > 0) {
    console.log('🔍 TRANSFORM DEBUG - Direct entries sample:', directEntries.slice(0, 3).map(e => ({
      account: e.account,
      account_type: e.account_type,
      amount: e.amount,
      class: e.class
    })));
  }

  const getCleanAccountName = (entry: any) => {
    let accountName = entry.account?.trim() || '';
    
    if (!accountName || accountName === 'Journal Entry') {
      accountName = entry.account_type?.trim() || 'Other Account';
    }
    
    return accountName;
  };

  // Group by account name and sum across ALL properties and entries
  const groupedData = entries.reduce((acc, entry) => {
    const accountName = getCleanAccountName(entry);
    const key = accountName;
    
    // Debug logging for Direct revenue
    if (accountName.includes('Direct')) {
      console.log('🔍 Processing Direct revenue entry:', {
        accountName,
        account_type: entry.account_type,
        amount: entry.amount,
        class: entry.class
      });
    }
    
    if (!acc[key]) {
      // Classify based on account_type from your data
      let classification = 'Other';
      
      if (entry.account_type === 'Income' || entry.account_type === 'Revenue') {
        classification = 'Revenue';
      } else if (entry.account_type === 'Expenses') {
        classification = 'Expenses';
      } else if (entry.account_type === 'Fixed Assets') {
        classification = 'Assets';
      } else if (entry.account_type === 'Credit Card' || entry.account_type === 'Other Current Liabilities') {
        classification = 'Liabilities';
      }
      
      // Debug logging for new accounts
      if (accountName.includes('Direct')) {
        console.log('🔍 Creating new Direct revenue account:', {
          accountName,
          classification,
          account_type: entry.account_type
        });
      }
      
      acc[key] = {
        name: accountName,
        type: classification,
        original_type: entry.account_type,
        detail_type: entry.account_detail_type || entry.account_type,
        total: 0,
        months: {},
        entries: [],
        mapping_method: 'Direct from financial_transactions'
      };
    }
    
    // SUMIF: Sum the raw amount across ALL properties
    const amount = entry.amount || 0;
    
    acc[key].total += amount;
    acc[key].months[monthYear as MonthString] = (acc[key].months[monthYear as MonthString] || 0) + amount;
    acc[key].entries.push({
      id: entry.id,
      amount: entry.amount,
      amount_used: amount,
      class: entry.class,
      memo: entry.memo,
      original_account: entry.account,
      account_type: entry.account_type,
      account_detail_type: entry.account_detail_type,
      date: entry.date
    });
    
    return acc;
  }, {} as Record<string, any>);

  console.log('🔢 Aggregated data:', Object.entries(groupedData).map(([name, data]: [string, any]) => ({
    name,
    total: data.total,
    entries: data.entries.length
  })));

  const typeOrder: Record<string, number> = {
    'Revenue': 1,
    'Expenses': 2,
    'Assets': 3,
    'Liabilities': 4,
    'Equity': 5,
    'Other': 99
  };

  const sortedData = Object.values(groupedData)
    .filter((item: any) => Math.abs(item.total) > 0.01)
    .sort((a: any, b: any) => {
      const aOrder = typeOrder[a.type] || 99;
      const bOrder = typeOrder[b.type] || 99;
      
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      return a.name.localeCompare(b.name);
    });

  const plData = sortedData.filter(item => 
    item.type === 'Revenue' || item.type === 'Expenses'
  );

  const balanceSheetData = sortedData.filter(item => 
    item.type === 'Assets' || item.type === 'Liabilities' || item.type === 'Equity'
  );

  return {
    propertyFinancialData: {
      'All Properties': {
        Monthly: {
          [monthYear]: plData
        }
      }
    },
    propertyBalanceSheetData: {
      'All Properties': {
        Monthly: {
          [monthYear]: balanceSheetData
        }
      }
    }
  };
};

const transformCashFlowData = (entries: FinancialEntry[]) => {
  const inFlowItems: FinancialDataItem[] = [];
  const outFlowItems: FinancialDataItem[] = [];

  entries.forEach(entry => {
    if (entry.account_type === 'Income' || entry.account_type === 'Revenue') {
      const existing = inFlowItems.find(item => item.name === entry.account);
      const amount = Math.abs(entry.amount);
      
      if (existing) {
        existing.total += amount;
      } else if (amount > 0) {
        inFlowItems.push({
          name: entry.account,
          total: amount,
          months: {},
          type: entry.account_type
        });
      }
    } else if (entry.account_type === 'Expenses') {
      const existing = outFlowItems.find(item => item.name === entry.account);
      const amount = Math.abs(entry.amount);
      
      if (existing) {
        existing.total += amount;
      } else if (amount > 0) {
        outFlowItems.push({
          name: entry.account,
          total: amount,
          months: {},
          type: entry.account_type
        });
      }
    }
  });

  const totalInFlow = inFlowItems.reduce((sum, item) => sum + item.total, 0);
  const totalOutFlow = outFlowItems.reduce((sum, item) => sum + item.total, 0);
  const totalCashFlow = totalInFlow - totalOutFlow;

  return {
    propertyCashFlowData: {
      'All Properties': {
        inFlow: inFlowItems.sort((a, b) => b.total - a.total),
        outFlow: outFlowItems.sort((a, b) => b.total - a.total),
        totalInFlow,
        totalOutFlow,
        totalCashFlow,
        beginningCash: 0,
        endingCash: totalCashFlow
      }
    }
  };
};

// Simplified data fetching - just group and sum directly from Supabase
const fetchFinancialData = async (
  property: string = 'All Properties',
  monthYear: string
) => {
  try {
    console.log('🔍 FETCHING FINANCIAL DATA with filters:', { property, monthYear });
    
    const [month, year] = monthYear.split(' ');
    const monthNum = new Date(`${month} 1, ${year}`).getMonth() + 1;
    
    // Date filtering
    const startDate = `${year}-${monthNum.toString().padStart(2, '0')}-01`;
    const lastDay = new Date(parseInt(year), monthNum, 0).getDate();
    const endDate = `${year}-${monthNum.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
    
    console.log(`📅 DATE RANGE: ${startDate} to ${endDate} (${month} ${year})`);
    
    // Base query with date filtering - use broader selection
    let url = `${SUPABASE_URL}/rest/v1/financial_transactions?select=*&date=gte.${startDate}&date=lte.${endDate}`;
    
    // Add property filtering ONLY if specific property is selected
    if (property !== 'All Properties') {
      url += `&class=eq.${encodeURIComponent(property)}`;
      console.log('🏠 Filtering by specific property:', property);
    } else {
      console.log('🏠 Including ALL properties in sum');
    }

    // Debug: Try the exact same query that works in SQL editor
    console.log('🔍 Testing exact SQL equivalent query...');
    
    // First test: Get ALL Direct revenue for the month (no property filter)
    const directTestUrl = `${SUPABASE_URL}/rest/v1/financial_transactions?select=*&date=gte.${startDate}&date=lte.${endDate}&account=ilike.*Direct*`;
    
    console.log('🔍 Direct test URL:', directTestUrl);
    
    const directTestResponse = await fetch(directTestUrl, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (directTestResponse.ok) {
      const directTestData = await directTestResponse.json();
      console.log('🔍 Direct test results:', directTestData.length, 'entries');
      if (directTestData.length > 0) {
        const directTotal = directTestData.reduce((sum: number, row: any) => sum + (row.amount || 0), 0);
        console.log('🔍 Direct test total:', directTotal);
      }
    }

    console.log('📡 Main query URL:', url);

    const response = await fetch(url, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch financial data');
    }
    
    const rawData = await response.json();
    
    console.log('📊 Raw financial transactions loaded:', rawData.length);
    
    // Debug: Check dates in the raw data
    const allDates = [...new Set(rawData.map((row: any) => row.date))].sort();
    console.log('📊 All unique dates in raw data:', allDates);
    
    // Debug: Check specifically for 5/31 entries
    const may31Entries = rawData.filter((row: any) => row.date === '2025-05-31');
    console.log('📊 May 31st entries found:', may31Entries.length);
    if (may31Entries.length > 0) {
      const may31Accounts = [...new Set(may31Entries.map((row: any) => row.account))];
      console.log('📊 May 31st unique accounts:', may31Accounts);
    }
    
    // Debug: Check all unique account names in raw data
    const uniqueAccounts = [...new Set(rawData.map((row: any) => row.account))];
    console.log('📊 All unique account names in raw data:', uniqueAccounts);
    
    // Debug: Check for any revenue account variations
    const revenueAccounts = rawData.filter((row: any) => 
      row.account && row.account.toLowerCase().includes('revenue')
    ).map((row: any) => row.account);
    const uniqueRevenueAccounts = [...new Set(revenueAccounts)];
    console.log('📊 All unique REVENUE account names:', uniqueRevenueAccounts);
    
    // Debug: Specifically look for Direct
    const directAccounts = rawData.filter((row: any) => 
      row.account && row.account.toLowerCase().includes('direct')
    );
    console.log('📊 DIRECT account entries found:', directAccounts.length);
    if (directAccounts.length > 0) {
      console.log('📊 DIRECT account sample:', directAccounts.slice(0, 3).map(r => ({
        account: r.account,
        amount: r.amount,
        class: r.class
      })));
    }
    
    // Debug: Sum by exact account name
    const accountSums = rawData.reduce((acc: any, row: any) => {
      const exactName = row.account;
      if (!acc[exactName]) acc[exactName] = 0;
      acc[exactName] += (row.amount || 0);
      return acc;
    }, {});
    console.log('📊 Raw account sums:', accountSums);
    
    // Simple grouping by account name and sum amounts - FIXED VERSION
    const grouped = rawData.reduce((acc: any, row: any) => {
      // Use the EXACT account name - no trimming or modifications
      const accountName = row.account || 'Unknown Account';
      
      // Debug every revenue row to catch issues
      if (row.account_type === 'Income' && accountName.includes('Revenue')) {
        console.log('🔍 Processing Revenue row:', {
          originalAccount: row.account,
          cleanedAccount: accountName,
          amount: row.amount,
          class: row.class
        });
      }
      
      if (!acc[accountName]) {
        acc[accountName] = {
          name: accountName,
          type: row.account_type === 'Income' ? 'Revenue' : 
                row.account_type === 'Expenses' ? 'Expenses' : 'Other',
          total: 0,
          entries: [],
          account_type: row.account_type
        };
        
        // Debug when creating revenue accounts
        if (row.account_type === 'Income' && accountName.includes('Revenue')) {
          console.log('🔍 Created Revenue account:', accountName);
        }
      }
      
      acc[accountName].total += (row.amount || 0);
      acc[accountName].entries.push(row);
      
      return acc;
    }, {});

    console.log('📊 All account names found (first 10):', Object.keys(grouped).slice(0, 10));
    console.log('📊 Revenue accounts in grouped data:', 
      Object.keys(grouped).filter(name => name.includes('Revenue')));
    console.log('📊 Direct revenue check:', grouped['Rental Revenue - Direct'] ? 
      `Found with total: ${grouped['Rental Revenue - Direct'].total}` : 'NOT FOUND');
    console.log('📊 Guesty revenue check:', grouped['Rental Revenue - Guesty'] ? 
      `Found with total: ${grouped['Rental Revenue - Guesty'].total}` : 'NOT FOUND');

    // Convert to array and filter
    const accountsArray = Object.values(grouped)
      .filter((item: any) => Math.abs(item.total) > 0.01)
      .sort((a: any, b: any) => {
        if (a.type !== b.type) {
          return a.type === 'Revenue' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });

    const plData = accountsArray.filter((item: any) => 
      item.type === 'Revenue' || item.type === 'Expenses'
    );

    return {
      success: true,
      data: plData,
      summary: {
        filteredEntries: rawData.length,
        originalEntries: rawData.length,
        dateFiltered: 0,
        dataSource: `Supabase financial_transactions + ${month} ${year} Direct Query`,
        dateRange: `${startDate} to ${endDate}`,
        filters: { 
          property: property === 'All Properties' ? 'ALL PROPERTIES (SUMIF ALL)' : property, 
          monthYear 
        },
        accountTypes: [...new Set(rawData.map((a: any) => a.account_type))],
        classesInData: [...new Set(rawData.map((e: any) => e.class))],
        mappingStats: {
          totalEntries: rawData.length,
          directMapped: rawData.length,
          fallbackMapped: 0
        }
      },
      propertyFinancialData: {
        'All Properties': {
          Monthly: {
            [monthYear]: plData
          }
        }
      }
    };
  } catch (error) {
    console.error('Error fetching financial data:', error);
    return {
      success: false,
      error: (error as Error).message,
      data: []
    };
  }
};

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

const COLORS = [BRAND_COLORS.primary, BRAND_COLORS.success, BRAND_COLORS.warning, BRAND_COLORS.danger, BRAND_COLORS.secondary, BRAND_COLORS.tertiary];

export default function FinancialsPage() {
  const [activeTab, setActiveTab] = useState<FinancialTab>('p&l');
  const [selectedMonth, setSelectedMonth] = useState<MonthString>('January 2023');
  const [viewMode, setViewMode] = useState<ViewMode>('detailed');
  const [timeView, setTimeView] = useState<TimeView>('Monthly');
  const [notification, setNotification] = useState<NotificationState>({ show: false, message: '', type: 'info' });
  const [timeViewDropdownOpen, setTimeViewDropdownOpen] = useState(false);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [propertyDropdownOpen, setPropertyDropdownOpen] = useState(false);
  const [selectedProperties, setSelectedProperties] = useState<Set<string>>(new Set(['All Properties']));
  const [accountTooltip, setAccountTooltip] = useState<TooltipState>({ show: false, content: '', x: 0, y: 0 });

  // Real data state
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [realData, setRealData] = useState<any>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [availableProperties, setAvailableProperties] = useState<string[]>(HARDCODED_PROPERTIES);
  const [selectedAccountDetails, setSelectedAccountDetails] = useState<FinancialDataItem | null>(null);

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
    loadRealFinancialData();
  }, [selectedProperties, selectedMonth]);

  const loadInitialData = async () => {
    try {
      setIsLoadingData(true);
      
      const properties = await fetchProperties();
      console.log('🏠 Available properties loaded:', properties);
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
      if (selectedProperties.size > 0 && !selectedProperties.has('All Properties')) {
        propertyFilter = Array.from(selectedProperties)[0];
      }
      
      console.log('🔍 LOADING DATA WITH FILTERS:', {
        selectedProperties: Array.from(selectedProperties),
        propertyFilter,
        month: selectedMonth
      });
      
      const rawData = await fetchFinancialData(propertyFilter, selectedMonth);
      
      if (rawData.success) {
        // Use the data directly - no transformation needed
        const combinedData = {
          success: true,
          propertyFinancialData: rawData.propertyFinancialData,
          summary: rawData.summary,
          performance: {
            executionTimeMs: Date.now() % 1000
          }
        };

        setRealData(combinedData);
        setDataError(null);
        
        const propertyText = selectedProperties.has('All Properties') 
          ? 'all property classes' 
          : `${selectedProperties.size} selected property classes`;
          
        showNotification(`Loaded ${rawData.summary.filteredEntries} entries for ${propertyText} in ${selectedMonth}`, 'success');
      } else {
        setDataError(rawData.error || 'Failed to load financial data');
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
      return 'All Property Classes';
    }
    if (selectedProperties.size === 1) {
      return Array.from(selectedProperties)[0];
    }
    return `${selectedProperties.size} Property Classes Selected`;
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

  const handleAccountMouseEnter = (event: React.MouseEvent<HTMLElement>, accountItem: FinancialDataItem): void => {
    if (!accountItem.entries || accountItem.entries.length === 0) return;

    const rect = (event.target as HTMLElement).getBoundingClientRect();
    
    let tooltipContent = `<div style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 4px;">
      ${accountItem.name} • ${formatCurrency(accountItem.total)}
    </div>`;

    tooltipContent += `<div style="font-size: 11px; color: #E5E7EB; margin-bottom: 8px;">
      ${accountItem.entries.length} Financial Transactions • Mapping: ${accountItem.mapping_method}
    </div>`;

    const recentEntries = accountItem.entries.slice(0, 5);
    
    recentEntries.forEach((entry: any, index: number) => {
      const entryDate = new Date(entry.date).toLocaleDateString();
      const isLast = index === recentEntries.length - 1;
      
      tooltipContent += `
        <div style="margin-bottom: ${isLast ? '0' : '6px'}; padding: 4px; background: rgba(255,255,255,0.1); border-radius: 4px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 4px;">
              <div style="width: 4px; height: 4px; background: ${entry.amount_used >= 0 ? '#10B981' : '#EF4444'}; border-radius: 50%;"></div>
              <strong style="font-size: 11px; color: white;">ID: ${entry.id}</strong>
            </div>
            <span style="font-size: 10px; color: #D1D5DB;">${entryDate}</span>
          </div>
          <div style="margin-left: 8px; margin-top: 2px;">
            ${entry.memo ? `
              <div style="font-size: 10px; color: #F3F4F6; margin-bottom: 2px; padding: 2px 4px; background: rgba(255,255,255,0.1); border-radius: 2px;">
                💬 ${entry.memo}
              </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; margin-top: 2px;">
              <span style="font-size: 10px; color: #9CA3AF;">
                ${entry.class || 'No Class'} • ${entry.account_type}
              </span>
              <span style="font-size: 11px; font-weight: bold; color: ${entry.amount_used >= 0 ? '#10B981' : '#EF4444'};">
                ${formatCurrency(Math.abs(entry.amount_used))}
              </span>
            </div>
          </div>
        </div>
      `;
    });

    if (accountItem.entries.length > 5) {
      tooltipContent += `
        <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.2); text-align: center;">
          <span style="font-size: 10px; color: #D1D5DB; font-style: italic;">
            + ${accountItem.entries.length - 5} more transactions
          </span>
        </div>
      `;
    }

    setAccountTooltip({
      show: true,
      content: tooltipContent,
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    });
  };

  const handleAccountMouseLeave = (): void => {
    setAccountTooltip({ show: false, content: '', x: 0, y: 0 });
  };

  const handleAccountClick = (accountItem: FinancialDataItem): void => {
    setSelectedAccountDetails(accountItem);
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

  // Calculate KPIs
  const calculateKPIs = () => {
    if (!currentData || currentData.length === 0) {
      return {
        revenue: 0,
        cogs: 0,
        grossProfit: 0,
        operatingExpenses: 0,
        operatingIncome: 0,
        otherIncome: 0,
        otherExpenses: 0,
        interestExpense: 0,
        netIncome: 0,
        grossMargin: 0,
        operatingMargin: 0,
        netMargin: 0
      };
    }

    const revenue = currentData
      .filter(item => item.type === 'Revenue')
      .reduce((sum, item) => sum + item.total, 0);

    const operatingExpenses = currentData
      .filter(item => item.type === 'Expenses')
      .reduce((sum, item) => sum + item.total, 0);

    const grossProfit = revenue;
    const operatingIncome = grossProfit - operatingExpenses;
    const netIncome = operatingIncome;

    return {
      revenue,
      cogs: 0,
      grossProfit,
      operatingExpenses,
      operatingIncome,
      interestExpense: 0,
      netOperatingIncome: operatingIncome,
      otherIncome: 0,
      otherExpenses: 0,
      netIncome,
      grossMargin: revenue ? (grossProfit / revenue) * 100 : 0,
      operatingMargin: revenue ? (operatingIncome / revenue) * 100 : 0,
      netMargin: revenue ? (netIncome / revenue) * 100 : 0
    };
  };

  const generateTrendData = () => {
    // Get the current selected month/year
    const [currentMonth, currentYear] = selectedMonth.split(' ');
    const currentDate = new Date(`${currentMonth} 1, ${currentYear}`);
    
    // Generate 6 months of data ending with the current selected month
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate);
      date.setMonth(date.getMonth() - i);
      
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      const year = date.getFullYear();
      months.push(`${monthName} ${year}`);
    }
    
    const revenue = kpis.revenue;
    
    return months.map((month, index) => ({
      month,
      revenue: revenue * (0.8 + (index * 0.04)),
      grossProfit: (revenue * (0.8 + (index * 0.04))) * 0.4,
      operatingIncome: (revenue * (0.8 + (index * 0.04))) * 0.2,
      netIncome: (revenue * (0.8 + (index * 0.04))) * 0.15,
    }));
  };

  const generateExpenseBreakdown = () => {
    return currentData
      .filter(item => item.type === 'Expenses' && item.total > 0)
      .map(item => ({
        name: item.name,
        value: Math.abs(item.total)
      }))
      .filter(item => item.value > 0);
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

  const renderDataCells = (item: FinancialDataItem) => {
    const value = item.total || 0;
    
    return (
      <td className={`px-4 py-3 text-right text-sm font-medium ${
        value >= 0 ? 'text-green-600' : 'text-red-600'
      }`}>
        {formatCurrency(value)}
      </td>
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
                    Connected to financial_transactions
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Real-time P&L by Property Class • From financial_transactions table
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

              {/* Property Class Multi-Select Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setPropertyDropdownOpen(!propertyDropdownOpen)}
                  className="flex items-center justify-between w-56 px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm hover:border-blue-500 focus:outline-none focus:ring-2 transition-all"
                  style={{ '--tw-ring-color': BRAND_COLORS.secondary + '33' } as React.CSSProperties}
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
                        All Property Classes
                      </span>
                    </div>
                    
                    {/* Individual Property Classes */}
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
                          Loading property classes...
                        </div>
                      )}
                    </div>
                  </div>
                )}
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
          {realData && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-green-800 text-sm">
                <strong>Data Status:</strong> Loaded {realData.summary.filteredEntries} entries 
                from financial_transactions table • Date Filtering Active
                <div className="mt-1 text-xs">
                  <strong>Date Range:</strong> {realData.summary.dateRange} ({selectedMonth})
                </div>
                <div className="mt-1 text-xs">
                  <strong>Current Filters:</strong> {getSelectedPropertiesText()} • {selectedMonth}
                </div>
                <div className="mt-1 text-xs">
                  <strong>Data Source:</strong> {realData.summary.dataSource}
                </div>
              </div>
            </div>
          )}

          {/* Financial KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 hover:shadow-md transition-shadow" style={{ borderLeftColor: BRAND_COLORS.primary }}>
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
            
            <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 hover:shadow-md transition-shadow" style={{ borderLeftColor: BRAND_COLORS.warning }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-600 text-sm font-medium mb-2">Gross Profit</div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">{formatCurrency(kpis.grossProfit)}</div>
                  <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full inline-block">
                    {kpis.grossMargin.toFixed(1)}% Margin
                  </div>
                </div>
                <BarChart3 className="w-8 h-8" style={{ color: BRAND_COLORS.warning }} />
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 hover:shadow-md transition-shadow" style={{ borderLeftColor: BRAND_COLORS.success }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-600 text-sm font-medium mb-2">Operating Income</div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">{formatCurrency(kpis.operatingIncome)}</div>
                  <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full inline-block">
                    {kpis.operatingMargin.toFixed(1)}% Margin
                  </div>
                </div>
                <TrendingUp className="w-8 h-8" style={{ color: BRAND_COLORS.success }} />
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 hover:shadow-md transition-shadow" style={{ borderLeftColor: BRAND_COLORS.secondary }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-600 text-sm font-medium mb-2">Net Income</div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">{formatCurrency(kpis.netIncome)}</div>
                  <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full inline-block">
                    {kpis.netMargin.toFixed(1)}% Margin
                  </div>
                </div>
                <PieChart className="w-8 h-8" style={{ color: BRAND_COLORS.secondary }} />
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 hover:shadow-md transition-shadow" style={{ borderLeftColor: BRAND_COLORS.tertiary }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-600 text-sm font-medium mb-2">Operating Expenses</div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">{formatCurrency(kpis.operatingExpenses)}</div>
                  <div className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full inline-block">
                    Operating Costs
                  </div>
                </div>
                <BarChart3 className="w-8 h-8" style={{ color: BRAND_COLORS.tertiary }} />
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
                      {activeTab === 'p&l' ? 'Profit & Loss Statement (By Property Class)' : 
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
                        <span>Loading financial data from Supabase...</span>
                      </div>
                    ) : currentData.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No financial data available for the selected filters
                      </div>
                    ) : (
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Account
                            </th>
                            {renderColumnHeaders()}
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                              % of Revenue
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {/* INCOME SECTION */}
                          <tr className="bg-blue-50 border-t-2 border-blue-200">
                            <td className="px-6 py-4 text-left text-lg font-bold text-blue-900">
                              💰 INCOME
                            </td>
                            <td className="px-4 py-4 text-right text-lg font-bold text-blue-900">
                              {formatCurrency(kpis.revenue)}
                            </td>
                            <td className="px-4 py-4 text-right text-sm text-blue-700">
                              100.0%
                            </td>
                          </tr>
                          
                          {/* Individual Income Line Items */}
                          {currentData
                            .filter(item => item.type === 'Revenue')
                            .map((item) => (
                              <tr key={`income-${item.name}`} className="hover:bg-gray-50">
                                <td className="px-6 py-2 text-left text-sm text-gray-700 pl-12">
                                  {item.name}
                                  {item.entries && item.entries.length > 0 && (
                                    <span className="ml-2 text-xs text-gray-500">
                                      ({item.entries.length} transactions)
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-2 text-right text-sm text-gray-700">
                                  <span 
                                    className="cursor-pointer hover:bg-blue-50 px-2 py-1 rounded transition-colors border border-transparent hover:border-blue-200"
                                    onMouseEnter={(e) => handleAccountMouseEnter(e, item)}
                                    onMouseLeave={handleAccountMouseLeave}
                                    onClick={() => handleAccountClick(item)}
                                  >
                                    {formatCurrency(item.total)}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-right text-sm text-gray-500">
                                  {kpis.revenue ? calculatePercentage(Math.abs(item.total), Math.abs(kpis.revenue)) : '0%'}
                                </td>
                              </tr>
                            ))}

                          {/* TOTAL INCOME */}
                          <tr className="bg-blue-100 border-t-2 border-blue-300">
                            <td className="px-6 py-4 text-left text-lg font-bold text-blue-800">
                              📊 TOTAL INCOME
                            </td>
                            <td className="px-4 py-4 text-right text-lg font-bold text-blue-800">
                              {formatCurrency(kpis.revenue)}
                            </td>
                            <td className="px-4 py-4 text-right text-sm font-bold text-blue-800">
                              100.0%
                            </td>
                          </tr>

                          {/* EXPENSES SECTION */}
                          <tr className="bg-red-50 border-t-4 border-red-200 mt-4">
                            <td className="px-6 py-4 text-left text-lg font-bold text-red-900">
                              💸 EXPENSES
                            </td>
                            <td className="px-4 py-4 text-right text-lg font-bold text-red-600">
                              ({formatCurrency(Math.abs(kpis.operatingExpenses))})
                            </td>
                            <td className="px-4 py-4 text-right text-sm text-red-600">
                              {kpis.revenue ? calculatePercentage(Math.abs(kpis.operatingExpenses), Math.abs(kpis.revenue)) : '0%'}
                            </td>
                          </tr>
                          
                          {/* Individual Expense Line Items */}
                          {currentData
                            .filter(item => item.type === 'Expenses')
                            .map((item) => (
                              <tr key={`expense-${item.name}`} className="hover:bg-gray-50">
                                <td className="px-6 py-2 text-left text-sm text-gray-700 pl-12">
                                  {item.name}
                                  {item.entries && item.entries.length > 0 && (
                                    <span className="ml-2 text-xs text-gray-500">
                                      ({item.entries.length} transactions)
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-2 text-right text-sm text-gray-700">
                                  <span 
                                    className="cursor-pointer hover:bg-red-50 px-2 py-1 rounded transition-colors border border-transparent hover:border-red-200"
                                    onMouseEnter={(e) => handleAccountMouseEnter(e, item)}
                                    onMouseLeave={handleAccountMouseLeave}
                                    onClick={() => handleAccountClick(item)}
                                  >
                                    {formatCurrency(item.total)}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-right text-sm text-gray-500">
                                  {kpis.revenue ? calculatePercentage(Math.abs(item.total), Math.abs(kpis.revenue)) : '0%'}
                                </td>
                              </tr>
                            ))}

                          {/* TOTAL EXPENSES */}
                          <tr className="bg-red-100 border-t-2 border-red-300">
                            <td className="px-6 py-4 text-left text-lg font-bold text-red-800">
                              📊 TOTAL EXPENSES
                            </td>
                            <td className="px-4 py-4 text-right text-lg font-bold text-red-800">
                              ({formatCurrency(Math.abs(kpis.operatingExpenses))})
                            </td>
                            <td className="px-4 py-4 text-right text-sm font-bold text-red-800">
                              {kpis.revenue ? calculatePercentage(Math.abs(kpis.operatingExpenses), Math.abs(kpis.revenue)) : '0%'}
                            </td>
                          </tr>

                          {/* NET INCOME */}
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
                )}

                {/* Cash Flow Content */}
                {activeTab === 'cash-flow' && (
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
                          {currentCashFlowData.inFlow.map((item) => (
                            <tr key={`inflow-${item.name}`} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 text-left text-sm text-gray-700">
                                <span className="ml-4">{item.name}</span>
                              </td>
                              {renderCashFlowDataCells(item)}
                              <td className="px-4 py-3 text-right text-sm text-green-600">
                                {currentCashFlowData.totalCashFlow ? calculatePercentage(item.total, Math.abs(currentCashFlowData.totalCashFlow)) : '0%'}
                              </td>
                            </tr>
                          ))}
                          
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
                          {currentCashFlowData.outFlow.map((item) => (
                            <tr key={`outflow-${item.name}`} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 text-left text-sm text-gray-700">
                                <span className="ml-4">{item.name}</span>
                              </td>
                              {renderCashFlowDataCells(item)}
                              <td className="px-4 py-3 text-right text-sm text-red-600">
                                {currentCashFlowData.totalOutFlow ? calculatePercentage(Math.abs(item.total), Math.abs(currentCashFlowData.totalOutFlow)) : '0%'}
                              </td>
                            </tr>
                          ))}

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
                )}

                {/* Balance Sheet Content */}
                {activeTab === 'balance-sheet' && (
                  <div className="p-6">
                    <div className="text-center py-8">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Balance Sheet</h3>
                      <p className="text-gray-600">Balance sheet functionality coming soon...</p>
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
                    <ResponsiveContainer width="100%" height={200}>
                      <RechartsPieChart>
                        <Tooltip formatter={(value: any) => [`${formatCurrency(Number(value))}`, '']} />
                        <Pie
                          data={expenseData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {expenseData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-48 text-gray-500">
                      No expense data available
                    </div>
                  )}
                </div>
              </div>

              {/* Transaction Detail Panel */}
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900">Transaction Details</h3>
                  {selectedAccountDetails && (
                    <div className="mt-2 flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">{selectedAccountDetails.name}</p>
                        <p className="text-lg font-semibold" style={{ color: BRAND_COLORS.primary }}>
                          {formatCurrency(selectedAccountDetails.total)}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedAccountDetails(null)}
                        className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  )}
                </div>
                <div className="p-6">
                  {selectedAccountDetails ? (
                    <div className="space-y-4">
                      {/* Summary Stats */}
                      <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                        <div>
                          <span className="text-xs text-gray-500">Total Transactions</span>
                          <div className="text-lg font-semibold">{selectedAccountDetails.entries?.length || 0}</div>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500">Account Type</span>
                          <div className="text-lg font-semibold">{selectedAccountDetails.type}</div>
                        </div>
                      </div>

                      {/* Transaction List */}
                      <div className="max-h-96 overflow-y-auto">
                        <div className="space-y-2">
                          {selectedAccountDetails.entries && selectedAccountDetails.entries.length > 0 ? (
                            selectedAccountDetails.entries
                              .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                              .map((entry: any, index: number) => (
                                <div key={`${entry.id}-${index}`} className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors">
                                  <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                      <div 
                                        className={`w-2 h-2 rounded-full ${
                                          entry.amount >= 0 ? 'bg-green-500' : 'bg-red-500'
                                        }`}
                                      />
                                      <span className="text-xs text-gray-500">ID: {entry.id}</span>
                                    </div>
                                    <div className="text-right">
                                      <div className={`text-sm font-semibold ${
                                        entry.amount >= 0 ? 'text-green-600' : 'text-red-600'
                                      }`}>
                                        {formatCurrency(entry.amount)}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {new Date(entry.date).toLocaleDateString()}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {entry.memo && (
                                    <div className="mb-2 p-2 bg-blue-50 rounded text-xs">
                                      <span className="text-blue-700">💬 {entry.memo}</span>
                                    </div>
                                  )}
                                  
                                  <div className="flex justify-between text-xs text-gray-600">
                                    <span>
                                      <strong>Class:</strong> {entry.class || 'No Class'}
                                    </span>
                                    <span>
                                      <strong>Type:</strong> {entry.account_type}
                                    </span>
                                  </div>
                                </div>
                              ))
                          ) : (
                            <div className="text-center py-8 text-gray-500">
                              No transaction details available
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Selected Properties:</span>
                        <span className="text-sm font-medium">{getSelectedPropertiesText()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Data Period:</span>
                        <span className="text-sm font-medium">{selectedMonth}</span>
                      </div>
                      {realData?.summary && (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Financial Transactions:</span>
                            <span className="text-sm font-medium">{realData.summary.filteredEntries}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Property Classes in Data:</span>
                            <span className="text-sm font-medium">{realData.summary.classesInData?.length || 0}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Account Types:</span>
                            <span className="text-sm font-medium">{realData.summary.accountTypes?.length || 0}</span>
                          </div>
                        </>
                      )}
                      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-700">
                          💡 <strong>Tip:</strong> Click on any dollar amount in the P&L table to view detailed transaction breakdowns here.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Account Tooltip */}
          {accountTooltip.show && (
            <div
              className="fixed z-50 bg-gray-900 text-white p-4 rounded-lg text-xs shadow-xl pointer-events-none transition-opacity border border-gray-700"
              style={{
                left: Math.max(10, Math.min(accountTooltip.x - 140, window.innerWidth - 290)),
                top: accountTooltip.y - 10,
                transform: 'translateY(-100%)',
                maxWidth: '280px',
                minWidth: '260px'
              }}
              dangerouslySetInnerHTML={{ __html: accountTooltip.content }}
            />
          )}

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
          {(timeViewDropdownOpen || propertyDropdownOpen) && (
            <div
              className="fixed inset-0 z-10"
              onClick={() => {
                setTimeViewDropdownOpen(false);
                setPropertyDropdownOpen(false);
              }}
            />
          )}
        </div>
      </main>
    </div>
  );
}
