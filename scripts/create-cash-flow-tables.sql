-- Cash Flow Statement Tables

-- Cash flow categories (Operating, Investing, Financing)
CREATE TABLE IF NOT EXISTS cash_flow_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('operating', 'investing', 'financing')),
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cash flow line items (specific items within each category)
CREATE TABLE IF NOT EXISTS cash_flow_line_items (
  id SERIAL PRIMARY KEY,
  category_id INTEGER REFERENCES cash_flow_categories(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  is_calculated BOOLEAN DEFAULT FALSE, -- true if calculated from other data
  calculation_source TEXT, -- reference to how it's calculated
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Actual cash flow transactions
CREATE TABLE IF NOT EXISTS cash_flow_transactions (
  id SERIAL PRIMARY KEY,
  line_item_id INTEGER REFERENCES cash_flow_line_items(id) ON DELETE CASCADE,
  transaction_date DATE NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  description TEXT,
  reference_id VARCHAR(100), -- reference to source transaction
  property_class VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default cash flow categories
INSERT INTO cash_flow_categories (name, type, description, sort_order) VALUES
('Net Income', 'operating', 'Starting point for operating cash flow', 1),
('Depreciation & Amortization', 'operating', 'Non-cash expenses added back', 2),
('Changes in Working Capital', 'operating', 'Changes in current assets and liabilities', 3),
('Property & Equipment Purchases', 'investing', 'Capital expenditures', 1),
('Asset Sales', 'investing', 'Proceeds from asset disposals', 2),
('Loan Proceeds', 'financing', 'New borrowings', 1),
('Loan Payments', 'financing', 'Principal payments on debt', 2),
('Owner Distributions', 'financing', 'Distributions to owners', 3)
ON CONFLICT (name) DO NOTHING;

-- Insert default line items
INSERT INTO cash_flow_line_items (category_id, name, description, is_calculated, sort_order) VALUES
((SELECT id FROM cash_flow_categories WHERE name = 'Net Income'), 'Net Income', 'Net income from P&L statement', true, 1),
((SELECT id FROM cash_flow_categories WHERE name = 'Depreciation & Amortization'), 'Depreciation Expense', 'Depreciation on fixed assets', false, 1),
((SELECT id FROM cash_flow_categories WHERE name = 'Depreciation & Amortization'), 'Amortization Expense', 'Amortization of intangible assets', false, 2),
((SELECT id FROM cash_flow_categories WHERE name = 'Changes in Working Capital'), 'Accounts Receivable Change', 'Change in A/R balance', true, 1),
((SELECT id FROM cash_flow_categories WHERE name = 'Changes in Working Capital'), 'Accounts Payable Change', 'Change in A/P balance', true, 2),
((SELECT id FROM cash_flow_categories WHERE name = 'Property & Equipment Purchases'), 'Building Improvements', 'Capital improvements to properties', false, 1),
((SELECT id FROM cash_flow_categories WHERE name = 'Property & Equipment Purchases'), 'Equipment Purchases', 'New equipment and fixtures', false, 2),
((SELECT id FROM cash_flow_categories WHERE name = 'Loan Payments'), 'Mortgage Payments', 'Principal payments on mortgages', false, 1),
((SELECT id FROM cash_flow_categories WHERE name = 'Loan Payments'), 'Line of Credit Payments', 'Payments on credit lines', false, 2)
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_cash_flow_transactions_date ON cash_flow_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_cash_flow_transactions_property ON cash_flow_transactions(property_class);
CREATE INDEX IF NOT EXISTS idx_cash_flow_transactions_line_item ON cash_flow_transactions(line_item_id);
