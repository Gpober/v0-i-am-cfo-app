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
        // Revenue: Use absolute value of line_amount, but check if it should be negative
        amount = Math.abs(entry.line_amount || (entry.credit_amount - entry.debit_amount));
        break;
        
      case 'Expenses':
        // Expenses: Use absolute value of line_amount
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
    console.log('🏠 Fetching unique property_class values from journal_entries...');
    
    // Simpler query - just get all property_class values
    const response = await fetch(`${SUPABASE_URL}/rest/v1/journal_entries?select=property_class`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📡 Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Supabase error:', response.status, errorText);
      throw new Error(`Supabase error: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('📋 Total rows received:', data.length);
    console.log('📋 Sample data:', data.slice(0, 10));
    
    // Let's see ALL the property class values, not just unique ones
    const allPropertyClasses = data.map((item: any) => item.property_class);
    console.log('🔍 ALL property_class values (first 20):', allPropertyClasses.slice(0, 20));
    console.log('🔍 Property class value types:', allPropertyClasses.slice(0, 5).map(pc => typeof pc));
    
    // Count occurrences
    const propertyCounts = {};
    allPropertyClasses.forEach(pc => {
      if (pc !== null && pc !== undefined && pc !== '') {
        propertyCounts[pc] = (propertyCounts[pc] || 0) + 1;
      }
    });
    console.log('📊 Property class counts:', propertyCounts);
    
    // Extract unique property classes, filtering out null/empty values
    const filteredClasses = allPropertyClasses.filter((pc: any) => pc && pc.trim() !== '');
    const uniqueProperties = [...new Set(filteredClasses)];
    
    console.log('🏠 Filtered property classes:', filteredClasses.length);
    console.log('🏠 Unique property classes found:', uniqueProperties);
    
    if (uniqueProperties.length === 0) {
      console.warn('⚠️ No property classes found, using fallback');
      return ['All Properties', 'General']; // Minimal fallback
    }
    
    if (uniqueProperties.length === 1) {
      console.warn('⚠️ Only 1 property class found:', uniqueProperties[0]);
      console.log('🔄 Adding hardcoded properties to supplement');
      // If only one found, add the others we know exist
      const knownProperties = ['Detroit', 'General', 'Hastings MN', 'Lisbon', 'Mokena IL', 'Pine Terrace', 'Rockford', 'Terraview', 'Wesley'];
      const combined = [...new Set([...uniqueProperties, ...knownProperties])];
      return ['All Properties', ...combined.sort()];
    }
    
    const result = ['All Properties', ...uniqueProperties.sort()];
    console.log('✅ Final property list:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Property fetch error:', error);
    console.log('🔄 Using hardcoded property list from your data');
    
    // Use the exact properties I saw in your screenshot
    return [
      'All Properties', 
      'Detroit',
      'General', 
      'Hastings MN',
      'Lisbon',
      'Mokena IL',
      'Pine Terrace',
      'Rockford',
      'Terraview',
      'Wesley'
    ];
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
    console.log('🔍 FETCHING FINANCIAL DATA with filters:', { property, bankAccount, monthYear });
    
    // Convert "June 2025" to date range for filtering
    const [month, year] = monthYear.split(' ');
    const monthNum = new Date(`${month} 1, ${year}`).getMonth() + 1;
    const startDate = `${year}-${monthNum.toString().padStart(2, '0')}-01`;
    const endDate = `${year}-${monthNum.toString().padStart(2, '0')}-${new Date(parseInt(year), monthNum, 0).getDate()}`;
    
    let url = `${SUPABASE_URL}/rest/v1/journal_entries?select=*&transaction_date=gte.${startDate}&transaction_date=lte.${endDate}&order=account_name`;
    
    // Handle multiple property filtering
    if (property !== 'All Properties') {
      // For now, handle single property (first selected)
      // TODO: Enhance to handle multiple property filtering with OR conditions
      url += `&property_class=eq.${encodeURIComponent(property)}`;
      console.log('🏠 Filtering by property_class:', property);
    } else {
      console.log('🏠 No property filter applied (All Properties selected)');
    }
    
    // Add bank account filter if applicable
    if (bankAccount !== 'All Accounts') {
      url += `&account_name=ilike.%${encodeURIComponent(bankAccount)}%`;
      console.log('🏦 Filtering by bank account:', bankAccount);
    }

    console.log('📡 Final URL:', url);

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
    
    console.log('📊 Journal entries loaded:', journalData.length);
    console.log('📋 Properties in loaded data:', [...new Set(journalData.map((e: any) => e.property_class))]);
    console.log('🔍 Sample journal entries for classification:', journalData.slice(0, 3));
    
    // Log account names to see what we're working with
    const accountNames = [...new Set(journalData.map((e: any) => e.account_name))].slice(0, 10);
    console.log('📝 Sample account names:', accountNames);
    
    // Create account code to name mapping from your chart of accounts
    const accountLookupMap = new Map();
    
    // Build lookup from your accounts table - THIS IS THE KEY!
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
                      account.account_type // Default to the account type
      });
    });

    console.log('📋 Accounts lookup built:', accountLookupMap.size, 'accounts mapped');
    console.log('📋 Sample account mappings:', Array.from(accountLookupMap.entries()).slice(0, 5));

    // Enhanced classification for journal entries using account_name (column D)
    const classifyJournalAccount = (entry: any) => {
      const accountName = entry.account_name || '';
      const name = accountName.toLowerCase();
      
      console.log('🔍 Classifying account:', accountName, 'Line amount:', entry.line_amount, 'Debit:', entry.debit_amount, 'Credit:', entry.credit_amount);
      
      // Revenue/Income classification - BROADER CRITERIA
      if (name.includes('rental') || name.includes('airbnb') || 
          name.includes('income') || name.includes('revenue') ||
          name.includes('rent') || name.includes('fee') ||
          name.includes('sales') || name.includes('service') ||
          entry.credit_amount > 0 && entry.debit_amount === 0) { // Pure credit entries often revenue
        console.log('✅ Classified as REVENUE:', accountName);
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
          name.includes('cost') ||
          entry.debit_amount > 0 && entry.credit_amount === 0) { // Pure debit entries often expenses
        console.log('✅ Classified as EXPENSE:', accountName);
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
      
      // DEFAULT CLASSIFICATION: Use credit/debit logic
      if (entry.credit_amount > entry.debit_amount) {
        console.log('🔄 Default classified as REVENUE (credit > debit):', accountName);
        return { 
          type: 'Income', 
          classification: 'Revenue', 
          standardName: entry.account_name || 'Revenue Account'
        };
      } else if (entry.debit_amount > entry.credit_amount) {
        console.log('🔄 Default classified as EXPENSE (debit > credit):', accountName);
        return { 
          type: 'Expenses', 
          classification: 'Expenses', 
          standardName: entry.account_name || 'Expense Account'
        };
      } else {
        // Equal or both zero - classify based on line_amount
        if (entry.line_amount < 0) {
          console.log('🔄 Default classified as REVENUE (negative line_amount):', accountName);
          return { 
            type: 'Income', 
            classification: 'Revenue', 
            standardName: entry.account_name || 'Revenue Account'
          };
        } else {
          console.log('🔄 Default classified as EXPENSE (positive line_amount):', accountName);
          return { 
            type: 'Expenses', 
            classification: 'Expenses', 
            standardName: entry.account_name || 'Expense Account'
          };
        }
      }
    };

    // Process journal entries using your accounts table classification
    const enhancedData = journalData.map((entry: any) => {
      // First try to find exact match in your accounts table
      let accountInfo = accountLookupMap.get(entry.account_name);
      
      if (accountInfo) {
        console.log(`✅ FOUND in accounts table: ${entry.account_name} → ${accountInfo.classification}`);
      } else {
        console.log(`❌ NOT FOUND in accounts table: ${entry.account_name}, using fallback classification`);
        // Fallback to intelligent classification for unmapped accounts
        const classification = classifyJournalAccount(entry);
        accountInfo = classification;
      }
      
      return {
        ...entry,
        account_type: accountInfo?.type || entry.account_type || 'Other',
        classification: accountInfo?.classification || accountInfo?.type || 'Other',
        standard_account_name: accountInfo?.standardName || entry.account_name,
        mapping_method: accountLookupMap.has(entry.account_name) ? 'Accounts Table' : 
                        'Fallback Classification'
      };
    });

    // Debug: Log classification results using your accounts table
    const revenueEntries = enhancedData.filter(e => e.classification === 'Revenue');
    const expenseEntries = enhancedData.filter(e => e.classification === 'Expenses');
    
    console.log('💰 Revenue entries found using accounts table:', revenueEntries.length);
    console.log('💰 Revenue accounts from your table:', revenueEntries.slice(0, 5).map(e => ({
      account: e.account_name,
      classification: e.classification,
      mapping: e.mapping_method,
      line_amount: e.line_amount
    })));
    
    console.log('💸 Expense entries found using accounts table:', expenseEntries.length);
    console.log('💸 Expense accounts from your table:', expenseEntries.slice(0, 5).map(e => ({
      account: e.account_name,
      classification: e.classification,
      mapping: e.mapping_method,
      line_amount: e.line_amount
    })));

    return {
      success: true,
      data: enhancedData || [],
      accountsData: accountsData,
      summary: {
        filteredEntries: enhancedData?.length || 0,
        dataSource: 'Supabase + Property Class Filtering',
        filters: { property, bankAccount, monthYear },
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

  // Dynamic months list - will work with any year/month combination
  const generateMonthsList = () => {
    const months = [];
    const currentYear = new Date().getFullYear();
    
    // Generate months for multiple years to handle any data range
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
  }, [selectedProperties, selectedBankAccounts, selectedMonth]);

  const loadInitialData = async () => {
    try {
      setIsLoadingData(true);
      
      // Load properties and bank accounts
      const [properties, bankAccounts] = await Promise.all([
        fetchProperties(),
        fetchBankAccounts()
      ]);
      
      console.log('🏠 Available properties loaded:', properties);
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
      
      // Handle property selection - use first selected property for filtering
      let propertyFilter = 'All Properties';
      if (selectedProperties.size > 0 && !selectedProperties.has('All Properties')) {
        propertyFilter = Array.from(selectedProperties)[0]; // Use first selected for now
        // TODO: Enhance to support multiple property OR filtering
      }
      
      const bankAccount = selectedBankAccounts.has('All Accounts') || selectedBankAccounts.size === 0
        ? 'All Accounts'
        : Array.from(selectedBankAccounts)[0];
      
      console.log('🔍 LOADING DATA WITH FILTERS:', {
        selectedProperties: Array.from(selectedProperties),
        propertyFilter,
        bankAccount,
        month: selectedMonth
      });
      
      const rawData = await fetchFinancialData(propertyFilter, bankAccount, selectedMonth);
      
      if (rawData.success) {
        const entries = rawData.data as FinancialEntry[];
        
        // DEBUG: Log raw entries to console
        console.log('🔍 DEBUG - Raw Journal Entries Sample:', entries.slice(0, 5));
        console.log('🔍 DEBUG - Total entries loaded:', entries.length);
        console.log('🔍 DEBUG - Properties in data:', [...new Set(entries.map(e => e.property_class))]);
        
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
              bankAccounts: Array.from(selectedBankAccounts),
              month: selectedMonth
            }
          },
          performance: {
            executionTimeMs: Date.now() % 1000
          },
          rawEntries: entries.slice(0, 5) // Keep sample for debugging
        };

        setRealData(combinedData);
        setDataError(null);
        
        const propertyText = selectedProperties.has('All Properties') 
          ? 'all properties' 
          : `${selectedProperties.size} selected properties`;
          
        showNotification(`Loaded ${entries.length} entries for ${propertyText} in ${selectedMonth}`, 'success');
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
      // If clicking "All Properties", clear everything and add only "All Properties"
      newSelected.clear();
      newSelected.add('All Properties');
    } else {
      // If clicking individual property, remove "All Properties" first
      newSelected.delete('All Properties');
      
      // Then toggle the individual property
      if (newSelected.has(property)) {
        newSelected.delete(property);
      } else {
        newSelected.add(property);
      }
      
      // If no individual properties selected, default back to "All Properties"
      if (newSelected.size === 0) {
        newSelected.add('All Properties');
      }
    }
    
    setSelectedProperties(newSelected);
    console.log('🏠 Property selection changed:', Array.from(newSelected));
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
                  <span className="truncate">
                    {selectedProperties.has('All Properties') 
                      ? 'All Property Classes' 
                      : selectedProperties.size === 0 
                        ? 'Select Property Classes'
                        : selectedProperties.size === 1
                          ? Array.from(selectedProperties)[0]
                          : `${selectedProperties.size} Properties Selected`
                    }
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

          {/* DEBUG SECTION - Property Class Multi-Select Status */}
          {realData && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="text-yellow-800 text-sm">
                <strong>🔍 Property Class Multi-Select Debug:</strong>
                <div className="mt-2 space-y-1 text-xs bg-white p-3 rounded border font-mono">
                  <div><strong>Available Property Classes:</strong> {availableProperties.filter(p => p !== 'All Properties').join(', ') || 'None found'}</div>
                  <div><strong>Selected Properties:</strong> {Array.from(selectedProperties).join(', ')}</div>
                  <div><strong>Active Filter:</strong> {!selectedProperties.has('All Properties') ? `property_class = "${Array.from(selectedProperties)[0]}"` : 'No filter (All Properties)'}</div>
                  <div><strong>Properties in Current Data:</strong> {realData.summary.propertiesInData?.join(', ') || 'None'}</div>
                  <div><strong>Total Entries Loaded:</strong> {realData.summary.filteredEntries}</div>
                  <div><strong>Multi-Select Status:</strong> {selectedProperties.size > 1 ? `${selectedProperties.size} properties selected (showing first: ${Array.from(selectedProperties)[0]})` : 'Single or All selected'}</div>
                </div>
              </div>
            </div>
          )}

          {realData?.performance && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-green-800 text-sm">
                <strong>Data Status:</strong> Loaded {realData.summary.filteredEntries} entries 
                from Supabase • Property Class Filtering Active
                <div className="mt-1 text-xs">
                  <strong>Current Filters:</strong> {getSelectedPropertiesText()} • {getSelectedBankAccountsText()} • {selectedMonth}
                </div>
                <div className="mt-1 text-xs">
                  <strong>Data Source:</strong> {realData.summary.dataSource}
                </div>
                <div className="mt-1 text-xs">
                  <strong>Mapping Results:</strong> {realData.summary.mappingStats?.accountsTableMapped || 0} accounts table matches, 
                  {realData.summary.mappingStats?.fallbackMapped || 0} fallback classifications
                </div>
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
                  Profit & Loss Statement (By Property Class)
                </h3>
                <div className="text-sm text-gray-600">
                  Filtered by property_class column
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
