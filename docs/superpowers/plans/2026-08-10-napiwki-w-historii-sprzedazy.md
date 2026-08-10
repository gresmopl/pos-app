# Suma napiwków w Historii sprzedaży — plan implementacji

> **Dla agentów wykonawczych:** WYMAGANY SUB-SKILL: użyj `superpowers:subagent-driven-development` (zalecane) albo `superpowers:executing-plans`, żeby wykonać ten plan zadanie po zadaniu. Kroki mają składnię checkboxów (`- [ ]`) do śledzenia postępu.

**Spec:** `docs/superpowers/specs/2026-08-10-napiwki-w-historii-sprzedazy-design.md` (commity `6152393`, `baee102`)

**Cel:** Pokazać sumę napiwków w dolnej belce Historii sprzedaży, ukrywaną przy filtrze typu, i przy okazji wyciągnąć całą arytmetykę podsumowania z komponentu do testowalnej funkcji.

**Architektura:** Nowy moduł `src/lib/historySummary.ts` z dwiema czystymi funkcjami, złożonymi z istniejących pomocników `lineSum` i `countItems` z `src/lib/reports.ts`. `History.tsx` przestaje liczyć cokolwiek samodzielnie.

**Stack:** React 19 + TypeScript (strict), Mantine UI 9, Vitest.

## Global Constraints

- **Język kodu angielski, język interfejsu polski** (z pełnymi znakami diakrytycznymi).
- **Tylko komponenty Mantine 9.** Bez surowego CSS poza propsami Mantine.
- **TypeScript strict**, jawne typy zwracane dla eksportowanych funkcji.
- **NIE podbijaj wersji** w `package.json`. Zostaje `0.1.125`.
- **NIE pushuj.** Praca na branchu `feat/history-tips`, odbitym od `main`.
- **Nie modyfikuj `.mcp.json`** — ma niezacommitowane zmiany użytkownika.
- Pre-commit (Husky + lint-staged) sam uruchamia Prettier i ESLint — nie formatuj ręcznie.
- Pełna weryfikacja: `npm run lint && npx tsc --noEmit && npm test`.
- Stan wyjściowy: **100 testów w 13 plikach**. Po planie ma być więcej i wszystkie zielone.

## Odstępstwo od spec-a (świadome)

Spec zakładał, że do `historySummary.ts` trafi tylko `summarizeHistory`. Przy rozpoznaniu wyszło, że reguła „przy filtrze typu licz sumę samych pozycji tego typu" jest w komponencie używana **dwa razy**: w podsumowaniu (`History.tsx:123`) **oraz w kwocie pojedynczego wiersza** (`History.tsx:298`, funkcja `displayAmount`). Gdyby przenieść do `summarizeHistory` tylko sumę, ta sama reguła żyłaby w dwóch miejscach i mogłaby się rozjechać — dokładnie tak, jak przy błędzie naprawionym w `c748d0e`.

Dlatego moduł eksportuje **dwie** funkcje: `transactionAmountFor` (reguła dla jednej transakcji, używana przez wiersz) oraz `summarizeHistory` (używa jej wewnętrznie). `displayAmount` znika z komponentu.

## Struktura plików

| Plik                                       | Odpowiedzialność                                                      | Zadanie |
| ------------------------------------------ | --------------------------------------------------------------------- | ------- |
| `src/lib/reports.ts`                       | Eksport istniejącej, prywatnej `countItems`                           | 1       |
| `src/lib/historySummary.ts`                | `transactionAmountFor` + `summarizeHistory`                           | 1       |
| `src/lib/__tests__/historySummary.test.ts` | Testy obu funkcji                                                     | 1       |
| `src/pages/History.tsx`                    | Użycie modułu zamiast obliczeń inline + pole „Napiwki" w dolnej belce | 2       |

---

## Task 1: Moduł `historySummary.ts`

**Files:**

- Modify: `src/lib/reports.ts:131` (dodanie `export` przed `function countItems`)
- Create: `src/lib/historySummary.ts`
- Create: `src/lib/__tests__/historySummary.test.ts`

**Interfaces:**

- Consumes: `lineSum(tx, type)` z `@/lib/reports` (istnieje, `reports.ts:127`), `countItems(tx, type)` z `@/lib/reports` (istnieje jako prywatna, eksportowana w Step 1), typ `Transaction` z `@/lib/types`.
- Produces (używane przez Zadanie 2):
  - `type HistoryTypeFilter = "all" | "service" | "product"`
  - `interface HistorySummary { serviceCount: number; productCount: number; tipsTotal: number; totalRevenue: number }`
  - `transactionAmountFor(tx: Transaction, typeFilter: HistoryTypeFilter): number`
  - `summarizeHistory(transactions: Transaction[], typeFilter: HistoryTypeFilter): HistorySummary`

