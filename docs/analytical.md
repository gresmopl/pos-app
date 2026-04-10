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
3. (opcjonalnie) Dodaje napiwek
4. (opcjonalnie) Udziela rabatu (kwotowy lub procentowy)
5. Wybiera metode platnosci
6. Potwierdza transakcje
7. System zapisuje snapshot cen (zmiana cennika nie wplywa na historie)
8. Koszyk czyszczony, powrot do Dashboard
```

**Metody platnosci:** Gotowka, Karta, BLIK, Bon podarunkowy, Split (laczenie metod)

**Reguly:**

- 1 rachunek = 1 fryzjer
- Klient opcjonalny (brak wyboru nie blokuje transakcji)
- Napiwek wliczany do rachunku, trafia do wirtualnego portfela fryzjera
- Rabat obniza cale zamowienie (nie pojedyncze pozycje)

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

- Tylko ostatnia transakcja moze byc cofnieta
- PIN operacyjny moze byc inny niz PIN admina
- Szef moze udostepnic PIN operacyjny zaufanemu pracownikowi

### 3.3 Sprzedaz bonu podarunkowego

**Aktorzy:** Kasjer/Fryzjer
**Wyzwalacz:** Klient chce kupic bon

```
1. Ekran Ruchy kasowe -> zakladka "Bon"
2. Wybor wartosci (50/100/200 zl lub dowolna kwota)
3. Wybor formy platnosci (gotowka lub karta)
4. System generuje unikalny kod bonu
5. Bon rejestrowany jako wplyw kasowy
```

**Reguly:**

- Bon NIE jest przypisany do zadnego fryzjera
- Bon NIE wlicza sie do statystyk sprzedazowych
- Gotowka za bon trafia do kasetki (jesli platnosc gotowka)

### 3.4 Realizacja bonu (platnosc bonem)

**Aktorzy:** Kasjer/Fryzjer
**Wyzwalacz:** Klient placi bonem

```
1. W POS: wybor platnosci "Bon podarunkowy"
2. Wpisanie kwoty bonu
3. Jesli bon < rachunek: doplata inna metoda (split payment)
4. Klient oddaje papierowy bon -> fryzjer wklada do kasetki
5. System odejmuje kwote z salda bonu
```

**Reguly:**

- Bon papierowy traktowany jak gotowka w kasetce (fizycznie)
- W systemie: platnosc bezgotowkowa (nie zwieksza expected_cash w dniu wizyty)
- Bony liczone osobno przy zamknieciu zmiany

### 3.5 Wyplata napiwkow

**Aktorzy:** Fryzjer
**Wyzwalacz:** Fryzjer chce wypiacic zgromadzone napiwki

```
1. Ruchy kasowe -> zakladka "Napiwki"
2. Widzi saldo dostepnych napiwkow
3. Wpisuje kwote do wyplaty
4. Walidacja: nie wiecej niz saldo
5. Fizycznie wyjmuje gotowke z kasetki
6. System pomniejsza expected_cash
```

**Reguly:**

- Napiwki kumuluja sie niezaleznie od metody platnosci klienta
- Salda przechodza na kolejne dni
- Rozliczenie do konca miesiaca wg preferencji szefa

### 3.6 Zakupy salonowe (dwuetapowy)

**Aktorzy:** Fryzjer/Kasjer
**Wyzwalacz:** Potrzeba zakupu materialow/srodkow

```
Etap 1 - Pobranie:
1. Ruchy kasowe -> zakladka "Zakupy"
2. Wpisanie kwoty zaliczki + opcjonalny cel
3. Gotowka pobrana z kasetki
4. Status: "Oczekuje na rozliczenie"

Etap 2 - Rozliczenie:
1. Po powrocie: "Rozlicz zakupy"
2. Wpisanie kwoty z paragonu
3. System oblicza reszte do zwrotu
4. Pracownik wklada reszte do kasetki
```

### 3.7 Zwrot z wlasnych (Barber Loan)

**Aktorzy:** Fryzjer
**Wyzwalacz:** Brak drobnych w kasetce, fryzjer wydaje reszte z kieszeni

```
1. Ruchy kasowe -> zakladka "Zwrot"
2. "Wydalem z wlasnych" + kwota
3. System rejestruje dlug kasetki wobec pracownika
4. Pozniej: przycisk "Zwroc" przy dlugu
5. Fryzjer odbiera gotowke z kasetki
6. Dlug oznaczony jako rozliczony + nowy wpis zwrotu na liscie
```

**Reguly:**

- Rejestracja dlugu nie jest ruchem gotowki (neutral, zolty kolor)
- Zwrot to ruch OUT z kasetki (czerwony)
- Oba wpisy widoczne na liscie operacji (audit trail)

### 3.8 Zamkniecie zmiany

**Aktorzy:** Wyznaczony pracownik (rotacyjnie)
**Wyzwalacz:** Koniec dnia pracy

```
1. Ekran "Zamkniecie zmiany"
2. System pokazuje podsumowanie systemowe (sprzedaz wg metod platnosci)
3. Pracownik liczy gotowke fizycznie (slepe liczenie)
4. Wpisuje: gotowka, drobne na jutro, bony papierowe
5. System oblicza:
   - Depozyt = (gotowka - drobne) + bony
   - Roznica = policzona gotowka - oczekiwana systemowa
