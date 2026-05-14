# Architecture Decision Records (ADR)

Rejestr kluczowych decyzji architektonicznych i biznesowych w projekcie FORMEN POS.
Kazda decyzja zawiera kontekst, rozpatrywane opcje, wybor i uzasadnienie.

---

## ADR-001: Mantine UI zamiast shadcn/ui

**Data:** 2026-03
**Status:** Zaakceptowana

**Kontekst:** Potrzebna biblioteka UI z gotowymi komponentami, wsparciem dark/light mode i dobra dokumentacja.

**Opcje:**

1. **shadcn/ui** - popularne, oparte na Radix + Tailwind, copy-paste components
2. **Mantine UI 9** - kompletna biblioteka z hooks, forms, notifications, theming

**Decyzja:** Mantine UI 9

**Uzasadnienie:**

- Kompletny ekosystem (useForm, notifications, modals) - mniej zewnetrznych zaleznosci
- Wbudowany system motywow (createTheme) z dark/light mode
- Komponenty gotowe do uzycia bez konfiguracji Tailwind
- Lepsza dokumentacja w jednym miejscu (mantine.dev)
- shadcn wymaga wiecej pracy recznej (kopiowanie komponentow, konfiguracja Tailwind)

---

## ADR-002: Adapter pattern dla warstwy bazy danych

**Data:** 2026-03
**Status:** Zaakceptowana

**Kontekst:** Projekt potrzebuje dwoch srodowisk: Supabase (development), REST API (produkcja Hetzner VPS). Kazde z nich ma inny sposob komunikacji z baza.

**Opcje:**

1. Bezposrednie wywolania Supabase SDK wszedzie, mockowanie w testach
2. Adapter pattern - wspolny interfejs, dwie implementacje

**Decyzja:** Adapter pattern (`src/db/adapters/`)

**Uzasadnienie:**

- Zmiana srodowiska przez jedna zmienna env (`VITE_DB_ADAPTER`)
- Testy mockuja modul `@/db` (vi.mock) - nie zaleza od Supabase
- Migracja na Hetzner VPS REST API nie wymaga zmian w komponentach
- Dodanie nowego backendu = nowy adapter, bez zmian w UI

---

## ADR-003: SPA zamiast SSR/SSG

**Data:** 2026-03
**Status:** Zaakceptowana

**Kontekst:** Aplikacja POS dziala na tabletach/telefonach w salonie. Nie wymaga SEO ani indeksowania.

**Opcje:**

1. Next.js (SSR/SSG)
2. Vite + React (SPA)

**Decyzja:** Vite + React (SPA)

**Uzasadnienie:**

- Brak potrzeby SEO - aplikacja za autoryzacja urzadzen
- Prostszy deploy (statyczne pliki na GitHub Pages / Hetzner VPS)
- Szybszy development (Vite HMR)
- Mniejsza zlozonosc niz Next.js (brak server components, API routes)
- Docelowo PWA z offline fallback

---

## ADR-004: Multi-salon przez osobne deploye

**Data:** 2026-03
**Status:** Zaakceptowana

**Kontekst:** Szef ma jeden salon, ale architektura powinna dopuszczac wiecej salonow w przyszlosci.

**Opcje:**

1. Row Level Security (RLS) - jedna baza, filtrowanie po salon_id
2. Osobna baza i deploy per salon

**Decyzja:** Osobna baza per salon (osobny deploy z innym `.env`)

**Uzasadnienie:**

- Pelna izolacja danych miedzy salonami
- Prostsze - brak RLS, brak tenant_id w kazdym zapytaniu
- Kazdy salon moze miec wlasna konfiguracje (cennik, pracownicy)
- Przy jednym salonie nie ma narzutu multi-tenancy
- Skalowanie: dodanie salonu = nowy deploy (nowa instancja bazy na tym samym Hetzner VPS lub osobny VPS)

---

## ADR-005: Autoryzacja urzadzen zamiast logowania uzytkownikow

**Data:** 2026-04
**Status:** Zaakceptowana

