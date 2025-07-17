"use client";

import React, { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, Minus, Download, RefreshCw, TrendingUp, DollarSign, PieChart, BarChart3, ChevronDown, ChevronRight } from 'lucide-react';
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

// Smart debugging configuration
const DEBUG_CONFIG = {
  isDevelopment: process.env.NODE_ENV === 'development',
  isDebugMode: typeof window !== 'undefined' && 
    (localStorage.getItem('iam-cfo-debug') === 'true' || 
     process.env.NEXT_PUBLIC_DEBUG === 'true'),
  enableDataValidation: true,
  enablePerformanceTracking: true
};

// Smart console logging - only in development or debug mode
const smartLog = (message: string, data?: any, level: 'info' | 'warn' | 'error' = 'info') => {
  if (DEBUG_CONFIG.isDevelopment || DEBUG_CONFIG.isDebugMode) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    switch (level) {
      case 'warn':
        console.warn(prefix, message, data);
        break;
      case 'error':
        console.error(prefix, message, data);
        break;
      default:
        console.log(prefix, message, data);
    }
  }
};

// Data validation cache
const validationCache = new Map<string, { timestamp: number; result: any }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Cache performance metrics
const cacheMetrics = {
  hits: 0,
  misses: 0,
  getHitRate: () => {
    const total = cacheMetrics.hits + cacheMetrics.misses;
    return total > 0 ? (cacheMetrics.hits / total * 100).toFixed(1) : '0.0';
  }
};

// Performance-conscious cache cleanup
const cleanupCache = () => {
  const now = Date.now();
  const keysToDelete: string[] = [];
  
  validationCache.forEach((value, key) => {
    if (now - value.timestamp > CACHE_TTL) {
      keysToDelete.push(key);
    }
  });
  
  keysToDelete.forEach(key => validationCache.delete(key));
  
  if (DEBUG_CONFIG.isDebugMode) {
    smartLog(`🧹 Cache cleanup: removed ${keysToDelete.length} expired entries, ${validationCache.size} remaining`);
  }
};

// Auto-cleanup cache every 10 minutes
if (typeof window !== 'undefined') {
  setInterval(cleanupCache, 10 * 60 * 1000);
}

// Performance tracking
const performanceTracker = {
  startTime: (operation: string) => {
    if (DEBUG_CONFIG.enablePerformanceTracking) {
      return performance.now();
    }
    return 0;
  },
  endTime: (operation: string, startTime: number) => {
    if (DEBUG_CONFIG.enablePerformanceTracking && startTime > 0) {
      const duration = performance.now() - startTime;
      smartLog(`⚡ Performance: ${operation} took ${duration.toFixed(2)}ms`);
    }
  }
};

// Data integrity validator
const validateDataIntegrity = (data: any[], source: string, expectedCount?: number, callback?: (validation: any) => void) => {
  const cacheKey = `${source}-${JSON.stringify(data?.slice(0, 5))}`;
  const cached = validationCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    cacheMetrics.hits++;
    smartLog(`🎯 Cache hit for ${source} (${cacheMetrics.getHitRate()}% hit rate)`);
    return cached.result;
  }
  
  cacheMetrics.misses++;
  
  const validation = {
    source,
    isValid: true,
    issues: [] as string[],
    stats: {
      totalRecords: data?.length || 0,
      nullRecords: 0,
      invalidAmounts: 0,
      missingDates: 0,
      duplicateIds: 0
    }
  };
  
  if (!data || !Array.isArray(data)) {
    validation.isValid = false;
    validation.issues.push('Data is not an array');
    return validation;
  }
  
  const seenIds = new Set();
  
  data.forEach((item, index) => {
    if (!item) {
      validation.stats.nullRecords++;
      validation.issues.push(`Record ${index} is null/undefined`);
    } else {
      if (typeof item.amount !== 'number' || isNaN(item.amount)) {
        validation.stats.invalidAmounts++;
        validation.issues.push(`Record ${index} has invalid amount: ${item.amount}`);
      }
      
      if (!item.date) {
        validation.stats.missingDates++;
        validation.issues.push(`Record ${index} has missing date`);
      }
      
      if (item.id && seenIds.has(item.id)) {
        validation.stats.duplicateIds++;
        validation.issues.push(`Duplicate ID found: ${item.id}`);
      } else if (item.id) {
        seenIds.add(item.id);
      }
    }
  });
  
  if (expectedCount && validation.stats.totalRecords !== expectedCount) {
    validation.isValid = false;
    validation.issues.push(`Expected ${expectedCount} records, got ${validation.stats.totalRecords}`);
  }
  
  validation.isValid = validation.issues.length === 0;
  
  // Cache the result
  validationCache.set(cacheKey, {
    timestamp: Date.now(),
    result: validation
  });
  
  // Log validation results
  if (!validation.isValid) {
    smartLog(`❌ Data integrity issues in ${source}:`, validation, 'error');
  } else if (DEBUG_CONFIG.isDebugMode) {
    smartLog(`✅ Data integrity validated for ${source}:`, validation.stats);
  }
  
  // Call the callback if provided
  if (callback) {
    callback(validation);
  }
  
  return validation;
};

// Updated Supabase Configuration
const SUPABASE_URL = 'https://pjaieumtjszcwussmwel.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqYWlldW10anN6Y3d1c3Ntd2VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwNDQyMTgsImV4cCI6MjA2NzYyMDIxOH0.E1y-qx4EW7dbdN_2sijZaiQVO7ZcqnwC9hTSIccChP0';

// Type definitions
type FinancialTab = 'p&l' | 'cash-flow' | 'balance-sheet';
type TimePeriod = 'Monthly' | 'Quarterly' | 'Yearly' | 'Trailing 12';
type ViewMode = 'total' | 'detailed' | 'by-property'; // ENHANCED: Added 'by-property' view mode
type MonthString = `${'January' | 'February' | 'March' | 'April' | 'May' | 'June' | 
                   'July' | 'August' | 'September' | 'October' | 'November' | 'December'} ${number}`;

// ENHANCED: Account Classification System
type PLCategory = 'Revenue' | 'COGS' | 'Operating Expenses' | 'Other Income' | 'Other Expenses';

