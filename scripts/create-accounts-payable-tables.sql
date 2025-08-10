-- Accounts Payable Tables

-- Vendor information
CREATE TABLE IF NOT EXISTS ap_vendors (
  id SERIAL PRIMARY KEY,
  vendor_name VARCHAR(200) NOT NULL,
  vendor_type VARCHAR(50) DEFAULT 'service', -- service, supplier, contractor, utility, other
  category VARCHAR(100), -- maintenance, utilities, insurance, professional_services, etc.
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  billing_address TEXT,
  payment_terms INTEGER DEFAULT 30, -- days
  tax_id VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- A/P Bill headers
CREATE TABLE IF NOT EXISTS ap_bills (
  id SERIAL PRIMARY KEY,
  bill_number VARCHAR(100),
  vendor_id INTEGER REFERENCES ap_vendors(id) ON DELETE CASCADE,
  property_class VARCHAR(100),
  bill_date DATE NOT NULL,
  due_date DATE NOT NULL,
  bill_amount DECIMAL(15,2) NOT NULL,
  paid_amount DECIMAL(15,2) DEFAULT 0,
  balance_due DECIMAL(15,2) GENERATED ALWAYS AS (bill_amount - paid_amount) STORED,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'paid', 'partial', 'cancelled')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- A/P Bill line items
CREATE TABLE IF NOT EXISTS ap_bill_lines (
  id SERIAL PRIMARY KEY,
  bill_id INTEGER REFERENCES ap_bills(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) DEFAULT 1,
  unit_cost DECIMAL(15,2) NOT NULL,
  line_amount DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  account_name VARCHAR(200), -- links to expense account
  property_class VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- A/P Payments made
CREATE TABLE IF NOT EXISTS ap_payments (
  id SERIAL PRIMARY KEY,
  payment_number VARCHAR(100),
  vendor_id INTEGER REFERENCES ap_vendors(id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,
  payment_amount DECIMAL(15,2) NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'check', -- check, ach, credit_card, wire
  check_number VARCHAR(50),
  reference_number VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- A/P Payment applications (which bills were paid)
CREATE TABLE IF NOT EXISTS ap_payment_applications (
  id SERIAL PRIMARY KEY,
  payment_id INTEGER REFERENCES ap_payments(id) ON DELETE CASCADE,
  bill_id INTEGER REFERENCES ap_bills(id) ON DELETE CASCADE,
  applied_amount DECIMAL(15,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert sample vendors
INSERT INTO ap_vendors (vendor_name, vendor_type, category, contact_email, payment_terms) VALUES
('Property Maintenance Co', 'contractor', 'Maintenance', 'billing@propmaint.com', 30),
('Utility Services Inc', 'utility', 'Utilities', 'billing@utilityservices.com', 15),
('Insurance Partners LLC', 'service', 'Insurance', 'billing@insurancepartners.com', 30),
('Legal Services Group', 'service', 'Professional Services', 'billing@legalservices.com', 30),
('Cleaning Solutions Pro', 'contractor', 'Maintenance', 'billing@cleaningsolutions.com', 30),
('Security Systems Ltd', 'service', 'Security', 'billing@securitysystems.com', 30),
('Landscaping Experts', 'contractor', 'Landscaping', 'billing@landscapingexperts.com', 30),
('Office Supplies Direct', 'supplier', 'Office Supplies', 'billing@officesupplies.com', 30)
ON CONFLICT DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_ap_bills_vendor ON ap_bills(vendor_id);
CREATE INDEX IF NOT EXISTS idx_ap_bills_date ON ap_bills(bill_date);
CREATE INDEX IF NOT EXISTS idx_ap_bills_due_date ON ap_bills(due_date);
CREATE INDEX IF NOT EXISTS idx_ap_bills_property ON ap_bills(property_class);
CREATE INDEX IF NOT EXISTS idx_ap_bills_status ON ap_bills(status);
CREATE INDEX IF NOT EXISTS idx_ap_payments_vendor ON ap_payments(vendor_id);
CREATE INDEX IF NOT EXISTS idx_ap_payments_date ON ap_payments(payment_date);
