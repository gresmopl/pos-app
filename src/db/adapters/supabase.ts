import { createClient } from "@supabase/supabase-js";
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
import type { DbConfig } from "../config";
import type {
  Employee,
  DailyStats,
  Service,
  Product,
  Transaction,
  TransactionItem,
  CashMovement,
  PaymentBreakdownItem,
  Voucher,
  SalonSettings,
  DeviceRegistration,
} from "@/lib/types";

export function createSupabaseClient(config: DbConfig): DbClient {
  const { supabaseUrl, supabaseAnonKey } = config;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase URL and Anon Key are required. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
    );
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Hardcoded salon ID for dev (single salon)
  const SALON_ID = "a0000000-0000-0000-0000-000000000001";

  function mapEmployee(row: Record<string, unknown>): Employee {
    return {
      id: row.id as string,
      name: row.name as string,
      avatar: (row.avatar_url as string) || (row.name as string).slice(0, 2).toUpperCase(),
      role: row.role as "admin" | "barber",
      todayRevenue: 0, // calculated separately
      todayServices: 0,
      tipBalance: Number(row.tip_balance) || 0,
      commissionServicePercent: Number(row.commission_service_percent) || 0,
      commissionProductPercent: Number(row.commission_product_percent) || 0,
      isActive: row.is_active as boolean,
    };
  }

  function mapService(row: Record<string, unknown>): Service {
    return {
      id: row.id as string,
      name: row.name as string,
      price: Number(row.price),
      priceFrom: (row.price_from as boolean) || false,
      durationMinutes: (row.duration_minutes as string) || undefined,
      category: (row.category as string) || "",
      description: (row.description as string) || undefined,
      descriptionLong: (row.description_long as string) || undefined,
      isActive: row.is_active as boolean,
    };
  }

  function mapProduct(row: Record<string, unknown>): Product {
    return {
      id: row.id as string,
      name: row.name as string,
      price: Number(row.price),
      description: (row.description as string) || undefined,
      isActive: row.is_active as boolean,
    };
  }

  const DIRECTION_MAP: Record<CashMovement["type"], "in" | "out"> = {
    tip_withdrawal: "out",
    expense_take: "out",
    expense_settle: "in",
    top_up: "in",
    barber_loan: "out",
    barber_payback: "out",
    own_cash_deposit: "in",
    voucher_sale: "in",
    shift_close: "out",
    float: "in",
  };

  function mapCashMovement(row: Record<string, unknown>, employeeName: string): CashMovement {
    return {
      id: row.id as string,
      type: row.reason as CashMovement["type"],
      employeeName,
      amount: Number(row.amount),
      description: (row.description as string) || "",
      timestamp: row.created_at as string,
      status: (row.status as CashMovement["status"]) || undefined,
      finalCost: row.final_cost != null ? Number(row.final_cost) : undefined,
      paymentMethod: (row.payment_method as string) || undefined,
    };
  }

  // Map Polish UI payment method names to DB enum values + amounts breakdown
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
    // Simple single-method payments
    const simple = SIMPLE_METHOD_MAP[uiMethod];
    if (simple) {
      return [{ method: simple, amount: totalAmount }];
    }

    // Split: Gotówka + Karta
    if (uiMethod === "Gotówka + Karta") {
      const cashMatch = details.match(/Gotówka:\s*([\d\s,.]+)\s*zł/);
      const cashAmt = cashMatch ? parseLocaleNumber(cashMatch[1]) : 0;
      return [
        { method: "cash", amount: cashAmt },
        { method: "card", amount: totalAmount - cashAmt },
      ];
    }

    // Split: Bon + Gotówka
    if (uiMethod === "Bon + Gotówka") {
      const bonMatch = details.match(/Bon:\s*([\d\s,.]+)\s*zł/);
      const bonAmt = bonMatch ? parseLocaleNumber(bonMatch[1]) : 0;
      return [
        { method: "voucher", amount: bonAmt },
        { method: "cash", amount: totalAmount - bonAmt },
      ];
    }

    // Split: Bon + Karta
    if (uiMethod === "Bon + Karta") {
      const bonMatch = details.match(/Bon:\s*([\d\s,.]+)\s*zł/);
      const bonAmt = bonMatch ? parseLocaleNumber(bonMatch[1]) : 0;
      return [
        { method: "voucher", amount: bonAmt },
        { method: "card", amount: totalAmount - bonAmt },
      ];
    }

    // Split: Bon + BLIK
    if (uiMethod === "Bon + BLIK") {
      const bonMatch = details.match(/Bon:\s*([\d\s,.]+)\s*zł/);
      const bonAmt = bonMatch ? parseLocaleNumber(bonMatch[1]) : 0;
      return [
        { method: "voucher", amount: bonAmt },
        { method: "blik", amount: totalAmount - bonAmt },
      ];
    }

    // Fallback
    return [{ method: "cash", amount: totalAmount }];
  }

  // Derive high-level paymentMethod from breakdown
  function derivePaymentMethod(breakdown: PaymentBreakdownItem[]): Transaction["paymentMethod"] {
    if (breakdown.length > 1) return "split";
    return breakdown[0]?.method || "cash";
  }

  function mapTransaction(
    row: Record<string, unknown>,
    items: TransactionItem[],
    employeeName: string,
    paymentBreakdown?: PaymentBreakdownItem[]
  ): Transaction {
    return {
      id: row.id as string,
      employeeId: (row.employee_id as string) || "",
      employeeName,
      clientName: (row.client_name as string) || undefined,
      items,
      totalAmount: Number(row.total_amount),
      tipAmount: Number(row.tip_amount) || 0,
      discountAmount: Number(row.discount_value) || 0,
      paymentMethod: (row.payment_method as Transaction["paymentMethod"]) || "cash",
      paymentBreakdown,
      timestamp: row.date as string,
    };
  }

  async function fetchTransactions(filter?: {
    employeeId?: string;
    todayOnly?: boolean;
    since?: string;
  }): Promise<Transaction[]> {
    let query = supabase
      .from("transaction")
      .select(
        `
        *,
        employee:employee_id(name),
        client:client_id(name),
        transaction_item(*),
        payment_detail(*)
      `
      )
      .eq("salon_id", SALON_ID)
      .eq("status", "completed")
      .order("date", { ascending: false });

    if (filter?.employeeId) {
      query = query.eq("employee_id", filter.employeeId);
    }

    if (filter?.todayOnly) {
      const today = new Date().toISOString().split("T")[0];
      query = query.gte("date", `${today}T00:00:00`).lte("date", `${today}T23:59:59`);
    }

    if (filter?.since) {
      query = query.gt("date", filter.since);
    }

    const { data, error } = await query;

    if (error) throw error;
    if (!data) return [];

    return data.map((row) => {
      const items: TransactionItem[] = (
        (row.transaction_item as Record<string, unknown>[]) || []
      ).map((ti) => ({
        name: ti.name as string,
        price: Number(ti.price_at_sale),
        type: ti.type as TransactionItem["type"],
      }));

      const employeeName =
        ((row.employee as Record<string, unknown> | null)?.name as string) || "Salon";
      const clientName =
        ((row.client as Record<string, unknown> | null)?.name as string) || undefined;

      // Build payment breakdown from payment_detail rows
      const payments = (row.payment_detail as Record<string, unknown>[]) || [];
      const breakdown: PaymentBreakdownItem[] = payments.map((p) => ({
        method: p.method as PaymentBreakdownItem["method"],
        amount: Number(p.amount),
      }));
      const paymentMethod = derivePaymentMethod(breakdown);

      return mapTransaction(
        { ...row, payment_method: paymentMethod, client_name: clientName },
        items,
        employeeName,
        breakdown.length > 0 ? breakdown : undefined
      );
    });
  }

  function mapSalon(row: Record<string, unknown>): SalonSettings {
    const methods = (row.enabled_payment_methods as string) || "cash,card,blik";
    return {
      id: row.id as string,
      name: row.name as string,
      address: (row.address as string) || "",
      phone: (row.phone as string) || "",
      nip: (row.nip as string) || "",
      adminPinHash: (row.admin_pin_hash as string) || "",
      operationsPinHash: (row.operations_pin_hash as string) || "",
      cashTolerance: Number(row.cash_tolerance) || 10,
      monthTarget: Number(row.month_target) || 600,
      voucherExpiryMonths: Number(row.voucher_expiry_months) || 12,
      voucherMinAmount: Number(row.voucher_min_amount) || 1,
      voucherCodePrefix: (row.voucher_code_prefix as string) || "BON-",
      defaultCommissionService: Number(row.default_commission_service) || 40,
      defaultCommissionProduct: Number(row.default_commission_product) || 20,
      enabledPaymentMethods: methods.split(",").filter(Boolean),
      receiptFooter: (row.receipt_footer as string) || "",
      knowledgeBaseEnabled: (row.knowledge_base_enabled as boolean) ?? false,
    };
  }

  function mapDevice(row: Record<string, unknown>): DeviceRegistration {
    const emp = row.employee as Record<string, unknown> | null;
    return {
      id: row.id as string,
      deviceId: row.device_id as string,
      employeeId: (row.employee_id as string) || null,
      employeeName: emp?.name as string | undefined,
      deviceType: row.device_type as DeviceRegistration["deviceType"],
      status: row.status as DeviceRegistration["status"],
      deviceName: (row.device_name as string) || "",
      registeredAt: row.registered_at as string,
      approvedAt: (row.approved_at as string) || null,
      lastSeenAt: (row.last_seen_at as string) || null,
    };
  }

  return {
    salon: {
      async get() {
        const { data, error } = await supabase
          .from("salon")
          .select("*")
          .eq("id", SALON_ID)
          .single();
        if (error) throw error;
        return mapSalon(data as Record<string, unknown>);
      },
      async update(input: UpdateSalonInput) {
        const dbInput: Record<string, unknown> = {};
        if (input.name !== undefined) dbInput.name = input.name;
        if (input.address !== undefined) dbInput.address = input.address;
        if (input.phone !== undefined) dbInput.phone = input.phone;
        if (input.nip !== undefined) dbInput.nip = input.nip;
        if (input.adminPinHash !== undefined) dbInput.admin_pin_hash = input.adminPinHash;
        if (input.operationsPinHash !== undefined)
          dbInput.operations_pin_hash = input.operationsPinHash;
        if (input.cashTolerance !== undefined) dbInput.cash_tolerance = input.cashTolerance;
        if (input.monthTarget !== undefined) dbInput.month_target = input.monthTarget;
        if (input.voucherExpiryMonths !== undefined)
          dbInput.voucher_expiry_months = input.voucherExpiryMonths;
        if (input.voucherMinAmount !== undefined)
          dbInput.voucher_min_amount = input.voucherMinAmount;
        if (input.voucherCodePrefix !== undefined)
          dbInput.voucher_code_prefix = input.voucherCodePrefix;
        if (input.defaultCommissionService !== undefined)
          dbInput.default_commission_service = input.defaultCommissionService;
        if (input.defaultCommissionProduct !== undefined)
          dbInput.default_commission_product = input.defaultCommissionProduct;
        if (input.enabledPaymentMethods !== undefined)
          dbInput.enabled_payment_methods = input.enabledPaymentMethods.join(",");
        if (input.receiptFooter !== undefined) dbInput.receipt_footer = input.receiptFooter;
        if (input.knowledgeBaseEnabled !== undefined)
          dbInput.knowledge_base_enabled = input.knowledgeBaseEnabled;

        const { data, error } = await supabase
          .from("salon")
          .update(dbInput)
          .eq("id", SALON_ID)
          .select()
          .single();
        if (error) throw error;
        return mapSalon(data as Record<string, unknown>);
      },
    },
    devices: {
      async getByDeviceId(deviceId: string) {
        const { data, error } = await supabase
          .from("device_registration")
          .select("*, employee:employee_id(name)")
          .eq("device_id", deviceId)
          .eq("salon_id", SALON_ID)
          .maybeSingle();
        if (error) throw error;
        if (!data) return null;
        return mapDevice(data as Record<string, unknown>);
      },
      async getAll() {
        const { data, error } = await supabase
          .from("device_registration")
          .select("*, employee:employee_id(name)")
          .eq("salon_id", SALON_ID)
          .order("registered_at", { ascending: false });
        if (error) throw error;
        return (data ?? []).map((r) => mapDevice(r as Record<string, unknown>));
      },
      async register(input: RegisterDeviceInput) {
        // Admin devices auto-approved (PIN verified on frontend)
        const status = input.deviceType === "admin" ? "approved" : "pending";
        const now = new Date().toISOString();
        const { data, error } = await supabase
          .from("device_registration")
          .insert({
            device_id: input.deviceId,
            salon_id: SALON_ID,
            device_name: input.deviceName,
            device_type: input.deviceType,
            employee_id: input.employeeId || null,
            status,
            approved_at: status === "approved" ? now : null,
            last_seen_at: now,
          })
          .select("*, employee:employee_id(name)")
          .single();
        if (error) throw error;
        return mapDevice(data as Record<string, unknown>);
      },
      async approve(id: string) {
        const { error } = await supabase
          .from("device_registration")
          .update({ status: "approved", approved_at: new Date().toISOString() })
          .eq("id", id);
        if (error) throw error;
      },
      async block(id: string) {
        const { error } = await supabase
          .from("device_registration")
          .update({ status: "blocked" })
          .eq("id", id);
        if (error) throw error;
      },
      async updateLastSeen(deviceId: string) {
        const { error } = await supabase
          .from("device_registration")
          .update({ last_seen_at: new Date().toISOString() })
          .eq("device_id", deviceId)
          .eq("salon_id", SALON_ID);
        if (error) throw error;
      },
    },
    employees: {
      async getAll() {
        const { data, error } = await supabase
          .from("employee")
          .select("*")
          .eq("salon_id", SALON_ID)
          .order("name");

        if (error) throw error;
        return (data || []).map(mapEmployee);
      },

      async getActive() {
        const { data, error } = await supabase
          .from("employee")
          .select("*")
          .eq("salon_id", SALON_ID)
          .eq("is_active", true)
          .order("name");

        if (error) throw error;

        const employees = (data || []).map(mapEmployee);

        // Calculate today's revenue and service count per employee
        const today = new Date().toISOString().split("T")[0];
        const { data: todayTx } = await supabase
          .from("transaction")
          .select("employee_id, total_amount, transaction_item(type)")
          .eq("salon_id", SALON_ID)
          .eq("status", "completed")
          .gte("date", `${today}T00:00:00`)
          .lte("date", `${today}T23:59:59`);

        if (todayTx) {
          for (const tx of todayTx) {
            const emp = employees.find((e) => e.id === tx.employee_id);
            if (emp) {
              emp.todayRevenue += Number(tx.total_amount);
              const serviceItems = (
                (tx.transaction_item as Record<string, unknown>[]) || []
              ).filter((ti) => ti.type === "service");
              emp.todayServices += serviceItems.length;
            }
          }
        }

        return employees;
      },

      async getById(id: string) {
        const { data, error } = await supabase
          .from("employee")
          .select("*")
          .eq("id", id)
          .eq("is_active", true)
          .single();

        if (error || !data) return undefined;
        return mapEmployee(data);
      },

      async create(input: SaveEmployeeInput): Promise<Employee> {
        const { data, error } = await supabase
          .from("employee")
          .insert({
            salon_id: SALON_ID,
            name: input.name,
            avatar_url: input.avatarUrl || null,
            role: input.role || "barber",
            commission_service_percent: input.commissionServicePercent,
            commission_product_percent: input.commissionProductPercent,
          })
          .select()
          .single();

        if (error) throw error;
        return mapEmployee(data);
      },

      async update(id: string, input: SaveEmployeeInput): Promise<Employee> {
        const { data, error } = await supabase
          .from("employee")
          .update({
            name: input.name,
            avatar_url: input.avatarUrl || null,
            role: input.role || "barber",
            commission_service_percent: input.commissionServicePercent,
            commission_product_percent: input.commissionProductPercent,
          })
          .eq("id", id)
          .select()
          .single();

        if (error) throw error;
        return mapEmployee(data);
      },

      async toggleActive(id: string, isActive: boolean): Promise<void> {
        const { error } = await supabase
          .from("employee")
          .update({ is_active: isActive })
          .eq("id", id);

        if (error) throw error;
      },
    },

    stats: {
      async getDaily(): Promise<DailyStats> {
        const now = new Date();
        const today = now.toISOString().split("T")[0];
        const year = now.getFullYear();
        const month = now.getMonth(); // 0-based

        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];

        const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
        const yearStart = `${year}-01-01`;
        const lastYearStart = `${year - 1}-01-01`;
        const lastYearEnd = `${year - 1}-12-31`;

        const baseQuery = () =>
          supabase
            .from("transaction")
            .select("*", { count: "exact", head: true })
            .eq("salon_id", SALON_ID)
            .eq("status", "completed");

        const [todayR, yesterdayR, monthR, yearR, lastYearR] = await Promise.all([
          baseQuery().gte("date", `${today}T00:00:00`).lte("date", `${today}T23:59:59`),
          baseQuery()
            .gte("date", `${yesterdayStr}T00:00:00`)
            .lte("date", `${yesterdayStr}T23:59:59`),
          baseQuery().gte("date", `${monthStart}T00:00:00`),
          baseQuery().gte("date", `${yearStart}T00:00:00`),
          baseQuery()
            .gte("date", `${lastYearStart}T00:00:00`)
            .lte("date", `${lastYearEnd}T23:59:59`),
        ]);

        // All-time daily record: fetch dates and count per day
        const { data: txDates } = await supabase
          .from("transaction")
          .select("date")
          .eq("salon_id", SALON_ID)
          .eq("status", "completed");

        let allTimeRecord = 0;
        if (txDates && txDates.length > 0) {
          const dayCounts = new Map<string, number>();
          for (const row of txDates) {
            const day = (row.date as string).split("T")[0];
            dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
          }
          for (const count of dayCounts.values()) {
            if (count > allTimeRecord) allTimeRecord = count;
          }
        }

        return {
          todayServices: todayR.count || 0,
          yesterdayServices: yesterdayR.count || 0,
          monthServices: monthR.count || 0,
          monthTarget: 600,
          yearServices: yearR.count || 0,
          lastYearServices: lastYearR.count || 0,
          allTimeRecord,
        };
      },
    },

    services: {
      async getAll() {
        const { data, error } = await supabase
          .from("service")
          .select("*")
          .eq("salon_id", SALON_ID)
          .order("name");

        if (error) throw error;
        return (data || []).map(mapService);
      },

      async getActive() {
        const { data, error } = await supabase
          .from("service")
          .select("*")
          .eq("salon_id", SALON_ID)
          .eq("is_active", true)
          .order("category")
          .order("name");

        if (error) throw error;
        return (data || []).map(mapService);
      },

      async create(input: SaveServiceInput): Promise<Service> {
        const { data, error } = await supabase
          .from("service")
          .insert({
            salon_id: SALON_ID,
            name: input.name,
            price: input.price,
            price_from: input.priceFrom || false,
            duration_minutes: input.durationMinutes || null,
            category: input.category || "Inne",
            description: input.description || null,
            description_long: input.descriptionLong || null,
          })
          .select()
          .single();

        if (error) throw error;
        return mapService(data);
      },

      async update(id: string, input: SaveServiceInput): Promise<Service> {
        const { data, error } = await supabase
          .from("service")
          .update({
            name: input.name,
            price: input.price,
            price_from: input.priceFrom || false,
            duration_minutes: input.durationMinutes || null,
            category: input.category || "Inne",
            description: input.description || null,
            description_long: input.descriptionLong || null,
          })
          .eq("id", id)
          .select()
          .single();

        if (error) throw error;
        return mapService(data);
      },

      async toggleActive(id: string, isActive: boolean): Promise<void> {
        const { error } = await supabase
          .from("service")
          .update({ is_active: isActive })
          .eq("id", id);

        if (error) throw error;
      },
    },

    products: {
      async getAll() {
        const { data, error } = await supabase
          .from("product")
          .select("*")
          .eq("salon_id", SALON_ID)
          .order("name");

        if (error) throw error;
        return (data || []).map(mapProduct);
      },

      async getActive() {
        const { data, error } = await supabase
          .from("product")
          .select("*")
          .eq("salon_id", SALON_ID)
          .eq("is_active", true)
          .order("name");

        if (error) throw error;
        return (data || []).map(mapProduct);
      },

      async create(input: SaveProductInput): Promise<Product> {
        const { data, error } = await supabase
          .from("product")
          .insert({
            salon_id: SALON_ID,
            name: input.name,
            price: input.price,
            description: input.description || null,
          })
          .select()
          .single();

        if (error) throw error;
        return mapProduct(data);
      },

      async update(id: string, input: SaveProductInput): Promise<Product> {
        const { data, error } = await supabase
          .from("product")
          .update({
            name: input.name,
            price: input.price,
            description: input.description || null,
          })
          .eq("id", id)
          .select()
          .single();

        if (error) throw error;
        return mapProduct(data);
      },

      async toggleActive(id: string, isActive: boolean): Promise<void> {
        const { error } = await supabase
          .from("product")
          .update({ is_active: isActive })
          .eq("id", id);

        if (error) throw error;
      },
    },

    transactions: {
      async getAll() {
        return fetchTransactions();
      },

      async getByEmployee(employeeId: string) {
        return fetchTransactions({ employeeId });
      },

      async getToday() {
        return fetchTransactions({ todayOnly: true });
      },

      async getSince(since: string | null) {
        return fetchTransactions(since ? { since } : undefined);
      },

      async create(input: CreateTransactionInput): Promise<Transaction> {
        const txId = crypto.randomUUID();
        const now = new Date().toISOString();

        // 1. Insert transaction
        // Map frontend discount type to DB enum (percent -> percentage)
        const dbDiscountType =
          input.discount?.type === "percent" ? "percentage" : input.discount?.type || null;
        const { error: txError } = await supabase.from("transaction").insert({
          id: txId,
          salon_id: SALON_ID,
          employee_id: input.employeeId || null,
          client_id: input.clientId || null,
          date: now,
          total_amount: input.totalAmount,
          tip_amount: input.tipAmount,
          discount_type: dbDiscountType,
          discount_value: input.discount?.value || 0,
          status: "completed",
        });
        if (txError) throw txError;

        // 2. Insert transaction items (with commission)
        // Fetch employee commission rates
        let commServicePct = 0;
        let commProductPct = 0;
        if (input.employeeId) {
          const { data: empRow } = await supabase
            .from("employee")
            .select("commission_service_percent, commission_product_percent")
            .eq("id", input.employeeId)
            .single();
          if (empRow) {
            commServicePct = Number(empRow.commission_service_percent) || 0;
            commProductPct = Number(empRow.commission_product_percent) || 0;
          }
        }

        // Calculate commission per item (after proportional discount)
        const itemsSubtotal = input.items.reduce((s, i) => s + i.price * i.quantity, 0);
        const itemRows = input.items.map((item) => {
          const itemBase = item.price * item.quantity;
          const itemAfterDiscount =
            itemsSubtotal > 0
              ? itemBase - input.discountAmount * (itemBase / itemsSubtotal)
              : itemBase;
          const rate = item.type === "service" ? commServicePct : commProductPct;
          const commissionAmount = Math.round(itemAfterDiscount * rate) / 100;
          return {
            id: crypto.randomUUID(),
            transaction_id: txId,
            type: item.type,
            item_id: item.id,
            name: item.name,
            price_at_sale: item.price,
            quantity: item.quantity,
            commission_amount: commissionAmount,
          };
        });

        if (itemRows.length > 0) {
          const { error: itemError } = await supabase.from("transaction_item").insert(itemRows);
          if (itemError) throw itemError;
        }

        // 3. Insert payment detail(s) - parse UI method to DB enum(s)
        const breakdown = parsePaymentInput(
          input.paymentMethod,
          input.paymentDetails || "",
          input.totalAmount
        );
        const paymentRows = breakdown.map((pd) => ({
          id: crypto.randomUUID(),
          transaction_id: txId,
          method: pd.method,
          amount: pd.amount,
        }));
        const { error: payError } = await supabase.from("payment_detail").insert(paymentRows);
        if (payError) throw payError;

        // 4. Redeem voucher if paying with bon
        if (input.voucherCode && input.voucherAmount) {
          const { data: voucher } = await supabase
            .from("voucher")
            .select("id, remaining_balance")
            .eq("code", input.voucherCode)
            .single();
          if (voucher) {
            const newBalance = Math.max(0, Number(voucher.remaining_balance) - input.voucherAmount);
            await supabase
              .from("voucher")
              .update({
                remaining_balance: newBalance,
                status: newBalance <= 0 ? "used" : "active",
              })
              .eq("id", voucher.id);

            // Link voucher to payment_detail
            const voucherPayment = paymentRows.find((p) => p.method === "voucher");
            if (voucherPayment) {
              await supabase
                .from("payment_detail")
                .update({ voucher_id: voucher.id })
                .eq("id", voucherPayment.id);
            }
          }
        }

        // 5. Update employee tip_balance if tip > 0 (atomic increment)
        if (input.tipAmount > 0 && input.employeeId) {
          await supabase.rpc("increment_tip_balance", {
            emp_id: input.employeeId,
            delta: input.tipAmount,
          });
        }

        // Return the created transaction
        const empName =
          (await supabase
            .from("employee")
            .select("name")
            .eq("id", input.employeeId)
            .single()
            .then((r) => r.data?.name)) || "Salon";

        return {
          id: txId,
          employeeId: input.employeeId,
          employeeName: empName as string,
          items: input.items.map((i) => ({
            name: i.name,
            price: i.price,
            type: i.type,
          })),
          totalAmount: input.totalAmount,
          tipAmount: input.tipAmount,
          discountAmount: input.discountAmount,
          paymentMethod: derivePaymentMethod(breakdown),
          paymentBreakdown: breakdown,
          timestamp: now,
        };
      },

      async cancel(id: string): Promise<void> {
        // 1. Fetch transaction details before cancelling
        const { data: tx, error: txErr } = await supabase
          .from("transaction")
          .select("employee_id, tip_amount")
          .eq("id", id)
          .single();
        if (txErr) throw txErr;

        // 2. Mark transaction as cancelled
        const { error: cancelErr } = await supabase
          .from("transaction")
          .update({ status: "cancelled" })
          .eq("id", id);
        if (cancelErr) throw cancelErr;

        // 3. Reverse tip_balance if tip was added
        const tipAmount = Number(tx.tip_amount) || 0;
        if (tipAmount > 0 && tx.employee_id) {
          await supabase.rpc("increment_tip_balance", {
            emp_id: tx.employee_id,
            delta: -tipAmount,
          });
        }

        // 4. Reverse voucher redemption if paid with voucher
        const { data: payments } = await supabase
          .from("payment_detail")
          .select("voucher_id, amount")
          .eq("transaction_id", id)
          .not("voucher_id", "is", null);

        if (payments && payments.length > 0) {
          for (const p of payments) {
            const voucherId = p.voucher_id as string;
            const amount = Number(p.amount);
            // Get current balance
            const { data: voucher } = await supabase
              .from("voucher")
              .select("remaining_balance")
              .eq("id", voucherId)
              .single();
            if (voucher) {
              const newBalance = Number(voucher.remaining_balance) + amount;
              await supabase
                .from("voucher")
                .update({
                  remaining_balance: newBalance,
                  status: "active",
                })
                .eq("id", voucherId);
            }
          }
        }
      },
    },

    cashMovements: {
      async getToday(): Promise<CashMovement[]> {
        const today = new Date().toISOString().split("T")[0];
        return this.getSince(`${today}T00:00:00`);
      },

      async getSince(since: string | null): Promise<CashMovement[]> {
        let query = supabase
          .from("cash_movement")
          .select("*, employee:employee_id(name)")
          .eq("salon_id", SALON_ID)
          .order("created_at", { ascending: false });

        if (since) {
          query = query.gt("created_at", since);
        }

        const { data, error } = await query;
        if (error) throw error;
        return (data || []).map((row) => {
          const empName =
            ((row.employee as Record<string, unknown> | null)?.name as string) || "Salon";
          return mapCashMovement(row as Record<string, unknown>, empName);
        });
      },

      async create(input: CreateCashMovementInput): Promise<CashMovement> {
        const id = crypto.randomUUID();
        const now = new Date().toISOString();

        const { error } = await supabase.from("cash_movement").insert({
          id,
          salon_id: SALON_ID,
          direction: DIRECTION_MAP[input.type],
          reason: input.type,
          amount: input.amount,
          employee_id: input.employeeId || null,
          description: input.description || null,
          status: input.status || null,
          payment_method: input.paymentMethod || null,
        });
        if (error) throw error;

        // Side effects per type
        if (input.type === "tip_withdrawal" && input.employeeId) {
          await supabase.from("tip_withdrawal").insert({
            employee_id: input.employeeId,
            amount: input.amount,
          });
          // Atomic decrement (never below 0)
          await supabase.rpc("increment_tip_balance", {
            emp_id: input.employeeId,
            delta: -input.amount,
          });
        }

        // Own cash deposit: employee puts own money in drawer, gets credit in virtual wallet
        if (input.type === "own_cash_deposit" && input.employeeId) {
          await supabase.rpc("increment_tip_balance", {
            emp_id: input.employeeId,
            delta: input.amount,
          });
        }

        if (input.type === "voucher_sale" && input.voucherCode) {
          await supabase.from("voucher").insert({
            salon_id: SALON_ID,
            code: input.voucherCode,
            initial_value: input.amount,
            remaining_balance: input.amount,
          });
        }

        // Resolve employee name
        let employeeName = "Salon";
        if (input.employeeId) {
          const { data: emp } = await supabase
            .from("employee")
            .select("name")
            .eq("id", input.employeeId)
            .single();
          if (emp) employeeName = emp.name as string;
        } else if (input.type === "top_up") {
          employeeName = "Szef";
        }

        return {
          id,
          type: input.type,
          employeeName,
          amount: input.amount,
          description: input.description,
          timestamp: now,
          status: input.status,
          paymentMethod: input.paymentMethod,
        };
      },

      async updateStatus(id: string, status: "settled", finalCost?: number): Promise<void> {
        const update: Record<string, unknown> = { status };
        if (finalCost !== undefined) update.final_cost = finalCost;
        const { error } = await supabase.from("cash_movement").update(update).eq("id", id);
        if (error) throw error;
      },
    },

    dailyReports: {
      async create(input: CreateDailyReportInput): Promise<void> {
        const { error } = await supabase.from("daily_report").insert({
          salon_id: SALON_ID,
          date: new Date().toISOString().split("T")[0],
          closing_employee_id: input.closingEmployeeId,
          expected_cash: input.expectedCash,
          actual_cash: input.actualCash,
          expected_vouchers: input.expectedVouchers,
          actual_vouchers_value: input.actualVouchersValue,
          float_amount: input.floatAmount,
          deposit_amount: input.depositAmount,
          difference: input.difference,
          voucher_difference: input.voucherDifference,
        });
        if (error) throw error;
      },

      async getToday(): Promise<{ closedAt: string } | null> {
        const today = new Date().toISOString().split("T")[0];
        const { data, error } = await supabase
          .from("daily_report")
          .select("closed_at")
          .eq("salon_id", SALON_ID)
          .eq("date", today)
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        if (!data) return null;
        return { closedAt: data.closed_at as string };
      },

      async getLastClosedAt(): Promise<string | null> {
        const { data, error } = await supabase
          .from("daily_report")
          .select("closed_at")
          .eq("salon_id", SALON_ID)
          .order("closed_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        return data ? (data.closed_at as string) : null;
      },

      async getLastFloat(): Promise<number> {
        const { data, error } = await supabase
          .from("daily_report")
          .select("float_amount")
          .eq("salon_id", SALON_ID)
          .order("closed_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (error) throw error;
        return data ? Number(data.float_amount) : 0;
      },
    },

    vouchers: {
      async getByCode(code: string): Promise<Voucher | null> {
        const { data, error } = await supabase
          .from("voucher")
          .select("*")
          .eq("salon_id", SALON_ID)
          .eq("code", code)
          .maybeSingle();
        if (error) throw error;
        if (!data) return null;
        return {
          id: data.id as string,
          code: data.code as string,
          initialValue: Number(data.initial_value),
          remainingBalance: Number(data.remaining_balance),
          status: data.status as Voucher["status"],
          expiresAt: data.expires_at as string,
          createdAt: data.created_at as string,
        };
      },

      async redeem(id: string, amount: number): Promise<void> {
        const { data: voucher, error: fetchErr } = await supabase
          .from("voucher")
          .select("remaining_balance")
          .eq("id", id)
          .single();
        if (fetchErr) throw fetchErr;

        const newBalance = Number(voucher.remaining_balance) - amount;
        const updates: Record<string, unknown> = {
          remaining_balance: Math.max(0, newBalance),
        };
        if (newBalance <= 0) {
          updates.status = "used";
        }
        const { error } = await supabase.from("voucher").update(updates).eq("id", id);
        if (error) throw error;
      },
    },
  };
}