**Kontekst:** Fryzjerzy nie chca sie logowac. Szef chce kontrolowac ktore urzadzenia maja dostep.

**Opcje:**

1. Klasyczny login (email + haslo)
2. Autoryzacja na poziomie urzadzenia (UUID w localStorage)

**Decyzja:** Autoryzacja urzadzen (DeviceGate)

**Uzasadnienie:**

- Fryzjerzy nie musza pamietac hasel
- Urzadzenie salonu (tablet) jest juz zaufane - wystarczy jednorazowe zatwierdzenie przez szefa
- Trzy role urzadzen: personal (telefon fryzjera), station (tablet przy kasie), admin (telefon szefa)
- PIN admina chroni panel administracyjny i operacje krytyczne
- Szef zatwierdza nowe urzadzenia w panelu /admin/devices

---

## ADR-006: PostgreSQL (Supabase DEV + Hetzner VPS PROD)

**Data:** 2026-04
**Status:** Superseded przez ADR-015 (2026-05-14) - PROD migruje na SQLite (better-sqlite3) na Hetzner. Supabase DEV pozostaje bez zmian.

**Kontekst:** Potrzebna baza relacyjna z transakcjami. Development wymaga latwo dostepnej bazy, produkcja - pelnej kontroli i niezawodnej.

**Opcje:**

1. Supabase (free) na DEV i PROD
2. Supabase DEV + shared hosting z PostgreSQL (np. MyDevil)
3. Supabase DEV + VPS self-managed (Hetzner)
4. Firebase (NoSQL)

**Decyzja:** Supabase DEV (free) + Hetzner CX24 VPS z PostgreSQL 16 (PROD)

**Uzasadnienie:**

- Supabase free tier wystarczy na development (ograniczenia: pause po 7 dniach, 500 MB)
- Hetzner CX24 VPS - pelna kontrola, wlasny Node.js + PostgreSQL 16, snapshoty, skalowalnosc
- Porzucono MyDevil (shared hosting) na rzecz VPS: wieksza elastycznosc, brak limitow shared CPU/RAM
- Obie bazy to PostgreSQL - ten sam schemat, ten sam SQL
- Firebase odrzucony: dane finansowe wymagaja relacji i transakcji ACID

---

## ADR-007: Dezaktywacja zamiast usuwania rekordow

**Data:** 2026-04
**Status:** Zaakceptowana

**Kontekst:** Pracownicy odchodza, uslugi sie zmieniaja, ale historia transakcji musi zachowac referencje.

**Decyzja:** Soft delete - flaga `is_active` zamiast DELETE

**Uzasadnienie:**

- Historia transakcji zawsze zachowuje pelne dane (pracownik, usluga, cena)
- Mozliwosc przywrocenia pracownika/uslugi
- Brak ryzyka cascade delete na powiazanych rekordach
- Listy aktywnych elementow filtrowane przez `WHERE is_active = true`

---

## ADR-008: Brak presetow napiwkow i bonow

**Data:** 2026-04-10
**Status:** Zaakceptowana (decyzja szefa)

**Kontekst:** Wiele systemow POS oferuje presety napiwkow (10%, 15%, 20%) i predefiniowane nominaly bonow.

**Decyzja:** Tylko pola na dowolna kwote, bez presetow.

**Uzasadnienie (szef):**

- Napiwki sa rozne - presety sugeruja "wlasciwa" kwote
- Bony maja rozne wartosci - preset by ograniczal
- Prostszy interfejs - jedno pole zamiast siatki przyciskow
- "Mniej opcji = szybciej"

---

## ADR-009: Prowizja od kwoty po rabacie

**Data:** 2026-04-10
**Status:** Zaakceptowana (decyzja szefa)

**Kontekst:** Fryzjer udziela rabatu klientowi. Od jakiej kwoty liczyc prowizje?

**Opcje:**

1. Od kwoty przed rabatem (brutto cennikowa)
2. Od kwoty po rabacie (faktycznie zaplacona)

**Decyzja:** Od kwoty po rabacie

**Uzasadnienie (szef):**

