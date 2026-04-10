-- FORMEN POS - Database Schema
-- Target: Supabase DEV (PostgreSQL 16)
-- Phase 2: initial schema, no migrations yet

-- ============================================
-- EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- ENUMS
-- ============================================
CREATE TYPE employee_role AS ENUM ('admin', 'barber');
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'blik', 'voucher', 'split');
CREATE TYPE transaction_status AS ENUM ('completed', 'cancelled');
CREATE TYPE discount_type AS ENUM ('percentage', 'amount');
CREATE TYPE transaction_item_type AS ENUM ('service', 'product', 'voucher_sale');
CREATE TYPE voucher_status AS ENUM ('active', 'used', 'expired');
CREATE TYPE cash_movement_direction AS ENUM ('in', 'out');
CREATE TYPE cash_movement_reason AS ENUM (
  'tip_withdrawal', 'expense_take', 'expense_settle',
  'top_up', 'barber_loan', 'barber_payback',
  'voucher_sale', 'shift_close', 'float'
);
CREATE TYPE expense_status AS ENUM ('pending', 'settled');
CREATE TYPE device_type AS ENUM ('personal', 'station', 'admin');
CREATE TYPE device_status AS ENUM ('pending', 'approved', 'blocked');

-- ============================================
-- SALON
-- ============================================
CREATE TABLE salon (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  address TEXT,
  admin_pin_hash VARCHAR(255),
  operations_pin_hash VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- EMPLOYEE
-- ============================================
CREATE TABLE employee (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salon(id),
  name VARCHAR(100) NOT NULL,
  avatar_url VARCHAR(500),
  role employee_role NOT NULL DEFAULT 'barber',
  pin_hash VARCHAR(255),
  commission_service_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  commission_product_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  tip_balance NUMERIC(10,2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_employee_salon ON employee(salon_id);
CREATE INDEX idx_employee_active ON employee(salon_id, is_active);

-- ============================================
-- SERVICE
-- ============================================
CREATE TABLE service (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salon(id),
  name VARCHAR(200) NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  price_from BOOLEAN NOT NULL DEFAULT false,
  duration_minutes VARCHAR(20),
  category VARCHAR(100),
  description TEXT,
  description_long TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_service_salon ON service(salon_id);
CREATE INDEX idx_service_active ON service(salon_id, is_active);

-- ============================================
-- PRODUCT
-- ============================================
CREATE TABLE product (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salon(id),
  name VARCHAR(200) NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_salon ON product(salon_id);
CREATE INDEX idx_product_active ON product(salon_id, is_active);

-- ============================================
-- CLIENT
-- ============================================
CREATE TABLE client (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salon(id),
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_salon ON client(salon_id);

-- ============================================
-- VOUCHER
-- ============================================
CREATE TABLE voucher (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salon(id),
  code VARCHAR(20) NOT NULL UNIQUE,
  initial_value NUMERIC(10,2) NOT NULL,
  remaining_balance NUMERIC(10,2) NOT NULL,
  status voucher_status NOT NULL DEFAULT 'active',
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '12 months'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_voucher_salon ON voucher(salon_id);
CREATE INDEX idx_voucher_code ON voucher(code);

-- ============================================
-- TRANSACTION
-- ============================================
CREATE TABLE transaction (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salon(id),
  employee_id UUID REFERENCES employee(id),
  client_id UUID REFERENCES client(id),
  device_id UUID,
  date TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_amount NUMERIC(10,2) NOT NULL,
  tip_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  discount_type discount_type,
  discount_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  status transaction_status NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_transaction_salon ON transaction(salon_id);
CREATE INDEX idx_transaction_employee ON transaction(employee_id);
CREATE INDEX idx_transaction_date ON transaction(salon_id, date);

-- ============================================
-- TRANSACTION ITEM
-- ============================================
CREATE TABLE transaction_item (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES transaction(id) ON DELETE CASCADE,
  type transaction_item_type NOT NULL,
  item_id UUID,
  name VARCHAR(200) NOT NULL,
  price_at_sale NUMERIC(10,2) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  commission_amount NUMERIC(10,2) NOT NULL DEFAULT 0
);

CREATE INDEX idx_transaction_item_tx ON transaction_item(transaction_id);

-- ============================================
-- PAYMENT DETAIL
-- ============================================
CREATE TABLE payment_detail (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES transaction(id) ON DELETE CASCADE,
  method payment_method NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  voucher_id UUID REFERENCES voucher(id)
);

CREATE INDEX idx_payment_detail_tx ON payment_detail(transaction_id);

-- ============================================
-- CASH MOVEMENT
-- ============================================
CREATE TABLE cash_movement (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salon(id),
  direction cash_movement_direction NOT NULL,
  reason cash_movement_reason NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  employee_id UUID REFERENCES employee(id),
  description TEXT,
  status VARCHAR(20),
  final_cost NUMERIC(10,2),
  payment_method VARCHAR(20),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cash_movement_salon ON cash_movement(salon_id);
CREATE INDEX idx_cash_movement_date ON cash_movement(salon_id, created_at);

-- ============================================
-- EXPENSE (two-step: take + settle)
-- ============================================
CREATE TABLE expense (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salon(id),
  employee_id UUID NOT NULL REFERENCES employee(id),
  initial_amount NUMERIC(10,2) NOT NULL,
  final_cost NUMERIC(10,2),
  description TEXT,
  status expense_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  settled_at TIMESTAMPTZ
);

CREATE INDEX idx_expense_salon ON expense(salon_id);
CREATE INDEX idx_expense_status ON expense(salon_id, status);

-- ============================================
-- TIP WITHDRAWAL
-- ============================================
CREATE TABLE tip_withdrawal (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID NOT NULL REFERENCES employee(id),
  amount NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_tip_withdrawal_employee ON tip_withdrawal(employee_id);

-- ============================================
-- DAILY REPORT (shift close)
-- ============================================
CREATE TABLE daily_report (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salon(id),
  date DATE NOT NULL,
  closing_employee_id UUID NOT NULL REFERENCES employee(id),
  expected_cash NUMERIC(10,2) NOT NULL DEFAULT 0,
  actual_cash NUMERIC(10,2) NOT NULL DEFAULT 0,
  actual_vouchers_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  float_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  deposit_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  difference NUMERIC(10,2) NOT NULL DEFAULT 0,
  expected_vouchers NUMERIC(10,2) NOT NULL DEFAULT 0,
  voucher_difference NUMERIC(10,2) NOT NULL DEFAULT 0,
  closed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_daily_report_salon ON daily_report(salon_id);
CREATE INDEX idx_daily_report_date ON daily_report(salon_id, date);

-- ============================================
-- DEVICE REGISTRATION
-- ============================================
CREATE TABLE device_registration (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  device_id UUID NOT NULL UNIQUE DEFAULT uuid_generate_v4(),
  salon_id UUID NOT NULL REFERENCES salon(id),
  employee_id UUID REFERENCES employee(id),
  device_type device_type NOT NULL DEFAULT 'personal',
  status device_status NOT NULL DEFAULT 'pending',
  device_name VARCHAR(100),
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE INDEX idx_device_salon ON device_registration(salon_id);
CREATE INDEX idx_device_status ON device_registration(salon_id, status);

-- ============================================
-- TIP BALANCE (atomic increment/decrement)
-- ============================================
CREATE OR REPLACE FUNCTION increment_tip_balance(emp_id UUID, delta NUMERIC)
RETURNS void AS $$
BEGIN
  UPDATE employee
  SET tip_balance = GREATEST(0, tip_balance + delta)
  WHERE id = emp_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_salon_updated_at
  BEFORE UPDATE ON salon FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_employee_updated_at
  BEFORE UPDATE ON employee FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_service_updated_at
  BEFORE UPDATE ON service FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_product_updated_at
  BEFORE UPDATE ON product FOR EACH ROW EXECUTE FUNCTION update_updated_at();
