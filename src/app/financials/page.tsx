"use client";

import React, { useState } from 'react';
import { ArrowUp, ArrowDown, Minus, Download, RefreshCw, TrendingUp, DollarSign, PieChart, BarChart3, ChevronDown, ChevronRight } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Cell, Pie } from 'recharts';

// IAM CFO Brand Colors
const BRAND_COLORS = {
  primary: '#56B6E9',      // Your brand blue
  secondary: '#3A9BD1',    // Darker shade of your blue
  tertiary: '#7CC4ED',     // Lighter shade of your blue
  accent: '#2E86C1',       // Deep blue accent
  success: '#27AE60',      // Professional green
  warning: '#F39C12',      // Professional orange
  danger: '#E74C3C',       // Professional red
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
}

interface FinancialData {
  [timeView: string]: {
    [month: string]: FinancialDataItem[];
  };
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

// Property-specific financial data
interface PropertyFinancialData {
  [property: string]: FinancialData;
}

// IAM CFO Logo Component
const IAMCFOLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <div className={`${className} flex items-center justify-center relative`}>
    <svg viewBox="0 0 120 120" className="w-full h-full">
      {/* Outer circle - light gray */}
      <circle cx="60" cy="60" r="55" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="2"/>
      
      {/* Inner circle - your brand blue */}
      <circle cx="60" cy="60" r="42" fill={BRAND_COLORS.primary}/>
      
      {/* Graph/chart elements */}
      <g fill="white">
        {/* Bar chart bars */}
        <rect x="35" y="70" width="6" height="15" rx="1"/>
        <rect x="44" y="65" width="6" height="20" rx="1"/>
        <rect x="53" y="55" width="6" height="30" rx="1"/>
        <rect x="62" y="50" width="6" height="35" rx="1"/>
        <rect x="71" y="60" width="6" height="25" rx="1"/>
        <rect x="80" y="45" width="6" height="40" rx="1"/>
        
        {/* Trend line */}
        <path d="M35 72 L44 67 L53 57 L62 52 L71 62 L80 47" 
              stroke="#FFFFFF" strokeWidth="2.5" fill="none"/>
        
        {/* Data points */}
        <circle cx="35" cy="72" r="2.5" fill="#FFFFFF"/>
        <circle cx="44" cy="67" r="2.5" fill="#FFFFFF"/>
        <circle cx="53" cy="57" r="2.5" fill="#FFFFFF"/>
        <circle cx="62" cy="52" r="2.5" fill="#FFFFFF"/>
        <circle cx="71" cy="62" r="2.5" fill="#FFFFFF"/>
        <circle cx="80" cy="47" r="2.5" fill="#FFFFFF"/>
      </g>
      
      {/* Text "CFO" in the center */}
      <text x="60" y="95" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold" fontFamily="Arial, sans-serif">CFO</text>
    </svg>
  </div>
);

