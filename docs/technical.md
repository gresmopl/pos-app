# FORMEN - Dokumentacja techniczna

## 1. Architektura

### Typ aplikacji

Single Page Application (SPA) dzialajaca w przegladarce. Brak server-side renderingu.
Docelowo: Progressive Web App (PWA) z offline fallback.

### Stack

| Warstwa    | Technologia                             | Wersja |
| ---------- | --------------------------------------- | ------ |
| Bundler    | Vite                                    | 6.x    |
| Framework  | React                                   | 19.x   |
| Jezyk      | TypeScript (strict)                     | 5.x    |
| Routing    | React Router                            | 7.x    |
| UI         | Mantine                                 | 9.x    |
| Baza       | PostgreSQL (Supabase DEV / Hetzner VPS) | 16     |
| DB SDK     | @supabase/supabase-js                   | 2.x    |
| Testy      | Vitest + Testing Library                | 4.x    |
| Linting    | ESLint (typescript-eslint) + Prettier   | -      |
| Pre-commit | Husky + lint-staged                     | -      |

### Hosting i deploy

| Srodowisko  | Hosting          | Baza                        | Branch | Deploy                        |
| ----------- | ---------------- | --------------------------- | ------ | ----------------------------- |
| Produkcja   | Hetzner CX24 VPS | PostgreSQL 16 (self-hosted) | main   | SSH/rsync (po npm run build)  |
| Dev/Preview | GitHub Pages     | Supabase DEV (free)         | dev    | GitHub Actions (automatyczny) |
| Lokalne     | Vite dev         | Supabase DEV / mock         | dev    | `npm run dev`                 |

GitHub Pages wymaga basename `/pos-app` w BrowserRouter - wykrywane automatycznie w `main.tsx`.

### Konfiguracja srodowisk (.env)

Aplikacja uzywa zmiennych `VITE_*` ladowanych przez Vite z plikow `.env`:

| Plik               | Kiedy uzywany                                              | W repo? | Adapter    |
| ------------------ | ---------------------------------------------------------- | ------- | ---------- |
| `.env.development` | `npm run dev` + GitHub Actions/Vercel (--mode development) | TAK     | `supabase` |
| `.env.production`  | `npm run build` (domyslny mode production)                 | NIE     | `rest`     |
| `.env.example`     | Szablon dla nowych developerow                             | TAK     | -          |

**Zmienne:**

| Zmienna                  | Opis                               | Przyklad                           |
| ------------------------ | ---------------------------------- | ---------------------------------- |
| `VITE_DB_ADAPTER`        | Adapter bazy: mock/supabase/rest   | `supabase`                         |
| `VITE_DB_ENV`            | Srodowisko: development/production | `development`                      |
| `VITE_SUPABASE_URL`      | URL projektu Supabase              | `https://xxx.supabase.co`          |
| `VITE_SUPABASE_ANON_KEY` | Klucz publiczny (anon) Supabase    | `eyJ...` (bezpieczny w repo - RLS) |
| `VITE_API_URL`           | URL REST API (produkcja)           | `https://formen.example.com`       |

**Dlaczego `.env.development` jest w repo:**
Klucz `anon` Supabase jest publiczny - trafia do bundla JS w przegladarce. Bezpieczenstwo zapewnia Row Level Security (RLS), nie ukrywanie klucza. `.env.production` zawiera konfiguracje Hetzner VPS i jest w `.gitignore`.

**GitHub Actions / Vercel:** build z `--mode development` laduje `.env.development` z repo. Bez tego fallback na adapter `mock`.

**Jak zmienic baze na produkcyjna (Hetzner VPS):**

1. Utworz `.env.production` lokalnie z `VITE_DB_ADAPTER=rest` i `VITE_API_URL`
2. Zbuduj: `npm run build` (Vite domyslnie uzywa mode production)
3. Wgraj `dist/` na Hetzner VPS przez SSH/rsync (np. `rsync -avz dist/ user@host:/var/www/formen/`)
4. GitHub Pages i Vercel dalej uzywaja Supabase DEV (niezalezne)

### Strategia hostingu

**Faza 2 (obecna - development):**

- Supabase DEV (free tier) jako baza rozwojowa
- Schemat PostgreSQL, seed danych, testowanie
- Frontend na GitHub Pages

**Produkcja (docelowo):**

