export interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  category: string
  type: "income" | "expense"
}

export interface BalanceSheetItem {
  id: string
  category: string
  subcategory: string
  amount: number
  type: "asset" | "liability" | "equity"
}

export interface CashFlowItem {
  id: string
  category: string
  amount: number
  type: "operating" | "investing" | "financing"
  date: string
}

export interface AccountsPayableItem {
  id: string
  vendor: string
  amount: number
  due_date: string
  status: "pending" | "paid" | "overdue"
  invoice_number: string
}

export interface AccountsReceivableItem {
  id: string
  customer: string
  amount: number
  due_date: string
  status: "pending" | "paid" | "overdue"
  invoice_number: string
}
