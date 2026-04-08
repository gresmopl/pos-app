# FORMEN - Specyfikacja Projektu

## Opis projektu

- **Nazwa:** FORMEN
- **Typ:** Aplikacja POS (Point of Sale) dla meskich salonow fryzjerskich
- **Uzytkownicy:** Elastyczna liczba salonow, kazdy z dowolna liczba pracownikow. Dynamiczne dodawanie/usuwanie salonow i pracownikow
- **Cel:** Obsluga sprzedazy uslug fryzjerskich i kosmetykow. Wewnetrzny system kasowy do zarzadzania sprzedaza, utargiem pracownikow, prowizjami i napiwkami
- **Zastepuje:** Dotychczasowa aplikacje .NET z zapisem do XML na lokalnym dysku
- **Fiskalizacja:** Zewnetrzna kasa fiskalna Bingo Online - aplikacja NIE integruje sie z drukarkami fiskalnymi
- **Rezerwacje:** Booksy (zostaje bez zmian) - aplikacja NIE obsluguje rezerwacji

---

## Stack technologiczny

| Warstwa | Technologia |
|---------|------------|
| **Frontend** | Next.js (App Router) + React + TypeScript |
| **UI** | Mantine UI (z systemem motywow createTheme) |
| **Styling** | Mantine CSS Modules + Mantine theme system |
| **Backend/Baza** | Supabase (PostgreSQL + Auth + Realtime + Storage) |
| **Polaczenie z baza** | Client-side (Supabase JS SDK z przegladarki) |
| **Bezpieczenstwo** | Supabase Row Level Security (RLS) |
| **PWA** | Service Worker + manifest (offline fallback) |
| **Hosting produkcja** | Vercel |
| **Repo** | GitHub (public, brak licencji = prawa zastrzezone) |

### Srodowiska

| Branch | Srodowisko | Baza | Cel |
|--------|-----------|------|-----|
| `main` | Vercel produkcja | Supabase PROD | Stabilna wersja |
| `dev` | Vercel preview (auto) | Supabase DEV | Rozwoj, testowanie |

### Bazy danych

- **Supabase DEV** (free) - rozwoj, dane testowe, swobodne zmiany struktury
- **Supabase PROD** (free → Pro) - produkcja, dane realne
- **Faza 1:** Mock dane w kodzie (bez Supabase)
- **Faza 2:** Podpiecie Supabase DEV + PROD

### Koszty

- **Development/test:** $0 (free tier Vercel + Supabase)
- **Produkcja:** ~$45/mies (Vercel Pro $20 + Supabase Pro $25)

---

## Architektura aplikacji

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Salon #1   │     │  Salon #2   │     │  Salon #N   │
│  PWA (Next) │     │  PWA (Next) │     │  PWA (Next) │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       └───────────┬───────┴───────────────────┘
                   │ HTTPS / Supabase Realtime
            ┌──────┴──────┐
            │   Vercel    │  ← CDN + SSR (gdy potrzebne)
            │  (Next.js)  │
            └──────┬──────┘
                   │
            ┌──────┴──────┐
            │  Supabase   │
            │ ┌─────────┐ │
            │ │ Postgres │ │
            │ │ Auth     │ │
            │ │ Realtime │ │
            │ │ Storage  │ │
            │ │ RLS      │ │
            │ └─────────┘ │
            └─────────────┘
```

---

## Struktura katalogow

```
pos-app/
├── src/
│   ├── app/                  ← strony (routing Next.js App Router)
│   │   ├── layout.tsx        ← glowny layout (dark mode, czcionki)
│   │   ├── page.tsx          ← Dashboard
│   │   ├── pos/
│   │   │   └── page.tsx      ← Ekran sprzedazy
│   │   ├── history/
│   │   │   └── page.tsx      ← Historia transakcji
│   │   ├── cash/
│   │   │   └── page.tsx      ← Ruchy kasowe
│   │   ├── shift-close/
│   │   │   └── page.tsx      ← Zamkniecie zmiany
│   │   └── admin/
│   │       ├── page.tsx      ← Panel szefa
│   │       ├── employees/
│   │       ├── pricing/
│   │       └── reports/
│   ├── components/           ← komponenty wielokrotnego uzytku
│   │   ├── layout/           ← header, sidebar, bottom bar
│   │   ├── pos/              ← koszyk, lista uslug, platnosci
│   │   ├── employees/        ← karty fryzjerow
│   │   └── ui/               ← wspolne elementy UI
│   ├── lib/                  ← logika, helpery
│   │   ├── supabase.ts       ← klient Supabase
│   │   └── types.ts          ← typy TypeScript
│   ├── hooks/                ← custom React hooks
│   └── data/                 ← mock dane (Faza 1)
│       ├── services.ts
│       ├── products.ts
│       └── employees.ts
├── public/
│   ├── manifest.json         ← PWA manifest
│   └── icons/
├── CLAUDE.md
├── next.config.ts
├── package.json
└── tsconfig.json
```

---

## Nawigacja i ekrany

```
DASHBOARD (Ekran Glowny)
├── [Klik karta fryzjera] → EKRAN SPRZEDAZY (POS)
│   └── [Finalizuj] → powrot do Dashboard
├── [Szybka Sprzedaz Bonu] → MODAL SPRZEDAZY BONU
│   └── [Zatwierdz] → powrot do Dashboard
├── [Historia Transakcji] → EKRAN HISTORII
│   └── [Powrot] → Dashboard
├── [Ruchy Kasowe] → EKRAN RUCHOW KASOWYCH
│   ├── Zakladka: Wyplata Napiwkow
│   └── Zakladka: Zakupy Salonowe
│       └── [Powrot] → Dashboard
├── [Zamknij Zmiane] → EKRAN ZAMKNIECIA ZMIANY
│   └── [Zatwierdz i Drukuj] → reset do Dashboard
└── [Zebatka + PIN Szefa] → PANEL ADMINA
    ├── Zakladka: Pracownicy
    ├── Zakladka: Cennik
    ├── Zakladka: Raporty Miesieczne
    └── [Wyloguj] → Dashboard
