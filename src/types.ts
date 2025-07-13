export type AccountCOA = {
  account_name: string;
  account_type: string;
};

export type JournalEntry = {
  account_name: string;
  property_class: string;
  transaction_date: string;
  line_amount?: number;
  debit_amount?: number;
  credit_amount?: number;
};

export type AccountType = "Revenue" | "Expenses" | "Assets" | "Liabilities" | "Equity" | "Other";

export type AccountNode = {
  name: string;
  fullName: string;
  type: AccountType;
  children: AccountNode[];
  entries: JournalEntry[];
  total: number;
  months: Record<string, number>;
  parent?: AccountNode;
};

export type FinancialTab = "p&l" | "cash-flow" | "balance-sheet";
export type ViewMode = "detailed" | "total";
export type TimeView = "Monthly" | "YTD" | "TTM" | "Quarterly";

export type NotificationState = {
  show: boolean;
  message: string;
  type: "success" | "error" | "info";
};
