import type {
  Employee,
  DailyStats,
  Service,
  Product,
  Transaction,
  CashMovement,
  CartItem,
  DiscountState,
  Voucher,
  SalonSettings,
  DeviceRegistration,
  DailyReportSummary,
  TerminalCheck,
} from "@/lib/types";

export interface SaveEmployeeInput {
  name: string;
  avatarUrl?: string;
  role?: "admin" | "barber";
  commissionServicePercent: number;
  commissionProductPercent: number;
  retentionPercent?: number | null;
}

export interface SaveServiceInput {
  name: string;
  price: number;
  priceFrom?: boolean;
  description?: string;
  displayOrder?: number;
}

export interface SaveProductInput {
  name: string;
  price: number;
  description?: string;
}

export interface CreateCashMovementInput {
  type: CashMovement["type"];
  employeeId?: string;
  amount: number;
  description: string;
  status?: "pending" | "settled";
  voucherCode?: string;
}

export interface CreateDailyReportInput {
  closingEmployeeId: string;
  expectedCash: number;
  actualCash: number;
  terminalAmount: number;
  expectedVouchers: number;
  actualVouchersValue: number;
  floatAmount: number;
  depositAmount: number;
  difference: number;
  voucherDifference: number;
}

export interface CreateTerminalCheckInput {
  terminalAmount: number;
  expectedCash: number;
  calculatedCash: number;
  txCount: number;
}

export interface CreateTransactionInput {
  employeeId: string;
  clientId?: string;
  items: CartItem[];
  tipAmount: number;
  discount: DiscountState | null;
  discountAmount: number;
  totalAmount: number;
}

export interface RegisterDeviceInput {
  deviceId: string;
  deviceName: string;
  deviceType: "personal" | "station" | "admin";
  employeeId?: string;
}

export interface UpdateSalonInput {
  name?: string;
  adminPinHash?: string;
  operationsPinHash?: string;
  cashTolerance?: number;
  monthTarget?: number;
  defaultCommissionService?: number;
  defaultCommissionProduct?: number;
  retentionThresholdTop?: number;
  retentionThresholdHigh?: number;
  retentionThresholdMid?: number;
}

export interface DbClient {
  salon: {
    get(): Promise<SalonSettings>;
    update(input: UpdateSalonInput): Promise<SalonSettings>;
  };
  devices: {
    getByDeviceId(deviceId: string): Promise<DeviceRegistration | null>;
    getAll(): Promise<DeviceRegistration[]>;
    register(input: RegisterDeviceInput): Promise<DeviceRegistration>;
    approve(id: string): Promise<void>;
    block(id: string): Promise<void>;
    updateLastSeen(deviceId: string): Promise<void>;
  };
  employees: {
    getAll(): Promise<Employee[]>;
    getActive(): Promise<Employee[]>;
    getById(id: string): Promise<Employee | undefined>;
    create(input: SaveEmployeeInput): Promise<Employee>;
    update(id: string, input: SaveEmployeeInput): Promise<Employee>;
    toggleActive(id: string, isActive: boolean): Promise<void>;
  };
  stats: {
    getDaily(): Promise<DailyStats>;
  };
  services: {
    getAll(): Promise<Service[]>;
    getActive(): Promise<Service[]>;
    create(input: SaveServiceInput): Promise<Service>;
    update(id: string, input: SaveServiceInput): Promise<Service>;
    toggleActive(id: string, isActive: boolean): Promise<void>;
  };
  products: {
    getAll(): Promise<Product[]>;
    getActive(): Promise<Product[]>;
    create(input: SaveProductInput): Promise<Product>;
    update(id: string, input: SaveProductInput): Promise<Product>;
    toggleActive(id: string, isActive: boolean): Promise<void>;
  };
  transactions: {
    getAll(): Promise<Transaction[]>;
    getByEmployee(employeeId: string): Promise<Transaction[]>;
    getToday(): Promise<Transaction[]>;
    getSince(since: string | null): Promise<Transaction[]>;
    create(input: CreateTransactionInput): Promise<Transaction>;
    cancel(id: string): Promise<void>;
  };
  cashMovements: {
    getToday(): Promise<CashMovement[]>;
    getSince(since: string | null): Promise<CashMovement[]>;
    create(input: CreateCashMovementInput): Promise<CashMovement>;
    updateStatus(id: string, status: "settled", finalCost?: number): Promise<void>;
  };
  vouchers: {
    getByCode(code: string): Promise<Voucher | null>;
    redeem(id: string, amount: number): Promise<void>;
  };
  dailyReports: {
    create(input: CreateDailyReportInput): Promise<void>;
    getToday(): Promise<{ closedAt: string } | null>;
    getLastClosedAt(): Promise<string | null>;
    getLastFloat(): Promise<number>;
    getRecent(limit: number): Promise<DailyReportSummary[]>;
  };
  terminalChecks: {
    create(input: CreateTerminalCheckInput): Promise<TerminalCheck>;
    getSince(since: string | null): Promise<TerminalCheck[]>;
  };
}
