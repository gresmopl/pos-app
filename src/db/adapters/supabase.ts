import { createClient } from "@supabase/supabase-js";
import type {
  DbClient,
  CreateTransactionInput,
  CreateCashMovementInput,
  CreateDailyReportInput,
  CreateTerminalCheckInput,
  SaveServiceInput,
  SaveProductInput,
  SaveEmployeeInput,
  UpdateSalonInput,
  RegisterDeviceInput,
} from "../types";
import type { DbConfig } from "../config";
import type {
  Employee,
  Service,
  Product,
  Transaction,
  DailyStats,
  TransactionItem,
  CashMovement,
  Voucher,
  DeviceRegistration,
  DailyReportSummary,
  TerminalCheck,
} from "@/lib/types";
import {
  mapEmployee,
  mapService,
  mapProduct,
  mapTransaction,
  mapCashMovement,
  mapSalon,
} from "../mappers";

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
        transaction_item(*)
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
        quantity: Number(ti.quantity) || 1,
        type: ti.type as TransactionItem["type"],
      }));

      const employeeName =
        ((row.employee as Record<string, unknown> | null)?.name as string) || "Salon";
      const clientName =
        ((row.client as Record<string, unknown> | null)?.name as string) || undefined;

      return mapTransaction({ ...row, client_name: clientName }, items, employeeName);
    });
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
        if (input.adminPinHash !== undefined) dbInput.admin_pin_hash = input.adminPinHash;
        if (input.operationsPinHash !== undefined)
          dbInput.operations_pin_hash = input.operationsPinHash;
        if (input.cashTolerance !== undefined) dbInput.cash_tolerance = input.cashTolerance;
        if (input.monthTarget !== undefined) dbInput.month_target = input.monthTarget;
        if (input.defaultCommissionService !== undefined)
          dbInput.default_commission_service = input.defaultCommissionService;
        if (input.defaultCommissionProduct !== undefined)
          dbInput.default_commission_product = input.defaultCommissionProduct;
        if (input.retentionThresholdTop !== undefined)
          dbInput.retention_threshold_top = input.retentionThresholdTop;
        if (input.retentionThresholdHigh !== undefined)
          dbInput.retention_threshold_high = input.retentionThresholdHigh;
        if (input.retentionThresholdMid !== undefined)
          dbInput.retention_threshold_mid = input.retentionThresholdMid;

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
              emp.todayServices += serviceItems.reduce(
                (sum, ti) => sum + (Number(ti.quantity) || 1),
                0
              );
            }
          }
        }

        return employees;
      },

      async getById(id: string) {
        const { data, error } = await supabase.from("employee").select("*").eq("id", id).single();

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
            retention_percent: input.retentionPercent ?? null,
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
            retention_percent: input.retentionPercent ?? null,
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
        const month = now.getMonth();

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

        const [todayR, yesterdayR, monthR, yearR, lastYearR, salonR] = await Promise.all([
          baseQuery().gte("date", `${today}T00:00:00`).lte("date", `${today}T23:59:59`),
          baseQuery()
            .gte("date", `${yesterdayStr}T00:00:00`)
            .lte("date", `${yesterdayStr}T23:59:59`),
          baseQuery().gte("date", `${monthStart}T00:00:00`),
          baseQuery().gte("date", `${yearStart}T00:00:00`),
          baseQuery()
            .gte("date", `${lastYearStart}T00:00:00`)
            .lte("date", `${lastYearEnd}T23:59:59`),
          supabase.from("salon").select("month_target").eq("id", SALON_ID).single(),
        ]);

        const monthTarget = Number(salonR.data?.month_target) || 600;

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
          monthTarget,
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
          .order("display_order")
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
            description: input.description || null,
            display_order: input.displayOrder ?? 0,
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
            description: input.description || null,
            display_order: input.displayOrder ?? 0,
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

        // 3. Update employee tip_balance if tip > 0 (atomic increment)
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
            quantity: i.quantity,
            type: i.type,
          })),
          totalAmount: input.totalAmount,
          tipAmount: input.tipAmount,
          discountAmount: input.discountAmount,
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
          terminal_amount: input.terminalAmount,
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

      async getRecent(limit: number): Promise<DailyReportSummary[]> {
        const { data, error } = await supabase
          .from("daily_report")
          .select(
            "id, closed_at, expected_cash, actual_cash, terminal_amount, difference, float_amount, deposit_amount, employee:closing_employee_id(name)"
          )
          .eq("salon_id", SALON_ID)
          .order("closed_at", { ascending: false })
          .limit(limit);
        if (error) throw error;
        return (data ?? []).map((r) => {
          const emp = r.employee as { name: string } | { name: string }[] | null;
          const name = Array.isArray(emp) ? (emp[0]?.name ?? "-") : (emp?.name ?? "-");
          return {
            id: r.id as string,
            closedAt: r.closed_at as string,
            closingEmployeeName: name,
            expectedCash: Number(r.expected_cash),
            actualCash: Number(r.actual_cash),
            terminalAmount: Number(r.terminal_amount),
            difference: Number(r.difference),
            floatAmount: Number(r.float_amount),
            depositAmount: Number(r.deposit_amount),
          };
        });
      },
    },

    terminalChecks: {
      async create(input: CreateTerminalCheckInput): Promise<TerminalCheck> {
        const { data, error } = await supabase
          .from("terminal_check")
          .insert({
            salon_id: SALON_ID,
            terminal_amount: input.terminalAmount,
            expected_cash: input.expectedCash,
            calculated_cash: input.calculatedCash,
            tx_count: input.txCount,
          })
          .select()
          .single();
        if (error) throw error;
        return {
          id: data.id as string,
          terminalAmount: Number(data.terminal_amount),
          expectedCash: Number(data.expected_cash),
          calculatedCash: Number(data.calculated_cash),
          txCount: Number(data.tx_count),
          createdAt: data.created_at as string,
        };
      },

      async getSince(since: string | null): Promise<TerminalCheck[]> {
        let query = supabase
          .from("terminal_check")
          .select("*")
          .eq("salon_id", SALON_ID)
          .order("created_at", { ascending: true });
        if (since) {
          query = query.gt("created_at", since);
        }
        const { data, error } = await query;
        if (error) throw error;
        return (data ?? []).map((r) => ({
          id: r.id as string,
          terminalAmount: Number(r.terminal_amount),
          expectedCash: Number(r.expected_cash),
          calculatedCash: Number(r.calculated_cash),
          txCount: Number(r.tx_count),
          createdAt: r.created_at as string,
        }));
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
