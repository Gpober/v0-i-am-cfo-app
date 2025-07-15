"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ArrowUp, ArrowDown, Minus, Download, RefreshCw, TrendingUp, DollarSign, PieChart, BarChart3, ChevronDown, ChevronRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Cell, Pie } from 'recharts';

// === CONSTANTS & CONFIGURATION ===
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
} as const;

const SUPABASE_CONFIG = {
  url: 'https://ijeuusvwqcnljctkvjdi.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlqZXV1c3Z3cWNubGpjdGt2amRpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIxMjE4MDUsImV4cCI6MjA2NzY5NzgwNX0.O9Mb_X47wbXEMXbPQ8Cr3dzDn_E5DYG9b222FPy4LEU'
} as const;

const CHART_COLORS = [BRAND_COLORS.primary, BRAND_COLORS.success, BRAND_COLORS.warning, BRAND_COLORS.danger, BRAND_COLORS.secondary, BRAND_COLORS.tertiary];

// === TYPES ===
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
  entries?: FinancialEntry[];
  mapping_method?: string;
  hasSubAccounts?: boolean;
  subAccounts?: Record<string, any>;
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

interface KPIData {
  revenue: number;
  cogs: number;
  grossProfit: number;
  operatingExpenses: number;
  operatingIncome: number;
  otherIncome: number;
  otherExpenses: number;
  interestExpense: number;
  netIncome: number;
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
}

// === CUSTOM HOOKS ===
const useSupabaseClient = () => {
  return useMemo(() => ({
    from: (table: string) => ({
      select: (columns: string = '*') => ({
        eq: (column: string, value: string) => ({
          order: (orderBy: string) => 
            fetch(`${SUPABASE_CONFIG.url}/rest/v1/${table}?select=${columns}&${column}=eq.${encodeURIComponent(value)}&order=${orderBy}`, {
              headers: {
                'apikey': SUPABASE_CONFIG.anonKey,
                'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
                'Content-Type': 'application/json'
              }
            }).then(res => res.json()).then(data => ({ data, error: null })).catch(error => ({ data: null, error }))
        }),
        order: (orderBy: string) => 
          fetch(`${SUPABASE_CONFIG.url}/rest/v1/${table}?select=${columns}&order=${orderBy}`, {
            headers: {
              'apikey': SUPABASE_CONFIG.anonKey,
              'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
              'Content-Type': 'application/json'
            }
          }).then(res => res.json()).then(data => ({ data, error: null })).catch(error => ({ data: null, error })),
        then: (callback: Function) => 
          fetch(`${SUPABASE_CONFIG.url}/rest/v1/${table}?select=${columns}`, {
            headers: {
              'apikey': SUPABASE_CONFIG.anonKey,
              'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
              'Content-Type': 'application/json'
            }
          }).then(res => res.json()).then(data => callback({ data, error: null })).catch(error => callback({ data: null, error }))
      })
    })
  }), []);
};

const useNotification = () => {
  const [notification, setNotification] = useState<NotificationState>({ 
    show: false, 
    message: '', 
    type: 'info' 
  });

  const showNotification = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'info' });
    }, 3000);
  }, []);

  return { notification, showNotification };
};

// === UTILITY FUNCTIONS ===
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

