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
  hasSubAccounts?: boolean;
  subAccounts?: Record<string, any>;
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

// Enhanced data transformation functions
const transformFinancialData = (entries: FinancialEntry[], monthYear: string) => {
  console.log('🔍 TRANSFORM FINANCIAL DATA - Input entries:', entries.length);
  
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
    
    // ✅ FIXED: Remove Math.abs() for proper accounting signs
    let amount = 0;
    
    switch (acc[key].type) {
      case 'Revenue':
        amount = entry.line_amount || (entry.credit_amount - entry.debit_amount);
        // Revenue should show negative when abnormal (when debits > credits)
        break;
        
      case 'Expenses':
        amount = entry.line_amount || (entry.debit_amount - entry.credit_amount);
        // Expenses should show negative when abnormal (when credits > debits)
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

  console.log('🔍 TRANSFORM RESULT - P&L items:', plData.length, 'Balance Sheet items:', balanceSheetData.length);

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

// 🚀 ENHANCED Fetch financial data from Supabase with DEBUGGING
const fetchFinancialData = async (
  selectedProperties: Set<string>,
  monthYear: string
) => {
  try {
    console.log('🔍 FETCHING FINANCIAL DATA with filters:');
    console.log('📊 Selected properties:', Array.from(selectedProperties));
    console.log('📅 Month/Year:', monthYear);
    
    const [month, year] = monthYear.split(' ');
    const monthNum = new Date(`${month} 1, ${year}`).getMonth() + 1;
    
    // STRICT date filtering - exactly the month requested
    const startDate = `${year}-${monthNum.toString().padStart(2, '0')}-01`;
    const lastDay = new Date(parseInt(year), monthNum, 0).getDate();
    const endDate = `${year}-${monthNum.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
    
    console.log(`📅 STRICT DATE RANGE: ${startDate} to ${endDate} (${month} ${year} ONLY)`);
    
    // 🚀 ENHANCED: Multi-property selection support
    let propertyFilterArray = Array.from(selectedProperties);
    
    // Remove 'All Properties' from the filter array if present
    if (propertyFilterArray.includes('All Properties')) {
      propertyFilterArray = [];
      console.log('🏠 Using ALL PROPERTIES (no property filter)');
    } else {
      console.log('🏠 Filtering by specific properties:', propertyFilterArray);
    }
    
    // Use proper Supabase client from lib/supabase.ts
    console.log('🔗 Using Supabase client from lib/supabase.ts');
    
    let journalData;
    let accountsData;
    
    try {
      if (propertyFilterArray.length === 0) {
        // No property filter - get all properties
        console.log('🔍 SUPABASE QUERY: Getting ALL properties for date range');
        const result = await supabaseQueries.getJournalEntriesForDateRange(startDate, endDate);
        journalData = result.success ? result.data : [];
        console.log('📊 Query result:', result.success ? `${journalData.length} entries` : `Error: ${result.error}`);
      } else if (propertyFilterArray.length === 1) {
        // Single property filter
        const property = propertyFilterArray[0];
        console.log('🔍 SUPABASE QUERY: Using .eq() for single property:', property);
        const result = await supabaseQueries.getJournalEntriesForProperty(property, startDate, endDate);
        journalData = result.success ? result.data : [];
        console.log('📊 Query result:', result.success ? `${journalData.length} entries` : `Error: ${result.error}`);
      } else {
        // Multiple properties filter
        console.log('🔍 SUPABASE QUERY: Using .in() for multiple properties:', propertyFilterArray);
        const result = await supabaseQueries.getJournalEntriesForMultipleProperties(propertyFilterArray, startDate, endDate);
        journalData = result.success ? result.data : [];
        console.log('📊 Query result:', result.success ? `${journalData.length} entries` : `Error: ${result.error}`);
      }
      
      // Get accounts data
      const accountsResult = await supabaseQueries.getAllAccounts();
      accountsData = accountsResult.success ? accountsResult.data : [];
      
    } catch (queryError) {
      console.error('❌ Supabase query error:', queryError);
      throw new Error(`Database query failed: ${queryError.message}`);
    }
    
    console.log('📊 Journal entries loaded for STRICT date range:', journalData.length);
    
    // ADDITIONAL CLIENT-SIDE DATE VALIDATION to ensure no date leakage
    const filteredJournalData = journalData.filter((entry: any) => {
      const entryDate = new Date(entry.transaction_date);
      const entryYear = entryDate.getFullYear();
      const entryMonth = entryDate.getMonth() + 1; // getMonth() is 0-based
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
    
    console.log(`✅ STRICT FILTERING RESULT: ${filteredJournalData.length} entries (filtered out ${journalData.length - filteredJournalData.length} entries)`);
    
    // Debug: Show property distribution in the actual data
    const propertyDistribution = filteredJournalData.reduce((acc: Record<string, number>, entry: any) => {
      const prop = entry.property_class || 'No Property';
      acc[prop] = (acc[prop] || 0) + 1;
      return acc;
    }, {});
    
    console.log('🏠 PROPERTY DISTRIBUTION in fetched data:', propertyDistribution);
    console.log('🔍 SELECTED PROPERTIES filter was:', Array.from(selectedProperties));
    
    // Debug: Show date range of actual entries
    if (filteredJournalData.length > 0) {
      const dates = filteredJournalData.map((e: any) => e.transaction_date).sort();
      console.log(`📅 ACTUAL DATE RANGE in filtered data: ${dates[0]} to ${dates[dates.length - 1]}`);
    }
    
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

    // Enhanced classification for journal entries to match your Google Sheets structure
    const classifyJournalAccount = (entry: any) => {
      const accountName = entry.account_name || '';
      const name = accountName.toLowerCase();
      const description = (entry.description || '').toLowerCase();
      
      // Revenue/Income classification - matching your Google Sheets exactly
      if (name.includes('rental revenue - airbnb') || 
          name.includes('rental revenue - direct') ||
          name.includes('rental revenue - guesty') ||
          name.includes('rental revenue - reserve payout') ||
          name.includes('rental revenue - vrbo') ||
          name.includes('direct booking') ||
          name.includes('direct revenue') ||
          name.includes('bookings') ||
          name.includes('income') || 
          name.includes('revenue') ||
          name.includes('rent') || 
          name.includes('airbnb') ||
          name.includes('guesty') ||
          name.includes('vrbo') ||
          name.includes('adjustment for occupancy taxes') ||
          name.includes('miscellaneous income') ||
          name.includes('resolution adjustments') ||
          // Check description for reclassification entries
          description.includes('reclassify') ||
          description.includes('move income') ||
          description.includes('transfer') ||
          description.includes('direct booking') ||
          description.includes('guesty to direct') ||
          // Standard revenue patterns
          entry.credit_amount > 0 && entry.debit_amount === 0) {
        return { 
          type: 'Income', 
          classification: 'Revenue', 
          standardName: entry.account_name 
        };
      }
      
      // Expense classification - matching your actual expense categories
      if (name.includes('advertising') || name.includes('marketing') ||
          name.includes('facebook') || name.includes('google') ||
          name.includes('arcade') || name.includes('bank fee') || 
          name.includes('disposal') || name.includes('waste') ||
          name.includes('insurance') || name.includes('internet') || 
          name.includes('tv service') || name.includes('cleaning') ||
          name.includes('labor') || name.includes('meal') || 
          name.includes('membership') || name.includes('subscription') ||
          name.includes('office') || name.includes('shipping') || 
          name.includes('postage') || name.includes('pool') || 
          name.includes('hot tub') || name.includes('maintenance') ||
          name.includes('repair') || name.includes('upgrade') ||
          name.includes('snow') || name.includes('lawn') || 
          name.includes('supplies') || name.includes('travel') ||
          name.includes('utilities') || name.includes('water') || 
          name.includes('sewer') || name.includes('expense') || 
          name.includes('cost') ||
          entry.debit_amount > 0 && entry.credit_amount === 0) {
        return { 
          type: 'Expenses', 
          classification: 'Expenses', 
          standardName: entry.account_name 
        };
      }
      
      // Interest expense (separate category)
      if (name.includes('mortgage') || name.includes('interest')) {
        return { 
          type: 'Interest Expense', 
          classification: 'Other Expenses', 
          standardName: entry.account_name 
        };
      }
      
      // Asset classification
      if (name.includes('improvements') || name.includes('property') || 
          name.includes('equipment') || name.includes('cash') ||
          name.includes('bank') || name.includes('checking') ||
          name.includes('savings') || name.includes('receivable') ||
          entry.account_type === 'Fixed Assets') {
        return { 
          type: 'Fixed Assets', 
          classification: 'Assets', 
          standardName: entry.account_name 
        };
      }
      
      // Liability classification
      if (name.includes('loan') || name.includes('payable') || 
          name.includes('credit card') || name.includes('debt') || 
          name.includes('liability') || entry.account_type === 'Credit Card') {
        return { 
          type: 'Credit Card', 
          classification: 'Liabilities', 
          standardName: entry.account_name 
        };
      }
      
      // ENHANCED DEFAULT CLASSIFICATION for reclassification entries
      // For reclassification entries, look at the net effect and description
      if (description.includes('reclassify') || description.includes('transfer') || description.includes('move')) {
        // For reclassification entries, classify based on the account name pattern and net effect
        if (name.includes('revenue') || name.includes('income') || name.includes('rental') || name.includes('booking')) {
          return { 
            type: 'Income', 
            classification: 'Revenue', 
            standardName: entry.account_name 
          };
        } else {
          return { 
            type: 'Expenses', 
            classification: 'Expenses', 
            standardName: entry.account_name 
          };
        }
      }
      
      // DEFAULT CLASSIFICATION: Use credit/debit logic with enhanced logging
      if (entry.credit_amount > entry.debit_amount || entry.line_amount < 0) {
        return { 
          type: 'Income', 
          classification: 'Revenue', 
          standardName: entry.account_name || 'Revenue Account'
        };
      } else if (entry.debit_amount > entry.credit_amount || entry.line_amount > 0) {
        return { 
          type: 'Expenses', 
          classification: 'Expenses', 
          standardName: entry.account_name || 'Expense Account'
        };
      } else {
        // Equal amounts - classify based on account name patterns
        if (name.includes('revenue') || name.includes('income') || name.includes('rental')) {
          return { 
            type: 'Income', 
            classification: 'Revenue', 
            standardName: entry.account_name 
          };
        } else {
          return { 
            type: 'Other', 
            classification: 'Other', 
            standardName: entry.account_name || 'Other Account'
          };
        }
      }
    };

    // Process journal entries using the STRICTLY FILTERED data
    const enhancedData = filteredJournalData.map((entry: any) => {
      // First: Try to find exact match in your accounts table
      let accountInfo = accountLookupMap.get(entry.account_name);
      
      if (!accountInfo) {
        // Use the account_type directly from the journal entry - no guessing!
        accountInfo = {
          type: entry.account_type,
          classification: entry.account_type === 'Income' ? 'Revenue' : 
                         entry.account_type === 'Expenses' ? 'Expenses' :
                         entry.account_type === 'Cost of Goods Sold' ? 'Expenses' :
                         entry.account_type === 'Other Income' ? 'Revenue' :
                         entry.account_type === 'Other Expenses' ? 'Expenses' :
                         entry.account_type === 'Interest Expense' ? 'Other Expenses' :
                         entry.account_type, // Default to whatever the journal entry says
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
        filters: { selectedProperties: Array.from(selectedProperties), monthYear },
        accountTypes: [...new Set(accountsData.map((a: any) => a.account_type))],
        propertiesInData: [...new Set(enhancedData.map((e: any) => e.property_class))],
        propertyDistribution,
        mappingStats: {
          totalEntries: enhancedData?.length || 0,
          accountsTableMapped: enhancedData?.filter((e: any) => e.mapping_method === 'Accounts Table').length || 0,
          fallbackMapped: enhancedData?.filter((e: any) => e.mapping_method === 'Journal Entry Type').length || 0
        }
      }
    };
  } catch (error) {
    console.error('❌ Error fetching financial data:', error);
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

// Expandable account data for detailed views
const accountDetails: Record<string, FinancialDataItem[]> = {
  'Revenue': [
    { name: 'Product Sales', total: 850000, months: { 'June 2025': 850000 } },
    { name: 'Service Revenue', total: 300000, months: { 'June 2025': 300000 } },
    { name: 'Licensing Fees', total: 75000, months: { 'June 2025': 75000 } },
    { name: 'Other Revenue', total: 25000, months: { 'June 2025': 25000 } },
  ],
  'Cost of Goods Sold': [
    { name: 'Direct Materials', total: 450000, months: { 'June 2025': 450000 } },
    { name: 'Direct Labor', total: 200000, months: { 'June 2025': 200000 } },
    { name: 'Manufacturing Overhead', total: 100000, months: { 'June 2025': 100000 } },
  ],
};

// Sub-detail breakdowns
const subAccountDetails: Record<string, Array<{name: string, amount: number}>> = {
  'Direct Materials': [
    { name: 'Raw Steel', amount: 180000 },
    { name: 'Electronic Components', amount: 120000 },
    { name: 'Packaging Materials', amount: 85000 },
  ],
  'Direct Labor': [
    { name: 'Production Workers', amount: 120000 },
    { name: 'Assembly Technicians', amount: 45000 },
    { name: 'Quality Inspectors', amount: 25000 },
  ],
};

export default function FinancialsPage() {
  const [activeTab, setActiveTab] = useState<FinancialTab>('p&l');
  const [selectedMonth, setSelectedMonth] = useState<MonthString>('May 2025');
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
    console.log('🚀 USEEFFECT: Initial data load triggered');
    loadInitialData();
  }, []);

  // Load data when filters change with debugging
  useEffect(() => {
    console.log('🚀 USEEFFECT: Filter change detected');
    console.log('📊 selectedProperties changed to:', Array.from(selectedProperties));
    console.log('📅 selectedMonth changed to:', selectedMonth);
    loadRealFinancialData();
  }, [selectedProperties, selectedMonth]);

  const loadInitialData = async () => {
    try {
      console.log('🔄 LOADING INITIAL DATA...');
      setIsLoadingData(true);
      
      const propertiesResult = await supabaseQueries.getUniqueProperties();
      if (propertiesResult.success) {
        const properties = propertiesResult.data || [];
        
        // 🚀 ENHANCED: Property deduplication and sorting
        const uniqueProperties = [...new Set(properties)].filter(p => p && p.trim() !== '');
        const sortedProperties = ['All Properties', ...uniqueProperties.sort()];
        
        console.log('🏠 Available properties loaded and deduplicated:', sortedProperties);
        setAvailableProperties(sortedProperties);
      } else {
        console.error('❌ Failed to load properties:', propertiesResult.error);
        // Fallback properties
        setAvailableProperties([
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
        ]);
      }
      
      await loadRealFinancialData();
      
    } catch (error) {
      console.error('❌ Failed to load initial data:', error);
      setDataError('Failed to load initial data');
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadRealFinancialData = async () => {
    try {
      console.log('🔄 LOADING REAL FINANCIAL DATA...');
      console.log('📊 Current selectedProperties state:', Array.from(selectedProperties));
      console.log('📅 Current selectedMonth state:', selectedMonth);
      
      setIsLoadingData(true);
      setDataError(null);
      
      const rawData = await fetchFinancialData(selectedProperties, selectedMonth);
      
      if (rawData.success) {
        const entries = rawData.data as FinancialEntry[];
        
        console.log('✅ RAW DATA SUCCESS:', entries.length, 'entries');
        console.log('🔍 Sample entries:', entries.slice(0, 3));
        
        const transformedPL = transformFinancialData(entries, selectedMonth);
        const transformedCF = transformCashFlowData(entries);

        const combinedData = {
          success: true,
          ...transformedPL,
          ...transformedCF,
          summary: {
            ...rawData.summary,
            propertiesInData: [...new Set(entries.map(e => e.property_class))],
            selectedFilters: {
              properties: Array.from(selectedProperties),
              month: selectedMonth
            }
          },
          performance: {
            executionTimeMs: Date.now() % 1000
          },
          rawEntries: entries.slice(0, 5)
        };

        setRealData(combinedData);
        setDataError(null);
        
        const propertyText = selectedProperties.has('All Properties') 
          ? 'all properties' 
          : `${selectedProperties.size} selected properties`;
          
        showNotification(`✅ Loaded ${entries.length} entries for ${propertyText} in ${selectedMonth}`, 'success');
        
        console.log('🎉 DATA LOADING COMPLETE - Combined data set successfully');
      } else {
        console.error('❌ RAW DATA FAILED:', rawData.error);
        setDataError(rawData.error || 'Failed to load financial data');
        showNotification('❌ Failed to load financial data', 'error');
      }
      
    } catch (error) {
      console.error('❌ Exception in loadRealFinancialData:', error);
      setDataError('Failed to load financial data');
      showNotification('❌ Failed to load financial data', 'error');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handlePropertyToggle = (property: string) => {
    console.log('🏠 Property toggle debugging: property=', property);
    console.log('📊 Current selectedProperties before toggle:', Array.from(selectedProperties));
    
    const newSelected = new Set(selectedProperties);
    
    if (property === 'All Properties') {
      console.log('🔄 Selecting All Properties');
      newSelected.clear();
      newSelected.add('All Properties');
    } else {
      console.log('🔄 Toggling individual property:', property);
      newSelected.delete('All Properties');
      
      if (newSelected.has(property)) {
        console.log('➖ Removing property:', property);
        newSelected.delete(property);
      } else {
        console.log('➕ Adding property:', property);
        newSelected.add(property);
      }
      
      if (newSelected.size === 0) {
        console.log('🔄 No properties selected, defaulting to All Properties');
        newSelected.add('All Properties');
      }
    }
    
    console.log('📊 New selectedProperties after toggle:', Array.from(newSelected));
    console.log('📊 selectedProperties size:', newSelected.size);
    
    setSelectedProperties(newSelected);
    console.log('✅ Property selection state updated');
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

  const isExpandableAccount = (accountName: string): boolean => {
    // Check if it's in the static expandable accounts OR if it has sub-accounts
    const currentDataItem = currentData.find(item => item.name === accountName);
    return accountDetails.hasOwnProperty(accountName) || 
           (currentDataItem && currentDataItem.hasSubAccounts);
  };

  const handleAccountMouseEnter = (event: React.MouseEvent<HTMLElement>, accountItem: FinancialDataItem): void => {
    // Check if this account has real transaction entries
    if (!accountItem.entries || accountItem.entries.length === 0) return;

    const rect = (event.target as HTMLElement).getBoundingClientRect();
    
    // Build tooltip content with actual transaction details
    let tooltipContent = `<div style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 4px;">
      ${accountItem.name} • ${formatCurrency(accountItem.total)}
    </div>`;

    tooltipContent += `<div style="font-size: 11px; color: #E5E7EB; margin-bottom: 8px;">
      ${accountItem.entries.length} Journal Entries • Mapping: ${accountItem.mapping_method}
    </div>`;

    // Show up to 5 most recent transactions
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
                ${entry.amount_used >= 0 ? formatCurrency(entry.amount_used) : `(${formatCurrency(Math.abs(entry.amount_used))})`}
                ${entry.amount_used < 0 ? ' ⚠️' : ''}
              </span>
            </div>
          </div>
        </div>
      `;
    });

    // Add summary if there are more entries
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
  };

  const handleSubAccountMouseEnter = (event: React.MouseEvent<HTMLElement>, subAccountItem: any): void => {
    // Handle both new sub-account structure and old static structure
    if (typeof subAccountItem === 'object' && subAccountItem.entries) {
      // New sub-account with real transaction data
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      
      let tooltipContent = `<div style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 4px;">
        ${subAccountItem.name} • ${formatCurrency(subAccountItem.total)}
      </div>`;

      tooltipContent += `<div style="font-size: 11px; color: #E5E7EB; margin-bottom: 8px;">
        ${subAccountItem.entries.length} Journal Entries • Property: ${subAccountItem.name}
      </div>`;

      // Show up to 3 most recent transactions for sub-accounts
      const recentEntries = subAccountItem.entries.slice(0, 3);
      
      recentEntries.forEach((entry: any, index: number) => {
        const entryDate = new Date(entry.transaction_date).toLocaleDateString();
        const isLast = index === recentEntries.length - 1;
        
        tooltipContent += `
          <div style="margin-bottom: ${isLast ? '0' : '6px'}; padding: 4px; background: rgba(255,255,255,0.1); border-radius: 4px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; align-items: center; gap: 4px;">
                <div style="width: 4px; height: 4px; background: #10B981; border-radius: 50%;"></div>
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
                  ${entry.property || 'No Property'}
                </span>
                <span style="font-size: 11px; font-weight: bold; color: #10B981;">
                  ${formatCurrency(Math.abs(entry.amount_used))}
                </span>
              </div>
            </div>
          </div>
        `;
      });

      if (subAccountItem.entries.length > 3) {
        tooltipContent += `
          <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.2); text-align: center;">
            <span style="font-size: 10px; color: #D1D5DB; font-style: italic;">
              + ${subAccountItem.entries.length - 3} more entries
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
    } else {
      // Fallback to old static sub-account handling
      handleSubAccountMouseEnterStatic(event, subAccountItem, typeof subAccountItem === 'string' ? 0 : subAccountItem);
    }
  };

  const handleSubAccountMouseEnterStatic = (event: React.MouseEvent<HTMLElement>, subAccountName: string, subAccountTotal: number): void => {
    const details = subAccountDetails[subAccountName];
    if (!details || details.length === 0) return;

    let tooltipContent = `<div style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 4px;">
      ${subAccountName} • ${formatCurrency(subAccountTotal)}
    </div>`;

    details.forEach((item, index) => {
      const percentage = subAccountTotal ? ((item.amount / subAccountTotal) * 100).toFixed(1) : '0';
      
      tooltipContent += `
        <div style="margin-bottom: ${index < details.length - 1 ? '8px' : '0'};">
          <div style="display: flex; align-items: center; gap: 4px;">
            <div style="width: 6px; height: 6px; background: ${BRAND_COLORS.success}; border-radius: 50%;"></div>
            <strong style="font-size: 12px; color: white;">${item.name}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-left: 10px;">
            <span style="font-size: 11px;">${formatCurrency(item.amount)}</span>
            <span style="font-size: 10px; background: rgba(255,255,255,0.2); padding: 2px 6px; border-radius: 10px;">${percentage}%</span>
          </div>
        </div>
      `;
    });

    const rect = (event.target as HTMLElement).getBoundingClientRect();
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

    // ✅ FIXED: Remove Math.abs() to preserve proper accounting signs
    const revenue = currentData
      .filter(item => item.type === 'Revenue' || 
                     (item.original_type && item.original_type.toLowerCase().includes('income')))
      .reduce((sum, item) => sum + item.total, 0); // Keep natural sign

    const cogs = currentData
      .filter(item => item.original_type === 'Cost of Goods Sold')
      .reduce((sum, item) => sum + item.total, 0); // Keep natural sign

    const operatingExpenses = currentData
      .filter(item => item.type === 'Expenses' && 
                     item.original_type !== 'Interest Expense')
      .reduce((sum, item) => sum + item.total, 0); // Keep natural sign

    const interestExpense = currentData
      .filter(item => item.original_type === 'Interest Expense' ||
                     item.name.toLowerCase().includes('mortgage interest'))
      .reduce((sum, item) => sum + item.total, 0); // Keep natural sign

    const otherIncome = currentData
      .filter(item => item.original_type === 'Other Income')
      .reduce((sum, item) => sum + item.total, 0); // Keep natural sign

    const otherExpenses = currentData
      .filter(item => item.name.toLowerCase().includes('other expense') &&
                     !item.name.toLowerCase().includes('interest'))
      .reduce((sum, item) => sum + item.total, 0); // Keep natural sign

    // Calculate derived metrics with proper signs
    const grossProfit = revenue - Math.abs(cogs); // COGS should reduce gross profit
    const operatingIncome = grossProfit - Math.abs(operatingExpenses); // Expenses should reduce operating income
    const netOperatingIncome = operatingIncome - Math.abs(interestExpense); // Interest should reduce income
    const netIncome = netOperatingIncome + otherIncome - Math.abs(otherExpenses); // Other expenses should reduce net income

    return {
      revenue,
      cogs: Math.abs(cogs), // Show as positive for display
      grossProfit,
      operatingExpenses: Math.abs(operatingExpenses), // Show as positive for display
      operatingIncome,
      interestExpense: Math.abs(interestExpense), // Show as positive for display
      netOperatingIncome,
      otherIncome,
      otherExpenses: Math.abs(otherExpenses), // Show as positive for display
      netIncome,
      grossMargin: revenue ? (grossProfit / revenue) * 100 : 0,
      operatingMargin: revenue ? (operatingIncome / revenue) * 100 : 0,
      netMargin: revenue ? (netIncome / revenue) * 100 : 0
    };
  };

  const generateTrendData = () => {
    const months = ['Jan 2023', 'Feb 2023', 'Mar 2023', 'Apr 2023', 'May 2023', 'Jun 2023'];
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
      .filter(item => item.type === 'Expenses' && Math.abs(item.total) > 0)
      .map(item => ({
        name: item.name,
        value: Math.abs(item.total) // Use absolute value for pie chart
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
    // ✅ FIXED: Show natural accounting signs
    const displayValue = value;
    const isAbnormal = (item.type === 'Revenue' && value < 0) || (item.type === 'Expenses' && value < 0);
    
    return (
      <td className={`px-4 py-3 text-right text-sm font-medium ${
        displayValue >= 0 ? 'text-green-600' : 'text-red-600'
      }`}>
        {displayValue >= 0 ? formatCurrency(displayValue) : `(${formatCurrency(Math.abs(displayValue))})`}
        {isAbnormal && <span className="ml-1 text-yellow-500">⚠️</span>}
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
                    Supabase Connected • Multi-Property Debug Mode
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Real-time P&L by Property Class • Multi-Property Selection with Enhanced Debugging
                {realData?.summary && (
                  <span className="ml-2 text-green-600">
                    • {realData.summary.filteredEntries} entries loaded from {realData.summary.propertiesInData?.length || 0} properties
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
                onChange={(e) => {
                  console.log('📅 Month selection changed to:', e.target.value);
                  setSelectedMonth(e.target.value as MonthString);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm hover:border-blue-500 focus:outline-none focus:ring-2 transition-all"
                style={{ '--tw-ring-color': BRAND_COLORS.secondary + '33' } as React.CSSProperties}
              >
                {monthsList.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>

              {/* 🚀 ENHANCED Property Class Multi-Select Dropdown with Debugging */}
              <div className="relative">
                <button
                  onClick={() => {
                    console.log('🔽 Property dropdown toggle clicked');
                    setPropertyDropdownOpen(!propertyDropdownOpen);
                  }}
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
                        console.log('🔄 All Properties option clicked');
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
                                console.log('🔄 Individual property clicked:', property);
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
                onClick={() => {
                  console.log('🔄 Refresh button clicked');
                  loadRealFinancialData();
                }}
                disabled={isLoadingData}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingData ? 'animate-spin' : ''}`} />
                {isLoadingData ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* 🚀 ENHANCED Data Status with Multi-Property Debugging */}
          {realData && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-green-800 text-sm">
                <strong>✅ Data Status:</strong> Loaded {realData.summary.filteredEntries} entries 
                from Supabase • Multi-Property Selection Active
                <div className="mt-1 text-xs">
                  <strong>📅 Date Range:</strong> {realData.summary.dateRange} (STRICT {selectedMonth} ONLY)
                </div>
                <div className="mt-1 text-xs">
                  <strong>🏠 Selected Properties:</strong> {getSelectedPropertiesText()} 
                  ({Array.from(selectedProperties).join(', ')})
                </div>
                <div className="mt-1 text-xs">
                  <strong>📊 Properties in Data:</strong> {realData.summary.propertiesInData?.join(', ') || 'None'}
                </div>
                {realData.summary.propertyDistribution && (
                  <div className="mt-1 text-xs">
                    <strong>🔍 Property Distribution:</strong> {Object.entries(realData.summary.propertyDistribution).map(([prop, count]) => `${prop}: ${count}`).join(', ')}
                  </div>
                )}
                <div className="mt-1 text-xs">
                  <strong>🔍 Data Source:</strong> {realData.summary.dataSource}
                </div>
                <div className="mt-1 text-xs">
                  <strong>📈 Date Filtering:</strong> {realData.summary.originalEntries || 0} original entries → 
                  {realData.summary.filteredEntries} after STRICT filtering 
                  {realData.summary.dateFiltered ? `(${realData.summary.dateFiltered} entries filtered out)` : ''}
                </div>
                <div className="mt-1 text-xs">
                  <strong>🗂️ Mapping Results:</strong> {realData.summary.mappingStats?.accountsTableMapped || 0} accounts table matches, 
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
                  <div className="text-2xl font-bold text
Perfect! I can see you're showing me the current GitHub version. I'll give you the complete updated code with all our debugging features added.

Copy and paste this entire code into your GitHub src/app/financials/page.tsx file:

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
  hasSubAccounts?: boolean;
  subAccounts?: Record<string, any>;
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

// Enhanced data transformation functions
const transformFinancialData = (entries: FinancialEntry[], monthYear: string) => {
  console.log('🔍 TRANSFORM FINANCIAL DATA - Input entries:', entries.length);
  
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
    
    // ✅ FIXED: Remove Math.abs() for proper accounting signs
    let amount = 0;
    
    switch (acc[key].type) {
      case 'Revenue':
        amount = entry.line_amount || (entry.credit_amount - entry.debit_amount);
        // Revenue should show negative when abnormal (when debits > credits)
        break;
        
      case 'Expenses':
        amount = entry.line_amount || (entry.debit_amount - entry.credit_amount);
        // Expenses should show negative when abnormal (when credits > debits)
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

  console.log('🔍 TRANSFORM RESULT - P&L items:', plData.length, 'Balance Sheet items:', balanceSheetData.length);

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

// 🚀 ENHANCED Fetch financial data from Supabase with DEBUGGING
const fetchFinancialData = async (
  selectedProperties: Set<string>,
  monthYear: string
) => {
  try {
    console.log('🔍 FETCHING FINANCIAL DATA with filters:');
    console.log('📊 Selected properties:', Array.from(selectedProperties));
    console.log('📅 Month/Year:', monthYear);
    
    const [month, year] = monthYear.split(' ');
    const monthNum = new Date(`${month} 1, ${year}`).getMonth() + 1;
    
    // STRICT date filtering - exactly the month requested
    const startDate = `${year}-${monthNum.toString().padStart(2, '0')}-01`;
    const lastDay = new Date(parseInt(year), monthNum, 0).getDate();
    const endDate = `${year}-${monthNum.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
    
    console.log(`📅 STRICT DATE RANGE: ${startDate} to ${endDate} (${month} ${year} ONLY)`);
    
    // 🚀 ENHANCED: Multi-property selection support
    let propertyFilterArray = Array.from(selectedProperties);
    
    // Remove 'All Properties' from the filter array if present
    if (propertyFilterArray.includes('All Properties')) {
      propertyFilterArray = [];
      console.log('🏠 Using ALL PROPERTIES (no property filter)');
    } else {
      console.log('🏠 Filtering by specific properties:', propertyFilterArray);
    }
    
    // Use proper Supabase client from lib/supabase.ts
    console.log('🔗 Using Supabase client from lib/supabase.ts');
    
    let journalData;
    let accountsData;
    
    try {
      if (propertyFilterArray.length === 0) {
        // No property filter - get all properties
        console.log('🔍 SUPABASE QUERY: Getting ALL properties for date range');
        const result = await supabaseQueries.getJournalEntriesForDateRange(startDate, endDate);
        journalData = result.success ? result.data : [];
        console.log('📊 Query result:', result.success ? `${journalData.length} entries` : `Error: ${result.error}`);
      } else if (propertyFilterArray.length === 1) {
        // Single property filter
        const property = propertyFilterArray[0];
        console.log('🔍 SUPABASE QUERY: Using .eq() for single property:', property);
        const result = await supabaseQueries.getJournalEntriesForProperty(property, startDate, endDate);
        journalData = result.success ? result.data : [];
        console.log('📊 Query result:', result.success ? `${journalData.length} entries` : `Error: ${result.error}`);
      } else {
        // Multiple properties filter
        console.log('🔍 SUPABASE QUERY: Using .in() for multiple properties:', propertyFilterArray);
        const result = await supabaseQueries.getJournalEntriesForMultipleProperties(propertyFilterArray, startDate, endDate);
        journalData = result.success ? result.data : [];
        console.log('📊 Query result:', result.success ? `${journalData.length} entries` : `Error: ${result.error}`);
      }
      
      // Get accounts data
      const accountsResult = await supabaseQueries.getAllAccounts();
      accountsData = accountsResult.success ? accountsResult.data : [];
      
    } catch (queryError) {
      console.error('❌ Supabase query error:', queryError);
      throw new Error(`Database query failed: ${queryError.message}`);
    }
    
    console.log('📊 Journal entries loaded for STRICT date range:', journalData.length);
    
    // ADDITIONAL CLIENT-SIDE DATE VALIDATION to ensure no date leakage
    const filteredJournalData = journalData.filter((entry: any) => {
      const entryDate = new Date(entry.transaction_date);
      const entryYear = entryDate.getFullYear();
      const entryMonth = entryDate.getMonth() + 1; // getMonth() is 0-based
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
    
    console.log(`✅ STRICT FILTERING RESULT: ${filteredJournalData.length} entries (filtered out ${journalData.length - filteredJournalData.length} entries)`);
    
    // Debug: Show property distribution in the actual data
    const propertyDistribution = filteredJournalData.reduce((acc: Record<string, number>, entry: any) => {
      const prop = entry.property_class || 'No Property';
      acc[prop] = (acc[prop] || 0) + 1;
      return acc;
    }, {});
    
    console.log('🏠 PROPERTY DISTRIBUTION in fetched data:', propertyDistribution);
    console.log('🔍 SELECTED PROPERTIES filter was:', Array.from(selectedProperties));
    
    // Debug: Show date range of actual entries
    if (filteredJournalData.length > 0) {
      const dates = filteredJournalData.map((e: any) => e.transaction_date).sort();
      console.log(`📅 ACTUAL DATE RANGE in filtered data: ${dates[0]} to ${dates[dates.length - 1]}`);
    }
    
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

    // Enhanced classification for journal entries to match your Google Sheets structure
    const classifyJournalAccount = (entry: any) => {
      const accountName = entry.account_name || '';
      const name = accountName.toLowerCase();
      const description = (entry.description || '').toLowerCase();
      
      // Revenue/Income classification - matching your Google Sheets exactly
      if (name.includes('rental revenue - airbnb') || 
          name.includes('rental revenue - direct') ||
          name.includes('rental revenue - guesty') ||
          name.includes('rental revenue - reserve payout') ||
          name.includes('rental revenue - vrbo') ||
          name.includes('direct booking') ||
          name.includes('direct revenue') ||
          name.includes('bookings') ||
          name.includes('income') || 
          name.includes('revenue') ||
          name.includes('rent') || 
          name.includes('airbnb') ||
          name.includes('guesty') ||
          name.includes('vrbo') ||
          name.includes('adjustment for occupancy taxes') ||
          name.includes('miscellaneous income') ||
          name.includes('resolution adjustments') ||
          // Check description for reclassification entries
          description.includes('reclassify') ||
          description.includes('move income') ||
          description.includes('transfer') ||
          description.includes('direct booking') ||
          description.includes('guesty to direct') ||
          // Standard revenue patterns
          entry.credit_amount > 0 && entry.debit_amount === 0) {
        return { 
          type: 'Income', 
          classification: 'Revenue', 
          standardName: entry.account_name 
        };
      }
      
      // Expense classification - matching your actual expense categories
      if (name.includes('advertising') || name.includes('marketing') ||
          name.includes('facebook') || name.includes('google') ||
          name.includes('arcade') || name.includes('bank fee') || 
          name.includes('disposal') || name.includes('waste') ||
          name.includes('insurance') || name.includes('internet') || 
          name.includes('tv service') || name.includes('cleaning') ||
          name.includes('labor') || name.includes('meal') || 
          name.includes('membership') || name.includes('subscription') ||
          name.includes('office') || name.includes('shipping') || 
          name.includes('postage') || name.includes('pool') || 
          name.includes('hot tub') || name.includes('maintenance') ||
          name.includes('repair') || name.includes('upgrade') ||
          name.includes('snow') || name.includes('lawn') || 
          name.includes('supplies') || name.includes('travel') ||
          name.includes('utilities') || name.includes('water') || 
          name.includes('sewer') || name.includes('expense') || 
          name.includes('cost') ||
          entry.debit_amount > 0 && entry.credit_amount === 0) {
        return { 
          type: 'Expenses', 
          classification: 'Expenses', 
          standardName: entry.account_name 
        };
      }
      
      // Interest expense (separate category)
      if (name.includes('mortgage') || name.includes('interest')) {
        return { 
          type: 'Interest Expense', 
          classification: 'Other Expenses', 
          standardName: entry.account_name 
        };
      }
      
      // Asset classification
      if (name.includes('improvements') || name.includes('property') || 
          name.includes('equipment') || name.includes('cash') ||
          name.includes('bank') || name.includes('checking') ||
          name.includes('savings') || name.includes('receivable') ||
          entry.account_type === 'Fixed Assets') {
        return { 
          type: 'Fixed Assets', 
          classification: 'Assets', 
          standardName: entry.account_name 
        };
      }
      
      // Liability classification
      if (name.includes('loan') || name.includes('payable') || 
          name.includes('credit card') || name.includes('debt') || 
          name.includes('liability') || entry.account_type === 'Credit Card') {
        return { 
          type: 'Credit Card', 
          classification: 'Liabilities', 
          standardName: entry.account_name 
        };
      }
      
      // ENHANCED DEFAULT CLASSIFICATION for reclassification entries
      // For reclassification entries, look at the net effect and description
      if (description.includes('reclassify') || description.includes('transfer') || description.includes('move')) {
        // For reclassification entries, classify based on the account name pattern and net effect
        if (name.includes('revenue') || name.includes('income') || name.includes('rental') || name.includes('booking')) {
          return { 
            type: 'Income', 
            classification: 'Revenue', 
            standardName: entry.account_name 
          };
        } else {
          return { 
            type: 'Expenses', 
            classification: 'Expenses', 
            standardName: entry.account_name 
          };
        }
      }
      
      // DEFAULT CLASSIFICATION: Use credit/debit logic with enhanced logging
      if (entry.credit_amount > entry.debit_amount || entry.line_amount < 0) {
        return { 
          type: 'Income', 
          classification: 'Revenue', 
          standardName: entry.account_name || 'Revenue Account'
        };
      } else if (entry.debit_amount > entry.credit_amount || entry.line_amount > 0) {
        return { 
          type: 'Expenses', 
          classification: 'Expenses', 
          standardName: entry.account_name || 'Expense Account'
        };
      } else {
        // Equal amounts - classify based on account name patterns
        if (name.includes('revenue') || name.includes('income') || name.includes('rental')) {
          return { 
            type: 'Income', 
            classification: 'Revenue', 
            standardName: entry.account_name 
          };
        } else {
          return { 
            type: 'Other', 
            classification: 'Other', 
            standardName: entry.account_name || 'Other Account'
          };
        }
      }
    };

    // Process journal entries using the STRICTLY FILTERED data
    const enhancedData = filteredJournalData.map((entry: any) => {
      // First: Try to find exact match in your accounts table
      let accountInfo = accountLookupMap.get(entry.account_name);
      
      if (!accountInfo) {
        // Use the account_type directly from the journal entry - no guessing!
        accountInfo = {
          type: entry.account_type,
          classification: entry.account_type === 'Income' ? 'Revenue' : 
                         entry.account_type === 'Expenses' ? 'Expenses' :
                         entry.account_type === 'Cost of Goods Sold' ? 'Expenses' :
                         entry.account_type === 'Other Income' ? 'Revenue' :
                         entry.account_type === 'Other Expenses' ? 'Expenses' :
                         entry.account_type === 'Interest Expense' ? 'Other Expenses' :
                         entry.account_type, // Default to whatever the journal entry says
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
        filters: { selectedProperties: Array.from(selectedProperties), monthYear },
        accountTypes: [...new Set(accountsData.map((a: any) => a.account_type))],
        propertiesInData: [...new Set(enhancedData.map((e: any) => e.property_class))],
        propertyDistribution,
        mappingStats: {
          totalEntries: enhancedData?.length || 0,
          accountsTableMapped: enhancedData?.filter((e: any) => e.mapping_method === 'Accounts Table').length || 0,
          fallbackMapped: enhancedData?.filter((e: any) => e.mapping_method === 'Journal Entry Type').length || 0
        }
      }
    };
  } catch (error) {
    console.error('❌ Error fetching financial data:', error);
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

// Expandable account data for detailed views
const accountDetails: Record<string, FinancialDataItem[]> = {
  'Revenue': [
    { name: 'Product Sales', total: 850000, months: { 'June 2025': 850000 } },
    { name: 'Service Revenue', total: 300000, months: { 'June 2025': 300000 } },
    { name: 'Licensing Fees', total: 75000, months: { 'June 2025': 75000 } },
    { name: 'Other Revenue', total: 25000, months: { 'June 2025': 25000 } },
  ],
  'Cost of Goods Sold': [
    { name: 'Direct Materials', total: 450000, months: { 'June 2025': 450000 } },
    { name: 'Direct Labor', total: 200000, months: { 'June 2025': 200000 } },
    { name: 'Manufacturing Overhead', total: 100000, months: { 'June 2025': 100000 } },
  ],
};

// Sub-detail breakdowns
const subAccountDetails: Record<string, Array<{name: string, amount: number}>> = {
  'Direct Materials': [
    { name: 'Raw Steel', amount: 180000 },
    { name: 'Electronic Components', amount: 120000 },
    { name: 'Packaging Materials', amount: 85000 },
  ],
  'Direct Labor': [
    { name: 'Production Workers', amount: 120000 },
    { name: 'Assembly Technicians', amount: 45000 },
    { name: 'Quality Inspectors', amount: 25000 },
  ],
};

export default function FinancialsPage() {
  const [activeTab, setActiveTab] = useState<FinancialTab>('p&l');
  const [selectedMonth, setSelectedMonth] = useState<MonthString>('May 2025');
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
    console.log('🚀 USEEFFECT: Initial data load triggered');
    loadInitialData();
  }, []);

  // Load data when filters change with debugging
  useEffect(() => {
    console.log('🚀 USEEFFECT: Filter change detected');
    console.log('📊 selectedProperties changed to:', Array.from(selectedProperties));
    console.log('📅 selectedMonth changed to:', selectedMonth);
    loadRealFinancialData();
  }, [selectedProperties, selectedMonth]);

  const loadInitialData = async () => {
    try {
      console.log('🔄 LOADING INITIAL DATA...');
      setIsLoadingData(true);
      
      const propertiesResult = await supabaseQueries.getUniqueProperties();
      if (propertiesResult.success) {
        const properties = propertiesResult.data || [];
        
        // 🚀 ENHANCED: Property deduplication and sorting
        const uniqueProperties = [...new Set(properties)].filter(p => p && p.trim() !== '');
        const sortedProperties = ['All Properties', ...uniqueProperties.sort()];
        
        console.log('🏠 Available properties loaded and deduplicated:', sortedProperties);
        setAvailableProperties(sortedProperties);
      } else {
        console.error('❌ Failed to load properties:', propertiesResult.error);
        // Fallback properties
        setAvailableProperties([
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
        ]);
      }
      
      await loadRealFinancialData();
      
    } catch (error) {
      console.error('❌ Failed to load initial data:', error);
      setDataError('Failed to load initial data');
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadRealFinancialData = async () => {
    try {
      console.log('🔄 LOADING REAL FINANCIAL DATA...');
      console.log('📊 Current selectedProperties state:', Array.from(selectedProperties));
      console.log('📅 Current selectedMonth state:', selectedMonth);
      
      setIsLoadingData(true);
      setDataError(null);
      
      const rawData = await fetchFinancialData(selectedProperties, selectedMonth);
      
      if (rawData.success) {
        const entries = rawData.data as FinancialEntry[];
        
        console.log('✅ RAW DATA SUCCESS:', entries.length, 'entries');
        console.log('🔍 Sample entries:', entries.slice(0, 3));
        
        const transformedPL = transformFinancialData(entries, selectedMonth);
        const transformedCF = transformCashFlowData(entries);

        const combinedData = {
          success: true,
          ...transformedPL,
          ...transformedCF,
          summary: {
            ...rawData.summary,
            propertiesInData: [...new Set(entries.map(e => e.property_class))],
            selectedFilters: {
              properties: Array.from(selectedProperties),
              month: selectedMonth
            }
          },
          performance: {
            executionTimeMs: Date.now() % 1000
          },
          rawEntries: entries.slice(0, 5)
        };

        setRealData(combinedData);
        setDataError(null);
        
        const propertyText = selectedProperties.has('All Properties') 
          ? 'all properties' 
          : `${selectedProperties.size} selected properties`;
          
        showNotification(`✅ Loaded ${entries.length} entries for ${propertyText} in ${selectedMonth}`, 'success');
        
        console.log('🎉 DATA LOADING COMPLETE - Combined data set successfully');
      } else {
        console.error('❌ RAW DATA FAILED:', rawData.error);
        setDataError(rawData.error || 'Failed to load financial data');
        showNotification('❌ Failed to load financial data', 'error');
      }
      
    } catch (error) {
      console.error('❌ Exception in loadRealFinancialData:', error);
      setDataError('Failed to load financial data');
      showNotification('❌ Failed to load financial data', 'error');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handlePropertyToggle = (property: string) => {
    console.log('🏠 Property toggle debugging: property=', property);
    console.log('📊 Current selectedProperties before toggle:', Array.from(selectedProperties));
    
    const newSelected = new Set(selectedProperties);
    
    if (property === 'All Properties') {
      console.log('🔄 Selecting All Properties');
      newSelected.clear();
      newSelected.add('All Properties');
    } else {
      console.log('🔄 Toggling individual property:', property);
      newSelected.delete('All Properties');
      
      if (newSelected.has(property)) {
        console.log('➖ Removing property:', property);
        newSelected.delete(property);
      } else {
        console.log('➕ Adding property:', property);
        newSelected.add(property);
      }
      
      if (newSelected.size === 0) {
        console.log('🔄 No properties selected, defaulting to All Properties');
        newSelected.add('All Properties');
      }
    }
    
    console.log('📊 New selectedProperties after toggle:', Array.from(newSelected));
    console.log('📊 selectedProperties size:', newSelected.size);
    
    setSelectedProperties(newSelected);
    console.log('✅ Property selection state updated');
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

  const isExpandableAccount = (accountName: string): boolean => {
    // Check if it's in the static expandable accounts OR if it has sub-accounts
    const currentDataItem = currentData.find(item => item.name === accountName);
    return accountDetails.hasOwnProperty(accountName) || 
           (currentDataItem && currentDataItem.hasSubAccounts);
  };

  const handleAccountMouseEnter = (event: React.MouseEvent<HTMLElement>, accountItem: FinancialDataItem): void => {
    // Check if this account has real transaction entries
    if (!accountItem.entries || accountItem.entries.length === 0) return;

    const rect = (event.target as HTMLElement).getBoundingClientRect();
    
    // Build tooltip content with actual transaction details
    let tooltipContent = `<div style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 4px;">
      ${accountItem.name} • ${formatCurrency(accountItem.total)}
    </div>`;

    tooltipContent += `<div style="font-size: 11px; color: #E5E7EB; margin-bottom: 8px;">
      ${accountItem.entries.length} Journal Entries • Mapping: ${accountItem.mapping_method}
    </div>`;

    // Show up to 5 most recent transactions
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
                ${entry.amount_used >= 0 ? formatCurrency(entry.amount_used) : `(${formatCurrency(Math.abs(entry.amount_used))})`}
                ${entry.amount_used < 0 ? ' ⚠️' : ''}
              </span>
            </div>
          </div>
        </div>
      `;
    });

    // Add summary if there are more entries
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
  };

  const handleSubAccountMouseEnter = (event: React.MouseEvent<HTMLElement>, subAccountItem: any): void => {
    // Handle both new sub-account structure and old static structure
    if (typeof subAccountItem === 'object' && subAccountItem.entries) {
      // New sub-account with real transaction data
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      
      let tooltipContent = `<div style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 4px;">
        ${subAccountItem.name} • ${formatCurrency(subAccountItem.total)}
      </div>`;

      tooltipContent += `<div style="font-size: 11px; color: #E5E7EB; margin-bottom: 8px;">
        ${subAccountItem.entries.length} Journal Entries • Property: ${subAccountItem.name}
      </div>`;

      // Show up to 3 most recent transactions for sub-accounts
      const recentEntries = subAccountItem.entries.slice(0, 3);
      
      recentEntries.forEach((entry: any, index: number) => {
        const entryDate = new Date(entry.transaction_date).toLocaleDateString();
        const isLast = index === recentEntries.length - 1;
        
        tooltipContent += `
          <div style="margin-bottom: ${isLast ? '0' : '6px'}; padding: 4px; background: rgba(255,255,255,0.1); border-radius: 4px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; align-items: center; gap: 4px;">
                <div style="width: 4px; height: 4px; background: #10B981; border-radius: 50%;"></div>
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
                  ${entry.property || 'No Property'}
                </span>
                <span style="font-size: 11px; font-weight: bold; color: #10B981;">
                  ${formatCurrency(Math.abs(entry.amount_used))}
                </span>
              </div>
            </div>
          </div>
        `;
      });

      if (subAccountItem.entries.length > 3) {
        tooltipContent += `
          <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.2); text-align: center;">
            <span style="font-size: 10px; color: #D1D5DB; font-style: italic;">
              + ${subAccountItem.entries.length - 3} more entries
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
    } else {
      // Fallback to old static sub-account handling
      handleSubAccountMouseEnterStatic(event, subAccountItem, typeof subAccountItem === 'string' ? 0 : subAccountItem);
    }
  };

  const handleSubAccountMouseEnterStatic = (event: React.MouseEvent<HTMLElement>, subAccountName: string, subAccountTotal: number): void => {
    const details = subAccountDetails[subAccountName];
    if (!details || details.length === 0) return;

    let tooltipContent = `<div style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 4px;">
      ${subAccountName} • ${formatCurrency(subAccountTotal)}
    </div>`;

    details.forEach((item, index) => {
      const percentage = subAccountTotal ? ((item.amount / subAccountTotal) * 100).toFixed(1) : '0';
      
      tooltipContent += `
        <div style="margin-bottom: ${index < details.length - 1 ? '8px' : '0'};">
          <div style="display: flex; align-items: center; gap: 4px;">
            <div style="width: 6px; height: 6px; background: ${BRAND_COLORS.success}; border-radius: 50%;"></div>
            <strong style="font-size: 12px; color: white;">${item.name}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-left: 10px;">
            <span style="font-size: 11px;">${formatCurrency(item.amount)}</span>
            <span style="font-size: 10px; background: rgba(255,255,255,0.2); padding: 2px 6px; border-radius: 10px;">${percentage}%</span>
          </div>
        </div>
      `;
    });

    const rect = (event.target as HTMLElement).getBoundingClientRect();
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

    // ✅ FIXED: Remove Math.abs() to preserve proper accounting signs
    const revenue = currentData
      .filter(item => item.type === 'Revenue' || 
                     (item.original_type && item.original_type.toLowerCase().includes('income')))
      .reduce((sum, item) => sum + item.total, 0); // Keep natural sign

    const cogs = currentData
      .filter(item => item.original_type === 'Cost of Goods Sold')
      .reduce((sum, item) => sum + item.total, 0); // Keep natural sign

    const operatingExpenses = currentData
      .filter(item => item.type === 'Expenses' && 
                     item.original_type !== 'Interest Expense')
      .reduce((sum, item) => sum + item.total, 0); // Keep natural sign

    const interestExpense = currentData
      .filter(item => item.original_type === 'Interest Expense' ||
                     item.name.toLowerCase().includes('mortgage interest'))
      .reduce((sum, item) => sum + item.total, 0); // Keep natural sign

    const otherIncome = currentData
      .filter(item => item.original_type === 'Other Income')
      .reduce((sum, item) => sum + item.total, 0); // Keep natural sign

    const otherExpenses = currentData
      .filter(item => item.name.toLowerCase().includes('other expense') &&
                     !item.name.toLowerCase().includes('interest'))
      .reduce((sum, item) => sum + item.total, 0); // Keep natural sign

    // Calculate derived metrics with proper signs
    const grossProfit = revenue - Math.abs(cogs); // COGS should reduce gross profit
    const operatingIncome = grossProfit - Math.abs(operatingExpenses); // Expenses should reduce operating income
    const netOperatingIncome = operatingIncome - Math.abs(interestExpense); // Interest should reduce income
    const netIncome = netOperatingIncome + otherIncome - Math.abs(otherExpenses); // Other expenses should reduce net income

    return {
      revenue,
      cogs: Math.abs(cogs), // Show as positive for display
      grossProfit,
      operatingExpenses: Math.abs(operatingExpenses), // Show as positive for display
      operatingIncome,
      interestExpense: Math.abs(interestExpense), // Show as positive for display
      netOperatingIncome,
      otherIncome,
      otherExpenses: Math.abs(otherExpenses), // Show as positive for display
      netIncome,
      grossMargin: revenue ? (grossProfit / revenue) * 100 : 0,
      operatingMargin: revenue ? (operatingIncome / revenue) * 100 : 0,
      netMargin: revenue ? (netIncome / revenue) * 100 : 0
    };
  };

  const generateTrendData = () => {
    const months = ['Jan 2023', 'Feb 2023', 'Mar 2023', 'Apr 2023', 'May 2023', 'Jun 2023'];
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
      .filter(item => item.type === 'Expenses' && Math.abs(item.total) > 0)
      .map(item => ({
        name: item.name,
        value: Math.abs(item.total) // Use absolute value for pie chart
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
    // ✅ FIXED: Show natural accounting signs
    const displayValue = value;
    const isAbnormal = (item.type === 'Revenue' && value < 0) || (item.type === 'Expenses' && value < 0);
    
    return (
      <td className={`px-4 py-3 text-right text-sm font-medium ${
        displayValue >= 0 ? 'text-green-600' : 'text-red-600'
      }`}>
        {displayValue >= 0 ? formatCurrency(displayValue) : `(${formatCurrency(Math.abs(displayValue))})`}
        {isAbnormal && <span className="ml-1 text-yellow-500">⚠️</span>}
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
                    Supabase Connected • Multi-Property Debug Mode
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Real-time P&L by Property Class • Multi-Property Selection with Enhanced Debugging
                {realData?.summary && (
                  <span className="ml-2 text-green-600">
                    • {realData.summary.filteredEntries} entries loaded from {realData.summary.propertiesInData?.length || 0} properties
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
                onChange={(e) => {
                  console.log('📅 Month selection changed to:', e.target.value);
                  setSelectedMonth(e.target.value as MonthString);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm hover:border-blue-500 focus:outline-none focus:ring-2 transition-all"
                style={{ '--tw-ring-color': BRAND_COLORS.secondary + '33' } as React.CSSProperties}
              >
                {monthsList.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>

              {/* 🚀 ENHANCED Property Class Multi-Select Dropdown with Debugging */}
              <div className="relative">
                <button
                  onClick={() => {
                    console.log('🔽 Property dropdown toggle clicked');
                    setPropertyDropdownOpen(!propertyDropdownOpen);
                  }}
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
                        console.log('🔄 All Properties option clicked');
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
                                console.log('🔄 Individual property clicked:', property);
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
                onClick={() => {
                  console.log('🔄 Refresh button clicked');
                  loadRealFinancialData();
                }}
                disabled={isLoadingData}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingData ? 'animate-spin' : ''}`} />
                {isLoadingData ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* 🚀 ENHANCED Data Status with Multi-Property Debugging */}
          {realData && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-green-800 text-sm">
                <strong>✅ Data Status:</strong> Loaded {realData.summary.filteredEntries} entries 
                from Supabase • Multi-Property Selection Active
                <div className="mt-1 text-xs">
                  <strong>📅 Date Range:</strong> {realData.summary.dateRange} (STRICT {selectedMonth} ONLY)
                </div>
                <div className="mt-1 text-xs">
                  <strong>🏠 Selected Properties:</strong> {getSelectedPropertiesText()} 
                  ({Array.from(selectedProperties).join(', ')})
                </div>
                <div className="mt-1 text-xs">
                  <strong>📊 Properties in Data:</strong> {realData.summary.propertiesInData?.join(', ') || 'None'}
                </div>
                {realData.summary.propertyDistribution && (
                  <div className="mt-1 text-xs">
                    <strong>🔍 Property Distribution:</strong> {Object.entries(realData.summary.propertyDistribution).map(([prop, count]) => `${prop}: ${count}`).join(', ')}
                  </div>
                )}
                <div className="mt-1 text-xs">
                  <strong>🔍 Data Source:</strong> {realData.summary.dataSource}
                </div>
                <div className="mt-1 text-xs">
                  <strong>📈 Date Filtering:</strong> {realData.summary.originalEntries || 0} original entries → 
                  {realData.summary.filteredEntries} after STRICT filtering 
                  {realData.summary.dateFiltered ? `(${realData.summary.dateFiltered} entries filtered out)` : ''}
                </div>
                <div className="mt-1 text-xs">
                  <strong>🗂️ Mapping Results:</strong> {realData.summary.mappingStats?.accountsTableMapped || 0} accounts table matches, 
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
                      {/* INCOME SECTION - Matching Your Google Sheets */}
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
                        .filter(item => item.type === 'Revenue' || 
                                       (item.original_type && item.original_type.toLowerCase().includes('income')))
                        .map((item) => {
                          const isExpandable = isExpandableAccount(item.name);
                          const isExpanded = expandedAccounts.has(item.name);
                          const isAbnormal = item.total < 0;
                          
                          return (
                            <React.Fragment key={`income-${item.name}`}>
                              {/* Parent Account Row */}
                              <tr className="hover:bg-gray-50">
                                <td className="px-6 py-2 text-left text-sm text-gray-700 pl-12">
                                  <div className="flex items-center">
                                    {isExpandable && (
                                      <button
                                        onClick={() => toggleAccountExpansion(item.name)}
                                        className="mr-2 hover:bg-gray-200 p-1 rounded transition-colors"
                                      >
                                        {isExpanded ? (
                                          <ChevronDown className="w-4 h-4 text-gray-500" />
                                        ) : (
                                          <ChevronRight className="w-4 h-4 text-gray-500" />
                                        )}
                                      </button>
                                    )}
                                    <span 
                                      className="cursor
Perfect! I can see you're showing me the current GitHub version. I'll give you the complete updated code with all our debugging features added.

Copy and paste this entire code into your GitHub src/app/financials/page.tsx file:

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
  hasSubAccounts?: boolean;
  subAccounts?: Record<string, any>;
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

// Enhanced data transformation functions
const transformFinancialData = (entries: FinancialEntry[], monthYear: string) => {
  console.log('🔍 TRANSFORM FINANCIAL DATA - Input entries:', entries.length);
  
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
    
    // ✅ FIXED: Remove Math.abs() for proper accounting signs
    let amount = 0;
    
    switch (acc[key].type) {
      case 'Revenue':
        amount = entry.line_amount || (entry.credit_amount - entry.debit_amount);
        // Revenue should show negative when abnormal (when debits > credits)
        break;
        
      case 'Expenses':
        amount = entry.line_amount || (entry.debit_amount - entry.credit_amount);
        // Expenses should show negative when abnormal (when credits > debits)
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

  console.log('🔍 TRANSFORM RESULT - P&L items:', plData.length, 'Balance Sheet items:', balanceSheetData.length);

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

// 🚀 ENHANCED Fetch financial data from Supabase with DEBUGGING
const fetchFinancialData = async (
  selectedProperties: Set<string>,
  monthYear: string
) => {
  try {
    console.log('🔍 FETCHING FINANCIAL DATA with filters:');
    console.log('📊 Selected properties:', Array.from(selectedProperties));
    console.log('📅 Month/Year:', monthYear);
    
    const [month, year] = monthYear.split(' ');
    const monthNum = new Date(`${month} 1, ${year}`).getMonth() + 1;
    
    // STRICT date filtering - exactly the month requested
    const startDate = `${year}-${monthNum.toString().padStart(2, '0')}-01`;
    const lastDay = new Date(parseInt(year), monthNum, 0).getDate();
    const endDate = `${year}-${monthNum.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
    
    console.log(`📅 STRICT DATE RANGE: ${startDate} to ${endDate} (${month} ${year} ONLY)`);
    
    // 🚀 ENHANCED: Multi-property selection support
    let propertyFilterArray = Array.from(selectedProperties);
    
    // Remove 'All Properties' from the filter array if present
    if (propertyFilterArray.includes('All Properties')) {
      propertyFilterArray = [];
      console.log('🏠 Using ALL PROPERTIES (no property filter)');
    } else {
      console.log('🏠 Filtering by specific properties:', propertyFilterArray);
    }
    
    // Use proper Supabase client from lib/supabase.ts
    console.log('🔗 Using Supabase client from lib/supabase.ts');
    
    let journalData;
    let accountsData;
    
    try {
      if (propertyFilterArray.length === 0) {
        // No property filter - get all properties
        console.log('🔍 SUPABASE QUERY: Getting ALL properties for date range');
        const result = await supabaseQueries.getJournalEntriesForDateRange(startDate, endDate);
        journalData = result.success ? result.data : [];
        console.log('📊 Query result:', result.success ? `${journalData.length} entries` : `Error: ${result.error}`);
      } else if (propertyFilterArray.length === 1) {
        // Single property filter
        const property = propertyFilterArray[0];
        console.log('🔍 SUPABASE QUERY: Using .eq() for single property:', property);
        const result = await supabaseQueries.getJournalEntriesForProperty(property, startDate, endDate);
        journalData = result.success ? result.data : [];
        console.log('📊 Query result:', result.success ? `${journalData.length} entries` : `Error: ${result.error}`);
      } else {
        // Multiple properties filter
        console.log('🔍 SUPABASE QUERY: Using .in() for multiple properties:', propertyFilterArray);
        const result = await supabaseQueries.getJournalEntriesForMultipleProperties(propertyFilterArray, startDate, endDate);
        journalData = result.success ? result.data : [];
        console.log('📊 Query result:', result.success ? `${journalData.length} entries` : `Error: ${result.error}`);
      }
      
      // Get accounts data
      const accountsResult = await supabaseQueries.getAllAccounts();
      accountsData = accountsResult.success ? accountsResult.data : [];
      
    } catch (queryError) {
      console.error('❌ Supabase query error:', queryError);
      throw new Error(`Database query failed: ${queryError.message}`);
    }
    
    console.log('📊 Journal entries loaded for STRICT date range:', journalData.length);
    
    // ADDITIONAL CLIENT-SIDE DATE VALIDATION to ensure no date leakage
    const filteredJournalData = journalData.filter((entry: any) => {
      const entryDate = new Date(entry.transaction_date);
      const entryYear = entryDate.getFullYear();
      const entryMonth = entryDate.getMonth() + 1; // getMonth() is 0-based
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
    
    console.log(`✅ STRICT FILTERING RESULT: ${filteredJournalData.length} entries (filtered out ${journalData.length - filteredJournalData.length} entries)`);
    
    // Debug: Show property distribution in the actual data
    const propertyDistribution = filteredJournalData.reduce((acc: Record<string, number>, entry: any) => {
      const prop = entry.property_class || 'No Property';
      acc[prop] = (acc[prop] || 0) + 1;
      return acc;
    }, {});
    
    console.log('🏠 PROPERTY DISTRIBUTION in fetched data:', propertyDistribution);
    console.log('🔍 SELECTED PROPERTIES filter was:', Array.from(selectedProperties));
    
    // Debug: Show date range of actual entries
    if (filteredJournalData.length > 0) {
      const dates = filteredJournalData.map((e: any) => e.transaction_date).sort();
      console.log(`📅 ACTUAL DATE RANGE in filtered data: ${dates[0]} to ${dates[dates.length - 1]}`);
    }
    
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

    // Enhanced classification for journal entries to match your Google Sheets structure
    const classifyJournalAccount = (entry: any) => {
      const accountName = entry.account_name || '';
      const name = accountName.toLowerCase();
      const description = (entry.description || '').toLowerCase();
      
      // Revenue/Income classification - matching your Google Sheets exactly
      if (name.includes('rental revenue - airbnb') || 
          name.includes('rental revenue - direct') ||
          name.includes('rental revenue - guesty') ||
          name.includes('rental revenue - reserve payout') ||
          name.includes('rental revenue - vrbo') ||
          name.includes('direct booking') ||
          name.includes('direct revenue') ||
          name.includes('bookings') ||
          name.includes('income') || 
          name.includes('revenue') ||
          name.includes('rent') || 
          name.includes('airbnb') ||
          name.includes('guesty') ||
          name.includes('vrbo') ||
          name.includes('adjustment for occupancy taxes') ||
          name.includes('miscellaneous income') ||
          name.includes('resolution adjustments') ||
          // Check description for reclassification entries
          description.includes('reclassify') ||
          description.includes('move income') ||
          description.includes('transfer') ||
          description.includes('direct booking') ||
          description.includes('guesty to direct') ||
          // Standard revenue patterns
          entry.credit_amount > 0 && entry.debit_amount === 0) {
        return { 
          type: 'Income', 
          classification: 'Revenue', 
          standardName: entry.account_name 
        };
      }
      
      // Expense classification - matching your actual expense categories
      if (name.includes('advertising') || name.includes('marketing') ||
          name.includes('facebook') || name.includes('google') ||
          name.includes('arcade') || name.includes('bank fee') || 
          name.includes('disposal') || name.includes('waste') ||
          name.includes('insurance') || name.includes('internet') || 
          name.includes('tv service') || name.includes('cleaning') ||
          name.includes('labor') || name.includes('meal') || 
          name.includes('membership') || name.includes('subscription') ||
          name.includes('office') || name.includes('shipping') || 
          name.includes('postage') || name.includes('pool') || 
          name.includes('hot tub') || name.includes('maintenance') ||
          name.includes('repair') || name.includes('upgrade') ||
          name.includes('snow') || name.includes('lawn') || 
          name.includes('supplies') || name.includes('travel') ||
          name.includes('utilities') || name.includes('water') || 
          name.includes('sewer') || name.includes('expense') || 
          name.includes('cost') ||
          entry.debit_amount > 0 && entry.credit_amount === 0) {
        return { 
          type: 'Expenses', 
          classification: 'Expenses', 
          standardName: entry.account_name 
        };
      }
      
      // Interest expense (separate category)
      if (name.includes('mortgage') || name.includes('interest')) {
        return { 
          type: 'Interest Expense', 
          classification: 'Other Expenses', 
          standardName: entry.account_name 
        };
      }
      
      // Asset classification
      if (name.includes('improvements') || name.includes('property') || 
          name.includes('equipment') || name.includes('cash') ||
          name.includes('bank') || name.includes('checking') ||
          name.includes('savings') || name.includes('receivable') ||
          entry.account_type === 'Fixed Assets') {
        return { 
          type: 'Fixed Assets', 
          classification: 'Assets', 
          standardName: entry.account_name 
        };
      }
      
      // Liability classification
      if (name.includes('loan') || name.includes('payable') || 
          name.includes('credit card') || name.includes('debt') || 
          name.includes('liability') || entry.account_type === 'Credit Card') {
        return { 
          type: 'Credit Card', 
          classification: 'Liabilities', 
          standardName: entry.account_name 
        };
      }
      
      // ENHANCED DEFAULT CLASSIFICATION for reclassification entries
      // For reclassification entries, look at the net effect and description
      if (description.includes('reclassify') || description.includes('transfer') || description.includes('move')) {
        // For reclassification entries, classify based on the account name pattern and net effect
        if (name.includes('revenue') || name.includes('income') || name.includes('rental') || name.includes('booking')) {
          return { 
            type: 'Income', 
            classification: 'Revenue', 
            standardName: entry.account_name 
          };
        } else {
          return { 
            type: 'Expenses', 
            classification: 'Expenses', 
            standardName: entry.account_name 
          };
        }
      }
      
      // DEFAULT CLASSIFICATION: Use credit/debit logic with enhanced logging
      if (entry.credit_amount > entry.debit_amount || entry.line_amount < 0) {
        return { 
          type: 'Income', 
          classification: 'Revenue', 
          standardName: entry.account_name || 'Revenue Account'
        };
      } else if (entry.debit_amount > entry.credit_amount || entry.line_amount > 0) {
        return { 
          type: 'Expenses', 
          classification: 'Expenses', 
          standardName: entry.account_name || 'Expense Account'
        };
      } else {
        // Equal amounts - classify based on account name patterns
        if (name.includes('revenue') || name.includes('income') || name.includes('rental')) {
          return { 
            type: 'Income', 
            classification: 'Revenue', 
            standardName: entry.account_name 
          };
        } else {
          return { 
            type: 'Other', 
            classification: 'Other', 
            standardName: entry.account_name || 'Other Account'
          };
        }
      }
    };

    // Process journal entries using the STRICTLY FILTERED data
    const enhancedData = filteredJournalData.map((entry: any) => {
      // First: Try to find exact match in your accounts table
      let accountInfo = accountLookupMap.get(entry.account_name);
      
      if (!accountInfo) {
        // Use the account_type directly from the journal entry - no guessing!
        accountInfo = {
          type: entry.account_type,
          classification: entry.account_type === 'Income' ? 'Revenue' : 
                         entry.account_type === 'Expenses' ? 'Expenses' :
                         entry.account_type === 'Cost of Goods Sold' ? 'Expenses' :
                         entry.account_type === 'Other Income' ? 'Revenue' :
                         entry.account_type === 'Other Expenses' ? 'Expenses' :
                         entry.account_type === 'Interest Expense' ? 'Other Expenses' :
                         entry.account_type, // Default to whatever the journal entry says
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
        filters: { selectedProperties: Array.from(selectedProperties), monthYear },
        accountTypes: [...new Set(accountsData.map((a: any) => a.account_type))],
        propertiesInData: [...new Set(enhancedData.map((e: any) => e.property_class))],
        propertyDistribution,
        mappingStats: {
          totalEntries: enhancedData?.length || 0,
          accountsTableMapped: enhancedData?.filter((e: any) => e.mapping_method === 'Accounts Table').length || 0,
          fallbackMapped: enhancedData?.filter((e: any) => e.mapping_method === 'Journal Entry Type').length || 0
        }
      }
    };
  } catch (error) {
    console.error('❌ Error fetching financial data:', error);
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

// Expandable account data for detailed views
const accountDetails: Record<string, FinancialDataItem[]> = {
  'Revenue': [
    { name: 'Product Sales', total: 850000, months: { 'June 2025': 850000 } },
    { name: 'Service Revenue', total: 300000, months: { 'June 2025': 300000 } },
    { name: 'Licensing Fees', total: 75000, months: { 'June 2025': 75000 } },
    { name: 'Other Revenue', total: 25000, months: { 'June 2025': 25000 } },
  ],
  'Cost of Goods Sold': [
    { name: 'Direct Materials', total: 450000, months: { 'June 2025': 450000 } },
    { name: 'Direct Labor', total: 200000, months: { 'June 2025': 200000 } },
    { name: 'Manufacturing Overhead', total: 100000, months: { 'June 2025': 100000 } },
  ],
};

// Sub-detail breakdowns
const subAccountDetails: Record<string, Array<{name: string, amount: number}>> = {
  'Direct Materials': [
    { name: 'Raw Steel', amount: 180000 },
    { name: 'Electronic Components', amount: 120000 },
    { name: 'Packaging Materials', amount: 85000 },
  ],
  'Direct Labor': [
    { name: 'Production Workers', amount: 120000 },
    { name: 'Assembly Technicians', amount: 45000 },
    { name: 'Quality Inspectors', amount: 25000 },
  ],
};

export default function FinancialsPage() {
  const [activeTab, setActiveTab] = useState<FinancialTab>('p&l');
  const [selectedMonth, setSelectedMonth] = useState<MonthString>('May 2025');
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
    console.log('🚀 USEEFFECT: Initial data load triggered');
    loadInitialData();
  }, []);

  // Load data when filters change with debugging
  useEffect(() => {
    console.log('🚀 USEEFFECT: Filter change detected');
    console.log('📊 selectedProperties changed to:', Array.from(selectedProperties));
    console.log('📅 selectedMonth changed to:', selectedMonth);
    loadRealFinancialData();
  }, [selectedProperties, selectedMonth]);

  const loadInitialData = async () => {
    try {
      console.log('🔄 LOADING INITIAL DATA...');
      setIsLoadingData(true);
      
      const propertiesResult = await supabaseQueries.getUniqueProperties();
      if (propertiesResult.success) {
        const properties = propertiesResult.data || [];
        
        // 🚀 ENHANCED: Property deduplication and sorting
        const uniqueProperties = [...new Set(properties)].filter(p => p && p.trim() !== '');
        const sortedProperties = ['All Properties', ...uniqueProperties.sort()];
        
        console.log('🏠 Available properties loaded and deduplicated:', sortedProperties);
        setAvailableProperties(sortedProperties);
      } else {
        console.error('❌ Failed to load properties:', propertiesResult.error);
        // Fallback properties
        setAvailableProperties([
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
        ]);
      }
      
      await loadRealFinancialData();
      
    } catch (error) {
      console.error('❌ Failed to load initial data:', error);
      setDataError('Failed to load initial data');
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadRealFinancialData = async () => {
    try {
      console.log('🔄 LOADING REAL FINANCIAL DATA...');
      console.log('📊 Current selectedProperties state:', Array.from(selectedProperties));
      console.log('📅 Current selectedMonth state:', selectedMonth);
      
      setIsLoadingData(true);
      setDataError(null);
      
      const rawData = await fetchFinancialData(selectedProperties, selectedMonth);
      
      if (rawData.success) {
        const entries = rawData.data as FinancialEntry[];
        
        console.log('✅ RAW DATA SUCCESS:', entries.length, 'entries');
        console.log('🔍 Sample entries:', entries.slice(0, 3));
        
        const transformedPL = transformFinancialData(entries, selectedMonth);
        const transformedCF = transformCashFlowData(entries);

        const combinedData = {
          success: true,
          ...transformedPL,
          ...transformedCF,
          summary: {
            ...rawData.summary,
            propertiesInData: [...new Set(entries.map(e => e.property_class))],
            selectedFilters: {
              properties: Array.from(selectedProperties),
              month: selectedMonth
            }
          },
          performance: {
            executionTimeMs: Date.now() % 1000
          },
          rawEntries: entries.slice(0, 5)
        };

        setRealData(combinedData);
        setDataError(null);
        
        const propertyText = selectedProperties.has('All Properties') 
          ? 'all properties' 
          : `${selectedProperties.size} selected properties`;
          
        showNotification(`✅ Loaded ${entries.length} entries for ${propertyText} in ${selectedMonth}`, 'success');
        
        console.log('🎉 DATA LOADING COMPLETE - Combined data set successfully');
      } else {
        console.error('❌ RAW DATA FAILED:', rawData.error);
        setDataError(rawData.error || 'Failed to load financial data');
        showNotification('❌ Failed to load financial data', 'error');
      }
      
    } catch (error) {
      console.error('❌ Exception in loadRealFinancialData:', error);
      setDataError('Failed to load financial data');
      showNotification('❌ Failed to load financial data', 'error');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handlePropertyToggle = (property: string) => {
    console.log('🏠 Property toggle debugging: property=', property);
    console.log('📊 Current selectedProperties before toggle:', Array.from(selectedProperties));
    
    const newSelected = new Set(selectedProperties);
    
    if (property === 'All Properties') {
      console.log('🔄 Selecting All Properties');
      newSelected.clear();
      newSelected.add('All Properties');
    } else {
      console.log('🔄 Toggling individual property:', property);
      newSelected.delete('All Properties');
      
      if (newSelected.has(property)) {
        console.log('➖ Removing property:', property);
        newSelected.delete(property);
      } else {
        console.log('➕ Adding property:', property);
        newSelected.add(property);
      }
      
      if (newSelected.size === 0) {
        console.log('🔄 No properties selected, defaulting to All Properties');
        newSelected.add('All Properties');
      }
    }
    
    console.log('📊 New selectedProperties after toggle:', Array.from(newSelected));
    console.log('📊 selectedProperties size:', newSelected.size);
    
    setSelectedProperties(newSelected);
    console.log('✅ Property selection state updated');
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

  const isExpandableAccount = (accountName: string): boolean => {
    // Check if it's in the static expandable accounts OR if it has sub-accounts
    const currentDataItem = currentData.find(item => item.name === accountName);
    return accountDetails.hasOwnProperty(accountName) || 
           (currentDataItem && currentDataItem.hasSubAccounts);
  };

  const handleAccountMouseEnter = (event: React.MouseEvent<HTMLElement>, accountItem: FinancialDataItem): void => {
    // Check if this account has real transaction entries
    if (!accountItem.entries || accountItem.entries.length === 0) return;

    const rect = (event.target as HTMLElement).getBoundingClientRect();
    
    // Build tooltip content with actual transaction details
    let tooltipContent = `<div style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 4px;">
      ${accountItem.name} • ${formatCurrency(accountItem.total)}
    </div>`;

    tooltipContent += `<div style="font-size: 11px; color: #E5E7EB; margin-bottom: 8px;">
      ${accountItem.entries.length} Journal Entries • Mapping: ${accountItem.mapping_method}
    </div>`;

    // Show up to 5 most recent transactions
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
                ${entry.amount_used >= 0 ? formatCurrency(entry.amount_used) : `(${formatCurrency(Math.abs(entry.amount_used))})`}
                ${entry.amount_used < 0 ? ' ⚠️' : ''}
              </span>
            </div>
          </div>
        </div>
      `;
    });

    // Add summary if there are more entries
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
  };

  const handleSubAccountMouseEnter = (event: React.MouseEvent<HTMLElement>, subAccountItem: any): void => {
    // Handle both new sub-account structure and old static structure
    if (typeof subAccountItem === 'object' && subAccountItem.entries) {
      // New sub-account with real transaction data
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      
      let tooltipContent = `<div style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 4px;">
        ${subAccountItem.name} • ${formatCurrency(subAccountItem.total)}
      </div>`;

      tooltipContent += `<div style="font-size: 11px; color: #E5E7EB; margin-bottom: 8px;">
        ${subAccountItem.entries.length} Journal Entries • Property: ${subAccountItem.name}
      </div>`;

      // Show up to 3 most recent transactions for sub-accounts
      const recentEntries = subAccountItem.entries.slice(0, 3);
      
      recentEntries.forEach((entry: any, index: number) => {
        const entryDate = new Date(entry.transaction_date).toLocaleDateString();
        const isLast = index === recentEntries.length - 1;
        
        tooltipContent += `
          <div style="margin-bottom: ${isLast ? '0' : '6px'}; padding: 4px; background: rgba(255,255,255,0.1); border-radius: 4px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; align-items: center; gap: 4px;">
                <div style="width: 4px; height: 4px; background: #10B981; border-radius: 50%;"></div>
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
                  ${entry.property || 'No Property'}
                </span>
                <span style="font-size: 11px; font-weight: bold; color: #10B981;">
                  ${formatCurrency(Math.abs(entry.amount_used))}
                </span>
              </div>
            </div>
          </div>
        `;
      });

      if (subAccountItem.entries.length > 3) {
        tooltipContent += `
          <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.2); text-align: center;">
            <span style="font-size: 10px; color: #D1D5DB; font-style: italic;">
              + ${subAccountItem.entries.length - 3} more entries
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
    } else {
      // Fallback to old static sub-account handling
      handleSubAccountMouseEnterStatic(event, subAccountItem, typeof subAccountItem === 'string' ? 0 : subAccountItem);
    }
  };

  const handleSubAccountMouseEnterStatic = (event: React.MouseEvent<HTMLElement>, subAccountName: string, subAccountTotal: number): void => {
    const details = subAccountDetails[subAccountName];
    if (!details || details.length === 0) return;

    let tooltipContent = `<div style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 4px;">
      ${subAccountName} • ${formatCurrency(subAccountTotal)}
    </div>`;

    details.forEach((item, index) => {
      const percentage = subAccountTotal ? ((item.amount / subAccountTotal) * 100).toFixed(1) : '0';
      
      tooltipContent += `
        <div style="margin-bottom: ${index < details.length - 1 ? '8px' : '0'};">
          <div style="display: flex; align-items: center; gap: 4px;">
            <div style="width: 6px; height: 6px; background: ${BRAND_COLORS.success}; border-radius: 50%;"></div>
            <strong style="font-size: 12px; color: white;">${item.name}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-left: 10px;">
            <span style="font-size: 11px;">${formatCurrency(item.amount)}</span>
            <span style="font-size: 10px; background: rgba(255,255,255,0.2); padding: 2px 6px; border-radius: 10px;">${percentage}%</span>
          </div>
        </div>
      `;
    });

    const rect = (event.target as HTMLElement).getBoundingClientRect();
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

    // ✅ FIXED: Remove Math.abs() to preserve proper accounting signs
    const revenue = currentData
      .filter(item => item.type === 'Revenue' || 
                     (item.original_type && item.original_type.toLowerCase().includes('income')))
      .reduce((sum, item) => sum + item.total, 0); // Keep natural sign

    const cogs = currentData
      .filter(item => item.original_type === 'Cost of Goods Sold')
      .reduce((sum, item) => sum + item.total, 0); // Keep natural sign

    const operatingExpenses = currentData
      .filter(item => item.type === 'Expenses' && 
                     item.original_type !== 'Interest Expense')
      .reduce((sum, item) => sum + item.total, 0); // Keep natural sign

    const interestExpense = currentData
      .filter(item => item.original_type === 'Interest Expense' ||
                     item.name.toLowerCase().includes('mortgage interest'))
      .reduce((sum, item) => sum + item.total, 0); // Keep natural sign

    const otherIncome = currentData
      .filter(item => item.original_type === 'Other Income')
      .reduce((sum, item) => sum + item.total, 0); // Keep natural sign

    const otherExpenses = currentData
      .filter(item => item.name.toLowerCase().includes('other expense') &&
                     !item.name.toLowerCase().includes('interest'))
      .reduce((sum, item) => sum + item.total, 0); // Keep natural sign

    // Calculate derived metrics with proper signs
    const grossProfit = revenue - Math.abs(cogs); // COGS should reduce gross profit
    const operatingIncome = grossProfit - Math.abs(operatingExpenses); // Expenses should reduce operating income
    const netOperatingIncome = operatingIncome - Math.abs(interestExpense); // Interest should reduce income
    const netIncome = netOperatingIncome + otherIncome - Math.abs(otherExpenses); // Other expenses should reduce net income

    return {
      revenue,
      cogs: Math.abs(cogs), // Show as positive for display
      grossProfit,
      operatingExpenses: Math.abs(operatingExpenses), // Show as positive for display
      operatingIncome,
      interestExpense: Math.abs(interestExpense), // Show as positive for display
      netOperatingIncome,
      otherIncome,
      otherExpenses: Math.abs(otherExpenses), // Show as positive for display
      netIncome,
      grossMargin: revenue ? (grossProfit / revenue) * 100 : 0,
      operatingMargin: revenue ? (operatingIncome / revenue) * 100 : 0,
      netMargin: revenue ? (netIncome / revenue) * 100 : 0
    };
  };

  const generateTrendData = () => {
    const months = ['Jan 2023', 'Feb 2023', 'Mar 2023', 'Apr 2023', 'May 2023', 'Jun 2023'];
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
      .filter(item => item.type === 'Expenses' && Math.abs(item.total) > 0)
      .map(item => ({
        name: item.name,
        value: Math.abs(item.total) // Use absolute value for pie chart
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
    // ✅ FIXED: Show natural accounting signs
    const displayValue = value;
    const isAbnormal = (item.type === 'Revenue' && value < 0) || (item.type === 'Expenses' && value < 0);
    
    return (
      <td className={`px-4 py-3 text-right text-sm font-medium ${
        displayValue >= 0 ? 'text-green-600' : 'text-red-600'
      }`}>
        {displayValue >= 0 ? formatCurrency(displayValue) : `(${formatCurrency(Math.abs(displayValue))})`}
        {isAbnormal && <span className="ml-1 text-yellow-500">⚠️</span>}
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
                    Supabase Connected • Multi-Property Debug Mode
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Real-time P&L by Property Class • Multi-Property Selection with Enhanced Debugging
                {realData?.summary && (
                  <span className="ml-2 text-green-600">
                    • {realData.summary.filteredEntries} entries loaded from {realData.summary.propertiesInData?.length || 0} properties
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
                onChange={(e) => {
                  console.log('📅 Month selection changed to:', e.target.value);
                  setSelectedMonth(e.target.value as MonthString);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm hover:border-blue-500 focus:outline-none focus:ring-2 transition-all"
                style={{ '--tw-ring-color': BRAND_COLORS.secondary + '33' } as React.CSSProperties}
              >
                {monthsList.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>

              {/* 🚀 ENHANCED Property Class Multi-Select Dropdown with Debugging */}
              <div className="relative">
                <button
                  onClick={() => {
                    console.log('🔽 Property dropdown toggle clicked');
                    setPropertyDropdownOpen(!propertyDropdownOpen);
                  }}
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
                        console.log('🔄 All Properties option clicked');
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
                                console.log('🔄 Individual property clicked:', property);
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
                onClick={() => {
                  console.log('🔄 Refresh button clicked');
                  loadRealFinancialData();
                }}
                disabled={isLoadingData}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingData ? 'animate-spin' : ''}`} />
                {isLoadingData ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* 🚀 ENHANCED Data Status with Multi-Property Debugging */}
          {realData && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-green-800 text-sm">
                <strong>✅ Data Status:</strong> Loaded {realData.summary.filteredEntries} entries 
                from Supabase • Multi-Property Selection Active
                <div className="mt-1 text-xs">
                  <strong>📅 Date Range:</strong> {realData.summary.dateRange} (STRICT {selectedMonth} ONLY)
                </div>
                <div className="mt-1 text-xs">
                  <strong>🏠 Selected Properties:</strong> {getSelectedPropertiesText()} 
                  ({Array.from(selectedProperties).join(', ')})
                </div>
                <div className="mt-1 text-xs">
                  <strong>📊 Properties in Data:</strong> {realData.summary.propertiesInData?.join(', ') || 'None'}
                </div>
                {realData.summary.propertyDistribution && (
                  <div className="mt-1 text-xs">
                    <strong>🔍 Property Distribution:</strong> {Object.entries(realData.summary.propertyDistribution).map(([prop, count]) => `${prop}: ${count}`).join(', ')}
                  </div>
                )}
                <div className="mt-1 text-xs">
                  <strong>🔍 Data Source:</strong> {realData.summary.dataSource}
                </div>
                <div className="mt-1 text-xs">
                  <strong>📈 Date Filtering:</strong> {realData.summary.originalEntries || 0} original entries → 
                  {realData.summary.filteredEntries} after STRICT filtering 
                  {realData.summary.dateFiltered ? `(${realData.summary.dateFiltered} entries filtered out)` : ''}
                </div>
                <div className="mt-1 text-xs">
                  <strong>🗂️ Mapping Results:</strong> {realData.summary.mappingStats?.accountsTableMapped || 0} accounts table matches, 
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
                          {/* INCOME SECTION - Matching Your Google Sheets */}
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
                            .filter(item => item.type === 'Revenue' || 
                                           (item.original_type && item.original_type.toLowerCase().includes('income')))
                            .map((item) => {
                              const isExpandable = isExpandableAccount(item.name);
                              const isExpanded = expandedAccounts.has(item.name);
                              const isAbnormal = item.total < 0;
                              
                              return (
                                <React.Fragment key={`income-${item.name}`}>
                                  {/* Parent Account Row */}
                                  <tr className="hover:bg-gray-50">
                                    <td className="px-6 py-2 text-left text-sm text-gray-700 pl-12">
                                      <div className="flex items-center">
                                        {isExpandable && (
                                          <button
                                            onClick={() => toggleAccountExpansion(item.name)}
                                            className="mr-2 hover:bg-gray-200 p-1 rounded transition-colors"
                                          >
                                            {isExpanded ? (
                                              <ChevronDown className="w-4 h-4 text-gray-500" />
                                            ) : (
                                              <ChevronRight className="w-4 h-4 text-gray-500" />
                                            )}
                                          </button>
                                        )}
                                        <span 
                                          className="cursor-help"
                                          onMouseEnter={(e) => handleAccountMouseEnter(e, item)}
                                          onMouseLeave={handleAccountMouseLeave}
                                        >
                                          {item.name}
                                          {isAbnormal && <span className="ml-2 text-yellow-500">⚠️ Abnormal Balance</span>}
                                          {item.entries && item.entries.length > 0 && (
                                            <span className="ml-2 text-xs text-gray-500">
                                              ({item.entries.reduce((props: Set<string>, entry: any) => props.add(entry.property || 'No Property'), new Set()).size} properties)
                                            </span>
                                          )}
                                        </span>
                                      </div>
                                    </td>
                                    <td className={`px-4 py-2 text-right text-sm ${item.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {item.total >= 0 ? formatCurrency(item.total) : `(${formatCurrency(Math.abs(item.total))})`}
                                    </td>
                                    <td className="px-4 py-2 text-right text-sm text-gray-500">
                                      {kpis.revenue ? calculatePercentage(Math.abs(item.total), kpis.revenue) : '0%'}
                                    </td>
                                  </tr>
                                  
                                  {/* Sub-Account Details (when expanded) */}
                                  {isExpandable && isExpanded && item.hasSubAccounts && 
                                    Object.values(item.subAccounts || {}).map((subAccount: any) => (
                                      <tr key={`${item.name}-${subAccount.name}`} className="bg-blue-50 hover:bg-blue-100 transition-colors">
                                        <td className="px-6 py-2 text-left text-sm text-gray-600 pl-20">
                                          <div className="flex items-center">
                                            <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                                            <span 
                                              className="cursor-help"
                                              onMouseEnter={(e) => handleSubAccountMouseEnter(e, subAccount)}
                                              onMouseLeave={handleAccountMouseLeave}
                                            >
                                              {subAccount.name}
                                            </span>
                                          </div>
                                        </td>
                                        <td className="px-4 py-2 text-right text-sm text-green-600">
                                          {formatCurrency(Math.abs(subAccount.total))}
                                        </td>
                                        <td className="px-4 py-2 text-right text-sm text-gray-500">
                                          {item.total ? calculatePercentage(Math.abs(subAccount.total), Math.abs(item.total)) : '0%'}
                                        </td>
                                      </tr>
                                    ))
                                  }
                                  
                                  {/* Static Sub-Account Details (for demo accounts) */}
                                  {isExpandable && isExpande
Perfect! I can see you're showing me the current GitHub version. I'll give you the complete updated code with all our debugging features added.

Copy and paste this entire code into your GitHub src/app/financials/page.tsx file:

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
  hasSubAccounts?: boolean;
  subAccounts?: Record<string, any>;
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

// Enhanced data transformation functions
const transformFinancialData = (entries: FinancialEntry[], monthYear: string) => {
  console.log('🔍 TRANSFORM FINANCIAL DATA - Input entries:', entries.length);
  
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
    
    // ✅ FIXED: Remove Math.abs() for proper accounting signs
    let amount = 0;
    
    switch (acc[key].type) {
      case 'Revenue':
        amount = entry.line_amount || (entry.credit_amount - entry.debit_amount);
        // Revenue should show negative when abnormal (when debits > credits)
        break;
        
      case 'Expenses':
        amount = entry.line_amount || (entry.debit_amount - entry.credit_amount);
        // Expenses should show negative when abnormal (when credits > debits)
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

  console.log('🔍 TRANSFORM RESULT - P&L items:', plData.length, 'Balance Sheet items:', balanceSheetData.length);

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

// 🚀 ENHANCED Fetch financial data from Supabase with DEBUGGING
const fetchFinancialData = async (
  selectedProperties: Set<string>,
  monthYear: string
) => {
  try {
    console.log('🔍 FETCHING FINANCIAL DATA with filters:');
    console.log('📊 Selected properties:', Array.from(selectedProperties));
    console.log('📅 Month/Year:', monthYear);
    
    const [month, year] = monthYear.split(' ');
    const monthNum = new Date(`${month} 1, ${year}`).getMonth() + 1;
    
    // STRICT date filtering - exactly the month requested
    const startDate = `${year}-${monthNum.toString().padStart(2, '0')}-01`;
    const lastDay = new Date(parseInt(year), monthNum, 0).getDate();
    const endDate = `${year}-${monthNum.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
    
    console.log(`📅 STRICT DATE RANGE: ${startDate} to ${endDate} (${month} ${year} ONLY)`);
    
    // 🚀 ENHANCED: Multi-property selection support
    let propertyFilterArray = Array.from(selectedProperties);
    
    // Remove 'All Properties' from the filter array if present
    if (propertyFilterArray.includes('All Properties')) {
      propertyFilterArray = [];
      console.log('🏠 Using ALL PROPERTIES (no property filter)');
    } else {
      console.log('🏠 Filtering by specific properties:', propertyFilterArray);
    }
    
    // Use proper Supabase client from lib/supabase.ts
    console.log('🔗 Using Supabase client from lib/supabase.ts');
    
    let journalData;
    let accountsData;
    
    try {
      if (propertyFilterArray.length === 0) {
        // No property filter - get all properties
        console.log('🔍 SUPABASE QUERY: Getting ALL properties for date range');
        const result = await supabaseQueries.getJournalEntriesForDateRange(startDate, endDate);
        journalData = result.success ? result.data : [];
        console.log('📊 Query result:', result.success ? `${journalData.length} entries` : `Error: ${result.error}`);
      } else if (propertyFilterArray.length === 1) {
        // Single property filter
        const property = propertyFilterArray[0];
        console.log('🔍 SUPABASE QUERY: Using .eq() for single property:', property);
        const result = await supabaseQueries.getJournalEntriesForProperty(property, startDate, endDate);
        journalData = result.success ? result.data : [];
        console.log('📊 Query result:', result.success ? `${journalData.length} entries` : `Error: ${result.error}`);
      } else {
        // Multiple properties filter
        console.log('🔍 SUPABASE QUERY: Using .in() for multiple properties:', propertyFilterArray);
        const result = await supabaseQueries.getJournalEntriesForMultipleProperties(propertyFilterArray, startDate, endDate);
        journalData = result.success ? result.data : [];
        console.log('📊 Query result:', result.success ? `${journalData.length} entries` : `Error: ${result.error}`);
      }
      
      // Get accounts data
      const accountsResult = await supabaseQueries.getAllAccounts();
      accountsData = accountsResult.success ? accountsResult.data : [];
      
    } catch (queryError) {
      console.error('❌ Supabase query error:', queryError);
      throw new Error(`Database query failed: ${queryError.message}`);
    }
    
    console.log('📊 Journal entries loaded for STRICT date range:', journalData.length);
    
    // ADDITIONAL CLIENT-SIDE DATE VALIDATION to ensure no date leakage
    const filteredJournalData = journalData.filter((entry: any) => {
      const entryDate = new Date(entry.transaction_date);
      const entryYear = entryDate.getFullYear();
      const entryMonth = entryDate.getMonth() + 1; // getMonth() is 0-based
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
    
    console.log(`✅ STRICT FILTERING RESULT: ${filteredJournalData.length} entries (filtered out ${journalData.length - filteredJournalData.length} entries)`);
    
    // Debug: Show property distribution in the actual data
    const propertyDistribution = filteredJournalData.reduce((acc: Record<string, number>, entry: any) => {
      const prop = entry.property_class || 'No Property';
      acc[prop] = (acc[prop] || 0) + 1;
      return acc;
    }, {});
    
    console.log('🏠 PROPERTY DISTRIBUTION in fetched data:', propertyDistribution);
    console.log('🔍 SELECTED PROPERTIES filter was:', Array.from(selectedProperties));
    
    // Debug: Show date range of actual entries
    if (filteredJournalData.length > 0) {
      const dates = filteredJournalData.map((e: any) => e.transaction_date).sort();
      console.log(`📅 ACTUAL DATE RANGE in filtered data: ${dates[0]} to ${dates[dates.length - 1]}`);
    }
    
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

    // Enhanced classification for journal entries to match your Google Sheets structure
    const classifyJournalAccount = (entry: any) => {
      const accountName = entry.account_name || '';
      const name = accountName.toLowerCase();
      const description = (entry.description || '').toLowerCase();
      
      // Revenue/Income classification - matching your Google Sheets exactly
      if (name.includes('rental revenue - airbnb') || 
          name.includes('rental revenue - direct') ||
          name.includes('rental revenue - guesty') ||
          name.includes('rental revenue - reserve payout') ||
          name.includes('rental revenue - vrbo') ||
          name.includes('direct booking') ||
          name.includes('direct revenue') ||
          name.includes('bookings') ||
          name.includes('income') || 
          name.includes('revenue') ||
          name.includes('rent') || 
          name.includes('airbnb') ||
          name.includes('guesty') ||
          name.includes('vrbo') ||
          name.includes('adjustment for occupancy taxes') ||
          name.includes('miscellaneous income') ||
          name.includes('resolution adjustments') ||
          // Check description for reclassification entries
          description.includes('reclassify') ||
          description.includes('move income') ||
          description.includes('transfer') ||
          description.includes('direct booking') ||
          description.includes('guesty to direct') ||
          // Standard revenue patterns
          entry.credit_amount > 0 && entry.debit_amount === 0) {
        return { 
          type: 'Income', 
          classification: 'Revenue', 
          standardName: entry.account_name 
        };
      }
      
      // Expense classification - matching your actual expense categories
      if (name.includes('advertising') || name.includes('marketing') ||
          name.includes('facebook') || name.includes('google') ||
          name.includes('arcade') || name.includes('bank fee') || 
          name.includes('disposal') || name.includes('waste') ||
          name.includes('insurance') || name.includes('internet') || 
          name.includes('tv service') || name.includes('cleaning') ||
          name.includes('labor') || name.includes('meal') || 
          name.includes('membership') || name.includes('subscription') ||
          name.includes('office') || name.includes('shipping') || 
          name.includes('postage') || name.includes('pool') || 
          name.includes('hot tub') || name.includes('maintenance') ||
          name.includes('repair') || name.includes('upgrade') ||
          name.includes('snow') || name.includes('lawn') || 
          name.includes('supplies') || name.includes('travel') ||
          name.includes('utilities') || name.includes('water') || 
          name.includes('sewer') || name.includes('expense') || 
          name.includes('cost') ||
          entry.debit_amount > 0 && entry.credit_amount === 0) {
        return { 
          type: 'Expenses', 
          classification: 'Expenses', 
          standardName: entry.account_name 
        };
      }
      
      // Interest expense (separate category)
      if (name.includes('mortgage') || name.includes('interest')) {
        return { 
          type: 'Interest Expense', 
          classification: 'Other Expenses', 
          standardName: entry.account_name 
        };
      }
      
      // Asset classification
      if (name.includes('improvements') || name.includes('property') || 
          name.includes('equipment') || name.includes('cash') ||
          name.includes('bank') || name.includes('checking') ||
          name.includes('savings') || name.includes('receivable') ||
          entry.account_type === 'Fixed Assets') {
        return { 
          type: 'Fixed Assets', 
          classification: 'Assets', 
          standardName: entry.account_name 
        };
      }
      
      // Liability classification
      if (name.includes('loan') || name.includes('payable') || 
          name.includes('credit card') || name.includes('debt') || 
          name.includes('liability') || entry.account_type === 'Credit Card') {
        return { 
          type: 'Credit Card', 
          classification: 'Liabilities', 
          standardName: entry.account_name 
        };
      }
      
      // ENHANCED DEFAULT CLASSIFICATION for reclassification entries
      // For reclassification entries, look at the net effect and description
      if (description.includes('reclassify') || description.includes('transfer') || description.includes('move')) {
        // For reclassification entries, classify based on the account name pattern and net effect
        if (name.includes('revenue') || name.includes('income') || name.includes('rental') || name.includes('booking')) {
          return { 
            type: 'Income', 
            classification: 'Revenue', 
            standardName: entry.account_name 
          };
        } else {
          return { 
            type: 'Expenses', 
            classification: 'Expenses', 
            standardName: entry.account_name 
          };
        }
      }
      
      // DEFAULT CLASSIFICATION: Use credit/debit logic with enhanced logging
      if (entry.credit_amount > entry.debit_amount || entry.line_amount < 0) {
        return { 
          type: 'Income', 
          classification: 'Revenue', 
          standardName: entry.account_name || 'Revenue Account'
        };
      } else if (entry.debit_amount > entry.credit_amount || entry.line_amount > 0) {
        return { 
          type: 'Expenses', 
          classification: 'Expenses', 
          standardName: entry.account_name || 'Expense Account'
        };
      } else {
        // Equal amounts - classify based on account name patterns
        if (name.includes('revenue') || name.includes('income') || name.includes('rental')) {
          return { 
            type: 'Income', 
            classification: 'Revenue', 
            standardName: entry.account_name 
          };
        } else {
          return { 
            type: 'Other', 
            classification: 'Other', 
            standardName: entry.account_name || 'Other Account'
          };
        }
      }
    };

    // Process journal entries using the STRICTLY FILTERED data
    const enhancedData = filteredJournalData.map((entry: any) => {
      // First: Try to find exact match in your accounts table
      let accountInfo = accountLookupMap.get(entry.account_name);
      
      if (!accountInfo) {
        // Use the account_type directly from the journal entry - no guessing!
        accountInfo = {
          type: entry.account_type,
          classification: entry.account_type === 'Income' ? 'Revenue' : 
                         entry.account_type === 'Expenses' ? 'Expenses' :
                         entry.account_type === 'Cost of Goods Sold' ? 'Expenses' :
                         entry.account_type === 'Other Income' ? 'Revenue' :
                         entry.account_type === 'Other Expenses' ? 'Expenses' :
                         entry.account_type === 'Interest Expense' ? 'Other Expenses' :
                         entry.account_type, // Default to whatever the journal entry says
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
        filters: { selectedProperties: Array.from(selectedProperties), monthYear },
        accountTypes: [...new Set(accountsData.map((a: any) => a.account_type))],
        propertiesInData: [...new Set(enhancedData.map((e: any) => e.property_class))],
        propertyDistribution,
        mappingStats: {
          totalEntries: enhancedData?.length || 0,
          accountsTableMapped: enhancedData?.filter((e: any) => e.mapping_method === 'Accounts Table').length || 0,
          fallbackMapped: enhancedData?.filter((e: any) => e.mapping_method === 'Journal Entry Type').length || 0
        }
      }
    };
  } catch (error) {
    console.error('❌ Error fetching financial data:', error);
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

// Expandable account data for detailed views
const accountDetails: Record<string, FinancialDataItem[]> = {
  'Revenue': [
    { name: 'Product Sales', total: 850000, months: { 'June 2025': 850000 } },
    { name: 'Service Revenue', total: 300000, months: { 'June 2025': 300000 } },
    { name: 'Licensing Fees', total: 75000, months: { 'June 2025': 75000 } },
    { name: 'Other Revenue', total: 25000, months: { 'June 2025': 25000 } },
  ],
  'Cost of Goods Sold': [
    { name: 'Direct Materials', total: 450000, months: { 'June 2025': 450000 } },
    { name: 'Direct Labor', total: 200000, months: { 'June 2025': 200000 } },
    { name: 'Manufacturing Overhead', total: 100000, months: { 'June 2025': 100000 } },
  ],
};

// Sub-detail breakdowns
const subAccountDetails: Record<string, Array<{name: string, amount: number}>> = {
  'Direct Materials': [
    { name: 'Raw Steel', amount: 180000 },
    { name: 'Electronic Components', amount: 120000 },
    { name: 'Packaging Materials', amount: 85000 },
  ],
  'Direct Labor': [
    { name: 'Production Workers', amount: 120000 },
    { name: 'Assembly Technicians', amount: 45000 },
    { name: 'Quality Inspectors', amount: 25000 },
  ],
};

export default function FinancialsPage() {
  const [activeTab, setActiveTab] = useState<FinancialTab>('p&l');
  const [selectedMonth, setSelectedMonth] = useState<MonthString>('May 2025');
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
    console.log('🚀 USEEFFECT: Initial data load triggered');
    loadInitialData();
  }, []);

  // Load data when filters change with debugging
  useEffect(() => {
    console.log('🚀 USEEFFECT: Filter change detected');
    console.log('📊 selectedProperties changed to:', Array.from(selectedProperties));
    console.log('📅 selectedMonth changed to:', selectedMonth);
    loadRealFinancialData();
  }, [selectedProperties, selectedMonth]);

  const loadInitialData = async () => {
    try {
      console.log('🔄 LOADING INITIAL DATA...');
      setIsLoadingData(true);
      
      const propertiesResult = await supabaseQueries.getUniqueProperties();
      if (propertiesResult.success) {
        const properties = propertiesResult.data || [];
        
        // 🚀 ENHANCED: Property deduplication and sorting
        const uniqueProperties = [...new Set(properties)].filter(p => p && p.trim() !== '');
        const sortedProperties = ['All Properties', ...uniqueProperties.sort()];
        
        console.log('🏠 Available properties loaded and deduplicated:', sortedProperties);
        setAvailableProperties(sortedProperties);
      } else {
        console.error('❌ Failed to load properties:', propertiesResult.error);
        // Fallback properties
        setAvailableProperties([
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
        ]);
      }
      
      await loadRealFinancialData();
      
    } catch (error) {
      console.error('❌ Failed to load initial data:', error);
      setDataError('Failed to load initial data');
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadRealFinancialData = async () => {
    try {
      console.log('🔄 LOADING REAL FINANCIAL DATA...');
      console.log('📊 Current selectedProperties state:', Array.from(selectedProperties));
      console.log('📅 Current selectedMonth state:', selectedMonth);
      
      setIsLoadingData(true);
      setDataError(null);
      
      const rawData = await fetchFinancialData(selectedProperties, selectedMonth);
      
      if (rawData.success) {
        const entries = rawData.data as FinancialEntry[];
        
        console.log('✅ RAW DATA SUCCESS:', entries.length, 'entries');
        console.log('🔍 Sample entries:', entries.slice(0, 3));
        
        const transformedPL = transformFinancialData(entries, selectedMonth);
        const transformedCF = transformCashFlowData(entries);

        const combinedData = {
          success: true,
          ...transformedPL,
          ...transformedCF,
          summary: {
            ...rawData.summary,
            propertiesInData: [...new Set(entries.map(e => e.property_class))],
            selectedFilters: {
              properties: Array.from(selectedProperties),
              month: selectedMonth
            }
          },
          performance: {
            executionTimeMs: Date.now() % 1000
          },
          rawEntries: entries.slice(0, 5)
        };

        setRealData(combinedData);
        setDataError(null);
        
        const propertyText = selectedProperties.has('All Properties') 
          ? 'all properties' 
          : `${selectedProperties.size} selected properties`;
          
        showNotification(`✅ Loaded ${entries.length} entries for ${propertyText} in ${selectedMonth}`, 'success');
        
        console.log('🎉 DATA LOADING COMPLETE - Combined data set successfully');
      } else {
        console.error('❌ RAW DATA FAILED:', rawData.error);
        setDataError(rawData.error || 'Failed to load financial data');
        showNotification('❌ Failed to load financial data', 'error');
      }
      
    } catch (error) {
      console.error('❌ Exception in loadRealFinancialData:', error);
      setDataError('Failed to load financial data');
      showNotification('❌ Failed to load financial data', 'error');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handlePropertyToggle = (property: string) => {
    console.log('🏠 Property toggle debugging: property=', property);
    console.log('📊 Current selectedProperties before toggle:', Array.from(selectedProperties));
    
    const newSelected = new Set(selectedProperties);
    
    if (property === 'All Properties') {
      console.log('🔄 Selecting All Properties');
      newSelected.clear();
      newSelected.add('All Properties');
    } else {
      console.log('🔄 Toggling individual property:', property);
      newSelected.delete('All Properties');
      
      if (newSelected.has(property)) {
        console.log('➖ Removing property:', property);
        newSelected.delete(property);
      } else {
        console.log('➕ Adding property:', property);
        newSelected.add(property);
      }
      
      if (newSelected.size === 0) {
        console.log('🔄 No properties selected, defaulting to All Properties');
        newSelected.add('All Properties');
      }
    }
    
    console.log('📊 New selectedProperties after toggle:', Array.from(newSelected));
    console.log('📊 selectedProperties size:', newSelected.size);
    
    setSelectedProperties(newSelected);
    console.log('✅ Property selection state updated');
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

  const isExpandableAccount = (accountName: string): boolean => {
    // Check if it's in the static expandable accounts OR if it has sub-accounts
    const currentDataItem = currentData.find(item => item.name === accountName);
    return accountDetails.hasOwnProperty(accountName) || 
           (currentDataItem && currentDataItem.hasSubAccounts);
  };

  const handleAccountMouseEnter = (event: React.MouseEvent<HTMLElement>, accountItem: FinancialDataItem): void => {
    // Check if this account has real transaction entries
    if (!accountItem.entries || accountItem.entries.length === 0) return;

    const rect = (event.target as HTMLElement).getBoundingClientRect();
    
    // Build tooltip content with actual transaction details
    let tooltipContent = `<div style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 4px;">
      ${accountItem.name} • ${formatCurrency(accountItem.total)}
    </div>`;

    tooltipContent += `<div style="font-size: 11px; color: #E5E7EB; margin-bottom: 8px;">
      ${accountItem.entries.length} Journal Entries • Mapping: ${accountItem.mapping_method}
    </div>`;

    // Show up to 5 most recent transactions
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
                ${entry.amount_used >= 0 ? formatCurrency(entry.amount_used) : `(${formatCurrency(Math.abs(entry.amount_used))})`}
                ${entry.amount_used < 0 ? ' ⚠️' : ''}
              </span>
            </div>
          </div>
        </div>
      `;
    });

    // Add summary if there are more entries
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
  };

  const handleSubAccountMouseEnter = (event: React.MouseEvent<HTMLElement>, subAccountItem: any): void => {
    // Handle both new sub-account structure and old static structure
    if (typeof subAccountItem === 'object' && subAccountItem.entries) {
      // New sub-account with real transaction data
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      
      let tooltipContent = `<div style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 4px;">
        ${subAccountItem.name} • ${formatCurrency(subAccountItem.total)}
      </div>`;

      tooltipContent += `<div style="font-size: 11px; color: #E5E7EB; margin-bottom: 8px;">
        ${subAccountItem.entries.length} Journal Entries • Property: ${subAccountItem.name}
      </div>`;

      // Show up to 3 most recent transactions for sub-accounts
      const recentEntries = subAccountItem.entries.slice(0, 3);
      
      recentEntries.forEach((entry: any, index: number) => {
        const entryDate = new Date(entry.transaction_date).toLocaleDateString();
        const isLast = index === recentEntries.length - 1;
        
        tooltipContent += `
          <div style="margin-bottom: ${isLast ? '0' : '6px'}; padding: 4px; background: rgba(255,255,255,0.1); border-radius: 4px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; align-items: center; gap: 4px;">
                <div style="width: 4px; height: 4px; background: #10B981; border-radius: 50%;"></div>
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
                  ${entry.property || 'No Property'}
                </span>
                <span style="font-size: 11px; font-weight: bold; color: #10B981;">
                  ${formatCurrency(Math.abs(entry.amount_used))}
                </span>
              </div>
            </div>
          </div>
        `;
      });

      if (subAccountItem.entries.length > 3) {
        tooltipContent += `
          <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.2); text-align: center;">
            <span style="font-size: 10px; color: #D1D5DB; font-style: italic;">
              + ${subAccountItem.entries.length - 3} more entries
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
    } else {
      // Fallback to old static sub-account handling
      handleSubAccountMouseEnterStatic(event, subAccountItem, typeof subAccountItem === 'string' ? 0 : subAccountItem);
    }
  };

  const handleSubAccountMouseEnterStatic = (event: React.MouseEvent<HTMLElement>, subAccountName: string, subAccountTotal: number): void => {
    const details = subAccountDetails[subAccountName];
    if (!details || details.length === 0) return;

    let tooltipContent = `<div style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 4px;">
      ${subAccountName} • ${formatCurrency(subAccountTotal)}
    </div>`;

    details.forEach((item, index) => {
      const percentage = subAccountTotal ? ((item.amount / subAccountTotal) * 100).toFixed(1) : '0';
      
      tooltipContent += `
        <div style="margin-bottom: ${index < details.length - 1 ? '8px' : '0'};">
          <div style="display: flex; align-items: center; gap: 4px;">
            <div style="width: 6px; height: 6px; background: ${BRAND_COLORS.success}; border-radius: 50%;"></div>
            <strong style="font-size: 12px; color: white;">${item.name}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-left: 10px;">
            <span style="font-size: 11px;">${formatCurrency(item.amount)}</span>
            <span style="font-size: 10px; background: rgba(255,255,255,0.2); padding: 2px 6px; border-radius: 10px;">${percentage}%</span>
          </div>
        </div>
      `;
    });

    const rect = (event.target as HTMLElement).getBoundingClientRect();
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

    // ✅ FIXED: Remove Math.abs() to preserve proper accounting signs
    const revenue = currentData
      .filter(item => item.type === 'Revenue' || 
                     (item.original_type && item.original_type.toLowerCase().includes('income')))
      .reduce((sum, item) => sum + item.total, 0); // Keep natural sign

    const cogs = currentData
      .filter(item => item.original_type === 'Cost of Goods Sold')
      .reduce((sum, item) => sum + item.total, 0); // Keep natural sign

    const operatingExpenses = currentData
      .filter(item => item.type === 'Expenses' && 
                     item.original_type !== 'Interest Expense')
      .reduce((sum, item) => sum + item.total, 0); // Keep natural sign

    const interestExpense = currentData
      .filter(item => item.original_type === 'Interest Expense' ||
                     item.name.toLowerCase().includes('mortgage interest'))
      .reduce((sum, item) => sum + item.total, 0); // Keep natural sign

    const otherIncome = currentData
      .filter(item => item.original_type === 'Other Income')
      .reduce((sum, item) => sum + item.total, 0); // Keep natural sign

    const otherExpenses = currentData
      .filter(item => item.name.toLowerCase().includes('other expense') &&
                     !item.name.toLowerCase().includes('interest'))
      .reduce((sum, item) => sum + item.total, 0); // Keep natural sign

    // Calculate derived metrics with proper signs
    const grossProfit = revenue - Math.abs(cogs); // COGS should reduce gross profit
    const operatingIncome = grossProfit - Math.abs(operatingExpenses); // Expenses should reduce operating income
    const netOperatingIncome = operatingIncome - Math.abs(interestExpense); // Interest should reduce income
    const netIncome = netOperatingIncome + otherIncome - Math.abs(otherExpenses); // Other expenses should reduce net income

    return {
      revenue,
      cogs: Math.abs(cogs), // Show as positive for display
      grossProfit,
      operatingExpenses: Math.abs(operatingExpenses), // Show as positive for display
      operatingIncome,
      interestExpense: Math.abs(interestExpense), // Show as positive for display
      netOperatingIncome,
      otherIncome,
      otherExpenses: Math.abs(otherExpenses), // Show as positive for display
      netIncome,
      grossMargin: revenue ? (grossProfit / revenue) * 100 : 0,
      operatingMargin: revenue ? (operatingIncome / revenue) * 100 : 0,
      netMargin: revenue ? (netIncome / revenue) * 100 : 0
    };
  };

  const generateTrendData = () => {
    const months = ['Jan 2023', 'Feb 2023', 'Mar 2023', 'Apr 2023', 'May 2023', 'Jun 2023'];
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
      .filter(item => item.type === 'Expenses' && Math.abs(item.total) > 0)
      .map(item => ({
        name: item.name,
        value: Math.abs(item.total) // Use absolute value for pie chart
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
    // ✅ FIXED: Show natural accounting signs
    const displayValue = value;
    const isAbnormal = (item.type === 'Revenue' && value < 0) || (item.type === 'Expenses' && value < 0);
    
    return (
      <td className={`px-4 py-3 text-right text-sm font-medium ${
        displayValue >= 0 ? 'text-green-600' : 'text-red-600'
      }`}>
        {displayValue >= 0 ? formatCurrency(displayValue) : `(${formatCurrency(Math.abs(displayValue))})`}
        {isAbnormal && <span className="ml-1 text-yellow-500">⚠️</span>}
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
                    Supabase Connected • Multi-Property Debug Mode
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Real-time P&L by Property Class • Multi-Property Selection with Enhanced Debugging
                {realData?.summary && (
                  <span className="ml-2 text-green-600">
                    • {realData.summary.filteredEntries} entries loaded from {realData.summary.propertiesInData?.length || 0} properties
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
                onChange={(e) => {
                  console.log('📅 Month selection changed to:', e.target.value);
                  setSelectedMonth(e.target.value as MonthString);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm hover:border-blue-500 focus:outline-none focus:ring-2 transition-all"
                style={{ '--tw-ring-color': BRAND_COLORS.secondary + '33' } as React.CSSProperties}
              >
                {monthsList.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>

              {/* 🚀 ENHANCED Property Class Multi-Select Dropdown with Debugging */}
              <div className="relative">
                <button
                  onClick={() => {
                    console.log('🔽 Property dropdown toggle clicked');
                    setPropertyDropdownOpen(!propertyDropdownOpen);
                  }}
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
                        console.log('🔄 All Properties option clicked');
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
                                console.log('🔄 Individual property clicked:', property);
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
                onClick={() => {
                  console.log('🔄 Refresh button clicked');
                  loadRealFinancialData();
                }}
                disabled={isLoadingData}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingData ? 'animate-spin' : ''}`} />
                {isLoadingData ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* 🚀 ENHANCED Data Status with Multi-Property Debugging */}
          {realData && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-green-800 text-sm">
                <strong>✅ Data Status:</strong> Loaded {realData.summary.filteredEntries} entries 
                from Supabase • Multi-Property Selection Active
                <div className="mt-1 text-xs">
                  <strong>📅 Date Range:</strong> {realData.summary.dateRange} (STRICT {selectedMonth} ONLY)
                </div>
                <div className="mt-1 text-xs">
                  <strong>🏠 Selected Properties:</strong> {getSelectedPropertiesText()} 
                  ({Array.from(selectedProperties).join(', ')})
                </div>
                <div className="mt-1 text-xs">
                  <strong>📊 Properties in Data:</strong> {realData.summary.propertiesInData?.join(', ') || 'None'}
                </div>
                {realData.summary.propertyDistribution && (
                  <div className="mt-1 text-xs">
                    <strong>🔍 Property Distribution:</strong> {Object.entries(realData.summary.propertyDistribution).map(([prop, count]) => `${prop}: ${count}`).join(', ')}
                  </div>
                )}
                <div className="mt-1 text-xs">
                  <strong>🔍 Data Source:</strong> {realData.summary.dataSource}
                </div>
                <div className="mt-1 text-xs">
                  <strong>📈 Date Filtering:</strong> {realData.summary.originalEntries || 0} original entries → 
                  {realData.summary.filteredEntries} after STRICT filtering 
                  {realData.summary.dateFiltered ? `(${realData.summary.dateFiltered} entries filtered out)` : ''}
                </div>
                <div className="mt-1 text-xs">
                  <strong>🗂️ Mapping Results:</strong> {realData.summary.mappingStats?.accountsTableMapped || 0} accounts table matches, 
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
                          {/* INCOME SECTION - Matching Your Google Sheets */}
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
                            .filter(item => item.type === 'Revenue' || 
                                           (item.original_type && item.original_type.toLowerCase().includes('income')))
                            .map((item) => {
                              const isExpandable = isExpandableAccount(item.name);
                              const isExpanded = expandedAccounts.has(item.name);
                              const isAbnormal = item.total < 0;
                              
                              return (
                                <React.Fragment key={`income-${item.name}`}>
                                  {/* Parent Account Row */}
                                  <tr className="hover:bg-gray-50">
                                    <td className="px-6 py-2 text-left text-sm text-gray-700 pl-12">
                                      <div className="flex items-center">
                                        {isExpandable && (
                                          <button
                                            onClick={() => toggleAccountExpansion(item.name)}
                                            className="mr-2 hover:bg-gray-200 p-1 rounded transition-colors"
                                          >
                                            {isExpanded ? (
                                              <ChevronDown className="w-4 h-4 text-gray-500" />
                                            ) : (
                                              <ChevronRight className="w-4 h-4 text-gray-500" />
                                            )}
                                          </button>
                                        )}
                                        <span 
                                          className="cursor-help"
                                          onMouseEnter={(e) => handleAccountMouseEnter(e, item)}
                                          onMouseLeave={handleAccountMouseLeave}
                                        >
                                          {item.name}
                                          {isAbnormal && <span className="ml-2 text-yellow-500">⚠️ Abnormal Balance</span>}
                                          {item.entries && item.entries.length > 0 && (
                                            <span className="ml-2 text-xs text-gray-500">
                                              ({item.entries.reduce((props: Set<string>, entry: any) => props.add(entry.property || 'No Property'), new Set()).size} properties)
                                            </span>
                                          )}
                                        </span>
                                      </div>
                                    </td>
                                    <td className={`px-4 py-2 text-right text-sm ${item.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {item.total >= 0 ? formatCurrency(item.total) : `(${formatCurrency(Math.abs(item.total))})`}
                                    </td>
                                    <td className="px-4 py-2 text-right text-sm text-gray-500">
                                      {kpis.revenue ? calculatePercentage(Math.abs(item.total), kpis.revenue) : '0%'}
                                    </td>
                                  </tr>
                                  
                                  {/* Sub-Account Details (when expanded) */}
                                  {isExpandable && isExpanded && item.hasSubAccounts && 
                                    Object.values(item.subAccounts || {}).map((subAccount: any) => (
                                      <tr key={`${item.name}-${subAccount.name}`} className="bg-blue-50 hover:bg-blue-100 transition-colors">
                                        <td className="px-6 py-2 text-left text-sm text-gray-600 pl-20">
                                          <div className="flex items-center">
                                            <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                                            <span 
                                              className="cursor-help"
                                              onMouseEnter={(e) => handleSubAccountMouseEnter(e, subAccount)}
                                              onMouseLeave={handleAccountMouseLeave}
                                            >
                                              {subAccount.name}
                                            </span>
                                          </div>
                                        </td>
                                        <td className="px-4 py-2 text-right text-sm text-green-600">
                                          {formatCurrency(Math.abs(subAccount.total))}
                                        </td>
                                        <td className="px-4 py-2 text-right text-sm text-gray-500">
                                          {item.total ? calculatePercentage(Math.abs(subAccount.total), Math.abs(item.total)) : '0%'}
                                        </td>
                                      </tr>
                                    ))
                                  }
                                  
                                  {/* Static Sub-Account Details (for demo accounts) */}
                                  {isExpandable && isExpanded && accountDetails[item.name] && 
                                    accountDetails[item.name].map((subItem) => {
                                      const hasSubDetails = subAccountDetails.hasOwnProperty(subItem.name);
                                      return (
                                        <tr key={`${item.name}-${subItem.name}`} className="bg-blue-50 hover:bg-blue-100 transition-colors">
                                          <td className="px-6 py-2 text-left text-sm text-gray-600 pl-20">
                                            <div className="flex items-center">
                                              <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: BRAND_COLORS.primary }}></div>
                                              {subItem.name}
                                            </div>
                                          </td>
                                          <td className="px-4 py-2 text-right text-sm text-gray-600">
                                            <span 
                                              className={hasSubDetails ? "cursor-help border-b border-dotted border-gray-500" : ""}
                                              onMouseEnter={hasSubDetails ? (e) => handleSubAccountMouseEnter(e, subItem.name, subItem.total) : undefined}
                                              onMouseLeave={hasSubDetails ? handleAccountMouseLeave : undefined}
                                            >
                                              {formatCurrency(subItem.total)}
                                            </span>
                                          </td>
                                          <td className="px-4 py-2 text-right text-sm text-gray-500">
                                            {kpis.revenue ? calculatePercentage(subItem.total, kpis.revenue) : '0%'}
                                          </td>
                                        </tr>
                                      );
                                    })
                                  }
                                </React.Fragment>
                              );
                            })}

                          {/* TOTAL INCOME - Bold Line Like Your Sheet */}
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
                              ({formatCurrency(kpis.operatingExpenses)})
                            </td>
                            <td className="px-4 py-4 text-right text-sm text-red-600">
                              {kpis.revenue ? calculatePercentage(kpis.operatingExpenses, kpis.revenue) : '0%'}
                            </td>
                          </tr>
                          
                          {/* Individual Expense Line Items */}
                          {currentData
                            .filter(item => item.type === 'Expenses' && 
                                           item.original
Perfect! I can see you're showing me the current GitHub version. I'll give you the complete updated code with all our debugging features added.

Copy and paste this entire code into your GitHub src/app/financials/page.tsx file:

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
  hasSubAccounts?: boolean;
  subAccounts?: Record<string, any>;
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

// Enhanced data transformation functions
const transformFinancialData = (entries: FinancialEntry[], monthYear: string) => {
  console.log('🔍 TRANSFORM FINANCIAL DATA - Input entries:', entries.length);
  
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
    
    // ✅ FIXED: Remove Math.abs() for proper accounting signs
    let amount = 0;
    
    switch (acc[key].type) {
      case 'Revenue':
        amount = entry.line_amount || (entry.credit_amount - entry.debit_amount);
        // Revenue should show negative when abnormal (when debits > credits)
        break;
        
      case 'Expenses':
        amount = entry.line_amount || (entry.debit_amount - entry.credit_amount);
        // Expenses should show negative when abnormal (when credits > debits)
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

  console.log('🔍 TRANSFORM RESULT - P&L items:', plData.length, 'Balance Sheet items:', balanceSheetData.length);

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

// 🚀 ENHANCED Fetch financial data from Supabase with DEBUGGING
const fetchFinancialData = async (
  selectedProperties: Set<string>,
  monthYear: string
) => {
  try {
    console.log('🔍 FETCHING FINANCIAL DATA with filters:');
    console.log('📊 Selected properties:', Array.from(selectedProperties));
    console.log('📅 Month/Year:', monthYear);
    
    const [month, year] = monthYear.split(' ');
    const monthNum = new Date(`${month} 1, ${year}`).getMonth() + 1;
    
    // STRICT date filtering - exactly the month requested
    const startDate = `${year}-${monthNum.toString().padStart(2, '0')}-01`;
    const lastDay = new Date(parseInt(year), monthNum, 0).getDate();
    const endDate = `${year}-${monthNum.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
    
    console.log(`📅 STRICT DATE RANGE: ${startDate} to ${endDate} (${month} ${year} ONLY)`);
    
    // 🚀 ENHANCED: Multi-property selection support
    let propertyFilterArray = Array.from(selectedProperties);
    
    // Remove 'All Properties' from the filter array if present
    if (propertyFilterArray.includes('All Properties')) {
      propertyFilterArray = [];
      console.log('🏠 Using ALL PROPERTIES (no property filter)');
    } else {
      console.log('🏠 Filtering by specific properties:', propertyFilterArray);
    }
    
    // Use proper Supabase client from lib/supabase.ts
    console.log('🔗 Using Supabase client from lib/supabase.ts');
    
    let journalData;
    let accountsData;
    
    try {
      if (propertyFilterArray.length === 0) {
        // No property filter - get all properties
        console.log('🔍 SUPABASE QUERY: Getting ALL properties for date range');
        const result = await supabaseQueries.getJournalEntriesForDateRange(startDate, endDate);
        journalData = result.success ? result.data : [];
        console.log('📊 Query result:', result.success ? `${journalData.length} entries` : `Error: ${result.error}`);
      } else if (propertyFilterArray.length === 1) {
        // Single property filter
        const property = propertyFilterArray[0];
        console.log('🔍 SUPABASE QUERY: Using .eq() for single property:', property);
        const result = await supabaseQueries.getJournalEntriesForProperty(property, startDate, endDate);
        journalData = result.success ? result.data : [];
        console.log('📊 Query result:', result.success ? `${journalData.length} entries` : `Error: ${result.error}`);
      } else {
        // Multiple properties filter
        console.log('🔍 SUPABASE QUERY: Using .in() for multiple properties:', propertyFilterArray);
        const result = await supabaseQueries.getJournalEntriesForMultipleProperties(propertyFilterArray, startDate, endDate);
        journalData = result.success ? result.data : [];
        console.log('📊 Query result:', result.success ? `${journalData.length} entries` : `Error: ${result.error}`);
      }
      
      // Get accounts data
      const accountsResult = await supabaseQueries.getAllAccounts();
      accountsData = accountsResult.success ? accountsResult.data : [];
      
    } catch (queryError) {
      console.error('❌ Supabase query error:', queryError);
      throw new Error(`Database query failed: ${queryError.message}`);
    }
    
    console.log('📊 Journal entries loaded for STRICT date range:', journalData.length);
    
    // ADDITIONAL CLIENT-SIDE DATE VALIDATION to ensure no date leakage
    const filteredJournalData = journalData.filter((entry: any) => {
      const entryDate = new Date(entry.transaction_date);
      const entryYear = entryDate.getFullYear();
      const entryMonth = entryDate.getMonth() + 1; // getMonth() is 0-based
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
    
    console.log(`✅ STRICT FILTERING RESULT: ${filteredJournalData.length} entries (filtered out ${journalData.length - filteredJournalData.length} entries)`);
    
    // Debug: Show property distribution in the actual data
    const propertyDistribution = filteredJournalData.reduce((acc: Record<string, number>, entry: any) => {
      const prop = entry.property_class || 'No Property';
      acc[prop] = (acc[prop] || 0) + 1;
      return acc;
    }, {});
    
    console.log('🏠 PROPERTY DISTRIBUTION in fetched data:', propertyDistribution);
    console.log('🔍 SELECTED PROPERTIES filter was:', Array.from(selectedProperties));
    
    // Debug: Show date range of actual entries
    if (filteredJournalData.length > 0) {
      const dates = filteredJournalData.map((e: any) => e.transaction_date).sort();
      console.log(`📅 ACTUAL DATE RANGE in filtered data: ${dates[0]} to ${dates[dates.length - 1]}`);
    }
    
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

    // Enhanced classification for journal entries to match your Google Sheets structure
    const classifyJournalAccount = (entry: any) => {
      const accountName = entry.account_name || '';
      const name = accountName.toLowerCase();
      const description = (entry.description || '').toLowerCase();
      
      // Revenue/Income classification - matching your Google Sheets exactly
      if (name.includes('rental revenue - airbnb') || 
          name.includes('rental revenue - direct') ||
          name.includes('rental revenue - guesty') ||
          name.includes('rental revenue - reserve payout') ||
          name.includes('rental revenue - vrbo') ||
          name.includes('direct booking') ||
          name.includes('direct revenue') ||
          name.includes('bookings') ||
          name.includes('income') || 
          name.includes('revenue') ||
          name.includes('rent') || 
          name.includes('airbnb') ||
          name.includes('guesty') ||
          name.includes('vrbo') ||
          name.includes('adjustment for occupancy taxes') ||
          name.includes('miscellaneous income') ||
          name.includes('resolution adjustments') ||
          // Check description for reclassification entries
          description.includes('reclassify') ||
          description.includes('move income') ||
          description.includes('transfer') ||
          description.includes('direct booking') ||
          description.includes('guesty to direct') ||
          // Standard revenue patterns
          entry.credit_amount > 0 && entry.debit_amount === 0) {
        return { 
          type: 'Income', 
          classification: 'Revenue', 
          standardName: entry.account_name 
        };
      }
      
      // Expense classification - matching your actual expense categories
      if (name.includes('advertising') || name.includes('marketing') ||
          name.includes('facebook') || name.includes('google') ||
          name.includes('arcade') || name.includes('bank fee') || 
          name.includes('disposal') || name.includes('waste') ||
          name.includes('insurance') || name.includes('internet') || 
          name.includes('tv service') || name.includes('cleaning') ||
          name.includes('labor') || name.includes('meal') || 
          name.includes('membership') || name.includes('subscription') ||
          name.includes('office') || name.includes('shipping') || 
          name.includes('postage') || name.includes('pool') || 
          name.includes('hot tub') || name.includes('maintenance') ||
          name.includes('repair') || name.includes('upgrade') ||
          name.includes('snow') || name.includes('lawn') || 
          name.includes('supplies') || name.includes('travel') ||
          name.includes('utilities') || name.includes('water') || 
          name.includes('sewer') || name.includes('expense') || 
          name.includes('cost') ||
          entry.debit_amount > 0 && entry.credit_amount === 0) {
        return { 
          type: 'Expenses', 
          classification: 'Expenses', 
          standardName: entry.account_name 
        };
      }
      
      // Interest expense (separate category)
      if (name.includes('mortgage') || name.includes('interest')) {
        return { 
          type: 'Interest Expense', 
          classification: 'Other Expenses', 
          standardName: entry.account_name 
        };
      }
      
      // Asset classification
      if (name.includes('improvements') || name.includes('property') || 
          name.includes('equipment') || name.includes('cash') ||
          name.includes('bank') || name.includes('checking') ||
          name.includes('savings') || name.includes('receivable') ||
          entry.account_type === 'Fixed Assets') {
        return { 
          type: 'Fixed Assets', 
          classification: 'Assets', 
          standardName: entry.account_name 
        };
      }
      
      // Liability classification
      if (name.includes('loan') || name.includes('payable') || 
          name.includes('credit card') || name.includes('debt') || 
          name.includes('liability') || entry.account_type === 'Credit Card') {
        return { 
          type: 'Credit Card', 
          classification: 'Liabilities', 
          standardName: entry.account_name 
        };
      }
      
      // ENHANCED DEFAULT CLASSIFICATION for reclassification entries
      // For reclassification entries, look at the net effect and description
      if (description.includes('reclassify') || description.includes('transfer') || description.includes('move')) {
        // For reclassification entries, classify based on the account name pattern and net effect
        if (name.includes('revenue') || name.includes('income') || name.includes('rental') || name.includes('booking')) {
          return { 
            type: 'Income', 
            classification: 'Revenue', 
            standardName: entry.account_name 
          };
        } else {
          return { 
            type: 'Expenses', 
            classification: 'Expenses', 
            standardName: entry.account_name 
          };
        }
      }
      
      // DEFAULT CLASSIFICATION: Use credit/debit logic with enhanced logging
      if (entry.credit_amount > entry.debit_amount || entry.line_amount < 0) {
        return { 
          type: 'Income', 
          classification: 'Revenue', 
          standardName: entry.account_name || 'Revenue Account'
        };
      } else if (entry.debit_amount > entry.credit_amount || entry.line_amount > 0) {
        return { 
          type: 'Expenses', 
          classification: 'Expenses', 
          standardName: entry.account_name || 'Expense Account'
        };
      } else {
        // Equal amounts - classify based on account name patterns
        if (name.includes('revenue') || name.includes('income') || name.includes('rental')) {
          return { 
            type: 'Income', 
            classification: 'Revenue', 
            standardName: entry.account_name 
          };
        } else {
          return { 
            type: 'Other', 
            classification: 'Other', 
            standardName: entry.account_name || 'Other Account'
          };
        }
      }
    };

    // Process journal entries using the STRICTLY FILTERED data
    const enhancedData = filteredJournalData.map((entry: any) => {
      // First: Try to find exact match in your accounts table
      let accountInfo = accountLookupMap.get(entry.account_name);
      
      if (!accountInfo) {
        // Use the account_type directly from the journal entry - no guessing!
        accountInfo = {
          type: entry.account_type,
          classification: entry.account_type === 'Income' ? 'Revenue' : 
                         entry.account_type === 'Expenses' ? 'Expenses' :
                         entry.account_type === 'Cost of Goods Sold' ? 'Expenses' :
                         entry.account_type === 'Other Income' ? 'Revenue' :
                         entry.account_type === 'Other Expenses' ? 'Expenses' :
                         entry.account_type === 'Interest Expense' ? 'Other Expenses' :
                         entry.account_type, // Default to whatever the journal entry says
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
        filters: { selectedProperties: Array.from(selectedProperties), monthYear },
        accountTypes: [...new Set(accountsData.map((a: any) => a.account_type))],
        propertiesInData: [...new Set(enhancedData.map((e: any) => e.property_class))],
        propertyDistribution,
        mappingStats: {
          totalEntries: enhancedData?.length || 0,
          accountsTableMapped: enhancedData?.filter((e: any) => e.mapping_method === 'Accounts Table').length || 0,
          fallbackMapped: enhancedData?.filter((e: any) => e.mapping_method === 'Journal Entry Type').length || 0
        }
      }
    };
  } catch (error) {
    console.error('❌ Error fetching financial data:', error);
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

// Expandable account data for detailed views
const accountDetails: Record<string, FinancialDataItem[]> = {
  'Revenue': [
    { name: 'Product Sales', total: 850000, months: { 'June 2025': 850000 } },
    { name: 'Service Revenue', total: 300000, months: { 'June 2025': 300000 } },
    { name: 'Licensing Fees', total: 75000, months: { 'June 2025': 75000 } },
    { name: 'Other Revenue', total: 25000, months: { 'June 2025': 25000 } },
  ],
  'Cost of Goods Sold': [
    { name: 'Direct Materials', total: 450000, months: { 'June 2025': 450000 } },
    { name: 'Direct Labor', total: 200000, months: { 'June 2025': 200000 } },
    { name: 'Manufacturing Overhead', total: 100000, months: { 'June 2025': 100000 } },
  ],
};

// Sub-detail breakdowns
const subAccountDetails: Record<string, Array<{name: string, amount: number}>> = {
  'Direct Materials': [
    { name: 'Raw Steel', amount: 180000 },
    { name: 'Electronic Components', amount: 120000 },
    { name: 'Packaging Materials', amount: 85000 },
  ],
  'Direct Labor': [
    { name: 'Production Workers', amount: 120000 },
    { name: 'Assembly Technicians', amount: 45000 },
    { name: 'Quality Inspectors', amount: 25000 },
  ],
};

export default function FinancialsPage() {
  const [activeTab, setActiveTab] = useState<FinancialTab>('p&l');
  const [selectedMonth, setSelectedMonth] = useState<MonthString>('May 2025');
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
    console.log('🚀 USEEFFECT: Initial data load triggered');
    loadInitialData();
  }, []);

  // Load data when filters change with debugging
  useEffect(() => {
    console.log('🚀 USEEFFECT: Filter change detected');
    console.log('📊 selectedProperties changed to:', Array.from(selectedProperties));
    console.log('📅 selectedMonth changed to:', selectedMonth);
    loadRealFinancialData();
  }, [selectedProperties, selectedMonth]);

  const loadInitialData = async () => {
    try {
      console.log('🔄 LOADING INITIAL DATA...');
      setIsLoadingData(true);
      
      const propertiesResult = await supabaseQueries.getUniqueProperties();
      if (propertiesResult.success) {
        const properties = propertiesResult.data || [];
        
        // 🚀 ENHANCED: Property deduplication and sorting
        const uniqueProperties = [...new Set(properties)].filter(p => p && p.trim() !== '');
        const sortedProperties = ['All Properties', ...uniqueProperties.sort()];
        
        console.log('🏠 Available properties loaded and deduplicated:', sortedProperties);
        setAvailableProperties(sortedProperties);
      } else {
        console.error('❌ Failed to load properties:', propertiesResult.error);
        // Fallback properties
        setAvailableProperties([
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
        ]);
      }
      
      await loadRealFinancialData();
      
    } catch (error) {
      console.error('❌ Failed to load initial data:', error);
      setDataError('Failed to load initial data');
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadRealFinancialData = async () => {
    try {
      console.log('🔄 LOADING REAL FINANCIAL DATA...');
      console.log('📊 Current selectedProperties state:', Array.from(selectedProperties));
      console.log('📅 Current selectedMonth state:', selectedMonth);
      
      setIsLoadingData(true);
      setDataError(null);
      
      const rawData = await fetchFinancialData(selectedProperties, selectedMonth);
      
      if (rawData.success) {
        const entries = rawData.data as FinancialEntry[];
        
        console.log('✅ RAW DATA SUCCESS:', entries.length, 'entries');
        console.log('🔍 Sample entries:', entries.slice(0, 3));
        
        const transformedPL = transformFinancialData(entries, selectedMonth);
        const transformedCF = transformCashFlowData(entries);

        const combinedData = {
          success: true,
          ...transformedPL,
          ...transformedCF,
          summary: {
            ...rawData.summary,
            propertiesInData: [...new Set(entries.map(e => e.property_class))],
            selectedFilters: {
              properties: Array.from(selectedProperties),
              month: selectedMonth
            }
          },
          performance: {
            executionTimeMs: Date.now() % 1000
          },
          rawEntries: entries.slice(0, 5)
        };

        setRealData(combinedData);
        setDataError(null);
        
        const propertyText = selectedProperties.has('All Properties') 
          ? 'all properties' 
          : `${selectedProperties.size} selected properties`;
          
        showNotification(`✅ Loaded ${entries.length} entries for ${propertyText} in ${selectedMonth}`, 'success');
        
        console.log('🎉 DATA LOADING COMPLETE - Combined data set successfully');
      } else {
        console.error('❌ RAW DATA FAILED:', rawData.error);
        setDataError(rawData.error || 'Failed to load financial data');
        showNotification('❌ Failed to load financial data', 'error');
      }
      
    } catch (error) {
      console.error('❌ Exception in loadRealFinancialData:', error);
      setDataError('Failed to load financial data');
      showNotification('❌ Failed to load financial data', 'error');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handlePropertyToggle = (property: string) => {
    console.log('🏠 Property toggle debugging: property=', property);
    console.log('📊 Current selectedProperties before toggle:', Array.from(selectedProperties));
    
    const newSelected = new Set(selectedProperties);
    
    if (property === 'All Properties') {
      console.log('🔄 Selecting All Properties');
      newSelected.clear();
      newSelected.add('All Properties');
    } else {
      console.log('🔄 Toggling individual property:', property);
      newSelected.delete('All Properties');
      
      if (newSelected.has(property)) {
        console.log('➖ Removing property:', property);
        newSelected.delete(property);
      } else {
        console.log('➕ Adding property:', property);
        newSelected.add(property);
      }
      
      if (newSelected.size === 0) {
        console.log('🔄 No properties selected, defaulting to All Properties');
        newSelected.add('All Properties');
      }
    }
    
    console.log('📊 New selectedProperties after toggle:', Array.from(newSelected));
    console.log('📊 selectedProperties size:', newSelected.size);
    
    setSelectedProperties(newSelected);
    console.log('✅ Property selection state updated');
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

  const isExpandableAccount = (accountName: string): boolean => {
    // Check if it's in the static expandable accounts OR if it has sub-accounts
    const currentDataItem = currentData.find(item => item.name === accountName);
    return accountDetails.hasOwnProperty(accountName) || 
           (currentDataItem && currentDataItem.hasSubAccounts);
  };

  const handleAccountMouseEnter = (event: React.MouseEvent<HTMLElement>, accountItem: FinancialDataItem): void => {
    // Check if this account has real transaction entries
    if (!accountItem.entries || accountItem.entries.length === 0) return;

    const rect = (event.target as HTMLElement).getBoundingClientRect();
    
    // Build tooltip content with actual transaction details
    let tooltipContent = `<div style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 4px;">
      ${accountItem.name} • ${formatCurrency(accountItem.total)}
    </div>`;

    tooltipContent += `<div style="font-size: 11px; color: #E5E7EB; margin-bottom: 8px;">
      ${accountItem.entries.length} Journal Entries • Mapping: ${accountItem.mapping_method}
    </div>`;

    // Show up to 5 most recent transactions
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
                ${entry.amount_used >= 0 ? formatCurrency(entry.amount_used) : `(${formatCurrency(Math.abs(entry.amount_used))})`}
                ${entry.amount_used < 0 ? ' ⚠️' : ''}
              </span>
            </div>
          </div>
        </div>
      `;
    });

    // Add summary if there are more entries
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
  };

  const handleSubAccountMouseEnter = (event: React.MouseEvent<HTMLElement>, subAccountItem: any): void => {
    // Handle both new sub-account structure and old static structure
    if (typeof subAccountItem === 'object' && subAccountItem.entries) {
      // New sub-account with real transaction data
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      
      let tooltipContent = `<div style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 4px;">
        ${subAccountItem.name} • ${formatCurrency(subAccountItem.total)}
      </div>`;

      tooltipContent += `<div style="font-size: 11px; color: #E5E7EB; margin-bottom: 8px;">
        ${subAccountItem.entries.length} Journal Entries • Property: ${subAccountItem.name}
      </div>`;

      // Show up to 3 most recent transactions for sub-accounts
      const recentEntries = subAccountItem.entries.slice(0, 3);
      
      recentEntries.forEach((entry: any, index: number) => {
        const entryDate = new Date(entry.transaction_date).toLocaleDateString();
        const isLast = index === recentEntries.length - 1;
        
        tooltipContent += `
          <div style="margin-bottom: ${isLast ? '0' : '6px'}; padding: 4px; background: rgba(255,255,255,0.1); border-radius: 4px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; align-items: center; gap: 4px;">
                <div style="width: 4px; height: 4px; background: #10B981; border-radius: 50%;"></div>
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
                  ${entry.property || 'No Property'}
                </span>
                <span style="font-size: 11px; font-weight: bold; color: #10B981;">
                  ${formatCurrency(Math.abs(entry.amount_used))}
                </span>
              </div>
            </div>
          </div>
        `;
      });

      if (subAccountItem.entries.length > 3) {
        tooltipContent += `
          <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.2); text-align: center;">
            <span style="font-size: 10px; color: #D1D5DB; font-style: italic;">
              + ${subAccountItem.entries.length - 3} more entries
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
    } else {
      // Fallback to old static sub-account handling
      handleSubAccountMouseEnterStatic(event, subAccountItem, typeof subAccountItem === 'string' ? 0 : subAccountItem);
    }
  };

  const handleSubAccountMouseEnterStatic = (event: React.MouseEvent<HTMLElement>, subAccountName: string, subAccountTotal: number): void => {
    const details = subAccountDetails[subAccountName];
    if (!details || details.length === 0) return;

    let tooltipContent = `<div style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 4px;">
      ${subAccountName} • ${formatCurrency(subAccountTotal)}
    </div>`;

    details.forEach((item, index) => {
      const percentage = subAccountTotal ? ((item.amount / subAccountTotal) * 100).toFixed(1) : '0';
      
      tooltipContent += `
        <div style="margin-bottom: ${index < details.length - 1 ? '8px' : '0'};">
          <div style="display: flex; align-items: center; gap: 4px;">
            <div style="width: 6px; height: 6px; background: ${BRAND_COLORS.success}; border-radius: 50%;"></div>
            <strong style="font-size: 12px; color: white;">${item.name}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-left: 10px;">
            <span style="font-size: 11px;">${formatCurrency(item.amount)}</span>
            <span style="font-size: 10px; background: rgba(255,255,255,0.2); padding: 2px 6px; border-radius: 10px;">${percentage}%</span>
          </div>
        </div>
      `;
    });

    const rect = (event.target as HTMLElement).getBoundingClientRect();
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

    // ✅ FIXED: Remove Math.abs() to preserve proper accounting signs
    const revenue = currentData
      .filter(item => item.type === 'Revenue' || 
                     (item.original_type && item.original_type.toLowerCase().includes('income')))
      .reduce((sum, item) => sum + item.total, 0); // Keep natural sign

    const cogs = currentData
      .filter(item => item.original_type === 'Cost of Goods Sold')
      .reduce((sum, item) => sum + item.total, 0); // Keep natural sign

    const operatingExpenses = currentData
      .filter(item => item.type === 'Expenses' && 
                     item.original_type !== 'Interest Expense')
      .reduce((sum, item) => sum + item.total, 0); // Keep natural sign

    const interestExpense = currentData
      .filter(item => item.original_type === 'Interest Expense' ||
                     item.name.toLowerCase().includes('mortgage interest'))
      .reduce((sum, item) => sum + item.total, 0); // Keep natural sign

    const otherIncome = currentData
      .filter(item => item.original_type === 'Other Income')
      .reduce((sum, item) => sum + item.total, 0); // Keep natural sign

    const otherExpenses = currentData
      .filter(item => item.name.toLowerCase().includes('other expense') &&
                     !item.name.toLowerCase().includes('interest'))
      .reduce((sum, item) => sum + item.total, 0); // Keep natural sign

    // Calculate derived metrics with proper signs
    const grossProfit = revenue - Math.abs(cogs); // COGS should reduce gross profit
    const operatingIncome = grossProfit - Math.abs(operatingExpenses); // Expenses should reduce operating income
    const netOperatingIncome = operatingIncome - Math.abs(interestExpense); // Interest should reduce income
    const netIncome = netOperatingIncome + otherIncome - Math.abs(otherExpenses); // Other expenses should reduce net income

    return {
      revenue,
      cogs: Math.abs(cogs), // Show as positive for display
      grossProfit,
      operatingExpenses: Math.abs(operatingExpenses), // Show as positive for display
      operatingIncome,
      interestExpense: Math.abs(interestExpense), // Show as positive for display
      netOperatingIncome,
      otherIncome,
      otherExpenses: Math.abs(otherExpenses), // Show as positive for display
      netIncome,
      grossMargin: revenue ? (grossProfit / revenue) * 100 : 0,
      operatingMargin: revenue ? (operatingIncome / revenue) * 100 : 0,
      netMargin: revenue ? (netIncome / revenue) * 100 : 0
    };
  };

  const generateTrendData = () => {
    const months = ['Jan 2023', 'Feb 2023', 'Mar 2023', 'Apr 2023', 'May 2023', 'Jun 2023'];
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
      .filter(item => item.type === 'Expenses' && Math.abs(item.total) > 0)
      .map(item => ({
        name: item.name,
        value: Math.abs(item.total) // Use absolute value for pie chart
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
    // ✅ FIXED: Show natural accounting signs
    const displayValue = value;
    const isAbnormal = (item.type === 'Revenue' && value < 0) || (item.type === 'Expenses' && value < 0);
    
    return (
      <td className={`px-4 py-3 text-right text-sm font-medium ${
        displayValue >= 0 ? 'text-green-600' : 'text-red-600'
      }`}>
        {displayValue >= 0 ? formatCurrency(displayValue) : `(${formatCurrency(Math.abs(displayValue))})`}
        {isAbnormal && <span className="ml-1 text-yellow-500">⚠️</span>}
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
                    Supabase Connected • Multi-Property Debug Mode
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Real-time P&L by Property Class • Multi-Property Selection with Enhanced Debugging
                {realData?.summary && (
                  <span className="ml-2 text-green-600">
                    • {realData.summary.filteredEntries} entries loaded from {realData.summary.propertiesInData?.length || 0} properties
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
                onChange={(e) => {
                  console.log('📅 Month selection changed to:', e.target.value);
                  setSelectedMonth(e.target.value as MonthString);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm hover:border-blue-500 focus:outline-none focus:ring-2 transition-all"
                style={{ '--tw-ring-color': BRAND_COLORS.secondary + '33' } as React.CSSProperties}
              >
                {monthsList.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>

              {/* 🚀 ENHANCED Property Class Multi-Select Dropdown with Debugging */}
              <div className="relative">
                <button
                  onClick={() => {
                    console.log('🔽 Property dropdown toggle clicked');
                    setPropertyDropdownOpen(!propertyDropdownOpen);
                  }}
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
                        console.log('🔄 All Properties option clicked');
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
                                console.log('🔄 Individual property clicked:', property);
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
                onClick={() => {
                  console.log('🔄 Refresh button clicked');
                  loadRealFinancialData();
                }}
                disabled={isLoadingData}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingData ? 'animate-spin' : ''}`} />
                {isLoadingData ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* 🚀 ENHANCED Data Status with Multi-Property Debugging */}
          {realData && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-green-800 text-sm">
                <strong>✅ Data Status:</strong> Loaded {realData.summary.filteredEntries} entries 
                from Supabase • Multi-Property Selection Active
                <div className="mt-1 text-xs">
                  <strong>📅 Date Range:</strong> {realData.summary.dateRange} (STRICT {selectedMonth} ONLY)
                </div>
                <div className="mt-1 text-xs">
                  <strong>🏠 Selected Properties:</strong> {getSelectedPropertiesText()} 
                  ({Array.from(selectedProperties).join(', ')})
                </div>
                <div className="mt-1 text-xs">
                  <strong>📊 Properties in Data:</strong> {realData.summary.propertiesInData?.join(', ') || 'None'}
                </div>
                {realData.summary.propertyDistribution && (
                  <div className="mt-1 text-xs">
                    <strong>🔍 Property Distribution:</strong> {Object.entries(realData.summary.propertyDistribution).map(([prop, count]) => `${prop}: ${count}`).join(', ')}
                  </div>
                )}
                <div className="mt-1 text-xs">
                  <strong>🔍 Data Source:</strong> {realData.summary.dataSource}
                </div>
                <div className="mt-1 text-xs">
                  <strong>📈 Date Filtering:</strong> {realData.summary.originalEntries || 0} original entries → 
                  {realData.summary.filteredEntries} after STRICT filtering 
                  {realData.summary.dateFiltered ? `(${realData.summary.dateFiltered} entries filtered out)` : ''}
                </div>
                <div className="mt-1 text-xs">
                  <strong>🗂️ Mapping Results:</strong> {realData.summary.mappingStats?.accountsTableMapped || 0} accounts table matches, 
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
                          {/* INCOME SECTION - Matching Your Google Sheets */}
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
                            .filter(item => item.type === 'Revenue' || 
                                           (item.original_type && item.original_type.toLowerCase().includes('income')))
                            .map((item) => {
                              const isExpandable = isExpandableAccount(item.name);
                              const isExpanded = expandedAccounts.has(item.name);
                              const isAbnormal = item.total < 0;
                              
                              return (
                                <React.Fragment key={`income-${item.name}`}>
                                  {/* Parent Account Row */}
                                  <tr className="hover:bg-gray-50">
                                    <td className="px-6 py-2 text-left text-sm text-gray-700 pl-12">
                                      <div className="flex items-center">
                                        {isExpandable && (
                                          <button
                                            onClick={() => toggleAccountExpansion(item.name)}
                                            className="mr-2 hover:bg-gray-200 p-1 rounded transition-colors"
                                          >
                                            {isExpanded ? (
                                              <ChevronDown className="w-4 h-4 text-gray-500" />
                                            ) : (
                                              <ChevronRight className="w-4 h-4 text-gray-500" />
                                            )}
                                          </button>
                                        )}
                                        <span 
                                          className="cursor-help"
                                          onMouseEnter={(e) => handleAccountMouseEnter(e, item)}
                                          onMouseLeave={handleAccountMouseLeave}
                                        >
                                          {item.name}
                                          {isAbnormal && <span className="ml-2 text-yellow-500">⚠️ Abnormal Balance</span>}
                                          {item.entries && item.entries.length > 0 && (
                                            <span className="ml-2 text-xs text-gray-500">
                                              ({item.entries.reduce((props: Set<string>, entry: any) => props.add(entry.property || 'No Property'), new Set()).size} properties)
                                            </span>
                                          )}
                                        </span>
                                      </div>
                                    </td>
                                    <td className={`px-4 py-2 text-right text-sm ${item.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {item.total >= 0 ? formatCurrency(item.total) : `(${formatCurrency(Math.abs(item.total))})`}
                                    </td>
                                    <td className="px-4 py-2 text-right text-sm text-gray-500">
                                      {kpis.revenue ? calculatePercentage(Math.abs(item.total), kpis.revenue) : '0%'}
                                    </td>
                                  </tr>
                                  
                                  {/* Sub-Account Details (when expanded) */}
                                  {isExpandable && isExpanded && item.hasSubAccounts && 
                                    Object.values(item.subAccounts || {}).map((subAccount: any) => (
                                      <tr key={`${item.name}-${subAccount.name}`} className="bg-blue-50 hover:bg-blue-100 transition-colors">
                                        <td className="px-6 py-2 text-left text-sm text-gray-600 pl-20">
                                          <div className="flex items-center">
                                            <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                                            <span 
                                              className="cursor-help"
                                              onMouseEnter={(e) => handleSubAccountMouseEnter(e, subAccount)}
                                              onMouseLeave={handleAccountMouseLeave}
                                            >
                                              {subAccount.name}
                                            </span>
                                          </div>
                                        </td>
                                        <td className="px-4 py-2 text-right text-sm text-green-600">
                                          {formatCurrency(Math.abs(subAccount.total))}
                                        </td>
                                        <td className="px-4 py-2 text-right text-sm text-gray-500">
                                          {item.total ? calculatePercentage(Math.abs(subAccount.total), Math.abs(item.total)) : '0%'}
                                        </td>
                                      </tr>
                                    ))
                                  }
                                  
                                  {/* Static Sub-Account Details (for demo accounts) */}
                                  {isExpandable && isExpanded && accountDetails[item.name] && 
                                    accountDetails[item.name].map((subItem) => {
                                      const hasSubDetails = subAccountDetails.hasOwnProperty(subItem.name);
                                      return (
                                        <tr key={`${item.name}-${subItem.name}`} className="bg-blue-50 hover:bg-blue-100 transition-colors">
                                          <td className="px-6 py-2 text-left text-sm text-gray-600 pl-20">
                                            <div className="flex items-center">
                                              <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: BRAND_COLORS.primary }}></div>
                                              {subItem.name}
                                            </div>
                                          </td>
                                          <td className="px-4 py-2 text-right text-sm text-gray-600">
                                            <span 
                                              className={hasSubDetails ? "cursor-help border-b border-dotted border-gray-500" : ""}
                                              onMouseEnter={hasSubDetails ? (e) => handleSubAccountMouseEnter(e, subItem.name, subItem.total) : undefined}
                                              onMouseLeave={hasSubDetails ? handleAccountMouseLeave : undefined}
                                            >
                                              {formatCurrency(subItem.total)}
                                            </span>
                                          </td>
                                          <td className="px-4 py-2 text-right text-sm text-gray-500">
                                            {kpis.revenue ? calculatePercentage(subItem.total, kpis.revenue) : '0%'}
                                          </td>
                                        </tr>
                                      );
                                    })
                                  }
                                </React.Fragment>
                              );
                            })}

                          {/* TOTAL INCOME - Bold Line Like Your Sheet */}
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
                              ({formatCurrency(kpis.operatingExpenses)})
                            </td>
                            <td className="px-4 py-4 text-right text-sm text-red-600">
                              {kpis.revenue ? calculatePercentage(kpis.operatingExpenses, kpis.revenue) : '0%'}
                            </td>
                          </tr>
                          
                          {/* Individual Expense Line Items */}
                          {currentData
                            .filter(item => item.type === 'Expenses' && 
                                           item.original_type !== 'Cost of Goods Sold' &&
                                           !item.name.toLowerCase().includes('interest'))
                            .map((item) => {
                              const isExpandable = isExpandableAccount(item.name);
                              const isExpanded = expandedAccounts.has(item.name);
                              const isAbnormal = item.total < 0; // Expenses should normally be positive (debits)
                              
                              return (
                                <React.Fragment key={`expense-${item.name}`}>
                                  <tr className="hover:bg-gray-50">
                                    <td className="px-6 py-2 text-left text-sm text-gray-700 pl-12">
                                      <div className="flex items-center">
                                        {isExpandable && (
                                          <button
                                            onClick={() => toggleAccountExpansion(item.name)}
                                            className="mr-2 hover:bg-gray-200 p-1 rounded transition-colors"
                                          >
                                            {isExpanded ? (
                                              <ChevronDown className="w-4 h-4 text-gray-500" />
                                            ) : (
                                              <ChevronRight className="w-4 h-4 text-gray-500" />
                                            )}
                                          </button>
                                        )}
                                        <span 
                                          className="cursor-help"
                                          onMouseEnter={(e) => handleAccountMouseEnter(e, item)}
                                          onMouseLeave={handleAccountMouseLeave}
                                        >
                                          {item.name}
                                          {isAbnormal && <span className="ml-2 text-yellow-500">⚠️ Abnormal Balance</span>}
                                        </span>
                                      </div>
                                    </td>
                                    <td className={`px-4 py-2 text-right text-sm ${item.total >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                      {item.total >= 0 ? `(${formatCurrency(item.total)})` : formatCurrency(Math.abs(item.total))}
                                    </td>
                                    <td className="px-4 py-2 text-right text-sm text-gray-500">
                                      {kpis.revenue ? calculatePercentage(Math.abs(item.total), kpis.revenue) : '0%'}
                                    </td>
                                  </tr>
                                  
                                  {/* Expanded Detail Rows */}
                                  {isExpandable && isExpanded && accountDetails[item.name] && 
                                    accountDetails[item.name].map((subItem) => {
                                      const hasSubDetails = subAccountDetails.hasOwnProperty(subItem.name);
                                      return (
                                        <tr key={`${item.name}-${subItem.name}`} className="bg-blue-50 hover:bg-blue-100 transition-colors">
                                          <td className="px-6 py-2 text-left text-sm text-gray-600 pl-20">
                                            <div className="flex items-center">
                                              <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: BRAND_COLORS.primary }}></div>
                                              {subItem.name}
                                            </div>
                                          </td>
                                          <td className="px-4 py-2 text-right text-sm text-gray-600">
                                            <span 
                                              className={hasSubDetails ? "cursor-help border-b border-dotted border-gray-500" : ""}
                                              onMouseEnter={hasSubDetails ? (e) => handleSubAccountMouseEnter(e
Perfect! I can see you're showing me the current GitHub version. I'll give you the complete updated code with all our debugging features added.

Copy and paste this entire code into your GitHub src/app/financials/page.tsx file:

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
  hasSubAccounts?: boolean;
  subAccounts?: Record<string, any>;
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

// Enhanced data transformation functions
const transformFinancialData = (entries: FinancialEntry[], monthYear: string) => {
  console.log('🔍 TRANSFORM FINANCIAL DATA - Input entries:', entries.length);
  
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
    
    // ✅ FIXED: Remove Math.abs() for proper accounting signs
    let amount = 0;
    
    switch (acc[key].type) {
      case 'Revenue':
        amount = entry.line_amount || (entry.credit_amount - entry.debit_amount);
        // Revenue should show negative when abnormal (when debits > credits)
        break;
        
      case 'Expenses':
        amount = entry.line_amount || (entry.debit_amount - entry.credit_amount);
        // Expenses should show negative when abnormal (when credits > debits)
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

  console.log('🔍 TRANSFORM RESULT - P&L items:', plData.length, 'Balance Sheet items:', balanceSheetData.length);

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

// 🚀 ENHANCED Fetch financial data from Supabase with DEBUGGING
const fetchFinancialData = async (
  selectedProperties: Set<string>,
  monthYear: string
) => {
  try {
    console.log('🔍 FETCHING FINANCIAL DATA with filters:');
    console.log('📊 Selected properties:', Array.from(selectedProperties));
    console.log('📅 Month/Year:', monthYear);
    
    const [month, year] = monthYear.split(' ');
    const monthNum = new Date(`${month} 1, ${year}`).getMonth() + 1;
    
    // STRICT date filtering - exactly the month requested
    const startDate = `${year}-${monthNum.toString().padStart(2, '0')}-01`;
    const lastDay = new Date(parseInt(year), monthNum, 0).getDate();
    const endDate = `${year}-${monthNum.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
    
    console.log(`📅 STRICT DATE RANGE: ${startDate} to ${endDate} (${month} ${year} ONLY)`);
    
    // 🚀 ENHANCED: Multi-property selection support
    let propertyFilterArray = Array.from(selectedProperties);
    
    // Remove 'All Properties' from the filter array if present
    if (propertyFilterArray.includes('All Properties')) {
      propertyFilterArray = [];
      console.log('🏠 Using ALL PROPERTIES (no property filter)');
    } else {
      console.log('🏠 Filtering by specific properties:', propertyFilterArray);
    }
    
    // Use proper Supabase client from lib/supabase.ts
    console.log('🔗 Using Supabase client from lib/supabase.ts');
    
    let journalData;
    let accountsData;
    
    try {
      if (propertyFilterArray.length === 0) {
        // No property filter - get all properties
        console.log('🔍 SUPABASE QUERY: Getting ALL properties for date range');
        const result = await supabaseQueries.getJournalEntriesForDateRange(startDate, endDate);
        journalData = result.success ? result.data : [];
        console.log('📊 Query result:', result.success ? `${journalData.length} entries` : `Error: ${result.error}`);
      } else if (propertyFilterArray.length === 1) {
        // Single property filter
        const property = propertyFilterArray[0];
        console.log('🔍 SUPABASE QUERY: Using .eq() for single property:', property);
        const result = await supabaseQueries.getJournalEntriesForProperty(property, startDate, endDate);
        journalData = result.success ? result.data : [];
        console.log('📊 Query result:', result.success ? `${journalData.length} entries` : `Error: ${result.error}`);
      } else {
        // Multiple properties filter
        console.log('🔍 SUPABASE QUERY: Using .in() for multiple properties:', propertyFilterArray);
        const result = await supabaseQueries.getJournalEntriesForMultipleProperties(propertyFilterArray, startDate, endDate);
        journalData = result.success ? result.data : [];
        console.log('📊 Query result:', result.success ? `${journalData.length} entries` : `Error: ${result.error}`);
      }
      
      // Get accounts data
      const accountsResult = await supabaseQueries.getAllAccounts();
      accountsData = accountsResult.success ? accountsResult.data : [];
      
    } catch (queryError) {
      console.error('❌ Supabase query error:', queryError);
      throw new Error(`Database query failed: ${queryError.message}`);
    }
    
    console.log('📊 Journal entries loaded for STRICT date range:', journalData.length);
    
    // ADDITIONAL CLIENT-SIDE DATE VALIDATION to ensure no date leakage
    const filteredJournalData = journalData.filter((entry: any) => {
      const entryDate = new Date(entry.transaction_date);
      const entryYear = entryDate.getFullYear();
      const entryMonth = entryDate.getMonth() + 1; // getMonth() is 0-based
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
    
    console.log(`✅ STRICT FILTERING RESULT: ${filteredJournalData.length} entries (filtered out ${journalData.length - filteredJournalData.length} entries)`);
    
    // Debug: Show property distribution in the actual data
    const propertyDistribution = filteredJournalData.reduce((acc: Record<string, number>, entry: any) => {
      const prop = entry.property_class || 'No Property';
      acc[prop] = (acc[prop] || 0) + 1;
      return acc;
    }, {});
    
    console.log('🏠 PROPERTY DISTRIBUTION in fetched data:', propertyDistribution);
    console.log('🔍 SELECTED PROPERTIES filter was:', Array.from(selectedProperties));
    
    // Debug: Show date range of actual entries
    if (filteredJournalData.length > 0) {
      const dates = filteredJournalData.map((e: any) => e.transaction_date).sort();
      console.log(`📅 ACTUAL DATE RANGE in filtered data: ${dates[0]} to ${dates[dates.length - 1]}`);
    }
    
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

    // Enhanced classification for journal entries to match your Google Sheets structure
    const classifyJournalAccount = (entry: any) => {
      const accountName = entry.account_name || '';
      const name = accountName.toLowerCase();
      const description = (entry.description || '').toLowerCase();
      
      // Revenue/Income classification - matching your Google Sheets exactly
      if (name.includes('rental revenue - airbnb') || 
          name.includes('rental revenue - direct') ||
          name.includes('rental revenue - guesty') ||
          name.includes('rental revenue - reserve payout') ||
          name.includes('rental revenue - vrbo') ||
          name.includes('direct booking') ||
          name.includes('direct revenue') ||
          name.includes('bookings') ||
          name.includes('income') || 
          name.includes('revenue') ||
          name.includes('rent') || 
          name.includes('airbnb') ||
          name.includes('guesty') ||
          name.includes('vrbo') ||
          name.includes('adjustment for occupancy taxes') ||
          name.includes('miscellaneous income') ||
          name.includes('resolution adjustments') ||
          // Check description for reclassification entries
          description.includes('reclassify') ||
          description.includes('move income') ||
          description.includes('transfer') ||
          description.includes('direct booking') ||
          description.includes('guesty to direct') ||
          // Standard revenue patterns
          entry.credit_amount > 0 && entry.debit_amount === 0) {
        return { 
          type: 'Income', 
          classification: 'Revenue', 
          standardName: entry.account_name 
        };
      }
      
      // Expense classification - matching your actual expense categories
      if (name.includes('advertising') || name.includes('marketing') ||
          name.includes('facebook') || name.includes('google') ||
          name.includes('arcade') || name.includes('bank fee') || 
          name.includes('disposal') || name.includes('waste') ||
          name.includes('insurance') || name.includes('internet') || 
          name.includes('tv service') || name.includes('cleaning') ||
          name.includes('labor') || name.includes('meal') || 
          name.includes('membership') || name.includes('subscription') ||
          name.includes('office') || name.includes('shipping') || 
          name.includes('postage') || name.includes('pool') || 
          name.includes('hot tub') || name.includes('maintenance') ||
          name.includes('repair') || name.includes('upgrade') ||
          name.includes('snow') || name.includes('lawn') || 
          name.includes('supplies') || name.includes('travel') ||
          name.includes('utilities') || name.includes('water') || 
          name.includes('sewer') || name.includes('expense') || 
          name.includes('cost') ||
          entry.debit_amount > 0 && entry.credit_amount === 0) {
        return { 
          type: 'Expenses', 
          classification: 'Expenses', 
          standardName: entry.account_name 
        };
      }
      
      // Interest expense (separate category)
      if (name.includes('mortgage') || name.includes('interest')) {
        return { 
          type: 'Interest Expense', 
          classification: 'Other Expenses', 
          standardName: entry.account_name 
        };
      }
      
      // Asset classification
      if (name.includes('improvements') || name.includes('property') || 
          name.includes('equipment') || name.includes('cash') ||
          name.includes('bank') || name.includes('checking') ||
          name.includes('savings') || name.includes('receivable') ||
          entry.account_type === 'Fixed Assets') {
        return { 
          type: 'Fixed Assets', 
          classification: 'Assets', 
          standardName: entry.account_name 
        };
      }
      
      // Liability classification
      if (name.includes('loan') || name.includes('payable') || 
          name.includes('credit card') || name.includes('debt') || 
          name.includes('liability') || entry.account_type === 'Credit Card') {
        return { 
          type: 'Credit Card', 
          classification: 'Liabilities', 
          standardName: entry.account_name 
        };
      }
      
      // ENHANCED DEFAULT CLASSIFICATION for reclassification entries
      // For reclassification entries, look at the net effect and description
      if (description.includes('reclassify') || description.includes('transfer') || description.includes('move')) {
        // For reclassification entries, classify based on the account name pattern and net effect
        if (name.includes('revenue') || name.includes('income') || name.includes('rental') || name.includes('booking')) {
          return { 
            type: 'Income', 
            classification: 'Revenue', 
            standardName: entry.account_name 
          };
        } else {
          return { 
            type: 'Expenses', 
            classification: 'Expenses', 
            standardName: entry.account_name 
          };
        }
      }
      
      // DEFAULT CLASSIFICATION: Use credit/debit logic with enhanced logging
      if (entry.credit_amount > entry.debit_amount || entry.line_amount < 0) {
        return { 
          type: 'Income', 
          classification: 'Revenue', 
          standardName: entry.account_name || 'Revenue Account'
        };
      } else if (entry.debit_amount > entry.credit_amount || entry.line_amount > 0) {
        return { 
          type: 'Expenses', 
          classification: 'Expenses', 
          standardName: entry.account_name || 'Expense Account'
        };
      } else {
        // Equal amounts - classify based on account name patterns
        if (name.includes('revenue') || name.includes('income') || name.includes('rental')) {
          return { 
            type: 'Income', 
            classification: 'Revenue', 
            standardName: entry.account_name 
          };
        } else {
          return { 
            type: 'Other', 
            classification: 'Other', 
            standardName: entry.account_name || 'Other Account'
          };
        }
      }
    };

    // Process journal entries using the STRICTLY FILTERED data
    const enhancedData = filteredJournalData.map((entry: any) => {
      // First: Try to find exact match in your accounts table
      let accountInfo = accountLookupMap.get(entry.account_name);
      
      if (!accountInfo) {
        // Use the account_type directly from the journal entry - no guessing!
        accountInfo = {
          type: entry.account_type,
          classification: entry.account_type === 'Income' ? 'Revenue' : 
                         entry.account_type === 'Expenses' ? 'Expenses' :
                         entry.account_type === 'Cost of Goods Sold' ? 'Expenses' :
                         entry.account_type === 'Other Income' ? 'Revenue' :
                         entry.account_type === 'Other Expenses' ? 'Expenses' :
                         entry.account_type === 'Interest Expense' ? 'Other Expenses' :
                         entry.account_type, // Default to whatever the journal entry says
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
        filters: { selectedProperties: Array.from(selectedProperties), monthYear },
        accountTypes: [...new Set(accountsData.map((a: any) => a.account_type))],
        propertiesInData: [...new Set(enhancedData.map((e: any) => e.property_class))],
        propertyDistribution,
        mappingStats: {
          totalEntries: enhancedData?.length || 0,
          accountsTableMapped: enhancedData?.filter((e: any) => e.mapping_method === 'Accounts Table').length || 0,
          fallbackMapped: enhancedData?.filter((e: any) => e.mapping_method === 'Journal Entry Type').length || 0
        }
      }
    };
  } catch (error) {
    console.error('❌ Error fetching financial data:', error);
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

// Expandable account data for detailed views
const accountDetails: Record<string, FinancialDataItem[]> = {
  'Revenue': [
    { name: 'Product Sales', total: 850000, months: { 'June 2025': 850000 } },
    { name: 'Service Revenue', total: 300000, months: { 'June 2025': 300000 } },
    { name: 'Licensing Fees', total: 75000, months: { 'June 2025': 75000 } },
    { name: 'Other Revenue', total: 25000, months: { 'June 2025': 25000 } },
  ],
  'Cost of Goods Sold': [
    { name: 'Direct Materials', total: 450000, months: { 'June 2025': 450000 } },
    { name: 'Direct Labor', total: 200000, months: { 'June 2025': 200000 } },
    { name: 'Manufacturing Overhead', total: 100000, months: { 'June 2025': 100000 } },
  ],
};

// Sub-detail breakdowns
const subAccountDetails: Record<string, Array<{name: string, amount: number}>> = {
  'Direct Materials': [
    { name: 'Raw Steel', amount: 180000 },
    { name: 'Electronic Components', amount: 120000 },
    { name: 'Packaging Materials', amount: 85000 },
  ],
  'Direct Labor': [
    { name: 'Production Workers', amount: 120000 },
    { name: 'Assembly Technicians', amount: 45000 },
    { name: 'Quality Inspectors', amount: 25000 },
  ],
};

export default function FinancialsPage() {
  const [activeTab, setActiveTab] = useState<FinancialTab>('p&l');
  const [selectedMonth, setSelectedMonth] = useState<MonthString>('May 2025');
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
    console.log('🚀 USEEFFECT: Initial data load triggered');
    loadInitialData();
  }, []);

  // Load data when filters change with debugging
  useEffect(() => {
    console.log('🚀 USEEFFECT: Filter change detected');
    console.log('📊 selectedProperties changed to:', Array.from(selectedProperties));
    console.log('📅 selectedMonth changed to:', selectedMonth);
    loadRealFinancialData();
  }, [selectedProperties, selectedMonth]);

  const loadInitialData = async () => {
    try {
      console.log('🔄 LOADING INITIAL DATA...');
      setIsLoadingData(true);
      
      const propertiesResult = await supabaseQueries.getUniqueProperties();
      if (propertiesResult.success) {
        const properties = propertiesResult.data || [];
        
        // 🚀 ENHANCED: Property deduplication and sorting
        const uniqueProperties = [...new Set(properties)].filter(p => p && p.trim() !== '');
        const sortedProperties = ['All Properties', ...uniqueProperties.sort()];
        
        console.log('🏠 Available properties loaded and deduplicated:', sortedProperties);
        setAvailableProperties(sortedProperties);
      } else {
        console.error('❌ Failed to load properties:', propertiesResult.error);
        // Fallback properties
        setAvailableProperties([
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
        ]);
      }
      
      await loadRealFinancialData();
      
    } catch (error) {
      console.error('❌ Failed to load initial data:', error);
      setDataError('Failed to load initial data');
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadRealFinancialData = async () => {
    try {
      console.log('🔄 LOADING REAL FINANCIAL DATA...');
      console.log('📊 Current selectedProperties state:', Array.from(selectedProperties));
      console.log('📅 Current selectedMonth state:', selectedMonth);
      
      setIsLoadingData(true);
      setDataError(null);
      
      const rawData = await fetchFinancialData(selectedProperties, selectedMonth);
      
      if (rawData.success) {
        const entries = rawData.data as FinancialEntry[];
        
        console.log('✅ RAW DATA SUCCESS:', entries.length, 'entries');
        console.log('🔍 Sample entries:', entries.slice(0, 3));
        
        const transformedPL = transformFinancialData(entries, selectedMonth);
        const transformedCF = transformCashFlowData(entries);

        const combinedData = {
          success: true,
          ...transformedPL,
          ...transformedCF,
          summary: {
            ...rawData.summary,
            propertiesInData: [...new Set(entries.map(e => e.property_class))],
            selectedFilters: {
              properties: Array.from(selectedProperties),
              month: selectedMonth
            }
          },
          performance: {
            executionTimeMs: Date.now() % 1000
          },
          rawEntries: entries.slice(0, 5)
        };

        setRealData(combinedData);
        setDataError(null);
        
        const propertyText = selectedProperties.has('All Properties') 
          ? 'all properties' 
          : `${selectedProperties.size} selected properties`;
          
        showNotification(`✅ Loaded ${entries.length} entries for ${propertyText} in ${selectedMonth}`, 'success');
        
        console.log('🎉 DATA LOADING COMPLETE - Combined data set successfully');
      } else {
        console.error('❌ RAW DATA FAILED:', rawData.error);
        setDataError(rawData.error || 'Failed to load financial data');
        showNotification('❌ Failed to load financial data', 'error');
      }
      
    } catch (error) {
      console.error('❌ Exception in loadRealFinancialData:', error);
      setDataError('Failed to load financial data');
      showNotification('❌ Failed to load financial data', 'error');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handlePropertyToggle = (property: string) => {
    console.log('🏠 Property toggle debugging: property=', property);
    console.log('📊 Current selectedProperties before toggle:', Array.from(selectedProperties));
    
    const newSelected = new Set(selectedProperties);
    
    if (property === 'All Properties') {
      console.log('🔄 Selecting All Properties');
      newSelected.clear();
      newSelected.add('All Properties');
    } else {
      console.log('🔄 Toggling individual property:', property);
      newSelected.delete('All Properties');
      
      if (newSelected.has(property)) {
        console.log('➖ Removing property:', property);
        newSelected.delete(property);
      } else {
        console.log('➕ Adding property:', property);
        newSelected.add(property);
      }
      
      if (newSelected.size === 0) {
        console.log('🔄 No properties selected, defaulting to All Properties');
        newSelected.add('All Properties');
      }
    }
    
    console.log('📊 New selectedProperties after toggle:', Array.from(newSelected));
    console.log('📊 selectedProperties size:', newSelected.size);
    
    setSelectedProperties(newSelected);
    console.log('✅ Property selection state updated');
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

  const isExpandableAccount = (accountName: string): boolean => {
    // Check if it's in the static expandable accounts OR if it has sub-accounts
    const currentDataItem = currentData.find(item => item.name === accountName);
    return accountDetails.hasOwnProperty(accountName) || 
           (currentDataItem && currentDataItem.hasSubAccounts);
  };

  const handleAccountMouseEnter = (event: React.MouseEvent<HTMLElement>, accountItem: FinancialDataItem): void => {
    // Check if this account has real transaction entries
    if (!accountItem.entries || accountItem.entries.length === 0) return;

    const rect = (event.target as HTMLElement).getBoundingClientRect();
    
    // Build tooltip content with actual transaction details
    let tooltipContent = `<div style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 4px;">
      ${accountItem.name} • ${formatCurrency(accountItem.total)}
    </div>`;

    tooltipContent += `<div style="font-size: 11px; color: #E5E7EB; margin-bottom: 8px;">
      ${accountItem.entries.length} Journal Entries • Mapping: ${accountItem.mapping_method}
    </div>`;

    // Show up to 5 most recent transactions
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
                ${entry.amount_used >= 0 ? formatCurrency(entry.amount_used) : `(${formatCurrency(Math.abs(entry.amount_used))})`}
                ${entry.amount_used < 0 ? ' ⚠️' : ''}
              </span>
            </div>
          </div>
        </div>
      `;
    });

    // Add summary if there are more entries
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
  };

  const handleSubAccountMouseEnter = (event: React.MouseEvent<HTMLElement>, subAccountItem: any): void => {
    // Handle both new sub-account structure and old static structure
    if (typeof subAccountItem === 'object' && subAccountItem.entries) {
      // New sub-account with real transaction data
      const rect = (event.target as HTMLElement).getBoundingClientRect();
      
      let tooltipContent = `<div style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 4px;">
        ${subAccountItem.name} • ${formatCurrency(subAccountItem.total)}
      </div>`;

      tooltipContent += `<div style="font-size: 11px; color: #E5E7EB; margin-bottom: 8px;">
        ${subAccountItem.entries.length} Journal Entries • Property: ${subAccountItem.name}
      </div>`;

      // Show up to 3 most recent transactions for sub-accounts
      const recentEntries = subAccountItem.entries.slice(0, 3);
      
      recentEntries.forEach((entry: any, index: number) => {
        const entryDate = new Date(entry.transaction_date).toLocaleDateString();
        const isLast = index === recentEntries.length - 1;
        
        tooltipContent += `
          <div style="margin-bottom: ${isLast ? '0' : '6px'}; padding: 4px; background: rgba(255,255,255,0.1); border-radius: 4px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; align-items: center; gap: 4px;">
                <div style="width: 4px; height: 4px; background: #10B981; border-radius: 50%;"></div>
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
                  ${entry.property || 'No Property'}
                </span>
                <span style="font-size: 11px; font-weight: bold; color: #10B981;">
                  ${formatCurrency(Math.abs(entry.amount_used))}
                </span>
              </div>
            </div>
          </div>
        `;
      });

      if (subAccountItem.entries.length > 3) {
        tooltipContent += `
          <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.2); text-align: center;">
            <span style="font-size: 10px; color: #D1D5DB; font-style: italic;">
              + ${subAccountItem.entries.length - 3} more entries
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
    } else {
      // Fallback to old static sub-account handling
      handleSubAccountMouseEnterStatic(event, subAccountItem, typeof subAccountItem === 'string' ? 0 : subAccountItem);
    }
  };

  const handleSubAccountMouseEnterStatic = (event: React.MouseEvent<HTMLElement>, subAccountName: string, subAccountTotal: number): void => {
    const details = subAccountDetails[subAccountName];
    if (!details || details.length === 0) return;

    let tooltipContent = `<div style="font-weight: bold; margin-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.2); padding-bottom: 4px;">
      ${subAccountName} • ${formatCurrency(subAccountTotal)}
    </div>`;

    details.forEach((item, index) => {
      const percentage = subAccountTotal ? ((item.amount / subAccountTotal) * 100).toFixed(1) : '0';
      
      tooltipContent += `
        <div style="margin-bottom: ${index < details.length - 1 ? '8px' : '0'};">
          <div style="display: flex; align-items: center; gap: 4px;">
            <div style="width: 6px; height: 6px; background: ${BRAND_COLORS.success}; border-radius: 50%;"></div>
            <strong style="font-size: 12px; color: white;">${item.name}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-left: 10px;">
            <span style="font-size: 11px;">${formatCurrency(item.amount)}</span>
            <span style="font-size: 10px; background: rgba(255,255,255,0.2); padding: 2px 6px; border-radius: 10px;">${percentage}%</span>
          </div>
        </div>
      `;
    });

    const rect = (event.target as HTMLElement).getBoundingClientRect();
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

    // ✅ FIXED: Remove Math.abs() to preserve proper accounting signs
    const revenue = currentData
      .filter(item => item.type === 'Revenue' || 
                     (item.original_type && item.original_type.toLowerCase().includes('income')))
      .reduce((sum, item) => sum + item.total, 0); // Keep natural sign

    const cogs = currentData
      .filter(item => item.original_type === 'Cost of Goods Sold')
      .reduce((sum, item) => sum + item.total, 0); // Keep natural sign

    const operatingExpenses = currentData
      .filter(item => item.type === 'Expenses' && 
                     item.original_type !== 'Interest Expense')
      .reduce((sum, item) => sum + item.total, 0); // Keep natural sign

    const interestExpense = currentData
      .filter(item => item.original_type === 'Interest Expense' ||
                     item.name.toLowerCase().includes('mortgage interest'))
      .reduce((sum, item) => sum + item.total, 0); // Keep natural sign

    const otherIncome = currentData
      .filter(item => item.original_type === 'Other Income')
      .reduce((sum, item) => sum + item.total, 0); // Keep natural sign

    const otherExpenses = currentData
      .filter(item => item.name.toLowerCase().includes('other expense') &&
                     !item.name.toLowerCase().includes('interest'))
      .reduce((sum, item) => sum + item.total, 0); // Keep natural sign

    // Calculate derived metrics with proper signs
    const grossProfit = revenue - Math.abs(cogs); // COGS should reduce gross profit
    const operatingIncome = grossProfit - Math.abs(operatingExpenses); // Expenses should reduce operating income
    const netOperatingIncome = operatingIncome - Math.abs(interestExpense); // Interest should reduce income
    const netIncome = netOperatingIncome + otherIncome - Math.abs(otherExpenses); // Other expenses should reduce net income

    return {
      revenue,
      cogs: Math.abs(cogs), // Show as positive for display
      grossProfit,
      operatingExpenses: Math.abs(operatingExpenses), // Show as positive for display
      operatingIncome,
      interestExpense: Math.abs(interestExpense), // Show as positive for display
      netOperatingIncome,
      otherIncome,
      otherExpenses: Math.abs(otherExpenses), // Show as positive for display
      netIncome,
      grossMargin: revenue ? (grossProfit / revenue) * 100 : 0,
      operatingMargin: revenue ? (operatingIncome / revenue) * 100 : 0,
      netMargin: revenue ? (netIncome / revenue) * 100 : 0
    };
  };

  const generateTrendData = () => {
    const months = ['Jan 2023', 'Feb 2023', 'Mar 2023', 'Apr 2023', 'May 2023', 'Jun 2023'];
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
      .filter(item => item.type === 'Expenses' && Math.abs(item.total) > 0)
      .map(item => ({
        name: item.name,
        value: Math.abs(item.total) // Use absolute value for pie chart
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
    // ✅ FIXED: Show natural accounting signs
    const displayValue = value;
    const isAbnormal = (item.type === 'Revenue' && value < 0) || (item.type === 'Expenses' && value < 0);
    
    return (
      <td className={`px-4 py-3 text-right text-sm font-medium ${
        displayValue >= 0 ? 'text-green-600' : 'text-red-600'
      }`}>
        {displayValue >= 0 ? formatCurrency(displayValue) : `(${formatCurrency(Math.abs(displayValue))})`}
        {isAbnormal && <span className="ml-1 text-yellow-500">⚠️</span>}
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
                    Supabase Connected • Multi-Property Debug Mode
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Real-time P&L by Property Class • Multi-Property Selection with Enhanced Debugging
                {realData?.summary && (
                  <span className="ml-2 text-green-600">
                    • {realData.summary.filteredEntries} entries loaded from {realData.summary.propertiesInData?.length || 0} properties
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
                onChange={(e) => {
                  console.log('📅 Month selection changed to:', e.target.value);
                  setSelectedMonth(e.target.value as MonthString);
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm hover:border-blue-500 focus:outline-none focus:ring-2 transition-all"
                style={{ '--tw-ring-color': BRAND_COLORS.secondary + '33' } as React.CSSProperties}
              >
                {monthsList.map((month) => (
                  <option key={month} value={month}>
                    {month}
                  </option>
                ))}
              </select>

              {/* 🚀 ENHANCED Property Class Multi-Select Dropdown with Debugging */}
              <div className="relative">
                <button
                  onClick={() => {
                    console.log('🔽 Property dropdown toggle clicked');
                    setPropertyDropdownOpen(!propertyDropdownOpen);
                  }}
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
                        console.log('🔄 All Properties option clicked');
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
                                console.log('🔄 Individual property clicked:', property);
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
                onClick={() => {
                  console.log('🔄 Refresh button clicked');
                  loadRealFinancialData();
                }}
                disabled={isLoadingData}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingData ? 'animate-spin' : ''}`} />
                {isLoadingData ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>

          {/* 🚀 ENHANCED Data Status with Multi-Property Debugging */}
          {realData && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-green-800 text-sm">
                <strong>✅ Data Status:</strong> Loaded {realData.summary.filteredEntries} entries 
                from Supabase • Multi-Property Selection Active
                <div className="mt-1 text-xs">
                  <strong>📅 Date Range:</strong> {realData.summary.dateRange} (STRICT {selectedMonth} ONLY)
                </div>
                <div className="mt-1 text-xs">
                  <strong>🏠 Selected Properties:</strong> {getSelectedPropertiesText()} 
                  ({Array.from(selectedProperties).join(', ')})
                </div>
                <div className="mt-1 text-xs">
                  <strong>📊 Properties in Data:</strong> {realData.summary.propertiesInData?.join(', ') || 'None'}
                </div>
                {realData.summary.propertyDistribution && (
                  <div className="mt-1 text-xs">
                    <strong>🔍 Property Distribution:</strong> {Object.entries(realData.summary.propertyDistribution).map(([prop, count]) => `${prop}: ${count}`).join(', ')}
                  </div>
                )}
                <div className="mt-1 text-xs">
                  <strong>🔍 Data Source:</strong> {realData.summary.dataSource}
                </div>
                <div className="mt-1 text-xs">
                  <strong>📈 Date Filtering:</strong> {realData.summary.originalEntries || 0} original entries → 
                  {realData.summary.filteredEntries} after STRICT filtering 
                  {realData.summary.dateFiltered ? `(${realData.summary.dateFiltered} entries filtered out)` : ''}
                </div>
                <div className="mt-1 text-xs">
                  <strong>🗂️ Mapping Results:</strong> {realData.summary.mappingStats?.accountsTableMapped || 0} accounts table matches, 
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
                          {/* INCOME SECTION - Matching Your Google Sheets */}
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
                            .filter(item => item.type === 'Revenue' || 
                                           (item.original_type && item.original_type.toLowerCase().includes('income')))
                            .map((item) => {
                              const isExpandable = isExpandableAccount(item.name);
                              const isExpanded = expandedAccounts.has(item.name);
                              const isAbnormal = item.total < 0;
                              
                              return (
                                <React.Fragment key={`income-${item.name}`}>
                                  {/* Parent Account Row */}
                                  <tr className="hover:bg-gray-50">
                                    <td className="px-6 py-2 text-left text-sm text-gray-700 pl-12">
                                      <div className="flex items-center">
                                        {isExpandable && (
                                          <button
                                            onClick={() => toggleAccountExpansion(item.name)}
                                            className="mr-2 hover:bg-gray-200 p-1 rounded transition-colors"
                                          >
                                            {isExpanded ? (
                                              <ChevronDown className="w-4 h-4 text-gray-500" />
                                            ) : (
                                              <ChevronRight className="w-4 h-4 text-gray-500" />
                                            )}
                                          </button>
                                        )}
                                        <span 
                                          className="cursor-help"
                                          onMouseEnter={(e) => handleAccountMouseEnter(e, item)}
                                          onMouseLeave={handleAccountMouseLeave}
                                        >
                                          {item.name}
                                          {isAbnormal && <span className="ml-2 text-yellow-500">⚠️ Abnormal Balance</span>}
                                          {item.entries && item.entries.length > 0 && (
                                            <span className="ml-2 text-xs text-gray-500">
                                              ({item.entries.reduce((props: Set<string>, entry: any) => props.add(entry.property || 'No Property'), new Set()).size} properties)
                                            </span>
                                          )}
                                        </span>
                                      </div>
                                    </td>
                                    <td className={`px-4 py-2 text-right text-sm ${item.total >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                      {item.total >= 0 ? formatCurrency(item.total) : `(${formatCurrency(Math.abs(item.total))})`}
                                    </td>
                                    <td className="px-4 py-2 text-right text-sm text-gray-500">
                                      {kpis.revenue ? calculatePercentage(Math.abs(item.total), kpis.revenue) : '0%'}
                                    </td>
                                  </tr>
                                  
                                  {/* Sub-Account Details (when expanded) */}
                                  {isExpandable && isExpanded && item.hasSubAccounts && 
                                    Object.values(item.subAccounts || {}).map((subAccount: any) => (
                                      <tr key={`${item.name}-${subAccount.name}`} className="bg-blue-50 hover:bg-blue-100 transition-colors">
                                        <td className="px-6 py-2 text-left text-sm text-gray-600 pl-20">
                                          <div className="flex items-center">
                                            <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                                            <span 
                                              className="cursor-help"
                                              onMouseEnter={(e) => handleSubAccountMouseEnter(e, subAccount)}
                                              onMouseLeave={handleAccountMouseLeave}
                                            >
                                              {subAccount.name}
                                            </span>
                                          </div>
                                        </td>
                                        <td className="px-4 py-2 text-right text-sm text-green-600">
                                          {formatCurrency(Math.abs(subAccount.total))}
                                        </td>
                                        <td className="px-4 py-2 text-right text-sm text-gray-500">
                                          {item.total ? calculatePercentage(Math.abs(subAccount.total), Math.abs(item.total)) : '0%'}
                                        </td>
                                      </tr>
                                    ))
                                  }
                                  
                                  {/* Static Sub-Account Details (for demo accounts) */}
                                  {isExpandable && isExpanded && accountDetails[item.name] && 
                                    accountDetails[item.name].map((subItem) => {
                                      const hasSubDetails = subAccountDetails.hasOwnProperty(subItem.name);
                                      return (
                                        <tr key={`${item.name}-${subItem.name}`} className="bg-blue-50 hover:bg-blue-100 transition-colors">
                                          <td className="px-6 py-2 text-left text-sm text-gray-600 pl-20">
                                            <div className="flex items-center">
                                              <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: BRAND_COLORS.primary }}></div>
                                              {subItem.name}
                                            </div>
                                          </td>
                                          <td className="px-4 py-2 text-right text-sm text-gray-600">
                                            <span 
                                              className={hasSubDetails ? "cursor-help border-b border-dotted border-gray-500" : ""}
                                              onMouseEnter={hasSubDetails ? (e) => handleSubAccountMouseEnter(e, subItem.name, subItem.total) : undefined}
                                              onMouseLeave={hasSubDetails ? handleAccountMouseLeave : undefined}
                                            >
                                              {formatCurrency(subItem.total)}
                                            </span>
                                          </td>
                                          <td className="px-4 py-2 text-right text-sm text-gray-500">
                                            {kpis.revenue ? calculatePercentage(subItem.total, kpis.revenue) : '0%'}
                                          </td>
                                        </tr>
                                      );
                                    })
                                  }
                                </React.Fragment>
                              );
                            })}

                          {/* TOTAL INCOME - Bold Line Like Your Sheet */}
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
                              ({formatCurrency(kpis.operatingExpenses)})
                            </td>
                            <td className="px-4 py-4 text-right text-sm text-red-600">
                              {kpis.revenue ? calculatePercentage(kpis.operatingExpenses, kpis.revenue) : '0%'}
                            </td>
                          </tr>
                          
                          {/* Individual Expense Line Items */}
                          {currentData
                            .filter(item => item.type === 'Expenses' && 
                                           item.original_type !== 'Cost of Goods Sold' &&
                                           !item.name.toLowerCase().includes('interest'))
                            .map((item) => {
                              const isExpandable = isExpandableAccount(item.name);
                              const isExpanded = expandedAccounts.has(item.name);
                              const isAbnormal = item.total < 0; // Expenses should normally be positive (debits)
                              
                              return (
                                <React.Fragment key={`expense-${item.name}`}>
                                  <tr className="hover:bg-gray-50">
                                    <td className="px-6 py-2 text-left text-sm text-gray-700 pl-12">
                                      <div className="flex items-center">
                                        {isExpandable && (
                                          <button
                                            onClick={() => toggleAccountExpansion(item.name)}
                                            className="mr-2 hover:bg-gray-200 p-1 rounded transition-colors"
                                          >
                                            {isExpanded ? (
                                              <ChevronDown className="w-4 h-4 text-gray-500" />
                                            ) : (
                                              <ChevronRight className="w-4 h-4 text-gray-500" />
                                            )}
                                          </button>
                                        )}
                                        <span 
                                          className="cursor-help"
                                          onMouseEnter={(e) => handleAccountMouseEnter(e, item)}
                                          onMouseLeave={handleAccountMouseLeave}
                                        >
                                          {item.name}
                                          {isAbnormal && <span className="ml-2 text-yellow-500">⚠️ Abnormal Balance</span>}
                                        </span>
                                      </div>
                                    </td>
                                    <td className={`px-4 py-2 text-right text-sm ${item.total >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                                      {item.total >= 0 ? `(${formatCurrency(item.total)})` : formatCurrency(Math.abs(item.total))}
                                    </td>
                                    <td className="px-4 py-2 text-right text-sm text-gray-500">
                                      {kpis.revenue ? calculatePercentage(Math.abs(item.total), kpis.revenue) : '0%'}
                                    </td>
                                  </tr>
                                  
                                  {/* Expanded Detail Rows */}
                                  {isExpandable && isExpanded && accountDetails[item.name] && 
                                    accountDetails[item.name].map((subItem) => {
                                      const hasSubDetails = subAccountDetails.hasOwnProperty(subItem.name);
                                      return (
                                        <tr key={`${item.name}-${subItem.name}`} className="bg-blue-50 hover:bg-blue-100 transition-colors">
                                          <td className="px-6 py-2 text-left text-sm text-gray-600 pl-20">
                                            <div className="flex items-center">
                                              <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: BRAND_COLORS.primary }}></div>
                                              {subItem.name}
                                            </div>
                                          </td>
                                          <td className="px-4 py-2 text-right text-sm text-gray-600">
                                            <span 
                                              className={hasSubDetails ? "cursor-help border-b border-dotted border-gray-500" : ""}
                                              onMouseEnter={hasSubDetails ? (e) => handleSubAccountMouseEnter(e, subItem.name, subItem.total) : undefined}
                                              onMouseLeave={hasSubDetails ? handleAccountMouseLeave : undefined}
                                            >
                                              ({formatCurrency(subItem.total)})
                                            </span>
                                          </td>
                                          <td className="px-4 py-2 text-right text-sm text-gray-500">
                                            {kpis.revenue ? calculatePercentage(subItem.total, kpis.revenue) : '0%'}
                                          </td>
                                        </tr>
                                      );
                                    })
                                  }
                                </React.Fragment>
                              );
                            })}

                          {/* TOTAL EXPENSES */}
                          <tr className="bg-red-100 border-t-2 border-red-300">
                            <td className="px-6 py-4 text-left text-lg font-bold text-red-800">
                              📊 TOTAL EXPENSES
                            </td>
                            <td className="px-4 py-4 text-right text-lg font-bold text-red-800">
                              ({formatCurrency(kpis.operatingExpenses)})
                            </td>
                            <td className="px-4 py-4 text-right text-sm font-bold text-red-800">
                              {kpis.revenue ? calculatePercentage(kpis.operatingExpenses, kpis.revenue) : '0%'}
                            </td>
                          </tr>

                          {/* NET INCOME - Final Bottom Line Like Your Sheet */}
                          <tr className="border-t-4" style={{ 
                            backgroundColor: BRAND_COLORS.primary + '20', 
                            borderTopColor: BRAND_COLORS
Thought for 10s
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
Thought for 4s
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
      
      // Remove
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
        is
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
        // Expense accounts: Debits - Credits (normal debit
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
      style:
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
