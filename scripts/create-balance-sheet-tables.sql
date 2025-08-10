-- Balance Sheet Tables

-- Balance sheet categories (Assets, Liabilities, Equity)
CREATE TABLE IF NOT EXISTS balance_sheet_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('asset', 'liability', 'equity')),
  subtype VARCHAR(50), -- current_asset, fixed_asset, current_liability, long_term_liability
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Balance sheet accounts
CREATE TABLE IF NOT EXISTS balance_sheet_accounts (
  id SERIAL PRIMARY KEY,
  category_id INTEGER REFERENCES balance_sheet_categories(id) ON DELETE CASCADE,
  account_name VARCHAR(200) NOT NULL,
  account_number VARCHAR(50),
  description TEXT,
  is_calculated BOOLEAN DEFAULT FALSE,
  calculation_source TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Balance sheet balances (point-in-time snapshots)
CREATE TABLE IF NOT EXISTS balance_sheet_balances (
  id SERIAL PRIMARY KEY,
  account_id INTEGER REFERENCES balance_sheet_accounts(id) ON DELETE CASCADE,
  balance_date DATE NOT NULL,
  balance_amount DECIMAL(15,2) NOT NULL,
  property_class VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(account_id, balance_date, property_class)
);

-- Insert default balance sheet categories
INSERT INTO balance_sheet_categories (name, type, subtype, description, sort_order) VALUES
('Current Assets', 'asset', 'current_asset', 'Assets expected to be converted to cash within one year', 1),
('Fixed Assets', 'asset', 'fixed_asset', 'Long-term assets used in operations', 2),
('Current Liabilities', 'liability', 'current_liability', 'Obligations due within one year', 1),
('Long-term Liabilities', 'liability', 'long_term_liability', 'Obligations due beyond one year', 2),
('Owner Equity', 'equity', 'equity', 'Owner''s stake in the business', 1)
ON CONFLICT (name) DO NOTHING;

-- Insert default balance sheet accounts
INSERT INTO balance_sheet_accounts (category_id, account_name, account_number, description, sort_order) VALUES
-- Current Assets
((SELECT id FROM balance_sheet_categories WHERE name = 'Current Assets'), 'Cash and Cash Equivalents', '1010', 'Checking, savings, and money market accounts', 1),
((SELECT id FROM balance_sheet_categories WHERE name = 'Current Assets'), 'Accounts Receivable', '1200', 'Money owed by tenants and customers', 2),
((SELECT id FROM balance_sheet_categories WHERE name = 'Current Assets'), 'Prepaid Expenses', '1300', 'Expenses paid in advance', 3),
((SELECT id FROM balance_sheet_categories WHERE name = 'Current Assets'), 'Security Deposits', '1400', 'Deposits held for utilities and services', 4),

-- Fixed Assets
((SELECT id FROM balance_sheet_categories WHERE name = 'Fixed Assets'), 'Land', '1510', 'Real estate land holdings', 1),
((SELECT id FROM balance_sheet_categories WHERE name = 'Fixed Assets'), 'Buildings', '1520', 'Rental properties and structures', 2),
((SELECT id FROM balance_sheet_categories WHERE name = 'Fixed Assets'), 'Accumulated Depreciation - Buildings', '1525', 'Accumulated depreciation on buildings', 3),
((SELECT id FROM balance_sheet_categories WHERE name = 'Fixed Assets'), 'Equipment', '1530', 'Furniture, fixtures, and equipment', 4),
((SELECT id FROM balance_sheet_categories WHERE name = 'Fixed Assets'), 'Accumulated Depreciation - Equipment', '1535', 'Accumulated depreciation on equipment', 5),

-- Current Liabilities
((SELECT id FROM balance_sheet_categories WHERE name = 'Current Liabilities'), 'Accounts Payable', '2010', 'Money owed to vendors and suppliers', 1),
((SELECT id FROM balance_sheet_categories WHERE name = 'Current Liabilities'), 'Accrued Expenses', '2020', 'Expenses incurred but not yet paid', 2),
((SELECT id FROM balance_sheet_categories WHERE name = 'Current Liabilities'), 'Security Deposits Payable', '2030', 'Tenant security deposits held', 3),
((SELECT id FROM balance_sheet_categories WHERE name = 'Current Liabilities'), 'Current Portion of Long-term Debt', '2040', 'Principal due within one year', 4),

-- Long-term Liabilities
((SELECT id FROM balance_sheet_categories WHERE name = 'Long-term Liabilities'), 'Mortgages Payable', '2510', 'Long-term mortgage debt', 1),
((SELECT id FROM balance_sheet_categories WHERE name = 'Long-term Liabilities'), 'Notes Payable', '2520', 'Other long-term debt obligations', 2),

-- Owner Equity
((SELECT id FROM balance_sheet_categories WHERE name = 'Owner Equity'), 'Owner Capital', '3010', 'Initial and additional capital contributions', 1),
((SELECT id FROM balance_sheet_categories WHERE name = 'Owner Equity'), 'Retained Earnings', '3020', 'Accumulated earnings retained in business', 2),
((SELECT id FROM balance_sheet_categories WHERE name = 'Owner Equity'), 'Current Year Earnings', '3030', 'Net income for current year', 3)
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_balance_sheet_balances_date ON balance_sheet_balances(balance_date);
CREATE INDEX IF NOT EXISTS idx_balance_sheet_balances_property ON balance_sheet_balances(property_class);
CREATE INDEX IF NOT EXISTS idx_balance_sheet_balances_account ON balance_sheet_balances(account_id);
