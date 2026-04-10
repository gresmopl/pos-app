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
4. (opcjonalnie) Udziela rabatu (kwotowy lub procentowy, bez limitu)
5. Wybiera metode platnosci
6. Potwierdza transakcje
7. System zapisuje do bazy: transaction + items + payment_detail(s) + tip_balance
8. Koszyk czyszczony, powrot do Dashboard
```

**Metody platnosci:**

| Metoda          | Opis                            | payment_detail rows |
| --------------- | ------------------------------- | ------------------- |
| Gotowka         | Platnosc gotowka                | 1 (cash)            |
| Karta           | Platnosc karta                  | 1 (card)            |
| BLIK            | Platnosc BLIK                   | 1 (blik)            |
| Bon podarunkowy | Caly rachunek pokryty bonem     | 1 (voucher)         |
| Bon + Gotowka   | Czesciowo bon, reszta gotowka   | 2 (voucher + cash)  |
| Bon + Karta     | Czesciowo bon, reszta karta     | 2 (voucher + card)  |
| Bon + BLIK      | Czesciowo bon, reszta BLIK      | 2 (voucher + blik)  |
| Gotowka + Karta | Czesciowo gotowka, reszta karta | 2 (cash + card)     |

Kazda metoda w splicie zapisywana jako osobny payment_detail z dokladna kwota.

**Reguly:**

- 1 rachunek = 1 fryzjer
- Klient opcjonalny (brak wyboru nie blokuje transakcji)
- Napiwek wliczany do rachunku, trafia do wirtualnego portfela fryzjera
- Rabat obniza cale zamowienie (nie pojedyncze pozycje)
- Prowizja od split payment - od pelnej kwoty (niezaleznie od metody)
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
3. Wybor formy platnosci (gotowka lub karta)
4. System generuje unikalny kod bonu (BON-{timestamp})
5. System tworzy voucher w bazie (kod, wartosc, 12 mies. waznosc)
6. Bon rejestrowany jako ruch kasowy (voucher_sale)
```

**Reguly:**

- Bon NIE jest przypisany do zadnego fryzjera
- Bon NIE wlicza sie do statystyk sprzedazowych
- Gotowka za bon trafia do kasetki (jesli platnosc gotowka)
- Bon za karte nie wplywa na stan kasetki
- Bon wazny 12 miesiecy od daty sprzedazy
- Reszta z bonu zostaje na bonie (nie jest wydawana)
- BEZ presetow kwot - tylko pole na dowolna kwote

### 3.4 Realizacja bonu (platnosc bonem)

**Aktorzy:** Kasjer/Fryzjer
**Wyzwalacz:** Klient placi bonem

```
1. W POS: wybor platnosci "Bon podarunkowy"
2. Wpisanie kwoty bonu
3. Jesli bon < rachunek: wybor metody doplaty (gotowka/karta/BLIK)
4. Jesli bon >= rachunek: reszta zostaje na bonie
5. Klient oddaje papierowy bon -> fryzjer wklada do kasetki
6. System zapisuje payment_detail(s) z dokladnymi kwotami per metoda
```

**Reguly:**

- Bon papierowy traktowany jak gotowka w kasetce (fizycznie)
- W systemie: platnosc bezgotowkowa (nie zwieksza expected_cash)
- Bony liczone osobno przy zamknieciu zmiany (rozliczenie bonowe)
- Split bon+gotowka tworzy 2 payment_detail: voucher(X) + cash(Y)

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

- Napiwki kumuluja sie niezaleznie od metody platnosci klienta
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
   - Sprzedaz per metoda (gotowka, karta/BLIK, bony) z paymentBreakdown
   - Ruchy kasowe (wplaty, wyplaty, zakupy, zwroty)
   - Oczekiwana gotowka (systemCash + cashIn - cashOut)
   - Oczekiwane bony (suma platnosci voucher, takze z splitow)
4. Pracownik liczy gotowke i bony fizycznie
5. Wpisuje: gotowka, drobne na jutro, bony papierowe
6. System oblicza:
   - Depozyt = (gotowka - drobne) + bony
   - Roznica gotowkowa = policzona gotowka - oczekiwana
   - Roznica bonowa = policzone bony - oczekiwane
7. Tolerancja: roznica <= 10 zl = OK (zielone)
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

