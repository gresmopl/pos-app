import type {
  Employee,
  Service,
  Product,
  Transaction,
  TransactionItem,
  CashMovement,
  SalonSettings,
} from "@/lib/types";

export function mapEmployee(row: Record<string, unknown>): Employee {
  return {
    id: row.id as string,
    name: row.name as string,
    avatar: (row.avatar_url as string) || (row.name as string).slice(0, 2).toUpperCase(),
    role: row.role as "admin" | "barber",
    todayRevenue: 0,
    todayServices: 0,
    tipBalance: Number(row.tip_balance) || 0,
    commissionServicePercent: Number(row.commission_service_percent) || 0,
    commissionProductPercent: Number(row.commission_product_percent) || 0,
    retentionPercent: row.retention_percent != null ? Number(row.retention_percent) : null,
    isActive: row.is_active as boolean,
  };
}

export function mapService(row: Record<string, unknown>): Service {
  return {
    id: row.id as string,
    name: row.name as string,
    price: Number(row.price),
    priceFrom: (row.price_from as boolean) || false,
    description: (row.description as string) || undefined,
    displayOrder: Number(row.display_order) || 0,
    isActive: row.is_active as boolean,
  };
}

export function mapProduct(row: Record<string, unknown>): Product {
  return {
    id: row.id as string,
    name: row.name as string,
    price: Number(row.price),
    description: (row.description as string) || undefined,
    isActive: row.is_active as boolean,
  };
}

export function mapTransaction(
  row: Record<string, unknown>,
  items: TransactionItem[],
  employeeName: string
): Transaction {
  const discountType = row.discount_type as string | null;
  const discountValue = Number(row.discount_value) || 0;
  let discountAmount = 0;
  if (discountType === "amount") {
    discountAmount = discountValue;
  } else if (discountType === "percentage" && discountValue > 0) {
    const subtotal = items.reduce((sum, item) => sum + item.price, 0);
    discountAmount = Math.round(subtotal * (discountValue / 100) * 100) / 100;
  }

  return {
    id: row.id as string,
    employeeId: (row.employee_id as string) || "",
    employeeName,
    clientName: (row.client_name as string) || undefined,
    items,
    totalAmount: Number(row.total_amount),
    tipAmount: Number(row.tip_amount) || 0,
    discountAmount,
    timestamp: row.date as string,
  };
}

export function mapCashMovement(row: Record<string, unknown>, employeeName: string): CashMovement {
  return {
    id: row.id as string,
    type: row.reason as CashMovement["type"],
    employeeName,
    amount: Number(row.amount),
    description: (row.description as string) || "",
    timestamp: row.created_at as string,
    status: (row.status as CashMovement["status"]) || undefined,
    finalCost: row.final_cost != null ? Number(row.final_cost) : undefined,
  };
}

export function mapSalon(row: Record<string, unknown>): SalonSettings {
  return {
    id: row.id as string,
    name: row.name as string,
    adminPinHash: (row.admin_pin_hash as string) || "",
    operationsPinHash: (row.operations_pin_hash as string) || "",
    cashTolerance: row.cash_tolerance != null ? Number(row.cash_tolerance) : 10,
    monthTarget: row.month_target != null ? Number(row.month_target) : 600,
    defaultCommissionService:
      row.default_commission_service != null ? Number(row.default_commission_service) : 40,
    defaultCommissionProduct:
      row.default_commission_product != null ? Number(row.default_commission_product) : 20,
  };
}
