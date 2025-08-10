-- Accounts Receivable Tables

-- Customer/Tenant information
CREATE TABLE IF NOT EXISTS ar_customers (
  id SERIAL PRIMARY KEY,
  customer_name VARCHAR(200) NOT NULL,
  customer_type VARCHAR(50) DEFAULT 'tenant', -- tenant, management_company, other
  property_class VARCHAR(100),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  billing_address TEXT,
  payment_terms INTEGER DEFAULT 30, -- days
  credit_limit DECIMAL(15,2),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- A/R Invoice headers
CREATE TABLE IF NOT EXISTS ar_invoices (
  id SERIAL PRIMARY KEY,
  invoice_number VARCHAR(100) NOT NULL UNIQUE,
  customer_id INTEGER REFERENCES ar_customers(id) ON DELETE CASCADE,
  property_class VARCHAR(100),
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  invoice_amount DECIMAL(15,2) NOT NULL,
  paid_amount DECIMAL(15,2) DEFAULT 0,
  balance_due DECIMAL(15,2) GENERATED ALWAYS AS (invoice_amount - paid_amount) STORED,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'paid', 'partial', 'cancelled')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- A/R Invoice line items
CREATE TABLE IF NOT EXISTS ar_invoice_lines (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER REFERENCES ar_invoices(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit_price DECIMAL(15,2) NOT NULL,
  line_amount DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  account_name VARCHAR(200), -- links to revenue account
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- A/R Payments received
CREATE TABLE IF NOT EXISTS ar_payments (
  id SERIAL PRIMARY KEY,
  payment_number VARCHAR(100),
  customer_id INTEGER REFERENCES ar_customers(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,
  payment_amount DECIMAL(15,2) NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'check', -- check, ach, credit_card, cash, wire
  reference_number VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- A/R Payment applications (which invoices were paid)
CREATE TABLE IF NOT EXISTS ar_payment_applications (
  id SERIAL PRIMARY KEY,
  payment_id INTEGER REFERENCES ar_payments(id) ON DELETE CASCADE,
  invoice_id INTEGER REFERENCES ar_invoices(id) ON DELETE CASCADE,
  applied_amount DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample customers
INSERT INTO ar_customers (customer_name, customer_type, property_class, contact_email, payment_terms) VALUES
('Cleveland Property Management', 'management_company', 'Cleveland', 'billing@clevelandpm.com', 30),
('Detroit Holdings LLC', 'tenant', 'Detroit', 'payments@detroitholdings.com', 30),
('Columbus Investment Group', 'tenant', 'Columbus IN', 'ar@columbusinvest.com', 30),
('Rockford Real Estate', 'management_company', 'Rockford', 'billing@rockfordre.com', 30),
('Wesley Property Co', 'tenant', 'Wesley', 'payments@wesleyprop.com', 30),
('Pine Terrace Management', 'management_company', 'Pine Terrace', 'billing@pineterrace.com', 30),
('Terraview Investments', 'tenant', 'Terraview', 'ar@terraview.com', 30),
('Lisbon Property Group', 'tenant', 'Lisbon', 'payments@lisbonprop.com', 30)
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ar_invoices_customer ON ar_invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_ar_invoices_date ON ar_invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_ar_invoices_due_date ON ar_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_ar_invoices_property ON ar_invoices(property_class);
CREATE INDEX IF NOT EXISTS idx_ar_invoices_status ON ar_invoices(status);
CREATE INDEX IF NOT EXISTS idx_ar_payments_customer ON ar_payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_ar_payments_date ON ar_payments(payment_date);