- [x] **Step 1: Wyeksportuj `countItems` z `reports.ts`**

W `src/lib/reports.ts:131` zmień:

```ts
function countItems(tx: Transaction, type: TransactionItem["type"]): number {
```

na:

```ts
export function countItems(tx: Transaction, type: TransactionItem["type"]): number {
```

Ciała funkcji nie ruszaj. Reszta `reports.ts` bez zmian.

- [x] **Step 2: Napisz failujące testy**

Utwórz `src/lib/__tests__/historySummary.test.ts`:

```ts
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
```

- [x] **Step 3: Uruchom testy i potwierdź, że padają**

Run: `npx vitest run src/lib/__tests__/historySummary.test.ts`
Expected: FAIL — `Failed to resolve import "../historySummary"`.

- [x] **Step 4: Zaimplementuj moduł**

Utwórz `src/lib/historySummary.ts`:

```ts
import type { Transaction } from "./types";
import { lineSum, countItems } from "./reports";

export type HistoryTypeFilter = "all" | "service" | "product";

export interface HistorySummary {
  serviceCount: number;
  productCount: number;
  tipsTotal: number;
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
 * Cala arytmetyka dolnej belki podsumowania w Historii sprzedazy.
 *
 * tipsTotal celowo NIE zalezy od typeFilter - napiwek nalezy do calej transakcji,
 * nie do pozycji, wiec nie da sie go podzielic miedzy uslugi i produkty. Komponent
 * ukrywa to pole przy aktywnym filtrze typu zamiast pokazywac mylaca liczbe.
 */
export function summarizeHistory(
  transactions: Transaction[],
  typeFilter: HistoryTypeFilter
): HistorySummary {
  let serviceCount = 0;
  let productCount = 0;
  let tipsTotal = 0;
  let totalRevenue = 0;

  for (const tx of transactions) {
    serviceCount += countItems(tx, "service");
    productCount += countItems(tx, "product");
    tipsTotal += tx.tipAmount;
    totalRevenue += transactionAmountFor(tx, typeFilter);
  }

  return { serviceCount, productCount, tipsTotal, totalRevenue };
}
```

- [x] **Step 5: Uruchom testy i potwierdź, że przechodzą**

Run: `npx vitest run src/lib/__tests__/historySummary.test.ts`
Expected: PASS — 11 testów.

- [x] **Step 6: Sprawdź, że nic się nie zepsuło**

Run: `npx tsc --noEmit && npm test`
Expected: `tsc` bez błędów, 111 testów zielonych (100 + 11).

- [x] **Step 7: Commit**

```bash
git add src/lib/historySummary.ts src/lib/__tests__/historySummary.test.ts src/lib/reports.ts
git commit -m "feat(history): modul historySummary z arytmetyka podsumowania"
```

---

## Task 2: Podpięcie w `History.tsx` i pole „Napiwki"

**Files:**

- Modify: `src/pages/History.tsx` — import (linia 5), obliczenia (linie 107-123), kwota wiersza (linia 298), dolna belka (linie 411-432)

**Interfaces:**

- Consumes: `summarizeHistory`, `transactionAmountFor`, `HistoryTypeFilter` z `@/lib/historySummary` (Zadanie 1).
- Produces: nic dla dalszych zadań.

- [x] **Step 1: Popraw importy**

W `src/pages/History.tsx:5` jest dziś:

```ts
import { lineSum } from "@/lib/reports";
```

Zamień na:

```ts
import { summarizeHistory, transactionAmountFor } from "@/lib/historySummary";
```

`lineSum` przestaje być w tym pliku potrzebna — używa jej teraz `historySummary.ts`. Jeśli ESLint zgłosi nieużywany import, to znaczy, że gdzieś został — usuń go.

- [x] **Step 2: Zastąp obliczenia inline wywołaniem funkcji**

Zamień cały blok `History.tsx:107-123` (od `const serviceCount = filtered.reduce(` do `const totalRevenue = filtered.reduce(...)` włącznie) na:

```tsx
const summary = summarizeHistory(filtered, typeFilter);
```

To usuwa `serviceCount`, `productCount`, `displayAmount` i `totalRevenue` z komponentu.

