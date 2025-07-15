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
type TimePeriod = 'Monthly' | 'Quarterly' | 'Yearly' | 'Trailing 12';
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

// ENHANCED: Enhanced time series data fetching with Monthly Detail support
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
    
    // Generate date ranges based on time period and view mode
    switch (timePeriod) {
      case 'Monthly':
        if (viewMode === 'total') {
          // Single month
          const monthNum = selectedDate.getMonth() + 1;
          const startDate = `${year}-${monthNum.toString().padStart(2, '0')}-01`;
          const lastDay = new Date(parseInt(year), monthNum, 0).getDate();
          const endDate = `${year}-${monthNum.toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
          dateRanges = [{ start: startDate, end: endDate, label: monthYear }];
        } else {
          // ENHANCED: Weekly breakdown within the month for Monthly Detail
          const monthNum = selectedDate.getMonth() + 1;
          const firstDay = new Date(parseInt(year), monthNum - 1, 1);
          const lastDay = new Date(parseInt(year), monthNum, 0);
          
          console.log('🗓️ MONTHLY DETAIL - Generating weekly breakdown:', {
            month: monthYear,
            firstDay: firstDay.toISOString().split('T')[0],
            lastDay: lastDay.toISOString().split('T')[0]
          });
          
          // Generate weeks within the month (starting from Monday)
          const weeks = [];
          let weekStart = new Date(firstDay);
          
          // Move to first Monday of the month (or stay at first day if it's Monday)
          while (weekStart.getDay() !== 1 && weekStart <= lastDay) {
            weekStart.setDate(weekStart.getDate() + 1);
          }
          
          // If we went past the first day trying to find Monday, start from first day
          if (weekStart > firstDay) {
            weekStart = new Date(firstDay);
          }
          
          let weekNumber = 1;
          
          while (weekStart <= lastDay) {
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6); // Add 6 days for full week
            
            // Don't go past the end of the month
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
            
            console.log(`📅 Week ${weekNumber}: ${weekStartStr} to ${weekEndStr} (${startDay}-${endDay})`);
            
            // Move to next week
            weekStart.setDate(weekStart.getDate() + 7);
            weekNumber++;
          }
          
          dateRanges = weeks;
          console.log('✅ MONTHLY DETAIL - Generated', weeks.length, 'weeks');
        }
        break;
        
      case 'Quarterly':
        const quarter = Math.floor(selectedDate.getMonth() / 3) + 1;
        if (viewMode === 'total') {
          // Single quarter
          const qStart = new Date(parseInt(year), (quarter - 1) * 3, 1);
          const qEnd = new Date(parseInt(year), quarter * 3, 0);
          dateRanges = [{
            start: qStart.toISOString().split('T')[0],
            end: qEnd.toISOString().split('T')[0],
            label: `Q${quarter} ${year}`
          }];
        } else {
          // YTD quarters
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
          // Single year
          const yearStart = `${year}-01-01`;
          const yearEnd = `${year}-12-31`;
          dateRanges = [{ start: yearStart, end: yearEnd, label: year }];
        } else {
          // YTD months
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
          // FIXED: Generate all 12 months individually, then we'll aggregate them
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
          
          console.log('🔍 TRAILING 12 TOTAL - Will fetch all months and aggregate:', {
            selectedMonth: monthYear,
            periods: dateRanges.map(r => r.label),
            firstPeriod: dateRanges[0],
            lastPeriod: dateRanges[dateRanges.length - 1]
          });
        } else {
          // FIXED: Past 12 months individually (detail view)
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
          
          console.log('🔍 TRAILING 12 DETAIL:', {
            selectedMonth: monthYear,
            periods: dateRanges.map(r => r.label),
            firstPeriod: dateRanges[0],
            lastPeriod: dateRanges[dateRanges.length - 1]
          });
        }
        break;
    }
    
    // Fetch data for all date ranges
    const allData: any = {};
    let totalEntriesProcessed = 0;
    
    for (const range of dateRanges) {
      console.log(`🔍 Fetching data for period: ${range.label} (${range.start} to ${range.end})`);
      
      let url = `${SUPABASE_URL}/rest/v1/financial_transactions?select=*&date=gte.${range.start}&date=lte.${range.end}`;
      
      if (property !== 'All Properties') {
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
        
        // Group and aggregate data for this period
        const grouped = rawData.reduce((acc: any, row: any) => {
          const accountName = row.account || 'Unknown Account';
          
          if (!acc[accountName]) {
            acc[accountName] = {
              name: accountName,
              type: row.account_type === 'Income' ? 'Revenue' : 
                    row.account_type === 'Expenses' ? 'Expenses' : 'Other',
              total: 0,
              entries: [],
              account_type: row.account_type
            };
          }
          
          acc[accountName].total += (row.amount || 0);
          acc[accountName].entries.push(row);
          
          return acc;
        }, {});
        
        allData[range.label] = grouped;
      } else {
        console.error(`Failed to fetch data for period ${range.label}:`, response.status);
        allData[range.label] = {};
      }
    }
    
    // FIXED: For Trailing 12 Total mode, aggregate all monthly data into one summary
    if (timePeriod === 'Trailing 12' && viewMode === 'total') {
      console.log('🔍 AGGREGATING TRAILING 12 TOTAL DATA...');
      
      const aggregatedData: any = {};
      let totalRevenue = 0;
      let totalExpenses = 0;
      
      // Go through each month and aggregate the account totals
      dateRanges.forEach((range) => {
        const monthData = allData[range.label] || {};
        
        Object.values(monthData).forEach((account: any) => {
          const accountName = account.name;
          
          if (!aggregatedData[accountName]) {
            aggregatedData[accountName] = {
              name: accountName,
              type: account.type,
              total: 0,
              entries: [],
              account_type: account.account_type
            };
          }
          
          // Sum the totals across all months
          aggregatedData[accountName].total += account.total;
          aggregatedData[accountName].entries.push(...account.entries);
          
          // Track overall totals for logging
          if (account.type === 'Revenue') {
            totalRevenue += account.total;
          } else if (account.type === 'Expenses') {
            totalExpenses += Math.abs(account.total);
          }
        });
      });
      
      // Replace all monthly data with one aggregated summary
      allData = {
        'Trailing 12 Months': aggregatedData
      };
      
      console.log('🔍 TRAILING 12 AGGREGATED TOTALS:', {
        totalRevenue,
        totalExpenses,
        netIncome: totalRevenue - totalExpenses,
        accountCount: Object.keys(aggregatedData).length,
        periodsAggregated: dateRanges.length
      });
      
      // Update the periods array to reflect the single aggregated period
      return {
        success: true,
        data: allData,
        periods: ['Trailing 12 Months'],
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
    
    // Simple grouping by account name and sum amounts - FIXED VERSION
    const grouped = rawData.reduce((acc: any, row: any) => {
      // Use the EXACT account name - no trimming or modifications
      const accountName = row.account || 'Unknown Account';
      
      if (!acc[accountName]) {
        acc[accountName] = {
          name: accountName,
          type: row.account_type === 'Income' ? 'Revenue' : 
                row.account_type === 'Expenses' ? 'Expenses' : 'Other',
          total: 0,
          entries: [],
          account_type: row.account_type
        };
      }
      
      acc[accountName].total += (row.amount || 0);
      acc[accountName].entries.push(row);
      
      return acc;
    }, {});

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
  const [selectedMonth, setSelectedMonth] = useState<MonthString>('May 2025');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('Trailing 12');
  const [viewMode, setViewMode] = useState<ViewMode>('total');
  const [notification, setNotification] = useState<NotificationState>({ show: false, message: '', type: 'info' });
  const [timePeriodDropdownOpen, setTimePeriodDropdownOpen] = useState(false);
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

  // Load data when filters change
  useEffect(() => {
    loadRealFinancialData();
  }, [selectedProperties, selectedMonth, timePeriod, viewMode]);

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
        month: selectedMonth,
        timePeriod,
        viewMode
      });
      
      // ENHANCED: Use time series for ALL modes including Monthly Detail
      const timeSeriesResult = await fetchTimeSeriesData(propertyFilter, selectedMonth, timePeriod, viewMode);
      
      if (timeSeriesResult.success) {
        setTimeSeriesData(timeSeriesResult);
        setRealData(null); // Clear single-month data
        setDataError(null);
      } else {
        setDataError(timeSeriesResult.error || 'Failed to load time series data');
      }
      
      const propertyText = selectedProperties.has('All Properties') 
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

  const handleAccountClick = (accountItem: FinancialDataItem): void => {
    setSelectedAccountDetails(accountItem);
  };

  // ENHANCED: Get current financial data - enhanced for Monthly Detail mode
  const getCurrentFinancialData = () => {
    if (timeSeriesData) {
      // ENHANCED: For all detailed modes including Monthly Detail, aggregate all periods for KPI calculation
      if (viewMode === 'detailed') {
        const allAccounts: Record<string, any> = {};
        
        timeSeriesData.periods.forEach((period: string) => {
          const periodData = timeSeriesData.data[period] || {};
          
          Object.values(periodData).forEach((account: any) => {
            if (!allAccounts[account.name]) {
              allAccounts[account.name] = {
                name: account.name,
                type: account.type,
                total: 0,
                entries: []
              };
            }
            allAccounts[account.name].total += account.total;
            allAccounts[account.name].entries.push(...account.entries);
          });
        });
        
        return Object.values(allAccounts);
      } else {
        // For total modes (including Trailing 12 Total and Monthly Total)
        if (timePeriod === 'Trailing 12' && viewMode === 'total') {
          const trailingData = timeSeriesData.data['Trailing 12 Months'] || {};
          return Object.values(trailingData);
        } else {
          // For Monthly Total, Quarterly Total, Yearly Total
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
    if (timeSeriesData) {
      const headers = timeSeriesData.periods.map((period: string, index: number) => (
        <th key={period} className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
          {period}
        </th>
      ));
      
      // ENHANCED: Add Total column for ALL detailed views including Monthly Detail
      if (viewMode === 'detailed') {
        headers.push(
          <th key="total" className="px-4 py-3 text-right text-xs font-medium text-blue-600 uppercase tracking-wider bg-blue-50 border-l-2 border-blue-200">
            Total
          </th>
        );
      }
      
      return headers;
    }
    return null;
  };

  const renderDataCells = (item: FinancialDataItem) => {
    if (timeSeriesData) {
      const cells = timeSeriesData.periods.map((period: string) => {
        const periodData = timeSeriesData.data[period]?.[item.name];
        const value = periodData?.total || 0;
        
        // Create a period-specific item for clicking
        const periodItem = {
          ...item,
          total: value,
          entries: periodData?.entries || []
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
      
      // ENHANCED: Add Total column for ALL detailed views including Monthly Detail
      if (viewMode === 'detailed') {
        // Calculate total across all periods for this item
        const totalValue = timeSeriesData.periods.reduce((sum: number, period: string) => {
          const periodData = timeSeriesData.data[period]?.[item.name];
          return sum + (periodData?.total || 0);
        }, 0);
        
        // Create aggregated item for clicking
        const totalItem = {
          ...item,
          total: totalValue,
          entries: timeSeriesData.periods.reduce((allEntries: any[], period: string) => {
            const periodData = timeSeriesData.data[period]?.[item.name];
            return allEntries.concat(periodData?.entries || []);
          }, [])
        };
        
        cells.push(
          <td key="total" className={`px-4 py-3 text-right text-sm font-bold bg-blue-50 border-l-2 border-blue-200 ${
            totalValue >= 0 ? 'text-green-700' : 'text-red-700'
          }`}>
            <span 
              className="cursor-pointer hover:bg-blue-100 px-2 py-1 rounded transition-colors border border-transparent hover:border-blue-300"
              onClick={() => handleAccountClick(totalItem)}
            >
              {formatCurrency(totalValue)}
            </span>
          </td>
        );
      }
      
      return cells;
    }
    return null;
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

                {/* ENHANCED: View Mode Toggle - Now available for ALL time periods */}
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
            </div>
          </div>

          {/* Data Status */}
          {timeSeriesData && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-green-800 text-sm">
                <strong>Data Status:</strong> {
                  timePeriod === 'Trailing 12' && viewMode === 'total' ? 
                    `Loaded ${timeSeriesData.summary.totalEntriesProcessed} entries across ${timeSeriesData.summary.monthsAggregated} months • Aggregated into Trailing 12 Total` :
                    timePeriod === 'Monthly' && viewMode === 'detailed' ?
                      `Loaded ${timeSeriesData.summary.totalEntriesProcessed} entries across ${timeSeriesData.summary.periodsGenerated} weeks • Monthly Detail with Weekly Breakdown` :
                    `Loaded ${timeSeriesData.summary.totalEntriesProcessed} entries across ${timeSeriesData.summary.periodsGenerated} periods • Time Series Mode`
                }
                <div className="mt-1 text-xs">
                  <strong>Current Filters:</strong> {getSelectedPropertiesText()} • {selectedMonth} • {timePeriod} {viewMode}
                  {timePeriod === 'Monthly' && viewMode === 'detailed' && (
                    <span className="ml-2 font-medium text-green-700">📅 Weekly Breakdown</span>
                  )}
                </div>
                {timePeriod === 'Trailing 12' && viewMode === 'total' && timeSeriesData && (
                  <div className="mt-1 text-xs">
                    <strong>Trailing 12 Period:</strong> {timeSeriesData.summary.dateRanges[0]?.start} to {timeSeriesData.summary.dateRanges[0]?.end} ({timeSeriesData.summary.monthsAggregated} months aggregated)
                  </div>
                )}
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
                    {timePeriod === 'Trailing 12' && viewMode === 'total' ? 'Past 12 Months' : 
                     timePeriod === 'Monthly' && viewMode === 'detailed' ? 'Monthly Total' : 'Top Line'}
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
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        Profit & Loss Statement (By Property Class)
                      </h3>
                      <div className="mt-2 text-sm text-gray-600">
                        {timePeriod === 'Trailing 12' && viewMode === 'total' 
                          ? 'Showing aggregated totals for the past 12 months'
                          : timePeriod === 'Monthly' && viewMode === 'detailed'
                          ? 'Showing weekly breakdown for the selected month'
                          : `Showing ${timePeriod.toLowerCase()} ${viewMode} view`
                        }
                        {timePeriod === 'Monthly' && viewMode === 'detailed' && (
                          <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                            📅 Weekly Detail
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* P&L Content */}
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
                          {timeSeriesData && timePeriod === 'Trailing 12' && viewMode === 'total' ? (
                            <td className="px-4 py-4 text-right text-lg font-bold text-blue-900">
                              {formatCurrency(kpis.revenue)}
                            </td>
                          ) : timeSeriesData ? (
                            <>
                              {timeSeriesData.periods.map((period: string) => (
                                <td key={period} className="px-4 py-4 text-right text-lg font-bold text-blue-900">
                                  {formatCurrency(
                                    Object.values(timeSeriesData.data[period] || {})
                                      .filter((account: any) => account.type === 'Revenue')
                                      .reduce((sum: number, account: any) => sum + account.total, 0)
                                  )}
                                </td>
                              ))}
                              {viewMode === 'detailed' && (
                                <td className="px-4 py-4 text-right text-lg font-bold text-blue-900 bg-blue-50 border-l-2 border-blue-200">
                                  {formatCurrency(kpis.revenue)}
                                </td>
                              )}
                            </>
                          ) : null}
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
                              {renderDataCells(item)}
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
                          {timeSeriesData && timePeriod === 'Trailing 12' && viewMode === 'total' ? (
                            <td className="px-4 py-4 text-right text-lg font-bold text-blue-800">
                              {formatCurrency(kpis.revenue)}
                            </td>
                          ) : timeSeriesData ? (
                            <>
                              {timeSeriesData.periods.map((period: string) => (
                                <td key={period} className="px-4 py-4 text-right text-lg font-bold text-blue-800">
                                  {formatCurrency(
                                    Object.values(timeSeriesData.data[period] || {})
                                      .filter((account: any) => account.type === 'Revenue')
                                      .reduce((sum: number, account: any) => sum + account.total, 0)
                                  )}
                                </td>
                              ))}
                              {viewMode === 'detailed' && (
                                <td className="px-4 py-4 text-right text-lg font-bold text-blue-800 bg-blue-50 border-l-2 border-blue-200">
                                  {formatCurrency(kpis.revenue)}
                                </td>
                              )}
                            </>
                          ) : null}
                          <td className="px-4 py-4 text-right text-sm font-bold text-blue-800">
                            100.0%
                          </td>
                        </tr>

                        {/* EXPENSES SECTION */}
                        <tr className="bg-red-50 border-t-4 border-red-200 mt-4">
                          <td className="px-6 py-4 text-left text-lg font-bold text-red-900">
                            💸 EXPENSES
                          </td>
                          {timeSeriesData && timePeriod === 'Trailing 12' && viewMode === 'total' ? (
                            <td className="px-4 py-4 text-right text-lg font-bold text-red-600">
                              ({formatCurrency(Math.abs(kpis.operatingExpenses))})
                            </td>
                          ) : timeSeriesData ? (
                            <>
                              {timeSeriesData.periods.map((period: string) => (
                                <td key={period} className="px-4 py-4 text-right text-lg font-bold text-red-600">
                                  ({formatCurrency(Math.abs(
                                    Object.values(timeSeriesData.data[period] || {})
                                      .filter((account: any) => account.type === 'Expenses')
                                      .reduce((sum: number, account: any) => sum + account.total, 0)
                                  ))})
                                </td>
                              ))}
                              {viewMode === 'detailed' && (
                                <td className="px-4 py-4 text-right text-lg font-bold text-red-600 bg-blue-50 border-l-2 border-blue-200">
                                  ({formatCurrency(Math.abs(kpis.operatingExpenses))})
                                </td>
                              )}
                            </>
                          ) : null}
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
                              {renderDataCells(item)}
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
                          {timeSeriesData && timePeriod === 'Trailing 12' && viewMode === 'total' ? (
                            <td className="px-4 py-4 text-right text-lg font-bold text-red-800">
                              ({formatCurrency(Math.abs(kpis.operatingExpenses))})
                            </td>
                          ) : timeSeriesData ? (
                            <>
                              {timeSeriesData.periods.map((period: string) => (
                                <td key={period} className="px-4 py-4 text-right text-lg font-bold text-red-800">
                                  ({formatCurrency(Math.abs(
                                    Object.values(timeSeriesData.data[period] || {})
                                      .filter((account: any) => account.type === 'Expenses')
                                      .reduce((sum: number, account: any) => sum + account.total, 0)
                                  ))})
                                </td>
                              ))}
                              {viewMode === 'detailed' && (
                                <td className="px-4 py-4 text-right text-lg font-bold text-red-800 bg-blue-50 border-l-2 border-blue-200">
                                  ({formatCurrency(Math.abs(kpis.operatingExpenses))})
                                </td>
                              )}
                            </>
                          ) : null}
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
                          {timeSeriesData && timePeriod === 'Trailing 12' && viewMode === 'total' ? (
                            <td className={`px-4 py-5 text-right text-xl font-bold ${
                              kpis.netIncome >= 0 ? 'text-green-700' : 'text-red-700'
                            }`}>
                              {formatCurrency(kpis.netIncome)}
                            </td>
                          ) : timeSeriesData ? (
                            <>
                              {timeSeriesData.periods.map((period: string) => {
                                const periodRevenue = Object.values(timeSeriesData.data[period] || {})
                                  .filter((account: any) => account.type === 'Revenue')
                                  .reduce((sum: number, account: any) => sum + account.total, 0);
                                const periodExpenses = Object.values(timeSeriesData.data[period] || {})
                                  .filter((account: any) => account.type === 'Expenses')
                                  .reduce((sum: number, account: any) => sum + account.total, 0);
                                const periodNetIncome = periodRevenue - periodExpenses;
                                
                                return (
                                  <td key={period} className={`px-4 py-5 text-right text-xl font-bold ${
                                    periodNetIncome >= 0 ? 'text-green-700' : 'text-red-700'
                                  }`}>
                                    {formatCurrency(periodNetIncome)}
                                  </td>
                                );
                              })}
                              {viewMode === 'detailed' && (
                                <td className={`px-4 py-5 text-right text-xl font-bold bg-blue-50 border-l-2 border-blue-200 ${
                                  kpis.netIncome >= 0 ? 'text-green-700' : 'text-red-700'
                                }`}>
                                  {formatCurrency(kpis.netIncome)}
                                </td>
                              )}
                            </>
                          ) : null}
                          <td className="px-4 py-5 text-right text-lg font-bold" style={{ color: BRAND_COLORS.primary }}>
                            {kpis.netMargin.toFixed(1)}%
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                </div>
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
                        </>
                      )}
                      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                        <p className="text-sm text-blue-700">
                          💡 <strong>Tip:</strong> Click on any dollar amount in the P&L table to view detailed transaction breakdowns here.
                        </p>
                        {timePeriod === 'Monthly' && viewMode === 'detailed' && (
                          <p className="text-sm text-blue-700 mt-2">
                            📅 <strong>Monthly Detail:</strong> Use the weekly columns to analyze financial performance by week within {selectedMonth}.
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
  );
}
