# Raporty miesięczne — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dodać do panelu admina raport za wybrany okres (miesiąc lub zakres dat) z 4 sekcjami (pracownicy, finanse, kasa, trendy) i eksportem do `.xlsx`.

**Architecture:** Czysta logika agregacji w `src/lib/reports.ts` (testowalna bez DB, jak `mappers.ts`/`commission.ts`). Eksport Excela w `src/lib/reportExport.ts` z dynamicznym importem SheetJS. Cienka strona `src/pages/AdminReports.tsx` pobiera dane przez istniejące metody `db.*.getSince()` i renderuje gotowy obiekt `MonthlyReport`. Trasa w `App.tsx`, aktywacja linku w `Admin.tsx`.

**Tech Stack:** React 19 + TypeScript, Mantine 9 (`@mantine/dates` już skonfigurowany z `DatesProvider locale=pl`), dayjs, SheetJS (`xlsx`), Vitest.

**Kluczowe ustalenia z kodu:**

- `TransactionItem.price` to **cena jednostkowa** → wartość linii = `price * quantity` (patrz `mappers.ts:62`).
- Przychód „netto" = `totalAmount - tipAmount` (spójne z `commission.ts`).
- Prowizja: reużywamy `sumCommission(transactions, employee)` z `src/lib/commission.ts` (logika zatwierdzona przez szefa) — NIE przepisujemy.
- Filtr okresu: `getSince(start)` + filtr klienta `timestamp <= end` (wzorzec z `History.tsx:64-66`).
- Porównanie ISO-stringów dat działa leksykograficznie (oba w UTC `...Z`).

---

### Task 1: Dodanie zależności `xlsx`

**Files:**

- Modify: `package.json` (przez `npm install`)

- [ ] **Step 1: Zainstaluj SheetJS**

Run: `npm install xlsx`
Expected: `xlsx` pojawia się w `dependencies` w `package.json`, brak błędów.

- [ ] **Step 2: Sprawdź że typy są dostępne**

Run: `node -e "require('xlsx')"`
Expected: brak błędu (pakiet zainstalowany). SheetJS dostarcza własne typy TS — nie trzeba `@types/xlsx`.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore(reports): dodano zaleznosc xlsx (SheetJS) do eksportu Excel

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Typy i helpery okresu w `reports.ts`

**Files:**

- Create: `src/lib/reports.ts`
- Test: `src/lib/__tests__/reports.test.ts`

- [ ] **Step 1: Napisz failing test dla helperów okresu**

Utwórz `src/lib/__tests__/reports.test.ts`:

```ts
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
```

- [ ] **Step 2: Uruchom test — ma się wywalić**

Run: `npx vitest run src/lib/__tests__/reports.test.ts`
Expected: FAIL — `monthPeriod is not a function` / brak modułu `../reports`.

- [ ] **Step 3: Napisz `reports.ts` z typami i helperami**

Utwórz `src/lib/reports.ts`:

```ts
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
  totalRevenue: number; // suma (totalAmount - tipAmount)
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
```

- [ ] **Step 4: Uruchom test — ma przejść**

Run: `npx vitest run src/lib/__tests__/reports.test.ts`
Expected: PASS (3 testy).

- [ ] **Step 5: Commit**

```bash
git add src/lib/reports.ts src/lib/__tests__/reports.test.ts
git commit -m "feat(reports): typy MonthlyReport + helpery okresu (miesiac/zakres)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: `buildReport` — sekcja Finanse

**Files:**

- Modify: `src/lib/reports.ts`
- Test: `src/lib/__tests__/reports.test.ts`

- [ ] **Step 1: Dodaj failing test dla finansów**

Dopisz na końcu `src/lib/__tests__/reports.test.ts`:

```ts
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
```

- [ ] **Step 2: Uruchom — ma się wywalić**

Run: `npx vitest run src/lib/__tests__/reports.test.ts`
Expected: FAIL — `buildReport is not a function`.

- [ ] **Step 3: Dodaj `BuildReportInput` i `buildReport` (na razie tylko finanse)**

Dopisz na końcu `src/lib/reports.ts`:

```ts
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

  return {
    period,
    finance,
    employees: [],
    cash: { shifts: [], totalDifference: 0 },
    trend: { revenueDeltaPercent: null, servicesDeltaPercent: null, bestDay: null },
  };
}
```

- [ ] **Step 4: Uruchom — ma przejść**

Run: `npx vitest run src/lib/__tests__/reports.test.ts`
Expected: PASS (5 testów łącznie).

- [ ] **Step 5: Commit**

```bash
git add src/lib/reports.ts src/lib/__tests__/reports.test.ts
git commit -m "feat(reports): buildReport - sekcja finanse (przychod, podzial, rabaty, napiwki)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: `buildReport` — sekcja Pracownicy (z prowizją)