- Hetzner CX24 VPS - frontend SPA + PostgreSQL 16 + Node.js (self-managed)
- Supabase DEV zostaje jako srodowisko testowe (free, bez kosztow)

**Hetzner CX24 - parametry:**

- VPS cloud (Hetzner Cloud)
- Node.js + PostgreSQL 16 + nginx/Caddy (self-hosted)
- Pelny dostep SSH, rsync/scp deploy
- SSL Let's Encrypt (Caddy/Certbot)
- Backupy: snapshoty Hetzner + pg_dump cron
- Lokalizacja: Falkenstein / Helsinki / Nurnberg (do wyboru)

---

## 2. Struktura projektu

```
src/
  main.tsx              Entry point: BrowserRouter + MantineProvider + DeviceProvider
  App.tsx               Routing (React Router v7) + DeviceGate + ErrorBoundary + Suspense
  globals.css           Globalne style, animacje, @media print

  pages/                Strony (lazy-loaded przez React.lazy)
    Dashboard.tsx       Ekran glowny: statystyki, lista pracownikow, bottom bar
    POS.tsx             Sprzedaz: koszyk, rabaty, napiwki, platnosci
    History.tsx         Historia transakcji (od ostatniego zamkniecia)
    Cash.tsx            Ruchy kasowe: napiwki, zakupy, wplaty, zwroty, bony
    ShiftClose.tsx      Zamkniecie zmiany: rozliczenie kasowe + bonowe, raport
    Admin.tsx           Panel admina (PIN gate)
    AdminPricing.tsx    Cennik CRUD
    AdminEmployees.tsx  Pracownicy CRUD
    AdminSettings.tsx   Ustawienia salonu (dane, kasa, bony, prowizje, platnosci)
    AdminDevices.tsx    Zarzadzanie urzadzeniami (zatwierdzanie, blokowanie)
    KnowledgeBase.tsx   Katalog Wiedzy (opisy uslug/produktow, wyszukiwarka)
    OwnerSurvey.tsx     Ankieta dla szefa
    NotFound.tsx        Strona 404

  components/
    layout/
      PageHeader.tsx    Wspolny header: strzalka + tytul + rightSection
      PinModal.tsx      Reusable modal PIN (4 cyfry)
    pos/
      CartItemList.tsx  Lista pozycji w koszyku (+/- ilosc)
      TipSelector.tsx   Wybor napiwku (kwota)
      AddItemModal.tsx  Dodawanie uslug/produktow do koszyka
      DiscountModal.tsx Rabat procentowy lub kwotowy
      PaymentModal.tsx  Wybor metody platnosci (+ bon z doplata)
      SplitPaymentModal.tsx  Platnosc gotowka + karta
      ConfirmModal.tsx  Potwierdzenie przed finalizacja
    cash/
      TipTab.tsx        Zakladka Portfel - wyplata z tipBalance (async z DB)
      ExpenseTab.tsx    Zakladka Zakupy salonowe
      DepositTab.tsx    Zakladka Wplata do kasy (zasila kasetke + Portfel pracownika)
      VoucherTab.tsx    Zakladka sprzedazy bonu (generuje kod + zapis do DB)
      SettleModal.tsx   Rozliczenie zakupow (paragon + zwrot reszty)
      MovementHistory.tsx  Lista operacji kasowych
      types.ts          Re-export CashMovement z lib/types
    DeviceGate.tsx      Bramka urzadzen (rejestracja, oczekiwanie, blokada)
    ErrorBoundary.tsx   Obsluga crashy runtime
    PageSkeleton.tsx    Loading skeleton (code splitting)
    SwipeBack.tsx       Swipe back z lewej krawedzi
    ServiceWorkerRegistration.tsx  Rejestracja SW (PWA)

  contexts/
    DeviceContext.tsx  Provider + useDevice (UUID localStorage, status, register, refetch)

  hooks/
    useCart.ts          Koszyk POS (addToCart, removeFromCart, tip, discount, total)
    useMovements.ts     Ruchy kasowe z persystencja DB (7 handlerow async)
    useDbQuery.ts       Generyczny hook async (loading/error/refetch)
    useDbData.ts        Hooki zasobowe (useEmployees, useServices, useSalonSettings, ...)

  db/                   Warstwa bazy danych
    config.ts           Konfiguracja srodowiskowa (VITE_DB_ADAPTER)
    client.ts           Fabryka klienta DB (wybor adaptera)
    types.ts            Interfejsy DB (DbClient, CreateTransactionInput, ...)
    schema.sql          Schemat PostgreSQL (docelowy stan bazy)
    seed.sql            Dane testowe DEV (salon, pracownicy, uslugi, transakcje)
    adapters/
      mock.ts           Adapter mock (testy, offline)
      supabase.ts       Adapter Supabase DEV (JS SDK)
      rest.ts           Adapter REST (produkcja Hetzner VPS)

  lib/
    types.ts            Centralne typy domenowe (Employee, Transaction, CashMovement, ...)
    constants.ts        Stale (PINy mock, VOUCHER_EXPIRY_MONTHS, pluralize())

  data/                 Mock dane (fallback + testy)
    employees.ts        Pracownicy + statystyki
    services.ts         Uslugi (11 uslug z cenami)
    products.ts         Produkty
    transactions.ts     Transakcje

  themes/
    index.ts            Rejestr motywow + domyslny klucz
    barber-classic.ts   Motyw "classic" (createTheme)

  test/
    setup.ts            Konfiguracja vitest (jsdom)
```

