# TODO - FORMEN POS App

## Przed Faza 2 (jakość kodu i architektura)

### Krytyczne - ZROBIONE

- [x] **Testy** - vitest + @testing-library/react + jsdom (33 testy)
- [x] **Error Boundary** - komponent React do obslugi crashy
- [x] **Strona 404** - Route catch-all dla nieznanych sciezek
- [x] **Centralizacja PIN** - MOCK_ADMIN_PIN, MOCK_OPERATIONS_PIN w src/lib/constants.ts
- [x] **Rozbicie duzych stron** - POS.tsx (948->190) i Cash.tsx (820->230) na komponenty
- [x] **Centralne typy** - src/lib/types.ts (9 typow domenowych)
- [x] **Pre-commit hooks** - husky + lint-staged (Prettier + ESLint --fix)

### Konfiguracja - ZROBIONE

- [x] **.editorconfig** - spojnosc formatowania
- [x] **.nvmrc** - Node 20
- [x] **.env.example** - szablon zmiennych Supabase
- [x] **ESLint rules** - typescript-eslint (no-unused-vars, no-explicit-any, consistent-type-imports)
- [x] **.prettierignore** - dist/, node_modules/, coverage/, .claude/
- [x] **.gitignore** - wyczyszczony z Next.js referencji

### Refactoring - ZROBIONE

- [x] **Wspolny PageHeader** - komponent uzywany w 6 stronach (backTo + rightSection)
- [x] **Wspolny PinModal** - reusable komponent gotowy na Phase 2
- [x] **Plik stalych** - CASH_TOLERANCE, VOUCHER_EXPIRY_MONTHS, PAYMENT_METHODS
- [x] **Wyeliminowane dead code** - nieuzywane importy, zmienne, funkcje

### Do dopracowania w Fazie 1 - ZROBIONE

- [x] **LICENSE** - all rights reserved
- [x] **README.md** - zaktualizowany (Vite, React Router, GitHub Pages, skrypty)
- [x] **Dokumentacja techniczna** - docs/technical.md
- [x] **Dokumentacja analityczna** - docs/analytical.md
- [x] **Walidacja formularzy** - @mantine/form (useForm + getInputProps) w ShiftClose, Cash tabs, AdminPricing

### Opcjonalne (do oceny przy Phase 2)

- [x] **Custom hooks** - useCart, useMovements (zrobione)
- [x] **CI/CD quality gate** - lint + type check + testy w GitHub Actions (zrobione)

### Decyzje szefa (ankieta /admin/survey) - 2026-04-10

**Zrealizowane:**

- [x] Presety napiwkow - usuniete, tylko pole na kwote (decyzja szefa)
- [x] Presety bonow - usuniete, tylko pole na kwote (decyzja szefa)
- [x] Tolerancja kasowa - 10 zl (roznice <= 10 zl pokazywane jako OK)
- [x] Waznosc bonu - 12 miesiecy (expires_at w schema.sql)
- [x] Slepe liczenie - szef chce transparentnosc (widzi kwote systemowa od razu)

**Czeka na realizacje (z odpowiedzi szefa):**

- [x] **Prowizje** - obliczanie przy finalizacji: od pelnej kwoty (split), od kwoty po rabacie
- [ ] **Zdjecie kasetki** - opcjonalny przycisk "Dodaj zdjecie" przy zamknieciu zmiany
- [ ] **Licznik banknotow** - zamiana pola "Gotowka" na grid z nominalami (200/100/50/20/10 zl + monety)

**Do dopytania u szefa:**

- [ ] **Stare bony (sprzed systemu)** - czy sa w obiegu bony papierowe wydane przed wdrozeniem systemu? Jesli tak, prosze opisac: ile ich moze byc, czy maja jakis numer/oznaczenie, czy maja date waznosci, czy wiadomo jakie maja saldo. Opis wlasny szefa (wolne pole - kazdy salon moze miec inny schemat bonow, wazne zeby szef opisal jak to u niego wyglada)
- [ ] **Widocznosc prowizji** - czy prowizja ma byc widoczna tylko w raportach miesiecznych (do wyplaty), czy tez na telefonie danego fryzjera? Czy stawki prowizji sa poufne (ustalane indywidualnie z kazdym pracownikiem)?
- [ ] **Zmiana stawek prowizji w czasie** - czy szef potrzebuje planowac zmiane stawki z wyprzedzeniem (np. "od 1 maja Oliwia 45%")? Jesli tak: osobna tabela harmonogramu czy wystarczy jedno pole "nastepna stawka + data"? Obecnie prowizja brana z biezacej stawki pracownika, zmiana dziala natychmiast
- [ ] **Podsumowanie dnia na email/PDF** - czy szef chce dostawac raport po zamknieciu zmiany na maila bez otwierania systemu?

