# Pytania do Product Ownera

Pytania wymagajace decyzji biznesowej przed implementacja Fazy 2.
Wygenerowane: 2026-04-10.

---

## 1. Prowizja od split payment

Klient placi 100 zl bonem + 50 zl karta. Rachunek = 150 zl.
Od czego prowizja fryzjera?

- **A)** Od pelnej kwoty rachunku (150 zl) - niezaleznie od metody platnosci
- **B)** Tylko od czesci niebonowej (50 zl) - bon to "juz oplacone wczesniej"

**Wplyw:** Logika obliczania prowizji w TransactionItem.commission_amount.

---

## 2. Prowizja od rabatu

Rachunek 100 zl, rabat 20%. Prowizja fryzjera od:

- **A)** Kwoty przed rabatem (100 zl)
- **B)** Kwoty po rabacie (80 zl)

**Wplyw:** Logika obliczania prowizji w TransactionItem.commission_amount.

---

## 3. Fryzjer w dwoch salonach

Czy jeden pracownik moze pracowac w wiecej niz jednym salonie?

- **A)** Nie - jeden pracownik = jeden salon
- **B)** Tak - oddzielne salda napiwkow i statystyki per salon
- **C)** Tak - ale wspolne saldo napiwkow

**Wplyw:** Struktura tabeli Employee (jeden czy wiele rekordow per salon), logika napiwkow.

---

## 4. Termin waznosci bonu

Czy bony podarunkowe wygasaja?

- **A)** Nie - bon wazny bezterminowo
- **B)** Tak - po 6 miesiacach
- **C)** Tak - po 12 miesiacach
- **D)** Tak - termin ustawiany przez admina

**Wplyw:** Pole expires_at w tabeli Voucher, logika walidacji przy platnosci.

---

## 5. Reszta z bonu

Klient ma bon 200 zl, rachunek 150 zl. Co z 50 zl?

- **A)** Zostaje na bonie (klient moze uzyc nastepnym razem)
- **B)** Przepada (bon jednorazowy)
- **C)** Reszta wydawana gotowka

**Wplyw:** Pole remaining_balance w Voucher, logika platnosci bonem.

---

## 6. Cofniecie transakcji - limit

Obecna zasada: tylko ostatnia transakcja + PIN operacyjny.

- **A)** Bez limitu czasowego - do zamkniecia zmiany
- **B)** Limit czasowy (15/30/60 minut)
- **C)** Mozliwosc cofniecia dowolnej transakcji z dzisiaj (nie tylko ostatniej)

**Wplyw:** Logika cofania, walidacja czasowa, UI historii.

---

## 7. Praca offline

Co jesli padnie internet w salonie?

- **A)** Aplikacja nie dziala - akceptowalne ryzyko
- **B)** Pelny offline (zapis lokalny + synchronizacja)
- **C)** Podstawowe funkcje offline (sprzedaz), reszta wymaga netu

**Wplyw:** Architektura PWA, Service Worker, IndexedDB, logika synchronizacji. Opcja B/C znaczaco zwieksza zlozonosc.

---

## 8. Powiadomienia

Czy szef chce dostawac powiadomienia o zdarzeniach?

- **A)** Nie - sprawdza sam
- **B)** O zamknieciu zmiany
- **C)** O zamknieciu zmiany + duza roznica kasowa (> 50 zl)
- **D)** O kazdej transakcji (real-time)

**Wplyw:** Push notifications (FCM/APNs), Supabase Edge Functions, koszty.
