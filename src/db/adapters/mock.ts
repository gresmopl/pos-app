import { mockEmployees, mockStats } from "@/data/employees";
import { mockServices } from "@/data/services";
import { mockProducts } from "@/data/products";
import { mockTransactions } from "@/data/transactions";
import type {
  DbClient,
  CreateTransactionInput,
  CreateCashMovementInput,
  CreateDailyReportInput,
  SaveServiceInput,
  SaveProductInput,
  SaveEmployeeInput,
  UpdateSalonInput,
  RegisterDeviceInput,
} from "../types";
import type {
  Employee,
  Transaction,
  Service,
  Product,
  CashMovement,
  PaymentBreakdownItem,
  Voucher,
  SalonSettings,
  DeviceRegistration,
} from "@/lib/types";

// Map Polish UI payment method names to DB enum values
const SIMPLE_METHOD_MAP: Record<string, PaymentBreakdownItem["method"]> = {
  Gotówka: "cash",
  Karta: "card",
  BLIK: "blik",
  "Bon podarunkowy": "voucher",
};

function parseLocaleNumber(s: string): number {
  return Number(s.replace(/\s/g, "").replace(",", ".")) || 0;
}

function parsePaymentInput(
  uiMethod: string,
  details: string,
  totalAmount: number
): PaymentBreakdownItem[] {
  const simple = SIMPLE_METHOD_MAP[uiMethod];
  if (simple) return [{ method: simple, amount: totalAmount }];

  if (uiMethod === "Gotówka + Karta") {
    const cashMatch = details.match(/Gotówka:\s*([\d\s,.]+)\s*zł/);
    const cashAmt = cashMatch ? parseLocaleNumber(cashMatch[1]) : 0;
    return [
      { method: "cash", amount: cashAmt },
      { method: "card", amount: totalAmount - cashAmt },
    ];
  }
  if (uiMethod === "Bon + Gotówka") {
    const bonMatch = details.match(/Bon:\s*([\d\s,.]+)\s*zł/);
    const bonAmt = bonMatch ? parseLocaleNumber(bonMatch[1]) : 0;
    return [
      { method: "voucher", amount: bonAmt },
      { method: "cash", amount: totalAmount - bonAmt },
    ];
  }
  if (uiMethod === "Bon + Karta") {
    const bonMatch = details.match(/Bon:\s*([\d\s,.]+)\s*zł/);
    const bonAmt = bonMatch ? parseLocaleNumber(bonMatch[1]) : 0;
    return [
      { method: "voucher", amount: bonAmt },
      { method: "card", amount: totalAmount - bonAmt },
    ];
  }
  if (uiMethod === "Bon + BLIK") {
    const bonMatch = details.match(/Bon:\s*([\d\s,.]+)\s*zł/);
    const bonAmt = bonMatch ? parseLocaleNumber(bonMatch[1]) : 0;
    return [
      { method: "voucher", amount: bonAmt },
      { method: "blik", amount: totalAmount - bonAmt },
    ];
  }
  return [{ method: "cash", amount: totalAmount }];
}