| Pole             | Typ                     | Opis                                            |
| ---------------- | ----------------------- | ----------------------------------------------- |
| id               | string                  | Unikalny identyfikator                          |
| employeeId       | string (nullable)       | Fryzjer (null dla bonow)                        |
| clientId         | string (nullable)       | Klient (opcjonalny)                             |
| deviceId         | string                  | Urzadzenie (audyt)                              |
| items[]          | TransactionItem[]       | Pozycje (usluga/produkt)                        |
| totalAmount      | number                  | Suma brutto                                     |
| tipAmount        | number                  | Napiwek                                         |
| discountType     | "percentage" / "amount" | Typ rabatu                                      |
| discountValue    | number                  | Wartosc rabatu                                  |
| paymentMethod    | string                  | Metoda platnosci (cash/card/blik/voucher/split) |
| paymentBreakdown | PaymentBreakdownItem[]  | Rozbicie per metoda z kwotami                   |
| status           | string                  | completed / cancelled                           |
| timestamp        | string                  | Data i godzina                                  |

**Snapshot cenowy:** `price_at_sale` w TransactionItem - cena zamrozzona w momencie sprzedazy.

### 4.2 Ruch kasowy (CashMovement)

| Typ            | Kierunek  | Wplyw na kasetke                         |
| -------------- | --------- | ---------------------------------------- |
| tip_withdrawal | OUT       | Zmniejsza stan                           |
| expense_take   | OUT       | Zmniejsza stan                           |
| expense_settle | IN        | Zwieksza stan (zwrot reszty z zakupow)   |
| barber_payback | OUT       | Zmniejsza stan                           |
| top_up         | IN        | Zwieksza stan                            |
| voucher_sale   | IN/brak   | Zwieksza jesli gotowka, brak jesli karta |
| barber_loan    | NEUTRALNY | Bez wplywu (rejestracja dlugu)           |
| shift_close    | OUT       | Gotowka do koperty                       |
| float          | IN        | Drobne z poprzedniego dnia               |

### 4.3 Stan kasetki (oczekiwana gotowka)

```
Oczekiwana gotowka = Sprzedaz gotowkowa (z paymentBreakdown, lacznie ze splitami)
                   + Wplaty (top_up)
                   + Zwroty z zakupow (expense_settle)
                   + Sprzedaz bonow za gotowke (voucher_sale, paymentMethod=cash)
                   - Wyplaty napiwkow (tip_withdrawal)
                   - Pobrania na zakupy (expense_take)
                   - Zwroty dla fryzjerow (barber_payback)
```

### 4.4 Oczekiwane bony

```
Oczekiwane bony = Suma platnosci "voucher" z paymentBreakdown
                  (zarowno pelne platnosci bonem jak i czesc bonowa splitow)
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

| Pole                       | Opis                       |
| -------------------------- | -------------------------- |
| name                       | Imie / pseudonim           |
| role                       | admin / barber             |
| commission_service_percent | % prowizji od uslug        |
| commission_product_percent | % prowizji od kosmetykow   |
| tip_balance                | Wirtualny portfel napiwkow |
| is_active                  | Aktywny / nieaktywny       |

**Historyzacja prowizji:** Zmiana % nie wplywa na historyczne transakcje (commission_amount zamrazane przy sprzedazy).

**Obliczanie prowizji:**

- Przy finalizacji: adapter pobiera stawki pracownika, oblicza prowizje per item
- Rabat rozkladany proporcjonalnie na pozycje (prowizja od kwoty PO rabacie)
- Napiwek NIE wchodzi do bazy prowizji
- Split payment: prowizja od pelnej kwoty (niezaleznie od metody platnosci)
- Prowizja na razie niewidoczna w UI (do ustalenia z szefem)

---

## 5. Raporty

### 5.1 Raport kasowy

Generowany przy zamknieciu zmiany:

- Kto zamykal
- Sprzedaz od ostatniego zamkniecia (per metoda platnosci)
- Ruchy kasowe (wplaty, wyplaty, zakupy, zwroty)
- Gotowka policzona vs oczekiwana + roznica
- Bony policzone vs oczekiwane + roznica
- Drobne na jutro
- Depozyt do koperty (gotowka + bony - drobne)

### 5.2 Raport miesieczny (Faza 3)

Zestawienie pracownicze:

- Imie | Suma uslug | Suma kosmetykow | Prowizja | Napiwki

Analiza sprzedazy:

- Ranking uslug
- Sprzedaz kosmetykow
- Podzial na metody platnosci

Sumaryczne saldo roznic kasowych z calego miesiaca.

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
| Split payment            | Platnosc laczaca dwie metody (np. bon + karta, gotowka + karta)                     |
| paymentBreakdown         | Rozbicie platnosci na poszczegolne metody z dokladnymi kwotami                      |
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