// Sample data with realistic numbers by property
const propertyFinancialData: PropertyFinancialData = {
  'Downtown Loft': {
    Monthly: {
      'June 2025': [
        { name: 'Revenue', total: 280000, months: { 'June 2025': 280000 } },
        { name: 'Cost of Goods Sold', total: 168000, months: { 'June 2025': 168000 } },
        { name: 'Gross Profit', total: 112000, months: { 'June 2025': 112000 } },
        { name: 'Operating Expenses', total: 67200, months: { 'June 2025': 67200 } },
        { name: 'Operating Income', total: 44800, months: { 'June 2025': 44800 } },
        { name: 'Interest Expense', total: 5600, months: { 'June 2025': 5600 } },
        { name: 'Taxes', total: 11760, months: { 'June 2025': 11760 } },
        { name: 'Net Income', total: 27440, months: { 'June 2025': 27440 } },
      ],
      'May 2025': [
        { name: 'Revenue', total: 258000, months: { 'May 2025': 258000 } },
        { name: 'Cost of Goods Sold', total: 154800, months: { 'May 2025': 154800 } },
        { name: 'Gross Profit', total: 103200, months: { 'May 2025': 103200 } },
        { name: 'Operating Expenses', total: 62800, months: { 'May 2025': 62800 } },
        { name: 'Operating Income', total: 40400, months: { 'May 2025': 40400 } },
        { name: 'Interest Expense', total: 5600, months: { 'May 2025': 5600 } },
        { name: 'Taxes', total: 10440, months: { 'May 2025': 10440 } },
        { name: 'Net Income', total: 24360, months: { 'May 2025': 24360 } },
      ],
    },
    YTD: {
      'June 2025': [
        { name: 'Revenue', total: 1548000, months: { 
          'January 2025': 180000,
          'February 2025': 210000,
          'March 2025': 230000,
          'April 2025': 250000,
          'May 2025': 258000,
          'June 2025': 280000,
        } },
        { name: 'Cost of Goods Sold', total: 928800, months: { 
          'January 2025': 108000,
          'February 2025': 126000,
          'March 2025': 138000,
          'April 2025': 150000,
          'May 2025': 154800,
          'June 2025': 168000,
        } },
      ],
    }
  },
  'Seaside Villa': {
    Monthly: {
      'June 2025': [
        { name: 'Revenue', total: 350000, months: { 'June 2025': 350000 } },
        { name: 'Cost of Goods Sold', total: 210000, months: { 'June 2025': 210000 } },
        { name: 'Gross Profit', total: 140000, months: { 'June 2025': 140000 } },
        { name: 'Operating Expenses', total: 84000, months: { 'June 2025': 84000 } },
        { name: 'Operating Income', total: 56000, months: { 'June 2025': 56000 } },
        { name: 'Interest Expense', total: 7000, months: { 'June 2025': 7000 } },
        { name: 'Taxes', total: 14700, months: { 'June 2025': 14700 } },
        { name: 'Net Income', total: 34300, months: { 'June 2025': 34300 } },
      ],
      'May 2025': [
        { name: 'Revenue', total: 322500, months: { 'May 2025': 322500 } },
        { name: 'Cost of Goods Sold', total: 193500, months: { 'May 2025': 193500 } },
        { name: 'Gross Profit', total: 129000, months: { 'May 2025': 129000 } },
        { name: 'Operating Expenses', total: 78500, months: { 'May 2025': 78500 } },
        { name: 'Operating Income', total: 50500, months: { 'May 2025': 50500 } },
        { name: 'Interest Expense', total: 7000, months: { 'May 2025': 7000 } },
        { name: 'Taxes', total: 13050, months: { 'May 2025': 13050 } },
        { name: 'Net Income', total: 30450, months: { 'May 2025': 30450 } },
      ],
    },
    YTD: {
      'June 2025': [
        { name: 'Revenue', total: 1935000, months: { 
          'January 2025': 225000,
          'February 2025': 262500,
          'March 2025': 287500,
          'April 2025': 312500,
          'May 2025': 322500,
          'June 2025': 350000,
        } },
        { name: 'Cost of Goods Sold', total: 1161000, months: { 
          'January 2025': 135000,
          'February 2025': 157500,
          'March 2025': 172500,
          'April 2025': 187500,
          'May 2025': 193500,
          'June 2025': 210000,
        } },
      ],
    }
  },
  'Mountain Cabin': {
    Monthly: {
      'June 2025': [
        { name: 'Revenue', total: 185000, months: { 'June 2025': 185000 } },
        { name: 'Cost of Goods Sold', total: 111000, months: { 'June 2025': 111000 } },
        { name: 'Gross Profit', total: 74000, months: { 'June 2025': 74000 } },
        { name: 'Operating Expenses', total: 44400, months: { 'June 2025': 44400 } },
        { name: 'Operating Income', total: 29600, months: { 'June 2025': 29600 } },
        { name: 'Interest Expense', total: 3700, months: { 'June 2025': 3700 } },
        { name: 'Taxes', total: 7770, months: { 'June 2025': 7770 } },
        { name: 'Net Income', total: 18130, months: { 'June 2025': 18130 } },
      ],
      'May 2025': [
        { name: 'Revenue', total: 170250, months: { 'May 2025': 170250 } },
        { name: 'Cost of Goods Sold', total: 102150, months: { 'May 2025': 102150 } },
        { name: 'Gross Profit', total: 68100, months: { 'May 2025': 68100 } },
        { name: 'Operating Expenses', total: 41200, months: { 'May 2025': 41200 } },
        { name: 'Operating Income', total: 26900, months: { 'May 2025': 26900 } },
        { name: 'Interest Expense', total: 3700, months: { 'May 2025': 3700 } },
        { name: 'Taxes', total: 6960, months: { 'May 2025': 6960 } },
        { name: 'Net Income', total: 16240, months: { 'May 2025': 16240 } },
      ],
    },
    YTD: {
      'June 2025': [
        { name: 'Revenue', total: 1021500, months: { 
          'January 2025': 119000,
          'February 2025': 138750,
          'March 2025': 152250,
          'April 2025': 165500,
          'May 2025': 170250,
          'June 2025': 185000,
        } },
        { name: 'Cost of Goods Sold', total: 612900, months: { 
          'January 2025': 71400,
          'February 2025': 83250,
          'March 2025': 91350,
          'April 2025': 99300,
          'May 2025': 102150,
          'June 2025': 111000,
        } },
      ],
    }
  },
  'City Apartment': {
    Monthly: {
      'June 2025': [
        { name: 'Revenue', total: 225000, months: { 'June 2025': 225000 } },
        { name: 'Cost of Goods Sold', total: 135000, months: { 'June 2025': 135000 } },
        { name: 'Gross Profit', total: 90000, months: { 'June 2025': 90000 } },
        { name: 'Operating Expenses', total: 54000, months: { 'June 2025': 54000 } },
        { name: 'Operating Income', total: 36000, months: { 'June 2025': 36000 } },
        { name: 'Interest Expense', total: 4500, months: { 'June 2025': 4500 } },
        { name: 'Taxes', total: 9450, months: { 'June 2025': 9450 } },
        { name: 'Net Income', total: 22050, months: { 'June 2025': 22050 } },
      ],
      'May 2025': [
        { name: 'Revenue', total: 207000, months: { 'May 2025': 207000 } },
        { name: 'Cost of Goods Sold', total: 124200, months: { 'May 2025': 124200 } },
        { name: 'Gross Profit', total: 82800, months: { 'May 2025': 82800 } },
        { name: 'Operating Expenses', total: 50400, months: { 'May 2025': 50400 } },
        { name: 'Operating Income', total: 32400, months: { 'May 2025': 32400 } },
        { name: 'Interest Expense', total: 4500, months: { 'May 2025': 4500 } },
        { name: 'Taxes', total: 8370, months: { 'May 2025': 8370 } },
        { name: 'Net Income', total: 19530, months: { 'May 2025': 19530 } },
      ],
    },
    YTD: {
      'June 2025': [
        { name: 'Revenue', total: 1242000, months: { 
          'January 2025': 144500,
          'February 2025': 168500,
          'March 2025': 184750,
          'April 2025': 201000,
          'May 2025': 207000,
          'June 2025': 225000,
        } },
        { name: 'Cost of Goods Sold', total: 745200, months: { 
          'January 2025': 86700,
          'February 2025': 101100,
          'March 2025': 110850,
          'April 2025': 120600,
          'May 2025': 124200,
          'June 2025': 135000,
        } },
      ],
    }
  },
  'Suburban House': {
    Monthly: {
      'June 2025': [
        { name: 'Revenue', total: 210000, months: { 'June 2025': 210000 } },
        { name: 'Cost of Goods Sold', total: 126000, months: { 'June 2025': 126000 } },
        { name: 'Gross Profit', total: 84000, months: { 'June 2025': 84000 } },
        { name: 'Operating Expenses', total: 50400, months: { 'June 2025': 50400 } },
        { name: 'Operating Income', total: 33600, months: { 'June 2025': 33600 } },
        { name: 'Interest Expense', total: 4200, months: { 'June 2025': 4200 } },
        { name: 'Taxes', total: 8820, months: { 'June 2025': 8820 } },
        { name: 'Net Income', total: 20580, months: { 'June 2025': 20580 } },
      ],
      'May 2025': [
        { name: 'Revenue', total: 193500, months: { 'May 2025': 193500 } },
        { name: 'Cost of Goods Sold', total: 116100, months: { 'May 2025': 116100 } },
        { name: 'Gross Profit', total: 77400, months: { 'May 2025': 77400 } },
        { name: 'Operating Expenses', total: 47100, months: { 'May 2025': 47100 } },
        { name: 'Operating Income', total: 30300, months: { 'May 2025': 30300 } },
        { name: 'Interest Expense', total: 4200, months: { 'May 2025': 4200 } },
        { name: 'Taxes', total: 7830, months: { 'May 2025': 7830 } },
        { name: 'Net Income', total: 18270, months: { 'May 2025': 18270 } },
      ],
    },
    YTD: {
      'June 2025': [
        { name: 'Revenue', total: 1159500, months: { 
          'January 2025': 135000,
          'February 2025': 157500,
          'March 2025': 172750,
          'April 2025': 187750,
          'May 2025': 193500,
          'June 2025': 210000,
        } },
        { name: 'Cost of Goods Sold', total: 695700, months: { 
          'January 2025': 81000,
          'February 2025': 94500,
          'March 2025': 103650,
          'April 2025': 112650,
          'May 2025': 116100,
          'June 2025': 126000,
        } },
      ],
    }
  },
};

const allMonths = [
  'January', 'February', 'March', 'April', 'May', 'June', 
  'July', 'August', 'September', 'October', 'November', 'December'
] as const;

const monthsList: MonthString[] = [
  'June 2025', 'May 2025'
];

const COLORS = [BRAND_COLORS.primary, BRAND_COLORS.success, BRAND_COLORS.warning, BRAND_COLORS.danger, BRAND_COLORS.secondary, BRAND_COLORS.tertiary];

// Property-specific Cash Flow Data
interface PropertyCashFlowData {
  [property: string]: {
    inFlow: FinancialDataItem[];
    outFlow: FinancialDataItem[];
    totalInFlow: number;
    totalOutFlow: number;
    totalCashFlow: number;
    beginningCash: number;
    endingCash: number;
  };
}