export function createMockClient(): DbClient {
  const mockDevices: DeviceRegistration[] = [];
  const mockMovements: CashMovement[] = [];
  const mockVouchers: Voucher[] = [];
  let mockDailyReport: { closedAt: string; floatAmount: number } | null = null;

  const mockSalon: SalonSettings = {
    id: "a0000000-0000-0000-0000-000000000001",
    name: "FORMEN DEV",
    address: "ul. Testowa 1, 00-001 Warszawa",
    phone: "+48 123 456 789",
    nip: "1234567890",
    adminPinHash: "placeholder_admin_1234",
    operationsPinHash: "placeholder_operations_1234",
    cashTolerance: 10,
    monthTarget: 600,
    voucherExpiryMonths: 12,
    voucherMinAmount: 1,
    voucherCodePrefix: "BON-",
    defaultCommissionService: 40,
    defaultCommissionProduct: 20,
    enabledPaymentMethods: ["cash", "card", "blik"],
    receiptFooter: "Dziękujemy za wizytę w FORMEN!",
    knowledgeBaseEnabled: false,
  };

  return {
    salon: {
      async get() {
        return mockSalon;
      },
      async update(input: UpdateSalonInput) {
        Object.assign(mockSalon, {
          ...input,
          enabledPaymentMethods: input.enabledPaymentMethods ?? mockSalon.enabledPaymentMethods,
        });
        return mockSalon;
      },
    },
    devices: {
      async getByDeviceId(deviceId: string) {
        return mockDevices.find((d) => d.deviceId === deviceId) ?? null;
      },
      async getAll() {
        return mockDevices;
      },
      async register(input: RegisterDeviceInput) {
        const autoApprove = input.deviceType === "admin";
        const now = new Date().toISOString();
        const device: DeviceRegistration = {
          id: crypto.randomUUID(),
          deviceId: input.deviceId,
          employeeId: input.employeeId ?? null,
          deviceType: input.deviceType,
          status: autoApprove ? "approved" : "pending",
          deviceName: input.deviceName,
          registeredAt: now,
          approvedAt: autoApprove ? now : null,
          lastSeenAt: now,
        };
        mockDevices.push(device);
        return device;
      },
      async approve(id: string) {
        const d = mockDevices.find((d) => d.id === id);
        if (d) {
          d.status = "approved";
          d.approvedAt = new Date().toISOString();
        }
      },
      async block(id: string) {
        const d = mockDevices.find((d) => d.id === id);
        if (d) d.status = "blocked";
      },
      async updateLastSeen(deviceId: string) {
        const d = mockDevices.find((d) => d.deviceId === deviceId);
        if (d) d.lastSeenAt = new Date().toISOString();
      },
    },
    employees: {
      async getAll() {
        return mockEmployees;
      },
      async getActive() {
        return mockEmployees.filter((e) => e.isActive);
      },
      async getById(id: string) {
        return mockEmployees.find((e) => e.id === id);
      },
      async create(input: SaveEmployeeInput): Promise<Employee> {
        const emp: Employee = {
          id: crypto.randomUUID(),
          name: input.name,
          avatar: input.avatarUrl || input.name.slice(0, 2).toUpperCase(),
          role: input.role || "barber",
          todayRevenue: 0,
          todayServices: 0,
          tipBalance: 0,
          commissionServicePercent: input.commissionServicePercent,
          commissionProductPercent: input.commissionProductPercent,
          isActive: true,
        };
        mockEmployees.push(emp);
        return emp;
      },
      async update(id: string, input: SaveEmployeeInput): Promise<Employee> {
        const idx = mockEmployees.findIndex((e) => e.id === id);
        if (idx === -1) throw new Error("Employee not found");
        mockEmployees[idx] = {
          ...mockEmployees[idx],
          name: input.name,
          avatar: input.avatarUrl || input.name.slice(0, 2).toUpperCase(),
          role: input.role || "barber",
          commissionServicePercent: input.commissionServicePercent,
          commissionProductPercent: input.commissionProductPercent,
        };
        return mockEmployees[idx];
      },
      async toggleActive(id: string, isActive: boolean): Promise<void> {
        const emp = mockEmployees.find((e) => e.id === id);
        if (emp) emp.isActive = isActive;
      },
    },
    stats: {
      async getDaily() {
        return mockStats;
      },
    },
    services: {
      async getAll() {
        return mockServices;
      },
      async getActive() {
        return mockServices.filter((s) => s.isActive);
      },
      async create(input: SaveServiceInput): Promise<Service> {
        const svc: Service = {
          id: crypto.randomUUID(),
          name: input.name,
          price: input.price,
          priceFrom: input.priceFrom,
          durationMinutes: input.durationMinutes,
          category: input.category || "Inne",
          description: input.description,
          descriptionLong: input.descriptionLong,
          isActive: true,
        };
        mockServices.push(svc);
        return svc;
      },
      async update(id: string, input: SaveServiceInput): Promise<Service> {
        const idx = mockServices.findIndex((s) => s.id === id);
        if (idx === -1) throw new Error("Service not found");
        mockServices[idx] = { ...mockServices[idx], ...input };
        return mockServices[idx];
      },
      async toggleActive(id: string, isActive: boolean): Promise<void> {
        const svc = mockServices.find((s) => s.id === id);
        if (svc) svc.isActive = isActive;
      },
    },
    products: {
      async getAll() {
        return mockProducts;
      },
      async getActive() {
        return mockProducts.filter((p) => p.isActive);
      },
      async create(input: SaveProductInput): Promise<Product> {
        const prod: Product = {
          id: crypto.randomUUID(),
          name: input.name,
          price: input.price,
          description: input.description,
          isActive: true,
        };
        mockProducts.push(prod);
        return prod;
      },
      async update(id: string, input: SaveProductInput): Promise<Product> {
        const idx = mockProducts.findIndex((p) => p.id === id);
        if (idx === -1) throw new Error("Product not found");
        mockProducts[idx] = { ...mockProducts[idx], ...input };
        return mockProducts[idx];
      },
      async toggleActive(id: string, isActive: boolean): Promise<void> {
        const prod = mockProducts.find((p) => p.id === id);
        if (prod) prod.isActive = isActive;
      },
    },
    transactions: {
      async getAll() {
        return mockTransactions;
      },
      async getByEmployee(employeeId: string) {
        return mockTransactions.filter((t) => t.employeeId === employeeId);
      },
      async getToday() {
        const today = new Date().toDateString();
        return mockTransactions.filter((t) => new Date(t.timestamp).toDateString() === today);
      },
      async getSince(since: string | null) {
        if (!since) return mockTransactions;
        return mockTransactions.filter((t) => t.timestamp > since);
      },
      async create(input: CreateTransactionInput): Promise<Transaction> {
        const emp = mockEmployees.find((e) => e.id === input.employeeId);
        const breakdown = parsePaymentInput(
          input.paymentMethod,
          input.paymentDetails || "",
          input.totalAmount
        );
        const paymentMethod = breakdown.length > 1 ? "split" : breakdown[0]?.method || "cash";
        const tx: Transaction = {
          id: crypto.randomUUID(),
          employeeId: input.employeeId,
          employeeName: emp?.name || "Salon",
          items: input.items.map((i) => ({ name: i.name, price: i.price, type: i.type })),
          totalAmount: input.totalAmount,
          tipAmount: input.tipAmount,
          discountAmount: input.discountAmount,
          paymentMethod: paymentMethod as Transaction["paymentMethod"],
          paymentBreakdown: breakdown,
          timestamp: new Date().toISOString(),
        };
        mockTransactions.unshift(tx);

        // Redeem voucher if paying with bon
        if (input.voucherCode && input.voucherAmount) {
          const v = mockVouchers.find((v) => v.code === input.voucherCode);
          if (v) {
            v.remainingBalance = Math.max(0, v.remainingBalance - input.voucherAmount);
            if (v.remainingBalance <= 0) v.status = "used";
          }
        }

        return tx;
      },
      async cancel(id: string): Promise<void> {
        const idx = mockTransactions.findIndex((t) => t.id === id);
        if (idx === -1) return;
        const tx = mockTransactions[idx];
        // Reverse tip
        if (tx.tipAmount > 0) {
          const emp = mockEmployees.find((e) => e.id === tx.employeeId);
          if (emp) emp.tipBalance = Math.max(0, emp.tipBalance - tx.tipAmount);
        }
        // Reverse voucher
        const voucherPart = tx.paymentBreakdown?.find((b) => b.method === "voucher");
        if (voucherPart) {
          const v = mockVouchers.find((v) => v.status === "used" || v.status === "active");
          if (v) {
            v.remainingBalance += voucherPart.amount;
            v.status = "active";
          }
        }
        // Remove from list (mock doesn't have status field)
        mockTransactions.splice(idx, 1);
      },
    },
    cashMovements: {
      async getToday(): Promise<CashMovement[]> {
        return mockMovements;
      },
      async getSince(since: string | null): Promise<CashMovement[]> {
        if (!since) return mockMovements;
        return mockMovements.filter((m) => m.timestamp > since);
      },
      async create(input: CreateCashMovementInput): Promise<CashMovement> {
        const emp = input.employeeId ? mockEmployees.find((e) => e.id === input.employeeId) : null;
        let employeeName = "Salon";
        if (emp) employeeName = emp.name;
        else if (input.type === "top_up") employeeName = "Szef";

        if (input.type === "tip_withdrawal" && emp) {
          emp.tipBalance = Math.max(0, emp.tipBalance - input.amount);
        }
        if (input.type === "own_cash_deposit" && emp) {
          emp.tipBalance += input.amount;
        }
        if (input.type === "voucher_sale" && input.voucherCode) {
          mockVouchers.push({
            id: crypto.randomUUID(),
            code: input.voucherCode,
            initialValue: input.amount,
            remainingBalance: input.amount,
            status: "active",
            expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date().toISOString(),
          });
        }

        const movement: CashMovement = {
          id: crypto.randomUUID(),
          type: input.type,
          employeeName,
          amount: input.amount,
          description: input.description,
          timestamp: new Date().toISOString(),
          status: input.status,
          paymentMethod: input.paymentMethod,
        };
        mockMovements.unshift(movement);
        return movement;
      },
      async updateStatus(id: string, status: "settled", finalCost?: number): Promise<void> {
        const m = mockMovements.find((m) => m.id === id);
        if (m) {
          m.status = status;
          if (finalCost !== undefined) m.finalCost = finalCost;
        }
      },
    },
    dailyReports: {
      async create(input: CreateDailyReportInput): Promise<void> {
        mockDailyReport = { closedAt: new Date().toISOString(), floatAmount: input.floatAmount };
      },
      async getToday(): Promise<{ closedAt: string } | null> {
        return mockDailyReport;
      },
      async getLastClosedAt(): Promise<string | null> {
        return mockDailyReport?.closedAt ?? null;
      },
      async getLastFloat(): Promise<number> {
        return mockDailyReport?.floatAmount ?? 0;
      },
    },
    vouchers: {
      async getByCode(code: string): Promise<Voucher | null> {
        const v = mockVouchers.find((v) => v.code === code);
        return v ?? null;
      },
      async redeem(id: string, amount: number): Promise<void> {
        const v = mockVouchers.find((v) => v.id === id);
        if (v) {
          v.remainingBalance = Math.max(0, v.remainingBalance - amount);
          if (v.remainingBalance <= 0) v.status = "used";
        }
      },
    },
  };
}
