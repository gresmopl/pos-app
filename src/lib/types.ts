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
  category: string;
  isActive: boolean;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
}

export interface TransactionItem {
  name: string;
  price: number;
  type: "service" | "product" | "voucher_sale";
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
    | "voucher_sale";
  employeeName: string;
  amount: number;
  description: string;
  timestamp: string;
  status?: "pending" | "settled";
  finalCost?: number;
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
