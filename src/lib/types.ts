// Domain types - central type definitions for the FORMEN POS app.
// Component-specific Props interfaces stay local to their components.

export interface Employee {
  id: string;
  name: string;
  avatar: string;
  role: "admin" | "barber";
  status?: "available" | "busy" | "break";
  todayRevenue: number;
  todayServices: number;
  tipBalance: number;
  commissionServicePercent: number;
  commissionProductPercent: number;
  isActive: boolean;
}

export interface DailyStats {
  todayServices: number;
  yesterdayServices: number;
  monthServices: number;
  monthTarget: number;
  yearServices: number;
  lastYearServices: number;
  allTimeRecord: number;
}

export interface Service {
  id: string;
  name: string;
  price: number;
  priceFrom?: boolean;
  durationMinutes?: string;
  category: string;
  description?: string;
  descriptionLong?: string;
  isActive: boolean;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  description?: string;
  isActive: boolean;
}

export interface TransactionItem {
  name: string;
  price: number;
  type: "service" | "product" | "voucher_sale";
}

export interface PaymentBreakdownItem {
  method: "cash" | "card" | "blik" | "voucher";
  amount: number;
}

export interface Transaction {
  id: string;
  employeeId: string;
  employeeName: string;
  clientName?: string;
  items: TransactionItem[];
  totalAmount: number;
  tipAmount: number;
  discountAmount: number;
  paymentMethod: "cash" | "card" | "blik" | "voucher" | "split";
  paymentBreakdown?: PaymentBreakdownItem[];
  timestamp: string;
}

export interface CashMovement {
  id: string;
  type:
    | "tip_withdrawal"
    | "expense_take"
    | "expense_settle"
    | "top_up"
    | "barber_loan"
    | "barber_payback"
    | "voucher_sale"
    | "shift_close"
    | "float";
  employeeName: string;
  amount: number;
  description: string;
  timestamp: string;
  status?: "pending" | "settled";
  finalCost?: number;
  paymentMethod?: string;
}

export interface Voucher {
  id: string;
  code: string;
  initialValue: number;
  remainingBalance: number;
  status: "active" | "used" | "expired";
  expiresAt: string;
  createdAt: string;
}

export interface CartItem {
  cartId: string;
  id: string;
  name: string;
  price: number;
  quantity: number;
  type: "service" | "product";
}

export interface DiscountState {
  type: "percent" | "amount";
  value: number;
}