**Files:**

- Modify: `src/lib/reports.ts`
- Test: `src/lib/__tests__/reports.test.ts`

- [ ] **Step 1: Dodaj failing test dla pracowników**

Dopisz na końcu `src/lib/__tests__/reports.test.ts`:

```ts
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
```

- [ ] **Step 2: Uruchom — ma się wywalić**

Run: `npx vitest run src/lib/__tests__/reports.test.ts`
Expected: FAIL — `r.employees` jest puste, `find(...)` zwraca undefined → błąd na `!`.

- [ ] **Step 3: Zaimplementuj sekcję pracowników w `buildReport`**

W `src/lib/reports.ts`, w `buildReport`, zastąp linię `employees: [],` budowaniem wierszy. Najpierw dodaj przed `return`:

```ts
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
```

Następnie w obiekcie zwracanym zmień `employees: [],` na `employees: employeeRows,`.

- [ ] **Step 4: Uruchom — ma przejść**

Run: `npx vitest run src/lib/__tests__/reports.test.ts`
Expected: PASS (6 testów).

- [ ] **Step 5: Commit**

```bash
git add src/lib/reports.ts src/lib/__tests__/reports.test.ts
git commit -m "feat(reports): buildReport - rozliczenie pracownikow z prowizja (sumCommission)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: `buildReport` — sekcja Kontrola gotówki

**Files:**

- Modify: `src/lib/reports.ts`
- Test: `src/lib/__tests__/reports.test.ts`

- [ ] **Step 1: Dodaj failing test dla kasy**

Dopisz na końcu `src/lib/__tests__/reports.test.ts`:

```ts
function report(over: Partial<DailyReportSummary> = {}): DailyReportSummary {
  return {
    id: "r1",
    closedAt: "2026-06-10T20:00:00.000Z",
    closingEmployeeName: "Jan",
    expectedCash: 0,
    actualCash: 0,
    terminalAmount: 0,
    difference: 0,
    floatAmount: 0,
    depositAmount: 0,
    ...over,
  };
}

describe("buildReport — kasa", () => {
  it("zbiera zamknięcia z okresu i sumuje różnice", () => {
    const cashReports = [
      report({ id: "r1", difference: 5, closedAt: "2026-06-05T20:00:00.000Z" }),
      report({ id: "r2", difference: -3, closedAt: "2026-06-20T20:00:00.000Z" }),
      report({ id: "r3", difference: 100, closedAt: "2026-07-01T20:00:00.000Z" }), // poza okresem
    ];
    const r = buildReport({
      transactions: [],
      cashReports,
      employees: [],
      period: JUNE,
      previousPeriod: null,
    });
    expect(r.cash.shifts).toHaveLength(2);
    expect(r.cash.totalDifference).toBe(2); // 5 + (-3)
  });
});
```

- [ ] **Step 2: Uruchom — ma się wywalić**

Run: `npx vitest run src/lib/__tests__/reports.test.ts`
Expected: FAIL — `r.cash.shifts` ma długość 0, oczekiwano 2.

- [ ] **Step 3: Zaimplementuj sekcję kasy w `buildReport`**

W `src/lib/reports.ts`, w `buildReport`, dodaj przed `return`:

```ts
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
```

Zmień w zwracanym obiekcie `cash: { shifts: [], totalDifference: 0 },` na `cash,`.

- [ ] **Step 4: Uruchom — ma przejść**

Run: `npx vitest run src/lib/__tests__/reports.test.ts`
Expected: PASS (7 testów).

- [ ] **Step 5: Commit**

```bash
git add src/lib/reports.ts src/lib/__tests__/reports.test.ts
git commit -m "feat(reports): buildReport - bilans kasowy za okres (suma roznic z zamkniec)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: `buildReport` — sekcja Trendy