```

---

## Moduly - specyfikacja

### MODUL 0: DASHBOARD (Centrum Dowodzenia)

**Opis:** Ekran startowy aplikacji, zawsze otwarty, bez logowania.

**Elementy:**
- **Pasek motywacyjny (gora):** 4 strefy oparte na ikonach i liczbach (bez tekstu):
  - DZIS: [ikona slonca] liczba uslug [strzalka trendu vs wczoraj]
  - MIESIAC: [ikona kalendarza] liczba uslug [pasek postepu]
  - ROK (Y/Y): [ikona wykresu] liczba uslug [% zmiany vs rok ubiegly]
  - REKORD: [ikona pucharu] najlepszy wynik dzienny w historii
- **Widget "Utarg Dzisiaj":** Suma dzienna (rozbita na: gotowka / karta / bony)
- **Widget "Stan Kasetki":** Obliczany na zywo stan gotowki w kasetce (obok Utargu)
- **Karty fryzjerow:** Siatka (Grid) z avatarem, imieniem i statusem. Klikniecie = natychmiastowe wejscie do POS (BEZ PIN-u)
- **Dolny panel szybkich akcji:**
  - Szybka Sprzedaz Bonu
  - Historia Transakcji
  - Ruchy Kasowe (Wydatki/Napiwki)
  - Zamknij Zmiane
- **Ikona zebatki:** Dostep do Panelu Admina (WYMAGA PIN-u Szefa) - widoczna tylko na urzadzeniach admin

**Widok Dashboard wg typu urzadzenia:**

**personal** — uproszczony widok:
- Imie pracownika (powitanie, np. "Czesc, Oliwia")
- Liczba dzisiejszych uslug pracownika
- Przycisk "Nowa sprzedaz" (prowadzi do POS)
- Dolny panel (bon, historia, kasa, zmiana)

**station** — widok recepcji:
- Stan kasetki
- Lista pracownikow (klikniecie = POS)
- Dolny panel

**admin** — pelny widok:
- Pasek motywacyjny (4 statystyki)
- Utarg dzisiaj + Stan kasetki
- Lista pracownikow
- Dolny panel
- Ikona zebatki (Panel Admina)

| Element Dashboard | personal | station | admin |
|-------------------|----------|---------|-------|
| Pasek motywacyjny (4 statystyki) | nie | nie | tak |
| Utarg dzisiaj | nie | nie | tak |
| Stan kasetki | nie | tak | tak |
| Powitanie + dzisiejsze uslugi pracownika | tak | nie | nie |
| Przycisk "Nowa sprzedaz" | tak | nie | nie |
| Lista pracownikow | nie | tak | tak |
| Dolny panel (bon, historia, kasa, zmiana) | tak | tak | tak |
| Ikona zebatki (Panel Admina) | nie | nie | tak |

**Widocznosc na innych ekranach wg typu urzadzenia:**

| Ekran | personal | station / admin |
|-------|----------|-----------------|
| POS — wybor pracownika | auto-przypisany, brak selecta | wybrany z Dashboard |
| Zamkniecie zmiany — wybor pracownika | auto-przypisany | select z listy |
| Ruchy kasowe — napiwki | tylko swoje saldo | select pracownika |
| Historia — filtr | tylko swoje transakcje | filtr po wszystkich |

**PIN admina:** Wymagany ZAWSZE przy wejsciu do Panelu Admina — rowniez na urzadzeniu admin. Dodatkowa warstwa bezpieczenstwa na wypadek dostepu osoby trzeciej do telefonu szefa.

**Styl:** Dark Mode, grafitowe tlo, butelkowa zielen jako akcent, duze dotykowe przyciski.

---

### MODUL 1: SPRZEDAZ (POS MASTER)

**Zasada:** 1 rachunek = 1 barber. Cala transakcja przypisana do fryzjera wybranego na Dashboard.

**Koszyk zawiera:**
- Uslugi (z cennika)
- Kosmetyki (z cennika, bez magazynu)
- Napiwki (wpisywane recznie, kwota)
- Bony podarunkowe

**Rabat:** Przycisk "% Rabat" - obniżka kwotowa lub procentowa calego rachunku.

**Klient:** Opcjonalne pole "Wybierz klienta" (polaczone z baza). Brak wyboru klienta NIE blokuje transakcji.

**Metody platnosci:**
- Gotowka
- Karta
- BLIK
- Bon Podarunkowy (papierowy - traktowany jak gotowka w kasetce)
- Split Payment (laczenie metod, np. czesc bonem + czesc karta)

**Twarda analityka (Snapshot):** W momencie finalizacji system zapisuje aktualna cene na twardo w tabeli transakcji. Pozniejsze zmiany cennika NIE wplywaja na historyczne raporty.

**Dane zapisywane przy kazdej transakcji:**
- ID transakcji (unikalny)
- Data i godzina
- Barber ID
- Klient ID (opcjonalnie)
- Lista pozycji (nazwa, cena w momencie sprzedazy, kategoria: usluga/kosmetyk/bon)
- Suma brutto
- Napiwek
- Rabat (wartosc i typ)
- Metoda platnosci
- Salon ID

**Potwierdzenie platnosci:** Przed finalizacja wyswietlany jest modal potwierdzenia z podsumowaniem (kwota, fryzjer, metoda platnosci, napiwek, rabat). Zapobiega przypadkowym transakcjom.

**Cofniecie transakcji:** Dostepne z Historii transakcji, tylko dla ostatniej transakcji. Wymaga PIN-u admina. Cofnieta transakcja oznaczana jako anulowana (nie usuwana z bazy). Cofniecie koryguje stan kasetki i statystyki.

**Po finalizacji:** Koszyk czyszczony, aplikacja wraca na Dashboard.

---

### MODUL 2: OBSLUGA BONOW PAPIEROWYCH

**Sprzedaz bonu:**
- Przycisk "Szybka Sprzedaz Bonu" na Dashboard (nie wymaga wyboru fryzjera)
- Wpisanie wartosci bonu (dowolna kwota lub predefiniowane: 50, 100, 200 zl)
- Wybor formy platnosci (gotowka lub karta)
- System generuje unikalny kod bonu
- Traktowane jako wplyw gotowkowy do salda kasy
- Bon NIE wlicza sie do statystyk sprzedazowych zadnego fryzjera
- Bon NIE jest przypisany do pracownika — kazdy moze go wydac
- System rejestruje device_id urzadzenia, z ktorego wydano bon (dla audytu)

**Realizacja bonu (platnosc bonem):**
- W oknie platnosci opcja "Bon Podarunkowy"
- Wpisanie kwoty bonu
- Jesli bon < kwota rachunku → doplata inna metoda (split payment)
- Fryzjer zabiera papierowy bon od klienta i wklada go do kasetki
- System odejmuje kwote z salda bonu
- Traktowane jako platnosc bezgotowkowa (nie zwieksza fizycznej gotowki w kasetce w dniu wizyty)

**Zamkniecie zmiany:** Papierowe bony liczone osobno (Pole B w formularzu zamkniecia).

---

### MODUL 3: CENNIK (Uproszczony - BEZ magazynu)

**Zasada:** Tylko Nazwa + Cena. Zero logiki magazynowej.

**Dwie zakladki (tylko admin):**
- Cennik Uslug (np. Strzyzenie klasyczne, Combo, Trymowanie brody)
- Cennik Kosmetykow (np. Pomada Reuzel, Olejek do brody)

**Dodawanie/edycja pozycji:** Formularz z dwoma polami: Nazwa + Cena (PLN).

**Dezaktywacja:** Zamiast usuwania - przelacznik Aktywny/Nieaktywny. Nieaktywne pozycje znikaja z ekranu POS ale zostaja w bazie (historyczne dane nienaruszone).

**Kosmetyki w POS:** Zachowuja sie identycznie jak uslugi - klik i dodanie do rachunku. System NIE sprawdza i NIE blokuje sprzedazy ze wzgledu na brak na stanie.

---

### MODUL 4: PRACOWNICY I PROWIZJE

**Profil pracownika:**
- Imie / pseudonim
- Avatar / zdjecie
- Rola: Pracownik (dostep do POS) / Administrator (POS + raporty + ustawienia)
- PIN (4 cyfry) - TYLKO dla roli Administrator
- % prowizji od uslug
- % prowizji od kosmetykow
- Status: Aktywny / Nieaktywny (dezaktywacja zamiast usuwania)
- Salon ID (przypisanie do salonu)

**Logowanie fryzjerow:** BEZ PIN-u. Klikniecie w karte na Dashboard = natychmiastowe wejscie do POS.

**Logowanie admina:** PIN 4-cyfrowy wymagany TYLKO przy wejsciu do Panelu Szefa (ikona zebatki).

**Historyzacja prowizji:** Zmiana prowizji (np. z 40% na 50%) nie wplywa na historyczne transakcje. Przy zamykaniu transakcji system zapisuje wyliczona kwote prowizji na dany moment (pole commission_amount w TransactionItem).

---

### MODUL 5: WIRTUALNY PORTFEL (Napiwki)

**Kumulacja:** Kazdy napiwek nabity w POS automatycznie zwieksza wirtualne saldo (tip_balance) danego fryzjera. Niezaleznie od metody platnosci klienta.

**Wyplata (Cash-out):**
- Fryzjer wchodzi w "Rozlicz Napiwki"
- Widzi: "Twoje dostepne napiwki: [Kwota] zl"
- Wpisuje kwote do wyplaty
- Walidacja: nie moze wyplacic wiecej niz ma w portfelu
- Fizycznie wyjmuje gotowke z kasetki
- System pomniejsza expected_cash w raporcie dobowym
- Drukarka USB drukuje kwit potwierdzajacy (do wlozenia do kasetki)

**Kwit wyplaty napiwku zawiera:**
- "POTWIERDZENIE POBRANIA NAPIWKU"
- Data i godzina
- Imie fryzjera
- Kwota
- Miejsce na podpis

**Salda przchodza na kolejne dni.** Rozliczenie do konca miesiaca wg preferencji szefa.

---

### MODUL 6: RUCHY KASOWE (Wplaty, Wydatki, Zwroty)

#### A) Wplata / Zasilenie (Cash In)
- Przycisk "Wplata do kasy"
- Powod: "Zasilenie (Drobne od Szefa)" / "Inne"
- Wpisanie kwoty
- Skutek: powieksza expected_cash w raporcie dobowym
- Wydruk kwitu USB

#### B) Zwrot z wlasnych (Barber Loan)
- Sytuacja: brak drobnych, fryzjer wydaje reszte z kieszeni
- Przycisk "Wydalem z wlasnych" + kwota
- System rejestruje "dlug" kasetki wobec pracownika
- Pozniej: przycisk "Odbierz zwrot za reszte"
- Wydruk potwierdzenia USB
- Dlug zerowany, kwota wyplacona z kasetki

#### C) Zakupy Salonowe (dwuetapowy proces)

**Etap 1 - Pobranie zaliczki:**
- Przycisk "Pobierz na zakupy"
- Wpisanie kwoty (np. 100 zl) + opcjonalny cel (np. "Srodki czystosci")
- System tymczasowo odejmuje kwote od expected_cash
- Rekord "Oczekuje na rozliczenie"
- Wydruk kwitu zastepczego: "POBRANO NA ZAKUPY: 100 PLN"

**Etap 2 - Rozliczenie:**
- Przycisk "Rozlicz zakupy"
- Wpisanie kwoty z paragonu (np. 25 zl)
- System wylicza: Pobrano (100) - Wydano (25) = Do zwrotu (75)
- Przypomnienie: "Wloz do kasetki 75 zl reszty"
- Wydruk koncowy: "WYDATEK SALONOWY: Chemia, 25 PLN"
- Kwit + paragon ze sklepu → do koperty

**Raportowanie:** Wszystkie wydatki sumowane w raporcie dobowym jako "Koszty".

---

### MODUL 7: HISTORIA TRANSAKCJI (Podglad Dnia)

**Lista:** Przewijalna lista wszystkich transakcji z dzisiejszego dnia.

**Kazdy wpis zawiera:** Godzina | Imie fryzjera | Skrocony opis uslug | Kwota | Ikona metody platnosci.

**Filtrowanie:** Zakladki na gorze: "WSZYSTKIE" | lista imion fryzjerow. Fryzjer widzi tylko swoje, admin widzi wszystkich.

**Szczegoly:** Klikniecie w transakcje rozwija pelny opis (wszystkie pozycje, napiwek, rabat).

**Podsumowanie (dol ekranu):**
- Licznik wykonanych USLUG (tylko Service, bez bonow i kosmetykow)
- Suma utargu

**Opcjonalnie:** Przycisk "Drukuj kopie" (ponowne wygenerowanie kwitu USB).

---

### MODUL 8: ZAMKNIECIE ZMIANY (Koniec Dnia)

**Kto zamyka:** Losowy pracownik (rotacyjnie).

**Stan kasetki (na zywo):**
- Widoczny na gorze ekranu Zamkniecia Zmiany (przed formularzem)
- Rowniez widoczny na Dashboard obok "Utarg dzisiaj"
- Dostepny TYLKO dla urzadzen typu `station` i `admin` (urzadzenia `personal` NIE widza stanu kasy)
- Obliczany w czasie rzeczywistym:
```
Stan kasetki = Opening Balance (drobne z poprzedniego dnia)
             + Sprzedaz gotowkowa (cash)
             + Wplaty do kasy (top-up)
             + Realizacja bonow papierowych (wkladane do kasetki)
             - Wyplaty napiwkow (tip_withdrawal)
             - Pobrania na zakupy (expense)
             - Zwroty dla fryzjerow (barber_payback)
