# FORMEN - Dokumentacja analityczna

## 1. Cel systemu

System POS zastepujacy dotychczasowa aplikacje .NET (zapis do XML na dysku lokalnym). Obsluguje sprzedaz uslug fryzjerskich i kosmetykow, zarzadzanie utargiem, prowizjami, napiwkami i gotowka w kasetce.

### Czego system NIE robi

- Nie integruje sie z drukarka fiskalna (zewnetrzna kasa Bingo Online)
- Nie obsluguje rezerwacji (Booksy zostaje)
- Nie prowadzi magazynu (kosmetyki bez stanow magazynowych)
- Nie obsluguje platnosci elektronicznych (terminal platniczy jest zewnetrzny)

---

## 2. Uzytkownicy i role

| Rola                 | Opis              | Dostep                                                      | Autoryzacja             |
| -------------------- | ----------------- | ----------------------------------------------------------- | ----------------------- |
| Fryzjer              | Pracownik salonu  | POS, Historia (swoje), Ruchy kasowe                         | Klik na karte (bez PIN) |
| Kasjer (recepcja)    | Osoba przy kasie  | Dashboard, POS (wybor fryzjera), Historia, Kasa, Zamkniecie | Klik (bez PIN)          |
| Administrator (szef) | Wlasciciel salonu | Wszystko + Panel Admina                                     | PIN admina (4 cyfry)    |

### Typy urzadzen

| Typ      | Przyklad          | Widok                          |
| -------- | ----------------- | ------------------------------ |
| personal | Telefon fryzjera  | Uproszczony (tylko swoje dane) |
| station  | Tablet przy kasie | Dashboard + wybor fryzjera     |
| admin    | Telefon szefa     | Wszystko + Panel Admina        |

---

## 3. Procesy biznesowe

### 3.1 Sprzedaz uslugi/produktu

**Aktorzy:** Fryzjer lub Kasjer
**Wyzwalacz:** Klient konczy wizyte

```
1. Fryzjer/kasjer wybiera pracownika na Dashboard
2. Dodaje uslugi i/lub produkty do koszyka
3. (opcjonalnie) Dodaje napiwek (dowolna kwota)
4. (opcjonalnie) Udziela rabatu (kwotowy, bez limitu)
5. Potwierdza transakcje
6. System zapisuje do bazy: transaction + items + tip_balance
7. Koszyk czyszczony, powrot do Dashboard
```

**Platnosci:**

