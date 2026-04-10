# FORMEN - Dokumentacja techniczna

## 1. Architektura

### Typ aplikacji

Single Page Application (SPA) dzialajaca w przegladarce. Brak server-side renderingu.
Docelowo: Progressive Web App (PWA) z offline fallback.

### Stack

| Warstwa    | Technologia                           | Wersja |
| ---------- | ------------------------------------- | ------ |
| Bundler    | Vite                                  | 6.x    |
| Framework  | React                                 | 19.x   |
| Jezyk      | TypeScript (strict)                   | 5.x    |
| Routing    | React Router                          | 7.x    |
| UI         | Mantine                               | 7.x    |
| Testy      | Vitest + Testing Library              | 4.x    |
| Linting    | ESLint (typescript-eslint) + Prettier | -      |
| Pre-commit | Husky + lint-staged                   | -      |

### Hosting i deploy

| Srodowisko  | Hosting      | Baza                  | Branch | Deploy                        |
| ----------- | ------------ | --------------------- | ------ | ----------------------------- |
| Produkcja   | MyDevil MD1  | MyDevil PostgreSQL 16 | main   | FTP/SFTP (po npm run build)   |
| Dev/Preview | GitHub Pages | Supabase DEV (free)   | main   | GitHub Actions (automatyczny) |
| Lokalne     | Vite dev     | Supabase DEV / mock   | dev    | `npm run dev`                 |

GitHub Pages wymaga basename `/pos-app` w BrowserRouter - wykrywane automatycznie w `main.tsx`.

### Strategia hostingu i migracji

**Stan obecny (Faza 1):** Frontend na GitHub Pages, mock dane w kodzie, brak bazy.

**Faza 2 (development):**

- Supabase DEV (free tier, 1 z 2 dostepnych projektow) jako baza rozwojowa
- Budowanie schematu PostgreSQL, testowanie, seed danych
- Frontend nadal na GitHub Pages

**Produkcja (docelowo):**

- MyDevil MD1 (200 zl/rok) -- frontend SPA + PostgreSQL 16 + Node.js
- Rownolegle przeniesienie istniejacego serwisu z lh.pl na MyDevil (konsolidacja)
- Supabase DEV zostaje jako srodowisko testowe (free, bez kosztow)

**MyDevil MD1 -- parametry:**

- 25 GB SSD/NVMe, 1 GB RAM
- Node.js, PostgreSQL 16, MySQL 8, MongoDB 5
- SSH, Git, SFTP, CRON
- SSL Let's Encrypt, WAF, backup codzienny
- Serwery w Warszawie (ATMAN)

**Koszty docelowe:** 200 zl/rok (MyDevil) vs poprzedni plan ~1460 zl/rok (lh.pl + Supabase Pro).

---

## 2. Struktura projektu