- Salon zarabia mniej po rabacie - prowizja powinna to odzwierciedlac
- Sprawiedliwe: fryzjer dostaje % od tego co salon faktycznie otrzymal
- Proste do wytlumaczenia pracownikom

---

## ADR-010: Wplata do kasy - jeden typ dla wszystkich

**Data:** 2026-04-13
**Status:** Zaakceptowana (decyzja szefa)

**Kontekst:** W salonie zdarzaja sie rozne wplaty: szef zasila kasetke, fryzjer oddaje wlasne pieniadze (bo wydal reszte z kieszeni). Czy rozrozniac te typy?

**Decyzja:** Jeden typ `own_cash_deposit` bez rozroznienia zrodla

**Uzasadnienie (szef):**

- Kazda wplata zwieksza stan kasetki i portfel pracownika
- Rozroznienie szef/pracownik komplikuje interfejs bez realnej korzysci
- Przy zamknieciu zmiany i tak widac kto ile wplacil

---

## ADR-011: Rabat w POS - tylko kwotowy z przyciskami inkrementalnymi

**Data:** 2026-05-13
**Status:** Zaakceptowana (decyzja szefa)

**Kontekst:** W poprzedniej wersji `DiscountModal` mial `SegmentedControl` z wyborem typu rabatu (procentowy/kwotowy). Szef uznal procentowy za nieintuicyjny - fryzjerzy mysla kwotami, nie procentami.

**Decyzja:** Usunieto rabat procentowy. Rabat tylko kwotowy z przyciskami `+1`, `+5`, `+10`, `+20` dodajacymi do aktualnej kwoty (clamp do `subtotal`). Pole recznego wpisywania kwoty zachowane.

**Uzasadnienie (szef):**

- Fryzjerzy mysla kategoriami zlotowek, nie procentow
- Klient prosi "daj 10 zl rabatu", nie "daj 5% rabatu"
- Przyciski inkrementalne (`+10 + 10 = 20`) sa szybsze niz numpad
- Ten sam mechanizm dziala dla rabatu i napiwku (spojnosc UX)

**Uwaga:** Mechanizm przyciskow inkrementalnych NIE jest sprzeczny z ADR-008 (BEZ presetow napiwkow/bonow). Przyciski `+N` dodaja do aktualnej kwoty (quick-entry), nie ustawiaja pelnej wartosci (preset). Klasyczne presety typu `10%`, `15%`, `20%` dalej sa zakazane.

**Wsteczna kompatybilnosc:** `mapTransaction` (`src/db/mappers.ts`) nadal obsluguje historyczne transakcje z `discount_type = 'percentage'` - mapper zachowany dla zapewnienia poprawnego odczytu starych danych. Tylko UI tworzy nowe rabaty jako `amount`.

---

## ADR-012: Edytowalna cena jednostkowa produktu w koszyku

**Data:** 2026-05-13
**Status:** Zaakceptowana (decyzja szefa)

**Kontekst:** Pracownik czasem sprzedaje produkt po innej cenie niz cennikowa (np. produkt z koncowki, promocja, prezent dla stalego klienta). Uslugi maja stale ceny - bez wyjatkow.

**Opcje rozwazane:**

1. Edycja ceny przy nazwie produktu
2. Dodatkowe pole "Cena szt." pod "Do zaplaty"
3. Kliknieciem ceny / przyciskiem ołowka przy produkcie w koszyku

**Decyzja:** Opcja 3 - przycisk ołowka przy produkcie w koszyku otwiera modal z `NumberInput decimalScale={2}` (cena jednostkowa do 2 miejsc po przecinku). Dziala takze gdy koszyk zawiera mieszanke usluga+produkt.

**Uzasadnienie:**

- Cena uslugi nie powinna byc edytowalna - rabaty/promocje rozliczane przez Rabat
- Edycja przy pozycji w koszyku jest blisko miejsca decyzji (nie ginie w innym ekranie)
- Modal zamiast inline-edit - lepsza UX na mobile (klawiatura numeryczna, decimalScale)
- Cena jednostkowa, nie laczna - jasniejsze przy quantity > 1

**Wymagania techniczne:**