interface FinancialDataItem {
  name: string;
  total: number;
  months: Partial<Record<MonthString, number>>;
  type?: string;
  category: PLCategory;
  original_type?: string;
  detail_type?: string;
  entries?: any[];
  mapping_method?: string;
  account_type?: string;
  account_detail_type?: string;
  // Grouping properties
  isParent?: boolean;
  isSubAccount?: boolean;
  isStandalone?: boolean;
  isParentAsSubAccount?: boolean;
  parentName?: string;
  originalName?: string;
  subAccounts?: FinancialDataItem[];
  // ENHANCED: Property-specific data
  propertyTotals?: Record<string, number>;
  propertyEntries?: Record<string, any[]>;
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

interface DataIntegrityStatus {
  isValid: boolean;
  lastValidated: Date;
  totalRecords: number;
  issues: string[];
  source: string;
}

// P&L ONLY Account Classification - EXCLUDES Balance Sheet accounts
const classifyAccount = (accountType: string, accountDetailType: string, accountName: string): PLCategory | null => {
  const type = (accountType || '').toLowerCase().trim();
  const detailType = (accountDetailType || '').toLowerCase().trim();
  const name = (accountName || '').toLowerCase().trim();
  
  // ❌ EXCLUDE BALANCE SHEET ACCOUNTS
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
  
  // ✅ P&L ACCOUNTS ONLY
  if (type === 'income' || type === 'revenue' || type === 'sales') {
    return 'Revenue';
  }
  
  if (type === 'cost of goods sold' || type === 'cogs' || 
      detailType.includes('cost of goods sold') || 
      detailType.includes('cogs') ||
      name.includes('cost of sales') ||
      name.includes('cost of goods') ||
      name.includes('direct cost') ||
      name.includes('materials cost') ||
      name.includes('labor cost')) {
    return 'COGS';
  }
  
  if (type === 'other income' || 
      detailType.includes('other income') ||
      detailType.includes('interest income') ||
      detailType.includes('dividend income') ||
      detailType.includes('gain on sale') ||
      name.includes('interest income') ||
      name.includes('dividend') ||
      name.includes('gain on') ||
      name.includes('other income')) {
    return 'Other Income';
  }
  
  if (type === 'other expense' || 
      detailType.includes('other expense') ||
      detailType.includes('interest expense') ||
      detailType.includes('loss on sale') ||
      detailType.includes('depreciation') ||
      name.includes('interest expense') ||
      name.includes('depreciation') ||
      name.includes('amortization') ||
      name.includes('loss on') ||
      name.includes('other expense')) {
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

// Hardcoded properties based on actual database data
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
const fetchProperties = async (): Promise<string[]> => {
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
        .map((item: any) => item.class)
        .filter((cls: any) => cls && cls.trim() !== '');
      
      const uniqueClasses = [...new Set(classValues)].sort();
      const allProperties = [...new Set([...HARDCODED_PROPERTIES.slice(1), ...uniqueClasses])].sort();
      const result = ['All Properties', ...allProperties];
      
      return result;
    }
    
    return HARDCODED_PROPERTIES;
    
  } catch (error) {
    console.error('❌ Property fetch error:', error);
    return HARDCODED_PROPERTIES;
  }
};

// ENHANCED: Time series data fetching with Property Dimension support
const fetchTimeSeriesData = async (
  property: string = 'All Properties',
  monthYear: string,
  timePeriod: TimePeriod,
  viewMode: ViewMode,
  onDataValidation?: (validation: any) => void
) => {
  try {
    const perfStart = performanceTracker.startTime('fetchTimeSeriesData');
    smartLog('🔍 FETCHING TIME SERIES DATA:', { property, monthYear, timePeriod, viewMode });
    
    const [month, year] = monthYear.split(' ');
    const selectedDate = new Date(`${month} 1, ${year}`);
    smartLog('🔍 Selected date object:', selectedDate);
    smartLog('🔍 Month:', month, 'Year:', year);
    
    let dateRanges: Array<{start: string, end: string, label: string}> = [];
    
    // ENHANCED: For by-property view, use the SAME logic as other views
    // Fetch month by month to avoid hitting row limits, then aggregate
    if (viewMode === 'by-property') {
      if (timePeriod === 'Monthly') {
        const monthNum = selectedDate.getMonth() + 1;
        const startDate = `${year}-${monthNum.toString().padStart(2, '0')}-01`;
        const lastDay = new Date(parseInt(year), monthNum, 0).getDate();
        const endDate = `${year}-${monthNum.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
        dateRanges = [{ start: startDate, end: endDate, label: monthYear }];
      } else if (timePeriod === 'Quarterly') {
        const quarter = Math.floor(selectedDate.getMonth() / 3) + 1;
        const qStart = new Date(parseInt(year), (quarter - 1) * 3, 1);
        const qEnd = new Date(parseInt(year), quarter * 3, 0);
        dateRanges = [{
          start: qStart.toISOString().split('T')[0],
          end: qEnd.toISOString().split('T')[0],
          label: `Q${quarter} ${year}`
        }];
      } else if (timePeriod === 'Yearly') {
        const yearStart = `${year}-01-01`;
        const yearEnd = `${year}-12-31`;
        dateRanges = [{ start: yearStart, end: yearEnd, label: year }];
      } else { // Trailing 12
        // FIXED: Use month-by-month fetching like other views to avoid row limits
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
    } else {
      // Original logic for non-property views
      switch (timePeriod) {
        case 'Monthly':
          if (viewMode === 'total') {
            const monthNum = selectedDate.getMonth() + 1;
            const startDate = `${year}-${monthNum.toString().padStart(2, '0')}-01`;
            const lastDay = new Date(parseInt(year), monthNum, 0).getDate();
            const endDate = `${year}-${monthNum.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
            dateRanges = [{ start: startDate, end: endDate, label: monthYear }];
          } else {
            // Weekly breakdown
            const monthNum = selectedDate.getMonth() + 1;
            const firstDay = new Date(parseInt(year), monthNum - 1, 1);
            const lastDay = new Date(parseInt(year), monthNum, 0);
            
            const weeks = [];
            let weekStart = new Date(firstDay);
            let weekNumber = 1;
            
            while (weekStart <= lastDay) {
              const weekEnd = new Date(weekStart);
              weekEnd.setDate(weekStart.getDate() + 6);
              
              if (weekEnd > lastDay) {
                weekEnd.setTime(lastDay.getTime());
              }
              
              const weekStartStr = weekStart.toISOString().split('T')[0];
              const weekEndStr = weekEnd.toISOString().split('T')[0];
              
              const startDay = weekStart.getDate();
              const endDay = weekEnd.getDate();
              
              weeks.push({
                start: weekStartStr,
                end: weekEndStr,
                label: `Week ${weekNumber} (${startDay}-${endDay})`
              });
              
              weekStart.setDate(weekStart.getDate() + 7);
              weekNumber++;
            }
            
            dateRanges = weeks;
          }
          break;
          
        case 'Quarterly':
          const quarter = Math.floor(selectedDate.getMonth() / 3) + 1;
          if (viewMode === 'total') {
            const qStart = new Date(parseInt(year), (quarter - 1) * 3, 1);
            const qEnd = new Date(parseInt(year), quarter * 3, 0);
            dateRanges = [{
              start: qStart.toISOString().split('T')[0],
              end: qEnd.toISOString().split('T')[0],
              label: `Q${quarter} ${year}`
            }];
          } else {
            for (let q = 1; q <= quarter; q++) {
              const qStart = new Date(parseInt(year), (q - 1) * 3, 1);
              const qEnd = new Date(parseInt(year), q * 3, 0);
              dateRanges.push({
                start: qStart.toISOString().split('T')[0],
                end: qEnd.toISOString().split('T')[0],
                label: `Q${q} ${year}`
              });
            }
          }
          break;
          
        case 'Yearly':
          if (viewMode === 'total') {
            const yearStart = `${year}-01-01`;
            const yearEnd = `${year}-12-31`;
            dateRanges = [{ start: yearStart, end: yearEnd, label: year }];
          } else {
            const currentMonth = selectedDate.getMonth() + 1;
            for (let m = 1; m <= currentMonth; m++) {
              const monthStart = `${year}-${m.toString().padStart(2, '0')}-01`;
              const monthEnd = new Date(parseInt(year), m, 0);
              const monthEndStr = monthEnd.toISOString().split('T')[0];
              const monthName = new Date(parseInt(year), m - 1, 1).toLocaleDateString('en-US', { month: 'short' });
              dateRanges.push({
                start: monthStart,
                end: monthEndStr,
                label: `${monthName} ${year}`
              });
            }
          }
          break;
          
        case 'Trailing 12':
          if (viewMode === 'total') {
            dateRanges = [];
            
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
          } else {
            dateRanges = [];
            
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
          break;
      }
    }
    
    smartLog('🔍 CALCULATED DATE RANGES:', dateRanges);
    smartLog('🔍 Total date ranges for', viewMode, 'view:', dateRanges.length);
    
    // Fetch data for all date ranges
    const allData: any = {};
    let totalEntriesProcessed = 0;
    let availableProperties: string[] = [];
    
    for (const range of dateRanges) {
      smartLog(`🔍 Fetching data for period: ${range.label} (${range.start} to ${range.end})`);
      
      // CRITICAL FIX: Fetch ALL data without row limits
      // Supabase might have a default limit, so we'll use a very high limit
      let url = `${SUPABASE_URL}/rest/v1/financial_transactions?select=*&date=gte.${range.start}&date=lte.${range.end}&limit=10000`;
      
      // FIXED: For by-property view, NEVER filter by property - we need ALL property data
      // Only filter by property for non-by-property views
      if (viewMode !== 'by-property' && property !== 'All Properties') {
        url += `&class=eq.${encodeURIComponent(property)}`;
      }
      
      smartLog(`🔍 FETCHING URL for ${viewMode} view:`, url);
      
      const response = await fetch(url, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const rawData = await response.json();
        
        // Validate data integrity
        const validation = validateDataIntegrity(rawData, `${range.label} (${viewMode})`, undefined, onDataValidation);
        
        smartLog(`🔍 Period ${range.label}: ${rawData.length} transactions`);
        smartLog(`🔍 Sample transactions for ${range.label}:`, rawData.slice(0, 3));
        smartLog(`🔍 Date range: ${range.start} to ${range.end}`);
        smartLog(`🔍 View mode: ${viewMode}, Property filter: ${property}`);
        totalEntriesProcessed += rawData.length;
        
        if (viewMode === 'by-property') {
          // Get available properties from the data
          const propertiesInData = [...new Set(rawData.map((row: any) => row.class).filter((cls: any) => cls && cls.trim() !== ''))].sort();
          if (availableProperties.length === 0) {
            availableProperties = propertiesInData;
          }
          
          smartLog(`🏢 BY-PROPERTY DATA PROCESSING for ${range.label}:`, {
            totalTransactions: rawData.length,
            propertiesFound: propertiesInData.length,
            properties: propertiesInData
          });
          
          // Group by account first, then by property within each account
          const groupedByAccount = rawData.reduce((acc: any, row: any) => {
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
            
            // Initialize ALL properties for this account, not just the current one
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
          
          smartLog(`🏢 BY-PROPERTY GROUPED for ${range.label}:`, {
            accountsGrouped: Object.keys(groupedByAccount).length,
            sampleAccount: Object.keys(groupedByAccount)[0],
            sampleData: groupedByAccount[Object.keys(groupedByAccount)[0]],
            availableProperties: propertiesInData
          });
          
          allData[range.label] = groupedByAccount;
        } else {
          // Original grouping logic for non-property views
          const grouped = rawData.reduce((acc: any, row: any) => {
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
        console.error(`Failed to fetch data for period ${range.label}:`, response.status);
        allData[range.label] = {};
      }
    }
    
    // FIXED: For by-property Trailing 12, aggregate all monthly data 
    if (viewMode === 'by-property' && timePeriod === 'Trailing 12') {
      smartLog('🔍 AGGREGATING BY-PROPERTY TRAILING 12 DATA...');
      
      const aggregatedData: any = {};
      let allAvailableProperties: string[] = [];
      
      // First, collect all properties from all months
      dateRanges.forEach((range) => {
        const monthData = allData[range.label] || {};
        Object.values(monthData).forEach((account: any) => {
          if (account.propertyTotals) {
            Object.keys(account.propertyTotals).forEach(prop => {
              if (!allAvailableProperties.includes(prop)) {
                allAvailableProperties.push(prop);
              }
            });
          }
        });
      });
      
      // Then aggregate all months
      dateRanges.forEach((range) => {
        const monthData = allData[range.label] || {};
        
        Object.values(monthData).forEach((account: any) => {
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
            
            // Initialize all properties for this account
            allAvailableProperties.forEach(prop => {
              aggregatedData[accountName].propertyTotals[prop] = 0;
              aggregatedData[accountName].propertyEntries[prop] = [];
            });
          }
          
          aggregatedData[accountName].total += account.total;
          aggregatedData[accountName].entries.push(...account.entries);
          
          // Aggregate property data
          if (account.propertyTotals) {
            Object.entries(account.propertyTotals).forEach(([prop, amount]: [string, any]) => {
              aggregatedData[accountName].propertyTotals[prop] += amount;
            });
          }
          
          if (account.propertyEntries) {
            Object.entries(account.propertyEntries).forEach(([prop, entries]: [string, any]) => {
              aggregatedData[accountName].propertyEntries[prop].push(...entries);
            });
          }
        });
      });
      
      allData = {
        'Trailing 12 Months': aggregatedData
      };
      
      availableProperties = allAvailableProperties.sort();
      
      return {
        success: true,
        data: allData,
        periods: ['Trailing 12 Months'],
        availableProperties: availableProperties,
        summary: {
          timePeriod,
          viewMode,
          property: property === 'All Properties' ? 'ALL PROPERTIES' : property,
          dateRanges: [{
            start: dateRanges[0].start,
            end: dateRanges[dateRanges.length - 1].end,
            label: 'Trailing 12 Months'
          }],
          totalEntriesProcessed,
          periodsGenerated: 1,
          monthsAggregated: dateRanges.length
        }
      };
    }
    
    // FIXED: For Trailing 12 Total mode, aggregate all monthly data into one summary
    if (timePeriod === 'Trailing 12' && viewMode === 'total') {
      smartLog('🔍 AGGREGATING TRAILING 12 TOTAL DATA...');
      
      const aggregatedData: any = {};
      
      dateRanges.forEach((range) => {
        const monthData = allData[range.label] || {};
        
        Object.values(monthData).forEach((account: any) => {
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
      
      allData = {
        'Trailing 12 Months': aggregatedData
      };
      
      return {
        success: true,
        data: allData,
        periods: ['Trailing 12 Months'],
        availableProperties: viewMode === 'by-property' ? availableProperties : [],
        summary: {
          timePeriod,
          viewMode,
          property: property === 'All Properties' ? 'ALL PROPERTIES' : property,
          dateRanges: [{
            start: dateRanges[0].start,
            end: dateRanges[dateRanges.length - 1].end,
            label: 'Trailing 12 Months'
          }],
          totalEntriesProcessed,
          periodsGenerated: 1,
          monthsAggregated: dateRanges.length
        }
      };
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
    
    performanceTracker.endTime('fetchTimeSeriesData', perfStart);
    return result;
    
  } catch (error) {
    smartLog('Error fetching time series data:', error, 'error');
    return {
      success: false,
      error: (error as Error).message,
      data: {}
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
  const [selectedMonth, setSelectedMonth] = useState<MonthString>('May 2025');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('Trailing 12');
  const [viewMode, setViewMode] = useState<ViewMode>('total'); // Start with total view
  const [notification, setNotification] = useState<NotificationState>({ show: false, message: '', type: 'info' });
  const [timePeriodDropdownOpen, setTimePeriodDropdownOpen] = useState(false);
  
  // Expandable accounts state
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  
  // Data integrity state
  const [dataIntegrityStatus, setDataIntegrityStatus] = useState<DataIntegrityStatus | null>(null);
  const [propertyChartMetric, setPropertyChartMetric] = useState<'income' | 'gp' | 'ni'>('income');
  
  // Debug mode state
  const [debugMode, setDebugMode] = useState(DEBUG_CONFIG.isDebugMode);
  
  // Function to toggle debug mode
  const toggleDebugMode = () => {
    const newDebugMode = !debugMode;
    setDebugMode(newDebugMode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('iam-cfo-debug', newDebugMode.toString());
    }
    DEBUG_CONFIG.isDebugMode = newDebugMode;
    smartLog(`🔧 Debug mode ${newDebugMode ? 'enabled' : 'disabled'}`);
    
    if (newDebugMode) {
      smartLog(`📊 Cache stats: ${validationCache.size} entries cached, ${cacheMetrics.getHitRate()}% hit rate`);
    }
  };
  
  // Function to update data integrity status
  const updateDataIntegrityStatus = (validation: any) => {
    setDataIntegrityStatus({
      isValid: validation.isValid,
      lastValidated: new Date(),
      totalRecords: validation.stats.totalRecords,
      issues: validation.issues,
      source: validation.source
    });
  };
  
  const [propertyDropdownOpen, setPropertyDropdownOpen] = useState(false);
  const [selectedProperties, setSelectedProperties] = useState<Set<string>>(new Set(['All Properties']));

  // Real data state
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [realData, setRealData] = useState<any>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [availableProperties, setAvailableProperties] = useState<string[]>(HARDCODED_PROPERTIES);
  const [selectedAccountDetails, setSelectedAccountDetails] = useState<FinancialDataItem | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<any>(null);

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
  }, [selectedProperties, selectedMonth, timePeriod, viewMode]);

  const loadInitialData = async () => {
    try {
      setIsLoadingData(true);
      
      const properties = await fetchProperties();
      smartLog('🏠 Available properties loaded:', properties);
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
      
      // FIXED: For by-property view, always use 'All Properties' to get all data
      let propertyFilter = 'All Properties';
      if (viewMode !== 'by-property' && selectedProperties.size > 0 && !selectedProperties.has('All Properties')) {
        propertyFilter = Array.from(selectedProperties)[0];
      }
      
      smartLog('🔍 LOADING DATA WITH FILTERS:', {
        selectedProperties: Array.from(selectedProperties),
        propertyFilter,
        month: selectedMonth,
        timePeriod,
        viewMode,
        note: viewMode === 'by-property' ? 'FORCING All Properties for by-property view' : 'Using selected property filter'
      });
      
      const timeSeriesResult = await fetchTimeSeriesData(propertyFilter, selectedMonth, timePeriod, viewMode, updateDataIntegrityStatus);
      
      if (timeSeriesResult.success) {
        setTimeSeriesData(timeSeriesResult);
        setRealData(null);
        setDataError(null);
      } else {
        setDataError(timeSeriesResult.error || 'Failed to load time series data');
      }
      
      const propertyText = viewMode === 'by-property' 
        ? 'all properties (by-property view)' 
        : selectedProperties.has('All Properties') 
        ? 'all property classes' 
        : `${selectedProperties.size} selected property classes`;
        
      showNotification(`Loaded data for ${propertyText} - ${timePeriod} ${viewMode} view`, 'success');
      
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
    smartLog('🏠 Property selection changed:', Array.from(newSelected));
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

  const handleAccountClick = (accountItem: FinancialDataItem): void => {
    setSelectedAccountDetails(accountItem);
  };

  // Toggle parent account expansion
  const toggleParentAccount = (parentName: string): void => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(parentName)) {
      newExpanded.delete(parentName);
    } else {
      newExpanded.add(parentName);
    }
    setExpandedAccounts(newExpanded);
  };

  // Account Grouping with Colon Detection and Parent-as-Sub handling
  const groupAccountsByParent = (accounts: FinancialDataItem[]): FinancialDataItem[] => {
    smartLog('🏗️ GROUPING ACCOUNTS - Starting with', accounts.length, 'accounts');
    
    const grouped: Record<string, FinancialDataItem> = {};
    const standalone: FinancialDataItem[] = [];
    const parentNames = new Set<string>();
    
    // First pass: identify all parent names from colon-separated accounts
    accounts.forEach(account => {
      if (account.name.includes(':')) {
        const colonIndex = account.name.indexOf(':');
        const parentName = account.name.substring(0, colonIndex).trim();
        parentNames.add(parentName);
      }
    });
    
    accounts.forEach(account => {
      if (account.name.includes(':')) {
        // This is a sub-account
        const colonIndex = account.name.indexOf(':');
        const parentName = account.name.substring(0, colonIndex).trim();
        const subName = account.name.substring(colonIndex + 1).trim();
        
        if (!grouped[parentName]) {
          grouped[parentName] = {
            name: parentName,
            category: account.category,
            type: account.category,
            total: 0,
            months: {},
            entries: [],
            account_type: account.account_type,
            account_detail_type: account.account_detail_type,
            subAccounts: [],
            isParent: true,
            propertyTotals: {},
            propertyEntries: {}
          };
        }
        
        // Add to parent total and entries
        grouped[parentName].total += account.total;
        grouped[parentName].entries = grouped[parentName].entries || [];
        grouped[parentName].entries.push(...(account.entries || []));
        
        // Aggregate property data to parent
        if (account.propertyTotals) {
          Object.entries(account.propertyTotals).forEach(([prop, amount]: [string, any]) => {
            if (!grouped[parentName].propertyTotals![prop]) {
              grouped[parentName].propertyTotals![prop] = 0;
              grouped[parentName].propertyEntries![prop] = [];
            }
            grouped[parentName].propertyTotals![prop] += amount;
            if (account.propertyEntries && account.propertyEntries[prop]) {
              grouped[parentName].propertyEntries![prop].push(...account.propertyEntries[prop]);
            }
          });
        }
        
        // Add as sub-account
        grouped[parentName].subAccounts = grouped[parentName].subAccounts || [];
        grouped[parentName].subAccounts.push({
          ...account,
          name: subName,
          originalName: account.name,
          parentName: parentName,
          isSubAccount: true
        });
        
      } else if (parentNames.has(account.name)) {
        // This is a standalone account that ALSO has sub-accounts with colons
        if (!grouped[account.name]) {
          grouped[account.name] = {
            name: account.name,
            category: account.category,
            type: account.category,
            total: 0,
            months: {},
            entries: [],
            account_type: account.account_type,
            account_detail_type: account.account_detail_type,
            subAccounts: [],
            isParent: true,
            propertyTotals: {},
            propertyEntries: {}
          };
        }
        
        // Add the standalone account as a sub-account of itself
        grouped[account.name].total += account.total;
        grouped[account.name].entries.push(...(account.entries || []));
        
        // Add property data to parent
        if (account.propertyTotals) {
          Object.entries(account.propertyTotals).forEach(([prop, amount]: [string, any]) => {
            if (!grouped[account.name].propertyTotals![prop]) {
              grouped[account.name].propertyTotals![prop] = 0;
              grouped[account.name].propertyEntries![prop] = [];
            }
            grouped[account.name].propertyTotals![prop] += amount;
            if (account.propertyEntries && account.propertyEntries[prop]) {
              grouped[account.name].propertyEntries![prop].push(...account.propertyEntries[prop]);
            }
          });
        }
        
        grouped[account.name].subAccounts = grouped[account.name].subAccounts || [];
        grouped[account.name].subAccounts.push({
          ...account,
          name: account.name,
          originalName: account.name,
          parentName: account.name,
          isSubAccount: true,
          isParentAsSubAccount: true
        });
        
      } else {
        // This is a truly standalone account
        standalone.push({
          ...account,
          isStandalone: true
        });
      }
    });
    
    // Convert grouped object to array and combine with standalone
    const parentAccounts = Object.values(grouped);
    const result = [...standalone, ...parentAccounts];
    
    // Sort everything alphabetically
    result.sort((a, b) => a.name.localeCompare(b.name));
    
    // Sort sub-accounts within each parent
    result.forEach(account => {
      if (account.subAccounts) {
        account.subAccounts.sort((a, b) => {
          if (a.isParentAsSubAccount && !b.isParentAsSubAccount) return -1;
          if (!a.isParentAsSubAccount && b.isParentAsSubAccount) return 1;
          return a.name.localeCompare(b.name);
        });
      }
    });
    
    return result;
  };

  // Get current financial data with property support
  const getCurrentFinancialData = () => {
    if (timeSeriesData) {
      if (viewMode === 'by-property') {
        // For by-property view, get data from the first period
        const firstPeriodKey = timeSeriesData.periods[0];
        const firstPeriodData = timeSeriesData.data[firstPeriodKey] || {};
        const result = Object.values(firstPeriodData);
        
        smartLog('🏢 BY-PROPERTY getCurrentFinancialData:', {
          periodKey: firstPeriodKey,
          accountCount: result.length,
          sampleAccount: result[0],
          availableProperties: timeSeriesData.availableProperties
        });
        
        return result;
      } else if (viewMode === 'detailed' || 
    (viewMode === 'total' && (timePeriod === 'Quarterly' || timePeriod === 'Yearly')) ||
    (timePeriod === 'Monthly' && viewMode === 'total')) {  // ADD THIS LINE
  // Aggregate across multiple periods
  const allAccounts: Record<string, any> = {};
  
  timeSeriesData.periods.forEach((period: string) => {
    const periodData = timeSeriesData.data[period] || {};
    
    Object.values(periodData).forEach((account: any) => {
      if (!allAccounts[account.name]) {
        allAccounts[account.name] = {
          name: account.name,
          category: account.category,
          type: account.category,
          total: 0,
          entries: [],
          account_type: account.account_type,
          account_detail_type: account.account_detail_type
        };
      }
      allAccounts[account.name].total += account.total;
      allAccounts[account.name].entries.push(...account.entries);
    });
  });
  
  return Object.values(allAccounts);
      } else {
        // For single-period total modes
        if (timePeriod === 'Trailing 12' && viewMode === 'total') {
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
      .filter((item: any) => item.category === 'Revenue')
      .reduce((sum: number, item: any) => sum + item.total, 0);

    const cogs = currentData
      .filter((item: any) => item.category === 'COGS')
      .reduce((sum: number, item: any) => sum + Math.abs(item.total), 0);

    const operatingExpenses = currentData
      .filter((item: any) => item.category === 'Operating Expenses')
      .reduce((sum: number, item: any) => sum + Math.abs(item.total), 0);

    const otherIncome = currentData
      .filter((item: any) => item.category === 'Other Income')
      .reduce((sum: number, item: any) => sum + item.total, 0);

    const otherExpenses = currentData
      .filter((item: any) => item.category === 'Other Expenses')
      .reduce((sum: number, item: any) => sum + Math.abs(item.total), 0);

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

  const generateTrendData = () => {
    // Generate trend data based on time period and actual data
    if (!timeSeriesData || !timeSeriesData.periods) {
      return [];
    }

    smartLog('🔍 GENERATING TREND DATA:', {
      timePeriod,
      viewMode,
      periods: timeSeriesData.periods,
      dataKeys: Object.keys(timeSeriesData.data),
      availableProperties: timeSeriesData.availableProperties
    });

    // For by-property view with multiple properties, show property breakdown
    if (viewMode === 'by-property' && timeSeriesData.availableProperties && timeSeriesData.availableProperties.length > 0) {
      const firstPeriodKey = timeSeriesData.periods[0];
      const periodData = timeSeriesData.data[firstPeriodKey] || {};
      
      // Create trend data by property
      const propertyTrendData = timeSeriesData.availableProperties.map((property: string) => {
        const revenue = Object.values(periodData)
          .filter((item: any) => item.category === 'Revenue')
          .reduce((sum: number, item: any) => sum + (item.propertyTotals?.[property] || 0), 0);
        
        const cogs = Object.values(periodData)
          .filter((item: any) => item.category === 'COGS')
          .reduce((sum: number, item: any) => sum + Math.abs(item.propertyTotals?.[property] || 0), 0);
        
        const operatingExpenses = Object.values(periodData)
          .filter((item: any) => item.category === 'Operating Expenses')
          .reduce((sum: number, item: any) => sum + Math.abs(item.propertyTotals?.[property] || 0), 0);
        
        const otherIncome = Object.values(periodData)
          .filter((item: any) => item.category === 'Other Income')
          .reduce((sum: number, item: any) => sum + (item.propertyTotals?.[property] || 0), 0);
        
        const otherExpenses = Object.values(periodData)
          .filter((item: any) => item.category === 'Other Expenses')
          .reduce((sum: number, item: any) => sum + Math.abs(item.propertyTotals?.[property] || 0), 0);

        const netIncome = revenue - cogs - operatingExpenses + otherIncome - otherExpenses;

        return {
          period: property.length > 8 ? property.substring(0, 8) + '...' : property,
          fullPropertyName: property,
          revenue,
          netIncome,
          grossProfit: revenue - cogs,
          operatingIncome: revenue - cogs - operatingExpenses
        };
      }).filter(item => item.revenue > 0 || item.netIncome !== 0); // Only show properties with activity
      
      smartLog('🏢 BY-PROPERTY TREND DATA:', propertyTrendData);
      return propertyTrendData;
    }

    // For detailed view or multiple periods (time-based trend)
    if (viewMode === 'detailed' || (timePeriod !== 'Monthly' || viewMode !== 'total')) {
      const trendResult = timeSeriesData.periods.map((period: string) => {
        const periodData = timeSeriesData.data[period] || {};
        
        const revenue = Object.values(periodData)
          .filter((item: any) => item.category === 'Revenue')
          .reduce((sum: number, item: any) => sum + item.total, 0);
        
        const cogs = Object.values(periodData)
          .filter((item: any) => item.category === 'COGS')
          .reduce((sum: number, item: any) => sum + Math.abs(item.total), 0);
        
        const operatingExpenses = Object.values(periodData)
          .filter((item: any) => item.category === 'Operating Expenses')
          .reduce((sum: number, item: any) => sum + Math.abs(item.total), 0);
        
        const otherIncome = Object.values(periodData)
          .filter((item: any) => item.category === 'Other Income')
          .reduce((sum: number, item: any) => sum + item.total, 0);
        
        const otherExpenses = Object.values(periodData)
          .filter((item: any) => item.category === 'Other Expenses')
          .reduce((sum: number, item: any) => sum + Math.abs(item.total), 0);

        const netIncome = revenue - cogs - operatingExpenses + otherIncome - otherExpenses;

        const result = {
          period: period.length > 12 ? period.substring(0, 12) : period,
          fullPeriodName: period,
          revenue,
          netIncome,
          grossProfit: revenue - cogs,
          operatingIncome: revenue - cogs - operatingExpenses
        };
        
        smartLog(`📊 Period ${period}:`, result);
        return result;
      }).filter(item => item.revenue > 0 || item.netIncome !== 0); // Only show periods with activity
      
      smartLog('📊 FINAL TREND DATA:', trendResult);
      return trendResult;
    }

    // For single period (like Trailing 12 Total) - show overall totals as single point
    const singlePeriodKey = timeSeriesData.periods[0];
    const periodData = timeSeriesData.data[singlePeriodKey] || {};
    
    const revenue = Object.values(periodData)
      .filter((item: any) => item.category === 'Revenue')
      .reduce((sum: number, item: any) => sum + item.total, 0);
    
    const cogs = Object.values(periodData)
      .filter((item: any) => item.category === 'COGS')
      .reduce((sum: number, item: any) => sum + Math.abs(item.total), 0);
    
    const operatingExpenses = Object.values(periodData)
      .filter((item: any) => item.category === 'Operating Expenses')
      .reduce((sum: number, item: any) => sum + Math.abs(item.total), 0);
    
    const otherIncome = Object.values(periodData)
      .filter((item: any) => item.category === 'Other Income')
      .reduce((sum: number, item: any) => sum + item.total, 0);
    
    const otherExpenses = Object.values(periodData)
      .filter((item: any) => item.category === 'Other Expenses')
      .reduce((sum: number, item: any) => sum + Math.abs(item.total), 0);

    const netIncome = revenue - cogs - operatingExpenses + otherIncome - otherExpenses;

    const result = [{
      period: singlePeriodKey.length > 15 ? 'Total' : singlePeriodKey,
      fullPeriodName: singlePeriodKey,
      revenue,
      netIncome,
      grossProfit: revenue - cogs,
      operatingIncome: revenue - cogs - operatingExpenses
    }];
    
    smartLog('📊 SINGLE PERIOD DATA:', result);
    return result;
  };

  const generateExpenseBreakdown = () => {
  return currentData
    .filter((item: any) => item.category === 'Operating Expenses' && item.total < 0)
    .map((item: any) => ({
      name: item.name,
      value: Math.abs(item.total)
    }))
    .filter((item: any) => item.value > 0);
};

  const generatePropertyChartData = () => {
  // Only show property data if we have it
  if (viewMode === 'by-property' && timeSeriesData?.availableProperties) {
    return timeSeriesData.availableProperties.map((property: string) => {
      const revenue = currentData
        .filter((item: any) => item.category === 'Revenue')
        .reduce((sum: number, item: any) => sum + (item.propertyTotals?.[property] || 0), 0);
      
      const cogs = currentData
        .filter((item: any) => item.category === 'COGS')
        .reduce((sum: number, item: any) => sum + Math.abs(item.propertyTotals?.[property] || 0), 0);
      
      const operatingExpenses = currentData
        .filter((item: any) => item.category === 'Operating Expenses')
        .reduce((sum: number, item: any) => sum + Math.abs(item.propertyTotals?.[property] || 0), 0);
      
      const otherIncome = currentData
        .filter((item: any) => item.category === 'Other Income')
        .reduce((sum: number, item: any) => sum + (item.propertyTotals?.[property] || 0), 0);
      
      const otherExpenses = currentData
        .filter((item: any) => item.category === 'Other Expenses')
        .reduce((sum: number, item: any) => sum + Math.abs(item.propertyTotals?.[property] || 0), 0);

      const grossProfit = revenue - cogs;
      const netIncome = revenue - cogs - operatingExpenses + otherIncome - otherExpenses;

      let value = 0;
      switch (propertyChartMetric) {
        case 'income':
          value = revenue;
          break;
        case 'gp':
          value = grossProfit;
          break;
        case 'ni':
          value = netIncome;
          break;
      }

      return {
        name: property,
        value: value,
        revenue: revenue,
        grossProfit: grossProfit,
        netIncome: netIncome
      };
    }).filter(item => item.value > 0); // Only show properties with positive values
  }
  
  // Fallback: If not in by-property mode, create property data from current data
  if (currentData.length > 0) {
    // Extract properties from entries
    const propertyData: Record<string, { revenue: number; cogs: number; opex: number; otherIncome: number; otherExpenses: number }> = {};
    
    currentData.forEach((account: any) => {
      if (account.entries) {
        account.entries.forEach((entry: any) => {
          const property = entry.class || 'No Property';
          if (!propertyData[property]) {
            propertyData[property] = { revenue: 0, cogs: 0, opex: 0, otherIncome: 0, otherExpenses: 0 };
          }
          
          const amount = entry.amount || 0;
          switch (account.category) {
            case 'Revenue':
              propertyData[property].revenue += amount;
              break;
            case 'COGS':
              propertyData[property].cogs += Math.abs(amount);
              break;
            case 'Operating Expenses':
              propertyData[property].opex += Math.abs(amount);
              break;
            case 'Other Income':
              propertyData[property].otherIncome += amount;
              break;
            case 'Other Expenses':
              propertyData[property].otherExpenses += Math.abs(amount);
              break;
          }
        });
      }
    });
    
    return Object.entries(propertyData).map(([property, data]) => {
      const grossProfit = data.revenue - data.cogs;
      const netIncome = data.revenue - data.cogs - data.opex + data.otherIncome - data.otherExpenses;
      
      let value = 0;
      switch (propertyChartMetric) {
        case 'income':
          value = data.revenue;
          break;
        case 'gp':
          value = grossProfit;
          break;
        case 'ni':
          value = netIncome;
          break;
      }
      
      return {
        name: property,
        value: value,
        revenue: data.revenue,
        grossProfit: grossProfit,
        netIncome: netIncome
      };
    }).filter(item => item.value > 0);
  }
  
  return [];
};

  const kpis = calculateKPIs();
  const trendData = generateTrendData();
  const expenseData = generateExpenseBreakdown();

  // Render column headers with property support
  const renderColumnHeaders = () => {
    if (timeSeriesData) {
      if (viewMode === 'by-property') {
        const properties = timeSeriesData.availableProperties || [];
        const headers = properties.map((property: string) => (
          <th key={property} className="px-2 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-200 last:border-r-0 bg-gray-50 sticky top-0 z-20" style={{ minWidth: '140px' }}>
            <div className="truncate text-center sm:text-right" title={property}>
              {property}
            </div>
          </th>
        ));
        
        headers.push(
          <th key="total" className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 sticky top-0 z-20" style={{ minWidth: '140px' }}>
            <div className="text-gray-700 font-bold">Total</div>
          </th>
        );
        
        return headers;
      } else {
        const headers = timeSeriesData.periods.map((period: string) => (
          <th key={period} className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 sticky top-0 z-20" style={{ minWidth: '140px' }}>
            {period}
          </th>
        ));
        
        if (viewMode === 'detailed') {
          headers.push(
            <th key="total" className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 sticky top-0 z-20" style={{ minWidth: '140px' }}>
              <div className="text-gray-700 font-bold">Total</div>
            </th>
          );
        }
        
        return headers;
      }
    }
    return null;
  };

  // Render data cells with property support
  const renderDataCells = (item: FinancialDataItem) => {
    if (timeSeriesData) {
      if (viewMode === 'by-property') {
        const properties = timeSeriesData.availableProperties || [];
        const cells = properties.map((property: string) => {
          let value = 0;
          let propertyEntries: any[] = [];
          
          if (item.isParent) {
            value = item.subAccounts?.reduce((sum, subAccount) => {
              const subPropertyValue = subAccount.propertyTotals?.[property] || 0;
              if (subAccount.propertyEntries?.[property]) {
                propertyEntries.push(...subAccount.propertyEntries[property]);
              }
              return sum + subPropertyValue;
            }, 0) || 0;
          } else {
            value = item.propertyTotals?.[property] || 0;
            propertyEntries = item.propertyEntries?.[property] || [];
          }
          
          const propertyItem = {
            ...item,
            total: value,
            entries: propertyEntries
          };
          
          return (
            <td key={property} className={`px-2 py-3 text-right text-sm font-medium border-r border-gray-200 last:border-r-0 ${
              value >= 0 ? 'text-green-600' : 'text-red-600'
            }`} style={{ minWidth: '140px', maxWidth: '180px' }}>
              <span 
                className="cursor-pointer hover:bg-blue-50 px-2 py-1 rounded transition-colors border border-transparent hover:border-blue-200 text-sm"
                onClick={() => handleAccountClick(propertyItem)}
              >
                {value !== 0 ? formatCurrency(value) : '-'}
              </span>
            </td>
          );
        });
        
        const totalValue = item.total;
        const totalItem = {
          ...item,
          total: totalValue,
          entries: item.entries || []
        };
        
        cells.push(
          <td key="total" className={`px-2 py-3 text-right text-sm font-medium bg-white ${
            totalValue >= 0 ? 'text-gray-700' : 'text-gray-700'
          }`} style={{ minWidth: '120px' }}>
            <span 
              className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors border border-transparent hover:border-gray-400"
              onClick={() => handleAccountClick(totalItem)}
            >
              {formatCurrency(totalValue)}
            </span>
          </td>
        );
        
        return cells;
      } else {
        // Original time period logic
        const cells = timeSeriesData.periods.map((period: string) => {
          let value = 0;
          let periodEntries: any[] = [];
          
          if (item.isParent) {
            value = item.subAccounts?.reduce((sum, subAccount) => {
              const originalSubName = subAccount.originalName || `${item.name}:${subAccount.name}`;
              const subPeriodData = timeSeriesData.data[period]?.[originalSubName];
              if (subPeriodData) {
                periodEntries.push(...(subPeriodData.entries || []));
                return sum + (subPeriodData.total || 0);
              }
              return sum;
            }, 0) || 0;
          } else if (item.isSubAccount) {
            const lookupName = item.originalName || item.name;
            const periodData = timeSeriesData.data[period]?.[lookupName];
            value = periodData?.total || 0;
            periodEntries = periodData?.entries || [];
          } else {
            const periodData = timeSeriesData.data[period]?.[item.name];
            value = periodData?.total || 0;
            periodEntries = periodData?.entries || [];
          }
          
          const periodItem = {
            ...item,
            total: value,
            entries: periodEntries
          };
          
          return (
            <td key={period} className={`px-2 py-3 text-right text-sm font-medium ${
              value >= 0 ? 'text-green-600' : 'text-red-600'
            }`} style={{ minWidth: '120px' }}>
              <span 
                className="cursor-pointer hover:bg-blue-50 px-2 py-1 rounded transition-colors border border-transparent hover:border-blue-200"
                onClick={() => handleAccountClick(periodItem)}
              >
                {value !== 0 ? formatCurrency(value) : '-'}
              </span>
            </td>
          );
        });
        
        if (viewMode === 'detailed') {
          let totalValue = 0;
          let allEntries: any[] = [];
          
          if (item.isParent) {
            totalValue = timeSeriesData.periods.reduce((sum: number, period: string) => {
              return sum + (item.subAccounts?.reduce((subSum, subAccount) => {
                const originalSubName = subAccount.originalName || `${item.name}:${subAccount.name}`;
                const subPeriodData = timeSeriesData.data[period]?.[originalSubName];
                if (subPeriodData) {
                  allEntries.push(...(subPeriodData.entries || []));
                  return subSum + (subPeriodData.total || 0);
                }
                return subSum;
              }, 0) || 0);
            }, 0);
          } else if (item.isSubAccount) {
            const lookupName = item.originalName || item.name;
            totalValue = timeSeriesData.periods.reduce((sum: number, period: string) => {
              const periodData = timeSeriesData.data[period]?.[lookupName];
              if (periodData) {
                allEntries.push(...(periodData.entries || []));
                return sum + (periodData.total || 0);
              }
              return sum;
            }, 0);
          } else {
            totalValue = timeSeriesData.periods.reduce((sum: number, period: string) => {
              const periodData = timeSeriesData.data[period]?.[item.name];
              if (periodData) {
                allEntries.push(...(periodData.entries || []));
                return sum + (periodData.total || 0);
              }
              return sum;
            }, 0);
          }
          
          const totalItem = {
            ...item,
            total: totalValue,
            entries: allEntries
          };
          
          cells.push(
            <td key="total" className={`px-2 py-3 text-right text-sm font-medium bg-white ${
              totalValue >= 0 ? 'text-gray-700' : 'text-gray-700'
            }`} style={{ minWidth: '120px' }}>
              <span 
                className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded transition-colors border border-transparent hover:border-gray-400"
                onClick={() => handleAccountClick(totalItem)}
              >
                {formatCurrency(totalValue)}
              </span>
            </td>
          );
        }
        
        return cells;
      }
    }
    return null;
  };

  // Helper function to get category totals with property support
  const getCategoryTotal = (category: PLCategory, period?: string, property?: string): number => {
    if (timeSeriesData) {
      if (viewMode === 'by-property' && property) {
        return currentData
          .filter((item: any) => item.category === category)
          .reduce((sum: number, item: any) => {
            const propertyValue = item.propertyTotals?.[property] || 0;
            return sum + propertyValue;
          }, 0);
      } else if (period) {
        const periodData = timeSeriesData.data[period] || {};
        return Object.values(periodData)
          .filter((account: any) => account.category === category)
          .reduce((sum: number, account: any) => sum + account.total, 0);
      } else {
        return currentData
          .filter((item: any) => item.category === category)
          .reduce((sum: number, item: any) => sum + item.total, 0);
      }
    }
    return 0;
  };

  // Render function for grouped accounts with expand/collapse and property support
  const renderGroupedAccounts = (accounts: FinancialDataItem[]) => {
    const groupedAccounts = groupAccountsByParent(accounts);
    
    return groupedAccounts.map((account: FinancialDataItem) => {
      if (account.isParent) {
        const isExpanded = expandedAccounts.has(account.name);
        const subAccountCount = account.subAccounts?.length || 0;
        const totalTransactions = account.entries?.length || 0;
        
        return (
          <React.Fragment key={`parent-${account.name}`}>
            {/* PARENT ACCOUNT ROW */}
            <tr className="hover:bg-blue-50 bg-blue-25 border-l-4" style={{ borderLeftColor: BRAND_COLORS.primary }}>
              <td className={`px-6 py-3 text-left text-sm bg-white sticky left-0 z-25 border-r-2 border-gray-300 shadow-lg`} style={{ minWidth: '400px', maxWidth: '450px', position: 'sticky', left: 0, zIndex: 25, backgroundColor: 'white' }}>
                <div className="flex items-center">
                  <button
                    onClick={() => toggleParentAccount(account.name)}
                    className="mr-3 p-1 hover:bg-blue-200 rounded transition-colors"
                    title={isExpanded ? 'Collapse sub-accounts' : 'Expand sub-accounts'}
                  >
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-blue-600" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-blue-600" />
                    )}
                  </button>
                  <div>
                    <div className="flex items-center">
                      <span className="font-bold text-gray-800" style={{ color: BRAND_COLORS.primary }}>
                        📁 {account.name}
                      </span>
                    </div>
                  </div>
                </div>
              </td>
              {renderDataCells(account)}
              <td className="px-2 py-3 text-right text-sm text-gray-500 bg-blue-25">
                {kpis.revenue ? calculatePercentage(Math.abs(account.total), Math.abs(kpis.revenue)) : '0%'}
              </td>
            </tr>
            
            {/* SUB-ACCOUNT ROWS (if expanded) */}
            {isExpanded && account.subAccounts && account.subAccounts.map((subAccount: FinancialDataItem) => (
              <tr key={`sub-${account.name}-${subAccount.name}`} className={`hover:bg-gray-50 ${
                subAccount.isParentAsSubAccount ? 'bg-yellow-25 border-l-4 border-yellow-300' : 'bg-blue-25 border-l-4 border-blue-200'
              }`}>
                <td className={`px-6 py-2 text-left text-sm bg-white sticky left-0 z-25 border-r-2 border-gray-300 shadow-lg`} style={{ minWidth: '400px', maxWidth: '450px', position: 'sticky', left: 0, zIndex: 25, backgroundColor: 'white' }}>
                  <div className="flex items-center pl-8">
                    <div className="w-4 h-4 mr-3 flex items-center justify-center">
                      <div className={`w-2 h-2 rounded-full ${
                        subAccount.isParentAsSubAccount ? 'bg-yellow-500' : 'bg-blue-400'
                      }`}></div>
                    </div>
                    <div>
                      <div className="flex items-center">
                        <span className="text-gray-700 font-medium">
                          {subAccount.isParentAsSubAccount ? '📁' : '💧'} {subAccount.name}
                        </span>
                      </div>
                    </div>
                  </div>
                </td>
                {renderDataCells(subAccount)}
                <td className={`px-2 py-2 text-right text-sm text-gray-500 ${
                  subAccount.isParentAsSubAccount ? 'bg-yellow-25' : 'bg-blue-25'
                }`}>
                  {kpis.revenue ? calculatePercentage(Math.abs(subAccount.total), Math.abs(kpis.revenue)) : '0%'}
                </td>
              </tr>
            ))}
          </React.Fragment>
        );
      } else {
        // Standalone account
        return (
          <tr key={`standalone-${account.name}`} className="hover:bg-gray-50">
            <td className={`px-6 py-2 text-left text-sm text-gray-700 pl-12 bg-white sticky left-0 z-25 border-r-2 border-gray-300 shadow-lg`} style={{ minWidth: '400px', maxWidth: '450px', position: 'sticky', left: 0, zIndex: 25, backgroundColor: 'white' }}>
              <div className="flex items-center">
                <span className="text-gray-700">📄 {account.name}</span>
              </div>
            </td>
            {renderDataCells(account)}
            <td className="px-2 py-2 text-right text-sm text-gray-500">
              {kpis.revenue ? calculatePercentage(Math.abs(account.total), Math.abs(kpis.revenue)) : '0%'}
            </td>
          </tr>
        );
      }
    });
  };

  // Render section headers and totals with property support
  const renderSectionHeader = (title: string, emoji: string, category: PLCategory, bgClass: string, textClass: string) => (
    <tr className={`${bgClass} border-t-2 border-opacity-50`}>
      <td className={`px-6 py-4 text-left text-lg font-bold ${textClass} bg-white sticky left-0 z-20 border-r-2 border-gray-300 shadow-lg`} style={{ minWidth: '400px', maxWidth: '450px', position: 'sticky', left: 0, zIndex: 20, backgroundColor: 'white' }}>
        {emoji} {title}
      </td>
      {viewMode === 'by-property' && timeSeriesData ? (
        <>
          {/* Property columns for by-property view */}
          {timeSeriesData.availableProperties?.map((property: string) => {
            const total = getCategoryTotal(category, undefined, property);
            return (
              <td key={property} className={`px-3 py-4 text-right text-sm font-bold ${textClass} border-r border-gray-200 last:border-r-0`}>
                {category === 'COGS' || category === 'Operating Expenses' || category === 'Other Expenses'
                  ? `(${formatCurrency(Math.abs(total))})`
                  : formatCurrency(total)
                }
              </td>
            );
          })}
          {/* Total column for section headers */}
          <td className={`px-3 py-4 text-right text-sm font-bold text-gray-900 bg-white`}>
            {category === 'COGS' || category === 'Operating Expenses' || category === 'Other Expenses'
              ? `(${formatCurrency(Math.abs(getCategoryTotal(category)))})`
              : formatCurrency(getCategoryTotal(category))
            }
          </td>
        </>
      ) : timeSeriesData && timePeriod === 'Trailing 12' && viewMode === 'total' ? (
        <td className={`px-4 py-4 text-right text-lg font-bold ${textClass}`}>
          {category === 'COGS' || category === 'Operating Expenses' || category === 'Other Expenses'
            ? `(${formatCurrency(Math.abs(getCategoryTotal(category)))})`
            : formatCurrency(getCategoryTotal(category))
          }
        </td>
      ) : timeSeriesData ? (
        <>
          {timeSeriesData.periods.map((period: string) => {
            const total = getCategoryTotal(category, period);
            return (
              <td key={period} className={`px-4 py-4 text-right text-lg font-bold ${textClass}`}>
                {category === 'COGS' || category === 'Operating Expenses' || category === 'Other Expenses'
                  ? `(${formatCurrency(Math.abs(total))})`
                  : formatCurrency(total)
                }
              </td>
            );
          })}
          {viewMode === 'detailed' && (
            <td className={`px-4 py-4 text-right text-lg font-bold text-gray-900 bg-white`}>
              {category === 'COGS' || category === 'Operating Expenses' || category === 'Other Expenses'
                ? `(${formatCurrency(Math.abs(getCategoryTotal(category)))})`
                : formatCurrency(getCategoryTotal(category))
              }
            </td>
          )}
        </>
      ) : null}
      <td className={`px-4 py-4 text-right text-sm ${textClass}`}>
        {kpis.revenue ? calculatePercentage(Math.abs(getCategoryTotal(category)), Math.abs(kpis.revenue)) : '0%'}
      </td>
    </tr>
  );

 return (
     <>
      <style jsx>{scrollbarStyles}</style>
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
                  {timeSeriesData && (
                    <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                      Connected to financial_transactions
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Real-time P&L by Property Class • From financial_transactions table
                  {timeSeriesData?.summary && (
                    <span className="ml-2 text-green-600">
                      • {timeSeriesData.summary.totalEntriesProcessed} entries loaded • {timeSeriesData.summary.periodsGenerated} periods
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

                {/* Property Class Multi-Select Dropdown - Only for non-by-property views */}
                {viewMode !== 'by-property' && (
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
                )}

                {/* Time Period and View Mode Controls */}
                <div className="flex items-center gap-2">
                  {/* Time Period Dropdown */}
                  <div className="relative">
                    <button
                      onClick={() => setTimePeriodDropdownOpen(!timePeriodDropdownOpen)}
                      className="flex items-center justify-between w-32 px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm hover:border-blue-500 focus:outline-none focus:ring-2 transition-all"
                      style={{ '--tw-ring-color': BRAND_COLORS.secondary + '33' } as React.CSSProperties}
                    >
                      <span className="truncate">{timePeriod}</span>
                      <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${timePeriodDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {timePeriodDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
                        {(['Monthly', 'Quarterly', 'Yearly', 'Trailing 12'] as TimePeriod[]).map((period) => (
                          <div
                            key={period}
                            className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                            onClick={() => {
                              setTimePeriod(period);
                              setTimePeriodDropdownOpen(false);
                            }}
                          >
                            {period}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ENHANCED: View Mode Toggle - Now includes by-property option */}
                  <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                    <button
                      onClick={() => setViewMode('total')}
                      className={`px-3 py-2 text-xs transition-colors ${
                        viewMode === 'total'
                          ? 'text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                      style={{ backgroundColor: viewMode === 'total' ? BRAND_COLORS.primary : undefined }}
                    >
                      Total
                    </button>
                    <button
                      onClick={() => setViewMode('detailed')}
                      className={`px-3 py-2 text-xs transition-colors ${
                        viewMode === 'detailed'
                          ? 'text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                      style={{ backgroundColor: viewMode === 'detailed' ? BRAND_COLORS.primary : undefined }}
                    >
                      Detail
                    </button>
                    <button
                      onClick={() => setViewMode('by-property')}
                      className={`px-3 py-2 text-xs transition-colors ${
                        viewMode === 'by-property'
                          ? 'text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                      style={{ backgroundColor: viewMode === 'by-property' ? BRAND_COLORS.primary : undefined }}
                      title="View P&L with properties as columns"
                    >
                      By Property
                    </button>
                  </div>
                </div>
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
                
                {/* Data Integrity Status Indicator */}
                {dataIntegrityStatus && (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                    dataIntegrityStatus.isValid
                      ? 'bg-green-100 text-green-800 border border-green-200'
                      : 'bg-red-100 text-red-800 border border-red-200'
                  }`}>
                    <span className="text-lg">
                      {dataIntegrityStatus.isValid ? '✅' : '❌'}
                    </span>
                    <span>
                      {dataIntegrityStatus.isValid ? 'Data Valid' : 'Data Issues'}
                    </span>
                    <span className="text-xs opacity-75">
                      ({dataIntegrityStatus.totalRecords} records)
                    </span>
                    {!dataIntegrityStatus.isValid && (
                      <div className="ml-2 text-xs">
                        <button
                          onClick={() => {
                            if (DEBUG_CONFIG.isDevelopment || DEBUG_CONFIG.isDebugMode) {
                              console.log('Data integrity issues:', dataIntegrityStatus.issues);
                            }
                            setNotification({
                              show: true,
                              message: `Data integrity issues found: ${dataIntegrityStatus.issues.slice(0, 3).join(', ')}${dataIntegrityStatus.issues.length > 3 ? '...' : ''}`,
                              type: 'error'
                            });
                          }}
                          className="underline hover:no-underline"
                        >
                          View Issues
                        </button>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Debug Mode Toggle - Only show in development */}
                {DEBUG_CONFIG.isDevelopment && (
                  <button
                    onClick={toggleDebugMode}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      debugMode
                        ? 'bg-yellow-100 text-yellow-800 border border-yellow-200 hover:bg-yellow-200'
                        : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                    }`}
                    title="Toggle debug mode for detailed logging"
                  >
                    <span className="text-lg">🔧</span>
                    <span>Debug {debugMode ? 'ON' : 'OFF'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {/* Revenue */}
              <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 hover:shadow-md transition-shadow" style={{ borderLeftColor: BRAND_COLORS.primary }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-gray-600 text-sm font-medium mb-2">Revenue</div>
                    <div className="text-2xl font-bold text-gray-900 mb-1">{formatCurrency(kpis.revenue)}</div>
                    <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full inline-block">
                      {viewMode === 'by-property' ? 
                        `All Properties (${timePeriod}${timePeriod === 'Trailing 12' ? ' Months' : ''})` :
                       timePeriod === 'Trailing 12' && viewMode === 'total' ? 'Past 12 Months' : 
                       timePeriod === 'Monthly' && viewMode === 'detailed' ? 'Monthly Total' : 'Past 12 Months'}
                    </div>
                  </div>
                  <DollarSign className="w-8 h-8" style={{ color: BRAND_COLORS.primary }} />
                </div>
              </div>
              
              {/* Gross Profit */}
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

              {/* Operating Income */}
              <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 hover:shadow-md transition-shadow" style={{ borderLeftColor: BRAND_COLORS.success }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-gray-600 text-sm font-medium mb-2">Operating Income</div>
                    <div className="text-2xl font-bold text-gray-900 mb-1">{formatCurrency(kpis.netOperatingIncome)}</div>
                    <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full inline-block">
                      {kpis.operatingMargin.toFixed(1)}% Margin
                    </div>
                  </div>
                  <TrendingUp className="w-8 h-8" style={{ color: BRAND_COLORS.success }} />
                </div>
              </div>
              
              {/* Net Income */}
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

              {/* Operating Expenses */}
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

          {/* Charts Row - 50/50 Split */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Property Performance Chart - 50% width */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold text-gray-900">Property Performance</h3>
                      
                      {/* Toggle Buttons for Revenue/GP/NI */}
                      <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                        <button
                          onClick={() => setPropertyChartMetric('income')}
                          className={`px-3 py-1 text-xs transition-colors ${
                            propertyChartMetric === 'income'
                              ? 'text-white'
                              : 'bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                          style={{ backgroundColor: propertyChartMetric === 'income' ? BRAND_COLORS.primary : undefined }}
                        >
                          Revenue
                        </button>
                        
                        {/* Only show Gross Profit button if GP differs from Revenue */}
                        {(() => {
                          const chartData = generatePropertyChartData();
                          const hasGrossProfit = chartData.some(item => 
                            Math.abs(item.revenue - item.grossProfit) > 0.01
                          );
                          
                          return hasGrossProfit ? (
                            <button
                              onClick={() => setPropertyChartMetric('gp')}
                              className={`px-3 py-1 text-xs transition-colors ${
                                propertyChartMetric === 'gp'
                                  ? 'text-white'
                                  : 'bg-white text-gray-700 hover:bg-gray-50'
                              }`}
                              style={{ backgroundColor: propertyChartMetric === 'gp' ? BRAND_COLORS.success : undefined }}
                            >
                              Gross Profit
                            </button>
                          ) : null;
                        })()}
                        
                        <button
                          onClick={() => setPropertyChartMetric('ni')}
                          className={`px-3 py-1 text-xs transition-colors ${
                            propertyChartMetric === 'ni'
                              ? 'text-white'
                              : 'bg-white text-gray-700 hover:bg-gray-50'
                          }`}
                          style={{ backgroundColor: propertyChartMetric === 'ni' ? BRAND_COLORS.secondary : undefined }}
                        >
                          Net Income
                        </button>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-600 mt-2">
                      {propertyChartMetric === 'income' ? 
                        `Revenue breakdown by property for ${timePeriod} period` :
                        propertyChartMetric === 'gp' ?
                        `Gross Profit (Revenue - COGS) by property for ${timePeriod} period` :
                        `Net Income by property for ${timePeriod} period`
                      }
                      {viewMode === 'by-property' && (
                        <span className="ml-2 text-purple-600">• Property View Active</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-2">
                    {generatePropertyChartData().length > 0 ? (
                      <div className="flex items-center justify-center">
                        <ResponsiveContainer width="100%" height={300}>
                          <RechartsPieChart>
                            <defs>
                              {generatePropertyChartData().map((entry, index) => (
                                <radialGradient key={`gradient-${index}`} id={`gradient-${index}`} cx="30%" cy="30%">
                                  <stop offset="0%" stopColor={COLORS[index % COLORS.length]} stopOpacity="1" />
                                  <stop offset="70%" stopColor={COLORS[index % COLORS.length]} stopOpacity="0.8" />
                                  <stop offset="100%" stopColor={COLORS[index % COLORS.length]} stopOpacity="0.6" />
                                </radialGradient>
                              ))}
                            </defs>
                            
                            <Pie
                              data={generatePropertyChartData()}
                              cx="50%"
                              cy="52%"
                              outerRadius={90}
                              fill="#000000"
                              fillOpacity={0.08}
                              dataKey="value"
                              startAngle={0}
                              endAngle={360}
                              isAnimationActive={false}
                            />
                            
                            <Pie
                              data={generatePropertyChartData()}
                              cx="50%"
                              cy="50%"
                              outerRadius={90}
                              innerRadius={0}
                              paddingAngle={2}
                              dataKey="value"
                              startAngle={0}
                              endAngle={360}
                              animationDuration={1000}
                              animationEasing="ease-out"
                              label={({ name, percent, value }) => 
                                percent > 0.08 ? `${(percent * 100).toFixed(1)}%` : ''
                              }
                              labelLine={false}
                              style={{
                                fontSize: '11px',
                                fontWeight: 'bold',
                                fill: 'white',
                                textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                              }}
                            >
                              {generatePropertyChartData().map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={`url(#gradient-${index})`}
                                  stroke="#ffffff"
                                  strokeWidth={2}
                                  style={{
                                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                                    cursor: 'pointer'
                                  }}
                                />
                              ))}
                            </Pie>
                            
                            <Tooltip 
                              formatter={(value: any, name: string, props: any) => {
                                const metricName = propertyChartMetric === 'income' ? 'Revenue' :
                                               propertyChartMetric === 'gp' ? 'Gross Profit' : 'Net Income';
                                
                                return [
                                  `${formatCurrency(Number(value))}`,
                                  metricName
                                ];
                              }}
                              labelFormatter={(label: string, payload: any) => {
                                // Return the property name as the tooltip header
                                if (payload && payload.length > 0) {
                                  return payload[0].payload.name;
                                }
                                return label;
                              }}
                              contentStyle={{ 
                                backgroundColor: 'white', 
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                fontSize: '12px',
                                fontWeight: 500
                              }}
                              labelStyle={{
                                fontWeight: 'bold',
                                fontSize: '13px',
                                color: '#1f2937',
                                marginBottom: '4px',
                                borderBottom: '1px solid #e5e7eb',
                                paddingBottom: '2px'
                              }}
                            />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-72 text-gray-500">
                        <div className="text-center">
                          <PieChart className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                          <p className="text-lg font-medium text-gray-600">No property data available</p>
                          <p className="text-sm mt-2 text-gray-500">
                            {viewMode === 'by-property' ? 
                              'Switch to a different time period or check your data filters' :
                              'Switch to "By Property" view to see property breakdown'
                            }
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Revenue & Net Income Trend Chart - 50% width */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl shadow-sm overflow-hidden h-full">
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Revenue & Net Income</h3>
                    <div className="text-sm text-gray-600 mt-1">
                      {viewMode === 'by-property' ? 
                        `${timePeriod} comparison • ${trendData.length} properties` :
                        timePeriod === 'Trailing 12' && viewMode === 'total' ? 
                          'Past 12 months' :
                          `${timePeriod} ${viewMode}`
                      }
                      {trendData.length > 1 && viewMode !== 'by-property' && (
                        <span className="ml-1 text-green-600">• {trendData.length} periods</span>
                      )}
                    </div>
                  </div>
                  <div className="p-2">
                    {trendData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart 
                          data={trendData}
                          margin={{ 
                            top: 20, 
                            right: 20, 
                            left: 20, 
                            bottom: trendData.length > 4 ? 60 : 40 
                          }}
                        >
                          <CartesianGrid 
                            strokeDasharray="2 2" 
                            stroke="#f1f5f9" 
                            strokeOpacity={0.8}
                            vertical={false}
                          />
                          
                          <XAxis 
                            dataKey="period" 
                            tick={{ 
                              fontSize: 11, 
                              fontWeight: 500,
                              fill: '#475569'
                            }}
                            tickLine={{ stroke: '#e2e8f0', strokeWidth: 1 }}
                            axisLine={{ stroke: '#e2e8f0', strokeWidth: 1 }}
                            angle={trendData.length > 4 ? -45 : 0}
                            textAnchor={trendData.length > 4 ? 'end' : 'middle'}
                            height={trendData.length > 4 ? 60 : 40}
                            interval={0}
                          />
                          
                          <YAxis 
                            tickFormatter={(value: any) => `${(value / 1000).toFixed(0)}k`}
                            tick={{ 
                              fontSize: 11, 
                              fontWeight: 500,
                              fill: '#475569'
                            }}
                            tickLine={{ stroke: '#e2e8f0', strokeWidth: 1 }}
                            axisLine={{ stroke: '#e2e8f0', strokeWidth: 1 }}
                            width={50}
                            domain={[0, 'dataMax']}
                          />
                          
                          <Tooltip 
                            formatter={(value: any, name: string) => {
                              const label = name === 'netIncome' ? 'Net Income' : 'Revenue';
                              return [`${formatCurrency(Number(value))}`, label];
                            }}
                            contentStyle={{ 
                              backgroundColor: 'white', 
                              border: '1px solid #e2e8f0',
                              borderRadius: '8px',
                              fontSize: '11px',
                              fontWeight: 500,
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                            labelStyle={{
                              fontWeight: 'bold',
                              fontSize: '12px',
                              color: '#1f2937'
                            }}
                          />
                          
                          <Legend 
                            wrapperStyle={{ 
                              paddingTop: '15px',
                              fontSize: '11px',
                              fontWeight: 500
                            }}
                            iconType="plainline"
                            formatter={(value: string) => 
                              value === 'netIncome' ? 'Net Income' : 'Revenue'
                            }
                          />
                          
                          <Bar 
                            dataKey="netIncome" 
                            fill="#10b981"
                            fillOpacity={0.8}
                            name="netIncome"
                            radius={[3, 3, 0, 0]}
                            stroke="none"
                          >
                            {trendData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.netIncome >= 0 ? '#10b981' : '#ef4444'}
                              />
                            ))}
                          </Bar>
                          
                          <Line 
                            type="monotone" 
                            dataKey="revenue" 
                            stroke="#2563eb" 
                            strokeWidth={3}
                            dot={{ 
                              r: 4, 
                              fill: '#2563eb', 
                              strokeWidth: 2, 
                              stroke: 'white'
                            }}
                            activeDot={{ 
                              r: 6, 
                              fill: '#2563eb', 
                              strokeWidth: 3, 
                              stroke: 'white'
                            }}
                            name="revenue"
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-72 text-gray-500">
                        <div className="text-center">
                          <BarChart3 className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm font-medium text-gray-600">No trend data</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {/* Main Content Grid - P&L and Transaction Details Below */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              {/* P&L Table - 80% width (4/5) */}
              <div className="lg:col-span-4">
                {/* Your existing P&L table code goes here */}
              </div>

              {/* Transaction Detail Panel - 20% width (1/5) */}
              <div className="lg:col-span-1">
                {/* Your existing transaction detail code goes here */}
              </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              {/* Left Column: Financial Tables */}
              <div className="lg:col-span-4">
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900">
                          Profit & Loss Statement {viewMode === 'by-property' ? `(By Property - ${timePeriod})` : '(By Property Class)'}
                        </h3>
                        <div className="mt-2 text-sm text-gray-600">
                          {viewMode === 'by-property'
                            ? `Showing ${timePeriod.toLowerCase()} property comparison for ${
                                timePeriod === 'Monthly' ? selectedMonth :
                                timePeriod === 'Quarterly' ? `Q${Math.floor(new Date(`${selectedMonth.split(' ')[0]} 1, ${selectedMonth.split(' ')[1]}`).getMonth() / 3) + 1} ${selectedMonth.split(' ')[1]}` :
                                timePeriod === 'Yearly' ? selectedMonth.split(' ')[1] :
                                `past 12 months ending ${selectedMonth}`
                              } • ${timeSeriesData?.availableProperties?.length || 0} properties`
                            : timePeriod === 'Trailing 12' && viewMode === 'total' 
                            ? 'Showing aggregated totals for the past 12 months'
                            : timePeriod === 'Monthly' && viewMode === 'detailed'
                            ? 'Showing weekly breakdown for the selected month'
                            : `Showing ${timePeriod.toLowerCase()} ${viewMode} view`
                          }
                          {viewMode === 'by-property' && (
                            <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800">
                              🏢 Property View
                            </span>
                          )}
                          <div className="mt-1 text-xs text-green-600">
                            ✅ P&L accounts automatically classified • Balance Sheet accounts excluded • 🏗️ Account grouping enabled
                            {viewMode === 'by-property' && (
                              <span className="ml-1">• 🏢 Property dimension active</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                {/* P&L Table Content */}
<div className="relative bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200" style={{ height: '105vh' }}>
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
    <div className="relative" style={{ 
      height: '105vh',
      overflowX: 'auto',
      overflowY: 'auto',
      scrollBehavior: 'smooth',
      WebkitOverflowScrolling: 'touch',
      scrollbarWidth: 'none',
      msOverflowStyle: 'none'
    }} 
    className="relative [&::-webkit-scrollbar]:hidden"
    id="pl-table-container">
      <table className="table-auto" style={{ 
        minWidth: viewMode === 'by-property' && timeSeriesData?.availableProperties ? 
          `${Math.max(1400, (timeSeriesData.availableProperties.length + 2) * 180)}px` : 
          viewMode === 'detailed' && timeSeriesData?.periods ? 
          `${Math.max(1400, (timeSeriesData.periods.length + 2) * 180)}px` : '1200px',
        width: '100%',
        tableLayout: 'fixed'
      }}>
        <thead className="bg-gray-50 sticky top-0 z-20">
          <tr>
            <th className={`px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-white sticky left-0 z-50 border-r-2 border-gray-300 shadow-lg ${
              (timeSeriesData && timeSeriesData.periods && timeSeriesData.periods.length > 1) || 
              (viewMode === 'by-property' && timeSeriesData?.availableProperties?.length > 0) 
                ? 'border-b-2 border-gray-200' : ''
            }`} style={{ minWidth: '400px', maxWidth: '450px', position: 'sticky', top: 0, left: 0, zIndex: 50, backgroundColor: 'white' }}>
              Account
            </th>
            {renderColumnHeaders()}
            <th className="px-2 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 sticky top-0 z-20" style={{ minWidth: '120px', position: 'sticky', top: 0, zIndex: 20, backgroundColor: '#F9FAFB' }}>
              % of Revenue
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {/* Revenue Section */}
          {renderSectionHeader('REVENUE', '💰', 'Revenue', 'bg-blue-50', 'text-blue-900')}
          {renderGroupedAccounts(currentData.filter((item: any) => item.category === 'Revenue'))}

                          {/* TOTAL REVENUE */}
                          <tr className="bg-blue-100 border-t-2 border-blue-300">
                            <td className={`px-6 py-4 text-left text-lg font-bold text-blue-800 bg-white sticky left-0 z-30 border-r-2 border-gray-300 shadow-lg`} style={{ minWidth: '400px', maxWidth: '450px', position: 'sticky', left: 0, zIndex: 30, backgroundColor: 'white' }}>
                              📊 TOTAL REVENUE
                            </td>
                            {viewMode === 'by-property' && timeSeriesData ? (
                              <>
                                {/* Property columns for by-property view */}
                                {timeSeriesData.availableProperties?.map((property: string) => (
                                  <td key={property} className="px-3 py-4 text-right text-lg font-bold text-blue-800 border-r border-gray-200 last:border-r-0">
                                    {formatCurrency(getCategoryTotal('Revenue', undefined, property))}
                                  </td>
                                ))}
                                {/* Total column for by-property view */}
                                <td className="px-3 py-4 text-right text-lg font-bold text-gray-900 bg-white">
                                  {formatCurrency(kpis.revenue)}
                                </td>
                              </>
                            ) : timeSeriesData && timePeriod === 'Trailing 12' && viewMode === 'total' ? (
                              <td className="px-4 py-4 text-right text-lg font-bold text-blue-800">
                                {formatCurrency(kpis.revenue)}
                              </td>
                            ) : timeSeriesData ? (
                              <>
                                {timeSeriesData.periods.map((period: string) => (
                                  <td key={period} className="px-4 py-4 text-right text-lg font-bold text-blue-800">
                                    {formatCurrency(getCategoryTotal('Revenue', period))}
                                  </td>
                                ))}
                                {viewMode === 'detailed' && (
                                  <td className="px-4 py-4 text-right text-lg font-bold text-gray-800 bg-white">
                                    {formatCurrency(kpis.revenue)}
                                  </td>
                                )}
                              </>
                            ) : null}
                            <td className="px-4 py-4 text-right text-sm font-bold text-blue-800">
                              100.0%
                            </td>
                          </tr>

                          {/* COGS Section */}
                          {currentData.some((item: any) => item.category === 'COGS') && (
                            <>
                              {renderSectionHeader('COST OF GOODS SOLD', '🏭', 'COGS', 'bg-red-50', 'text-red-900')}
                              {renderGroupedAccounts(currentData.filter((item: any) => item.category === 'COGS'))}

                              {/* TOTAL COGS */}
                              <tr className="bg-red-100 border-t-2 border-red-300">
                                <td className={`px-6 py-4 text-left text-lg font-bold text-red-800 bg-white sticky left-0 z-30 border-r-2 border-gray-300 shadow-lg`} style={{ minWidth: '400px', maxWidth: '450px', position: 'sticky', left: 0, zIndex: 30, backgroundColor: 'white' }}>
                                  📊 TOTAL COGS
                                </td>
                                {viewMode === 'by-property' && timeSeriesData ? (
                                  <>
                                    {timeSeriesData.availableProperties?.map((property: string) => (
                                      <td key={property} className="px-3 py-4 text-right text-lg font-bold text-red-800 border-r border-gray-200 last:border-r-0">
                                        ({formatCurrency(Math.abs(getCategoryTotal('COGS', undefined, property)))})
                                      </td>
                                    ))}
                                    <td className="px-3 py-4 text-right text-lg font-bold text-red-900 bg-red-200 border-l border-red-500 shadow-sm">
                                      ({formatCurrency(kpis.cogs)})
                                    </td>
                                  </>
                                ) : timeSeriesData && timePeriod === 'Trailing 12' && viewMode === 'total' ? (
                                  <td className="px-4 py-4 text-right text-lg font-bold text-red-800">
                                    ({formatCurrency(kpis.cogs)})
                                  </td>
                                ) : timeSeriesData ? (
                                  <>
                                    {timeSeriesData.periods.map((period: string) => {
                                      const total = Math.abs(getCategoryTotal('COGS', period));
                                      return (
                                        <td key={period} className="px-4 py-4 text-right text-lg font-bold text-red-800">
                                          ({formatCurrency(total)})
                                        </td>
                                      );
                                    })}
                                    {viewMode === 'detailed' && (
                                      <td className="px-4 py-4 text-right text-lg font-bold text-red-800 bg-white">
                                        ({formatCurrency(kpis.cogs)})
                                      </td>
                                    )}
                                  </>
                                ) : null}
                                <td className="px-4 py-4 text-right text-sm font-bold text-red-800">
                                  {kpis.revenue ? calculatePercentage(kpis.cogs, Math.abs(kpis.revenue)) : '0%'}
                                </td>
                              </tr>
                            </>
                          )}

                          {/* 📈 GROSS PROFIT */}
                          <tr className="border-t-4 bg-green-100" style={{ borderTopColor: BRAND_COLORS.success }}>
                            <td className={`px-6 py-5 text-left text-xl font-bold bg-white sticky left-0 z-30 border-r-2 border-gray-300 shadow-lg`} style={{ color: BRAND_COLORS.success, minWidth: '400px', maxWidth: '450px', position: 'sticky', left: 0, zIndex: 30, backgroundColor: 'white' }}>
                              📈 GROSS PROFIT
                            </td>
                            {viewMode === 'by-property' && timeSeriesData ? (
                              <>
                                {timeSeriesData.availableProperties?.map((property: string) => {
                                  const revenue = getCategoryTotal('Revenue', undefined, property);
                                  const cogs = getCategoryTotal('COGS', undefined, property);
                                  const grossProfit = revenue - Math.abs(cogs);
                                  
                                  return (
                                    <td key={property} className={`px-3 py-5 text-right text-xl font-bold border-r border-gray-200 last:border-r-0`} style={{ color: BRAND_COLORS.success }}>
                                      {formatCurrency(grossProfit)}
                                    </td>
                                  );
                                })}
                                <td className={`px-3 py-5 text-right text-xl font-bold bg-green-200 border-l border-green-500 shadow-sm`} style={{ color: BRAND_COLORS.success }}>
                                  {formatCurrency(kpis.grossProfit)}
                                </td>
                              </>
                            ) : timeSeriesData && timePeriod === 'Trailing 12' && viewMode === 'total' ? (
                              <td className={`px-4 py-5 text-right text-xl font-bold`} style={{ color: BRAND_COLORS.success }}>
                                {formatCurrency(kpis.grossProfit)}
                              </td>
                            ) : timeSeriesData ? (
                              <>
                                {timeSeriesData.periods.map((period: string) => {
                                  const revenue = getCategoryTotal('Revenue', period);
                                  const cogs = getCategoryTotal('COGS', period);
                                  const grossProfit = revenue - Math.abs(cogs);
                                  
                                  return (
                                    <td key={period} className={`px-4 py-5 text-right text-xl font-bold`} style={{ color: BRAND_COLORS.success }}>
                                      {formatCurrency(grossProfit)}
                                    </td>
                                  );
                                })}
                                {viewMode === 'detailed' && (
                                  <td className={`px-4 py-5 text-right text-xl font-bold bg-white`} style={{ color: BRAND_COLORS.success }}>
                                    {formatCurrency(kpis.grossProfit)}
                                  </td>
                                )}
                              </>
                            ) : null}
                            <td className="px-4 py-5 text-right text-lg font-bold" style={{ color: BRAND_COLORS.success }}>
                              {kpis.grossMargin.toFixed(1)}%
                            </td>
                          </tr>

                          {/* Operating Expenses Section */}
                          {currentData.some((item: any) => item.category === 'Operating Expenses') && (
                            <>
                              {renderSectionHeader('OPERATING EXPENSES', '💸', 'Operating Expenses', 'bg-orange-50', 'text-orange-900')}
                              {renderGroupedAccounts(currentData.filter((item: any) => item.category === 'Operating Expenses'))}

                              {/* TOTAL OPERATING EXPENSES */}
                              <tr className="bg-orange-100 border-t-2 border-orange-300">
                                <td className={`px-6 py-4 text-left text-lg font-bold text-orange-800 bg-white sticky left-0 z-30 border-r-2 border-gray-300 shadow-lg`} style={{ minWidth: '400px', maxWidth: '450px', position: 'sticky', left: 0, zIndex: 30, backgroundColor: 'white' }}>
                                  📊 TOTAL OPERATING EXPENSES
                                </td>
                                {viewMode === 'by-property' && timeSeriesData ? (
                                  <>
                                    {timeSeriesData.availableProperties?.map((property: string) => (
                                      <td key={property} className="px-3 py-4 text-right text-lg font-bold text-orange-800 border-r border-gray-200 last:border-r-0">
                                        ({formatCurrency(Math.abs(getCategoryTotal('Operating Expenses', undefined, property)))})
                                      </td>
                                    ))}
                                    <td className="px-3 py-4 text-right text-lg font-bold text-orange-900 bg-orange-200 border-l border-orange-500 shadow-sm">
                                      ({formatCurrency(kpis.operatingExpenses)})
                                    </td>
                                  </>
                                ) : timeSeriesData && timePeriod === 'Trailing 12' && viewMode === 'total' ? (
                                  <td className="px-4 py-4 text-right text-lg font-bold text-orange-800">
                                    ({formatCurrency(kpis.operatingExpenses)})
                                  </td>
                                ) : timeSeriesData ? (
                                  <>
                                    {timeSeriesData.periods.map((period: string) => {
                                      const total = Math.abs(getCategoryTotal('Operating Expenses', period));
                                      return (
                                        <td key={period} className="px-4 py-4 text-right text-lg font-bold text-orange-800">
                                          ({formatCurrency(total)})
                                        </td>
                                      );
                                    })}
                                    {viewMode === 'detailed' && (
                                      <td className="px-4 py-4 text-right text-lg font-bold text-orange-800 bg-white">
                                        ({formatCurrency(kpis.operatingExpenses)})
                                      </td>
                                    )}
                                  </>
                                ) : null}
                                <td className="px-4 py-4 text-right text-sm font-bold text-orange-800">
                                  {kpis.revenue ? calculatePercentage(kpis.operatingExpenses, Math.abs(kpis.revenue)) : '0%'}
                                </td>
                              </tr>
                            </>
                          )}

                          {/* 🏆 NET OPERATING INCOME */}
                          <tr className="border-t-4 bg-green-100" style={{ borderTopColor: BRAND_COLORS.primary }}>
                            <td className={`px-6 py-5 text-left text-xl font-bold bg-white sticky left-0 z-30 border-r-2 border-gray-300 shadow-lg`} style={{ color: BRAND_COLORS.primary, minWidth: '400px', maxWidth: '450px', position: 'sticky', left: 0, zIndex: 30, backgroundColor: 'white' }}>
                              🏆 NET OPERATING INCOME
                            </td>
                            {viewMode === 'by-property' && timeSeriesData ? (
                              <>
                                {timeSeriesData.availableProperties?.map((property: string) => {
                                  const revenue = getCategoryTotal('Revenue', undefined, property);
                                  const cogs = getCategoryTotal('COGS', undefined, property);
                                  const opex = getCategoryTotal('Operating Expenses', undefined, property);
                                  const netOpIncome = revenue - Math.abs(cogs) - Math.abs(opex);
                                  
                                  return (
                                    <td key={property} className={`px-3 py-5 text-right text-xl font-bold border-r border-gray-200 last:border-r-0 ${
                                      netOpIncome >= 0 ? 'text-green-700' : 'text-red-700'
                                    }`}>
                                      {formatCurrency(netOpIncome)}
                                    </td>
                                  );
                                })}
                                <td className={`px-3 py-5 text-right text-xl font-bold ${
                                  kpis.netOperatingIncome >= 0 ? 'text-green-800 bg-green-200' : 'text-red-800 bg-red-200'
                                } border-l border-blue-500 shadow-sm`}>
                                  {formatCurrency(kpis.netOperatingIncome)}
                                </td>
                              </>
                            ) : timeSeriesData && timePeriod === 'Trailing 12' && viewMode === 'total' ? (
                              <td className={`px-4 py-5 text-right text-xl font-bold ${
                                kpis.netOperatingIncome >= 0 ? 'text-green-700' : 'text-red-700'
                              }`}>
                                {formatCurrency(kpis.netOperatingIncome)}
                              </td>
                            ) : timeSeriesData ? (
                              <>
                                {timeSeriesData.periods.map((period: string) => {
                                  const revenue = getCategoryTotal('Revenue', period);
                                  const cogs = getCategoryTotal('COGS', period);
                                  const opex = getCategoryTotal('Operating Expenses', period);
                                  const netOpIncome = revenue - Math.abs(cogs) - Math.abs(opex);
                                  
                                  return (
                                    <td key={period} className={`px-4 py-5 text-right text-xl font-bold ${
                                      netOpIncome >= 0 ? 'text-green-700' : 'text-red-700'
                                    }`}>
                                      {formatCurrency(netOpIncome)}
                                    </td>
                                  );
                                })}
                                {viewMode === 'detailed' && (
                                  <td className={`px-4 py-5 text-right text-xl font-bold bg-white ${
                                    kpis.netOperatingIncome >= 0 ? 'text-green-700' : 'text-red-700'
                                  }`}>
                                    {formatCurrency(kpis.netOperatingIncome)}
                                  </td>
                                )}
                              </>
                            ) : null}
                            <td className="px-4 py-5 text-right text-lg font-bold" style={{ color: BRAND_COLORS.primary }}>
                              {kpis.operatingMargin.toFixed(1)}%
                            </td>
                          </tr>

                          {/* Other Income Section */}
                          {currentData.some((item: any) => item.category === 'Other Income') && (
                            <>
                              {renderSectionHeader('OTHER INCOME', '➕', 'Other Income', 'bg-green-50', 'text-green-900')}
                              {renderGroupedAccounts(currentData.filter((item: any) => item.category === 'Other Income'))}
                            </>
                          )}

                          {/* Other Expenses Section */}
                          {currentData.some((item: any) => item.category === 'Other Expenses') && (
                            <>
                              {renderSectionHeader('OTHER EXPENSES', '➖', 'Other Expenses', 'bg-purple-50', 'text-purple-900')}
                              {renderGroupedAccounts(currentData.filter((item: any) => item.category === 'Other Expenses'))}
                            </>
                          )}

                          {/* 🎯 FINAL NET INCOME */}
                          <tr className="border-t-4 bg-green-100" style={{ borderTopColor: BRAND_COLORS.secondary }}>
                            <td className={`px-6 py-6 text-left text-2xl font-bold bg-white sticky left-0 z-30 border-r-2 border-gray-300 shadow-lg`} style={{ color: BRAND_COLORS.secondary, minWidth: '400px', maxWidth: '450px', position: 'sticky', left: 0, zIndex: 30, backgroundColor: 'white' }}>
                              🎯 NET INCOME
                            </td>
                            {viewMode === 'by-property' && timeSeriesData ? (
                              <>
                                {timeSeriesData.availableProperties?.map((property: string) => {
                                  const revenue = getCategoryTotal('Revenue', undefined, property);
                                  const cogs = getCategoryTotal('COGS', undefined, property);
                                  const opex = getCategoryTotal('Operating Expenses', undefined, property);
                                  const otherIncome = getCategoryTotal('Other Income', undefined, property);
                                  const otherExpenses = getCategoryTotal('Other Expenses', undefined, property);
                                  const finalNetIncome = revenue - Math.abs(cogs) - Math.abs(opex) + otherIncome - Math.abs(otherExpenses);
                                  
                                  return (
                                    <td key={property} className={`px-3 py-6 text-right text-2xl font-bold border-r border-gray-200 last:border-r-0 ${
                                      finalNetIncome >= 0 ? 'text-green-700' : 'text-red-700'
                                    }`}>
                                      {formatCurrency(finalNetIncome)}
                                    </td>
                                  );
                                })}
                                <td className={`px-3 py-6 text-right text-2xl font-bold ${
                                  kpis.netIncome >= 0 ? 'text-green-800 bg-green-200' : 'text-red-800 bg-red-200'
                                } border-l border-blue-500 shadow-sm`}>
                                  {formatCurrency(kpis.netIncome)}
                                </td>
                              </>
                            ) : timeSeriesData && timePeriod === 'Trailing 12' && viewMode === 'total' ? (
                              <td className={`px-4 py-6 text-right text-2xl font-bold ${
                                kpis.netIncome >= 0 ? 'text-green-700' : 'text-red-700'
                              }`}>
                                {formatCurrency(kpis.netIncome)}
                              </td>
                            ) : timeSeriesData ? (
                              <>
                                {timeSeriesData.periods.map((period: string) => {
                                  const revenue = getCategoryTotal('Revenue', period);
                                  const cogs = getCategoryTotal('COGS', period);
                                  const opex = getCategoryTotal('Operating Expenses', period);
                                  const otherIncome = getCategoryTotal('Other Income', period);
                                  const otherExpenses = getCategoryTotal('Other Expenses', period);
                                  const finalNetIncome = revenue - Math.abs(cogs) - Math.abs(opex) + otherIncome - Math.abs(otherExpenses);
                                  
                                  return (
                                    <td key={period} className={`px-4 py-6 text-right text-2xl font-bold ${
                                      finalNetIncome >= 0 ? 'text-green-700' : 'text-red-700'
                                    }`}>
                                      {formatCurrency(finalNetIncome)}
                                    </td>
                                  );
                                })}
                                {viewMode === 'detailed' && (
                                  <td className={`px-4 py-6 text-right text-2xl font-bold bg-white ${
                                    kpis.netIncome >= 0 ? 'text-green-700' : 'text-red-700'
                                  }`}>
                                    {formatCurrency(kpis.netIncome)}
                                  </td>
                                )}
                              </>
                            ) : null}
                            <td className="px-4 py-6 text-right text-xl font-bold" style={{ color: BRAND_COLORS.secondary }}>
                              {kpis.netMargin.toFixed(1)}%
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>

                         
            {/* Right Column: Charts */}
            <div className="lg:col-span-1">
             
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
                        <p className="text-xs text-blue-600 mt-1">
                          Category: {selectedAccountDetails.category} • Type: {selectedAccountDetails.account_type}
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
                          <span className="text-xs text-gray-500">P&L Category</span>
                          <div className="text-lg font-semibold">{selectedAccountDetails.category}</div>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500">Account Type</span>
                          <div className="text-sm text-gray-700">{selectedAccountDetails.account_type}</div>
                        </div>
                        <div>
                          <span className="text-xs text-gray-500">Detail Type</span>
                          <div className="text-sm text-gray-700">{selectedAccountDetails.account_detail_type || 'None'}</div>
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
                                      <strong>Detail:</strong> {entry.account_detail_type || 'None'}
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
                        <span className="text-sm font-medium">{viewMode === 'by-property' ? 'All Properties (Property View)' : getSelectedPropertiesText()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Data Period:</span>
                        <span className="text-sm font-medium">{selectedMonth}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">View Mode:</span>
                        <span className="text-sm font-medium">{timePeriod} {viewMode}</span>
                      </div>
                      {timeSeriesData?.summary && (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Total Entries Processed:</span>
                            <span className="text-sm font-medium">{timeSeriesData.summary.totalEntriesProcessed}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-gray-600">Periods Generated:</span>
                            <span className="text-sm font-medium">{timeSeriesData.summary.periodsGenerated}</span>
                          </div>
                          {timePeriod === 'Trailing 12' && viewMode === 'total' && (
                            <div className="p-3 bg-blue-50 rounded-lg">
                              <div className="text-sm text-blue-700">
                                <strong>🕐 Trailing 12 Months Period:</strong>
                                <div className="mt-1 text-xs">
                                  From: {timeSeriesData.summary.dateRanges[0]?.start}
                                </div>
                                <div className="text-xs">
                                  To: {timeSeriesData.summary.dateRanges[0]?.end}
                                </div>
                                <div className="mt-2 text-xs">
                                  This represents the total sum of all financial activity across the past 12 months ending with {selectedMonth}.
                                </div>
                              </div>
                            </div>
                          )}
                          {timePeriod === 'Monthly' && viewMode === 'detailed' && (
                            <div className="p-3 bg-green-50 rounded-lg">
                              <div className="text-sm text-green-700">
                                <strong>📅 Monthly Weekly Breakdown:</strong>
                                <div className="mt-1 text-xs">
                                  Showing {timeSeriesData.summary.periodsGenerated} weeks within {selectedMonth}
                                </div>
                                <div className="mt-2 text-xs">
                                  Each week column shows financial activity for that specific week range. The Total column aggregates all weeks for the month.
                                </div>
                              </div>
                            </div>
                          )}
                          {viewMode === 'by-property' && (
                            <div className="p-3 bg-purple-50 rounded-lg">
                              <div className="text-sm text-purple-700">
                                <strong>🏢 Property Dimension View:</strong>
                                <div className="mt-1 text-xs">
                                  Showing {timeSeriesData?.availableProperties?.length || 0} properties for {timePeriod} period
                                </div>
                                <div className="mt-2 text-xs">
                                  Each property column shows financial performance for that specific property. Compare across properties to identify top performers.
                                </div>
                                {timeSeriesData?.availableProperties && (
                                  <div className="mt-2 text-xs">
                                    <strong>Properties:</strong> {timeSeriesData.availableProperties.join(', ')}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-700">
                          💡 <strong>Tip:</strong> Click on any dollar amount in the P&L table to view detailed transaction breakdowns here.
                        </p>
                        <p className="text-sm text-blue-700 mt-2">
                          📊 <strong>Enhanced Classification:</strong> Accounts are automatically categorized based on their account_type and account_detail_type from Supabase.
                        </p>
                        <p className="text-sm text-blue-700 mt-2">
                          🏗️ <strong>Account Grouping:</strong> Accounts with colons (e.g., "Utilities:Water & sewer") are automatically grouped under parent accounts. Click the arrows to expand/collapse.
                        </p>
                        {timePeriod === 'Monthly' && viewMode === 'detailed' && (
                          <p className="text-sm text-blue-700 mt-2">
                            📅 <strong>Monthly Detail:</strong> Use the weekly columns to analyze financial performance by week within {selectedMonth}.
                          </p>
                        )}
                        {viewMode === 'by-property' && (
                          <p className="text-sm text-blue-700 mt-2">
                            🏢 <strong>Property View:</strong> Compare financial performance across property classes side-by-side. Each column represents a different property's P&L.
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
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
          {(timePeriodDropdownOpen || propertyDropdownOpen) && (
            <div
              className="fixed inset-0 z-10"
              onClick={() => {
                setTimePeriodDropdownOpen(false);
                setPropertyDropdownOpen(false);
              }}
            />
          )}
        </div>
      </main>
    </div>
        </>
  );
}

 // Cross-browser scrollbar hiding styles
const scrollbarStyles = `
  #pl-table-container::-webkit-scrollbar {
    display: none;
    width: 0;
    height: 0;
  }
  
  #pl-table-container::-webkit-scrollbar-track {
    display: none;
  }
  
  #pl-table-container::-webkit-scrollbar-thumb {
    display: none;
  }
  
  #pl-table-container {
    -ms-overflow-style: none;
    scrollbar-width: none;
    overflow-x: auto;
    overflow-y: auto;
  }
  
  /* Enhanced sticky positioning for better browser support */
  #pl-table-container thead {
    position: sticky;
    top: 0;
    z-index: 30;
  }
  
  #pl-table-container thead th {
    position: sticky;
    top: 0;
    z-index: 25;
    background-color: #F9FAFB;
  }
  
  #pl-table-container thead th:first-child {
    position: sticky;
    left: 0;
    top: 0;
    z-index: 50;
    background-color: white;
    box-shadow: 2px 0 4px rgba(0,0,0,0.1);
  }
  
  #pl-table-container tbody td:first-child {
    position: sticky;
    left: 0;
    z-index: 25;
    background-color: white;
    box-shadow: 2px 0 4px rgba(0,0,0,0.1);
  }
`;