---

## 3. Routing

Zdefiniowany w `App.tsx` z lazy loading (code splitting):

| Sciezka              | Komponent      | Opis                               |
| -------------------- | -------------- | ---------------------------------- |
| `/`                  | Dashboard      | Ekran glowny                       |
| `/pos?employee={id}` | POS            | Sprzedaz (pracownik z query param) |
| `/history`           | History        | Historia transakcji                |
| `/cash`              | Cash           | Ruchy kasowe                       |
| `/shift-close`       | ShiftClose     | Zamkniecie zmiany                  |
| `/help`              | KnowledgeBase  | Katalog Wiedzy (opisy uslug/prod.) |
| `/admin`             | Admin          | Panel admina (PIN)                 |
| `/admin/pricing`     | AdminPricing   | Cennik CRUD                        |
| `/admin/employees`   | AdminEmployees | Pracownicy CRUD                    |
| `/admin/settings`    | AdminSettings  | Ustawienia salonu                  |
| `/admin/devices`     | AdminDevices   | Zarzadzanie urzadzeniami           |
| `/admin/survey`      | OwnerSurvey    | Ankieta dla szefa                  |
| `*`                  | NotFound       | Strona 404                         |

Nawigacja: `useNavigate()` z React Router. Brak nested routes.
Cala aplikacja owinieta w `DeviceGate` - blokuje dostep do niezarejestrowanych/oczekujacych/zablokowanych urzadzen.

---

## 4. Warstwa bazy danych

### Wzorzec adapter

Trzy adaptery w `src/db/adapters/`, wybierane przez `VITE_DB_ADAPTER`:

| Adapter    | Srodowisko | Opis                                    |
| ---------- | ---------- | --------------------------------------- |
| `mock`     | Testy      | Dane w pamieci, brak zapytan sieciowych |
| `supabase` | DEV        | Supabase JS SDK, bezposrednie zapytania |
| `rest`     | Produkcja  | REST API do Node.js na Hetzner VPS      |

### Interfejs DbClient

Kazdy adapter implementuje:

```
salon:          get(), update()
devices:        getByDeviceId(), getAll(), register(), approve(), block(), updateLastSeen()
employees:      getAll(), getActive(), getById(id), create(), update(), toggleActive()
stats:          getDaily()
services:       getAll(), getActive(), create(), update(), toggleActive()
products:       getAll(), getActive(), create(), update(), toggleActive()
transactions:   getAll(), getByEmployee(), getToday(), getSince(), create(), cancel()
cashMovements:  getToday(), getSince(), create(), updateStatus()
vouchers:       getByCode(), redeem()
dailyReports:   create(), getToday(), getLastClosedAt(), getLastFloat()
```

### Hooki async

- **useDbQuery<T>** - generyczny hook (loading, error, data, refetch)
- **useEmployees** - lista aktywnych pracownikow
- **useServices** - uslugi (aktywne)
- **useProducts** - produkty (aktywne)
- **useTodayTransactions** - transakcje z dzis
- **useDailyStats** - statystyki salonowe
- **useSalonSettings** - konfiguracja salonu

### Mapowanie metod platnosci