- `NumberInput min={0.01}` w modalu - produkt za 0 zl niedozwolony (guard takze w `applyPriceEdit`: odrzuca puste pole i wartosci `< 0.01`)
- `useCart.updatePrice(cartId, price)` z `Math.max(0, price)` (defense-in-depth - faktyczna walidacja w callsite)
- `CartItemList` pokazuje przycisk olowka tylko gdy `item.type === "product"`
- Cena po edycji propagowana do prowizji (juz dzialalo - prowizja od `price_at_sale`)

---

## ADR-013: Kolejnosc pracownikow + opcjonalny badge retencji

**Data:** 2026-05-13
**Status:** Zaakceptowana (decyzja szefa)

**Kontekst:** Lista pracownikow w POS/Dashboard byla sortowana alfabetycznie. Szef chcial recznie kontrolowac kolejnosc (np. najczesciej pracujacy fryzjerzy na gorze). Dodatkowo niektorzy pracownicy nie chca pokazywac badge retencji (`MISTRZ`, `SOLIDNY`, `ROZWOJ`) klientom widzacym ekran.

**Decyzja:**

1. Nowa kolumna `employee.display_order INT NOT NULL DEFAULT 0` - nizsza liczba = wyzej. Tie-break: alfabetycznie po imieniu. Analogiczne do `display_order` w `service`/`product`.
2. Nowa kolumna `employee.show_retention_badge BOOLEAN NOT NULL DEFAULT true` - kontroluje tylko widocznosc tekstowego badge na liscie pracownikow. Ikona na avatarze (korona/diament/gwiazda/wykres wg poziomu retencji) jest **zawsze widoczna**.
3. Sortowanie odbywa sie w SQL (`ORDER BY display_order ASC, name ASC`) w `useEmployees`, oraz lokalnie w `AdminEmployees` i `Dashboard` (po wlasciwym filtrowaniu).

**Uzasadnienie:**

- Spojnosc z innymi listami (uslugi, produkty maja juz `display_order`)
- Ikona pozwala szefowi widziec status pracownika nawet gdy badge tekstowy ukryty
- DEFAULT 0 / true zachowuje istniejace dane bez migracji wartosci

**Mapowanie ikon (Dashboard `RetentionAvatarIcon`):**

| Poziom              | Ikona            |
| ------------------- | ---------------- |
| MISTRZ (yellow)     | `IconCrown`      |
| MISTRZ (blue)       | `IconDiamond`    |
| SOLIDNY             | `IconStar`       |
| inne (rozwoj/start) | `IconTrendingUp` |

---

## ADR-014: Kontrakt adaptera DbClient - domain shape, nie storage shape

**Data:** 2026-05-13
**Status:** Zaakceptowana

**Kontekst:** ADR-002 wprowadzil adapter pattern dla bazy danych (Supabase DEV, REST PROD). W praktyce okazalo sie, ze oba adaptery satysfakcjonuja interfejs `DbClient` (`src/db/types.ts`) w roznych sposob:

- `adapters/supabase.ts` - uzywa `src/db/mappers.ts` do konwersji snake_case -> camelCase (23 wywolania mapperow)
- `adapters/rest.ts` - uzywa `r.json() as Promise<T>` - TYPE ASSERTION, zaklada ze backend juz zwraca domain shape

Eksploracja architektoniczna (2026-05-13) wykazala friction: TypeScript wymusza typ `Employee` na poziomie kompilacji, ale type assertion w REST adapterze pomija runtime check. Niespojnosc moglaby ugryzc przy zmianie schematu DB (np. backend Hetzner zapomni zwrocic `displayOrder` w camelCase).

**Rozwazone opcje:**

1. **Przeniesc mapping do REST adaptera** - dodac `mapEmployee` itd. w `rest.ts`. Wymaga znajomosci JSON shape z backendu, ktory MOZE byc snake_case (zalezy od implementacji). Wieksza spojnosc z Supabase.
2. **Pozostawic status quo + dokumentacja** - backend Hetzner ma kontrakt zwracac domain shape; adapter robi tylko transport.
3. **Runtime validation w obu adapterach** (zod schema) - najwyzszy koszt, najwieksza pewnosc.

