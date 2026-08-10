import { describe, it, expect } from "vitest";
import { summarizeHistory, transactionAmountFor } from "../historySummary";
import type { Transaction } from "../types";

function tx(over: Partial<Transaction> = {}): Transaction {
  return {
    id: "t1",
    employeeId: "e1",
    employeeName: "Jan",
    items: [{ name: "Strzyżenie", price: 50, quantity: 1, type: "service" }],
    totalAmount: 50,
    tipAmount: 0,
    discountAmount: 0,
    timestamp: "2026-08-10T10:00:00.000Z",
    ...over,
  };
}

// Wizyta mieszana: strzyzenie 50 + dwie pomady po 30 = 110, napiwek 20.
// totalAmount 100 celowo rozni sie od sumy pozycji (rabat 10) - dzieki temu
// widac, ktora sciezka liczenia zostala uzyta.
const mixed = tx({
  id: "mix",
  items: [
    { name: "Strzyżenie", price: 50, quantity: 1, type: "service" },
    { name: "Pomada", price: 30, quantity: 2, type: "product" },
  ],
  totalAmount: 100,
  tipAmount: 20,
  discountAmount: 10,
});

describe("transactionAmountFor", () => {
  it('przy "all" zwraca pelna kwote transakcji', () => {
    expect(transactionAmountFor(mixed, "all")).toBe(100);
  });

  it('przy "service" zwraca sume samych uslug', () => {
    expect(transactionAmountFor(mixed, "service")).toBe(50);
  });

  it('przy "product" zwraca sume samych produktow (z uwzglednieniem ilosci)', () => {
    expect(transactionAmountFor(mixed, "product")).toBe(60);
  });
});

describe("summarizeHistory", () => {
  it("dla pustej listy zwraca same zera", () => {
    expect(summarizeHistory([], "all")).toEqual({
      serviceCount: 0,
      productCount: 0,
      tipsTotal: 0,
      totalRevenue: 0,
    });
  });

  it("transakcje bez napiwkow daja tipsTotal 0", () => {
    const r = summarizeHistory([tx(), tx({ id: "t2" })], "all");
    expect(r.tipsTotal).toBe(0);
  });

  it("sumuje napiwki z wielu transakcji", () => {
    const r = summarizeHistory(
      [tx({ tipAmount: 10 }), tx({ id: "t2", tipAmount: 15 }), tx({ id: "t3" })],
      "all"
    );
    expect(r.tipsTotal).toBe(25);
  });

  it("liczniki uwzgledniaja quantity, a nie liczbe wierszy", () => {
    const r = summarizeHistory([mixed], "all");
    expect(r.serviceCount).toBe(1);
    expect(r.productCount).toBe(2);
  });

  it('utarg przy "all" to pelne kwoty transakcji', () => {
    expect(summarizeHistory([mixed, tx({ id: "b" })], "all").totalRevenue).toBe(150);
  });

  it('utarg przy "service" pomija pozycje produktowe z tej samej transakcji', () => {
    expect(summarizeHistory([mixed], "service").totalRevenue).toBe(50);
  });

  it('utarg przy "product" pomija pozycje uslugowe z tej samej transakcji', () => {
    expect(summarizeHistory([mixed], "product").totalRevenue).toBe(60);
  });

  it("tipsTotal nie zalezy od filtru typu", () => {
    // Dlatego pole "Napiwki" jest w UI UKRYWANE przy filtrze typu, a nie zerowane:
    // logika zawsze zwraca prawdziwa sume, decyzja o pokazaniu nalezy do komponentu.
    const all = summarizeHistory([mixed], "all").tipsTotal;
    const service = summarizeHistory([mixed], "service").tipsTotal;
    const product = summarizeHistory([mixed], "product").tipsTotal;
    expect([all, service, product]).toEqual([20, 20, 20]);
  });
});