```
- Wartosc orientacyjna (systemowa) — rzeczywisty stan moze sie roznic (stad "slepe liczenie" przy zamknieciu)

**Formularz "slepego liczenia":**
- **Pole A:** Suma gotowki PLN (banknoty + monety) - wpisywana recznie
- **Pole B:** Suma papierowych bonow - wpisywana recznie
- **Pole C:** Drobne na jutro (pogotowie kasowe, np. 200 zl)

**Logika:**
```
(Gotowka + Bony) - Drobne na jutro = KWOTA DO KOPERTY
KWOTA DO KOPERTY - Sprzedaz systemowa = Nadwyzka / Brak
```

**Ciaglosc salda:** Kwota "drobnych na jutro" zapisywana jako Opening Balance dla nastepnego dnia (automatycznie, bez recznego wpisywania rano).

**Wydruk na drukarce USB (Raport Dobowy / Z-ka):**
```
RAPORT DOBOWY - [Data]
Zamykal: [Imie]
────────────────────────
Razem w kasetce:     [Kwota] PLN
Bony papierowe:      [Kwota] PLN
Zostawiono drobnych: [Kwota] PLN
────────────────────────
DO KOPERTY (DEPOZYT): [Kwota] PLN
Roznica (Nadwyzka/Brak): [Kwota] PLN
```

**Po zatwierdzeniu:** Aplikacja resetuje sie do Dashboard.

**Roznice kasowe:** System NIE karze pracownika automatycznie. Nadwyzki/braki gromadzone do raportu miesiecznego.

**⚠ UWAGA — slepe liczenie vs widocznosc kwot systemowych:**
Obecna implementacja pokazuje "Podsumowanie systemowe" (oczekiwane kwoty) na tym samym ekranie co formularz liczenia. To podwaza idee slepego audytu kasowego — pracownik widzi ile "powinno byc" i moze dopasowac swoja wartosc.
Standardowa praktyka: pracownik NAJPIERW wpisuje policzona kwote, POTEM system ujawnia roznice. Ekran podsumowania systemowego powinien byc ukryty do momentu zatwierdzenia formularza.
**Do potwierdzenia z wlascicielem** — moze to byc swiadoma decyzja (szef chce transparentnosc), ale warto dopytac.

---

### MODUL 9: PANEL SZEFA I RAPORTY MIESIECZNE (Admin)

**Dostep:** Tylko po PIN-ie administratora (ikona zebatki na Dashboard).

**Cztery zakladki:**

#### A) Pracownicy
- Lista wszystkich pracownikow
- Edycja profilu, prowizji, PIN-u
- Dodawanie / dezaktywacja

#### B) Cennik
- CRUD na uslugach i kosmetykach
- Tylko Nazwa + Cena
- Aktywacja / dezaktywacja pozycji

#### C) Urzadzenia
- Lista wszystkich zarejestrowanych urzadzen (z statusem: pending / approved / blocked)
- Badge z liczba oczekujacych (pending) na zakladce
- Zatwierdzanie nowych urzadzen (wybor typu, przypisanie pracownika, nazwa)
- Dezaktywacja / reaktywacja urzadzen
- Podglad: ostatnia aktywnosc (last_seen_at)

#### D) Raporty Miesieczne

**Zestawienie pracownicze:**
- Tabela: Imie | Suma uslug | Suma kosmetykow | Prowizja | Napiwki
- Eksport do CSV/Excel

**Analiza sprzedazy:**
- Ranking uslug (np. 1. Strzyzenie 50x, 2. Broda 30x)
- Sprzedaz kosmetykow
- Podzial na metody platnosci (gotowka/karta/BLIK/bony)

**Sumaryczne saldo roznic kasowych:**
- Wszystkie nadwyzki/braki z zamkniec zmian z calego miesiaca
- Jedna sumaryczna kwota na dole raportu (np. -140 zl)
- System NIE odejmuje automatycznie z pensji
- Szef widzi i sam decyduje jak rozliczyc przy premiach

**Wydruk raportu miesiecznego:** Na drukarce USB lub PDF.

---

### MODUL 11: AUTORYZACJA URZADZEN (Device Pairing)

**Zasada:** Kazde urzadzenie musi byc jednorazowo zarejestrowane i zatwierdzone przez admina. BEZ kont email/hasla. BEZ logowania na co dzien.

**Typy urzadzen:**

| Typ | Przypisanie | Widok | Przyklad |
|-----|-------------|-------|---------|
| `personal` | employee_id | Tylko POS przypisanego fryzjera (pomija Dashboard) | Telefon Oliwii |
| `station` | salon_id | Dashboard + wybor fryzjera + POS | Tablet przy kasie |
| `admin` | employee_id (admin) | Wszystko + Panel Admina + zmiana PIN | Telefon Zbyszka |

**Jeden pracownik moze miec wiele urzadzen osobistych** (np. telefon + tablet).

**Urzadzenie stacjonarne** (station) sluzy osobie przy kasie — wybiera fryzjera i przypisuje usluge.

**Flow rejestracji:**
1. Admin dodaje pracownika w panelu → system generuje QR kod rejestracyjny
2. Pracownik skanuje QR ze swojego urzadzenia → otwiera sie aplikacja
3. Urzadzenie rejestruje sie w systemie ze statusem **pending** (oczekuje na zatwierdzenie)
4. Pracownik widzi ekran: "Oczekuje na zatwierdzenie przez administratora"
5. Admin widzi nowe urzadzenie w panelu → zatwierdza i ustawia:
   - Typ urzadzenia: personal / station / admin
   - Przypisanie do pracownika (dla personal i admin)
   - Nazwe urzadzenia (np. "Telefon Oliwii", "Kasa glowna")
6. System nadaje `device_id` (GUID) → urzadzenie aktywne

**Logika widoku wg typu:**
- `personal` → uproszczony Dashboard (powitanie, dzisiejsze uslugi, przycisk "Nowa sprzedaz", dolny panel)
- `station` → Dashboard z lista pracownikow + stan kasetki
- `admin` → pelny Dashboard + dostep do Panelu Admina (PIN wymagany ZAWSZE przy wejsciu do panelu)

**Powiadomienia o nowych urzadzeniach:**
- Badge z liczba oczekujacych urzadzen na ikonie zebatki (Panel Admina)
- W panelu admina: zakladka/sekcja "Urzadzenia" z lista oczekujacych na zatwierdzenie
- Opcjonalnie: push notification na urzadzenie admin (Faza 3)

**Blokowanie dostepu:**
- Admin moze **dezaktywowac urzadzenie** → ekran "Dostep zablokowany, skontaktuj sie z administratorem"
- Admin moze **dezaktywowac pracownika** → wszystkie jego urzadzenia osobiste automatycznie zablokowane
- Urzadzenia NIE sa usuwane z systemu — tylko dezaktywacja (historia parowan zachowana)

**Zarzadzanie (operacje CRUD):**

| Obiekt | Dodaj | Edytuj | Dezaktywuj | Usun |
|--------|-------|--------|------------|------|
| Pracownik | Admin tworzy profil + generuje QR | Imie, avatar, prowizje, rola | Tak (blokuje urzadzenia) | Nie — tylko dezaktywacja |
| Urzadzenie | QR → pending → admin zatwierdza | Nazwa, typ, przypisanie | Tak (blokada) | Nie — tylko dezaktywacja |
| Salon | Super-admin (przyszlosc) | Nazwa, adres | Tak | Nie |
| PIN admina | Przy tworzeniu admina | Zmiana w Panelu Admina (wymaga starego PIN) | — | — |
| PIN operacyjny | Ustawiany w Panelu Admina | Zmiana w Panelu Admina | — | — |
| Usluga/Produkt | Admin | Nazwa, cena | Tak (znika z POS) | Nie — tylko dezaktywacja |
| Klient | Z POS lub Admin | Imie, telefon | Tak | Nie |

**Zmiana roli** pracownika (barber → admin) nadaje dostep do panelu i wymaga ustawienia PIN-u.

---

### MODUL 10: OBSLUGA DRUKARKI USB (Slad Papierowy)

**Typ:** Drukarka termiczna paragonowa podlaczona kablem USB.

**Format:** 58mm lub 80mm, brak marginesow, czysty tekst.

**Technologia:** `window.print()` z dedykowanym CSS `@media print` dla waskich drukarek. Alternatywnie: Web USB API lub generowanie PDF.

**Drukuje niefiskalne kwity dla:**
- Wyplata napiwku (potwierdzenie do kasetki)
- Pobranie zaliczki na zakupy (kwit zastepczy)
- Rozliczenie paragonu ze sklepu (kwit koncowy)
- Zamkniecie zmiany (Raport Dobowy / Z-ka do koperty)
- Zwrot gotowki dla fryzjera
- Raport miesieczny

---

## Struktura bazy danych (Supabase PostgreSQL)

### Glowne tabele:

```
Salon (id, name, address, is_active,
       admin_pin_hash, operations_pin_hash)