6. Potwierdzenie -> raport dobowy -> wydruk
7. Drobne na jutro = Opening Balance nastepnego dnia
```

**Reguly:**

- Zmiane mozna zamknac raz dziennie
- Roznice (nadwyzki/braki) gromadzone do raportu miesiecznego
- System NIE karze pracownika automatycznie

---

## 4. Obiekty domenowe

### 4.1 Transakcja

| Pole          | Typ                     | Opis                         |
| ------------- | ----------------------- | ---------------------------- |
| id            | string                  | Unikalny identyfikator       |
| employeeId    | string (nullable)       | Fryzjer (null dla bonow)     |
| clientId      | string (nullable)       | Klient (opcjonalny)          |
| deviceId      | string                  | Urzadzenie (audyt)           |
| items[]       | TransactionItem[]       | Pozycje (usluga/produkt/bon) |
| totalAmount   | number                  | Suma brutto                  |
| tipAmount     | number                  | Napiwek                      |
| discountType  | "percentage" / "amount" | Typ rabatu                   |
| discountValue | number                  | Wartosc rabatu               |
| paymentMethod | string                  | Metoda platnosci             |
| status        | string                  | Aktywna / anulowana          |
| timestamp     | string                  | Data i godzina               |

**Snapshot cenowy:** `price_at_sale` w TransactionItem - cena zamrozzona w momencie sprzedazy.

### 4.2 Ruch kasowy (CashMovement)

| Typ            | Kierunek  | Wplyw na kasetke               |
| -------------- | --------- | ------------------------------ |
| tip_withdrawal | OUT       | Zmniejsza stan                 |
| expense_take   | OUT       | Zmniejsza stan                 |
| barber_payback | OUT       | Zmniejsza stan                 |
| top_up         | IN        | Zwieksza stan                  |
| voucher_sale   | IN        | Zwieksza stan (jesli gotowka)  |
| barber_loan    | NEUTRALNY | Bez wplywu (rejestracja dlugu) |

### 4.3 Stan kasetki (obliczany na zywo)

```
Stan kasetki = Opening Balance (drobne z poprzedniego dnia)
             + Sprzedaz gotowkowa
             + Wplaty (top_up)
             + Realizacja bonow papierowych
             - Wyplaty napiwkow (tip_withdrawal)
             - Pobrania na zakupy (expense_take)
             - Zwroty dla fryzjerow (barber_payback)
```

### 4.4 Bon podarunkowy

| Pole              | Opis                    |
| ----------------- | ----------------------- |
| code              | Unikalny kod            |
| initial_value     | Poczatkowa wartosc      |
| remaining_balance | Pozostale saldo         |
| status            | active / used / expired |

### 4.5 Pracownik

| Pole                       | Opis                       |
| -------------------------- | -------------------------- |
| name                       | Imie / pseudonim           |
| role                       | admin / barber             |
| commission_service_percent | % prowizji od uslug        |
| commission_product_percent | % prowizji od kosmetykow   |
| tip_balance                | Wirtualny portfel napiwkow |
| is_active                  | Aktywny / nieaktywny       |

**Historyzacja prowizji:** Zmiana % nie wplywa na historyczne transakcje (commission_amount zamrazane przy sprzedazy).

---

## 5. Raporty

### 5.1 Raport dobowy (Z-ka)

Generowany przy zamknieciu zmiany:

- Kto zamykal
- Gotowka policzona
- Bony papierowe
- Drobne na jutro
- Depozyt do koperty
- Roznica (nadwyzka / brak)

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
- Zamkniecie zmiany (raport dobowy)
- Zwrot gotowki dla fryzjera
- Raport miesieczny

---

## 7. Slownik pojec

| Pojecie         | Opis                                                                          |
| --------------- | ----------------------------------------------------------------------------- |
| Kasetka         | Fizyczna szuflada/kaseta z gotowka w salonie                                  |
| Opening Balance | Drobne zostawione z poprzedniego dnia                                         |
| Depozyt         | Kwota wkladana do koperty na koniec dnia                                      |
| Z-ka            | Potoczna nazwa raportu dobowego                                               |
| Slepe liczenie  | Pracownik liczy gotowke bez podgladu kwoty systemowej                         |
| Split payment   | Platnosc laczaca dwie metody (np. bon + karta)                                |
| Barber Loan     | Dlug kasetki wobec fryzjera (wydal z wlasnych)                                |
| Snapshot cenowy | Zamrozenie ceny w momencie sprzedazy                                          |
| Device pairing  | Jednorazowa rejestracja urzadzenia w systemie                                 |
| PIN operacyjny  | PIN do wrazliwych operacji (cofanie transakcji), moze byc inny niz PIN admina |

---

## 8. Fazy wdrozenia

| Faza                      | Zakres                                                                    | Status                     |
| ------------------------- | ------------------------------------------------------------------------- | -------------------------- |
| 1 - MVP                   | Prototyp UI z mock danymi                                                 | W trakcie (dopracowywanie) |
| 2 - Pelna funkcjonalnosc  | Supabase, autoryzacja urzadzen, bony, portfel napiwkow, multi-salon       | Planowana                  |
| 3 - Raporty i finalizacja | Raporty miesieczne, drukarka etykiet, PWA offline, eksport, baza klientow | Planowana                  |
