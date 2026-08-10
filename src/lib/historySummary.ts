import type { Transaction } from "./types";
import { lineSum, countItems } from "./reports";

export type HistoryTypeFilter = "all" | "service" | "product";

export interface HistorySummary {
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
  return typeFilter === "all" ? tx.totalAmount : lineSum(tx, typeFilter);
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
  return typeFilter === "all"
    ? tx.totalAmount - tx.tipAmount
    : lineSum(tx, typeFilter) - tx.discountAmount;
}

/**
 * Cala arytmetyka dolnej belki podsumowania w Historii sprzedazy.
 *
 * tipsTotal celowo NIE zalezy od typeFilter - napiwek nalezy do calej transakcji,
 * nie do pozycji, wiec nie da sie go podzielic miedzy uslugi i produkty. Komponent
 * ukrywa to pole przy aktywnym filtrze typu zamiast pokazywac mylaca liczbe.
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

  return { serviceCount, productCount, tipsTotal, discountsTotal, totalRevenue };
}