## Faza 2 (pelna funkcjonalnosc)

**Zrealizowane:**

- [x] Schemat DB PostgreSQL (schema.sql + seed.sql z danymi testowymi)
- [x] Warstwa abstrakcji DB (adaptery: mock / supabase / rest)
- [x] Hooki async: useDbQuery, useEmployees, useServices, useProducts, useTodayTransactions, useDailyStats
- [x] Wszystkie strony podlaczone do warstwy DB (Dashboard, POS, History, Cash, ShiftClose, AdminPricing)
- [x] Zapis transakcji do bazy (transaction + items + payment_detail + tip_balance)
- [x] Pole description + description_long w Service, description w Product
- [x] duration_minutes jako VARCHAR (zakresy "30-45")
- [x] Formularz cennika: nazwa, cena, czas trwania, krotki opis, opis szczegolowy

**Do zrealizowania:**

- [x] Zapis cennika do bazy (CRUD services/products przez adapter)
- [x] Zapis ruchow kasowych do bazy (CashMovement)
- [x] Zapis zamkniecia zmiany do bazy (DailyReport)
- [x] Portfel napiwkow (wyplata z tip_balance, zapis tip_withdrawal)
- [x] Bony podarunkowe (sprzedaz, realizacja z kodem, saldo, waznosc, split z doplata)
- [x] Zamkniecie zmiany - ciaglosc salda (opening balance = float z poprzedniego raportu)
- [ ] Katalog Wiedzy (/help) - dynamiczne opisy uslug/produktow + instrukcja obslugi
- [ ] Autoryzacja urzadzen (QR pairing, zatwierdzanie, blokowanie)
  - Rekomendacja: UUID w localStorage + tabela device w bazie
  - Flow: pierwsze uruchomienie -> generuj UUID -> ekran rejestracji (nazwa, typ) -> zatwierdzenie przez szefa
  - Tabela device: id, salon_id, name, type (personal/station/admin), employee_id, user_agent, screen_width, is_approved, last_seen_at
  - Kazda operacja (transakcja, ruch kasowy) tagowana device_id
  - Ryzyka: czyszczenie localStorage = utrata tozsamosci (ponowna rejestracja)
  - Widoki: personal = tylko swoje dane, station = wszystko, admin = panel szefa
- [ ] Ustawienia salonu w panelu admina (/admin/settings)
  - **Bezpieczenstwo:** PIN admina, PIN operacyjny (obecnie zahardkodowane "1234" w constants.ts)
  - **Kasa:** tolerancja kasowa (obecnie 10 zl), cel miesieczny uslug (obecnie 600)
  - **Bony:** waznosc bonow (obecnie 12 mies.), minimalna kwota bonu, prefiks kodu (obecnie "BON-")
  - **Dane salonu:** nazwa, adres, NIP, telefon - potrzebne do wydruków i naglowkow raportow
  - **Prowizje:** domyslne stawki dla nowych pracownikow (zeby nie wpisywac 40%/20% za kazdym razem)
  - **Platnosci:** wlaczanie/wylaczanie metod platnosci (np. salon nie akceptuje BLIK)
  - **Wydruki:** stopka kwitu ("Dziekujemy za wizyte w FORMEN!")
  - Realizacja: tabela salon_settings (key-value) lub pola w tabeli salon, ladowanie przy starcie aplikacji
- [ ] Zarzadzanie bonami w panelu admina (/admin/vouchers)
  - Lista wszystkich bonow (kod, kwota poczatkowa, saldo, status, data waznosci)
  - Filtr: aktywne / wykorzystane / wygasle
  - Laczna kwota zobowiazan (suma sald aktywnych bonow)
  - Podglad historii uzycia bonu (ktore transakcje, ile pobrano)
  - Przedluzenie waznosci (szef decyduje, np. klient przychodzi z przeterminowanym)
  - Wymaga: db.vouchers.getAll(), updateExpiry() w adapterach
