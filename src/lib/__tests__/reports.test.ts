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