Employee (id, salon_id, name, avatar_url, role[ADMIN/BARBER],
          pin_hash, commission_service_percent, commission_product_percent,
          tip_balance, is_active)

Service (id, salon_id, name, price, is_active)

Product (id, salon_id, name, price, is_active)
-- BEZ pola stock_quantity (brak magazynu)

Client (id, salon_id, name, phone)

Voucher (id, salon_id, code, initial_value, remaining_balance,
         status[active/used/expired], created_at)

Transaction (id, salon_id, employee_id[nullable], client_id[nullable],
             device_id, date, total_amount, tip_amount,
             discount_type[percentage/amount], discount_value,
             payment_method[multi], status)
-- employee_id nullable dla sprzedazy bonow
-- device_id rejestruje z jakiego urzadzenia dokonano transakcji

TransactionItem (id, transaction_id, type[service/product/voucher_sale],
                 item_id, price_at_sale, commission_amount)

PaymentDetail (id, transaction_id, method[cash/card/blik/voucher],
               amount, voucher_id[nullable])

CashMovement (id, salon_id, type[IN/OUT], reason[tip_withdrawal/expense/
              top_up/barber_loan/barber_payback/shift_close/float],
              amount, employee_id, description, timestamp)

Expense (id, salon_id, employee_id, initial_amount, final_cost,
         description, status[pending/settled], timestamp)