**Decyzja:** Opcja 2 - **kontrakt seamu DbClient to domain shape (camelCase, types per `@/lib/types`); adapter konwertuje wewnetrznie ze storage format jak potrzeba**.

**Uzasadnienie:**

- Backend Hetzner jest pod kontrola tego samego zespolu - kontrakt mozna utrzymac przez code review na endpointach (`POST /api/employees` musi serializowac `displayOrder`, nie `display_order`)
- Wprowadzenie zod/runtime walidacji to znaczny narzut bundle size i utrzymania dla aplikacji ktora i tak crashnie przy braku pola
- ADR-002 (adapter pattern) zaklada ze adaptery mogac roznic sie w implementacji - mapping to _implementation detail_, nie _contract_
- TypeScript wymusza shape na callsites - jesli backend zwroci niewlasciwy shape, UI dostanie `undefined` w polu, ktore latwo zlokalizowac

**Konsekwencje:**

- Zmiana schema DB wymaga **dwoch aktualizacji**:
  1. `src/db/mappers.ts` (snake_case -> camelCase dla Supabase)
  2. Backend Hetzner endpoint (MUSI serializowac do camelCase)
- Dodano test asercyjny `src/db/adapters/__tests__/rest-contract.test.ts` fixujacy shape ktorego oczekujemy od backendu - jesli typy w `@/lib/types` zmienia sie, test fails i zwraca uwage na aktualizacje backendu
- Dokumentacja kontraktu inline w `src/db/types.ts` (komentarz nad `interface DbClient`) i `src/db/adapters/rest.ts` (komentarz nad `fetchApi`)

**Nie re-litigowac:** propozycje "dodaj mappery do REST" beda regularnie pojawiac sie z code review. Odrzucac z odsylaniem do tego ADR, chyba ze pojawi sie nowa informacja (np. backend zmieni kontrakt na snake_case).

---

## ADR-015: SQLite (better-sqlite3) na Hetzner zamiast PostgreSQL dla PROD

**Data:** 2026-05-14
**Status:** Zaakceptowana - supersedes ADR-006 (PROD only; DEV pozostaje na Supabase + GitHub Pages)

**Kontekst:** ADR-006 zaproponowal PostgreSQL 16 na Hetzner CX24 dla PROD. Eksploracja architektoniczna (2026-05-13) i przeglad alternatyw (2026-05-14) wykazaly, ze dla skali "1 salon = 1 deploy" (ADR-004) Postgres to nadmierny narzut operacyjny:

- Serwis bazy do utrzymywania (restart, monitoring, aktualizacje)
- RPC `increment_tip_balance` w PL/pgSQL - dodatkowa warstwa kodu poza JS
- Atomicy `db.transactions.create()` wymaga jawnego BEGIN/COMMIT lub RPC (zidentyfikowano w code review jako "Candidate #5" - hidden side effects)
- Backup wymaga pg_dump + cron + S3 lub Litestream
- CX24 (Postgres-poziom RAM) drozsze niz CX22 (wystarczajace dla SQLite)

**Rozwazone alternatywy:**

1. **Pozostac przy Postgres na Hetzner** - status quo per ADR-006
2. **Vercel/Netlify + Turso (managed SQLite)** - prostota, ale vendor lock + cold starts
3. **Coolify/Dokploy na Hetzner** - self-hosted PaaS, UI-driven deploy
4. **Plain Node.js + better-sqlite3 + Caddy + systemd na Hetzner** - boring tech, pelna kontrola
5. **Bun + bun:sqlite** - mniej buildu, ale Bun mniej dojrzaly w prod

**Decyzja:** Plain Node.js + Express + better-sqlite3 + Caddy + systemd na Hetzner CX22 (Opcja 4). DEV pozostaje bez zmian (Supabase + GitHub Pages).

**Stack PROD:**

