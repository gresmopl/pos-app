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

**Kontekst:** Projekt potrzebuje trzech srodowisk: mock (testy), Supabase (development), REST API (produkcja MyDevil). Kazde z nich ma inny sposob komunikacji z baza.

**Opcje:**

1. Bezposrednie wywolania Supabase SDK wszedzie, mockowanie w testach
2. Adapter pattern - wspolny interfejs, trzy implementacje

**Decyzja:** Adapter pattern (`src/db/adapters/`)

**Uzasadnienie:**

- Zmiana srodowiska przez jedna zmienna env (`VITE_DB_ADAPTER`)
- Testy nie zaleza od Supabase (adapter mock z danymi in-memory)
- Migracja na MyDevil REST API nie wymaga zmian w komponentach
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
- Prostszy deploy (statyczne pliki na GitHub Pages / MyDevil)
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
- Skalowanie: dodanie salonu = nowy deploy (koszt ~200 zl/rok na MyDevil)

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

## ADR-006: PostgreSQL (Supabase DEV + MyDevil PROD)

**Data:** 2026-04
**Status:** Zaakceptowana

**Kontekst:** Potrzebna baza relacyjna z transakcjami. Development wymaga latwo dostepnej bazy, produkcja - taniej i niezawodnej.

**Opcje:**

1. Supabase (free) na DEV i PROD
2. Supabase DEV + MyDevil PROD
3. Firebase (NoSQL)

**Decyzja:** Supabase DEV (free) + MyDevil PostgreSQL 16 (PROD)

**Uzasadnienie:**

- Supabase free tier wystarczy na development (ograniczenia: pause po 7 dniach, 500 MB)
- MyDevil MD1 (200 zl/rok) - PostgreSQL 16, brak limitow, pelna kontrola
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
