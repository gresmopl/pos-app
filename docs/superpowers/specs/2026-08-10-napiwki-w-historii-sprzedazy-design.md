# Suma napiwków w Historii sprzedaży — spec

Data: 2026-08-10
Status: zaakceptowany (brainstorming)
Wersja aplikacji w momencie pisania: 0.1.125

## Cel

Odpowiedzieć na pytanie **„ile napiwków zebrano w okresie"** bez opuszczania Historii
sprzedaży. Dziś napiwek widać wyłącznie w pojedynczym wierszu transakcji
(`History.tsx:333-339`); nie ma nigdzie sumy.

## Decyzje (z sesji brainstormingu)

1. **Tylko suma, bez filtru.** Rozważane były trzy warianty — filtr „tylko z napiwkiem",
   sortowanie malejąco po kwocie i sama suma. Wybrana suma: pytanie brzmi „ile", a nie
   „które" ani „gdzie najwięcej".
2. **Czwarte pole w dolnej belce podsumowania**, między „Produkty" a „Utarg".
3. **Pole znika przy filtrze typu** ustawionym na „Usługi" lub „Produkty".
4. **Pole pokazuje się także przy wyniku `0 zł`** (odstępstwo od konwencji sąsiedniego
   pola „Produkty", które chowa się przy zerze).
5. **Arytmetyka podsumowania wychodzi z komponentu** do czystej funkcji w
   `src/lib/historySummary.ts`.

### Dlaczego pole znika przy filtrze typu

Napiwek jest przypisany do **całej transakcji**, nie do pozycji. Gdy klient kupił
strzyżenie i wosk, i zostawił 20 zł, nie istnieje sensowna odpowiedź na pytanie, ile
z tego „należy do produktu". Ta sama transakcja trafia do wyników zarówno przy filtrze
„Usługi", jak i „Produkty", więc pokazywanie tam pełnej kwoty napiwku zachęcałoby do
zsumowania jej dwa razy.

To ten sam problem, który został naprawiony w `c748d0e` dla pola „Utarg" — tam dało się
rozwiązać przez liczenie sumy samych pozycji danego typu (`displayAmount` →
`lineSum(t, typeFilter)`). Dla napiwków taki podział nie istnieje, więc jedynym uczciwym
zachowaniem jest ukrycie pola.

### Dlaczego `0 zł` jest pokazywane

Ukryte pole jest nie do odróżnienia od nieistniejącej funkcji — szef nie wie, czy
napiwków nie było, czy coś się zepsuło. `0 zł` to prawidłowa odpowiedź na pytanie
postawione w celu tego spec-a.

## Zachowanie

Suma liczona z tablicy `filtered` (`History.tsx:93-105`), więc respektuje **wszystkie
aktywne filtry** naraz: zakres dat, wybranego pracownika i wyszukiwarkę. Kliknięcie
avatara pracownika pokazuje jego napiwki za wybrany okres.

```
Filtr typu: [Wszystko]  Usługi  Produkty
┌──────────────────────────────────────────┐
│ USŁUGI   PRODUKTY   NAPIWKI      UTARG   │
│   24         7       180 zł     3420 zł  │
└──────────────────────────────────────────┘

Filtr typu:  Wszystko [Usługi] Produkty
┌──────────────────────────────────────────┐
│ USŁUGI                           UTARG   │
│   24                           2890 zł   │
└──────────────────────────────────────────┘
```

## Architektura

Wzorzec projektu: logika domenowa w `src/lib/` (czysta, testowalna bez bazy i bez DOM-u),
UI cienki.

| Plik                                       | Rola                                                                 | Akcja  |
| ------------------------------------------ | -------------------------------------------------------------------- | ------ |
| `src/lib/historySummary.ts`                | `summarizeHistory(...)` — cała arytmetyka podsumowania               | nowy   |
| `src/lib/__tests__/historySummary.test.ts` | Testy arytmetyki, w tym pułapka z filtrem typu                       | nowy   |
| `src/pages/History.tsx`                    | Użycie funkcji zamiast obliczeń inline + czwarte pole w dolnej belce | edycja |

### Interfejs

```ts
export interface HistorySummary {
  serviceCount: number;
  productCount: number;
  tipsTotal: number;
  totalRevenue: number;
}

export function summarizeHistory(
  transactions: Transaction[],
  typeFilter: "all" | "service" | "product"
): HistorySummary;
```

Funkcja przejmuje logikę z `History.tsx:107-123`, łącznie z regułą, że przy aktywnym
filtrze typu `totalRevenue` liczy sumę samych pozycji danego typu — dziś realizuje to
`displayAmount` w oparciu o `lineSum` — a nie pełne kwoty transakcji.

### Ponowne użycie istniejących pomocników

Nic nie jest pisane od zera:

- `lineSum(tx, type)` jest już wyeksportowana z `src/lib/reports.ts:127` i importowana
  przez `History.tsx:5`. Nowa funkcja korzysta z niej bez zmian.
- `countItems(tx, type)` istnieje w `src/lib/reports.ts:131` jako funkcja prywatna
  i robi dokładnie to, co dzisiejsze liczenie `serviceCount` / `productCount` inline
  w Historii (sumuje `quantity`, nie wiersze). Zamiast pisać ją drugi raz, zostaje
  wyeksportowana z `reports.ts`.

Dzięki temu `summarizeHistory` jest cienką kompozycją istniejących, przetestowanych
kawałków, a nie nową implementacją tej samej arytmetyki.

### Dlaczego wyodrębnienie

`History.tsx` ma 533 linie, a arytmetyka podsumowania siedzi w środku komponentu i **nie
ma żadnego testu** — mimo że już raz zawierała błąd (`c748d0e`). Skoro i tak dotykamy tego
fragmentu, wyciągnięcie go czyni całą regułę testowalną, w tym zachowanie przy filtrze
typu, które dziś nie jest niczym zabezpieczone.

## Testy

`src/lib/__tests__/historySummary.test.ts`:

| Przypadek                                                        | Oczekiwanie                              |
| ---------------------------------------------------------------- | ---------------------------------------- |
| Pusta lista transakcji                                           | wszystkie pola `0`                       |
| Transakcje bez napiwków                                          | `tipsTotal: 0`                           |
| Suma napiwków z kilku transakcji                                 | suma `tipAmount`                         |
| `typeFilter: "all"` — utarg to pełne kwoty transakcji            | suma `totalAmount`                       |
| `typeFilter: "service"` — utarg to suma samych usług             | pomija pozycje produktowe z tej samej tx |
| `typeFilter: "product"` — utarg to suma samych produktów         | pomija pozycje usługowe z tej samej tx   |
| Liczniki `serviceCount` / `productCount` uwzględniają `quantity` | ilość, nie liczba wierszy                |
| `tipsTotal` nie zależy od `typeFilter`                           | ta sama wartość dla wszystkich trzech    |

Ostatni przypadek dokumentuje, dlaczego pole jest ukrywane w UI, a nie zerowane w logice:
funkcja zawsze zwraca prawdziwą sumę, a decyzja o pokazaniu należy do komponentu.

## Poza zakresem

- Filtr „tylko z napiwkiem" i sortowanie malejąco po kwocie napiwku — rozważone
  i odrzucone, bo odpowiadają na inne pytania niż to postawione w celu.
- Rozbicie napiwków per pracownik w osobnym widoku (jest już w `/admin/reports`).
- Testy komponentu `History.tsx` — strona ma ciężkie zależności (baza, DeviceContext,
  router), a cała nowa logika jest pokryta testami czystej funkcji.

## Ograniczenie w danych

Zgodnie z decyzją szefa nr 11 (`CLAUDE.md`) system **nie śledzi napiwków gotówkowych
„do ręki"**. Suma pokazuje wyłącznie napiwki zarejestrowane w transakcji, więc przy
ocenie „ile realnie zebrano" jest zaniżona o nieznaną wartość. To ograniczenie danych,
nie funkcji.