```
Hetzner CX22 (Ubuntu 24.04, ~€4.51/mc)
├── Frontend: Vite build → /var/www/formen/ (static)
├── Backend: Node.js 22 + Express + better-sqlite3 (plain JS, no tsc)
├── Web: Caddy (auto-TLS Let's Encrypt + reverse_proxy /api/* → :3000)
├── Process: systemd (formen.service)
├── DB: /srv/formen/data/sqlite.db (WAL mode, foreign_keys=ON)
└── Backup: Hetzner Automatic Backups ($1/mc, daily VPS snapshot)
```

**Uzasadnienie:**

- **Atomicy transakcji "za darmo"** - `db.transaction(() => {...})` w better-sqlite3 zastepuje RPC + osobne INSERTy, rozwiazuje Candidate #5 z architektonicznego review
- **Mniej elementow** - eliminacja Postgres service, brak Drizzle ORM, brak Litestream (Hetzner snapshots wystarcza dla 1 salonu), brak TypeScript w backendzie (frontend zostaje TS)
- **Adapter pattern (ADR-002) chroni klienta** - tylko backend Hetzner sie zmienia, `rest.ts` adapter klienta i kontrakt `DbClient` (ADR-014) bez zmian
- **Koszt** - CX22 (€4.51/mc) + Automatic Backups ($1/mc) = ~€5.50/mc; nizej niz CX24 + zewnetrzny backup
- **Boring tech** - Express, systemd, Caddy: kazdy admin Linuxa zna, milion przykladow, latwy debugging
- **DEV/PROD split zachowany** - dev branch na GH Pages + Supabase nadal jako sandbox; jesli Supabase pauzuje free tier, salon dziala niezaleznie

**Konsekwencje:**

- Schema SQL trzeba przepisac na SQLite dialect:
  - `UUID DEFAULT uuid_generate_v4()` → `TEXT PRIMARY KEY` (UUID generowany w Node.js przez `crypto.randomUUID()`)
  - `TIMESTAMPTZ` → `TEXT` (ISO 8601) z `DEFAULT (datetime('now'))`
  - `NUMERIC(10,2)` → `REAL` (wystarczajaca precyzja dla kwot w PLN; revisit jesli pojawia sie bugi precyzji)
  - `BOOLEAN` → `INTEGER` (0/1)
  - `ON DELETE CASCADE` zachowane + `PRAGMA foreign_keys = ON` przy starcie
- RPC `increment_tip_balance` znika - logika atomicy w `server.js` przez `db.transaction()`
- Mappers w `src/db/mappers.ts` pozostaja dla Supabase adaptera (DEV); REST adapter klienta dostaje juz camelCase z backendu Node.js (per ADR-014)
- Backup model: pelny VPS snapshot dziennie (Hetzner panel). Restore = nowy VPS z snapshotu (~10 min). RPO ~24h akceptowalny dla 1 salonu; jesli wymagane <1h, dodac Litestream → S3 (decyzja na pozniej)
- Deploy: `git pull && npm install --omit=dev && systemctl restart formen` na VPS + `rsync dist/ → /var/www/formen/` z lokalnego komputera

**Plan migracji** (~3 dni roboczych + weekend cutover):

1. **Faza 1**: lokalnie - `formen-backend/` z `schema.sql` (SQLite), `db.js`, `server.js` (~50 endpointow); test z klientem przez `VITE_API_URL=http://localhost:3000`
2. **Faza 2**: provision Hetzner CX22 (Ubuntu, Node 22, Caddy, ufw, Automatic Backups ON)
3. **Faza 3**: Caddyfile + systemd unit + DNS A record (TTL 60s wczesniej)
4. **Faza 4**: deploy + smoke test + cutover w niedziele wieczor (salon zamkniety)
5. **Faza 5**: docs - aktualizacja CLAUDE.md "Srodowiska", README, docs/technical.md

**Co NIE jest w scope tej decyzji:**

- Litestream → S3 backup (zostawione na pozniej; Hetzner snapshots wystarczaja)
- Drizzle ORM lub inny query builder (raw better-sqlite3 z prepared statements)
- Multi-region replikacja (1 salon nie wymaga)
- Offline mode klienta (Faza 3 produktu, osobna ADR)

