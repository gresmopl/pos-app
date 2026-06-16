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
