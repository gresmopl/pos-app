import { describe, it, expect } from "vitest";
import {
  summarizeHistory,
  transactionAmountFor,
  revenueFor,
  matchesTypeFilter,
} from "../historySummary";
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

describe("revenueFor", () => {
  it('przy "all" odejmuje napiwek od kwoty transakcji', () => {
    // Klient zaplacil 100, w tym 20 napiwku - salon zarobil 80.
    expect(revenueFor(mixed, "all")).toBe(80);
  });

  it("rozni sie od transactionAmountFor dokladnie o napiwek", () => {
    expect(transactionAmountFor(mixed, "all") - revenueFor(mixed, "all")).toBe(mixed.tipAmount);
  });

  it("przy braku napiwku obie funkcje daja to samo", () => {
    const bezNapiwku = tx({ tipAmount: 0 });
    expect(revenueFor(bezNapiwku, "all")).toBe(transactionAmountFor(bezNapiwku, "all"));
  });

  it("przy filtrze typu odejmuje rabat od pozycji danego typu", () => {
    // mixed ma rabat 10: uslugi 50-10=40, produkty 60-10=50
    expect(revenueFor(mixed, "service")).toBe(40);
    expect(revenueFor(mixed, "product")).toBe(50);
  });

  it("NIEZMIENNIK: dla wizyty jednorodnej utarg jest ten sam przy kazdym filtrze", () => {
    // total_amount = suma pozycji - rabat + napiwek, wiec dla wizyty zlozonej
    // z samych uslug: lineSum - rabat == totalAmount - napiwek. Ten test pilnuje,
    // ze obie sciezki liczenia daja to samo, i zlapie kazde rozjechanie sie wzoru.
    const jednorodna = tx({
      items: [{ name: "Strzyżenie", price: 80, quantity: 1, type: "service" }],
      totalAmount: 50, // 80 - 50 rabatu + 20 napiwku
      discountAmount: 50,
      tipAmount: 20,
    });
    expect(revenueFor(jednorodna, "service")).toBe(revenueFor(jednorodna, "all"));
    expect(revenueFor(jednorodna, "service")).toBe(30);
  });

  it("przypadek skrajny: wizyta mieszana z rabatem wiekszym niz strona daje wynik ujemny", () => {
    // Udokumentowane zachowanie, NIE obcinamy do zera: rabat jest zapisany na calej
    // transakcji, wiec przy wizycie mieszanej odejmuje sie w calosci od kazdej strony.
    // W danych salonu taka sytuacja nie wystapila ani razu (0 na 1000 transakcji),
    // a widoczna anomalia jest lepsza niz po cichu zamaskowana.
    const skrajna = tx({
      items: [
        { name: "Strzyżenie", price: 80, quantity: 1, type: "service" },
        { name: "Pomada", price: 10, quantity: 1, type: "product" },
      ],
      totalAmount: 40,
      discountAmount: 50,
      tipAmount: 0,
    });
    expect(revenueFor(skrajna, "product")).toBe(-40);
  });
});

describe("summarizeHistory", () => {
  it("dla pustej listy zwraca same zera", () => {
    expect(summarizeHistory([], "all")).toEqual({
      transactionCount: 0,
      serviceCount: 0,
      productCount: 0,
      tipsTotal: 0,
      discountsTotal: 0,
      totalRevenue: 0,
    });
  });

  it("sumuje rabaty z wielu transakcji", () => {
    const r = summarizeHistory(
      [tx({ discountAmount: 5 }), tx({ id: "t2", discountAmount: 20 }), tx({ id: "t3" })],
      "all"
    );
    expect(r.discountsTotal).toBe(25);
  });

  it("discountsTotal nie zalezy od filtru typu", () => {
    // Tak jak tipsTotal: rabat nalezy do calej transakcji. Komponent pokazuje to pole
    // tylko przy filtrze typu, bo tylko tam Utarg potrzebuje wyjasnienia.
    const wartosci = (["all", "service", "product"] as const).map(
      (f) => summarizeHistory([mixed], f).discountsTotal
    );
    expect(wartosci).toEqual([10, 10, 10]);
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

  it('utarg przy "all" to kwoty transakcji BEZ napiwkow', () => {
    // mixed: zaplacone 100, w tym 20 napiwku -> 80. Druga tx: 50 bez napiwku.
    expect(summarizeHistory([mixed, tx({ id: "b" })], "all").totalRevenue).toBe(130);
  });

  it("suma kwot z wierszy = utarg + napiwki", () => {
    // Wiersz pokazuje, ile zaplacil klient; Utarg, ile zarobil salon.
    // Roznica to dokladnie pole "Napiwki" - dzieki temu obie liczby wolno dodac.
    const lista = [mixed, tx({ id: "b", tipAmount: 5, totalAmount: 55 })];
    const r = summarizeHistory(lista, "all");
    const sumaWierszy = lista.reduce((s, t) => s + transactionAmountFor(t, "all"), 0);
    expect(sumaWierszy).toBe(r.totalRevenue + r.tipsTotal);
  });

  it('utarg przy "service" pomija pozycje produktowe i odejmuje rabat', () => {
    expect(summarizeHistory([mixed], "service").totalRevenue).toBe(40);
  });

  it('utarg przy "product" pomija pozycje uslugowe i odejmuje rabat', () => {
    expect(summarizeHistory([mixed], "product").totalRevenue).toBe(50);
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

describe("filtry Napiwki i Rabat", () => {
  const plain = tx();

  it('"tip" przepuszcza tylko transakcje z napiwkiem', () => {
    expect(matchesTypeFilter(mixed, "tip")).toBe(true);
    expect(matchesTypeFilter(plain, "tip")).toBe(false);
  });

  it('"discount" przepuszcza tylko transakcje z rabatem', () => {
    expect(matchesTypeFilter(mixed, "discount")).toBe(true);
    expect(matchesTypeFilter(plain, "discount")).toBe(false);
  });

  it("filtry typu pozycji dzialaja jak dotad", () => {
    expect(matchesTypeFilter(mixed, "product")).toBe(true);
    expect(matchesTypeFilter(plain, "product")).toBe(false);
    expect(matchesTypeFilter(plain, "all")).toBe(true);
  });

  it("kwota w wierszu to napiwek / rabat transakcji", () => {
    expect(transactionAmountFor(mixed, "tip")).toBe(20);
    expect(transactionAmountFor(mixed, "discount")).toBe(10);
  });

  it('utarg przy "tip" i "discount" liczy sie jak przy "all"', () => {
    expect(revenueFor(mixed, "tip")).toBe(revenueFor(mixed, "all"));
    expect(revenueFor(mixed, "discount")).toBe(revenueFor(mixed, "all"));
  });

  it("transactionCount to liczba transakcji, nie pozycji", () => {
    expect(summarizeHistory([mixed, plain], "all").transactionCount).toBe(2);
  });
});
