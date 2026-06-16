import { describe, it, expect } from "vitest";
import { monthPeriod, rangePeriod, previousPeriodOf } from "../reports";

describe("monthPeriod", () => {
  it("buduje okres dla całego miesiąca z polską nazwą", () => {
    const p = monthPeriod(new Date(2026, 5, 15)); // czerwiec 2026
    expect(p.label).toBe("Czerwiec 2026");
    expect(p.start < p.end).toBe(true);
    // start to początek dnia 1-go, end to koniec ostatniego dnia
    expect(new Date(p.start).getDate()).toBe(1);
    expect(new Date(p.end).getMonth()).toBe(5);
  });
});

describe("rangePeriod", () => {
  it("buduje okres z zakresu dat z czytelną etykietą", () => {
    const p = rangePeriod(new Date(2026, 5, 1), new Date(2026, 5, 15));
    expect(p.label).toBe("2026-06-01 – 2026-06-15");
    expect(p.start < p.end).toBe(true);
  });
});

describe("previousPeriodOf", () => {
  it("zwraca okres tej samej długości bezpośrednio przed", () => {
    const p = rangePeriod(new Date(2026, 5, 10), new Date(2026, 5, 19)); // 10 dni
    const prev = previousPeriodOf(p);
    expect(prev.end < p.start).toBe(true);
    const len = new Date(p.end).getTime() - new Date(p.start).getTime();
    const prevLen = new Date(prev.end).getTime() - new Date(prev.start).getTime();
    expect(Math.abs(prevLen - len)).toBeLessThan(1000); // ~ta sama długość
  });
});

import { buildReport } from "../reports";
import type { Transaction, Employee, DailyReportSummary } from "../types";

function tx(over: Partial<Transaction> = {}): Transaction {
  return {
    id: "t1",
    employeeId: "e1",
    employeeName: "Jan",
    items: [{ name: "Strzyżenie", price: 50, quantity: 1, type: "service" }],
    totalAmount: 50,
    tipAmount: 0,
    discountAmount: 0,
    timestamp: "2026-06-10T10:00:00.000Z",
    ...over,
  };
}

const JUNE = rangePeriod(new Date(2026, 5, 1), new Date(2026, 5, 30));

describe("buildReport — finanse", () => {
  it("sumuje przychód, usługi, produkty, bony, rabaty, napiwki", () => {
    const transactions: Transaction[] = [
      tx({
        id: "a",
        items: [
          { name: "Strzyżenie", price: 50, quantity: 1, type: "service" },
          { name: "Pomada", price: 30, quantity: 2, type: "product" },
        ],
        totalAmount: 120,
        tipAmount: 10,
        discountAmount: 5,
      }),
      tx({
        id: "b",
        items: [{ name: "Bon 100", price: 100, quantity: 1, type: "voucher_sale" }],
        totalAmount: 100,
        tipAmount: 0,
      }),
    ];
    const r = buildReport({
      transactions,
      cashReports: [],
      employees: [],
      period: JUNE,
      previousPeriod: null,
    });
    expect(r.finance.txCount).toBe(2);
    expect(r.finance.serviceRevenue).toBe(50);
    expect(r.finance.productRevenue).toBe(60); // 30 * 2
    expect(r.finance.voucherSales).toBe(100);
    expect(r.finance.totalDiscounts).toBe(5);
    expect(r.finance.totalTips).toBe(10);
    expect(r.finance.totalRevenue).toBe(210); // (120-10) + (100-0)
  });

  it("pomija transakcje spoza okresu", () => {
    const transactions = [
      tx({ id: "in", timestamp: "2026-06-15T10:00:00.000Z" }),
      tx({ id: "out", timestamp: "2026-07-15T10:00:00.000Z" }),
    ];
    const r = buildReport({
      transactions,
      cashReports: [],
      employees: [],
      period: JUNE,
      previousPeriod: null,
    });
    expect(r.finance.txCount).toBe(1);
  });
});

function emp(over: Partial<Employee> = {}): Employee {
  return {
    id: "e1",
    name: "Jan",
    avatar: "J",
    role: "barber",
    todayRevenue: 0,
    todayServices: 0,
    tipBalance: 0,
    commissionServicePercent: 40,
    commissionProductPercent: 10,
    retentionPercent: null,
    displayOrder: 0,
    showRetentionBadge: false,
    isActive: true,
    ...over,
  };
}

describe("buildReport — pracownicy", () => {
  it("liczy usługi, produkty, przychód, napiwki i prowizję per pracownik", () => {
    const transactions = [
      tx({
        id: "a",
        employeeId: "e1",
        items: [{ name: "Strzyżenie", price: 100, quantity: 1, type: "service" }],
        totalAmount: 100,
        tipAmount: 0,
      }),
      tx({
        id: "b",
        employeeId: "e2",
        items: [{ name: "Strzyżenie", price: 80, quantity: 1, type: "service" }],
        totalAmount: 80,
        tipAmount: 5,
      }),
    ];
    const employees = [emp({ id: "e1" }), emp({ id: "e2", name: "Adam" })];
    const r = buildReport({
      transactions,
      cashReports: [],
      employees,
      period: JUNE,
      previousPeriod: null,
    });

    const jan = r.employees.find((e) => e.employeeId === "e1")!;
    expect(jan.servicesCount).toBe(1);
    expect(jan.netRevenue).toBe(100);
    expect(jan.commission).toBe(40); // 100 * 40%

    const adam = r.employees.find((e) => e.employeeId === "e2")!;
    expect(adam.netRevenue).toBe(75); // 80 - 5 tip
    expect(adam.tips).toBe(5);
  });
});
