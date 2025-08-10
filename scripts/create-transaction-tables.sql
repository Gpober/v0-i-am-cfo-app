-- Create table for transaction data matching your format
CREATE TABLE IF NOT EXISTS transaction_ledger (
  id SERIAL PRIMARY KEY,
  transaction_date DATE NOT NULL,
  type VARCHAR(50), -- Transfer, Expense, Deposit, Journal Entry
  number VARCHAR(50), -- Transaction number/reference
  name VARCHAR(200), -- Payee/description
  class VARCHAR(100), -- Property class or category
  memo TEXT, -- Additional description
  split VARCHAR(100), -- Split transaction reference
  debit_amount DECIMAL(15,2),
  credit_amount DECIMAL(15,2),
  amount DECIMAL(15,2), -- Net amount (positive for debits, negative for credits)
  balance DECIMAL(15,2), -- Running balance
  account_name VARCHAR(200) NOT NULL, -- Account this transaction belongs to
  property_class VARCHAR(100), -- Property classification
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_transaction_ledger_date ON transaction_ledger(transaction_date);
CREATE INDEX IF NOT EXISTS idx_transaction_ledger_account ON transaction_ledger(account_name);
CREATE INDEX IF NOT EXISTS idx_transaction_ledger_type ON transaction_ledger(type);
CREATE INDEX IF NOT EXISTS idx_transaction_ledger_class ON transaction_ledger(property_class);

-- Insert sample data based on your Bank First Acct x3897 transactions
INSERT INTO transaction_ledger (
  transaction_date, type, number, name, class, memo, split, 
  debit_amount, credit_amount, amount, balance, account_name, property_class
) VALUES
('2025-01-08', 'Transfer', NULL, NULL, NULL, '116969751 BusiTerra3 Checking', NULL, 9000, NULL, 9000, 9000, 'Bank First Acct x3897', NULL),
('2025-01-09', 'Expense', NULL, NULL, NULL, 'Columbus Mortg', 'Split', NULL, 5283, -5283, 3717, 'Bank First Acct x3897', NULL),
('2025-01-29', 'Transfer', NULL, NULL, NULL, '111533732 BusiTerra2 Vacation R', NULL, 4000, NULL, 4000, 7717, 'Bank First Acct x3897', NULL),
('2025-02-03', 'Expense', NULL, NULL, NULL, 'Columbus Loan P', 'Split', NULL, 5283, -5283, 2434, 'Bank First Acct x3897', NULL),
('2025-02-13', 'Expense', 'TJ Mosley', NULL, NULL, '124.08 reimburs', 'Split', NULL, 229, -229, 2205, 'Bank First Acct x3897', NULL),
('2025-02-19', 'Expense', 'TJ Mosley', 'Labor - Misc', NULL, '210 maint colum', NULL, NULL, 210, -210, 1995, 'Bank First Acct x3897', 'Labor - Misc'),
('2025-02-26', 'Transfer', NULL, NULL, NULL, '117580885 BusiTerra2 Vacation R', NULL, 5000, NULL, 5000, 6995, 'Bank First Acct x3897', NULL),
('2025-02-27', 'Expense', 'TJ Mosley', 'Labor - Misc', NULL, 'maint columbus', NULL, NULL, 140, -140, 6855, 'Bank First Acct x3897', 'Labor - Misc'),
('2025-02-27', 'Expense', NULL, NULL, NULL, 'Supplies', NULL, NULL, 100, -100, 6755, 'Bank First Acct x3897', NULL),
('2025-03-03', 'Expense', 'Holcomb Bank', NULL, NULL, 'reimbursement r', 'Split', NULL, 5283, -5283, 1472, 'Bank First Acct x3897', NULL),
('2025-03-06', 'Deposit', 'Airbnb', 'Rental Revenue', NULL, 'AIRBNB 4977 AI', NULL, 0, NULL, 0, 1472, 'Bank First Acct x3897', 'Rental Revenue'),
('2025-03-06', 'Expense', 'Billie Madison', 'Labor - Cleaning', NULL, 'Billie Madison 3-', NULL, NULL, 300, -300, 1172, 'Bank First Acct x3897', 'Labor - Cleaning'),
('2025-03-06', 'Expense', 'TJ Mosley', NULL, NULL, 'TJ maint columbu', NULL, NULL, 460, -460, 712, 'Bank First Acct x3897', NULL),
('2025-03-07', 'Transfer', NULL, NULL, NULL, 'Columbus Loan P', NULL, 5000, NULL, 5000, 5712, 'Bank First Acct x3897', NULL),
('2025-03-13', 'Expense', 'Billie Madison', 'Labor - Cleaning', NULL, 'Billie Madison de', NULL, NULL, 300, -300, 5412, 'Bank First Acct x3897', 'Labor - Cleaning'),
('2025-03-13', 'Expense', 'TJ Mosley', NULL, NULL, 'TJ maint columbu', NULL, NULL, 158, -158, 5255, 'Bank First Acct x3897', NULL),
('2025-03-19', 'Expense', 'TJ Mosley', NULL, NULL, 'TJ maint columbu', NULL, NULL, 563, -563, 4692, 'Bank First Acct x3897', NULL),
('2025-03-19', 'Expense', 'Billie Madison', 'Labor - Cleaning', NULL, 'Billie Madison 1 c', NULL, NULL, 300, -300, 4392, 'Bank First Acct x3897', 'Labor - Cleaning'),
('2025-03-21', 'Deposit', 'Airbnb', 'Rental Revenue', NULL, 'AIRBNB 4977 AI', NULL, 1455, NULL, 1455, 5847, 'Bank First Acct x3897', 'Rental Revenue'),
('2025-03-28', 'Expense', 'TJ Mosley', NULL, NULL, 'TJ maint columbu', 'Split', NULL, 305, -305, 5542, 'Bank First Acct x3897', NULL),
('2025-03-28', 'Expense', 'Billie Madison', 'Labor - Cleaning', NULL, 'Billie Madison 3 c', NULL, NULL, 900, -900, 4642, 'Bank First Acct x3897', 'Labor - Cleaning'),
('2025-04-01', 'Transfer', NULL, NULL, NULL, '115485996 BusiTerra2 Vacation R', NULL, 3000, NULL, 3000, 7642, 'Bank First Acct x3897', NULL),
('2025-04-02', 'Deposit', 'Airbnb', 'Rental Revenue', NULL, 'AIRBNB 4977 AI', NULL, 2716, NULL, 2716, 10358, 'Bank First Acct x3897', 'Rental Revenue'),
('2025-04-02', 'Expense', 'TJ Mosley', 'Repairs & maintenance', NULL, 'TJ maint columbu', NULL, NULL, 245, -245, 10113, 'Bank First Acct x3897', 'Repairs & maintenance'),
('2025-04-02', 'Expense', 'Billie Madison', 'Labor - Cleaning', NULL, 'Billie Madison 3 c', NULL, NULL, 600, -600, 9513, 'Bank First Acct x3897', 'Labor - Cleaning'),
('2025-04-03', 'Expense', 'Holcomb Bank', NULL, NULL, 'Columbus Loan P', 'Split', NULL, 5283, -5283, 4230, 'Bank First Acct x3897', NULL),
('2025-04-08', 'Deposit', 'Airbnb', 'Rental Revenue', NULL, 'AIRBNB 4977 AI', NULL, 1310, NULL, 1310, 5539, 'Bank First Acct x3897', 'Rental Revenue'),
('2025-04-10', 'Expense', 'Billie Madison', 'Capital One CC', NULL, 'Billie Madison 3 c', NULL, NULL, 600, -600, 4939, 'Bank First Acct x3897', NULL),
('2025-04-11', 'Expense', 'TJ Mosley', NULL, NULL, 'TJ maint columbu', 'Split', NULL, 700, -700, 4239, 'Bank First Acct x3897', NULL),
('2025-04-14', 'Expense', 'SHARPNACK BIGLEY', 'Repairs & maintenance', NULL, 'SHARPNACK BIG', NULL, NULL, 1491, -1491, 2748, 'Bank First Acct x3897', 'Repairs & maintenance'),
('2025-04-14', 'Deposit', 'Airbnb', 'Rental Revenue', NULL, 'AIRBNB 4977 AI', NULL, 3880, NULL, 3880, 6628, 'Bank First Acct x3897', 'Rental Revenue'),
('2025-04-15', 'Expense', 'Billie Madison', 'Labor - Cleaning', NULL, 'Billie Madison 3 c', NULL, NULL, 600, -600, 6028, 'Bank First Acct x3897', 'Labor - Cleaning'),
('2025-04-16', 'Expense', 'TJ Mosley', 'Repairs & maintenance', NULL, 'TJ maint columbu', NULL, NULL, 565, -565, 5463, 'Bank First Acct x3897', 'Repairs & maintenance'),
('2025-04-17', 'Deposit', 'Airbnb', 'Rental Revenue', NULL, 'AIRBNB 4977 AI', NULL, 1746, NULL, 1746, 7209, 'Bank First Acct x3897', 'Rental Revenue'),
('2025-04-18', 'Deposit', 'Airbnb', 'Rental Revenue', NULL, 'AIRBNB 4977 AI', NULL, 1455, NULL, 1455, 8664, 'Bank First Acct x3897', 'Rental Revenue'),
('2025-04-23', 'Expense', 'Billie Madison', 'Labor - Cleaning', NULL, 'Billie Madison 3 c', NULL, NULL, 300, -300, 8364, 'Bank First Acct x3897', 'Labor - Cleaning'),
('2025-04-30', 'Expense', 'TJ Mosley', 'Repairs & maintenance', NULL, 'TJ maint columbu', NULL, NULL, 966, -966, 7399, 'Bank First Acct x3897', 'Repairs & maintenance'),
('2025-04-30', 'Expense', 'Billie Madison', 'Labor - Cleaning', NULL, 'Billie Madison 3 c', NULL, NULL, 600, -600, 6799, 'Bank First Acct x3897', 'Labor - Cleaning'),
('2025-05-01', 'Deposit', 'Airbnb', 'Rental Revenue', NULL, 'AIRBNB 4977 AI', NULL, 1261, NULL, 1261, 8060, 'Bank First Acct x3897', 'Rental Revenue'),
('2025-05-01', 'Expense', NULL, 'Disposal & waste fees', NULL, 'Monthly Trash TJ', NULL, NULL, 100, -100, 7960, 'Bank First Acct x3897', 'Disposal & waste fees'),
('2025-05-02', 'Expense', 'Holcomb Bank', NULL, NULL, 'Columbus Loan P', 'Split', NULL, 5283, -5283, 2677, 'Bank First Acct x3897', NULL),
('2025-05-08', 'Expense', 'Billie Madison', 'Labor - Cleaning', NULL, 'Billie Madison 3 c', NULL, NULL, 300, -300, 2377, 'Bank First Acct x3897', 'Labor - Cleaning'),
('2025-05-08', 'Expense', 'TJ Mosley', 'Repairs & maintenance', NULL, 'TJ maint columbu', NULL, NULL, 263, -263, 2114, 'Bank First Acct x3897', 'Repairs & maintenance'),
('2025-05-14', 'Transfer', NULL, NULL, NULL, '117744460 BusiTerra2 Vacation R', NULL, 3000, NULL, 3000, 5114, 'Bank First Acct x3897', NULL),
('2025-05-14', 'Expense', 'Billie Madison', 'Labor - Cleaning', NULL, 'Billie Madison 3 c', NULL, NULL, 600, -600, 4514, 'Bank First Acct x3897', 'Labor - Cleaning'),
('2025-05-14', 'Expense', 'TJ Mosley', 'Repairs & maintenance', NULL, 'TJ maint columbu', NULL, NULL, 503, -503, 4011, 'Bank First Acct x3897', 'Repairs & maintenance'),
('2025-05-21', 'Expense', 'TJ Mosley', 'Repairs & maintenance', NULL, 'TJ maint columbu', NULL, NULL, 497, -497, 3514, 'Bank First Acct x3897', 'Repairs & maintenance'),
('2025-05-21', 'Expense', 'Billie Madison', 'Labor - Cleaning', NULL, 'Billie Madison 3 c', NULL, NULL, 300, -300, 3214, 'Bank First Acct x3897', 'Labor - Cleaning'),
('2025-05-23', 'Deposit', 'Airbnb', 'Rental Revenue', 'Nancy Sanchez', 'Rental Revenue', NULL, 1649, NULL, 1649, 4863, 'Bank First Acct x3897', 'Rental Revenue'),
('2025-05-27', 'Deposit', 'Airbnb', 'Rental Revenue', 'John Cordrey', 'Rental Revenue', NULL, 3880, NULL, 3880, 8743, 'Bank First Acct x3897', 'Rental Revenue'),
('2025-05-29', 'Expense', 'TJ Mosley', 'Repairs & maintenance', NULL, 'TJ maint columbu', NULL, NULL, 578, -578, 8165, 'Bank First Acct x3897', 'Repairs & maintenance'),
('2025-05-29', 'Expense', 'Billie Madison', 'Labor - Cleaning', NULL, 'Billie Madison 3 c', NULL, NULL, 900, -900, 7265, 'Bank First Acct x3897', 'Labor - Cleaning'),
('2025-05-29', 'Deposit', 'Airbnb', 'Rental Revenue', 'Linda Sears', 'Rental Revenue', NULL, 2328, NULL, 2328, 9593, 'Bank First Acct x3897', 'Rental Revenue'),
('2025-05-30', 'Transfer', NULL, NULL, NULL, '115250968 BusiTerra2 Vacation R', NULL, 5000, NULL, 5000, 14593, 'Bank First Acct x3897', NULL),
('2025-05-30', 'Expense', 'TJ Mosley', 'Disposal & waste fees', NULL, 'Monthly Trash TJ', NULL, NULL, 100, -100, 14493, 'Bank First Acct x3897', 'Disposal & waste fees'),
('2025-06-02', 'Expense', NULL, 'Bank fees & service charges', NULL, 'IC FEE BARTHLM', NULL, NULL, 1, -1, 14492, 'Bank First Acct x3897', 'Bank fees & service charges'),
('2025-06-02', 'Expense', 'Eastern Bartholomew Water', 'Property taxes', NULL, 'BARTHOLOMEW', NULL, NULL, 6371, -6371, 8121, 'Bank First Acct x3897', 'Property taxes'),
('2025-06-03', 'Expense', 'Holcomb Bank', NULL, NULL, 'Columbus Loan P', 'Split', NULL, 5283, -5283, 2838, 'Bank First Acct x3897', NULL),
('2025-06-03', 'Journal Entry', '44', 'Columbus IN', 'Gina Sprague', NULL, 'Split', 7178, NULL, 7178, 10016, 'Bank First Acct x3897', NULL),
('2025-06-05', 'Expense', 'TJ Mosley', 'Repairs & maintenance', NULL, 'TJ maint columbu', NULL, NULL, 374, -374, 9643, 'Bank First Acct x3897', 'Repairs & maintenance'),
('2025-06-05', 'Expense', 'Billie Madison', 'Labor - Cleaning', NULL, 'Billie Madison 3 c', NULL, NULL, 925, -925, 8718, 'Bank First Acct x3897', 'Labor - Cleaning'),
('2025-06-11', 'Expense', 'Billie Madison', 'Labor - Cleaning', NULL, 'Billie Madison 3 c', NULL, NULL, 300, -300, 8418, 'Bank First Acct x3897', 'Labor - Cleaning'),
('2025-06-11', 'Expense', 'TJ Mosley', NULL, NULL, 'TJ Columbus $14', 'Split', NULL, 633, -633, 7785, 'Bank First Acct x3897', NULL),
('2025-06-18', 'Expense', 'Billie Madison', 'Labor - Cleaning', NULL, 'Billie Madison 3 c', NULL, NULL, 450, -450, 7335, 'Bank First Acct x3897', 'Labor - Cleaning'),
('2025-06-20', 'Expense', 'Vectren Energy', 'Utilities:Electricity', NULL, '2D VECTRENEN', NULL, NULL, 242, -242, 7093, 'Bank First Acct x3897', 'Utilities:Electricity'),
('2025-06-25', 'Expense', 'TJ Mosley', NULL, NULL, 'TJ Columbus $13', 'Split', NULL, 418, -418, 6675, 'Bank First Acct x3897', NULL),
('2025-06-25', 'Expense', 'Billie Madison', NULL, NULL, 'Billie Madison 3 c', 'Split', NULL, 800, -800, 5875, 'Bank First Acct x3897', NULL),
('2025-07-01', 'Expense', 'TJ Mosley', 'Disposal & waste fees', NULL, 'Monthly Trash TJ', NULL, NULL, 100, -100, 5775, 'Bank First Acct x3897', 'Disposal & waste fees'),
('2025-07-02', 'Expense', 'TJ Mosley', 'Repairs & maintenance', NULL, 'TJ Columbus $19', NULL, NULL, 193, -193, 5583, 'Bank First Acct x3897', 'Repairs & maintenance'),
('2025-07-07', 'Expense', 'Bank First', 'Bank fees & service charges', NULL, 'OVERDRAFT FE', NULL, NULL, 30, -30, 5553, 'Bank First Acct x3897', 'Bank fees & service charges'),
('2025-07-10', 'Expense', 'Billie Madison', 'Labor - Cleaning', NULL, 'Billie Madison 3 c', NULL, NULL, 600, -600, 4953, 'Bank First Acct x3897', 'Labor - Cleaning'),
('2025-07-10', 'Expense', 'TJ Mosley', 'Labor - Misc', NULL, 'TJ Columbus $24', NULL, NULL, 245, -245, 4708, 'Bank First Acct x3897', 'Labor - Misc'),
('2025-07-17', 'Expense', 'TJ Mosley', NULL, NULL, 'TJ Columbus $27', 'Split', NULL, 720, -720, 3987, 'Bank First Acct x3897', NULL),
('2025-07-17', 'Expense', 'Billie Madison', 'Labor - Cleaning', NULL, 'Billie Madison 3 c', NULL, NULL, 600, -600, 3387, 'Bank First Acct x3897', 'Labor - Cleaning')
ON CONFLICT DO NOTHING;

-- Create a view that matches the journal_entries structure for compatibility
CREATE OR REPLACE VIEW journal_entries AS
SELECT 
  id,
  account_name,
  transaction_date,
  debit_amount,
  credit_amount,
  amount as line_amount,
  property_class,
  memo as description,
  type,
  name as payee,
  class as category,
  created_at,
  updated_at
FROM transaction_ledger;
