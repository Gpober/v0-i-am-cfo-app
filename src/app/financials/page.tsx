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
const FinancialTab = {
  PL: 'p&l',
  CASH_FLOW: 'cash-flow',
  BALANCE_SHEET: 'balance-sheet'
};

const TimeView = {
  MONTHLY: 'Monthly',
  YTD: 'YTD',
  TTM: 'TTM',
  MOM: 'MoM',
  YOY: 'YoY'
};

const ViewMode = {
  TOTAL: 'total',
  DETAILED: 'detailed'
};

// Real Supabase client
const createSupabaseClient = () => {
  return {
    from: (table) => ({
      select: (columns = '*') => ({
        eq: (column, value) => ({
          order: (orderBy) => 
            fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${columns}&${column}=eq.${encodeURIComponent(value)}&order=${orderBy}`, {
              headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
              }
            }).then(res => res.json()).then(data => ({ data, error: null })).catch(error => ({ data: null, error }))
        }),
        order: (orderBy) => 
          fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${columns}&order=${orderBy}`, {
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json'
            }
          }).then(res => res.json()).then(data => ({ data, error: null })).catch(error => ({ data: null, error })),
        then: (callback) => 
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
const fetchProperties = async () => {
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
      const properties2025 = data2025.map((item) => item.property_class);
      const filtered2025 = properties2025.filter((pc) => pc && pc.trim() !== '');
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
        const allProperties = allData.map((item) => item.property_class);
        const filteredAll = allProperties.filter((pc) => pc && pc.trim() !== '');
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
const transformFinancialData = (entries, monthYear) => {
  const getCleanAccountName = (entry) => {
    let accountName = entry.account_name?.trim() || '';
    accountName = accountName.replace(/^[^:]*:/, '').trim();
    
    if (!accountName || accountName === 'Journal Entry' || accountName === 'RJE') {
      accountName = entry.description?.trim() || `${entry.account_type || 'Other'} Account`;
    }
    
    return accountName;
  };

  const groupedData = entries.reduce((acc, entry) => {
    const accountName = getCleanAccountName(entry);
    const property = entry.property_class || 'General';
    const accountKey = `${accountName}-${entry.classification || entry.account_type}`;

    if (!acc[accountKey]) {
      acc[accountKey] = {
        name: accountName,
        type: entry.classification || entry.account_type,
        original_type: entry.account_type,
        detail_type: entry.detail_type || entry.account_type,
        total: 0,
        months: {},
        entries: [],
        properties: new Set(),
        subAccounts: {},
        mapping_method: entry.mapping_method || 'Unknown'
      };
    }

    // Add property to the set of properties for this account
    acc[accountKey].properties.add(property);

    // Initialize sub-account if it doesn't exist
    if (!acc[accountKey].subAccounts[property]) {
      acc[accountKey].subAccounts[property] = {
        name: property,
        total: 0,
        months: {},
        entries: []
      };
    }

    // Calculate amount based on account type - REVISED CALCULATION
    let amount = 0;
    switch (acc[accountKey].type) {
      case 'Revenue':
        // For revenue: normal balance is credit (positive)
        amount = (entry.credit_amount || 0) - (entry.debit_amount || 0);
        break;
      case 'Expenses':
        // For expenses: normal balance is debit (positive)
        amount = (entry.debit_amount || 0) - (entry.credit_amount || 0);
        break;
      case 'Assets':
        // Assets: normal debit balance
        amount = (entry.debit_amount || 0) - (entry.credit_amount || 0);
        break;
      case 'Liabilities':
        // Liabilities: normal credit balance
        amount = (entry.credit_amount || 0) - (entry.debit_amount || 0);
        break;
      default:
        amount = entry.line_amount || (entry.debit_amount || 0) - (entry.credit_amount || 0);
    }

    // Update totals - no Math.abs() anymore!
    acc[accountKey].total += amount;
    acc[accountKey].subAccounts[property].total += amount;

    // Update monthly data
    acc[accountKey].months[monthYear] = 
      (acc[accountKey].months[monthYear] || 0) + amount;
      
    acc[accountKey].subAccounts[property].months[monthYear] = 
      (acc[accountKey].subAccounts[property].months[monthYear] || 0) + amount;

    // Store entries
    const entryData = {
      ...entry,
      amount_used: amount
    };
    acc[accountKey].entries.push(entryData);
    acc[accountKey].subAccounts[property].entries.push(entryData);

    return acc;
  }, {});

  // Convert to array and sort
  const sortedData = Object.values(groupedData)
    .filter((item) => Math.abs(item.total) > 0.01)
    .sort((a, b) => {
      const typeOrder = {
        'Revenue': 1,
        'Expenses': 2,
        'Assets': 3,
        'Liabilities': 4,
        'Equity': 5,
        'Other': 99
      };
      const aOrder = typeOrder[a.type] || 99;
      const bOrder = typeOrder[b.type] || 99;
      return aOrder - bOrder || a.name.localeCompare(b.name);
    });

  // Mark accounts with multiple properties as expandable
  sortedData.forEach((item) => {
    item.hasSubAccounts = item.properties.size > 1;
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

const transformCashFlowData = (entries) => {
  const inFlowItems = [];
  const outFlowItems = [];

  entries.forEach(entry => {
    if (entry.account_type === 'Income' || entry.account_type === 'Revenue' || entry.account_type === 'Other Income') {
      const existing = inFlowItems.find(item => item.name === entry.account_name);
      const amount = (entry.credit_amount || 0) - (entry.debit_amount || 0);
      
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
      const amount = (entry.debit_amount || 0) - (entry.credit_amount || 0);
      
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

// Fetch financial data from Supabase with multiple property support
const fetchFinancialData = async (
  properties = 'All Properties',
  monthYear
) => {
  try {
    console.log('🔍 FETCHING FINANCIAL DATA with filters:', { properties, monthYear });
    
    const [month, year] = monthYear.split(' ');
    const monthNum = new Date(`${month} 1, ${year}`).getMonth() + 1;
    
    // STRICT date filtering - exactly the month requested
    const startDate = `${year}-${monthNum.toString().padStart(2, '0')}-01`;
    const lastDay = new Date(parseInt(year), monthNum, 0).getDate(); // Get last day of the month
    const endDate = `${year}-${monthNum.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
    
    console.log(`📅 STRICT DATE RANGE: ${startDate} to ${endDate} (${month} ${year} ONLY)`);
    
    let url = `${SUPABASE_URL}/rest/v1/journal_entries?select=*&transaction_date=gte.${startDate}&transaction_date=lte.${endDate}&order=transaction_date,account_name`;
    
    // Enhanced property filtering
    if (properties !== 'All Properties' && properties.length > 0) {
      if (Array.isArray(properties)) {
        const propertyList = properties.map(p => `"${p}"`).join(',');
        url += `&or=(property_class.in.(${encodeURIComponent(propertyList)}),property_class.is.null)`;
      } else {
        url += `&property_class=eq.${encodeURIComponent(properties)}`;
      }
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
    const filteredJournalData = journalData.filter((entry) => {
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
      const dates = filteredJournalData.map((e) => e.transaction_date).sort();
      console.log(`📅 ACTUAL DATE RANGE in filtered data: ${dates[0]} to ${dates[dates.length - 1]}`);
    }
    
    // Create account lookup map
    const accountLookupMap = new Map();
    
    accountsData.forEach((account) => {
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
    const classifyJournalAccount = (entry) => {
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
    const enhancedData = filteredJournalData.map((entry) => {
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
        filters: { properties, monthYear },
        accountTypes: [...new Set(accountsData.map((a) => a.account_type))],
        propertiesInData: [...new Set(enhancedData.map((e) => e.property_class))],
        mappingStats: {
          totalEntries: enhancedData?.length || 0,
          accountsTableMapped: enhancedData?.filter((e) => e.mapping_method === 'Accounts Table').length || 0,
          fallbackMapped: enhancedData?.filter((e) => e.mapping_method === 'Fallback Classification').length || 0
        }
      }
    };
  } catch (error) {
    console.error('Error fetching financial data:', error);
    return {
      success: false,
      error: error.message,
      data: []
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

export default function FinancialsPage() {
  const [activeTab, setActiveTab] = useState('p&l');
  const [selectedMonth, setSelectedMonth] = useState('May 2025');
  const [viewMode, setViewMode] = useState('detailed');
  const [timeView, setTimeView] = useState('Monthly');
  const [notification, setNotification] = useState({ show: false, message: '', type: 'info' });
  const [timeViewDropdownOpen, setTimeViewDropdownOpen] = useState(false);
  const [expandedAccounts, setExpandedAccounts] = useState(new Set());
  const [propertyDropdownOpen, setPropertyDropdownOpen] = useState(false);
  const [selectedProperties, setSelectedProperties] = useState(new Set(['All Properties']));
  const [accountTooltip, setAccountTooltip] = useState({ show: false, content: '', x: 0, y: 0 });

  // Real data state
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [realData, setRealData] = useState(null);
  const [dataError, setDataError] = useState(null);
  const [availableProperties, setAvailableProperties] = useState(['All Properties']);

  const generateMonthsList = () => {
    const months = [];
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    
    // Generate months from January 2024 to current month
    for (let year = 2024; year <= currentYear; year++) {
      const startMonth = year === 2024 ? 0 : 0;
      const endMonth = year === currentYear ? currentMonth : 11;
      
      for (let month = startMonth; month <= endMonth; month++) {
        const monthName = new Date(year, month).toLocaleString('default', { month: 'long' });
        months.push(`${monthName} ${year}`);
      }
    }
    
    return months.reverse();
  };

  const monthsList = generateMonthsList();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (propertyDropdownOpen && !event.target.closest('.relative')) {
        setPropertyDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [propertyDropdownOpen]);
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoadingData(true);
        
        // Fetch properties first
        const properties = await fetchProperties();
        setAvailableProperties(properties);
        
        // Fetch initial financial data
        const propertiesToFetch = selectedProperties.has('All Properties') 
          ? 'All Properties' 
          : Array.from(selectedProperties);
        
        const response = await fetchFinancialData(propertiesToFetch, selectedMonth);
        
        if (response.success) {
          const transformedData = transformFinancialData(response.data, selectedMonth);
          setRealData(transformedData);
          
          // Also transform cash flow data
          const cashFlowData = transformCashFlowData(response.data);
          setRealData(prev => ({
            ...prev,
            ...cashFlowData
          }));
          
          setNotification({
            show: true,
            message: `Successfully loaded data for ${selectedMonth}`,
            type: 'success'
          });
        } else {
          setDataError(response.error || 'Failed to load data');
          setNotification({
            show: true,
            message: 'Failed to load financial data',
            type: 'error'
          });
        }
      } catch (error) {
        console.error('Initial data load error:', error);
        setDataError(error.message);
        setNotification({
          show: true,
          message: 'Error loading financial data',
          type: 'error'
        });
      } finally {
        setIsLoadingData(false);
        setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 5000);
      }
    };
    
    loadInitialData();
  }, [selectedMonth]);

  // Handle property selection
  const toggleProperty = (property) => {
    setSelectedProperties(prev => {
      const newSet = new Set(prev);
      
      if (property === 'All Properties') {
        if (newSet.has('All Properties')) {
          newSet.clear();
        } else {
          newSet.clear();
          newSet.add('All Properties');
        }
      } else {
        newSet.delete('All Properties');
        if (newSet.has(property)) {
          newSet.delete(property);
        } else {
          newSet.add(property);
        }
        
        if (newSet.size === 0) {
          newSet.add('All Properties');
        }
      }
      
      return newSet;
    });
  };

  // Handle account expansion
  const toggleAccountExpansion = (accountName) => {
    setExpandedAccounts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(accountName)) {
        newSet.delete(accountName);
      } else {
        newSet.add(accountName);
      }
      return newSet;
    });
  };

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Calculate percentage change
  const calculatePercentageChange = (current, previous) => {
    if (previous === 0) return 0;
    return ((current - previous) / Math.abs(previous)) * 100;
  };

  // Get current data based on active tab
  const getCurrentData = () => {
    if (!realData) return [];
    
    const propertyKey = selectedProperties.has('All Properties') 
      ? 'All Properties' 
      : Array.from(selectedProperties).join(',');
    
    switch (activeTab) {
      case 'p&l':
        return realData.propertyFinancialData[propertyKey]?.[timeView]?.[selectedMonth] || [];
      case 'balance-sheet':
        return realData.propertyBalanceSheetData[propertyKey]?.[timeView]?.[selectedMonth] || [];
      case 'cash-flow':
        return {
          inFlow: realData.propertyCashFlowData[propertyKey]?.inFlow || [],
          outFlow: realData.propertyCashFlowData[propertyKey]?.outFlow || [],
          totalInFlow: realData.propertyCashFlowData[propertyKey]?.totalInFlow || 0,
          totalOutFlow: realData.propertyCashFlowData[propertyKey]?.totalOutFlow || 0,
          totalCashFlow: realData.propertyCashFlowData[propertyKey]?.totalCashFlow || 0
        };
      default:
        return [];
    }
  };

  // Calculate totals for P&L
  const calculatePLTotals = () => {
    const data = getCurrentData();
    if (!Array.isArray(data)) return { totalRevenue: 0, totalExpenses: 0, netIncome: 0 };
    
    const totalRevenue = data
      .filter(item => item.type === 'Revenue')
      .reduce((sum, item) => sum + item.total, 0);
    
    const totalExpenses = data
      .filter(item => item.type === 'Expenses')
      .reduce((sum, item) => sum + item.total, 0);
    
    return {
      totalRevenue,
      totalExpenses,
      netIncome: totalRevenue - totalExpenses
    };
  };

  // Render P&L tab
  const renderPLTab = () => {
    const data = getCurrentData();
    const { totalRevenue, totalExpenses, netIncome } = calculatePLTotals();
    
    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-500">Total Revenue</h3>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <p className="mt-2 text-2xl font-semibold">{formatCurrency(totalRevenue)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-500">Total Expenses</h3>
              <TrendingUp className="h-5 w-5 text-red-500" />
            </div>
            <p className="mt-2 text-2xl font-semibold">{formatCurrency(totalExpenses)}</p>
          </div>
          <div className={`bg-white rounded-lg shadow p-4 border ${netIncome >= 0 ? 'border-green-200' : 'border-red-200'}`}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-500">Net Income</h3>
              {netIncome >= 0 ? (
                <ArrowUp className="h-5 w-5 text-green-500" />
              ) : (
                <ArrowDown className="h-5 w-5 text-red-500" />
              )}
            </div>
            <p className={`mt-2 text-2xl font-semibold ${netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(netIncome)}
            </p>
          </div>
        </div>
        
        {/* Chart */}
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <h3 className="text-lg font-medium mb-4">Revenue vs Expenses Trend</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke={BRAND_COLORS.gray[200]} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  name="Revenue" 
                  stroke={BRAND_COLORS.success} 
                  strokeWidth={2} 
                  activeDot={{ r: 6 }} 
                />
                <Line 
                  type="monotone" 
                  dataKey="total" 
                  name="Expenses" 
                  stroke={BRAND_COLORS.danger} 
                  strokeWidth={2} 
                  activeDot={{ r: 6 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Detailed Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium">Detailed P&L</h3>
            <button 
              onClick={() => setViewMode(viewMode === 'detailed' ? 'total' : 'detailed')}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {viewMode === 'detailed' ? 'Show Summary' : 'Show Details'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    % of Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((item) => (
                  <React.Fragment key={`${item.name}-${item.type}`}>
                    <tr 
                      className={`${item.type === 'Revenue' ? 'bg-green-50' : 'bg-red-50'} hover:bg-gray-100 cursor-pointer`}
                      onClick={() => toggleAccountExpansion(`${item.name}-${item.type}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="flex items-center">
                          {expandedAccounts.has(`${item.name}-${item.type}`) ? (
                            <ChevronDown className="h-4 w-4 mr-2" />
                          ) : (
                            <ChevronRight className="h-4 w-4 mr-2" />
                          )}
                          {item.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 py-1 rounded-full text-xs ${item.type === 'Revenue' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {item.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                        <span className={item.type === 'Revenue' ? 'text-green-600' : 'text-red-600'}>
                          {formatCurrency(item.total)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                        {Math.round((item.total / (item.type === 'Revenue' ? totalRevenue : totalExpenses)) * 100)}%
                      </td>
                    </tr>
                    {expandedAccounts.has(`${item.name}-${item.type}`) && item.hasSubAccounts && (
                      <tr className="bg-gray-50">
                        <td colSpan={4} className="px-6 py-4">
                          <div className="ml-8">
                            <h4 className="text-sm font-medium mb-2">Sub-Accounts</h4>
                            <table className="min-w-full divide-y divide-gray-200">
                              <tbody className="bg-white divide-y divide-gray-200">
                                {Object.entries(item.subAccounts).map(([property, subAccount]) => (
                                  <tr key={property}>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                                      {property}
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-right font-medium">
                                      <span className={item.type === 'Revenue' ? 'text-green-600' : 'text-red-600'}>
                                        {formatCurrency(subAccount.total)}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-500">
                                      {Math.round((subAccount.total / item.total) * 100)}%
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Render Cash Flow tab
  const renderCashFlowTab = () => {
    const data = getCurrentData();
    
    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-500">Cash Inflow</h3>
              <ArrowUp className="h-5 w-5 text-green-500" />
            </div>
            <p className="mt-2 text-2xl font-semibold">{formatCurrency(data.totalInFlow)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-500">Cash Outflow</h3>
              <ArrowDown className="h-5 w-5 text-red-500" />
            </div>
            <p className="mt-2 text-2xl font-semibold">{formatCurrency(data.totalOutFlow)}</p>
          </div>
          <div className={`bg-white rounded-lg shadow p-4 border ${data.totalCashFlow >= 0 ? 'border-green-200' : 'border-red-200'}`}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-500">Net Cash Flow</h3>
              {data.totalCashFlow >= 0 ? (
                <ArrowUp className="h-5 w-5 text-green-500" />
              ) : (
                <ArrowDown className="h-5 w-5 text-red-500" />
              )}
            </div>
            <p className={`mt-2 text-2xl font-semibold ${data.totalCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(data.totalCashFlow)}
            </p>
          </div>
        </div>
        
        {/* Chart */}
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <h3 className="text-lg font-medium mb-4">Cash Flow Breakdown</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[data]}>
                <CartesianGrid strokeDasharray="3 3" stroke={BRAND_COLORS.gray[200]} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="totalInFlow" name="Inflow" fill={BRAND_COLORS.success} />
                <Bar dataKey="totalOutFlow" name="Outflow" fill={BRAND_COLORS.danger} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Detailed Tables */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Inflow */}
          <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
            <div className="px-4 py-3 bg-green-50 border-b border-gray-200">
              <h3 className="text-lg font-medium text-green-800">Cash Inflow</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Source
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      % of Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.inFlow.map((item) => (
                    <tr key={item.name} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-green-600">
                        {formatCurrency(item.total)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                        {Math.round((item.total / data.totalInFlow) * 100)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {/* Outflow */}
          <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
            <div className="px-4 py-3 bg-red-50 border-b border-gray-200">
              <h3 className="text-lg font-medium text-red-800">Cash Outflow</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Category
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      % of Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.outFlow.map((item) => (
                    <tr key={item.name} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-red-600">
                        {formatCurrency(item.total)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                        {Math.round((item.total / data.totalOutFlow) * 100)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render Balance Sheet tab
  const renderBalanceSheetTab = () => {
    const data = getCurrentData();
    
    // Calculate totals
    const totalAssets = data
      .filter(item => item.type === 'Assets')
      .reduce((sum, item) => sum + item.total, 0);
    
    const totalLiabilities = data
      .filter(item => item.type === 'Liabilities')
      .reduce((sum, item) => sum + item.total, 0);
    
    const totalEquity = data
      .filter(item => item.type === 'Equity')
      .reduce((sum, item) => sum + item.total, 0);
    
    const balance = totalAssets - (totalLiabilities + totalEquity);
    
    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-500">Total Assets</h3>
              <DollarSign className="h-5 w-5 text-blue-500" />
            </div>
            <p className="mt-2 text-2xl font-semibold">{formatCurrency(totalAssets)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-500">Total Liabilities</h3>
              <DollarSign className="h-5 w-5 text-orange-500" />
            </div>
            <p className="mt-2 text-2xl font-semibold">{formatCurrency(totalLiabilities)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-500">Total Equity</h3>
              <DollarSign className="h-5 w-5 text-green-500" />
            </div>
            <p className="mt-2 text-2xl font-semibold">{formatCurrency(totalEquity)}</p>
          </div>
        </div>
        
        {/* Balance Check */}
        <div className={`p-4 rounded-lg ${Math.abs(balance) > 0.01 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
          <div className="flex items-center justify-center">
            <span className="font-medium">
              {Math.abs(balance) > 0.01 ? 'Balance Sheet is out of balance by ' : 'Balance Sheet is balanced'}
              {Math.abs(balance) > 0.01 && formatCurrency(Math.abs(balance))}
            </span>
          </div>
        </div>
        
        {/* Chart */}
        <div className="bg-white rounded-lg shadow p-4 border border-gray-200">
          <h3 className="text-lg font-medium mb-4">Assets vs Liabilities</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={[
                    { name: 'Assets', value: totalAssets },
                    { name: 'Liabilities', value: totalLiabilities },
                    { name: 'Equity', value: totalEquity }
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  <Cell fill={BRAND_COLORS.primary} />
                  <Cell fill={BRAND_COLORS.warning} />
                  <Cell fill={BRAND_COLORS.success} />
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Legend />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Detailed Tables */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Assets */}
          <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
            <div className="px-4 py-3 bg-blue-50 border-b border-gray-200">
              <h3 className="text-lg font-medium text-blue-800">Assets</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Account
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      % of Assets
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.filter(item => item.type === 'Assets').map((item) => (
                    <tr key={item.name} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-blue-600">
                        {formatCurrency(item.total)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                        {Math.round((item.total / totalAssets) * 100)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Total Assets</th>
                    <th className="px-6 py-3 text-right text-sm font-medium text-gray-900">{formatCurrency(totalAssets)}</th>
                    <th className="px-6 py-3 text-right text-sm font-medium text-gray-900">100%</th>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          
          {/* Liabilities & Equity */}
          <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
            <div className="px-4 py-3 bg-orange-50 border-b border-gray-200">
              <h3 className="text-lg font-medium text-orange-800">Liabilities & Equity</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Account
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      % of Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.filter(item => item.type === 'Liabilities' || item.type === 'Equity').map((item) => (
                    <tr key={item.name} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {item.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-orange-600">
                        {formatCurrency(item.total)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                        {Math.round((item.total / (totalLiabilities + totalEquity)) * 100)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Total Liabilities</th>
                    <th className="px-6 py-3 text-right text-sm font-medium text-gray-900">{formatCurrency(totalLiabilities)}</th>
                    <th className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                      {Math.round((totalLiabilities / (totalLiabilities + totalEquity)) * 100)}%
                    </th>
                  </tr>
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Total Equity</th>
                    <th className="px-6 py-3 text-right text-sm font-medium text-gray-900">{formatCurrency(totalEquity)}</th>
                    <th className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                      {Math.round((totalEquity / (totalLiabilities + totalEquity)) * 100)}%
                    </th>
                  </tr>
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-900">Total Liabilities & Equity</th>
                    <th className="px-6 py-3 text-right text-sm font-medium text-gray-900">{formatCurrency(totalLiabilities + totalEquity)}</th>
                    <th className="px-6 py-3 text-right text-sm font-medium text-gray-900">100%</th>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render the appropriate tab content
  const renderTabContent = () => {
    if (isLoadingData) {
      return (
        <div className="flex justify-center items-center h-64">
          <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
          <span className="ml-2 text-gray-600">Loading financial data...</span>
        </div>
      );
    }
    
    if (dataError) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <h3 className="ml-2 text-sm font-medium text-red-800">Error loading data</h3>
          </div>
          <div className="mt-2 text-sm text-red-700">
            {dataError}
          </div>
          <div className="mt-4">
            <button
              type="button"
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    
    switch (activeTab) {
      case 'p&l':
        return renderPLTab();
      case 'cash-flow':
        return renderCashFlowTab();
      case 'balance-sheet':
        return renderBalanceSheetTab();
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Notification */}
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-md shadow-lg ${notification.type === 'error' ? 'bg-red-100 border border-red-200 text-red-800' : notification.type === 'success' ? 'bg-green-100 border border-green-200 text-green-800' : 'bg-blue-100 border border-blue-200 text-blue-800'}`}>
          <div className="flex items-center">
            {notification.type === 'error' ? (
              <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            ) : notification.type === 'success' ? (
              <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clipRule="evenodd" />
              </svg>
            )}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center">
            <IAMCFOLogo className="w-10 h-10 mr-3" />
            <h1 className="text-2xl font-bold text-gray-900">IAM CFO Financial Dashboard</h1>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              {monthsList.map((month) => (
                <option key={month} value={month}>
                  {month}
                </option>
              ))}
            </select>
            <button
              onClick={async () => {
                setIsLoadingData(true);
                try {
                  const propertiesToFetch = selectedProperties.has('All Properties') 
                    ? 'All Properties' 
                    : Array.from(selectedProperties);
                  
                  const response = await fetchFinancialData(propertiesToFetch, selectedMonth);
                  
                  if (response.success) {
                    const transformedData = transformFinancialData(response.data, selectedMonth);
                    setRealData(transformedData);
                    
                    const cashFlowData = transformCashFlowData(response.data);
                    setRealData(prev => ({
                      ...prev,
                      ...cashFlowData
                    }));
                    
                    setNotification({
                      show: true,
                      message: `Data refreshed successfully for ${selectedMonth}`,
                      type: 'success'
                    });
                  } else {
                    setNotification({
                      show: true,
                      message: 'Failed to refresh data',
                      type: 'error'
                    });
                  }
                } catch (error) {
                  console.error('Refresh error:', error);
                  setNotification({
                    show: true,
                    message: 'Error refreshing data',
                    type: 'error'
                  });
                } finally {
                  setIsLoadingData(false);
                  setTimeout(() => setNotification(prev => ({ ...prev, show: false })), 3000);
                }
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingData ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Property Selector */}
        <div className="mb-6 bg-white rounded-lg shadow p-4 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium">Properties</h2>
            <div className="relative">
              <button
                onClick={() => setPropertyDropdownOpen(!propertyDropdownOpen)}
                className="inline-flex items-center justify-between w-64 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <span className="truncate">
                  {selectedProperties.has('All Properties') 
                    ? 'All Properties' 
                    : selectedProperties.size === 1 
                    ? Array.from(selectedProperties)[0]
                    : `${selectedProperties.size} Properties Selected`
                  }
                </span>
                <ChevronDown className={`ml-2 h-4 w-4 transition-transform ${propertyDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {propertyDropdownOpen && (
                <div className="absolute right-0 z-10 mt-2 w-64 bg-white border border-gray-300 rounded-md shadow-lg">
                  <div className="py-1 max-h-60 overflow-y-auto">
                    {availableProperties.map((property) => (
                      <label
                        key={property}
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedProperties.has(property)}
                          onChange={() => toggleProperty(property)}
                          className="mr-3 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="flex-1">{property}</span>
                        {selectedProperties.has(property) && (
                          <svg className="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </label>
                    ))}
                  </div>
                  <div className="border-t border-gray-200 px-4 py-2">
                    <div className="flex justify-between">
                      <button
                        onClick={() => {
                          setSelectedProperties(new Set(['All Properties']));
                          setPropertyDropdownOpen(false);
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Select All
                      </button>
                      <button
                        onClick={() => {
                          setSelectedProperties(new Set());
                          setPropertyDropdownOpen(false);
                        }}
                        className="text-xs text-gray-600 hover:text-gray-800"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Selected Properties Display */}
          {!selectedProperties.has('All Properties') && selectedProperties.size > 0 && (
            <div className="flex flex-wrap gap-2">
              {Array.from(selectedProperties).map((property) => (
                <span
                  key={property}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {property}
                  <button
                    onClick={() => toggleProperty(property)}
                    className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-200"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Time View Toggle */}
        <div className="mb-6 bg-white rounded-lg shadow p-4 border border-gray-200">
          <h2 className="text-lg font-medium mb-3">Time View</h2>
          <div className="flex space-x-2">
            {['Monthly', 'YTD', 'TTM'].map((view) => (
              <button
                key={view}
                onClick={() => setTimeView(view)}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  timeView === view
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {view}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('p&l')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'p&l'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Profit & Loss
              </button>
              <button
                onClick={() => setActiveTab('balance-sheet')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'balance-sheet'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Balance Sheet
              </button>
              <button
                onClick={() => setActiveTab('cash-flow')}
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'cash-flow'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Cash Flow
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {renderTabContent()}
      </main>
    </div>
  );
}
