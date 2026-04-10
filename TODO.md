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
- [x] **Plik stalych** - VOUCHER_PRESETS, TIP_PERCENTAGES, PAYMENT_METHODS
- [x] **Wyeliminowane dead code** - nieuzywane importy, zmienne, funkcje

### Do dopracowania w Fazie 1 - ZROBIONE

- [x] **LICENSE** - all rights reserved
- [x] **README.md** - zaktualizowany (Vite, React Router, GitHub Pages, skrypty)
- [x] **Dokumentacja techniczna** - docs/technical.md
- [x] **Dokumentacja analityczna** - docs/analytical.md
- [x] **Walidacja formularzy** - @mantine/form (useForm + getInputProps) w ShiftClose, Cash tabs, AdminPricing

### Opcjonalne (do oceny przy Phase 2)

- [ ] **Custom hooks** - useCart, useMovements itp. (opcjonalne, do oceny przy Phase 2)

## Faza 2 (pelna funkcjonalnosc)

- [ ] Integracja z Supabase (baza danych, auth)
- [ ] Autoryzacja urzadzen (QR pairing, zatwierdzanie, blokowanie)
- [ ] Bony podarunkowe (pelna obsluga z kodem, saldem, realizacja)
- [ ] Wirtualny portfel napiwkow (kumulacja, wyplata, saldo)
- [ ] Katalog Wiedzy (/help) - dynamiczne opisy uslug/produktow z cennika + statyczna instrukcja obslugi
- [ ] Pole description w Service i Product (opcjonalne, widoczne w Admin i /help, nie w POS)
- [ ] Ruchy kasowe (dwuetapowy proces zakupow salonowych)
- [ ] Zamkniecie zmiany (pelna logika z ciagloscia salda miedzy dniami)
- [ ] Multi-salon (RLS, izolacja danych)

## Faza 3 (raporty i finalizacja)

- [ ] Panel admina z raportami miesiecznymi
- [ ] Pasek motywacyjny (algorytmy, targety)
- [ ] Obsluga drukarki USB (kwity, raporty)
- [ ] Eksport CSV/Excel
- [ ] PWA offline fallback (pelna obsluga)
- [ ] Baza klientow (historia wizyt)

## Przyszle usprawnienia

- [ ] CI/CD: lint + testy w GitHub Actions (quality gate)
- [ ] Vitest z pokryciem 80%+
- [ ] Storybook dla komponentow UI
- [ ] Accessibility audit (a11y)
- [ ] Performance audit (Lighthouse)
- [ ] Dokumentacja komponentow