**Trigger do rozszerzenia tego ADR:**

- Drugi salon w produkcji → rozwazyc Litestream dla mniejszego RPO, lub osobny VPS per salon
- Reklamacje precyzji finansowej → migracja REAL → INTEGER w groszach
- Salon ma SLA wymagajacy aktywnego fallbacku → rozwazyc Strategia C z analizy dual-hostingu (active-active sync)

---

## ADR-016: Monorepo z pnpm workspaces dla wszystkich produktow FORMEN

**Data:** 2026-05-14
**Status:** Zaakceptowana

**Kontekst:** W planie sa kolejne produkty FORMEN obok obecnego POS:

- **POS web** (obecny `pos-app`) - SPA dla pracownikow salonu
- **POS API** (planowany per ADR-015) - Node.js + Express + SQLite
- **CRM** (planowany wkrotce) - admin web app do edycji danych (klienci, pracownicy, uslugi)
- **Marketing/landing** (planowany wkrotce) - statyczna strona produktowa

CRM **dzieli dane z POS** (te same tabele: `employee`, `service`, `client`, ...) - czyli ten sam backend API serwuje POS i CRM. Marketing jest niezalezna (statyczna strona, SEO).

Bez ustalonej architektury powstaje pytanie: osobne repa per produkt czy monorepo?

**Rozwazone opcje:**

1. **Osobne repa per produkt** (`formen-pos-web`, `formen-pos-api`, `formen-crm`, `formen-marketing`)
   - Plusy: pelna niezaleznosc, czysta granica, niezalezne deploye
   - Minusy: 4 git pulle przy cross-stack zmianach, brak shared types bez publishing npm packagy, duplikacja UI/theme, ~4 CI do utrzymania

2. **Monorepo bez tooling** (jeden folder, jeden `package.json`)
   - Plusy: trywialne setup
   - Minusy: niejasne granice miedzy projektami, kazda apka ma swoje deps w jednym `node_modules`, brak izolacji

3. **Monorepo z npm workspaces**
   - Plusy: standard z Node 16+, zero dodatkowych narzedzi, izolacja deps per apka
   - Minusy: troche wolniejsze instalacje niz pnpm, brak hoistingu kontroli

4. **Monorepo z pnpm workspaces**
   - Plusy: szybkie, oszczedne dysk (symlinks zamiast kopii), swietna izolacja deps, hoisting kontrolowany przez `pnpm-workspace.yaml`
   - Minusy: dodatkowe narzedzie do zainstalowania (`npm install -g pnpm`)

5. **Monorepo z Turborepo/Nx**
   - Plusy: cache build/test, pipelines, opinionated workflows
   - Minusy: overkill dla 4 apek + solo dev, learning curve, dodatkowa zaleznosc

**Decyzja:** Monorepo z **pnpm workspaces**. Marketing pozostaje w monorepo jako `apps/marketing/` (z mozliwoscia wyciagniecia do osobnego repo w przyszlosci).

**Struktura docelowa:**

```
formen/                            ← repo (rename z pos-app)
├── apps/
│   ├── pos-web/                   ← Vite + React (obecny pos-app)
│   │   └── package.json           "name": "@formen/pos-web"
│   ├── pos-api/                   ← Node + Express + better-sqlite3 (per ADR-015)
│   │   └── package.json           "name": "@formen/pos-api"
│   ├── crm/                       ← (gdy startujemy)
│   │   └── package.json           "name": "@formen/crm"
│   └── marketing/                 ← (gdy startujemy)
│       └── package.json           "name": "@formen/marketing"
├── packages/
│   ├── shared-types/              ← Employee, Transaction, CartItem, DiscountState itp.
│   │   └── package.json           "name": "@formen/shared-types"
│   └── ui/                        ← Mantine theme + reusable komponenty (gdy potrzeba)
│       └── package.json           "name": "@formen/ui"
├── pnpm-workspace.yaml            ← lista workspaces
├── package.json                   ← root, shared devDeps (eslint, prettier, tsconfig)
├── docs/                          ← dokumentacja wspolna
├── CLAUDE.md
└── .github/workflows/             ← CI per apka (lub turbo task)
```