- [ ] Multi-salon (RLS policies, izolacja danych)

## Faza 3 (raporty i finalizacja)

- [ ] Panel admina z raportami miesiecznymi
  - Ranking uslug/produktow (co sie najlepiej sprzedaje)
  - Zestawienie pracownicze (uslugi, kosmetyki, prowizja, napiwki)
  - Podzial na metody platnosci
  - Sumaryczne roznice kasowe z calego miesiaca
- [ ] Pasek motywacyjny (algorytmy, targety)
- [ ] Obsluga drukarki USB (kwity, raporty)
- [ ] Eksport CSV/Excel
- [ ] PWA offline fallback (pelna obsluga)
  - Offline queue - kolejkowanie operacji gdy brak internetu, wysylanie po powrocie polaczenia
- [ ] Baza klientow (historia wizyt)
  - Notatki do transakcji ("klient chce nastepnym razem krotszy fade")
- [ ] Alert o wygasajacych bonach w panelu admina ("3 bony wygasaja w tym miesiacu, laczna kwota 450 zl")
- [x] Cofniecie transakcji z bonem zwraca saldo na bon (zaimplementowane)
- [ ] Audit log operacji administracyjnych - zapis device_id (bez gwarancji unikalnosci urzadzenia)

## AI (Gemini - klucz API w ustawieniach salonu)

Wymagane: klucz Google AI (Gemini) w /admin/settings. Jesli brak klucza - AI features wyszarzone.
Technologia: Gemini Flash (tekst + vision, ~0.30 zl/mln tokenow) + Web Speech API (darmowe, wbudowane w Chrome).

- [ ] **Glosowy POS** - fryzjer mowi "strzyzenie meskie plus broda, napiwek 20, karta", AI tworzy transakcje. Web Speech API (darmowe) + Gemini parsuje intencje. Killer feature - fryzjer ma zajete rece!
- [ ] **Liczenie gotowki ze zdjecia** - zdjecie kasetki przy zamknieciu zmiany, Gemini Vision rozpoznaje banknoty/monety, liczy sume. Pracownik potwierdza lub koryguje
- [ ] **"Zapytaj system"** - szef pisze/mowi "ile Oliwia zarobila w marcu?", AI generuje zapytanie do danych, zwraca odpowiedz. Zastepuje klikanie po raportach
- [ ] **Briefing klienta** - AI generuje podsumowanie przed wizyta: ostatnia usluga, preferencje, notatki, laczne wydatki. Klient czuje ze salon go pamieta
- [ ] **Wykrywanie anomalii** - AI analizuje wzorce: kto daje duzo rabatow, czeste roznice kasowe, nietypowa aktywnosc. Diagnostyka roznic ("47 zl - prawdopodobnie reszta z transakcji #142")
- [ ] **Asystent wiedzy salonowej** - nowy pracownik pyta "jak robimy Brode Spa?", AI odpowiada z katalogu uslug/opisow. Zastepuje statyczny Katalog Wiedzy
- [ ] **Generowanie tresci marketingowych** - AI widzi slaby piatek, proponuje promocje + gotowy post na Instagram. Albo: "klient Anna nie byla 2 mies., wyslac bon?"
- [ ] **Glosowe zamkniecie zmiany** - zamiast formularza: "policzylem 2450 gotowki, 3 bony po 100, drobne 200" - AI wypelnia formularz
- [ ] **Predykcje i planowanie** - "jutro sobota, przewiduje 18 klientow, rekomenduje 4 fryzjerow", "olejek sprzedaje sie 3x szybciej - zamowic?"
- [ ] **OCR paragonu zakupowego** - zdjecie paragonu z zakupow salonowych, AI odczytuje sklep/kwote/pozycje, wypelnia rozliczenie

## Przyszle usprawnienia

- [ ] Sortowanie uslug i produktow w POS wg popularnosci (najczesciej sprzedawane na gorze) - zliczanie z transaction_item, cache dzienne lub przy starcie
- [x] CI/CD: lint + testy w GitHub Actions (quality gate) - zrobione
- [ ] Vitest z pokryciem 80%+
- [ ] Storybook dla komponentow UI
- [ ] Accessibility audit (a11y)
- [ ] Performance audit (Lighthouse)
- [ ] Dokumentacja komponentow