- [x] **Step 3: Popraw kwotę w wierszu transakcji**

W `History.tsx` (dawna linia 298, po zmianie z kroku 2 numer się przesunie — szukaj `displayAmount(transaction)`) zamień:

```tsx
{
  displayAmount(transaction).toLocaleString("pl-PL");
}
zł;
```

na:

```tsx
{
  transactionAmountFor(transaction, typeFilter).toLocaleString("pl-PL");
}
zł;
```

- [x] **Step 4: Dodaj pole „Napiwki" do dolnej belki**

W bloku dolnej belki (dawne linie 411-432) zamień zawartość `<Group justify="space-between">` na:

```tsx
<Group justify="space-between">
  <div>
    <SectionLabel>Usługi</SectionLabel>
    <Text fw={700} fz="xl">
      {summary.serviceCount}
    </Text>
  </div>
  {summary.productCount > 0 && (
    <div style={{ textAlign: "center" }}>
      <SectionLabel>Produkty</SectionLabel>
      <Text fw={700} fz="xl">
        {summary.productCount}
      </Text>
    </div>
  )}
  {/* Napiwek nalezy do calej transakcji, nie do pozycji - przy filtrze
                typu ta sama kwota liczylaby sie i do uslug, i do produktow. */}
  {typeFilter === "all" && (
    <div style={{ textAlign: "center" }}>
      <SectionLabel>Napiwki</SectionLabel>
      <Text fw={700} fz="xl">
        {summary.tipsTotal.toLocaleString("pl-PL")} zł
      </Text>
    </div>
  )}
  <div style={{ textAlign: "right" }}>
    <SectionLabel>Utarg</SectionLabel>
    <Text fw={700} fz="xl" c="green">
      {summary.totalRevenue.toLocaleString("pl-PL")} zł
    </Text>
  </div>
</Group>
```

- [x] **Step 5: Weryfikacja typów, lintu i testów**

Run: `npm run lint && npx tsc --noEmit && npm test`
Expected: wszystko czyste, 111 testów zielonych.

Częsta pułapka: jeśli `tsc` zgłasza, że `typeFilter` ma zły typ przy wywołaniu `summarizeHistory`, sprawdź deklarację stanu w `History.tsx:75` — jest tam `useState<"all" | "service" | "product">`, czyli dokładnie `HistoryTypeFilter`. Można ją opcjonalnie zamienić na `useState<HistoryTypeFilter>` z importem typu, ale nie jest to konieczne.

- [x] **Step 6: Sprawdzenie w działającej aplikacji**

Run: `npm run dev`

Wejdź na `/history` i sprawdź:

1. Przy filtrze „Wszystko" belka ma cztery pola: Usługi, Produkty, **Napiwki**, Utarg.
2. Kwota w polu „Napiwki" zgadza się z sumą napiwków widocznych w wierszach.
3. Po przełączeniu na „Usługi" albo „Produkty" pole **Napiwki znika**, a Utarg zmienia się na sumę samych pozycji danego typu (zachowanie sprzed zmiany — nie może się zepsuć).
4. Kliknięcie avatara pracownika zawęża wszystkie cztery liczby do jego transakcji.
5. Zakres dat bez żadnych napiwków pokazuje **`Napiwki 0 zł`**, a nie ukryte pole.
6. Na wąskim ekranie (tryb telefonu w DevTools, ~360 px) cztery pola mieszczą się w belce i nie nachodzą na siebie.

Punkt 6 jest istotny: belka jest przypięta na dole i miała dotąd maksymalnie trzy pola. Jeśli na 360 px robi się ciasno, zgłoś to zamiast poprawiać na własną rękę — decyzja o skróceniu etykiet albo zmniejszeniu czcionki należy do właściciela.

- [x] **Step 7: Commit**

```bash
git add src/pages/History.tsx
git commit -m "feat(history): suma napiwkow w belce podsumowania"
```

---

## Po wykonaniu planu

- [x] Dopisz wpis do sekcji `[Niewydane]` w `changelog.txt` (bez podbijania wersji w `package.json`).
- [ ] Zgłoś wynik `npm test` i poinformuj, że commity czekają na branchu `feat/history-tips`, niewypchnięte.

## Świadomie poza zakresem

Filtru „tylko z napiwkiem", sortowania po kwocie napiwku, rozbicia napiwków per pracownik. Uzasadnienia w sekcji „Poza zakresem" spec-a.