UI wysyla polskie nazwy metod platnosci ("Gotowka", "Karta", "Bon + Karta"), adapter mapuje je na wartosci DB enum:

| UI (polski)       | DB enum            | Opis                         |
| ----------------- | ------------------ | ---------------------------- |
| "Gotowka"         | `cash`             | Platnosc gotowka             |
| "Karta"           | `card`             | Platnosc karta               |
| "BLIK"            | `blik`             | Platnosc BLIK                |
| "Bon podarunkowy" | `voucher`          | Caly rachunek bonem          |
| "Gotowka + Karta" | `cash` + `card`    | Split: 2 payment_detail rows |
| "Bon + Gotowka"   | `voucher` + `cash` | Split: bon + doplata gotowka |
| "Bon + Karta"     | `voucher` + `card` | Split: bon + doplata karta   |
| "Bon + BLIK"      | `voucher` + `blik` | Split: bon + doplata BLIK    |

Funkcja `parsePaymentInput()` w adapterach parsuje nazwe + details string i zwraca tablice `PaymentBreakdownItem[]`. Dla splitow tworzony jest osobny `payment_detail` per metoda.

### Obliczanie prowizji

Prowizja obliczana przy finalizacji transakcji i zamrazana w `transaction_item.commission_amount`:

```
Dla kazdego itemu:
  itemBase = price_at_sale * quantity
  itemAfterDiscount = itemBase - discountAmount * (itemBase / itemsSubtotal)
  rate = commission_service_percent (uslugi) lub commission_product_percent (produkty)
  commission_amount = round(itemAfterDiscount * rate) / 100
```

Reguly:

- Prowizja od split payment: od pelnej kwoty (niezaleznie od metody)
- Prowizja od rabatu: od kwoty PO rabacie (proporcjonalny rozklad)
- Napiwek NIE wchodzi do bazy prowizji
- Zmiana % prowizji nie wplywa na historyczne transakcje (snapshot)
- Prowizja niewidoczna w UI (do ustalenia z szefem: raporty miesieczne lub telefon fryzjera)

### Mapowanie discount_type

UI: `"percent"` / `"amount"` -> DB enum: `"percentage"` / `"amount"`. Mapowanie w supabase adapter create().

### Funkcja RPC

`increment_tip_balance(emp_id, delta)` - atomowy UPDATE tip_balance z `GREATEST(0, ...)`. Uzywana przy dodawaniu napiwku (delta > 0) i wyplacie (delta < 0).

---

## 5. Zarzadzanie stanem

### Stan lokalny

- **useState** w kazdej stronie
- **Custom hooks**: useCart (koszyk POS), useMovements (ruchy kasowe z DB)
- **DeviceContext** - jedyny globalny context (UUID urzadzenia, status, rejestracja)

### Persystencja

- Wszystkie operacje zapisywane do DB przez adaptery
- useMovements laduje ruchy "od ostatniego zamkniecia" z DB przy starcie
- History laduje transakcje "od ostatniego zamkniecia" z DB
- ShiftClose laduje transakcje + ruchy kasowe "od ostatniego zamkniecia"

### Wzorzec "od ostatniego zamkniecia"

Zamiast filtrowania po dacie, system uzywa `db.dailyReports.getLastClosedAt()` i laduje dane `getSince(since)`. Dzieki temu:

- Transakcje z poprzedniego dnia (jesli nie zamknieto) pojawiaja sie w raporcie
- Wiele zamkniec dziennie jest dozwolone
- Kazde zamkniecie "resetuje" punkt startowy

---

## 6. System motywow

Architektura wielomotywowa:

```
themes/index.ts          Rejestr: { classic: barberClassic, ... }
themes/barber-classic.ts Definicja motywu (createTheme)
main.tsx                 MantineProvider theme={themes[defaultThemeKey]}
```

Dark/light mode: `defaultColorScheme="auto"` (preferencja systemowa) + reczne przelaczanie na Dashboard.

---

## 7. Code splitting i loading

Wszystkie strony ladowane przez `React.lazy()` + `Suspense`:

```
App.tsx:
  const Dashboard = lazy(() => import("@/pages/Dashboard"));
  ...
  <Suspense fallback={<PageSkeleton />}>
    <Routes>...</Routes>
  </Suspense>
```

