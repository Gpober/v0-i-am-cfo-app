export interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  category: string
  account: string
}

export interface FinancialData {
  revenue: number
  expenses: number
  profit: number
  cashFlow: number
}

export interface KPIData {
  title: string
  value: string
  change: string
  trend: "up" | "down" | "neutral"
}