Brak wyboru metody platnosci - kazda transakcja traktowana jako gotowka (ADR-017, v0.1.73). Karta/BLIK rejestrowane wylacznie jako sumaryczny reczny `terminal_amount` (sprawdzenie kasy w ciagu dnia / krok przy zamknieciu zmiany). Bony papierowe liczone razem z gotowka (decyzja #16).

**Reguly:**

- 1 rachunek = 1 fryzjer
- Klient opcjonalny (brak wyboru nie blokuje transakcji)
- Napiwek wliczany do rachunku, trafia do wirtualnego portfela fryzjera
- Rabat obniza cale zamowienie (nie pojedyncze pozycje), tylko kwotowy (ADR-011)
- Prowizja od rabatu - od kwoty PO rabacie
- Szef ufa pracownikom - brak limitu rabatu

### 3.2 Cofniecie transakcji

**Aktorzy:** Kasjer/Fryzjer + autoryzacja PIN operacyjnym
**Wyzwalacz:** Blednie nabita transakcja

```
1. Otwarcie Historii transakcji
2. Ostatnia transakcja ma przycisk "Cofnij"
3. System wymaga PIN-u operacyjnego
4. Transakcja oznaczona jako anulowana (nie usuwana)
5. Korekta stanu kasetki i statystyk
```

**Reguly:**

- Tylko ostatnia transakcja moze byc cofnieta (do zamkniecia zmiany)
- Bez limitu czasowego
- PIN operacyjny moze byc inny niz PIN admina
- Szef moze udostepnic PIN operacyjny zaufanemu pracownikowi

### 3.3 Sprzedaz bonu podarunkowego

**Aktorzy:** Kasjer/Fryzjer
**Wyzwalacz:** Klient chce kupic bon

```
1. Ekran Ruchy kasowe -> zakladka "Bon"
2. Wpisanie dowolnej kwoty bonu
3. Platnosc gotowka (zasila kasetke)
4. System generuje unikalny kod bonu (BON-{timestamp})
5. System tworzy voucher w bazie (kod, wartosc, 12 mies. waznosc)
6. Bon rejestrowany jako ruch kasowy (voucher_sale)
```

**Reguly:**

- Bon NIE jest przypisany do zadnego fryzjera
- Bon NIE wlicza sie do statystyk sprzedazowych
- Gotowka za bon trafia do kasetki
- Bon wazny 12 miesiecy od daty sprzedazy
- Reszta z bonu zostaje na bonie (nie jest wydawana)
- BEZ presetow kwot - tylko pole na dowolna kwote

### 3.4 Realizacja bonu (platnosc bonem)

**Aktorzy:** Kasjer/Fryzjer
**Wyzwalacz:** Klient placi bonem

**STATUS: NIEZAIMPLEMENTOWANE w UI.** Realizacja bonu jako platnosci przestala istniec wraz z usunieciem wyboru metody platnosci (ADR-017, v0.1.73). Adapter ma metody `vouchers.getByCode()` i `vouchers.redeem()`, ale POS nie ma zadnej obslugi platnosci bonem - nie sa wywolywane. Bony mozna obecnie SPRZEDAC (sekcja 3.3, Kasa -> voucher_sale), ale nie zrealizowac w POS.

**Do zaprojektowania w przyszlosci** (gdy szef bedzie chcial realizacje bonow):

- Bon papierowy fizycznie traktowany jak gotowka w kasetce
- W systemie platnosc bonem powinna byc bezgotowkowa (nie zwieksza expected_cash)
- Reszta z bonu zostaje na bonie (decyzja #4)

### 3.5 Wyplata napiwkow

**Aktorzy:** Fryzjer
**Wyzwalacz:** Fryzjer chce wyplacic zgromadzone napiwki

```
1. Ruchy kasowe -> zakladka "Napiwki"
2. Widzi saldo dostepnych napiwkow (tip_balance z bazy)
3. Wpisuje kwote do wyplaty
4. Walidacja: nie wiecej niz saldo
5. System: db.cashMovements.create(tip_withdrawal) + decrement tip_balance (atomowy RPC)
6. Fizycznie wyjmuje gotowke z kasetki
```

**Reguly:**

- Napiwki z rachunku kumuluja sie w portfelu fryzjera
- Salda przechodza na kolejne dni
- Napiwki gotowkowe "do reki" - system NIE sledzi (tylko napiwki z rachunku)
- Rozliczenie do konca miesiaca wg preferencji szefa

### 3.6 Zakupy salonowe (dwuetapowy)

**Aktorzy:** Fryzjer/Kasjer
**Wyzwalacz:** Potrzeba zakupu materialow/srodkow

```
Etap 1 - Pobranie:
1. Ruchy kasowe -> zakladka "Zakupy"
2. Wpisanie kwoty zaliczki + opcjonalny cel
3. Gotowka pobrana z kasetki
4. Status: "Oczekuje na rozliczenie" (pending)

Etap 2 - Rozliczenie:
1. Na liscie operacji: "Rozlicz" przy pending expense
2. Wpisanie kwoty z paragonu (finalCost)
3. Jesli reszta > 0: system tworzy expense_settle (zwrot reszty do kasetki)
4. Oryginalny expense zmienia status na "settled"
```

### 3.7 Zwrot z wlasnych (Barber Loan)

**Aktorzy:** Fryzjer
**Wyzwalacz:** Brak drobnych w kasetce, fryzjer wydaje reszte z kieszeni

```
1. Ruchy kasowe -> zakladka "Zwrot"
2. "Wydalem z wlasnych" + kwota
3. System rejestruje dlug kasetki wobec pracownika (pending)
4. Pozniej: przycisk "Zwroc" przy dlugu
5. Fryzjer odbiera gotowke z kasetki
6. Dlug oznaczony jako settled + nowy wpis barber_payback na liscie
```

**Reguly:**

- Rejestracja dlugu nie jest ruchem gotowki (neutral, zolty kolor)
- Zwrot to ruch OUT z kasetki (czerwony)
- Oba wpisy widoczne na liscie operacji (audit trail)

### 3.8 Zamkniecie zmiany (raport kasowy)

**Aktorzy:** Wyznaczony pracownik (rotacyjnie)
**Wyzwalacz:** Koniec dnia pracy (lub wielokrotnie w ciagu dnia)

```
1. Ekran "Zamkniecie zmiany"
2. System laduje transakcje + ruchy kasowe od ostatniego zamkniecia
3. System pokazuje podsumowanie:
   - Laczna sprzedaz (systemCash = suma totalAmount transakcji, wszystko gotowka)
   - Terminal (reczny wpis karta/BLIK, sumarycznie)
   - Ruchy kasowe (wplaty, wyplaty, zakupy, zwroty)
   - Oczekiwana gotowka (openingBalance + systemCash + cashIn - cashOut - terminal)
   - Bony papierowe liczone razem z gotowka (decyzja #16)
4. Pracownik liczy gotowke i bony fizycznie
5. Wpisuje: gotowka, drobne na jutro, bony papierowe
6. System oblicza:
   - Depozyt = (gotowka - drobne) + bony
   - Roznica gotowkowa = policzona gotowka - oczekiwana
   - Roznica bonowa = policzone bony - oczekiwane
7. Kazda roznica pokazywana - brak tolerancji (decyzja #7); zielone "OK" tylko gdy roznica = 0
8. Potwierdzenie -> db.dailyReports.create() -> raport kasowy -> wydruk
```

**Reguly:**

- Wiele zamkniec dziennie dozwolone (brak blokady)
- Kazde zamkniecie "resetuje" punkt startowy dla nastepnego
- Transparentnosc: pracownik WIDZI kwoty systemowe (decyzja szefa)
- Roznice (nadwyzki/braki) gromadzone do raportu miesiecznego
- System NIE karze pracownika automatycznie
- Nazwa: "Raport kasowy" (nie dobowy/zmianowy)

---

## 4. Obiekty domenowe

### 4.1 Transakcja

| Pole          | Typ               | Opis                                                        |
| ------------- | ----------------- | ----------------------------------------------------------- |
| id            | string            | Unikalny identyfikator                                      |
| employeeId    | string (nullable) | Fryzjer (null dla bonow)                                    |
| clientId      | string (nullable) | Klient (opcjonalny)                                         |
| deviceId      | string            | Urzadzenie (audyt)                                          |
| items[]       | TransactionItem[] | Pozycje (usluga/produkt)                                    |
| totalAmount   | number            | Suma brutto                                                 |
| tipAmount     | number            | Napiwek                                                     |
| discountType  | "amount"          | Typ rabatu dla nowych transakcji; "percentage" tylko legacy |
| discountValue | number            | Wartosc rabatu kwotowego                                    |
| status        | string            | completed / cancelled                                       |
| timestamp     | string            | Data i godzina                                              |

**Snapshot cenowy:** `price_at_sale` w TransactionItem - cena zamrozzona w momencie sprzedazy.

### 4.2 Ruch kasowy (CashMovement)

| Typ            | Kierunek  | Wplyw na kasetke                            |
| -------------- | --------- | ------------------------------------------- |
| tip_withdrawal | OUT       | Zmniejsza stan                              |
| expense_take   | OUT       | Zmniejsza stan                              |
| expense_settle | IN        | Zwieksza stan (zwrot reszty z zakupow)      |
| barber_payback | OUT       | Zmniejsza stan                              |
| top_up         | IN        | Zwieksza stan                               |
| voucher_sale   | IN        | Zwieksza kasetke (sprzedaz bonu za gotowke) |
| barber_loan    | NEUTRALNY | Bez wplywu (rejestracja dlugu)              |
| shift_close    | OUT       | Gotowka do koperty                          |
| float          | IN        | Drobne z poprzedniego dnia                  |

### 4.3 Stan kasetki (oczekiwana gotowka)

```
Oczekiwana gotowka = Sprzedaz (suma totalAmount transakcji - wszystko gotowka)
                   + Wplaty do kasy (own_cash_deposit, top_up)
                   + Zwroty z zakupow (expense_settle)
                   + Sprzedaz bonow za gotowke (voucher_sale)
                   - Wyplaty napiwkow (tip_withdrawal)
                   - Pobrania na zakupy (expense_take)
                   - Zwroty dla fryzjerow (barber_payback)
```

### 4.4 Oczekiwane bony

```
Oczekiwane bony = 0 (realizacja bonu jako platnosci niezaimplementowana - patrz §3.4;
                  bony papierowe liczone razem z gotowka, decyzja #16; daily_report.expected_vouchers = 0)
```

### 4.5 Bon podarunkowy

| Pole              | Opis                        |
| ----------------- | --------------------------- |
| code              | Unikalny kod (BON-...)      |
| initial_value     | Poczatkowa wartosc          |
| remaining_balance | Pozostale saldo             |
| status            | active / used / expired     |
| expires_at        | Data wygasniecia (12 mies.) |

### 4.6 Pracownik

| Pole                       | Opis                                  |
| -------------------------- | ------------------------------------- |
| name                       | Imie / pseudonim                      |
| role                       | admin / barber                        |
| commission_service_percent | % prowizji od uslug                   |
| commission_product_percent | % prowizji od kosmetykow              |
| retention_percent          | Retencja klientow w %                 |
| display_order              | Reczna kolejnosc wyswietlania         |
| show_retention_badge       | Czy pokazywac tekstowy badge retencji |
| tip_balance                | Wirtualny portfel napiwkow            |
| is_active                  | Aktywny / nieaktywny                  |

**Historyzacja prowizji:** Zmiana % nie wplywa na historyczne transakcje (commission_amount zamrazane przy sprzedazy).

**Obliczanie prowizji:**

- Przy finalizacji: adapter pobiera stawki pracownika, oblicza prowizje per item
- Rabat rozkladany proporcjonalnie na pozycje (prowizja od kwoty PO rabacie)
- Napiwek NIE wchodzi do bazy prowizji
- Prowizja widoczna na biezaco na telefonie fryzjera (personal view Dashboard, decyzja #13)

---

## 5. Raporty

### 5.1 Raport kasowy

Generowany przy zamknieciu zmiany:

- Kto zamykal
- Sprzedaz od ostatniego zamkniecia (laczny utarg + terminal sumarycznie)
- Ruchy kasowe (wplaty, wyplaty, zakupy, zwroty)
- Gotowka policzona vs oczekiwana + roznica
- Bony policzone vs oczekiwane + roznica
- Drobne na jutro
- Depozyt do koperty (gotowka + bony - drobne)

### 5.2 Raporty okresowe (Faza 3)

Eksport do Excela (.xlsx). Wybor okresu: konkretny miesiac (1. -> koniec miesiaca) lub dowolny zakres dat od-do (domyslnie ostatni pelny miesiac). Trzy raporty w v1:

**A. Raport pracowniczy** (per pracownik):

- Aktywnosc: liczba zakonczonych wizyt (transakcji), liczba wykonanych uslug (suma ilosci pozycji typu usluga)
- Finanse: przychod calkowity (suma totalAmount, bez napiwku), srednia cena wizyty
- Struktura sprzedazy: przychod z uslug vs przychod z produktow (NIE metody platnosci - ADR-017)
- Prowizja: suma commission_amount (zamrozona per pozycja)
- Napiwki: suma tipAmount z rachunkow
- Rabaty: suma udzielonych rabatow (discountAmount)

**B. Raport sprzedazy** (salon):

- Ranking uslug (liczba + przychod), ranking produktow (sztuki + przychod)
- Laczny przychod, liczba wizyt, srednia wartosc wizyty, udzial uslugi/produkty

**C. Raport kasowo-finansowy:**

- Suma roznic kasowych (nadwyzki/manka) w okresie - z daily_report.difference
- Gotowka vs terminal (sumarycznie - jedyny dostepny podzial, brak metod per transakcja)
- Wydatki salonowe, wyplaty napiwkow, wplaty do kasy

Raport bonow (D) - opcjonalny, poza v1.

---

## 6. Wydruki

Docelowo: drukarka termiczna 58mm Bluetooth + papier samoprzylepny (etykieta jako plomba na kopercie).

Wydruki obejmuja:

- Wyplata napiwku (potwierdzenie)
- Pobranie zaliczki na zakupy
- Rozliczenie paragonu
- Zamkniecie zmiany (raport kasowy)
- Zwrot gotowki dla fryzjera
- Raport miesieczny

---

## 7. Slownik pojec

| Pojecie                  | Opis                                                                                |
| ------------------------ | ----------------------------------------------------------------------------------- |
| Kasetka                  | Fizyczna szuflada/kaseta z gotowka w salonie                                        |
| Opening Balance          | Drobne zostawione z poprzedniego dnia                                               |
| Depozyt                  | Kwota wkladana do koperty na koniec dnia                                            |
| Raport kasowy            | Raport generowany przy zamknieciu zmiany (dawniej "Z-ka")                           |
| Barber Loan              | Dlug kasetki wobec fryzjera (wydal z wlasnych)                                      |
| Snapshot cenowy          | Zamrozenie ceny w momencie sprzedazy                                                |
| Device pairing           | Jednorazowa rejestracja urzadzenia w systemie                                       |
| PIN operacyjny           | PIN do wrazliwych operacji (cofanie transakcji), moze byc inny niz PIN admina       |
| Od ostatniego zamkniecia | Wzorzec filtrowania danych - nie po dacie, a od momentu ostatniego raportu kasowego |

---

## 8. Fazy wdrozenia

| Faza                      | Zakres                                                                      | Status     |
| ------------------------- | --------------------------------------------------------------------------- | ---------- |
| 1 - MVP                   | Prototyp UI z mock danymi, testy, deploy                                    | Zakonczona |
| 2 - Pelna funkcjonalnosc  | PostgreSQL, adaptery DB, zapis transakcji/ruchow/zamkniec, portfel napiwkow | W trakcie  |
| 3 - Raporty i finalizacja | Raporty miesieczne, drukarka etykiet, PWA offline, eksport, baza klientow   | Planowana  |