const propertyCashFlowData: PropertyCashFlowData = {
  'Downtown Loft': {
    inFlow: [
      { name: 'Revenue - Property Income', total: 189000, months: { 'June 2025': 189000 } },
      { name: 'Revenue - Service Income', total: 28000, months: { 'June 2025': 28000 } },
      { name: 'Other Income', total: 7850, months: { 'June 2025': 7850 } },
    ],
    outFlow: [
      { name: 'Cost of Goods Sold', total: -108500, months: { 'June 2025': -108500 } },
      { name: 'Payroll & Benefits', total: -41400, months: { 'June 2025': -41400 } },
      { name: 'Marketing & Advertising', total: -16800, months: { 'June 2025': -16800 } },
    ],
    totalInFlow: 224850,
    totalOutFlow: -166700,
    totalCashFlow: 58150,
    beginningCash: 54800,
    endingCash: 112950
  },
  'Seaside Villa': {
    inFlow: [
      { name: 'Revenue - Property Income', total: 236250, months: { 'June 2025': 236250 } },
      { name: 'Revenue - Service Income', total: 35000, months: { 'June 2025': 35000 } },
      { name: 'Other Income', total: 9800, months: { 'June 2025': 9800 } },
    ],
    outFlow: [
      { name: 'Cost of Goods Sold', total: -135625, months: { 'June 2025': -135625 } },
      { name: 'Payroll & Benefits', total: -51750, months: { 'June 2025': -51750 } },
      { name: 'Marketing & Advertising', total: -21000, months: { 'June 2025': -21000 } },
    ],
    totalInFlow: 281050,
    totalOutFlow: -208375,
    totalCashFlow: 72675,
    beginningCash: 68500,
    endingCash: 141175
  },
  'Mountain Cabin': {
    inFlow: [
      { name: 'Revenue - Property Income', total: 124775, months: { 'June 2025': 124775 } },
      { name: 'Revenue - Service Income', total: 18500, months: { 'June 2025': 18500 } },
      { name: 'Other Income', total: 5185, months: { 'June 2025': 5185 } },
    ],
    outFlow: [
      { name: 'Cost of Goods Sold', total: -71625, months: { 'June 2025': -71625 } },
      { name: 'Payroll & Benefits', total: -27350, months: { 'June 2025': -27350 } },
      { name: 'Marketing & Advertising', total: -11100, months: { 'June 2025': -11100 } },
    ],
    totalInFlow: 148460,
    totalOutFlow: -110075,
    totalCashFlow: 38385,
    beginningCash: 36200,
    endingCash: 74585
  },
  'City Apartment': {
    inFlow: [
      { name: 'Revenue - Property Income', total: 151875, months: { 'June 2025': 151875 } },
      { name: 'Revenue - Service Income', total: 22500, months: { 'June 2025': 22500 } },
      { name: 'Other Income', total: 6300, months: { 'June 2025': 6300 } },
    ],
    outFlow: [
      { name: 'Cost of Goods Sold', total: -87187, months: { 'June 2025': -87187 } },
      { name: 'Payroll & Benefits', total: -33300, months: { 'June 2025': -33300 } },
      { name: 'Marketing & Advertising', total: -13500, months: { 'June 2025': -13500 } },
    ],
    totalInFlow: 180675,
    totalOutFlow: -133987,
    totalCashFlow: 46688,
    beginningCash: 44100,
    endingCash: 90788
  },
  'Suburban House': {
    inFlow: [
      { name: 'Revenue - Property Income', total: 141750, months: { 'June 2025': 141750 } },
      { name: 'Revenue - Service Income', total: 21000, months: { 'June 2025': 21000 } },
      { name: 'Other Income', total: 5880, months: { 'June 2025': 5880 } },
    ],
    outFlow: [
      { name: 'Cost of Goods Sold', total: -81375, months: { 'June 2025': -81375 } },
      { name: 'Payroll & Benefits', total: -31050, months: { 'June 2025': -31050 } },
      { name: 'Marketing & Advertising', total: -12600, months: { 'June 2025': -12600 } },
    ],
    totalInFlow: 168630,
    totalOutFlow: -125025,
    totalCashFlow: 43605,
    beginningCash: 41150,
    endingCash: 84755
  },
};

// Cash Flow Details - Sub-accounts for each category
const cashFlowDetails: Record<string, FinancialDataItem[]> = {
  'Revenue - Property Income': [
    { name: 'Rental Income - Residential', total: 520000, months: { 'June 2025': 520000 } },
    { name: 'Rental Income - Commercial', total: 285000, months: { 'June 2025': 285000 } },
    { name: 'Late Fees & Penalties', total: 25000, months: { 'June 2025': 25000 } },
    { name: 'Pet Fees', total: 15000, months: { 'June 2025': 15000 } },
  ],
  'Revenue - Service Income': [
    { name: 'Property Management Fees', total: 85000, months: { 'June 2025': 85000 } },
    { name: 'Maintenance Services', total: 25000, months: { 'June 2025': 25000 } },
    { name: 'Consulting Services', total: 15000, months: { 'June 2025': 15000 } },
  ],
  'Cost of Goods Sold': [
    { name: 'Property Maintenance', total: -285000, months: { 'June 2025': -285000 } },
    { name: 'Cleaning Services', total: -125000, months: { 'June 2025': -125000 } },
    { name: 'Supplies & Materials', total: -45000, months: { 'June 2025': -45000 } },
    { name: 'Contractor Services', total: -30000, months: { 'June 2025': -30000 } },
  ],
  'Payroll & Benefits': [
    { name: 'Salaries & Wages', total: -135000, months: { 'June 2025': -135000 } },
    { name: 'Health Insurance', total: -25000, months: { 'June 2025': -25000 } },
    { name: 'Payroll Taxes', total: -15000, months: { 'June 2025': -15000 } },
    { name: 'Workers Compensation', total: -10000, months: { 'June 2025': -10000 } },
  ],
  'Marketing & Advertising': [
    { name: 'Digital Marketing', total: -45000, months: { 'June 2025': -45000 } },
    { name: 'Print Advertising', total: -18000, months: { 'June 2025': -18000 } },
    { name: 'Website & SEO', total: -12000, months: { 'June 2025': -12000 } },
  ],
};

// Expandable account data for P&L
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

// Sub-detail breakdowns for the detail items (both P&L and Cash Flow)
const subAccountDetails: Record<string, Array<{name: string, amount: number}>> = {
  // P&L Sub-details
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
  // Cash Flow Sub-details
  'Rental Income - Residential': [
    { name: 'Single Family Homes', amount: 320000 },
    { name: 'Townhouses', amount: 120000 },
    { name: 'Condominiums', amount: 80000 },
  ],
  'Rental Income - Commercial': [
    { name: 'Office Buildings', amount: 185000 },
    { name: 'Retail Spaces', amount: 65000 },
    { name: 'Warehouse Facilities', amount: 35000 },
  ],
  'Property Maintenance': [
    { name: 'HVAC Repairs', amount: 125000 },
    { name: 'Plumbing Services', amount: 85000 },
    { name: 'Electrical Work', amount: 45000 },
    { name: 'Landscaping', amount: 30000 },
  ],
  'Cleaning Services': [
    { name: 'Regular Cleaning', amount: 75000 },
    { name: 'Deep Cleaning', amount: 25000 },
    { name: 'Carpet Cleaning', amount: 15000 },
    { name: 'Window Cleaning', amount: 10000 },
  ],
  'Salaries & Wages': [
    { name: 'Property Managers', amount: 65000 },
    { name: 'Maintenance Staff', amount: 45000 },
    { name: 'Administrative Staff', amount: 25000 },
  ],
  'Digital Marketing': [
    { name: 'Google Ads', amount: 20000 },
    { name: 'Facebook Advertising', amount: 15000 },
    { name: 'SEO Services', amount: 10000 },
  ],
};

