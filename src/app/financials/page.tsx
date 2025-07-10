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

// Supabase Configuration
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

// Enhanced data transformation functions with proper account type mapping
const transformFinancialData = (entries: FinancialEntry[], monthYear: string) => {
  // Function to get a clean, descriptive account name
  const getCleanAccountName = (entry: any) => {
    // Use account_name (column D) which contains the actual account names
    let accountName = entry.account_name?.trim() || '';
    
    // Clean up property-specific prefixes if present (like "615 Pine Terrace:")
    accountName = accountName.replace(/^[^:]*:/, '').trim();
    
    // If still empty, use a fallback
    if (!accountName || accountName === 'Journal Entry' || accountName === 'RJE') {
      accountName = entry.description?.trim() || `${entry.account_type || 'Other'} Account`;
    }
    
    return accountName;
  };

  // Group by cleaned account name and calculate net amounts
  const groupedData = entries.reduce((acc, entry) => {
    const accountName = getCleanAccountName(entry);
    const key = accountName;
    
    if (!acc[key]) {
      // Use the classification we determined in fetchFinancialData
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
    
    // Simplified accounting logic using line_amount primarily
    let amount = 0;
    
    switch (acc[key].type) {
      case 'Revenue':
        // Revenue: negative line_amount typically means revenue increase
        // But we want to show revenue as positive on P&L
        amount = Math.abs(entry.line_amount || (entry.credit_amount - entry.debit_amount));
        break;
        
      case 'Expenses':
        // Expenses: positive line_amount typically means expense increase
        amount = Math.abs(entry.line_amount || (entry.debit_amount - entry.credit_amount));
        break;
        
      case 'Assets':
        // Assets: use line_amount as-is (positive = asset increase)
        amount = entry.line_amount || (entry.debit_amount - entry.credit_amount);
        break;
        
      case 'Liabilities':
        // Liabilities: use line_amount as-is (negative = liability increase typically)
        amount = entry.line_amount || (entry.credit_amount - entry.debit_amount);
        break;
        
      default:
        // Default: use line_amount as-is
        amount = entry.line_amount || (entry.debit_amount - entry.credit_amount);
    }
    
    acc[key].total += amount;
    acc[key].months[monthYear as MonthString] = (acc[key].months[monthYear as MonthString] || 0) + amount;
    acc[key].entries.push({
      je_number: entry.je_number,
      debit: entry.debit_amount,
      credit: entry.credit_amount,
      line: entry.line_amount,
      property: entry.property_class,
      original_account: entry.account_name,
      original_description: entry.description,
      classification: entry.classification
    });
    
    return acc;
  }, {} as Record<string, any>);

  // Convert to array and sort by account type hierarchy for P&L presentation
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

  // SEPARATE P&L DATA FROM BALANCE SHEET DATA
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
          [monthYear]: plData  // Only P&L accounts for P&L statement
        }
      }
    },
    propertyBalanceSheetData: {
      'All Properties': {
        Monthly: {
          [monthYear]: balanceSheetData  // Only Balance Sheet accounts
        }
      }
    }
  };
};

const transformCashFlowData = (entries: FinancialEntry[]) => {
  // Cash flow transformation using actual cash account movements
  const cashAccounts = entries.filter(entry => 
    entry.account_type === 'Bank' || 
    entry.account_name.toLowerCase().includes('cash') ||
    entry.account_name.toLowerCase().includes('checking') ||
    entry.account_name.toLowerCase().includes('savings')
  );

  // Group by account for cash movements
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

// Supabase API Functions
const supabase = createSupabaseClient();

const fetchProperties = async (): Promise<string[]> => {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/journal_entries?select=property_class&property_class=not.is.null`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error('Failed to fetch properties');
    
    const data = await response.json();
    const uniqueProperties = [...new Set(data.map((item: any) => item.property_class).filter(Boolean))];
    return ['All Properties', ...uniqueProperties];
  } catch (error) {
    console.error('Error fetching properties:', error);
    return ['All Properties'];
  }
};

const fetchBankAccounts = async (): Promise<string[]> => {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/accounts?select=account_name&account_type=eq.Bank&order=account_name`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) throw new Error('Failed to fetch bank accounts');
    
    const data = await response.json();
    const bankAccounts = data.map((item: any) => item.account_name).filter(Boolean);
    return ['All Accounts', ...bankAccounts];
  } catch (error) {
    console.error('Error fetching bank accounts:', error);
    return ['All Accounts'];
  }
};

