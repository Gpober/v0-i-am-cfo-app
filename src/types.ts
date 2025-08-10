// Journal Entry Line Item from Supabase
export interface JournalEntryLine {
  id: string
  entry_number: string
  line_sequence: number
  date: string
  type: string | null
  number: string | null
  due_date: string | null
  open_balance: string
  payment_date: string | null
  payment_method: string | null
  adj: string
  created: string | null
  created_by: string | null
  name: string | null
  customer: string | null
  vendor: string | null
  employee: string | null
  class: string | null
  product_service: string | null
  memo: string | null
  qty: string
  rate: string
  account: string
  ar_paid: string
  ap_paid: string
  clr: string | null
  check_printed: string | null
  debit: string
  credit: string
  online_banking: string | null
  account_type: string | null
  detail_type: string | null
  account_behavior: string | null
  report_category: string
  normal_balance: string
  property: string | null
  is_cash_account: boolean
  created_at: string
}

// Cash Flow Data Structure
export interface CashFlowData {
  operating: {
    inflows: Record<string, number>
    outflows: Record<string, number>
    netOperating: number
  }
  investing: {
    inflows: Record<string, number>
    outflows: Record<string, number>
    netInvesting: number
  }
  financing: {
    inflows: Record<string, number>
    outflows: Record<string, number>
    netFinancing: number
  }
  netCashFlow: number
  beginningCash: number
  endingCash: number
}

// Transaction Details for Modal
export interface CategoryTransactions {
  categoryName: string
  categoryType: string
  transactions: JournalEntryLine[]
  total: number
}

// P&L Data Structure
export interface PLData {
  revenue: Record<string, number>
  expenses: Record<string, number>
  netIncome: number
  totalRevenue: number
  totalExpenses: number
}

// Balance Sheet Data Structure
export interface BalanceSheetData {
  assets: {
    current: Record<string, number>
    fixed: Record<string, number>
    totalAssets: number
  }
  liabilities: {
    current: Record<string, number>
    longTerm: Record<string, number>
    totalLiabilities: number
  }
  equity: Record<string, number>
  totalEquity: number
}

// Property/Class filter
export interface PropertyFilter {
  value: string
  label: string
}

// KPI Card Data
export interface KPIData {
  title: string
  value: string | number
  change?: string
  trend?: 'up' | 'down' | 'neutral'
  icon?: string
}

// Summary Item Data
export interface SummaryItemData {
  label: string
  value: string | number
  subItems?: Array<{
    label: string
    value: string | number
  }>
}