**Files:**

- Modify: `src/lib/reports.ts`
- Test: `src/lib/__tests__/reports.test.ts`

- [ ] **Step 1: Dodaj failing test dla trendów**

Dopisz na końcu `src/lib/__tests__/reports.test.ts`:

```ts
describe("buildReport — trendy", () => {
  it("wyznacza najlepszy dzień i zmianę % vs poprzedni okres", () => {
    const MAY = rangePeriod(new Date(2026, 4, 1), new Date(2026, 4, 31));
    const transactions = [
      // bieżący okres (czerwiec): 2 usługi 10-go, 1 usługa 11-go
      tx({
        id: "c1",
        timestamp: "2026-06-10T09:00:00.000Z",
        totalAmount: 100,
        items: [{ name: "S", price: 100, quantity: 2, type: "service" }],
      }),
      tx({
        id: "c2",
        timestamp: "2026-06-11T09:00:00.000Z",
        totalAmount: 50,
        items: [{ name: "S", price: 50, quantity: 1, type: "service" }],
      }),
      // poprzedni okres (maj): przychód 100, 1 usługa
      tx({
        id: "p1",
        timestamp: "2026-05-10T09:00:00.000Z",
        totalAmount: 100,
        items: [{ name: "S", price: 100, quantity: 1, type: "service" }],
      }),
    ];
    const r = buildReport({
      transactions,
      cashReports: [],
      employees: [],
      period: JUNE,
      previousPeriod: MAY,
    });
    expect(r.trend.bestDay).toEqual({ date: "2026-06-10", services: 2 });
    expect(r.trend.revenueDeltaPercent).toBe(50); // (150-100)/100
    expect(r.trend.servicesDeltaPercent).toBe(200); // (3-1)/1
  });

  it("zwraca null gdy brak poprzedniego okresu", () => {
    const transactions = [tx({ id: "c1", timestamp: "2026-06-10T09:00:00.000Z" })];
    const r = buildReport({
      transactions,
      cashReports: [],
      employees: [],
      period: JUNE,
      previousPeriod: null,
    });
    expect(r.trend.revenueDeltaPercent).toBeNull();
    expect(r.trend.bestDay).not.toBeNull();
  });
});
```

- [ ] **Step 2: Uruchom — ma się wywalić**

Run: `npx vitest run src/lib/__tests__/reports.test.ts`
Expected: FAIL — `r.trend.bestDay` jest `null`, oczekiwano obiektu.

- [ ] **Step 3: Zaimplementuj trendy**

W `src/lib/reports.ts` dodaj funkcję pomocniczą na końcu pliku:

```ts
function buildTrend(
  current: Transaction[],
  allTransactions: Transaction[],
  totalRevenue: number,
  previousPeriod: ReportPeriod | null
): TrendSummary {
  // najlepszy dzień wg liczby usług
  const byDay = new Map<string, number>();
  for (const t of current) {
    const day = t.timestamp.slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + countItems(t, "service"));
  }
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
```

W `buildReport` dodaj przed `return`:

```ts
const trend = buildTrend(current, transactions, finance.totalRevenue, previousPeriod);
```

Zmień w zwracanym obiekcie `trend: { revenueDeltaPercent: null, servicesDeltaPercent: null, bestDay: null },` na `trend,`.

> Uwaga: `t.timestamp.slice(0, 10)` daje datę w UTC. To akceptowalne dla grupowania „najlepszego dnia" (spójne dla wszystkich tx). Pełna lokalizacja stref czasowych jest poza zakresem (YAGNI).

- [ ] **Step 4: Uruchom — ma przejść**

Run: `npx vitest run src/lib/__tests__/reports.test.ts`
Expected: PASS (9 testów).

- [ ] **Step 5: Commit**

