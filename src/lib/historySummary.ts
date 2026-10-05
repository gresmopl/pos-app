import type { Transaction } from "./types";
import { lineSum, countItems } from "./reports";

export type HistoryTypeFilter = "all" | "service" | "product" | "tip" | "discount";

/**
 * Czy transakcja przechodzi przez filtr typu. "Napiwki" i "Rabat" pokazuja tylko
 * transakcje, w ktorych napiwek/rabat faktycznie wystapil.
 */
export function matchesTypeFilter(tx: Transaction, typeFilter: HistoryTypeFilter): boolean {
  switch (typeFilter) {
    case "all":
      return true;
    case "tip":
      return tx.tipAmount > 0;
    case "discount":
      return tx.discountAmount > 0;
    default:
      return tx.items.some((i) => i.type === typeFilter);
  }
}

export interface HistorySummary {
  transactionCount: number;
  serviceCount: number;
  productCount: number;
  tipsTotal: number;
  discountsTotal: number;
  totalRevenue: number;
}

/**
 * Kwota transakcji pokazywana przy aktywnym filtrze typu.
 *
 * Przy filtrze "Uslugi" albo "Produkty" liczymy sume samych pozycji danego typu,
 * zeby np. "Produkty" nie doliczaly uslug sprzedanych w tej samej wizycie.
 * Uzywane w DWOCH miejscach: w kwocie pojedynczego wiersza i w sumie utargu -
 * dlatego regula mieszka tutaj, a nie w komponencie.
 */
export function transactionAmountFor(tx: Transaction, typeFilter: HistoryTypeFilter): number {
  switch (typeFilter) {
    case "all":
      return tx.totalAmount;
    case "tip":
      return tx.tipAmount;
    case "discount":
      return tx.discountAmount;
    default:
      return lineSum(tx, typeFilter);
  }
}

/**
 * Przychod salonu z jednej transakcji - to, co trafia do pola "Utarg".
 *
 * Rozni sie od transactionAmountFor o napiwek: napiwek przechodzi przez kase,
 * ale nalezy do pracownika, nie do salonu. Ta sama zasada obowiazuje juz w
 * raportach miesiecznych (reports.ts - totalRevenue i netRevenue) oraz przy
 * naliczaniu prowizji (commission.ts - netAmount), wiec Historia liczy teraz
 * to samo co reszta systemu.
 *
 * Przy filtrze typu odejmujemy rabat od sumy pozycji danego typu, zeby Utarg zawsze
 * znaczyl "ile faktycznie weszlo", niezaleznie od ustawionego filtru. Dla wizyty
 * jednorodnej wychodzi z tego dokladnie to samo co przy "all", bo
 * total_amount = suma pozycji - rabat + napiwek (pilnuje tego test niezmiennika).
 *
 * OGRANICZENIE: rabat jest zapisany na calej transakcji (discount_value), a nie
 * rozbity na pozycje - nie da sie stwierdzic, z ktorej pozycji zostal udzielony.
 * Przy wizycie mieszanej (usluga + produkt) odejmie sie w calosci od kazdej strony,
 * co przy duzym rabacie moze dac wynik ujemny. Celowo tego NIE obcinamy do zera:
 * w danych salonu taka wizyta nie wystapila ani razu, a widoczna anomalia jest
 * lepsza niz po cichu zamaskowana.
 */
export function revenueFor(tx: Transaction, typeFilter: HistoryTypeFilter): number {
  return typeFilter === "service" || typeFilter === "product"
    ? lineSum(tx, typeFilter) - tx.discountAmount
    : tx.totalAmount - tx.tipAmount;
}

/**
 * Cala arytmetyka dolnej belki podsumowania w Historii sprzedazy.
 *
 * tipsTotal celowo NIE zalezy od typeFilter - napiwek nalezy do calej transakcji,
 * nie do pozycji, wiec nie da sie go podzielic miedzy uslugi i produkty. Komponent
 * pokazuje go tylko przy filtrze "Napiwki" (analogicznie discountsTotal - "Rabat").
 *
 * totalRevenue liczy przychod BEZ napiwkow, wiec suma kwot z wierszy nie jest
 * rowna Utargowi - rozni sie o dokladnie tipsTotal. To celowe: wiersz pokazuje,
 * ile zaplacil klient, a Utarg, ile zarobil salon.
 */
export function summarizeHistory(
  transactions: Transaction[],
  typeFilter: HistoryTypeFilter
): HistorySummary {
  let serviceCount = 0;
  let productCount = 0;
  let tipsTotal = 0;
  let discountsTotal = 0;
  let totalRevenue = 0;

  for (const tx of transactions) {
    serviceCount += countItems(tx, "service");
    productCount += countItems(tx, "product");
    tipsTotal += tx.tipAmount;
    discountsTotal += tx.discountAmount;
    totalRevenue += revenueFor(tx, typeFilter);
  }

  return {
    transactionCount: transactions.length,
    serviceCount,
    productCount,
    tipsTotal,
    discountsTotal,
    totalRevenue,
  };
}
