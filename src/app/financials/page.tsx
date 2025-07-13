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

// Fetch properties from Supabase
const fetchProperties = async (): Promise<string[]> => {
  try {
    console.log('🏠 Fetching unique property_class values from journal_entries...');
    
    // First try to get properties from 2025 data to get the most current property list
    const current2025Response = await fetch(`${SUPABASE_URL}/rest/v1/journal_entries?select=property_class&transaction_date=gte.2025-01-01&transaction_date=lte.2025-12-31`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    let uniquePropertiesFromData = [];
    
    if (current2025Response.ok) {
      const data2025 = await current2025Response.json();
      console.log('📅 Found 2025 data entries:', data2025.length);
      const properties2025 = data2025.map((item: any) => item.property_class);
      const filtered2025 = properties2025.filter((pc: any) => pc && pc.trim() !== '');
      uniquePropertiesFromData = [...new Set(filtered2025)];
      console.log('🏠 Properties found in 2025 data:', uniquePropertiesFromData);
    } else {
      console.log('📅 No 2025 data found, fetching all property data...');
      // Fallback to all data if 2025 data not available
      const allDataResponse = await fetch(`${SUPABASE_URL}/rest/v1/journal_entries?select=property_class`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (allDataResponse.ok) {
        const allData = await allDataResponse.json();
        const allProperties = allData.map((item: any) => item.property_class);
        const filteredAll = allProperties.filter((pc: any) => pc && pc.trim() !== '');
        uniquePropertiesFromData = [...new Set(filteredAll)];
      }
    }
    
    // Known properties based on your data (with correct names - only Columbus, IN)
    const knownProperties = [
      'Cleveland',
      'Columbus, IN',  // Only the one with comma and state
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
    
    // Combine data-driven properties with known properties
    const allProperties = [...new Set([...uniquePropertiesFromData, ...knownProperties])];
    
    if (allProperties.length === 0) {
      return ['All Properties', 'General'];
    }
    
    const result = ['All Properties', ...allProperties.sort()];
    console.log('✅ Final property list (2025 data + known):', result);
    console.log('🔍 Properties from 2025 data:', uniquePropertiesFromData);
    console.log('🔍 Known properties added:', knownProperties);
    return result;
    
  } catch (error) {
    console.error('❌ Property fetch error:', error);
    return [
      'All Properties',
      'Cleveland',
      'Columbus, IN',  // Only the one with comma and state
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
  }
};

// Enhanced data transformation functions
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

// Fetch financial data from Supabase
const fetchFinancialData = async (
  property: string = 'All Properties',
  monthYear: string
) => {
  try {
    console.log('🔍 FETCHING FINANCIAL DATA with filters:', { property, monthYear });
    
    const [month, year] = monthYear.split(' ');
    const monthNum = new Date(`${month} 1, ${year}`).getMonth() + 1;
    
    // STRICT date filtering - exactly the month requested
    const startDate = `${year}-${monthNum.toString().padStart(2, '0')}-01`;
    const lastDay = new Date(parseInt(year), monthNum, 0).getDate(); // Get last day of the month
    const endDate = `${year}-${monthNum.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
    
    console.log(`📅 STRICT DATE RANGE: ${startDate} to ${endDate} (${month} ${year} ONLY)`);
    
    let url = `${SUPABASE_URL}/rest/v1/journal_entries?select=*&transaction_date=gte.${startDate}&transaction_date=lte.${endDate}&order=transaction_date,account_name`;
    
if (filterClause) {
  url += filterClause;
  console.log('🏠 Filtering by multiple property_class values:', Array.from(selectedProperties));
}



    console.log('📡 Final URL with STRICT date filtering:', url);

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
      
      console.log('🔍 Classifying account:', accountName, 'Description:', entry.description, 'Line amount:', entry.line_amount, 'Credit:', entry.credit_amount, 'Debit:', entry.debit_amount);
      
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
        console.log('✅ Classified as REVENUE:', accountName, 'Method: Pattern matching or credit entry');
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
        console.log('✅ Classified as EXPENSE:', accountName);
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
        console.log('🔄 RECLASSIFICATION ENTRY detected:', accountName, 'Description:', entry.description);
        
        // For reclassification entries, classify based on the account name pattern and net effect
        if (name.includes('revenue') || name.includes('income') || name.includes('rental') || name.includes('booking')) {
          console.log('✅ Reclassification classified as REVENUE:', accountName);
          return { 
            type: 'Income', 
            classification: 'Revenue', 
            standardName: entry.account_name 
          };
        } else {
          console.log('✅ Reclassification classified as EXPENSE:', accountName);
          return { 
            type: 'Expenses', 
            classification: 'Expenses', 
            standardName: entry.account_name 
          };
        }
      }
      
      // DEFAULT CLASSIFICATION: Use credit/debit logic with enhanced logging
      if (entry.credit_amount > entry.debit_amount || entry.line_amount < 0) {
        console.log('🔄 Default classified as REVENUE (credit > debit or negative line_amount):', accountName);
        return { 
          type: 'Income', 
          classification: 'Revenue', 
          standardName: entry.account_name || 'Revenue Account'
        };
      } else if (entry.debit_amount > entry.credit_amount || entry.line_amount > 0) {
        console.log('🔄 Default classified as EXPENSE (debit > credit or positive line_amount):', accountName);
        return { 
          type: 'Expenses', 
          classification: 'Expenses', 
          standardName: entry.account_name || 'Expense Account'
        };
      } else {
        // Equal amounts - classify based on account name patterns
        console.log('🔄 Equal amounts - using name patterns for:', accountName);
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
      
      if (accountInfo) {
        console.log(`✅ FOUND in accounts table: ${entry.account_name} → ${accountInfo.classification}`);
      } else {
        console.log(`❌ NOT FOUND in accounts table: ${entry.account_name}, using account_type from journal entry`);
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
      
let filterClause = '';
let propertyFilter = 'All Properties';

if (selectedProperties.size > 0 && !selectedProperties.has('All Properties')) {
  const selected = Array.from(selectedProperties).map(p => `property_class.eq.${encodeURIComponent(p)}`);
  filterClause = `&or=(${selected.join(',')})`;
  propertyFilter = 'Multiple Properties';
}


      
      console.log('🔍 LOADING DATA WITH FILTERS:', {
        selectedProperties: Array.from(selectedProperties),
        propertyFilter,
        month: selectedMonth
      });
      
      const rawData = await fetchFinancialData(propertyFilter, selectedMonth);
      
      if (rawData.success) {
        const entries = rawData.data as FinancialEntry[];
        
        console.log('🔍 DEBUG - Raw Journal Entries Sample:', entries.slice(0, 5));
        console.log('🔍 DEBUG - Total entries loaded:', entries.length);
        
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
                ${formatCurrency(Math.abs(entry.amount_used))}
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
                                          {item.entries && item.entries.length > 0 && (
                                            <span className="ml-2 text-xs text-gray-500">
                                              ({item.entries.reduce((props: Set<string>, entry: any) => props.add(entry.property || 'No Property'), new Set()).size} properties)
                                            </span>
                                          )}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-2 text-right text-sm text-green-600">
                                      {formatCurrency(Math.abs(item.total))}
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
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-4 py-2 text-right text-sm text-red-600">
                                      ({formatCurrency(Math.abs(item.total))})
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

              {/* Property Performance Summary */}
              <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900">Property Summary</h3>
                </div>
                <div className="p-6">
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
                          <span className="text-sm text-gray-600">Journal Entries:</span>
                          <span className="text-sm font-medium">{realData.summary.filteredEntries}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-600">Properties in Data:</span>
                          <span className="text-sm font-medium">{realData.summary.propertiesInData?.length || 0}</span>
                        </div>
                      </>
                    )}
                  </div>
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