```bash
git add src/lib/reports.ts src/lib/__tests__/reports.test.ts
git commit -m "feat(reports): buildReport - trendy (najlepszy dzien, zmiana % vs poprzedni okres)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Eksport do Excela — `reportExport.ts`

**Files:**

- Create: `src/lib/reportExport.ts`
- Test: `src/lib/__tests__/reportExport.test.ts`

Strategia: czysta funkcja `buildSheetData(report)` (testowalna) buduje wiersze 4 arkuszy; cienka `exportReportToExcel(report, fileSuffix)` woła SheetJS przez dynamiczny import (nietestowana w jsdom).

- [ ] **Step 1: Napisz failing test dla `buildSheetData`**

Utwórz `src/lib/__tests__/reportExport.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { buildSheetData } from "../reportExport";
import type { MonthlyReport } from "../reports";

const sample: MonthlyReport = {
  period: {
    start: "2026-06-01T00:00:00.000Z",
    end: "2026-06-30T22:00:00.000Z",
    label: "Czerwiec 2026",
  },
  employees: [
    {
      employeeId: "e1",
      name: "Jan",
      servicesCount: 3,
      productsCount: 1,
      netRevenue: 300,
      tips: 20,
      commission: 120,
    },
  ],
  finance: {
    totalRevenue: 300,
    serviceRevenue: 270,
    productRevenue: 30,
    voucherSales: 0,
    totalDiscounts: 10,
    totalTips: 20,
    txCount: 4,
  },
  cash: {
    shifts: [{ closedAt: "2026-06-10T20:00:00.000Z", closingEmployeeName: "Jan", difference: 5 }],
    totalDifference: 5,
  },
  trend: {
    revenueDeltaPercent: 12,
    servicesDeltaPercent: null,
    bestDay: { date: "2026-06-10", services: 3 },
  },
};

describe("buildSheetData", () => {
  it("buduje 4 zestawy wierszy z czytelnymi nagłówkami", () => {
    const d = buildSheetData(sample);
    expect(d.pracownicy[0]).toMatchObject({ Pracownik: "Jan", Prowizja: 120 });
    expect(d.finanse.find((r) => r.Pozycja === "Liczba transakcji")?.Wartość).toBe(4);
    // ostatni wiersz kasy to podsumowanie
    expect(d.kasa[d.kasa.length - 1]).toMatchObject({ Data: "RAZEM", Różnica: 5 });
    // null zmiana renderowana jako "—"
    expect(d.trendy.find((r) => r.Pozycja === "Zmiana liczby usług (%)")?.Wartość).toBe("—");
  });

  it("dla pustej kasy zwraca wiersz informacyjny", () => {
    const empty = { ...sample, cash: { shifts: [], totalDifference: 0 } };
    const d = buildSheetData(empty);
    expect(d.kasa[0].Data).toBe("Brak zamknięć w okresie");
  });
});
```

- [ ] **Step 2: Uruchom — ma się wywalić**

Run: `npx vitest run src/lib/__tests__/reportExport.test.ts`
Expected: FAIL — brak modułu `../reportExport` / `buildSheetData`.

- [ ] **Step 3: Napisz `reportExport.ts`**

Utwórz `src/lib/reportExport.ts`:

```ts
// Eksport raportu do pliku Excel (.xlsx) z 4 arkuszami.
// SheetJS ładowany dynamicznie (await import) — nie obciąża startu aplikacji.

import type { MonthlyReport } from "./reports";

type Row = Record<string, string | number>;

export interface SheetData {
  pracownicy: Row[];
  finanse: Row[];
  kasa: Row[];
  trendy: Row[];
}