`PageSkeleton` wyswietla animowany skeleton podczas ladowania chunka.
Animacja przejscia: CSS `@keyframes fadeIn` na `.page-transition` (globals.css).

---

## 8. Flow danych - kluczowe ekrany

### POS (Sprzedaz)

```
Dashboard (klik pracownika)
  -> /pos?employee={id}
  -> useCart: addToCart(), applyDiscount(), setTip()
  -> Platnosc (PaymentModal / SplitPaymentModal)
  -> Potwierdzenie (ConfirmModal)
  -> db.transactions.create() (transaction + items + payment_detail + tip_balance)
  -> Haptic feedback + navigate("/")
```

Adapter tworzy: transaction row, transaction_item rows, payment_detail row(s), aktualizuje tip_balance jesli napiwek > 0.

### Ruchy kasowe (Cash)

```
Cash.tsx (orkiestrator)
  -> SegmentedControl (4 zakladki: Portfel / Zakupy / Wplata do kasy / Bon)
  -> TipTab / ExpenseTab / DepositTab / VoucherTab
  -> useMovements: handlery async -> db.cashMovements.create() -> stan lokalny
  -> MovementHistory wyswietla liste
```

useMovements laduje ruchy z DB przy starcie (`getSince(lastClosedAt)`) i dodaje nowe przez handlery async. Kazdy handler najpierw zapisuje do DB, potem aktualizuje stan lokalny.

Side effects w adapterze:

- `tip_withdrawal`: insert do tip_withdrawal + decrement tip_balance (RPC)
- `own_cash_deposit`: insert do cash_movement + increment tip_balance (RPC) - wplata zasila Portfel pracownika
- `voucher_sale`: insert do voucher (kod, wartosc, 12 mies. waznosc)

### Zamkniecie zmiany (ShiftClose)

```
1. Ladowanie danych: transakcje + ruchy kasowe "od ostatniego zamkniecia"
2. Obliczenie systemowych wartosci z paymentBreakdown (per metoda, nie per transakcja)
3. Obliczenie oczekiwanej gotowki:
   expectedCash = systemCash + cashIn(top_up, expense_settle, own_cash_deposit, voucher_sale cash)
                             - cashOut(tip_withdrawal, expense_take, barber_payback)
4. Obliczenie oczekiwanych bonow: expectedVouchers = suma platnosci voucher
5. Pracownik wpisuje: gotowka, drobne, bony papierowe
6. Roznice: gotowkowa + bonowa (kazda roznica pokazywana, brak tolerancji)
7. db.dailyReports.create() -> raport kasowy -> wydruk
```

Wiele zamkniec dziennie dozwolone (brak blokady).

---

## 9. Bezpieczenstwo

| Mechanizm      | Implementacja                                |
| -------------- | -------------------------------------------- |
| PIN admina     | Mock: "1234" (MOCK_ADMIN_PIN w constants.ts) |
| PIN operacyjny | Mock: "1234" (MOCK_OPERATIONS_PIN)           |
| Fryzjerzy      | Bez PINu - klik na karte = wejscie do POS    |
| Dane           | Supabase DEV (RLS wylaczone na DEV)          |

Docelowo: PIN-y hashowane w bazie (Salon.admin_pin_hash), RLS per salon.

### Autoryzacja urzadzen

Flow rejestracji:

```
1. Pierwsze uruchomienie -> generuj UUID -> localStorage (formen_device_id)
2. DeviceGate sprawdza status w DB (device_registration)
3. Brak wpisu -> ekran rejestracji (nazwa, typ, opcjonalnie pracownik)
4. Typ "admin" wymaga PIN-u szefa (4321) i jest auto-approved jesli brak innych zatwierdzonych
5. Typ "personal"/"station" -> status "pending" -> szef zatwierdza w /admin/devices
6. Po zatwierdzeniu -> pelny dostep do aplikacji
```

Typy urzadzen:

| Typ        | Opis                  | Kto uzywa    |
| ---------- | --------------------- | ------------ |
| `personal` | Telefon pracownika    | Fryzjer      |
| `station`  | Wspolny tablet salonu | Caly zespol  |
| `admin`    | Urzadzenie szefa      | Szef/manager |

Ryzyka: czyszczenie localStorage = utrata tozsamosci (ponowna rejestracja).

### Multi-salon

Architektura: osobna baza danych per salon (osobny deploy z innym `.env`).
Szef z dwoma salonami: 2 PWA na telefonie (osobne subdomeny/origin).