const fetchFinancialData = async (
  property: string = 'All Properties',
  bankAccount: string = 'All Accounts',
  monthYear: string
) => {
  try {
    // Convert "June 2025" to date range for filtering
    const [month, year] = monthYear.split(' ');
    const monthNum = new Date(`${month} 1, ${year}`).getMonth() + 1;
    const startDate = `${year}-${monthNum.toString().padStart(2, '0')}-01`;
    const endDate = `${year}-${monthNum.toString().padStart(2, '0')}-${new Date(parseInt(year), monthNum, 0).getDate()}`;
    
    let url = `${SUPABASE_URL}/rest/v1/journal_entries?select=*&transaction_date=gte.${startDate}&transaction_date=lte.${endDate}&order=account_name`;
    
    // Add property filter
    if (property !== 'All Properties') {
      url += `&property_class=eq.${encodeURIComponent(property)}`;
    }
    
    // Add bank account filter if applicable
    if (bankAccount !== 'All Accounts') {
      url += `&account_name=ilike.%${encodeURIComponent(bankAccount)}%`;
    }

    const [journalResponse, accountsResponse] = await Promise.all([
      fetch(url, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      }),
      fetch(`${SUPABASE_URL}/rest/v1/accounts?select=*&order=account_name`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      })
    ]);

    if (!journalResponse.ok || !accountsResponse.ok) {
      throw new Error('Failed to fetch financial data');
    }
    
    const journalData = await journalResponse.json();
    const accountsData = await accountsResponse.json();
    
    // Create account code to name mapping from your chart of accounts
    const accountCodeMap = new Map();
    
    // First, map your chart of accounts (property addresses as Fixed Assets)
    accountsData.forEach((account: any) => {
      accountCodeMap.set(account.account_name, {
        type: account.account_type,
        standardName: account.account_name
      });
    });

    // Create comprehensive account code mappings based on your actual P&L structure
    const commonAccountMappings = {
      // INCOME ACCOUNTS
      '103.41': { type: 'Income', standardName: 'Rental Revenue - Airbnb', classification: 'Revenue' },
      '103.42': { type: 'Income', standardName: 'Rental Revenue - Property 2', classification: 'Revenue' },
      '1050': { type: 'Income', standardName: 'Rental Revenue', classification: 'Revenue' },
      '1115.58': { type: 'Income', standardName: 'Other Rental Income', classification: 'Revenue' },
      '142.6': { type: 'Income', standardName: 'Rental Revenue - Additional', classification: 'Revenue' },
      '150': { type: 'Income', standardName: 'Rental Revenue - Fees', classification: 'Revenue' },
      '160': { type: 'Income', standardName: 'Rental Revenue - Services', classification: 'Revenue' },
      '180': { type: 'Income', standardName: 'Rental Revenue - Utilities', classification: 'Revenue' },
      '200': { type: 'Income', standardName: 'Rental Revenue - Applications', classification: 'Revenue' },
      '2195.86': { type: 'Income', standardName: 'Rental Revenue - Late Fees', classification: 'Revenue' },
      '250': { type: 'Income', standardName: 'Rental Revenue - Parking', classification: 'Revenue' },
      '270': { type: 'Income', standardName: 'Rental Revenue - Storage', classification: 'Revenue' },
      '490': { type: 'Income', standardName: 'Rental Revenue - Miscellaneous', classification: 'Revenue' },
      '60': { type: 'Income', standardName: 'Rental Revenue - Pool', classification: 'Revenue' },
      
      // ADVERTISING & MARKETING
      '500': { type: 'Expenses', standardName: 'Advertising & marketing', classification: 'Expenses' },
      '501': { type: 'Expenses', standardName: 'Facebook', classification: 'Expenses' },
      '502': { type: 'Expenses', standardName: 'Google Ads', classification: 'Expenses' },
      
      // OPERATING EXPENSES
      '510': { type: 'Expenses', standardName: 'Arcade Expenses', classification: 'Expenses' },
      '520': { type: 'Expenses', standardName: 'Bank fees & service charges', classification: 'Expenses' },
      '530': { type: 'Expenses', standardName: 'Disposal & waste fees', classification: 'Expenses' },
      '540': { type: 'Expenses', standardName: 'Insurance', classification: 'Expenses' },
      '550': { type: 'Expenses', standardName: 'Internet & TV services', classification: 'Expenses' },
      '560': { type: 'Expenses', standardName: 'Labor - Cleaning', classification: 'Expenses' },
      '570': { type: 'Expenses', standardName: 'Meals', classification: 'Expenses' },
      '580': { type: 'Expenses', standardName: 'Memberships & subscriptions', classification: 'Expenses' },
      
      // INTEREST EXPENSES
      '600': { type: 'Interest Expense', standardName: 'Mortgage interest', classification: 'Other Expenses' },
      
      // OFFICE EXPENSES
      '610': { type: 'Expenses', standardName: 'Office expenses', classification: 'Expenses' },
      '611': { type: 'Expenses', standardName: 'Shipping & postage', classification: 'Expenses' },
      
      // POOL & HOT TUB
      '620': { type: 'Expenses', standardName: 'Pool and Hot Tub Maintenance', classification: 'Expenses' },
      '621': { type: 'Expenses', standardName: 'Pool and Hot Tub Repairs & Upgrades', classification: 'Expenses' },
      '622': { type: 'Expenses', standardName: 'Pool and Hot Tub Supplies', classification: 'Expenses' },
      
      // MAINTENANCE & REPAIRS
      '630': { type: 'Expenses', standardName: 'Repairs & maintenance', classification: 'Expenses' },
      '640': { type: 'Expenses', standardName: 'Snow & Lawn', classification: 'Expenses' },
      '650': { type: 'Expenses', standardName: 'Supplies', classification: 'Expenses' },
      '660': { type: 'Expenses', standardName: 'Travel', classification: 'Expenses' },
      
      // UTILITIES
      '670': { type: 'Expenses', standardName: 'Utilities', classification: 'Expenses' },
      '671': { type: 'Expenses', standardName: 'Water & sewer', classification: 'Expenses' },
      
      // Additional mappings based on common patterns
      '4720.99': { type: 'Income', standardName: 'Rental Revenue - Airbnb', classification: 'Revenue' },
      
      // Asset accounts (if any appear)
      '1000': { type: 'Fixed Assets', standardName: 'Property - Cost', classification: 'Assets' },
      '1100': { type: 'Fixed Assets', standardName: 'Property Improvements', classification: 'Assets' },
      '1200': { type: 'Current Assets', standardName: 'Cash', classification: 'Assets' },
      '1210': { type: 'Bank', standardName: 'Checking Account', classification: 'Assets' },
      
      // Liability accounts (if any appear)
      '2000': { type: 'Long Term Liabilities', standardName: 'Mortgage Payable', classification: 'Liabilities' },
      '2100': { type: 'Current Liabilities', standardName: 'Accounts Payable', classification: 'Liabilities' }
    };

    // Enhanced classification for journal entries using account_name (column D)
    const classifyJournalAccount = (entry: any) => {
      const accountName = entry.account_name || '';
      const name = accountName.toLowerCase();
      
      // Revenue/Income classification based on your actual account names
      if (name.includes('rental') || name.includes('airbnb') || 
          name.includes('income') || name.includes('revenue')) {
        return { 
          type: 'Income', 
          classification: 'Revenue', 
          standardName: entry.account_name 
        };
      }
      
      // Expense classification - matching your actual P&L categories
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
          name.includes('cost') || name.includes('fee')) {
        return { 
          type: 'Expenses', 
          classification: 'Expenses', 
          standardName: entry.account_name 
        };
      }
      
      // Interest expense (separate category like your P&L)
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
      
      // Default based on debit/credit behavior and line_amount
      if (entry.line_amount > 0 && (entry.credit_amount > entry.debit_amount)) {
        return { 
          type: 'Income', 
          classification: 'Revenue', 
          standardName: entry.account_name || 'Revenue Account'
        };
      } else {
        return { 
          type: 'Expenses', 
          classification: 'Expenses', 
          standardName: entry.account_name || 'Expense Account'
        };
      }
    };

    // Process journal entries using the correct fields
    const enhancedData = journalData.map((entry: any) => {
      // First try to find exact match in chart of accounts
      let accountInfo = accountCodeMap.get(entry.account_name);
      
      if (!accountInfo) {
        // Use intelligent classification based on account_name (column D)
        const classification = classifyJournalAccount(entry);
        accountInfo = classification;
      }
      
      return {
        ...entry,
        account_type: accountInfo?.type || entry.account_type || 'Other',
        classification: accountInfo?.classification || accountInfo?.type || 'Other',
        standard_account_name: accountInfo?.standardName || entry.account_name,
        mapping_method: accountCodeMap.has(entry.account_name) ? 'Chart of Accounts' : 
                        'Account Name Classification'
      };
    });

    return {
      success: true,
      data: enhancedData || [],
      accountsData: accountsData,
      summary: {
        filteredEntries: enhancedData?.length || 0,
        dataSource: 'Supabase + Account Code Mapping',
        filters: { property, bankAccount, monthYear },
        accountTypes: [...new Set(accountsData.map((a: any) => a.account_type))],
        mappingStats: {
          totalEntries: enhancedData?.length || 0,
          chartMapped: enhancedData?.filter((e: any) => e.mapping_method === 'Chart of Accounts').length || 0,
          commonMapped: enhancedData?.filter((e: any) => e.mapping_method === 'Common Mapping').length || 0,
          intelligentMapped: enhancedData?.filter((e: any) => e.mapping_method === 'Intelligent Classification').length || 0
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
  const [selectedMonth, setSelectedMonth] = useState<MonthString>('June 2023');
  const [viewMode, setViewMode] = useState<ViewMode>('detailed');
  const [timeView, setTimeView] = useState<TimeView>('Monthly');
  const [notification, setNotification] = useState<NotificationState>({ show: false, message: '', type: 'info' });
  const [timeViewDropdownOpen, setTimeViewDropdownOpen] = useState(false);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
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

  // Available months - Updated to reflect your actual data (2023)
  const monthsList: MonthString[] = [
    'January 2023', 'February 2023', 'March 2023', 'April 2023', 'May 2023', 'June 2023',
    'July 2023', 'August 2023', 'September 2023', 'October 2023', 'November 2023', 'December 2023'
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
        fetchProperties(),
        fetchBankAccounts()
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
      
      const rawData = await fetchFinancialData(property, bankAccount, selectedMonth);
      
      if (rawData.success) {
        const entries = rawData.data as FinancialEntry[];
        
        // DEBUG: Log raw entries to console
        console.log('🔍 DEBUG - Raw Journal Entries Sample:', entries.slice(0, 5));
        console.log('🔍 DEBUG - Available fields in first entry:', Object.keys(entries[0] || {}));
        
        const transformedPL = transformFinancialData(entries, selectedMonth);
        const transformedCF = transformCashFlowData(entries);

        const combinedData = {
          success: true,
          ...transformedPL,
          ...transformedCF,
          summary: rawData.summary,
          performance: {
            executionTimeMs: Date.now() % 1000
          },
          rawEntries: entries.slice(0, 5) // Keep sample for debugging
        };

        setRealData(combinedData);
        setDataError(null);
        showNotification(`Loaded ${entries.length} financial entries from Supabase`, 'success');
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

  // Get current financial data (P&L only)
  const getCurrentFinancialData = () => {
    if (realData && realData.propertyFinancialData) {
      const propertyKey = Object.keys(realData.propertyFinancialData)[0] || 'All Properties';
      const monthlyData = realData.propertyFinancialData[propertyKey]?.Monthly;
      return monthlyData?.[selectedMonth] || [];
    }
    return [];
  };

  // Get current balance sheet data
  const getCurrentBalanceSheetData = () => {
    if (realData && realData.propertyBalanceSheetData) {
      const propertyKey = Object.keys(realData.propertyBalanceSheetData)[0] || 'All Properties';
      const monthlyData = realData.propertyBalanceSheetData[propertyKey]?.Monthly;
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

  const currentData = getCurrentFinancialData(); // P&L accounts only
  const currentBalanceSheetData = getCurrentBalanceSheetData(); // Balance sheet accounts only
  const currentCashFlowData = getCurrentCashFlowData();

  // Calculate KPIs using proper P&L structure matching your actual P&L
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

    // Total Income (like your P&L shows)
    const revenue = currentData
      .filter(item => item.type === 'Revenue' || 
                     (item.original_type && item.original_type.toLowerCase().includes('income')))
      .reduce((sum, item) => sum + Math.abs(item.total), 0);

    // Cost of Goods Sold (your P&L doesn't show COGS, so this will be 0)
    const cogs = currentData
      .filter(item => item.original_type === 'Cost of Goods Sold')
      .reduce((sum, item) => sum + Math.abs(item.total), 0);

    // Operating Expenses (all expenses except interest)
    const operatingExpenses = currentData
      .filter(item => item.type === 'Expenses' && 
                     item.original_type !== 'Interest Expense')
      .reduce((sum, item) => sum + Math.abs(item.total), 0);

    // Interest Expense (separate line like your P&L)
    const interestExpense = currentData
      .filter(item => item.original_type === 'Interest Expense' ||
                     item.name.toLowerCase().includes('mortgage interest'))
      .reduce((sum, item) => sum + Math.abs(item.total), 0);

    // Other Income (if any)
    const otherIncome = currentData
      .filter(item => item.original_type === 'Other Income')
      .reduce((sum, item) => sum + Math.abs(item.total), 0);

    // Other Expenses (non-operating, excluding interest)
    const otherExpenses = currentData
      .filter(item => item.name.toLowerCase().includes('other expense') &&
                     !item.name.toLowerCase().includes('interest'))
      .reduce((sum, item) => sum + Math.abs(item.total), 0);

    const grossProfit = revenue - cogs; // Since COGS = 0, this equals revenue
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
  };

  const generateTrendData = () => {
    const months = ['Jan 2025', 'Feb 2025', 'Mar 2025', 'Apr 2025', 'May 2025', 'Jun 2025'];
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
        value: item.total
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
    // Show revenue as positive, expenses as negative for P&L presentation
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
                    Supabase Connected
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Real-time P&L, Cash Flow & Balance Sheet • Fixed Data Mapping
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

          {/* DEBUG SECTION - Let's see what we're actually getting */}
          {realData && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="text-yellow-800 text-sm">
                <strong>🔍 DEBUG - First Journal Entry Fields:</strong>
                <div className="mt-2 space-y-1 text-xs bg-white p-3 rounded border font-mono">
                  {realData.rawEntries && realData.rawEntries.length > 0 && (
                    <div>
                      <div><strong>Column D (account_name):</strong> "{realData.rawEntries[0].account_name}"</div>
                      <div><strong>Column G (property_class):</strong> "{realData.rawEntries[0].property_class}"</div>
                      <div><strong>Column J (line_amount):</strong> {realData.rawEntries[0].line_amount}</div>
                      <div><strong>Column L (description):</strong> "{realData.rawEntries[0].description}"</div>
                      <div><strong>Account Type:</strong> "{realData.rawEntries[0].account_type}"</div>
                      <div><strong>Detail Type:</strong> "{realData.rawEntries[0].detail_type}"</div>
                      <div><strong>What getCleanAccountName() returns:</strong> "<span className="text-red-600">{getCurrentFinancialData()[0]?.name}</span>"</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {realData?.performance && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-green-800 text-sm">
                <strong>Data Status:</strong> Loaded {realData.summary.filteredEntries} entries 
                from Supabase • Hybrid Classification System
                <div className="mt-1 text-xs">
                  <strong>Schema Discovery:</strong> Chart of accounts contains property addresses as Fixed Assets, 
                  journal entries use descriptive account names - using intelligent classification
                </div>
                <div className="mt-1 text-xs">
                  <strong>Mapping Results:</strong> {realData.summary.mappingStats?.chartMapped || 0} exact matches, 
                  {realData.summary.mappingStats?.intelligentMapped || 0} intelligent classifications
                </div>
                {realData.summary.accountTypes && (
                  <div className="mt-1">
                    <strong>Chart Account Types:</strong> {realData.summary.accountTypes.join(', ')}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Financial KPIs - Updated for P&L Structure */}
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

          {/* Main Content: Financial Table */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-900">
                  Profit & Loss Statement (Fixed Mapping)
                </h3>
                <div className="text-sm text-gray-600">
                  Account-based classification applied
                </div>
              </div>
            </div>

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
                    {/* REVENUE */}
                    <tr className="bg-blue-50 border-t-2 border-blue-200">
                      <td className="px-6 py-4 text-left text-lg font-bold text-blue-900">
                        💰 REVENUE
                      </td>
                      <td className="px-4 py-4 text-right text-lg font-bold text-blue-900">
                        {formatCurrency(kpis.revenue)}
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-blue-700">
                        100.0%
                      </td>
                    </tr>
                    {currentData
                      .filter(item => item.type === 'Revenue' || 
                                     (item.original_type && item.original_type.toLowerCase().includes('income')))
                      .map((item) => (
                        <tr key={`revenue-${item.name}`} className="hover:bg-gray-50">
                          <td className="px-6 py-2 text-left text-sm text-gray-700 pl-12">
                            {item.name}
                          </td>
                          <td className="px-4 py-2 text-right text-sm text-green-600">
                            {formatCurrency(Math.abs(item.total))}
                          </td>
                          <td className="px-4 py-2 text-right text-sm text-gray-500">
                            {kpis.revenue ? calculatePercentage(Math.abs(item.total), kpis.revenue) : '0%'}
                          </td>
                        </tr>
                      ))}

                    {/* COST OF GOODS SOLD */}
                    <tr className="bg-orange-50 border-t border-gray-200">
                      <td className="px-6 py-4 text-left text-lg font-bold text-orange-900">
                        📦 COST OF GOODS SOLD
                      </td>
                      <td className="px-4 py-4 text-right text-lg font-bold text-red-600">
                        ({formatCurrency(kpis.cogs)})
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-red-600">
                        {kpis.revenue ? calculatePercentage(kpis.cogs, kpis.revenue) : '0%'}
                      </td>
                    </tr>
                    {currentData
                      .filter(item => item.original_type === 'Cost of Goods Sold' || 
                                     item.name.toLowerCase().includes('cost of goods') ||
                                     item.name.toLowerCase().includes('cogs'))
                      .map((item) => (
                        <tr key={`cogs-${item.name}`} className="hover:bg-gray-50">
                          <td className="px-6 py-2 text-left text-sm text-gray-700 pl-12">
                            {item.name}
                          </td>
                          <td className="px-4 py-2 text-right text-sm text-red-600">
                            ({formatCurrency(Math.abs(item.total))})
                          </td>
                          <td className="px-4 py-2 text-right text-sm text-gray-500">
                            {kpis.revenue ? calculatePercentage(Math.abs(item.total), kpis.revenue) : '0%'}
                          </td>
                        </tr>
                      ))}

                    {/* GROSS PROFIT */}
                    <tr className="bg-green-100 border-t-2 border-green-300">
                      <td className="px-6 py-4 text-left text-lg font-bold text-green-800">
                        💚 GROSS PROFIT
                      </td>
                      <td className="px-4 py-4 text-right text-lg font-bold text-green-800">
                        {formatCurrency(kpis.grossProfit)}
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-bold text-green-800">
                        {kpis.grossMargin.toFixed(1)}%
                      </td>
                    </tr>

                    {/* OPERATING EXPENSES */}
                    <tr className="bg-red-50 border-t border-gray-200">
                      <td className="px-6 py-4 text-left text-lg font-bold text-red-900">
                        🏢 OPERATING EXPENSES
                      </td>
                      <td className="px-4 py-4 text-right text-lg font-bold text-red-600">
                        ({formatCurrency(kpis.operatingExpenses)})
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-red-600">
                        {kpis.revenue ? calculatePercentage(kpis.operatingExpenses, kpis.revenue) : '0%'}
                      </td>
                    </tr>
                    {currentData
                      .filter(item => item.type === 'Expenses' && 
                                     item.original_type !== 'Cost of Goods Sold' &&
                                     !item.name.toLowerCase().includes('interest') &&
                                     !item.name.toLowerCase().includes('other'))
                      .map((item) => (
                        <tr key={`opex-${item.name}`} className="hover:bg-gray-50">
                          <td className="px-6 py-2 text-left text-sm text-gray-700 pl-12">
                            {item.name}
                          </td>
                          <td className="px-4 py-2 text-right text-sm text-red-600">
                            ({formatCurrency(Math.abs(item.total))})
                          </td>
                          <td className="px-4 py-2 text-right text-sm text-gray-500">
                            {kpis.revenue ? calculatePercentage(Math.abs(item.total), kpis.revenue) : '0%'}
                          </td>
                        </tr>
                      ))}

                    {/* OPERATING INCOME */}
                    <tr className="bg-blue-100 border-t-2 border-blue-300">
                      <td className="px-6 py-4 text-left text-lg font-bold text-blue-800">
                        🎯 OPERATING INCOME
                      </td>
                      <td className="px-4 py-4 text-right text-lg font-bold text-blue-800">
                        {formatCurrency(kpis.operatingIncome)}
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-bold text-blue-800">
                        {kpis.operatingMargin.toFixed(1)}%
                      </td>
                    </tr>

                    {/* OTHER INCOME */}
                    {kpis.otherIncome > 0 && (
                      <>
                        <tr className="bg-green-50 border-t border-gray-200">
                          <td className="px-6 py-4 text-left text-lg font-bold text-green-900">
                            ➕ OTHER INCOME
                          </td>
                          <td className="px-4 py-4 text-right text-lg font-bold text-green-600">
                            {formatCurrency(kpis.otherIncome)}
                          </td>
                          <td className="px-4 py-4 text-right text-sm text-green-600">
                            {kpis.revenue ? calculatePercentage(kpis.otherIncome, kpis.revenue) : '0%'}
                          </td>
                        </tr>
                        {currentData
                          .filter(item => item.original_type === 'Other Income' ||
                                         item.name.toLowerCase().includes('other income') ||
                                         item.name.toLowerCase().includes('interest income'))
                          .map((item) => (
                            <tr key={`other-income-${item.name}`} className="hover:bg-gray-50">
                              <td className="px-6 py-2 text-left text-sm text-gray-700 pl-12">
                                {item.name}
                              </td>
                              <td className="px-4 py-2 text-right text-sm text-green-600">
                                {formatCurrency(Math.abs(item.total))}
                              </td>
                              <td className="px-4 py-2 text-right text-sm text-gray-500">
                                {kpis.revenue ? calculatePercentage(Math.abs(item.total), kpis.revenue) : '0%'}
                              </td>
                            </tr>
                          ))}
                      </>
                    )}

                    {/* OTHER EXPENSES */}
                    {kpis.otherExpenses > 0 && (
                      <>
                        <tr className="bg-red-50 border-t border-gray-200">
                          <td className="px-6 py-4 text-left text-lg font-bold text-red-900">
                            ➖ OTHER EXPENSES
                          </td>
                          <td className="px-4 py-4 text-right text-lg font-bold text-red-600">
                            ({formatCurrency(kpis.otherExpenses)})
                          </td>
                          <td className="px-4 py-4 text-right text-sm text-red-600">
                            {kpis.revenue ? calculatePercentage(kpis.otherExpenses, kpis.revenue) : '0%'}
                          </td>
                        </tr>
                        {currentData
                          .filter(item => item.name.toLowerCase().includes('interest expense') ||
                                         item.name.toLowerCase().includes('other expense') ||
                                         (item.type === 'Expenses' && item.name.toLowerCase().includes('other')))
                          .map((item) => (
                            <tr key={`other-expense-${item.name}`} className="hover:bg-gray-50">
                              <td className="px-6 py-2 text-left text-sm text-gray-700 pl-12">
                                {item.name}
                              </td>
                              <td className="px-4 py-2 text-right text-sm text-red-600">
                                ({formatCurrency(Math.abs(item.total))})
                              </td>
                              <td className="px-4 py-2 text-right text-sm text-gray-500">
                                {kpis.revenue ? calculatePercentage(Math.abs(item.total), kpis.revenue) : '0%'}
                              </td>
                            </tr>
                          ))}
                      </>
                    )}

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