TipWithdrawal (id, employee_id, amount, timestamp)

DailyReport (id, salon_id, date, closing_employee_id, expected_cash,
             actual_cash, actual_vouchers_value, float_amount,
             deposit_amount, difference, status[closed])

DeviceRegistration (id, device_id[GUID], salon_id, employee_id[nullable],
                    device_type[personal/station/admin],
                    status[pending/approved/blocked],
                    device_name, registered_at, approved_at, last_seen_at,
                    is_active)
-- employee_id nullable dla urzadzen stacjonarnych (station)
-- is_active = false oznacza dezaktywacje (urzadzenia nigdy nie sa usuwane)
```

### Klucz: salon_id

Kazda tabela (oprocz Employee i Salon) posiada `salon_id` dla obslugi wielu lokalizacji. Supabase RLS filtruje dane per salon.

---

## Styl UI/UX

- **Motyw:** Wielomotywowy (theme system). Kazdy motyw definiuje kolory, border-radius, spacing, fonty. Uzytkownicy wybieraja motyw w ustawieniach
- **Color scheme:** Dark + Light mode. Domyslnie z preferencji systemowej (prefers-color-scheme), z mozliwoscia recznego przelaczenia. Kazdy motyw dziala w obu trybach
- **Styl:** Minimalistyczny - duzo przestrzeni, prosta typografia, czytelnosc > dekoracyjnosc
- **Podejscie:** Mobile/Tablet-First, dotykowy (min. 48px touch targets)
- **Typ:** SPA (Single Page Application) - plynna nawigacja bez przeladan
- **Czcionka:** Bezszeryfowa, wysoki kontrast
- **Komponenty:** Mantine UI (createTheme, ColorSchemeProvider, gotowe tabele, formularze, modale, gridy)
- **Architektura modularna:** Przygotowana na przyszle moduly (barberCal, barberTime)

### Responsywnosc

- **Scrollbar:** Ukryty na urzadzeniach <= 1024px (telefony, tablety) — scrollowanie dotykiem. Widoczny na desktopie (> 1024px)
- **Data w headerze:** Pelna na desktopie ("wtorek, 8 kwietnia 2026"), skrocona na mobile <= 600px ("8 kwi")
- **Filtry (historia):** ScrollArea z przyciskami pill zamiast SegmentedControl — scrollowalne poziomo na waskich ekranach
- **Dolny panel:** Teksty pod ikonami fz=11px, wycentrowane, line-height 1.2 — nie lamia sie na waskich ekranach
- **Fixed bottom bar:** Wszystkie strony maja zIndex: 100 na fixed bottom bar — zapobiega nachodzeniu kontrolek (np. NumberInput strzalki)
- **Padding dolny:** Strony z fixed bottom bar maja pb >= 120-160px aby tresc nie nachodziala pod panel

---

## Zasady bezpieczenstwa

- **Dwa oddzielne PIN-y:**
  - **PIN admina** — wejscie do Panelu Szefa (cennik, prowizje, raporty, urzadzenia). Znany TYLKO szefowi. Wymagany ZAWSZE, rowniez na urzadzeniu admin
  - **PIN operacyjny** — cofniecie transakcji i inne wrazliwe operacje przy kasie. Szef moze go udostepnic zaufanemu pracownikowi bez dawania dostepu do pelnego panelu
  - Oba PIN-y ustawiane i zmieniane w Panelu Admina
- Fryzjerzy klikaja w swoja karte BEZ logowania (szybkosc > bezpieczenstwo przy fotelu)
- Supabase RLS zapewnia izolacje danych miedzy salonami
- employee_id nullable w Transaction (dla sprzedazy bonow)
- device_id w Transaction — kazda transakcja rejestruje urzadzenie (audyt)
- Urzadzenia wymagaja jednorazowej rejestracji i zatwierdzenia przez admina (szczegoly: MODUL 11)
- Dezaktywacja pracownika automatycznie blokuje wszystkie jego urzadzenia osobiste
- Dezaktywacja zamiast usuwania — dotyczy pracownikow, urzadzen, uslug, produktow (integralnosc danych historycznych)

---

## Konwencje kodu

- **Jezyk kodu:** angielski (nazwy zmiennych, funkcji, komponentow)
- **Jezyk interfejsu:** polski
- **Framework:** Next.js App Router
- **Typowanie:** TypeScript (strict mode)
- **UI:** Mantine components (bez shadcn/ui, bez surowego Tailwind)
- **Motywy:** src/themes/ - kazdy motyw jako oddzielny plik createTheme()
- **Formatowanie:** Prettier + ESLint
- **Struktura katalogow:** Next.js App Router conventions

---

## Fazy wdrozenia

### Faza 1 - MVP (prototyp UI z mock danymi)
- Dashboard z kartami fryzjerow
- Ekran sprzedazy (POS) z koszykiem
- Cennik uslug i kosmetykow
- Historia transakcji
- Podstawowy layout i nawigacja

### Faza 2 - Pelna funkcjonalnosc
- Integracja z Supabase (baza, auth)
- Autoryzacja urzadzen (QR pairing, zatwierdzanie, blokowanie)
- Bony podarunkowe
- Wirtualny portfel napiwkow
- Ruchy kasowe (wplaty, wydatki, zakupy)
- Zamkniecie zmiany
- Multi-salon

### Faza 3 - Raporty i finalizacja
- Panel admina z raportami miesiecznymi
- Pasek motywacyjny
- Obsluga drukarki USB
- Eksport CSV/Excel
- PWA offline fallback
- Baza klientow (historia wizyt)

---

## Pomysly do rozwazenia

Pomysly ktore nie sa jeszcze zatwierdzone. Wymagaja decyzji wlasciciela przed implementacja.

1. **Przeniesienie sprzedazy bonow do Ruchow Kasowych** — bon sprzedaje sie raz na tydzien, nie zasługuje na osobny przycisk w bottom barze Dashboard. Zamiast tego: nowa zakladka "Sprzedaz bonu" w Ruchach Kasowych. Bottom bar zmniejszony z 4 do 3 przyciskow (Historia, Ruchy kasowe, Zamknij zmiane). Plusy: czystszy bottom bar, logiczna spojnosc (bon = wplyw kasowy). Minus: jeden klik wiecej, ale przy niskiej czestotliwosci to nieistotne.
2. **Dedykowane skeleton per strona** — zamiast generycznego loading.tsx, kazda podstrona moze miec wlasny skeleton dopasowany do layoutu (np. karty pracownikow na Dashboard, lista transakcji w Historii).
3. **Ruchy kasowe: filtr/paginacja** — przy duzej liczbie operacji dziennych lista moze byc dluga. Rozwiazanie: filtr po typie operacji + paginacja lub "zaladuj wiecej".
4. **Pasek motywacyjny — doprecyzowanie algorytmow:**
   - Miesięczny target — kto ustawia i gdzie? Propozycja: edytowalny w Panelu Admina
   - Rok do roku bez danych — ukryc procent i pokazac "1. rok" lub sama liczbe
   - Rekord — salonowy na admin/station, osobisty na personal
   - Porownanie Y/Y — porownywac do tego samego dnia w roku (fair comparison)
5. **Swipe na transakcji w historii** — swipe w lewo na transakcji moze otwierac opcje (cofnij, drukuj kopie)

---

## Zrobione w Fazie 1 (audit UX + poprawki)

- Modal potwierdzenia platnosci w POS (zabezpieczenie przed przypadkowym kliknieciem)
- Cofniecie ostatniej transakcji z PIN-em operacyjnym
- Ilosc przy pozycji w koszyku (+/- zamiast duplikowania)
- Napiwek: wlasna kwota jako pierwszy przycisk, potem procentowe
- Historia: wyszukiwanie + filtr metody platnosci (ikony) + filtr pracownikow (avatary)
- Historia: pelna data dla transakcji spoza dzisiejszego dnia
- Ruchy kasowe: chronologia z timestamp, ikony kierunku (wplyw/wydatek), kolorowanie kwot
- Bony i split w podsumowaniu systemowym zamkniecia zmiany
- Animacja fade-in przy nawigacji miedzy stronami
- Haptic feedback (wibracja) przy finalizacji transakcji i sprzedazy bonu
- Swipe back z lewej krawedzi ekranu na wszystkich podstronach
- Loading skeleton przy nawigacji
- Responsywnosc: scrollbar ukryty na mobile/tablet, data skrocona na mobile, bottom bar z-index
- Pusty stan Dashboard z komunikatem powitalnym
- Konsekwencja ikon (emoji 🎁 zamienione na Tabler IconGift)
- Specyfikacja: MODUL 11 (autoryzacja urzadzen), stan kasetki, widocznosc wg typow urzadzen, dwa PIN-y (admin + operacyjny)