export function buildSheetData(report: MonthlyReport): SheetData {
  const pracownicy: Row[] = report.employees.map((e) => ({
    Pracownik: e.name,
    "Usługi (szt.)": e.servicesCount,
    "Produkty (szt.)": e.productsCount,
    "Przychód netto": e.netRevenue,
    Napiwki: e.tips,
    Prowizja: e.commission,
  }));

  const f = report.finance;
  const finanse: Row[] = [
    { Pozycja: "Przychód netto (łącznie)", Wartość: f.totalRevenue },
    { Pozycja: "Usługi", Wartość: f.serviceRevenue },
    { Pozycja: "Produkty", Wartość: f.productRevenue },
    { Pozycja: "Bony (sprzedaż)", Wartość: f.voucherSales },
    { Pozycja: "Rabaty (suma)", Wartość: f.totalDiscounts },
    { Pozycja: "Napiwki (suma)", Wartość: f.totalTips },
    { Pozycja: "Liczba transakcji", Wartość: f.txCount },
  ];

  const kasa: Row[] =
    report.cash.shifts.length > 0
      ? report.cash.shifts.map((s) => ({
          Data: s.closedAt.slice(0, 10),
          Zamknął: s.closingEmployeeName,
          Różnica: s.difference,
        }))
      : [{ Data: "Brak zamknięć w okresie", Zamknął: "", Różnica: 0 }];
  if (report.cash.shifts.length > 0) {
    kasa.push({ Data: "RAZEM", Zamknął: "", Różnica: report.cash.totalDifference });
  }

  const t = report.trend;
  const trendy: Row[] = [
    { Pozycja: "Zmiana przychodu (%)", Wartość: t.revenueDeltaPercent ?? "—" },
    { Pozycja: "Zmiana liczby usług (%)", Wartość: t.servicesDeltaPercent ?? "—" },
    {
      Pozycja: "Najlepszy dzień",
      Wartość: t.bestDay ? `${t.bestDay.date} (${t.bestDay.services} usł.)` : "—",
    },
  ];

  return { pracownicy, finanse, kasa, trendy };
}

export async function exportReportToExcel(
  report: MonthlyReport,
  fileSuffix: string
): Promise<void> {
  const XLSX = await import("xlsx");
  const data = buildSheetData(report);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.pracownicy), "Pracownicy");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.finanse), "Finanse");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.kasa), "Kasa");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data.trendy), "Trendy");
  XLSX.writeFile(wb, `raport_FORMEN_${fileSuffix}.xlsx`);
}
```

- [ ] **Step 4: Uruchom — ma przejść**

Run: `npx vitest run src/lib/__tests__/reportExport.test.ts`
Expected: PASS (2 testy).

- [ ] **Step 5: Commit**

```bash
git add src/lib/reportExport.ts src/lib/__tests__/reportExport.test.ts
git commit -m "feat(reports): eksport do .xlsx (4 arkusze) + testowalne buildSheetData

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: Strona `AdminReports.tsx`

**Files:**

- Create: `src/pages/AdminReports.tsx`

Brak testu jednostkowego strony (zgodnie z konwencją projektu — logika jest w `reports.ts`, które już ma testy). Weryfikacja manualna w Task 10.

- [ ] **Step 1: Napisz stronę**

Utwórz `src/pages/AdminReports.tsx`:

