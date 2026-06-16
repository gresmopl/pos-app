// Czysta agregacja danych do raportu miesięcznego (bez zależności od DB).
// Wzorzec jak mappers.ts / commission.ts — w pełni testowalne.

import type { Transaction, Employee, DailyReportSummary, TransactionItem } from "./types";
import { sumCommission } from "./commission";

export interface ReportPeriod {
  start: string; // ISO (początek dnia, lokalnie → UTC)
  end: string; // ISO (koniec dnia)
  label: string;
}

export interface EmployeeReportRow {
  employeeId: string;
  name: string;
  servicesCount: number;
  productsCount: number;
  netRevenue: number;
  tips: number;
  commission: number;
}

export interface FinanceSummary {
  // UWAGA: totalRevenue to przychód NETTO po rabacie (= Σ totalAmount - tipAmount).
  // serviceRevenue/productRevenue/voucherSales to ceny PRZED rabatem (Σ price*quantity),
  // więc ich suma jest większa od totalRevenue dokładnie o totalDiscounts. To celowe
  // (kolumny pokazują wartość brutto pozycji, total — faktyczny przychód).
  totalRevenue: number;
  serviceRevenue: number;
  productRevenue: number;
  voucherSales: number;
  totalDiscounts: number;
  totalTips: number;
  txCount: number;
}

export interface CashRow {
  closedAt: string;
  closingEmployeeName: string;
  difference: number;
}

export interface CashControl {
  shifts: CashRow[];
  totalDifference: number;
}

export interface TrendSummary {
  revenueDeltaPercent: number | null;
  servicesDeltaPercent: number | null;
  bestDay: { date: string; services: number } | null;
}

export interface MonthlyReport {
  period: ReportPeriod;
  employees: EmployeeReportRow[];
  finance: FinanceSummary;
  cash: CashControl;
  trend: TrendSummary;
}

const MONTH_NAMES = [
  "Styczeń",
  "Luty",
  "Marzec",
  "Kwiecień",
  "Maj",
  "Czerwiec",
  "Lipiec",
  "Sierpień",
  "Wrzesień",
  "Październik",
  "Listopad",
  "Grudzień",
];

function ymdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function monthPeriod(date: Date): ReportPeriod {
  const start = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    label: `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`,
  };
}

export function rangePeriod(from: Date, to: Date): ReportPeriod {
  const start = new Date(from);
  start.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(23, 59, 59, 999);
  return {
    start: start.toISOString(),
    end: end.toISOString(),
    label: `${ymdLocal(start)} – ${ymdLocal(end)}`,
  };
}

export function previousPeriodOf(period: ReportPeriod): ReportPeriod {
  const startMs = new Date(period.start).getTime();
  const endMs = new Date(period.end).getTime();
  const duration = endMs - startMs;
  const prevEnd = new Date(startMs - 1);
  const prevStart = new Date(startMs - 1 - duration);
  return {
    start: prevStart.toISOString(),
    end: prevEnd.toISOString(),
    label: "Poprzedni okres",
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function inPeriod(timestamp: string, period: ReportPeriod): boolean {
  return timestamp >= period.start && timestamp <= period.end;
}

function lineSum(tx: Transaction, type: TransactionItem["type"]): number {
  return tx.items.filter((i) => i.type === type).reduce((s, i) => s + i.price * i.quantity, 0);
}

function countItems(tx: Transaction, type: TransactionItem["type"]): number {
  return tx.items.filter((i) => i.type === type).reduce((s, i) => s + i.quantity, 0);
}

export interface BuildReportInput {
  transactions: Transaction[]; // pokrywa bieżący + poprzedni okres
  cashReports: DailyReportSummary[];
  employees: Employee[];
  period: ReportPeriod;
  previousPeriod: ReportPeriod | null;
}

export function buildReport(input: BuildReportInput): MonthlyReport {
  const { transactions, period } = input;
  const current = transactions.filter((t) => inPeriod(t.timestamp, period));

  const finance: FinanceSummary = {
    totalRevenue: round2(current.reduce((s, t) => s + (t.totalAmount - t.tipAmount), 0)),
    serviceRevenue: round2(current.reduce((s, t) => s + lineSum(t, "service"), 0)),
    productRevenue: round2(current.reduce((s, t) => s + lineSum(t, "product"), 0)),
    voucherSales: round2(current.reduce((s, t) => s + lineSum(t, "voucher_sale"), 0)),
    totalDiscounts: round2(current.reduce((s, t) => s + t.discountAmount, 0)),
    totalTips: round2(current.reduce((s, t) => s + t.tipAmount, 0)),
    txCount: current.length,
  };

  const employeeRows: EmployeeReportRow[] = input.employees.map((employee) => {
    const empTx = current.filter((t) => t.employeeId === employee.id);
    return {
      employeeId: employee.id,
      name: employee.name,
      servicesCount: empTx.reduce((s, t) => s + countItems(t, "service"), 0),
      productsCount: empTx.reduce((s, t) => s + countItems(t, "product"), 0),
      netRevenue: round2(empTx.reduce((s, t) => s + (t.totalAmount - t.tipAmount), 0)),
      tips: round2(empTx.reduce((s, t) => s + t.tipAmount, 0)),
      commission: round2(sumCommission(empTx, employee)),
    };
  });

  const shifts: CashRow[] = input.cashReports
    .filter((r) => inPeriod(r.closedAt, period))
    .map((r) => ({
      closedAt: r.closedAt,
      closingEmployeeName: r.closingEmployeeName,
      difference: r.difference,
    }));
  const cash: CashControl = {
    shifts,
    totalDifference: round2(shifts.reduce((s, r) => s + r.difference, 0)),
  };

  const trend = buildTrend(current, transactions, finance.totalRevenue, input.previousPeriod);

  return {
    period,
    finance,
    employees: employeeRows,
    cash,
    trend,
  };
}

function buildTrend(
  current: Transaction[],
  allTransactions: Transaction[],
  totalRevenue: number,
  previousPeriod: ReportPeriod | null
): TrendSummary {
  // najlepszy dzień wg liczby usług.
  // slice(0, 10) daje datę w UTC — akceptowalne dla grupowania, bo salon zamyka
  // przed północą UTC (brak transakcji przekraczających granicę doby UTC).
  const byDay = new Map<string, number>();
  for (const t of current) {
    const day = t.timestamp.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + countItems(t, "service"));
  }
  // Remis: wygrywa najwcześniejszy dzień (Map zachowuje kolejność wstawiania,
  // a transakcje są chronologiczne) — warunek `>` nie nadpisuje równej wartości.
  let bestDay: { date: string; services: number } | null = null;
  for (const [date, services] of byDay) {
    if (!bestDay || services > bestDay.services) bestDay = { date, services };
  }

  if (!previousPeriod) {
    return { revenueDeltaPercent: null, servicesDeltaPercent: null, bestDay };
  }

  const prev = allTransactions.filter((t) => inPeriod(t.timestamp, previousPeriod));
  const prevRevenue = prev.reduce((s, t) => s + (t.totalAmount - t.tipAmount), 0);
  const prevServices = prev.reduce((s, t) => s + countItems(t, "service"), 0);
  const curServices = current.reduce((s, t) => s + countItems(t, "service"), 0);

  return {
    revenueDeltaPercent:
      prevRevenue > 0 ? Math.round(((totalRevenue - prevRevenue) / prevRevenue) * 100) : null,
    servicesDeltaPercent:
      prevServices > 0 ? Math.round(((curServices - prevServices) / prevServices) * 100) : null,
    bestDay,
  };
}