export default function FinancialsPage() {
  const [activeTab, setActiveTab] = useState<FinancialTab>('p&l');
  const [selectedMonth, setSelectedMonth] = useState<MonthString>('June 2025');
  const [viewMode, setViewMode] = useState<ViewMode>('detailed');
  const [timeView, setTimeView] = useState<TimeView>('Monthly');
  const [notification, setNotification] = useState<NotificationState>({ show: false, message: '', type: 'info' });
  const [timeViewDropdownOpen, setTimeViewDropdownOpen] = useState(false);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [accountTooltip, setAccountTooltip] = useState<TooltipState>({ show: false, content: '', x: 0, y: 0 });
  
  // Property filtering state
  const [propertyDropdownOpen, setPropertyDropdownOpen] = useState(false);
  const [selectedProperties, setSelectedProperties] = useState<Set<string>>(new Set(['All Properties']));

  // Available properties
  const properties = ['All Properties', 'Downtown Loft', 'Seaside Villa', 'Mountain Cabin', 'City Apartment', 'Suburban House'];

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

  const getSelectedPropertiesText = () => {
    if (selectedProperties.has('All Properties') || selectedProperties.size === 0) {
      return 'All Properties';
    }
    if (selectedProperties.size === 1) {
      return Array.from(selectedProperties)[0];
    }
    return `${selectedProperties.size} Properties Selected`;
  };

  // Helper function to get filtered financial data based on selected properties
  const getFilteredFinancialData = () => {
    if (selectedProperties.has('All Properties') || selectedProperties.size === 0) {
      // Aggregate all properties
      const allProps = Object.keys(propertyFinancialData);
      return aggregatePropertyData(allProps);
    } else {
      // Aggregate only selected properties
      return aggregatePropertyData(Array.from(selectedProperties));
    }
  };

  // Helper function to get filtered cash flow data based on selected properties
  const getFilteredCashFlowData = () => {
    if (selectedProperties.has('All Properties') || selectedProperties.size === 0) {
      // Aggregate all properties
      const allProps = Object.keys(propertyCashFlowData);
      return aggregateCashFlowData(allProps);
    } else {
      // Aggregate only selected properties
      return aggregateCashFlowData(Array.from(selectedProperties));
    }
  };

  // Function to aggregate financial data from multiple properties
  const aggregatePropertyData = (propertyNames: string[]): FinancialData => {
    const result: FinancialData = { Monthly: {}, YTD: {} };
    
    // Aggregate Monthly data
    monthsList.forEach(month => {
      const aggregatedItems: FinancialDataItem[] = [];
      const lineItems = ['Revenue', 'Cost of Goods Sold', 'Gross Profit', 'Operating Expenses', 'Operating Income', 'Interest Expense', 'Taxes', 'Net Income'];
      
      lineItems.forEach(lineItem => {
        let totalAmount = 0;
        const monthData: Partial<Record<MonthString, number>> = {};
        
        propertyNames.forEach(propName => {
          const propData = propertyFinancialData[propName]?.Monthly?.[month];
          const item = propData?.find(item => item.name === lineItem);
          if (item && item.total !== undefined) {
            totalAmount += item.total;
            Object.entries(item.months).forEach(([monthKey, value]) => {
              if (value !== undefined) {
                monthData[monthKey as MonthString] = (monthData[monthKey as MonthString] || 0) + value;
              }
            });
          }
        });
        
        aggregatedItems.push({
          name: lineItem,
          total: totalAmount,
          months: monthData
        });
      });
      
      result.Monthly[month] = aggregatedItems;
    });

    // Aggregate YTD data
    if (timeView === 'YTD') {
      const ytdMonths = getCurrentYearYtdMonths();
      result.YTD[selectedMonth] = [];
      
      const lineItems = ['Revenue', 'Cost of Goods Sold', 'Gross Profit', 'Operating Expenses', 'Operating Income', 'Interest Expense', 'Taxes', 'Net Income'];
      
      lineItems.forEach(lineItem => {
        let totalAmount = 0;
        const monthData: Partial<Record<MonthString, number>> = {};
        
        propertyNames.forEach(propName => {
          const propYtdData = propertyFinancialData[propName]?.YTD?.[selectedMonth];
          const item = propYtdData?.find(item => item.name === lineItem);
          if (item && item.total !== undefined) {
            totalAmount += item.total;
            Object.entries(item.months).forEach(([monthKey, value]) => {
              if (value !== undefined) {
                monthData[monthKey as MonthString] = (monthData[monthKey as MonthString] || 0) + value;
              }
            });
          }
        });
        
        result.YTD[selectedMonth].push({
          name: lineItem,
          total: totalAmount,
          months: monthData
        });
      });
    }
    
    return result;
  };

  // Function to aggregate cash flow data from multiple properties
  const aggregateCashFlowData = (propertyNames: string[]) => {
    let totalInFlow = 0;
    let totalOutFlow = 0;
    let totalCashFlow = 0;
    let beginningCash = 0;
    let endingCash = 0;
    
    const aggregatedInFlow: FinancialDataItem[] = [];
    const aggregatedOutFlow: FinancialDataItem[] = [];
    
    // Aggregate inFlow
    const inFlowItems = ['Revenue - Property Income', 'Revenue - Service Income', 'Other Income'];
    inFlowItems.forEach(itemName => {
      let totalAmount = 0;
      const monthData: Partial<Record<MonthString, number>> = {};
      
      propertyNames.forEach(propName => {
        const propCashFlow = propertyCashFlowData[propName];
        const item = propCashFlow?.inFlow.find(item => item.name === itemName);
        if (item && item.total !== undefined) {
          totalAmount += item.total;
          Object.entries(item.months).forEach(([monthKey, value]) => {
            if (value !== undefined) {
              monthData[monthKey as MonthString] = (monthData[monthKey as MonthString] || 0) + value;
            }
          });
        }
      });
      
      aggregatedInFlow.push({
        name: itemName,
        total: totalAmount,
        months: monthData
      });
    });
    
    // Aggregate outFlow
    const outFlowItems = ['Cost of Goods Sold', 'Payroll & Benefits', 'Marketing & Advertising'];
    outFlowItems.forEach(itemName => {
      let totalAmount = 0;
      const monthData: Partial<Record<MonthString, number>> = {};
      
      propertyNames.forEach(propName => {
        const propCashFlow = propertyCashFlowData[propName];
        const item = propCashFlow?.outFlow.find(item => item.name === itemName);
        if (item && item.total !== undefined) {
          totalAmount += item.total;
          Object.entries(item.months).forEach(([monthKey, value]) => {
            if (value !== undefined) {
              monthData[monthKey as MonthString] = (monthData[monthKey as MonthString] || 0) + value;
            }
          });
        }
      });
      
      aggregatedOutFlow.push({
        name: itemName,
        total: totalAmount,
        months: monthData
      });
    });
    
    // Calculate totals
    propertyNames.forEach(propName => {
      const propCashFlow = propertyCashFlowData[propName];
      if (propCashFlow) {
        totalInFlow += propCashFlow.totalInFlow;
        totalOutFlow += propCashFlow.totalOutFlow;
        totalCashFlow += propCashFlow.totalCashFlow;
        beginningCash += propCashFlow.beginningCash;
        endingCash += propCashFlow.endingCash;
      }
    });
    
    return {
      inFlow: aggregatedInFlow,
      outFlow: aggregatedOutFlow,
      totalInFlow,
      totalOutFlow,
      totalCashFlow,
      beginningCash,
      endingCash
    };
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
    return accountDetails.hasOwnProperty(accountName);
  };

  const isCashFlowExpandableAccount = (accountName: string): boolean => {
    return cashFlowDetails.hasOwnProperty(accountName);
  };

  const handleAccountMouseEnter = (event: React.MouseEvent<HTMLElement>, subAccountName: string, subAccountTotal: number): void => {
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

  const getCurrentYearYtdMonths = (): MonthString[] => {
    const [selectedMonthName, selectedYear] = selectedMonth.split(' ') as [typeof allMonths[number], string];
    const monthIndex = allMonths.indexOf(selectedMonthName);
    return allMonths
      .slice(0, monthIndex + 1)
      .map(month => `${month} ${selectedYear}` as MonthString);
  };

  const getDisplayData = () => {
    const filteredData = getFilteredFinancialData();
    
    switch (timeView) {
      case 'Monthly':
        return {
          months: [selectedMonth],
          isComparison: false,
          currentData: filteredData.Monthly?.[selectedMonth] || []
        };
      
      case 'YTD':
        return {
          months: getCurrentYearYtdMonths(),
          isComparison: false,
          currentData: filteredData.YTD?.[selectedMonth] || []
        };
      
      default:
        return {
          months: [selectedMonth],
          isComparison: false,
          currentData: filteredData.Monthly?.[selectedMonth] || []
        };
    }
  };

  const { months: displayMonths, currentData } = getDisplayData();
  const filteredCashFlowData = getFilteredCashFlowData();

  const renderColumnHeaders = () => {
    if (timeView === 'YTD') {
      if (viewMode === 'total') {
        const currentMonth = displayMonths[displayMonths.length - 1].split(' ')[0];
        return (
          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
            YTD {displayMonths[0].split(' ')[1]} (Jan-{currentMonth})
          </th>
        );
      } else {
        return displayMonths.map(month => (
          <th key={month} className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
            {month.split(' ')[0]}
          </th>
        ));
      }
    }

    return (
      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
        {displayMonths[0]}
      </th>
    );
  };

  const renderCashFlowDataCells = (item: FinancialDataItem) => {
    const value = item.months[displayMonths[0]] || 0;
    return (
      <td className={`px-4 py-3 text-right text-sm font-medium ${
        value >= 0 ? 'text-green-600' : 'text-red-600'
      }`}>
        {value >= 0 ? formatCurrency(value) : `(${formatCurrency(Math.abs(value))})`}
      </td>
    );
  };

  const renderDataCells = (item: FinancialDataItem) => {
    if (timeView === 'YTD') {
      if (viewMode === 'total') {
        const ytdSum = displayMonths.reduce((sum, month) => {
          const monthValue = item.months[month];
          return sum + (monthValue !== undefined ? monthValue : 0);
        }, 0);
        return (
          <td className="px-4 py-3 text-right text-sm font-medium">
            {formatCurrency(ytdSum)}
          </td>
        );
      } else {
        return displayMonths.map(month => (
          <td key={month} className="px-4 py-3 text-right text-sm font-medium">
            {formatCurrency(item.months[month] || 0)}
          </td>
        ));
      }
    }

    const value = item.months[displayMonths[0]] || 0;
    return (
      <td className="px-4 py-3 text-right text-sm font-medium">
        {formatCurrency(value)}
      </td>
    );
  };

  // Calculate KPIs from current data
  const calculateKPIs = () => {
    const revenue = currentData.find(item => item.name === 'Revenue')?.total || 0;
    const grossProfit = currentData.find(item => item.name === 'Gross Profit')?.total || 0;
    const operatingIncome = currentData.find(item => item.name === 'Operating Income')?.total || 0;
    const netIncome = currentData.find(item => item.name === 'Net Income')?.total || 0;
    
    return {
      revenue,
      grossMargin: revenue ? (grossProfit / revenue) * 100 : 0,
      operatingMargin: revenue ? (operatingIncome / revenue) * 100 : 0,
      netMargin: revenue ? (netIncome / revenue) * 100 : 0
    };
  };

  const generateTrendData = () => {
    const months = ['Jan 2025', 'Feb 2025', 'Mar 2025', 'Apr 2025', 'May 2025', 'Jun 2025'];
    const monthKeys: MonthString[] = ['January 2025', 'February 2025', 'March 2025', 'April 2025', 'May 2025', 'June 2025'];
    const filteredData = getFilteredFinancialData();
    
    return months.map((month, index) => {
      const monthData = filteredData.Monthly?.[monthKeys[index]] || [];
      return {
        month,
        revenue: monthData.find(item => item.name === 'Revenue')?.total || 0,
        grossProfit: monthData.find(item => item.name === 'Gross Profit')?.total || 0,
        operatingIncome: monthData.find(item => item.name === 'Operating Income')?.total || 0,
        netIncome: monthData.find(item => item.name === 'Net Income')?.total || 0,
      };
    });
  };

  const generateExpenseBreakdown = () => {
    const cogs = currentData.find(item => item.name === 'Cost of Goods Sold')?.total || 0;
    const opex = currentData.find(item => item.name === 'Operating Expenses')?.total || 0;
    const interest = currentData.find(item => item.name === 'Interest Expense')?.total || 0;
    const taxes = currentData.find(item => item.name === 'Taxes')?.total || 0;
    
    return [
      { name: 'Cost of Goods Sold', value: cogs },
      { name: 'Operating Expenses', value: opex },
      { name: 'Interest Expense', value: interest },
      { name: 'Taxes', value: taxes },
    ];
  };

  const kpis = calculateKPIs();
  const trendData = generateTrendData();
  const expenseData = generateExpenseBreakdown();

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
              </div>
              <p className="text-sm text-gray-600 mt-1">Real-time P&L, Cash Flow & Balance Sheet • QuickBooks/Xero Integration</p>
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
                    {properties.map((property) => (
                      <div
                        key={property}
                        className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm"
                        onClick={() => handlePropertyToggle(property)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedProperties.has(property)}
                          onChange={() => {}} // Handled by onClick above
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

              {/* View Mode Toggle */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setViewMode('total')}
                  className={`px-3 py-2 text-sm rounded-md transition-colors ${
                    viewMode === 'total'
                      ? 'text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  style={{ backgroundColor: viewMode === 'total' ? BRAND_COLORS.primary : undefined }}
                >
                  Total
                </button>
                <button
                  onClick={() => setViewMode('detailed')}
                  className={`px-3 py-2 text-sm rounded-md transition-colors ${
                    viewMode === 'detailed'
                      ? 'text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  style={{ backgroundColor: viewMode === 'detailed' ? BRAND_COLORS.primary : undefined }}
                >
                  Detailed
                </button>
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
                onClick={() => showNotification('Financial data refreshed', 'info')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>

          {/* Financial KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 hover:shadow-md transition-shadow" style={{ borderLeftColor: BRAND_COLORS.primary }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-600 text-sm font-medium mb-2">Total Revenue</div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">{formatCurrency(kpis.revenue)}</div>
                  <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full inline-block">
                    +8.7% vs last month
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {getSelectedPropertiesText()}
                  </div>
                </div>
                <DollarSign className="w-8 h-8" style={{ color: BRAND_COLORS.primary }} />
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 hover:shadow-md transition-shadow" style={{ borderLeftColor: BRAND_COLORS.success }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-600 text-sm font-medium mb-2">Gross Margin</div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">{kpis.grossMargin.toFixed(1)}%</div>
                  <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full inline-block">
                    +1.2% vs last month
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {getSelectedPropertiesText()}
                  </div>
                </div>
                <TrendingUp className="w-8 h-8" style={{ color: BRAND_COLORS.success }} />
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 hover:shadow-md transition-shadow" style={{ borderLeftColor: BRAND_COLORS.warning }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-600 text-sm font-medium mb-2">Operating Margin</div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">{kpis.operatingMargin.toFixed(1)}%</div>
                  <div className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full inline-block">
                    +0.5% vs last month
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {getSelectedPropertiesText()}
                  </div>
                </div>
                <BarChart3 className="w-8 h-8" style={{ color: BRAND_COLORS.warning }} />
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 hover:shadow-md transition-shadow" style={{ borderLeftColor: BRAND_COLORS.secondary }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-600 text-sm font-medium mb-2">Net Margin</div>
                  <div className="text-3xl font-bold text-gray-900 mb-1">{kpis.netMargin.toFixed(1)}%</div>
                  <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full inline-block">
                    +0.8% vs last month
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {getSelectedPropertiesText()}
                  </div>
                </div>
                <PieChart className="w-8 h-8" style={{ color: BRAND_COLORS.secondary }} />
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
                      {activeTab === 'p&l' ? 'Profit & Loss Statement' : 
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
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Account
                          </th>
                          {renderColumnHeaders()}
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            % of Revenue
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {currentData.map((item, index) => {
                          const isTotalRow = item.name === 'Net Income' || item.name === 'Gross Profit';
                          const isExpandable = isExpandableAccount(item.name);
                          const isExpanded = expandedAccounts.has(item.name);
                          const revenueItem = currentData.find(i => i.name === 'Revenue');
                          const percentOfRevenue = revenueItem 
                            ? calculatePercentage(item.total, revenueItem.total)
                            : '0%';

                          return (
                            <React.Fragment key={item.name}>
                              {/* Main Account Row */}
                              <tr 
                                className={`hover:bg-gray-50 transition-colors ${isTotalRow ? 'bg-gray-50 font-semibold' : ''}`}
                              >
                                <td className={`px-4 py-3 text-left text-sm ${
                                  isTotalRow ? 'font-semibold text-gray-900' : 'text-gray-700'
                                }`}>
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
                                    {item.name}
                                  </div>
                                </td>
                                {renderDataCells(item)}
                                <td className="px-4 py-3 text-right text-sm text-gray-500">
                                  {percentOfRevenue}
                                </td>
                              </tr>

                              {/* Expanded Detail Rows */}
                              {isExpandable && isExpanded && accountDetails[item.name] && 
                                accountDetails[item.name].map((subItem) => {
                                  const hasSubDetails = subAccountDetails.hasOwnProperty(subItem.name);
                                  return (
                                    <tr key={`${item.name}-${subItem.name}`} className="bg-blue-50 hover:bg-blue-100 transition-colors">
                                      <td className="px-4 py-2 text-left text-sm text-gray-600 pl-12">
                                        <div className="flex items-center">
                                          <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: BRAND_COLORS.primary }}></div>
                                          {subItem.name}
                                        </div>
                                      </td>
                                      <td className="px-4 py-2 text-right text-sm text-gray-600">
                                        <span 
                                          className={hasSubDetails ? "cursor-help border-b border-dotted border-gray-500" : ""}
                                          onMouseEnter={hasSubDetails ? (e) => handleAccountMouseEnter(e, subItem.name, subItem.total) : undefined}
                                          onMouseLeave={hasSubDetails ? handleAccountMouseLeave : undefined}
                                        >
                                          {formatCurrency(subItem.total)}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2 text-right text-sm text-gray-500">
                                        {revenueItem ? calculatePercentage(subItem.total, revenueItem.total) : '0%'}
                                      </td>
                                    </tr>
                                  );
                                })
                              }
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Cash Flow Content - IAMCFO Style */}
                {activeTab === 'cash-flow' && (
                  <div className="overflow-x-auto">
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
                        {filteredCashFlowData.inFlow.map((item) => {
                          const isExpandable = isCashFlowExpandableAccount(item.name);
                          const isExpanded = expandedAccounts.has(item.name);
                          const totalCash = Math.abs(filteredCashFlowData.totalCashFlow);
                          const percentOfCash = totalCash ? calculatePercentage(item.total, totalCash) : '0%';

                          return (
                            <React.Fragment key={`inflow-${item.name}`}>
                              <tr className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 text-left text-sm text-gray-700">
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
                                    <span className="ml-4">{item.name}</span>
                                  </div>
                                </td>
                                {renderCashFlowDataCells(item)}
                                <td className="px-4 py-3 text-right text-sm text-green-600">
                                  {percentOfCash}
                                </td>
                              </tr>
                              {/* Expanded Detail Rows for Cash In-Flow */}
                              {isExpandable && isExpanded && cashFlowDetails[item.name] && 
                                cashFlowDetails[item.name].map((subItem) => {
                                  const hasSubDetails = subAccountDetails.hasOwnProperty(subItem.name);
                                  return (
                                    <tr key={`${item.name}-${subItem.name}`} className="bg-green-25 hover:bg-green-50 transition-colors">
                                      <td className="px-4 py-2 text-left text-sm text-gray-600 pl-16">
                                        <div className="flex items-center">
                                          <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                                          {subItem.name}
                                        </div>
                                      </td>
                                      <td className="px-4 py-2 text-right text-sm text-green-600">
                                        <span 
                                          className={hasSubDetails ? "cursor-help border-b border-dotted border-gray-500" : ""}
                                          onMouseEnter={hasSubDetails ? (e) => handleAccountMouseEnter(e, subItem.name, subItem.total) : undefined}
                                          onMouseLeave={hasSubDetails ? handleAccountMouseLeave : undefined}
                                        >
                                          {formatCurrency(subItem.total)}
                                        </span>
                                      </td>
                                      <td className="px-4 py-2 text-right text-sm text-gray-500">
                                        {totalCash ? calculatePercentage(subItem.total, totalCash) : '0%'}
                                      </td>
                                    </tr>
                                  );
                                })
                              }
                            </React.Fragment>
                          );
                        })}
                        
                        {/* Total Cash In-Flow */}
                        <tr className="bg-green-100 font-semibold">
                          <td className="px-4 py-3 text-left text-sm text-green-800 font-bold">
                            Total Cash In-Flow
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-green-800 font-bold">
                            {formatCurrency(filteredCashFlowData.totalInFlow)}
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
                        {filteredCashFlowData.outFlow.map((item) => {
                          const isExpandable = isCashFlowExpandableAccount(item.name);
                          const isExpanded = expandedAccounts.has(item.name);
                          const totalCash = Math.abs(filteredCashFlowData.totalCashFlow);
                          const percentOfCash = totalCash ? calculatePercentage(Math.abs(item.total), totalCash) : '0%';

                          return (
                            <React.Fragment key={`outflow-${item.name}`}>
                              <tr className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 text-left text-sm text-gray-700">
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
                                    <span className="ml-4">{item.name}</span>
                                  </div>
                                </td>
                                {renderCashFlowDataCells(item)}
                                <td className="px-4 py-3 text-right text-sm text-red-600">
                                  {percentOfCash}
                                </td>
                              </tr>
                              {/* Expanded Detail Rows for Cash Out-Flow */}
                              {isExpandable && isExpanded && cashFlowDetails[item.name] && 
                                cashFlowDetails[item.name].map((subItem) => {
                                  const hasSubDetails = subAccountDetails.hasOwnProperty(subItem.name);
                                  return (
                                    <tr key={`${item.name}-${subItem.name}`} className="bg-red-25 hover:bg-red-50 transition-colors">
                                      <td className="px-4 py-2 text-left text-sm text-gray-600 pl-16">
                                        <div className="flex items-center">
                                          <div className="w-2 h-2 bg-red-400 rounded-full mr-2"></div>
                                          {subItem.name}
                                        </div>
                                      </td>
                                      <td className="px-4 py-2 text-right text-sm text-red-600">
                                        <span 
                                          className={hasSubDetails ? "cursor-help border-b border-dotted border-gray-500" : ""}
                                          onMouseEnter={hasSubDetails ? (e) => handleAccountMouseEnter(e, subItem.name, Math.abs(subItem.total)) : undefined}
                                          onMouseLeave={hasSubDetails ? handleAccountMouseLeave : undefined}
                                        >
                                          ({formatCurrency(Math.abs(subItem.total))})
                                        </span>
                                      </td>
                                      <td className="px-4 py-2 text-right text-sm text-gray-500">
                                        {totalCash ? calculatePercentage(Math.abs(subItem.total), totalCash) : '0%'}
                                      </td>
                                    </tr>
                                  );
                                })
                              }
                            </React.Fragment>
                          );
                        })}

                        {/* Total Cash Out-Flow */}
                        <tr className="bg-red-100 font-semibold">
                          <td className="px-4 py-3 text-left text-sm text-red-800 font-bold">
                            Total Cash Out-Flow
                          </td>
                          <td className="px-4 py-3 text-right text-sm text-red-800 font-bold">
                            ({formatCurrency(Math.abs(filteredCashFlowData.totalOutFlow))})
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
                            filteredCashFlowData.totalCashFlow >= 0 ? 'text-green-700' : 'text-red-700'
                          }`}>
                            {formatCurrency(filteredCashFlowData.totalCashFlow)}
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
                            {formatCurrency(filteredCashFlowData.beginningCash)}
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
                            {formatCurrency(filteredCashFlowData.endingCash)}
                          </td>
                          <td className="px-4 py-3 text-right text-sm" style={{ color: BRAND_COLORS.primary }}>
                            Final
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Balance Sheet Content */}
{activeTab === 'balance-sheet' && (
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead className="bg-gray-50">
        <tr>
          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Account
          </th>
          {renderColumnHeaders()}
          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
            % of Total Assets
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {/* ASSETS SECTION */}
        <tr className="bg-blue-50">
          <td colSpan={100} className="px-4 py-3 text-left text-sm font-bold text-blue-800">
            📊 ASSETS
          </td>
        </tr>
        
        {/* Current Assets */}
        <tr className="bg-blue-25">
          <td colSpan={100} className="px-4 py-2 text-left text-sm font-semibold text-blue-700">
            Current Assets
          </td>
        </tr>
        
        <tr className="hover:bg-gray-50 transition-colors">
          <td className="px-4 py-3 text-left text-sm text-gray-700 pl-8">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
              Cash & Cash Equivalents
            </div>
          </td>
          <td className="px-4 py-3 text-right text-sm font-medium">
            {formatCurrency(285000)}
          </td>
          <td className="px-4 py-3 text-right text-sm text-gray-500">
            12.4%
          </td>
        </tr>
        
        <tr className="hover:bg-gray-50 transition-colors">
          <td className="px-4 py-3 text-left text-sm text-gray-700 pl-8">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
              Accounts Receivable
            </div>
          </td>
          <td className="px-4 py-3 text-right text-sm font-medium">
            {formatCurrency(165000)}
          </td>
          <td className="px-4 py-3 text-right text-sm text-gray-500">
            7.2%
          </td>
        </tr>
        
        <tr className="hover:bg-gray-50 transition-colors">
          <td className="px-4 py-3 text-left text-sm text-gray-700 pl-8">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
              Inventory
            </div>
          </td>
          <td className="px-4 py-3 text-right text-sm font-medium">
            {formatCurrency(125000)}
          </td>
          <td className="px-4 py-3 text-right text-sm text-gray-500">
            5.4%
          </td>
        </tr>
        
        <tr className="hover:bg-gray-50 transition-colors">
          <td className="px-4 py-3 text-left text-sm text-gray-700 pl-8">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
              Prepaid Expenses
            </div>
          </td>
          <td className="px-4 py-3 text-right text-sm font-medium">
            {formatCurrency(35000)}
          </td>
          <td className="px-4 py-3 text-right text-sm text-gray-500">
            1.5%
          </td>
        </tr>
        
        <tr className="bg-blue-100 font-semibold">
          <td className="px-4 py-3 text-left text-sm text-blue-800 font-bold pl-6">
            Total Current Assets
          </td>
          <td className="px-4 py-3 text-right text-sm text-blue-800 font-bold">
            {formatCurrency(610000)}
          </td>
          <td className="px-4 py-3 text-right text-sm text-blue-800 font-bold">
            26.5%
          </td>
        </tr>
        
        {/* Fixed Assets */}
        <tr className="bg-blue-25">
          <td colSpan={100} className="px-4 py-2 text-left text-sm font-semibold text-blue-700">
            Fixed Assets
          </td>
        </tr>
        
        <tr className="hover:bg-gray-50 transition-colors">
          <td className="px-4 py-3 text-left text-sm text-gray-700 pl-8">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
              Property, Plant & Equipment
            </div>
          </td>
          <td className="px-4 py-3 text-right text-sm font-medium">
            {formatCurrency(1450000)}
          </td>
          <td className="px-4 py-3 text-right text-sm text-gray-500">
            63.0%
          </td>
        </tr>
        
        <tr className="hover:bg-gray-50 transition-colors">
          <td className="px-4 py-3 text-left text-sm text-gray-700 pl-8">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
              Less: Accumulated Depreciation
            </div>
          </td>
          <td className="px-4 py-3 text-right text-sm font-medium text-red-600">
            ({formatCurrency(285000)})
          </td>
          <td className="px-4 py-3 text-right text-sm text-gray-500">
            -12.4%
          </td>
        </tr>
        
        <tr className="hover:bg-gray-50 transition-colors">
          <td className="px-4 py-3 text-left text-sm text-gray-700 pl-8">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
              Intangible Assets
            </div>
          </td>
          <td className="px-4 py-3 text-right text-sm font-medium">
            {formatCurrency(125000)}
          </td>
          <td className="px-4 py-3 text-right text-sm text-gray-500">
            5.4%
          </td>
        </tr>
        
        <tr className="bg-blue-100 font-semibold">
          <td className="px-4 py-3 text-left text-sm text-blue-800 font-bold pl-6">
            Total Fixed Assets
          </td>
          <td className="px-4 py-3 text-right text-sm text-blue-800 font-bold">
            {formatCurrency(1290000)}
          </td>
          <td className="px-4 py-3 text-right text-sm text-blue-800 font-bold">
            56.0%
          </td>
        </tr>
        
        {/* Other Assets */}
        <tr className="bg-blue-25">
          <td colSpan={100} className="px-4 py-2 text-left text-sm font-semibold text-blue-700">
            Other Assets
          </td>
        </tr>
        
        <tr className="hover:bg-gray-50 transition-colors">
          <td className="px-4 py-3 text-left text-sm text-gray-700 pl-8">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
              Investments
            </div>
          </td>
          <td className="px-4 py-3 text-right text-sm font-medium">
            {formatCurrency(235000)}
          </td>
          <td className="px-4 py-3 text-right text-sm text-gray-500">
            10.2%
          </td>
        </tr>
        
        <tr className="hover:bg-gray-50 transition-colors">
          <td className="px-4 py-3 text-left text-sm text-gray-700 pl-8">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
              Goodwill
            </div>
          </td>
          <td className="px-4 py-3 text-right text-sm font-medium">
            {formatCurrency(165000)}
          </td>
          <td className="px-4 py-3 text-right text-sm text-gray-500">
            7.2%
          </td>
        </tr>
        
        <tr className="bg-blue-100 font-semibold">
          <td className="px-4 py-3 text-left text-sm text-blue-800 font-bold pl-6">
            Total Other Assets
          </td>
          <td className="px-4 py-3 text-right text-sm text-blue-800 font-bold">
            {formatCurrency(400000)}
          </td>
          <td className="px-4 py-3 text-right text-sm text-blue-800 font-bold">
            17.4%
          </td>
        </tr>
        
        {/* TOTAL ASSETS */}
        <tr className="border-t-2" style={{ backgroundColor: BRAND_COLORS.primary + '20', borderTopColor: BRAND_COLORS.primary + '40' }}>
          <td className="px-4 py-4 text-left text-lg font-bold" style={{ color: BRAND_COLORS.primary }}>
            📈 TOTAL ASSETS
          </td>
          <td className="px-4 py-4 text-right text-lg font-bold" style={{ color: BRAND_COLORS.primary }}>
            {formatCurrency(2300000)}
          </td>
          <td className="px-4 py-4 text-right text-sm font-bold" style={{ color: BRAND_COLORS.primary }}>
            100.0%
          </td>
        </tr>
        
        {/* LIABILITIES SECTION */}
        <tr className="bg-red-50">
          <td colSpan={100} className="px-4 py-3 text-left text-sm font-bold text-red-800">
            💳 LIABILITIES
          </td>
        </tr>
        
        {/* Current Liabilities */}
        <tr className="bg-red-25">
          <td colSpan={100} className="px-4 py-2 text-left text-sm font-semibold text-red-700">
            Current Liabilities
          </td>
        </tr>
        
        <tr className="hover:bg-gray-50 transition-colors">
          <td className="px-4 py-3 text-left text-sm text-gray-700 pl-8">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-red-400 rounded-full mr-2"></div>
              Accounts Payable
            </div>
          </td>
          <td className="px-4 py-3 text-right text-sm font-medium">
            {formatCurrency(185000)}
          </td>
          <td className="px-4 py-3 text-right text-sm text-gray-500">
            8.0%
          </td>
        </tr>
        
        <tr className="hover:bg-gray-50 transition-colors">
          <td className="px-4 py-3 text-left text-sm text-gray-700 pl-8">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-red-400 rounded-full mr-2"></div>
              Accrued Expenses
            </div>
          </td>
          <td className="px-4 py-3 text-right text-sm font-medium">
            {formatCurrency(95000)}
          </td>
          <td className="px-4 py-3 text-right text-sm text-gray-500">
            4.1%
          </td>
        </tr>
        
        <tr className="hover:bg-gray-50 transition-colors">
          <td className="px-4 py-3 text-left text-sm text-gray-700 pl-8">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-red-400 rounded-full mr-2"></div>
              Short-term Debt
            </div>
          </td>
          <td className="px-4 py-3 text-right text-sm font-medium">
            {formatCurrency(150000)}
          </td>
          <td className="px-4 py-3 text-right text-sm text-gray-500">
            6.5%
          </td>
        </tr>
        
        <tr className="bg-red-100 font-semibold">
          <td className="px-4 py-3 text-left text-sm text-red-800 font-bold pl-6">
            Total Current Liabilities
          </td>
          <td className="px-4 py-3 text-right text-sm text-red-800 font-bold">
            {formatCurrency(430000)}
          </td>
          <td className="px-4 py-3 text-right text-sm text-red-800 font-bold">
            18.7%
          </td>
        </tr>
        
        {/* Long-term Liabilities */}
        <tr className="bg-red-25">
          <td colSpan={100} className="px-4 py-2 text-left text-sm font-semibold text-red-700">
            Long-term Liabilities
          </td>
        </tr>
        
        <tr className="hover:bg-gray-50 transition-colors">
          <td className="px-4 py-3 text-left text-sm text-gray-700 pl-8">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-red-400 rounded-full mr-2"></div>
              Long-term Debt
            </div>
          </td>
          <td className="px-4 py-3 text-right text-sm font-medium">
            {formatCurrency(650000)}
          </td>
          <td className="px-4 py-3 text-right text-sm text-gray-500">
            28.3%
          </td>
        </tr>
        
        <tr className="hover:bg-gray-50 transition-colors">
          <td className="px-4 py-3 text-left text-sm text-gray-700 pl-8">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-red-400 rounded-full mr-2"></div>
              Deferred Tax Liabilities
            </div>
          </td>
          <td className="px-4 py-3 text-right text-sm font-medium">
            {formatCurrency(85000)}
          </td>
          <td className="px-4 py-3 text-right text-sm text-gray-500">
            3.7%
          </td>
        </tr>
        
        <tr className="bg-red-100 font-semibold">
          <td className="px-4 py-3 text-left text-sm text-red-800 font-bold pl-6">
            Total Long-term Liabilities
          </td>
          <td className="px-4 py-3 text-right text-sm text-red-800 font-bold">
            {formatCurrency(735000)}
          </td>
          <td className="px-4 py-3 text-right text-sm text-red-800 font-bold">
            32.0%
          </td>
        </tr>
        
        {/* TOTAL LIABILITIES */}
        <tr className="bg-red-200 font-semibold">
          <td className="px-4 py-3 text-left text-sm text-red-900 font-bold">
            Total Liabilities
          </td>
          <td className="px-4 py-3 text-right text-sm text-red-900 font-bold">
            {formatCurrency(1165000)}
          </td>
          <td className="px-4 py-3 text-right text-sm text-red-900 font-bold">
            50.7%
          </td>
        </tr>
        
        {/* EQUITY SECTION */}
        <tr className="bg-green-50">
          <td colSpan={100} className="px-4 py-3 text-left text-sm font-bold text-green-800">
            🏛️ OWNERS' EQUITY
          </td>
        </tr>
        
        <tr className="hover:bg-gray-50 transition-colors">
          <td className="px-4 py-3 text-left text-sm text-gray-700 pl-6">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
              Owner's Capital
            </div>
          </td>
          <td className="px-4 py-3 text-right text-sm font-medium">
            {formatCurrency(750000)}
          </td>
          <td className="px-4 py-3 text-right text-sm text-gray-500">
            32.6%
          </td>
        </tr>
        
        <tr className="hover:bg-gray-50 transition-colors">
          <td className="px-4 py-3 text-left text-sm text-gray-700 pl-6">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
              Retained Earnings
            </div>
          </td>
          <td className="px-4 py-3 text-right text-sm font-medium">
            {formatCurrency(385000)}
          </td>
          <td className="px-4 py-3 text-right text-sm text-gray-500">
            16.7%
          </td>
        </tr>
        
        <tr className="bg-green-100 font-semibold">
          <td className="px-4 py-3 text-left text-sm text-green-800 font-bold">
            Total Owners' Equity
          </td>
          <td className="px-4 py-3 text-right text-sm text-green-800 font-bold">
            {formatCurrency(1135000)}
          </td>
          <td className="px-4 py-3 text-right text-sm text-green-800 font-bold">
            49.3%
          </td>
        </tr>
        
        {/* TOTAL LIABILITIES & EQUITY */}
        <tr className="border-t-2" style={{ backgroundColor: BRAND_COLORS.primary + '20', borderTopColor: BRAND_COLORS.primary + '40' }}>
          <td className="px-4 py-4 text-left text-lg font-bold" style={{ color: BRAND_COLORS.primary }}>
            ⚖️ TOTAL LIABILITIES & EQUITY
          </td>
          <td className="px-4 py-4 text-right text-lg font-bold" style={{ color: BRAND_COLORS.primary }}>
            {formatCurrency(2300000)}
          </td>
          <td className="px-4 py-4 text-right text-sm font-bold" style={{ color: BRAND_COLORS.primary }}>
            100.0%
          </td>
        </tr>
      </tbody>
    </table>
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
    <ResponsiveContainer width="100%" height={300}>
      <RechartsPieChart>
        <Tooltip formatter={(value: any) => [`${formatCurrency(Number(value))}`, '']} />
        <Pie
          data={expenseData}
          cx="50%"
          cy="50%"
          outerRadius={90}
          fill="#8884d8"
          dataKey="value"
          label={({ name, percent }: any) => {
            // Shorten long names for labels
            const shortName = name.length > 15 ? name.substring(0, 12) + '...' : name;
            return `${shortName}: ${(percent * 100).toFixed(0)}%`;
          }}
          labelLine={false}
        >
          {expenseData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Legend 
          verticalAlign="bottom" 
          height={36}
          formatter={(value) => value.length > 20 ? value.substring(0, 17) + '...' : value}
        />
      </RechartsPieChart>
    </ResponsiveContainer>
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
