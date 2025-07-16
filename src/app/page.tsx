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
  viewMode: ViewMode
) => {
  try {
    console.log('🔍 FETCHING TIME SERIES DATA:', { property, monthYear, timePeriod, viewMode });
    
    const [month, year] = monthYear.split(' ');
    const selectedDate = new Date(`${month} 1, ${year}`);
    
    let dateRanges: Array<{start: string, end: string, label: string}> = [];
    
    // ENHANCED: For by-property view, respect time period dropdown settings
    if (viewMode === 'by-property') {
      if (timePeriod === 'Monthly') {
        const monthNum = selectedDate.getMonth() + 1;
        const startDate = `${year}-${monthNum.toString().padStart(2, '0')}-01`;
        const lastDay = new Date(parseInt(year), monthNum, 0).getDate();
        const endDate = `${year}-${monthNum.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
        dateRanges = [{ start: startDate, end: endDate, label: `${monthYear} (Monthly)` }];
      } else if (timePeriod === 'Quarterly') {
        const quarter = Math.floor(selectedDate.getMonth() / 3) + 1;
        const qStart = new Date(parseInt(year), (quarter - 1) * 3, 1);
        const qEnd = new Date(parseInt(year), quarter * 3, 0);
        dateRanges = [{
          start: qStart.toISOString().split('T')[0],
          end: qEnd.toISOString().split('T')[0],
          label: `Q${quarter} ${year} (Quarterly)`
        }];
      } else if (timePeriod === 'Yearly') {
        const yearStart = `${year}-01-01`;
        const yearEnd = `${year}-12-31`;
        dateRanges = [{ start: yearStart, end: yearEnd, label: `${year} (Yearly)` }];
      } else if (timePeriod === 'Trailing 12') {
        // For Trailing 12 in by-property view, get the full 12 months ending with selected month
        const endDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
        const startDate = new Date(selectedDate);
        startDate.setMonth(startDate.getMonth() - 11);
        startDate.setDate(1);
        
        dateRanges = [{
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0],
          label: `Trailing 12 Months (ending ${monthYear})`
        }];
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
    
    // Fetch data for all date ranges
    const allData: any = {};
    let totalEntriesProcessed = 0;
    let availableProperties: string[] = [];
    
    for (const range of dateRanges) {
      console.log(`🔍 Fetching data for period: ${range.label} (${range.start} to ${range.end})`);
      
      let url = `${SUPABASE_URL}/rest/v1/financial_transactions?select=*&date=gte.${range.start}&date=lte.${range.end}`;
      
      // For by-property view, get all properties; otherwise use selected property filter
      if (viewMode !== 'by-property' && property !== 'All Properties') {
        url += `&class=eq.${encodeURIComponent(property)}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const rawData = await response.json();
        console.log(`🔍 Period ${range.label}: ${rawData.length} transactions`);
        totalEntriesProcessed += rawData.length;
        
        if (viewMode === 'by-property') {
          // Get available properties from the data
          const propertiesInData = [...new Set(rawData.map((row: any) => row.class).filter((cls: any) => cls && cls.trim() !== ''))].sort();
          if (availableProperties.length === 0) {
            availableProperties = propertiesInData;
          }
          
          console.log(`🏢 BY-PROPERTY DATA PROCESSING for ${range.label}:`, {
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
            
            if (!acc[accountName].propertyTotals[propertyName]) {
              acc[accountName].propertyTotals[propertyName] = 0;
              acc[accountName].propertyEntries[propertyName] = [];
            }
            
            acc[accountName].total += (row.amount || 0);
            acc[accountName].propertyTotals[propertyName] += (row.amount || 0);
            
            acc[accountName].entries.push(row);
            acc[accountName].propertyEntries[propertyName].push(row);
            
            return acc;
          }, {});
          
          console.log(`🏢 BY-PROPERTY GROUPED for ${range.label}:`, {
            accountsGrouped: Object.keys(groupedByAccount).length,
            sampleAccount: Object.keys(groupedByAccount)[0],
            sampleData: groupedByAccount[Object.keys(groupedByAccount)[0]]
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
    
    // FIXED: For Trailing 12 Total mode, aggregate all monthly data into one summary
    if (timePeriod === 'Trailing 12' && viewMode === 'total') {
      console.log('🔍 AGGREGATING TRAILING 12 TOTAL DATA...');
      
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
    
  } catch (error) {
    console.error('Error fetching time series data:', error);
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

  // FIXED: Modified useEffect to properly handle property changes independently
  useEffect(() => {
    // Only reload data if we're not in initial loading state and have available properties
    if (!isLoadingData && availableProperties.length > 0) {
      loadRealFinancialData();
    }
  }, [selectedProperties, selectedMonth, timePeriod, viewMode]);

  const loadInitialData = async () => {
    try {
      setIsLoadingData(true);
      
      const properties = await fetchProperties();
      console.log('🏠 Available properties loaded:', properties);
      setAvailableProperties(properties);
      
      // Load initial financial data after properties are loaded
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
      
      // FIXED: Improved property filter determination
      let propertyFilter = 'All Properties';
      if (viewMode !== 'by-property') {
        if (selectedProperties.size > 0 && !selectedProperties.has('All Properties')) {
          propertyFilter = Array.from(selectedProperties)[0];
        }
      }
      
      console.log('🔍 LOADING DATA WITH FILTERS:', {
        selectedProperties: Array.from(selectedProperties),
        propertyFilter,
        month: selectedMonth,
        timePeriod,
        viewMode
      });
      
      const timeSeriesResult = await fetchTimeSeriesData(propertyFilter, selectedMonth, timePeriod, viewMode);
      
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

  // FIXED: Improved property toggle handler that works independently
  const handlePropertyToggle = (property: string) => {
    setSelectedProperties(prevSelected => {
      const newSelected = new Set(prevSelected);
      
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
      
      console.log('🏠 Property selection changed:', Array.from(newSelected));
      return newSelected;
    });
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
    console.log('🏗️ GROUPING ACCOUNTS - Starting with', accounts.length, 'accounts');
    
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
        return Object.values(firstPeriodData);
      } else if (viewMode === 'detailed' || 
          (viewMode === 'total' && (timePeriod === 'Quarterly' || timePeriod === 'Yearly'))) {
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

    console.log('🔍 GENERATING TREND DATA:', {
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
      
      console.log('🏢 BY-PROPERTY TREND DATA:', propertyTrendData);
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
        
        console.log(`📊 Period ${period}:`, result);
        return result;
      }).filter(item => item.revenue > 0 || item.netIncome !== 0); // Only show periods with activity
      
      console.log('📊 FINAL TREND DATA:', trendResult);
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
    
    console.log('📊 SINGLE PERIOD DATA:', result);
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

  const kpis = calculateKPIs();
  const trendData = generateTrendData();
  const expenseData = generateExpenseBreakdown();

  // Render column headers with property support
  const renderColumnHeaders = () => {
    if (timeSeriesData) {
      if (viewMode === 'by-property') {
        const properties = timeSeriesData.availableProperties || [];
        const headers = properties.map((property: string) => (
          <th key={property} className="px-3 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider border-r border-gray-200 last:border-r-0">
            <div className="truncate max-w-20" title={property}>
              {property}
            </div>
          </th>
        ));
        
        headers.push(
          <th key="total" className="px-3 py-3 text-right text-xs font-medium text-blue-600 uppercase tracking-wider bg-blue-50 border-l border-blue-300">
            <div className="text-blue-600 font-semibold">Total</div>
          </th>
        );
        
        return headers;
      } else {
        const headers = timeSeriesData.periods.map((period: string) => (
          <th key={period} className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
            {period}
          </th>
        ));
        
        if (viewMode === 'detailed') {
          headers.push(
            <th key="total" className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50 border-l border-gray-300">
              Total
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
            <td key={property} className={`px-3 py-3 text-right text-sm font-medium border-r border-gray-200 last:border-r-0 ${
              value >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              <span 
                className="cursor-pointer hover:bg-blue-50 px-2 py-1 rounded transition-colors border border-transparent hover:border-blue-200"
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
          <td key="total" className={`px-3 py-3 text-right text-sm font-medium bg-blue-50 border-l border-blue-300 ${
            totalValue >= 0 ? 'text-blue-700' : 'text-blue-700'
          }`}>
            <span 
              className="cursor-pointer hover:bg-blue-100 px-2 py-1 rounded transition-colors border border-transparent hover:border-blue-400"
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
            <td key={period} className={`px-4 py-3 text-right text-sm font-medium ${
              value >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
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
            <td key="total" className={`px-4 py-3 text-right text-sm font-medium bg-blue-50 border-l border-blue-300 ${
              totalValue >= 0 ? 'text-blue-700' : 'text-blue-700'
            }`}>
              <span 
                className="cursor-pointer hover:bg-blue-100 px-2 py-1 rounded transition-colors border border-transparent hover:border-blue-400"
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
              <td className={`px-6 py-3 text-left text-sm bg-blue-25 ${
                (timeSeriesData && timeSeriesData.periods && timeSeriesData.periods.length > 1) || 
                (viewMode === 'by-property' && timeSeriesData?.availableProperties?.length > 0) 
                  ? 'sticky left-0 z-25 border-r-2 border-gray-300 shadow-sm' : ''
              }`}>
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
                      <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                        Parent
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      🔢 {subAccountCount} sub-accounts • {totalTransactions} total transactions
                    </div>
                  </div>
                </div>
              </td>
              {renderDataCells(account)}
              <td className="px-4 py-3 text-right text-sm text-gray-500 bg-blue-25">
                {kpis.revenue ? calculatePercentage(Math.abs(account.total), Math.abs(kpis.revenue)) : '0%'}
              </td>
            </tr>
            
            {/* SUB-ACCOUNT ROWS (if expanded) */}
            {isExpanded && account.subAccounts && account.subAccounts.map((subAccount: FinancialDataItem) => (
              <tr key={`sub-${account.name}-${subAccount.name}`} className={`hover:bg-gray-50 ${
                subAccount.isParentAsSubAccount ? 'bg-yellow-25 border-l-4 border-yellow-300' : 'bg-blue-25 border-l-4 border-blue-200'
              }`}>
                <td className={`px-6 py-2 text-left text-sm ${
                  subAccount.isParentAsSubAccount ? 'bg-yellow-25' : 'bg-blue-25'
                } ${
                  (timeSeriesData && timeSeriesData.periods && timeSeriesData.periods.length > 1) || 
                  (viewMode === 'by-property' && timeSeriesData?.availableProperties?.length > 0) 
                    ? 'sticky left-0 z-25 border-r-2 border-gray-300 shadow-sm' : ''
                }`}>
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
                        <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs ${
                          subAccount.isParentAsSubAccount 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {subAccount.isParentAsSubAccount ? 'Parent' : 'Sub'}
                        </span>
                      </div>
                      {subAccount.entries && subAccount.entries.length > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          🔍 {subAccount.entries.length} transactions
                          {subAccount.isParentAsSubAccount && (
                            <span className="ml-2 text-yellow-600 font-medium">
                              (Direct to {account.name})
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                {renderDataCells(subAccount)}
                <td className={`px-4 py-2 text-right text-sm text-gray-500 ${
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
            <td className={`px-6 py-2 text-left text-sm text-gray-700 pl-12 bg-white ${
              (timeSeriesData && timeSeriesData.periods && timeSeriesData.periods.length > 1) || 
              (viewMode === 'by-property' && timeSeriesData?.availableProperties?.length > 0) 
                ? 'sticky left-0 z-25 border-r-2 border-gray-300 shadow-sm' : ''
            }`}>
              <div className="flex items-center">
                <span className="text-gray-700">📄 {account.name}</span>
                <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                  Individual
                </span>
              </div>
              {account.entries && account.entries.length > 0 && (
                <div className="text-xs text-gray-500 mt-1">
                  🔍 {account.entries.length} transactions
                </div>
              )}
            </td>
            {renderDataCells(account)}
            <td className="px-4 py-2 text-right text-sm text-gray-500">
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
      <td className={`px-6 py-4 text-left text-lg font-bold ${textClass} ${
        (timeSeriesData && timeSeriesData.periods && timeSeriesData.periods.length > 1) || 
        (viewMode === 'by-property' && timeSeriesData?.availableProperties?.length > 0) 
          ? 'sticky left-0 z-20 border-r-2 border-gray-200 shadow-lg' : ''
      } ${bgClass}`}>
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
          <td className={`px-3 py-4 text-right text-sm font-bold text-blue-800 bg-blue-100 border-l border-blue-400`}>
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
            <td className={`px-4 py-4 text-right text-lg font-bold text-blue-800 bg-blue-100 border-l border-blue-400`}>
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