```tsx
import { useState } from "react";
import {
  Container,
  Divider,
  SegmentedControl,
  Button,
  Stack,
  Group,
  Text,
  Box,
  Table,
  SimpleGrid,
} from "@mantine/core";
import { MonthPickerInput, DatePickerInput } from "@mantine/dates";
import { IconFileSpreadsheet } from "@tabler/icons-react";
import dayjs from "dayjs";
import { db } from "@/db";
import {
  buildReport,
  monthPeriod,
  rangePeriod,
  previousPeriodOf,
  type MonthlyReport,
} from "@/lib/reports";
import { exportReportToExcel } from "@/lib/reportExport";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionLabel } from "@/components/layout/SectionLabel";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

type Mode = "month" | "range";

const card = {
  border: "1px solid var(--mantine-color-default-border)",
  borderRadius: "var(--mantine-radius-md)",
};

function zl(n: number): string {
  return `${n.toFixed(2)} zł`;
}

export default function AdminReports(): React.JSX.Element {
  useDocumentTitle("Raporty miesięczne");
  const [mode, setMode] = useState<Mode>("month");
  const [month, setMonth] = useState<Date>(new Date());
  const [from, setFrom] = useState<Date | null>(null);
  const [to, setTo] = useState<Date | null>(null);
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const canGenerate = mode === "month" ? !!month : !!from && !!to;

  async function generate(): Promise<void> {
    const period = mode === "month" ? monthPeriod(month) : rangePeriod(from!, to!);
    const previousPeriod = previousPeriodOf(period);
    setLoading(true);
    setReport(null);
    try {
      const [transactions, cashReports, employees] = await Promise.all([
        db.transactions.getSince(previousPeriod.start),
        db.dailyReports.getRecent(500),
        db.employees.getAll(),
      ]);
      setReport(buildReport({ transactions, cashReports, employees, period, previousPeriod }));
    } catch (err) {
      console.error("[AdminReports] generate failed:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleExport(): Promise<void> {
    if (!report) return;
    const suffix =
      mode === "month"
        ? dayjs(month).format("YYYY-MM")
        : `${dayjs(from!).format("YYYY-MM-DD")}_${dayjs(to!).format("YYYY-MM-DD")}`;
    setExporting(true);
    try {
      await exportReportToExcel(report, suffix);
    } catch (err) {
      console.error("[AdminReports] export failed:", err);
    } finally {
      setExporting(false);
    }
  }

  const isEmpty =
    report !== null && report.finance.txCount === 0 && report.cash.shifts.length === 0;

  return (
    <Container size="lg">
      <PageHeader title="Raporty miesięczne" backTo="/admin" />
      <Divider />

      <Stack gap="md" py="md">
        <SegmentedControl
          value={mode}
          onChange={(v) => setMode(v as Mode)}
          data={[
            { label: "Miesiąc", value: "month" },
            { label: "Zakres dat", value: "range" },
          ]}
        />

        {mode === "month" ? (
          <MonthPickerInput
            label="Miesiąc"
            value={month}
            onChange={(v) => setMonth(v ? new Date(v) : new Date())}
            valueFormat="MMMM YYYY"
            maxDate={new Date()}
          />
        ) : (
          <Group grow>
            <DatePickerInput
              label="Od"
              valueFormat="D MMM YYYY"
              value={from}
              onChange={(v) => setFrom(v ? new Date(v) : null)}
              maxDate={to ?? new Date()}
              clearable
            />
            <DatePickerInput
              label="Do"
              valueFormat="D MMM YYYY"
              value={to}
              onChange={(v) => setTo(v ? new Date(v) : null)}
              minDate={from ?? undefined}
              maxDate={new Date()}
              clearable
            />
          </Group>
        )}

        <Button onClick={generate} loading={loading} disabled={!canGenerate}>
          Generuj raport
        </Button>
      </Stack>

      {report && (
        <>
          <Group justify="space-between" align="center" mb="sm">
            <Text fw={600}>{report.period.label}</Text>
            <Button
              variant="light"
              leftSection={<IconFileSpreadsheet size={16} />}
              onClick={handleExport}
              loading={exporting}
              disabled={isEmpty}
            >
              Eksportuj do Excela
            </Button>
          </Group>

          {isEmpty ? (
            <Text c="dimmed" ta="center" py="xl">
              Brak danych za wybrany okres
            </Text>
          ) : (
            <Stack gap="lg">
              {/* FINANSE */}
              <div>
                <SectionLabel>Finanse salonu</SectionLabel>
                <SimpleGrid cols={2} spacing="sm">
                  <Box p="md" style={card}>
                    <Text fz="xs" c="dimmed">
                      Przychód netto
                    </Text>
                    <Text fw={700} fz="xl">
                      {zl(report.finance.totalRevenue)}
                    </Text>
                  </Box>
                  <Box p="md" style={card}>
                    <Text fz="xs" c="dimmed">
                      Transakcje
                    </Text>
                    <Text fw={700} fz="xl">
                      {report.finance.txCount}
                    </Text>
                  </Box>
                  <Box p="md" style={card}>
                    <Text fz="xs" c="dimmed">
                      Usługi / Produkty
                    </Text>
                    <Text fw={700} fz="md">
                      {zl(report.finance.serviceRevenue)} / {zl(report.finance.productRevenue)}
                    </Text>
                  </Box>
                  <Box p="md" style={card}>
                    <Text fz="xs" c="dimmed">
                      Bony / Rabaty / Napiwki
                    </Text>
                    <Text fw={700} fz="md">
                      {zl(report.finance.voucherSales)} / {zl(report.finance.totalDiscounts)} /{" "}
                      {zl(report.finance.totalTips)}
                    </Text>
                  </Box>
                </SimpleGrid>
              </div>

              {/* PRACOWNICY */}
              <div>
                <SectionLabel>Rozliczenie pracowników</SectionLabel>
                <Box style={card} p="xs">
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Pracownik</Table.Th>
                        <Table.Th ta="right">Usł.</Table.Th>
                        <Table.Th ta="right">Prod.</Table.Th>
                        <Table.Th ta="right">Przychód</Table.Th>
                        <Table.Th ta="right">Napiwki</Table.Th>
                        <Table.Th ta="right">Prowizja</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {report.employees.map((e) => (
                        <Table.Tr key={e.employeeId}>
                          <Table.Td>{e.name}</Table.Td>
                          <Table.Td ta="right">{e.servicesCount}</Table.Td>
                          <Table.Td ta="right">{e.productsCount}</Table.Td>
                          <Table.Td ta="right">{zl(e.netRevenue)}</Table.Td>
                          <Table.Td ta="right">{zl(e.tips)}</Table.Td>
                          <Table.Td ta="right">{zl(e.commission)}</Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Box>
              </div>

              {/* KASA */}
              <div>
                <SectionLabel>Kontrola gotówki</SectionLabel>
                <Box p="md" style={card}>
                  <Group justify="space-between">
                    <Text fz="sm" c="dimmed">
                      Bilans kasowy (suma różnic)
                    </Text>
                    <Text
                      fw={700}
                      fz="xl"
                      c={
                        report.cash.totalDifference === 0
                          ? undefined
                          : report.cash.totalDifference > 0
                            ? "green"
                            : "red"
                      }
                    >
                      {zl(report.cash.totalDifference)}
                    </Text>
                  </Group>
                  {report.cash.shifts.length > 0 && (
                    <Table mt="sm">
                      <Table.Tbody>
                        {report.cash.shifts.map((s, i) => (
                          <Table.Tr key={i}>
                            <Table.Td>{s.closedAt.slice(0, 10)}</Table.Td>
                            <Table.Td>{s.closingEmployeeName}</Table.Td>
                            <Table.Td
                              ta="right"
                              c={
                                s.difference === 0 ? undefined : s.difference > 0 ? "green" : "red"
                              }
                            >
                              {zl(s.difference)}
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  )}
                </Box>
              </div>

              {/* TRENDY */}
              <div>
                <SectionLabel>Trendy</SectionLabel>
                <SimpleGrid cols={3} spacing="sm">
                  <Box p="md" style={card}>
                    <Text fz="xs" c="dimmed">
                      Zmiana przychodu
                    </Text>
                    <Text fw={700} fz="lg">
                      {report.trend.revenueDeltaPercent === null
                        ? "—"
                        : `${report.trend.revenueDeltaPercent}%`}
                    </Text>
                  </Box>
                  <Box p="md" style={card}>
                    <Text fz="xs" c="dimmed">
                      Zmiana liczby usług
                    </Text>
                    <Text fw={700} fz="lg">
                      {report.trend.servicesDeltaPercent === null
                        ? "—"
                        : `${report.trend.servicesDeltaPercent}%`}
                    </Text>
                  </Box>
                  <Box p="md" style={card}>
                    <Text fz="xs" c="dimmed">
                      Najlepszy dzień
                    </Text>
                    <Text fw={700} fz="md">
                      {report.trend.bestDay
                        ? `${report.trend.bestDay.date} (${report.trend.bestDay.services})`
                        : "—"}
                    </Text>
                  </Box>
                </SimpleGrid>
              </div>
            </Stack>
          )}
        </>
      )}
    </Container>
  );
}
```