```
src/
  main.tsx              Entry point: BrowserRouter + MantineProvider + theme
  App.tsx               Routing (React Router v7) + ErrorBoundary + Suspense
  globals.css           Globalne style, animacje, @media print

  pages/                Strony (lazy-loaded przez React.lazy)
    Dashboard.tsx       Ekran glowny: statystyki, lista pracownikow, bottom bar
    POS.tsx             Sprzedaz: koszyk, rabaty, napiwki, platnosci
    History.tsx         Historia transakcji: filtrowanie, wyszukiwanie, cofanie
    Cash.tsx            Ruchy kasowe: napiwki, zakupy, wplaty, zwroty, bony
    ShiftClose.tsx      Zamkniecie zmiany: formularz, podsumowanie, raport
    Admin.tsx           Panel admina (PIN gate)
    AdminPricing.tsx    Cennik CRUD
    NotFound.tsx        Strona 404

  components/
    layout/
      PageHeader.tsx    Wspolny header: strzalka + tytul + rightSection
      PinModal.tsx      Reusable modal PIN (4 cyfry)
    pos/
      CartItemList.tsx  Lista pozycji w koszyku (+/- ilosc)
      TipSelector.tsx   Wybor napiwku (kwota lub %)
      AddItemModal.tsx  Dodawanie uslug/produktow do koszyka
      DiscountModal.tsx Rabat procentowy lub kwotowy
      PaymentModal.tsx  Wybor metody platnosci
      SplitPaymentModal.tsx  Platnosc laczna (np. bon + karta)
      ConfirmModal.tsx  Potwierdzenie przed finalizacja
    cash/
      TipTab.tsx        Zakladka wyplaty napiwkow
      ExpenseTab.tsx    Zakladka zakupow salonowych
      TopUpTab.tsx      Zakladka wplaty do kasy
      LoanTab.tsx       Zakladka "wydalem z wlasnych"
      VoucherTab.tsx    Zakladka sprzedazy bonu
      SettleModal.tsx   Rozliczenie zakupow (paragon)
      MovementHistory.tsx  Lista dzisiejszych operacji kasowych
      types.ts          Re-export CashMovement z lib/types
    ErrorBoundary.tsx   Obsluga crashy runtime
    PageSkeleton.tsx    Loading skeleton (code splitting)
    SwipeBack.tsx       Swipe back z lewej krawedzi
    ServiceWorkerRegistration.tsx  Rejestracja SW (PWA)

  lib/
    types.ts            Centralne typy domenowe (Employee, Transaction, CashMovement, ...)
    constants.ts        Stale (PINy mock, presety, metody platnosci, pluralize())

  data/                 Mock dane (Faza 1 - zastapione przez Supabase w Fazie 2)
    employees.ts        Pracownicy + statystyki
    services.ts         Uslugi
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

| Sciezka              | Komponent    | Opis                               |
| -------------------- | ------------ | ---------------------------------- |
| `/`                  | Dashboard    | Ekran glowny                       |
| `/pos?employee={id}` | POS          | Sprzedaz (pracownik z query param) |
| `/history`           | History      | Historia transakcji                |
| `/cash`              | Cash         | Ruchy kasowe                       |
| `/shift-close`       | ShiftClose   | Zamkniecie zmiany                  |
| `/admin`             | Admin        | Panel admina (PIN)                 |
| `/admin/pricing`     | AdminPricing | Cennik CRUD                        |
| `*`                  | NotFound     | Strona 404                         |

Nawigacja: `useNavigate()` z React Router. Brak nested routes.

---

## 4. Zarzadzanie stanem

### Faza 1 (obecna)

- **Stan lokalny** (`useState`) w kazdej stronie
- **Mock dane** importowane statycznie z `src/data/`
- Brak globalnego store (Redux/Zustand/Context) - nie jest potrzebny w Fazie 1
- Dane nie sa wspoldzielone miedzy stronami (kazda strona importuje mock niezaleznie)

### Faza 2 (planowana)

- **Supabase JS SDK** (client-side) zamiast mock danych
- Real-time subscriptions dla wspoldzielonych danych (stan kasetki, transakcje)
- Row Level Security (RLS) do izolacji danych per salon

---

## 5. System motywow

Architektura wielomotywowa przygotowana na przyszle motywy:

```
themes/index.ts          Rejestr: { classic: barberClassic, ... }
themes/barber-classic.ts Definicja motywu (createTheme)
main.tsx                 MantineProvider theme={themes[defaultThemeKey]}
```

Obsluga dark/light mode: `defaultColorScheme="auto"` (preferencja systemowa) + reczne przelaczanie przez `useMantineColorScheme()` na Dashboard.

Dodawanie nowego motywu:

1. Stworzyc plik `themes/nowy-motyw.ts` z `createTheme({...})`
2. Zarejestrowac w `themes/index.ts`
3. Zmienic `defaultThemeKey` lub dodac UI do wyboru motywu

---

## 6. Code splitting i loading

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

## 7. Flow danych - kluczowe ekrany

### POS (Sprzedaz)

```
Dashboard (klik pracownika)
  -> /pos?employee={id}
  -> Koszyk (CartItem[]) - stan lokalny
  -> Napiwek (TipSelector)
  -> Rabat (DiscountModal)
  -> Platnosc (PaymentModal / SplitPaymentModal)
  -> Potwierdzenie (ConfirmModal)
  -> Haptic feedback + navigate("/")
```

Pracownik przekazywany przez query param `?employee={id}`. POS wyszukuje go w mockEmployees.

### Ruchy kasowe (Cash)

```
Cash.tsx (orkiestrator)
  -> SegmentedControl (5 zakladek)
  -> TipTab / ExpenseTab / TopUpTab / LoanTab / VoucherTab
  -> Kazda operacja dodaje CashMovement do movements[]
  -> MovementHistory wyswietla liste