---

## 10. Typy domenowe

Zdefiniowane w `src/lib/types.ts`:

| Typ                  | Opis                                                | Uzywany w                |
| -------------------- | --------------------------------------------------- | ------------------------ |
| Employee             | Pracownik (imie, rola, saldo napiwkow, statystyki)  | Dashboard, POS, Cash     |
| DailyStats           | Statystyki salonowe (dzis, miesiac, rok, rekord)    | Dashboard                |
| Service              | Usluga (nazwa, cena, czas, opis, kategoria)         | POS, AdminPricing        |
| Product              | Produkt (nazwa, cena, opis)                         | POS, AdminPricing        |
| Transaction          | Transakcja (pozycje, platnosc, rabat, napiwek)      | History, ShiftClose      |
| TransactionItem      | Pozycja transakcji (nazwa, cena, typ)               | History, POS             |
| PaymentBreakdownItem | Metoda + kwota (per payment_detail)                 | ShiftClose (rozliczenie) |
| CashMovement         | Operacja kasowa (typ, kwota, status, paymentMethod) | Cash, ShiftClose         |
| CartItem             | Pozycja w koszyku (ilosc, typ)                      | POS                      |
| DiscountState        | Stan rabatu (typ + wartosc)                         | POS                      |
| Voucher              | Bon podarunkowy (kod, wartosc, saldo, waznosc)      | Cash, POS                |
| SalonSettings        | Konfiguracja salonu (dane, kasa, bony, prowizje)    | AdminSettings, Dashboard |
| DeviceRegistration   | Rejestracja urzadzenia (UUID, typ, status)          | DeviceGate, AdminDevices |

---

## 11. Testy

Framework: vitest + @testing-library/react + jsdom

```bash
npm test           # uruchom testy (51 testow)
npm test -- --ui   # interfejs graficzny
```

Pokrycie: mock dane, logika biznesowa hookow, renderowanie komponentow.
Testy mockuja modul `@/db` (`vi.mock`) - nie komunikuja sie z Supabase.

Lokalizacja testow: `src/**/__tests__/*.test.ts(x)`

---

## 12. Pre-commit hooks

Husky + lint-staged:

```
.husky/pre-commit -> npx lint-staged

lint-staged (package.json):
  *.{ts,tsx} -> prettier --write + eslint --fix
  *.{json,md,css} -> prettier --write
```

ESLint reguly:

- `@typescript-eslint/no-unused-vars` (warn, ignoruje `_` prefix)
- `@typescript-eslint/no-explicit-any` (warn)
- `@typescript-eslint/consistent-type-imports` (error)

---

## 13. Build i deploy

### Build produkcyjny

```bash
npm run build    # -> dist/
```

Vite generuje chunki per strona (code splitting). Output w `dist/`.

### Deploy na GitHub Pages

Automatyczny przez GitHub Actions przy push do `main`:

1. Checkout + Node 22 + npm install
2. `npm run build`
3. Upload `dist/` jako Pages artifact
4. Deploy

### Zmienne build-time

Zdefiniowane w `vite.config.ts`:

| Zmienna        | Wartosc                        | Uzywana w             |
| -------------- | ------------------------------ | --------------------- |
| APP_VERSION    | Z package.json (np. "0.1.47")  | Admin.tsx (ekran PIN) |
| APP_BUILD_DATE | Data buildu (np. "2026.04.10") | Admin.tsx (ekran PIN) |

---

## 14. PWA

- `public/manifest.json` - definicja PWA (nazwa, ikony, kolory)
- `ServiceWorkerRegistration.tsx` - rejestracja service workera
- Faza 3: pelny offline fallback z cache strategia

---

## 15. Helpery i narzedzia

### pluralize() (constants.ts)

Odmiana polskich liczebnikow:

```typescript
pluralize(1, "usluga", "uslugi", "uslug"); // "1 usluga"
pluralize(2, "usluga", "uslugi", "uslug"); // "2 uslugi"
pluralize(5, "usluga", "uslugi", "uslug"); // "5 uslug"
```

### Wspolne komponenty layout

- **PageHeader** - naglowek z przyciskiem powrotu, tytul, opcjonalna prawa sekcja
- **PinModal** - modal z PinInput (4 cyfry), obsluga bledow, cancel/confirm