> Jeśli `SectionLabel` nie istnieje w `src/components/layout/`, sprawdź import w `Stats.tsx:29` i użyj tej samej ścieżki; w razie braku zastąp `<Text fw={600} fz="sm" c="dimmed" tt="uppercase" mb="xs">...</Text>`.

- [ ] **Step 2: Sprawdź typy**

Run: `npx tsc --noEmit`
Expected: exit 0 (brak błędów). Jeśli `MonthPickerInput`/`DatePickerInput` zgłaszają niezgodność typu `value`, wzoruj się dokładnie na `History.tsx:139-156`.

- [ ] **Step 3: Commit**

```bash
git add src/pages/AdminReports.tsx
git commit -m "feat(reports): strona AdminReports - wybor okresu, 4 sekcje, eksport

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 9: Podpięcie trasy i aktywacja linku

**Files:**

- Modify: `src/App.tsx`
- Modify: `src/pages/Admin.tsx:164-169`

- [ ] **Step 1: Dodaj lazy import w `App.tsx`**

W `src/App.tsx` po linii 24 (`const More = lazy(...)`) dodaj:

```tsx
const AdminReports = lazy(() => import("@/pages/AdminReports"));
```

- [ ] **Step 2: Dodaj trasę w `App.tsx`**

W `src/App.tsx`, po bloku trasy `/admin/settings` (linia ~84), dodaj:

```tsx
<Route
  path="/admin/reports"
  element={
    <AdminGuard>
      <AdminReports />
    </AdminGuard>
  }