**Uzasadnienie:**

- **Shared types kluczowe** - POS i CRM operuja na tych samych encjach (Employee, Service, ...). Monorepo eliminuje duplikacje typow przez `@formen/shared-types` importowany lokalnie (pnpm symlink) - zmiana typu propaguje sie natychmiast bez publishing
- **Atomic cross-stack zmiany** - dodanie pola do `Employee` to JEDEN commit obejmujacy: `pos-api/schema.sql` + `shared-types/Employee` + `pos-web` UI + `crm` UI; w 4 repach to 4 PR-y z ryzykiem zapomnienia o ktoryms
- **Shared UI (gdy CRM startuje)** - Mantine theme, kolory marki, `<EmployeeAvatar>`, `<MoneyInput>` - zmiana w `@formen/ui` lazy propagacja
- **pnpm vs npm** - symlinks dla intra-monorepo deps oszczedzaja GB miejsca (jedna kopia `node_modules`), szybsze instalacje, lepsza izolacja (`shamefully-hoist=false` domyslnie)
- **Bez Turborepo/Nx** - dla 4 apek solo dev cache build nie da znaczacego zysku; gdy projekty urosna do 10+ apek revisit
- **Marketing w monorepo** - poczatkowo wszystko w jednym miejscu; mozna wyciagnac do osobnego repo gdy zespol marketingowy bedzie niezalezny (rzadko sie zdarza)

**Konsekwencje:**

- Wymaga jednorazowej instalacji pnpm globalnie: `npm install -g pnpm`
- Commendy `npm install` zostaja zastapione przez `pnpm install`; `pnpm install --filter @formen/pos-web` dla konkretnej apki
- CI musi uzywac `pnpm` zamiast `npm` (zmiana w `.github/workflows/`)
- Importy miedzy apkami przez nazwy `@formen/shared-types` (pnpm symlinkuje do `packages/shared-types/`)
- Wersjonowanie - albo wszystkie apki maja te sama wersje (lockstep), albo niezalezne (kazda swoja); na start lockstep dla prostoty
- TypeScript: jeden `tsconfig.base.json` w root, kazda apka extends z dostosowaniami

**Plan migracji (lazy - rozszerzaj gdy potrzebujesz):**

| Etap | Co                                                                                     | Kiedy                             |
| ---- | -------------------------------------------------------------------------------------- | --------------------------------- |
| 1    | Rename `pos-app` → `formen`, setup pnpm workspaces, move obecny kod do `apps/pos-web/` | Razem z migracja SQLite (ADR-015) |
| 2    | `apps/pos-api/` (per ADR-015)                                                          | Razem z migracja SQLite           |
| 3    | `packages/shared-types/` - wyciagniecie `src/lib/types.ts` jako pakiet                 | Gdy CRM startuje (lazy)           |
| 4    | `packages/ui/` - theme + komponenty                                                    | Gdy CRM zacznie deduplikowac UI   |
| 5    | `apps/crm/`                                                                            | Gdy zaczynasz CRM                 |
| 6    | `apps/marketing/`                                                                      | Gdy zaczynasz marketing           |

**Etapy 3-6 robic dopiero gdy potrzebne** - premature extraction (np. wyciaganie `shared-types` zanim CRM istnieje) tworzy boilerplate bez wartosci. Pierwsza apka moze trzymac typy lokalnie.

**Co NIE jest w scope:**

- Turborepo/Nx - dolacz gdy build time stanie sie problemem (raczej nigdy dla 4 apek)
- Changesets (versioning automation) - dolacz gdy zaczniesz publicznie publikowac paczki npm
- Wsplny lockfile dla wszystkich apek - pnpm robi to automatycznie

**Trigger do zmiany decyzji:**

- Marketing trafia pod zewnetrzny zespol marketingowy → wyciagnij `apps/marketing/` do osobnego repo
- Projekt urosnie do 10+ apek → revisit Turborepo dla cache
- Zechcesz publikowac `@formen/shared-types` jako publiczny npm package → dodaj Changesets