```

Stan `movements: CashMovement[]` zarzadzany w Cash.tsx, przekazywany do komponentow jako props.

Typy operacji i ich wplyw na kasetke:

| Typ            | Kierunek  | Kolor    | Opis                                  |
| -------------- | --------- | -------- | ------------------------------------- |
| tip_withdrawal | OUT (-)   | Czerwony | Wyplata napiwkow                      |
| expense_take   | OUT (-)   | Czerwony | Pobranie na zakupy                    |
| barber_payback | OUT (-)   | Czerwony | Zwrot za reszte                       |
| top_up         | IN (+)    | Zielony  | Wplata do kasy                        |
| voucher_sale   | IN (+)    | Zielony  | Sprzedaz bonu                         |
| barber_loan    | NEUTRALNY | Zolty    | Rejestracja dlugu (bez ruchu gotowki) |

### Zamkniecie zmiany (ShiftClose)

```
1. System oblicza oczekiwane kwoty (systemCash, systemCard, ...)
2. Pracownik wpisuje stan fizyczny (gotowka, drobne, bony)
3. System oblicza: depozyt = (gotowka - drobne) + bony
4. Roznica = policzona gotowka - oczekiwana systemowa
5. Modal potwierdzenia -> raport dobowy -> navigate("/")
```

---

## 8. Bezpieczenstwo (Faza 1)

| Mechanizm      | Implementacja                                |
| -------------- | -------------------------------------------- |
| PIN admina     | Mock: "1234" (MOCK_ADMIN_PIN w constants.ts) |
| PIN operacyjny | Mock: "1234" (MOCK_OPERATIONS_PIN)           |
| Fryzjerzy      | Bez PINu - klik na karte = wejscie do POS    |
| Dane           | Mock lokalne, brak komunikacji z serwerem    |

Faza 2: PIN-y hashowane w Supabase (Salon.admin_pin_hash), RLS per salon.

---

## 9. Typy domenowe

Zdefiniowane w `src/lib/types.ts`:

| Typ             | Opis                                               | Uzywany w            |
| --------------- | -------------------------------------------------- | -------------------- |
| Employee        | Pracownik (imie, rola, saldo napiwkow, statystyki) | Dashboard, POS, Cash |
| DailyStats      | Statystyki salonowe (dzis, miesiac, rok, rekord)   | Dashboard            |
| Service         | Usluga (nazwa, cena, kategoria)                    | POS, AdminPricing    |
| Product         | Produkt (nazwa, cena)                              | POS, AdminPricing    |
| Transaction     | Transakcja (pozycje, platnosc, rabat, napiwek)     | History              |
| TransactionItem | Pozycja transakcji (nazwa, cena, typ)              | History, POS         |
| CashMovement    | Operacja kasowa (typ, kwota, status)               | Cash                 |
| CartItem        | Pozycja w koszyku (ilosc, typ)                     | POS                  |
| DiscountState   | Stan rabatu (typ + wartosc)                        | POS                  |

---

## 10. Testy

Framework: vitest + @testing-library/react + jsdom

```bash
npm test           # uruchom testy
npm test -- --ui   # interfejs graficzny
```

Pokrycie: mock dane, logika biznesowa, renderowanie komponentow (33 testow).

Lokalizacja testow: `src/**/__tests__/*.test.ts(x)`

---

## 11. Pre-commit hooks

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

## 12. Build i deploy

### Build produkcyjny

```bash
npm run build    # -> dist/
```

Vite generuje chunki per strona (code splitting). Output w `dist/`.

### Deploy na GitHub Pages

Automatyczny przez GitHub Actions przy push do `main`:

1. Checkout + Node 20 + npm ci
2. `npm run build`
3. Upload `dist/` jako Pages artifact
4. Deploy

### Zmienne build-time

Zdefiniowane w `vite.config.ts`:

| Zmienna        | Wartosc                        | Uzywana w             |
| -------------- | ------------------------------ | --------------------- |
| APP_VERSION    | Z package.json (np. "0.1.20")  | Admin.tsx (ekran PIN) |
| APP_BUILD_DATE | Data buildu (np. "2026.04.10") | Admin.tsx (ekran PIN) |

---

## 13. PWA

- `public/manifest.json` - definicja PWA (nazwa, ikony, kolory)
- `ServiceWorkerRegistration.tsx` - rejestracja service workera
- Faza 3: pelny offline fallback z cache strategia

---

## 14. Helpery i narzedzia

### pluralize() (constants.ts)

Odmiana polskich liczebnikow:

```typescript
pluralize(1, "usluga", "uslugi", "uslug"); // "1 usluga"
pluralize(2, "usluga", "uslugi", "uslug"); // "2 uslugi"
pluralize(5, "usluga", "uslugi", "uslug"); // "5 uslug"
pluralize(22, "usluga", "uslugi", "uslug"); // "22 uslugi"
```

### Wspolne komponenty layout

- **PageHeader** - naglowek z przyciskiem powrotu, tytul, opcjonalna prawa sekcja
- **PinModal** - modal z PinInput (4 cyfry), obsluga bledow, cancel/confirm