/>
```

- [ ] **Step 3: Aktywuj link w `Admin.tsx`**

W `src/pages/Admin.tsx` zastąp blok (linie 164-169):

```tsx
<AdminLink
  label="Raporty miesięczne"
  description="Zestawienia, eksport"
  onClick={() => {}}
  disabled
/>
```

nowym:

```tsx
<AdminLink
  label="Raporty miesięczne"
  description="Zestawienia, eksport"
  onClick={() => navigate("/admin/reports")}
/>
```

- [ ] **Step 4: Sprawdź typy i testy**

Run: `npx tsc --noEmit && npx vitest run`
Expected: tsc exit 0; wszystkie testy PASS (poprzednie 68 + 11 nowych = 79).

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/pages/Admin.tsx
git commit -m "feat(reports): trasa /admin/reports + aktywacja linku w panelu admina

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 10: Weryfikacja końcowa (lint, build, manualnie)

**Files:** brak zmian (chyba że naprawy)

- [ ] **Step 1: Lint + format + pełne testy + typy**

Run: `npm run lint && npx tsc --noEmit && npx vitest run`
Expected: brak błędów lint; tsc exit 0; wszystkie testy PASS.

- [ ] **Step 2: Build produkcyjny (weryfikuje code splitting xlsx)**

Run: `npm run build`
Expected: build się udaje; w logu Vite widać osobny chunk dla `xlsx` (ładowany leniwie).

- [ ] **Step 3: Weryfikacja manualna w dev**

Run: `npm run dev`
Następnie w przeglądarce: Panel admina (PIN 1234) → „Raporty miesięczne" → tryb „Miesiąc" → „Generuj raport".
Expected:

- 4 sekcje pokazują dane (lub „Brak danych za wybrany okres" gdy pusto),
- „Eksportuj do Excela" pobiera plik `raport_FORMEN_2026-06.xlsx` z 4 arkuszami,
- tryb „Zakres dat" (Od/Do) działa analogicznie, nazwa pliku z zakresem dat.

> Uwaga DEV: baza DEV ma ~5200 testowego szumu w różnicach kasowych (patrz pamięć „Bilans kasowy") — sekcja kasy pokaże te dane, to normalne.

- [ ] **Step 4: Aktualizacja dokumentacji**

Zaktualizuj `changelog.txt` (nowy wpis z numerem wersji), `TODO.md` (odhaczenie „Raporty miesięczne") oraz w `CLAUDE.md` liczbę testów jeśli ją podbiłeś (66 → aktualna). Commit:

```bash
git add changelog.txt TODO.md CLAUDE.md
git commit -m "docs(reports): changelog + TODO + liczba testow dla raportow miesiecznych

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-review (wykonane przy pisaniu planu)

- **Pokrycie specu:** finanse (T3), pracownicy+prowizja (T4), kasa (T5), trendy (T6), eksport xlsx 4 arkusze (T7), wybór miesiąc/zakres (T2+T8), stany puste (T8), trasa+link (T9). ✔
- **Brak placeholderów:** każdy krok z kodem ma pełny kod i komendę z oczekiwanym wynikiem. ✔
- **Spójność typów:** `MonthlyReport`/`BuildReportInput`/`buildReport`/`buildSheetData`/`exportReportToExcel(report, fileSuffix)` używane spójnie w T2-T9. `previousPeriodOf` zwraca okres tej samej długości (przybliżenie miesiąca — udokumentowane). ✔
- **Ryzyka:** (1) typ `value` w pickerach Mantine 9 — mitygacja: wzór z `History.tsx`. (2) strefa czasowa w granicach okresu — akceptowalna (spójna), poza zakresem. (3) `SectionLabel` — fallback podany w T8.