const generateMonthsList = (): MonthString[] => {
  const months: MonthString[] = [];
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

// === DATA FETCHING FUNCTIONS ===
const fetchProperties = async (): Promise<string[]> => {
  try {
    console.log("🏠 Fetching property_class values from Supabase...");

    const headers = {
      apikey: SUPABASE_CONFIG.anonKey,
      Authorization: `Bearer ${SUPABASE_CONFIG.anonKey}`,
      "Content-Type": "application/json",
    };

    let uniqueProperties: string[] = [];

    // Try 2025 entries first
    const url2025 = new URL(`${SUPABASE_CONFIG.url}/rest/v1/journal_entries`);
    url2025.searchParams.append("select", "property_class");
    url2025.searchParams.append("transaction_date", "gte.2025-01-01");
    url2025.searchParams.append("transaction_date", "lte.2025-12-31");

    const res2025 = await fetch(url2025.toString(), { headers });

    if (res2025.ok) {
      const data = await res2025.json();
      const cleaned = data
        .map((item: any) => item.property_class)
        .filter((pc: string) => pc && pc.trim() !== "")
        .map((pc: string) => pc.replace(/,/g, "").trim());

      uniqueProperties = [...new Set(cleaned)];
      console.log("📅 Cleaned 2025 properties:", uniqueProperties);
    } else {
      console.warn("⚠️ 2025 fetch failed, falling back to all entries...");

      const fallbackRes = await fetch(
        `${SUPABASE_CONFIG.url}/rest/v1/journal_entries?select=property_class`,
        { headers }
      );

      if (fallbackRes.ok) {
        const data = await fallbackRes.json();
        const cleaned = data
          .map((item: any) => item.property_class)
          .filter((pc: string) => pc && pc.trim() !== "")
          .map((pc: string) => pc.replace(/,/g, "").trim());

        uniqueProperties = [...new Set(cleaned)];
        console.log("📦 Cleaned fallback properties:", uniqueProperties);
      }
    }

    // Add known static values
    const knownStatic = [
      "Cleveland", "Columbus IN", "Detroit", "General", "Hastings MN",
      "Lisbon", "McHenry IL", "Mokena IL", "Pine Terrace",
      "Rockford", "Terraview", "Wesley",
    ];

    const allCombined = [...new Set([...uniqueProperties, ...knownStatic])];

    if (allCombined.length === 0) return ["All Properties", "General"];

    const final = ["All Properties", ...allCombined.sort()];
    console.log("✅ Final cleaned property list:", final);
    return final;

  } catch (err) {
    console.error("❌ fetchProperties() error:", err);
    return [
      "All Properties",
      "Cleveland", "Columbus IN", "Detroit", "General", "Hastings MN",
      "Lisbon", "McHenry IL", "Mokena IL", "Pine Terrace",
      "Rockford", "Terraview", "Wesley",
    ];
  }
};

const fetchFinancialData = async (
  property: string | string[] = 'All Properties',
  monthYear: string
) => {
  try {
    console.log('🔍 FETCHING FINANCIAL DATA with filters:', { property, monthYear });
    
    const [month, year] = monthYear.split(' ');
    const monthNum = new Date(`${month} 1, ${year}`).getMonth() + 1;
    
    // STRICT date filtering
    const startDate = `${year}-${monthNum.toString().padStart(2, '0')}-01`;
    const lastDay = new Date(parseInt(year), monthNum, 0).getDate();
    const endDate = `${year}-${monthNum.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
    
    console.log(`📅 STRICT DATE RANGE: ${startDate} to ${endDate} (${month} ${year} ONLY)`);
    
    let url = `${SUPABASE_CONFIG.url}/rest/v1/journal_entries?select=*&transaction_date=gte.${startDate}&transaction_date=lte.${endDate}&order=transaction_date,account_name`;
    
    if (Array.isArray(property) && !property.includes('All Properties')) {
      const encodedProps = property.map((p) => `"${p}"`).join(',');
      url += `&property_class=in.(${encodedProps})`;
      console.log('🏠 Filtering by multiple property_class:', property);
    } else if (typeof property === 'string' && property !== 'All Properties') {
      url += `&property_class=eq.${encodeURIComponent(property)}`;
      console.log('🏠 Filtering by single property_class:', property);
    }

    console.log('📡 Final URL with STRICT date filtering:', url);

    const [journalResponse, accountsResponse] = await Promise.all([
      fetch(url, {
        headers: {
          'apikey': SUPABASE_CONFIG.anonKey,
          'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
          'Content-Type': 'application/json'
        }
      }),
      fetch(`${SUPABASE_CONFIG.url}/rest/v1/accounts?select=*&order=account_name`, {
        headers: {
          'apikey': SUPABASE_CONFIG.anonKey,
          'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
          'Content-Type': 'application/json'
        }
      })
    ]);

    if (!journalResponse.ok || !accountsResponse.ok) {
      throw new Error('Failed to fetch financial data');
    }
    
    const journalData = await journalResponse.json();
    const accountsData = await accountsResponse.json();
    
    console.log('📊 Journal entries loaded for STRICT date range:', journalData.length);
    
    // Client-side date validation
    const filteredJournalData = journalData.filter((entry: any) => {
      const entryDate = new Date(entry.transaction_date);
      const entryYear = entryDate.getFullYear();
      const entryMonth = entryDate.getMonth() + 1;
      const entryDay = entryDate.getDate();
      
      const targetYear = parseInt(year);
      const targetMonth = monthNum;
      
      const isCorrectYear = entryYear === targetYear;
      const isCorrectMonth = entryMonth === targetMonth;
      const isValidDay = entryDay >= 1 && entryDay <= lastDay;
      
      if (!isCorrectYear || !isCorrectMonth || !isValidDay) {
        console.warn(`⚠️ FILTERED OUT: Entry ${entry.je_number} dated ${entry.transaction_date} (not in ${month} ${year})`);
        return false;
      }
      
      return true;
    });
    
    console.log(`✅ STRICT FILTERING RESULT: ${filteredJournalData.length} entries`);
    
    // Create account lookup map
    const accountLookupMap = new Map();
    
    accountsData.forEach((account: any) => {
      accountLookupMap.set(account.account_name, {
        type: account.account_type,
        standardName: account.account_name,
        classification: account.account_type === 'Income' ? 'Revenue' : 
                      account.account_type === 'Expenses' ? 'Expenses' :
                      account.account_type === 'Cost of Goods Sold' ? 'Expenses' :
                      account.account_type === 'Other Income' ? 'Revenue' :
                      account.account_type === 'Other Expenses' ? 'Expenses' :
                      account.account_type === 'Interest Expense' ? 'Other Expenses' :
                      account.account_type
      });
    });

    // Enhanced classification
    const enhancedData = filteredJournalData.map((entry: any) => {
      let accountInfo = accountLookupMap.get(entry.account_name);
      
      if (!accountInfo) {
        accountInfo = {
          type: entry.account_type,
          classification: entry.account_type === 'Income' ? 'Revenue' : 
                         entry.account_type === 'Expenses' ? 'Expenses' :
                         entry.account_type === 'Cost of Goods Sold' ? 'Expenses' :
                         entry.account_type === 'Other Income' ? 'Revenue' :
                         entry.account_type === 'Other Expenses' ? 'Expenses' :
                         entry.account_type === 'Interest Expense' ? 'Other Expenses' :
                         entry.account_type,
          standardName: entry.account_name
        };
      }
      
      return {
        ...entry,
        account_type: accountInfo?.type || entry.account_type || 'Other',
        classification: accountInfo?.classification || accountInfo?.type || 'Other',
        standard_account_name: accountInfo?.standardName || entry.account_name,
        mapping_method: accountLookupMap.has(entry.account_name) ? 'Accounts Table' : 'Journal Entry Type'
      };
    });

    return {
      success: true,
      data: enhancedData || [],
      accountsData: accountsData,
      summary: {
        filteredEntries: enhancedData?.length || 0,
        originalEntries: journalData.length,
        dateFiltered: journalData.length - filteredJournalData.length,
        dataSource: `Supabase + STRICT ${month} ${year} Filtering`,
        dateRange: `${startDate} to ${endDate}`,
        filters: { property, monthYear },
        accountTypes: [...new Set(accountsData.map((a: any) => a.account_type))],
        propertiesInData: [...new Set(enhancedData.map((e: any) => e.property_class))],
        mappingStats: {
          totalEntries: enhancedData?.length || 0,
          accountsTableMapped: enhancedData?.filter((e: any) => e.mapping_method === 'Accounts Table').length || 0,
          fallbackMapped: enhancedData?.filter((e: any) => e.mapping_method === 'Fallback Classification').length || 0
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

// === DATA TRANSFORMATION FUNCTIONS ===
const transformFinancialData = (entries: FinancialEntry[], monthYear: string) => {
  const getCleanAccountName = (entry: any) => {
    let accountName = entry.account_name?.trim() || '';
    accountName = accountName.replace(/^[^:]*:/, '').trim();
    
    if (!accountName || accountName === 'Journal Entry' || accountName === 'RJE') {
      accountName = entry.description?.trim() || `${entry.account_type || 'Other'} Account`;
    }
    
    return accountName;
  };

  const groupedData = entries.reduce((acc, entry) => {
    const accountName = getCleanAccountName(entry);
    const key = accountName;
    
    if (!acc[key]) {
      const plClassification = entry.classification || entry.account_type;
      
      acc[key] = {
        name: accountName,
        type: plClassification,
        original_type: entry.account_type,
        detail_type: entry.detail_type || entry.account_type,
        total: 0,
        months: {},
        entries: [],
        mapping_method: entry.mapping_method || 'Unknown'
      };
    }
    
    let amount = 0;
    
    switch (acc[key].type) {
      case 'Revenue':
        amount = entry.line_amount || (entry.credit_amount - entry.debit_amount);
        if (amount < 0) {
          amount = Math.abs(amount);
        }
        break;
        
      case 'Expenses':
        amount = Math.abs(entry.line_amount || (entry.debit_amount - entry.credit_amount));
        break;
        
      case 'Assets':
        amount = entry.line_amount || (entry.debit_amount - entry.credit_amount);
        break;
        
      case 'Liabilities':
        amount = entry.line_amount || (entry.credit_amount - entry.debit_amount);
        break;
        
      default:
        amount = entry.line_amount || (entry.debit_amount - entry.credit_amount);
    }
    
    acc[key].total += amount;
    acc[key].months[monthYear as MonthString] = (acc[key].months[monthYear as MonthString] || 0) + amount;
    acc[key].entries.push({
      je_number: entry.je_number,
      debit: entry.debit_amount,
      credit: entry.credit_amount,
      line: entry.line_amount,
      amount_used: amount,
      property: entry.property_class,
      original_account: entry.account_name,
      original_description: entry.description,
      classification: entry.classification,
      transaction_date: entry.transaction_date
    });
    
    return acc;
  }, {} as Record<string, any>);

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
    if (entry.account_type === 'Income' || entry.account_type === 'Revenue' || entry.account_type === 'Other Income') {
      const existing = inFlowItems.find(item => item.name === entry.account_name);
      const amount = Math.abs(entry.credit_amount - entry.debit_amount);
      
      if (existing) {
        existing.total += amount;
      } else if (amount > 0) {
        inFlowItems.push({
          name: entry.account_name,
          total: amount,
          months: {},
          type: entry.account_type
        });
      }
    } else if (entry.account_type === 'Expenses' || entry.account_type === 'Other Expenses' || 
               entry.account_type === 'Cost of Goods Sold') {
      const existing = outFlowItems.find(item => item.name === entry.account_name);
      const amount = Math.abs(entry.debit_amount - entry.credit_amount);
      
      if (existing) {
        existing.total += amount;
      } else if (amount > 0) {
        outFlowItems.push({
          name: entry.account_name,
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

// === LOGO COMPONENT ===
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

// === MAIN COMPONENT ===
export default function FinancialsPage() {
  // State management
  const [activeTab, setActiveTab] = useState<FinancialTab>('p&l');
  const [selectedMonth, setSelectedMonth] = useState<MonthString>('May 2025');
  const [viewMode, setViewMode] = useState<ViewMode>('detailed');
  const [timeView, setTimeView] = useState<TimeView>('Monthly');
  const [timeViewDropdownOpen, setTimeViewDropdownOpen] = useState(false);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [propertyDropdownOpen, setPropertyDropdownOpen] = useState(false);
  const [selectedProperties, setSelectedProperties] = useState<Set<string>>(new Set(['All Properties']));
  const [accountTooltip, setAccountTooltip] = useState<TooltipState>({ show: false, content: '', x: 0, y: 0 });

  // Real data state
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [realData, setRealData] = useState<any>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [availableProperties, setAvailableProperties] = useState<string[]>(['All Properties']);

  // Custom hooks
  const supabase = useSupabaseClient();
  const { notification, showNotification } = useNotification();

  // Memoized values
  const monthsList = useMemo(() => generateMonthsList(), []);

  // Data fetching functions
  const loadInitialData = useCallback(async () => {
    try {
      console.log("🚀 loadInitialData started...");
      setIsLoadingData(true);

      const properties = await fetchProperties();
      console.log('🏠 Available properties loaded:', properties);

      setAvailableProperties(properties);
      await loadRealFinancialData();
    } catch (error) {
      console.error('❌ Failed to load initial data:', error);
      setDataError('Failed to load initial data');
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  const loadRealFinancialData = useCallback(async () => {
    try {
      setIsLoadingData(true);
      setDataError(null);

      const selected = Array.from(selectedProperties || []);
      const isAllSelected = selected.includes("All Properties");

      let propertyFilter: string | string[] = "All Properties";

      if (!isAllSelected) {
        if (selected.length === 1) {
          propertyFilter = selected[0];
        } else if (selected.length > 1) {
          propertyFilter = selected;
        }
      }

      console.log("🔍 LOADING DATA WITH FILTERS:", {
        selectedProperties: selected,
        propertyFilter,
        month: selectedMonth,
      });

      const rawData = await fetchFinancialData(propertyFilter, selectedMonth);

      if (rawData.success) {
        const entries = rawData.data as FinancialEntry[];

        console.log("🔍 DEBUG - Raw Journal Entries Sample:", entries.slice(0, 5));
        console.log("🔍 DEBUG - Total entries loaded:", entries.length);

        const transformedPL = transformFinancialData(entries, selectedMonth);
        const transformedCF = transformCashFlowData(entries);

        const combinedData = {
          success: true,
          ...transformedPL,
          ...transformedCF,
          summary: {
            ...rawData.summary,
            propertiesInData: [...new Set(entries.map((e) => e.property_class))],
            selectedFilters: {
              properties: selected,
              month: selectedMonth,
            },
          },
          performance: {
            executionTimeMs: Date.now() % 1000,
          },
          rawEntries: entries.slice(0, 5),
        };

        setRealData(combinedData);
        setDataError(null);

        const propertyText = isAllSelected
          ? "all properties"
          : `${selected.length} selected properties`;

        showNotification(
          `Loaded ${entries.length} entries for ${propertyText} in ${selectedMonth}`,
          "success"
        );
      } else {
        setDataError(rawData.error || "Failed to load financial data");
        showNotification("Failed to load financial data", "error");
      }
    } catch (error) {
      console.error("❌ Failed to load financial data:", error);
      setDataError("Failed to load financial data");
      showNotification("Failed to load financial data", "error");
    } finally {
      setIsLoadingData(false);
    }
  }, [selectedProperties, selectedMonth, showNotification]);

  // Property handling
  const handlePropertyToggle = useCallback((property: string) => {
    const realProperties = availableProperties.filter(p => p !== "All Properties");
    const newSelected = new Set(selectedProperties);

    if (property === "All Properties") {
      const isSelectingAll = realProperties.some(p => !newSelected.has(p));

      if (isSelectingAll) {
        realProperties.forEach(p => newSelected.add(p));
      } else {
        newSelected.clear();
      }
    } else {
      if (newSelected.has(property)) {
        newSelected.delete(property);
      } else {
        newSelected.add(property);
      }
    }

    setSelectedProperties(newSelected);
    console.log("🏠 Property selection changed:", Array.from(newSelected));
  }, [availableProperties, selectedProperties]);

  const getSelectedPropertiesText = useCallback(() => {
    const realProperties = availableProperties.filter(p => p !== "All Properties");

    if (selectedProperties.size === 0) {
      return "All Properties";
    }

    if (selectedProperties.size === realProperties.length) {
      return "All Properties";
    }

    if (selectedProperties.size === 1) {
      return Array.from(selectedProperties)[0];
    }

    return `${selectedProperties.size} Properties Selected`;
  }, [availableProperties, selectedProperties]);

  // Account expansion handling
  const toggleAccountExpansion = useCallback((accountName: string) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountName)) {
      newExpanded.delete(accountName);
    } else {
      newExpanded.add(accountName);
    }
    setExpandedAccounts(newExpanded);
  }, [expandedAccounts]);

  // Tooltip handling
  const handleAccountMouseEnter = useCallback((event: React.MouseEvent<HTMLElement>, accountItem: FinancialDataItem) => {
    if (!accountItem.entries || accountItem.entries.length === 0) return;

    const rect = (event.target as HTMLElement).getBoundingClientRect();
    
    let tooltipContent = `<div style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 4px;">
      ${accountItem.name} • ${formatCurrency(accountItem.total)}
    </div>`;

    tooltipContent += `<div style="font-size: 11px; color: #E5E7EB; margin-bottom: 8px;">
      ${accountItem.entries.length} Journal Entries • Mapping: ${accountItem.mapping_method}
    </div>`;

    const recentEntries = accountItem.entries.slice(0, 5);
    
    recentEntries.forEach((entry: any, index: number) => {
      const entryDate = new Date(entry.transaction_date).toLocaleDateString();
      const isLast = index === recentEntries.length - 1;
      
      tooltipContent += `
        <div style="margin-bottom: ${isLast ? '0' : '6px'}; padding: 4px; background: rgba(255,255,255,0.1); border-radius: 4px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 4px;">
              <div style="width: 4px; height: 4px; background: ${entry.amount_used >= 0 ? '#10B981' : '#EF4444'}; border-radius: 50%;"></div>
              <strong style="font-size: 11px; color: white;">JE: ${entry.je_number}</strong>
            </div>
            <span style="font-size: 10px; color: #D1D5DB;">${entryDate}</span>
          </div>
          <div style="margin-left: 8px; margin-top: 2px;">
            <div style="font-size: 10px; color: #F3F4F6;">
              ${entry.original_description || 'No description'}
            </div>
            <div style="display: flex; justify-content: space-between; margin-top: 2px;">
              <span style="font-size: 10px; color: #9CA3AF;">
                ${entry.property || 'No Property'} • ${entry.classification}
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
            + ${accountItem.entries.length - 5} more entries
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
  }, []);

  const handleAccountMouseLeave = useCallback(() => {
    setAccountTooltip({ show: false, content: '', x: 0, y: 0 });
  }, []);

  // Data getters
  const getCurrentFinancialData = useCallback(() => {
    if (realData && realData.propertyFinancialData) {
      const propertyKey = Object.keys(realData.propertyFinancialData)[0] || 'All Properties';
      const monthlyData = realData.propertyFinancialData[propertyKey]?.Monthly;
      return monthlyData?.[selectedMonth] || [];
    }
    return [];
  }, [realData, selectedMonth]);

  const getCurrentCashFlowData = useCallback(() => {
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
  }, [realData]);

  // Calculate KPIs
  const calculateKPIs = useCallback((): KPIData => {
    const currentData = getCurrentFinancialData();
    
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
      .filter(item => item.type === 'Revenue' || 
                     (item.original_type && item.original_type.toLowerCase().includes('income')))
      .reduce((sum, item) => sum + Math.abs(item.total), 0);

    const cogs = currentData
      .filter(item => item.original_type === 'Cost of Goods Sold')
      .reduce((sum, item) => sum + Math.abs(item.total), 0);

    const operatingExpenses = currentData
      .filter(item => item.type === 'Expenses' && 
                     item.original_type !== 'Interest Expense')
      .reduce((sum, item) => sum + Math.abs(item.total), 0);

    const interestExpense = currentData
      .filter(item => item.original_type === 'Interest Expense' ||
                     item.name.toLowerCase().includes('mortgage interest'))
      .reduce((sum, item) => sum + Math.abs(item.total), 0);

    const otherIncome = currentData
      .filter(item => item.original_type === 'Other Income')
      .reduce((sum, item) => sum + Math.abs(item.total), 0);

    const otherExpenses = currentData
      .filter(item => item.name.toLowerCase().includes('other expense') &&
                     !item.name.toLowerCase().includes('interest'))
      .reduce((sum, item) => sum + Math.abs(item.total), 0);

    const grossProfit = revenue - cogs;
    const operatingIncome = grossProfit - operatingExpenses;
    const netOperatingIncome = operatingIncome - interestExpense;
    const netIncome = netOperatingIncome + otherIncome - otherExpenses;

    return {
      revenue,
      cogs,
      grossProfit,
      operatingExpenses,
      operatingIncome,
      interestExpense,
      netOperatingIncome,
      otherIncome,
      otherExpenses,
      netIncome,
      grossMargin: revenue ? (grossProfit / revenue) * 100 : 0,
      operatingMargin: revenue ? (operatingIncome / revenue) * 100 : 0,
      netMargin: revenue ? (netIncome / revenue) * 100 : 0
    };
  }, [getCurrentFinancialData]);

  // Memoized calculations
  const currentData = useMemo(() => getCurrentFinancialData(), [getCurrentFinancialData]);
  const currentCashFlowData = useMemo(() => getCurrentCashFlowData(), [getCurrentCashFlowData]);
  const kpis = useMemo(() => calculateKPIs(), [calculateKPIs]);

  const generateTrendData = useMemo(() => {
    const months = ['Jan 2023', 'Feb 2023', 'Mar 2023', 'Apr 2023', 'May 2023', 'Jun 2023'];
    const revenue = kpis.revenue;
    
    return months.map((month, index) => ({
      month,
      revenue: revenue * (0.8 + (index * 0.04)),
      grossProfit: (revenue * (0.8 + (index * 0.04))) * 0.4,
      operatingIncome: (revenue * (0.8 + (index * 0.04))) * 0.2,
      netIncome: (revenue * (0.8 + (index * 0.04))) * 0.15,
    }));
  }, [kpis.revenue]);

  const generateExpenseBreakdown = useMemo(() => {
    return currentData
      .filter(item => item.type === 'Expenses' && item.total > 0)
      .map(item => ({
        name: item.name,
        value: item.total
      }))
      .filter(item => item.value > 0);
  }, [currentData]);

  // Effects
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (availableProperties.length > 1) {
      loadRealFinancialData();
    }
  }, [selectedProperties, selectedMonth, availableProperties.length, loadRealFinancialData]);

  // Render functions
  const renderColumnHeaders = () => (
    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
      {selectedMonth}
    </th>
  );

  const renderDataCells = (item: FinancialDataItem) => {
    const value = item.total || 0;
    const displayValue = item.type === 'Expenses' ? -Math.abs(value) : value;
    
    return (
      <td className={`px-4 py-3 text-right text-sm font-medium ${
        displayValue >= 0 ? 'text-green-600' : 'text-red-600'
      }`}>
        {displayValue >= 0 ? formatCurrency(displayValue) : `(${formatCurrency(Math.abs(displayValue))})`}
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
  }

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
                    Supabase Connected
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Real-time P&L by Property Class • Fixed Data Mapping
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
                  <span className="truncate">{getSelectedPropertiesText()}</span>
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
                from Supabase • STRICT Date Filtering Active
                <div className="mt-1 text-xs">
                  <strong>Date Range:</strong> {realData.summary.dateRange} (STRICT {selectedMonth} ONLY)
                </div>
                <div className="mt-1 text-xs">
                  <strong>Current Filters:</strong> {getSelectedPropertiesText()} • {selectedMonth}
                </div>
                <div className="mt-1 text-xs">
                  <strong>Data Source:</strong> {realData.summary.dataSource}
                </div>
                <div className="mt-1 text-xs">
                  <strong>Date Filtering:</strong> {realData.summary.originalEntries || 0} original entries → 
                  {realData.summary.filteredEntries} after STRICT filtering 
                  {realData.summary.dateFiltered ? `(${realData.summary.dateFiltered} entries filtered out)` : ''}
                </div>
                <div className="mt-1 text-xs">
                  <strong>Mapping Results:</strong> {realData.summary.mappingStats?.accountsTableMapped || 0} accounts table matches, 
                  {realData.summary.mappingStats?.fallbackMapped || 0} fallback classifications
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
