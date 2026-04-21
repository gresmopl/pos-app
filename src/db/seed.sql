-- ============================================
-- FORMEN POS - Dane testowe (seed)
-- Cel: inicjalizacja bazy Supabase DEV danymi odpowiadajacymi mock-om z Fazy 1
-- Uwaga: admin_pin_hash i pin_hash to tymczasowe placeholdery - docelowo bcrypt/pgcrypto
-- ============================================

-- Czyszczenie istniejacych danych (kolejnosc wazna - FK constraints)
TRUNCATE TABLE tip_withdrawal CASCADE;
TRUNCATE TABLE expense CASCADE;
TRUNCATE TABLE cash_movement CASCADE;
TRUNCATE TABLE transaction_item CASCADE;
TRUNCATE TABLE transaction CASCADE;
TRUNCATE TABLE voucher CASCADE;
TRUNCATE TABLE client CASCADE;
TRUNCATE TABLE device_registration CASCADE;
TRUNCATE TABLE daily_report CASCADE;
TRUNCATE TABLE product CASCADE;
TRUNCATE TABLE service CASCADE;
TRUNCATE TABLE employee CASCADE;
TRUNCATE TABLE salon CASCADE;

-- ============================================
-- STALE UUID (latwiejsze referencje miedzy tabelami)
-- ============================================

-- Salon
-- id: a0000000-0000-0000-0000-000000000001
-- Pracownicy
-- Zbyszek:  e0000000-0000-0000-0000-000000000001
-- Oliwia:   e0000000-0000-0000-0000-000000000002
-- Edi:      e0000000-0000-0000-0000-000000000003
-- Tomek:    e0000000-0000-0000-0000-000000000004
-- Ewelina:  e0000000-0000-0000-0000-000000000005
-- Uslugi:   50000000-0000-0000-0000-00000000000X
-- Produkty: d0000000-0000-0000-0000-00000000000X
-- Transakcje: 10000000-0000-0000-0000-00000000000X
-- Klienci:  c0000000-0000-0000-0000-00000000000X
-- Bony:     b0000000-0000-0000-0000-000000000001

-- ============================================
-- SALON
-- ============================================
INSERT INTO salon (id, name, address, phone, nip, admin_pin_hash, operations_pin_hash,
  cash_tolerance, month_target, voucher_expiry_months, voucher_min_amount, voucher_code_prefix,
  default_commission_service, default_commission_product, receipt_footer)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'FORMEN DEV',
  'ul. Testowa 1, 00-001 Warszawa',
  '+48 123 456 789',
  '1234567890',
  'placeholder_admin_1234',       -- docelowo: crypt('1234', gen_salt('bf'))
  'placeholder_operations_1234',  -- docelowo: crypt('1234', gen_salt('bf'))
  10.00, 600, 12, 1.00, 'BON-',
  40.00, 20.00,
  'Dziękujemy za wizytę w FORMEN!'
);

-- ============================================
-- PRACOWNICY
-- Prowizje: admin 50/30, barber 40/20 (realistyczne stawki barber shop)
-- tip_balance odpowiada mock-om z employees.ts
-- ============================================
INSERT INTO employee (id, salon_id, name, avatar_url, role, pin_hash, commission_service_percent, commission_product_percent, retention_percent, tip_balance)
VALUES
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'Zbyszek', NULL, 'admin', 'placeholder_pin_1234',
   50.00, 30.00, 96.00, 150.00),

  ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
   'Oliwia', NULL, 'barber', NULL,
   40.00, 20.00, 85.00, 85.00),

  ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
   'Edi', NULL, 'barber', NULL,
   40.00, 20.00, 72.00, 40.00),

  ('e0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001',
   'Tomek', NULL, 'barber', NULL,
   40.00, 20.00, 91.00, 25.00),

  ('e0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001',
   'Ewelina', NULL, 'barber', NULL,
   40.00, 20.00, 65.00, 110.00);

-- ============================================
-- USLUGI (z cennika mock - services.ts)
-- ============================================
INSERT INTO service (id, salon_id, name, price, price_from, description, display_order)
VALUES
  ('50000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'Strzyżenie Męskie', 80.00, false,
   'Strzyżenie + mycie + stylizacja, 30-45 min', 10),

  ('50000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
   'Strzyżenie Dziecięce', 75.00, false,
   'Do lat 12, wybrani styliści', 20),

  ('50000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
   'Strzyżenie Męskie + Broda Spa', 140.00, false,
   'Strzyżenie + broda + kompres + golenie brzytwą, 60-70 min', 30),

  ('50000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001',
   'Strzyżenie Ojciec & Syn', 140.00, false,
   'Ojciec + dziecko do lat 12, wspólna wizyta', 40),

  ('50000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001',
   'Strzyżenie brody', 80.00, false,
   'Trimowanie + cieniowanie + kompres + kontur brzytwą', 50),

  ('50000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001',
   'Strzyżenie maszynką + broda maszynką', 110.00, false,
   'Strzyżenie maszynką + broda maszynką, 50 min', 60),

  ('50000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001',
   'Odświeżenie Strzyżenia', 75.00, false,
   'Szybkie wyrównanie fryzury, wybrani fryzjerzy', 70),

  ('50000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001',
   'Combo & Farbowanie brody', 190.00, false,
   'Strzyżenie + stylizacja brody + farbowanie brody, 1h 40min', 80),

  ('50000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001',
   'Tonowanie siwych włosów', 70.00, true,
   'Męski odsiwiacz, ekspresowe pokrycie siwych włosów', 90),

  ('50000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001',
   'Farbowanie brody (beard cover)', 70.00, true,
   'Odświeżenie koloru brody lub ukrycie siwizny', 100),

  ('50000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001',
   'Podgalanie karku brzytwą', 30.00, false,
   'Precyzyjne podgolenie boków i karku brzytwą, 15-20 min', 110);

-- ============================================
-- PRODUKTY (z cennika mock - products.ts)
-- ============================================
INSERT INTO product (id, salon_id, name, price, description)
VALUES
  ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'Pomada Reuzel', 65.00,
   'Pomada wodna Reuzel, średni chwyt, wysoki połysk. Do krótkich i średnich włosów.'),

  ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
   'Olejek do brody', 45.00,
   'Naturalny olejek pielęgnacyjny do brody, nawilża i zmiękcza. Zapach cedrowy.'),

  ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
   'Szampon do brody', 35.00,
   'Delikatny szampon do mycia brody, nie wysusza skóry. 200ml.'),

  ('d0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001',
   'Wosk matowy', 55.00,
   'Wosk do stylizacji, matowe wykończenie, mocny chwyt. Do każdego typu włosów.'),

  ('d0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001',
   'Tonik do włosów', 40.00,
   'Tonik odżywczy wzmacniający cebulki włosów. Codzienna pielęgnacja.');

-- ============================================
-- KLIENCI (kilku przykladowych, odpowiadajacych mock transakcjom)
-- ============================================
INSERT INTO client (id, salon_id, name, phone)
VALUES
  ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'Patryk Fabisiak', '501-100-200'),

  ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
   'Jan Kowalski', '502-300-400'),

  ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
   'Marek Nowak', '503-500-600');

-- ============================================
-- BON PODARUNKOWY (przyklad aktywnego bonu)
-- ============================================
INSERT INTO voucher (id, salon_id, code, initial_value, remaining_balance, status)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001',
   'BON-2026-001', 200.00, 200.00, 'active'),

  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001',
   'BON-2026-002', 100.00, 50.00, 'active'),

  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001',
   'BON-2025-099', 50.00, 0.00, 'used');

-- ============================================
-- TRANSAKCJE (odpowiadajace transactions.ts)
-- Data: dzisiejsza (CURRENT_DATE), godziny jak w mock-ach
-- ============================================

-- T1: Oliwia, Strzyżenie + Broda Spa, 140 zl, napiwek 10 zl, klient: Patryk Fabisiak
INSERT INTO transaction (id, salon_id, employee_id, client_id, date, total_amount, tip_amount, status)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'e0000000-0000-0000-0000-000000000002',
  'c0000000-0000-0000-0000-000000000001',
  CURRENT_DATE + TIME '14:20:00',
  140.00, 10.00, 'completed'
);

INSERT INTO transaction_item (id, transaction_id, type, item_id, name, price_at_sale, quantity, commission_amount)
VALUES (
  'f1000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  'service',
  '50000000-0000-0000-0000-000000000003',
  'Strzyżenie + Broda Spa', 140.00, 1, 56.00  -- 40% prowizja Oliwii
);

-- T2: Tomek, Strzyżenie Męskie + Strzyżenie brody, 150 zl (rabat 10 zl)
INSERT INTO transaction (id, salon_id, employee_id, date, total_amount, tip_amount, discount_type, discount_value, status)
VALUES (
  '10000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'e0000000-0000-0000-0000-000000000004',
  CURRENT_DATE + TIME '13:45:00',
  150.00, 0.00, 'amount', 10.00, 'completed'
);

INSERT INTO transaction_item (id, transaction_id, type, item_id, name, price_at_sale, quantity, commission_amount)
VALUES
  ('f1000000-0000-0000-0000-000000000002',
   '10000000-0000-0000-0000-000000000002',
   'service', '50000000-0000-0000-0000-000000000001',
   'Strzyżenie Męskie', 80.00, 1, 32.00),   -- 40% prowizja Tomka

  ('f1000000-0000-0000-0000-000000000003',
   '10000000-0000-0000-0000-000000000002',
   'service', '50000000-0000-0000-0000-000000000004',
   'Strzyżenie brody', 80.00, 1, 32.00);

-- T3: Zbyszek, Strzyżenie Męskie + Pomada Reuzel, 145 zl, napiwek 15 zl, klient: Jan Kowalski
INSERT INTO transaction (id, salon_id, employee_id, client_id, date, total_amount, tip_amount, status)
VALUES (
  '10000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'e0000000-0000-0000-0000-000000000001',
  'c0000000-0000-0000-0000-000000000002',
  CURRENT_DATE + TIME '13:10:00',
  145.00, 15.00, 'completed'
);

INSERT INTO transaction_item (id, transaction_id, type, item_id, name, price_at_sale, quantity, commission_amount)
VALUES
  ('f1000000-0000-0000-0000-000000000004',
   '10000000-0000-0000-0000-000000000003',
   'service', '50000000-0000-0000-0000-000000000001',
   'Strzyżenie Męskie', 80.00, 1, 40.00),    -- 50% prowizja Zbyszka (admin)

  ('f1000000-0000-0000-0000-000000000005',
   '10000000-0000-0000-0000-000000000003',
   'product', 'd0000000-0000-0000-0000-000000000001',
   'Pomada Reuzel', 65.00, 1, 19.50);         -- 30% prowizja od kosmetykow

-- T4: Ewelina, Combo & Farbowanie brody, 190 zl, napiwek 20 zl
INSERT INTO transaction (id, salon_id, employee_id, date, total_amount, tip_amount, status)
VALUES (
  '10000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000001',
  'e0000000-0000-0000-0000-000000000005',
  CURRENT_DATE + TIME '12:55:00',
  190.00, 20.00, 'completed'
);

INSERT INTO transaction_item (id, transaction_id, type, item_id, name, price_at_sale, quantity, commission_amount)
VALUES (
  'f1000000-0000-0000-0000-000000000006',
  '10000000-0000-0000-0000-000000000004',
  'service', '50000000-0000-0000-0000-000000000008',
  'Combo & Farbowanie brody', 190.00, 1, 76.00  -- 40% prowizja Eweliny
);

-- T5: Zbyszek, Strzyżenie Męskie, 80 zl
INSERT INTO transaction (id, salon_id, employee_id, date, total_amount, tip_amount, status)
VALUES (
  '10000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000001',
  'e0000000-0000-0000-0000-000000000001',
  CURRENT_DATE + TIME '12:20:00',
  80.00, 0.00, 'completed'
);

INSERT INTO transaction_item (id, transaction_id, type, item_id, name, price_at_sale, quantity, commission_amount)
VALUES (
  'f1000000-0000-0000-0000-000000000007',
  '10000000-0000-0000-0000-000000000005',
  'service', '50000000-0000-0000-0000-000000000001',
  'Strzyżenie Męskie', 80.00, 1, 40.00
);

-- T6: Edi, Strzyżenie maszynka + broda + Olejek do brody, 155 zl, napiwek 5 zl, klient: Marek Nowak
INSERT INTO transaction (id, salon_id, employee_id, client_id, date, total_amount, tip_amount, status)
VALUES (
  '10000000-0000-0000-0000-000000000006',
  'a0000000-0000-0000-0000-000000000001',
  'e0000000-0000-0000-0000-000000000003',
  'c0000000-0000-0000-0000-000000000003',
  CURRENT_DATE + TIME '11:40:00',
  155.00, 5.00, 'completed'
);

INSERT INTO transaction_item (id, transaction_id, type, item_id, name, price_at_sale, quantity, commission_amount)
VALUES
  ('f1000000-0000-0000-0000-000000000008',
   '10000000-0000-0000-0000-000000000006',
   'service', '50000000-0000-0000-0000-000000000005',
   'Strzyżenie maszynką + broda maszynką', 110.00, 1, 44.00),  -- 40% Edi

  ('f1000000-0000-0000-0000-000000000009',
   '10000000-0000-0000-0000-000000000006',
   'product', 'd0000000-0000-0000-0000-000000000002',
   'Olejek do brody', 45.00, 1, 9.00);                          -- 20% od kosmetykow

-- T7: Ewelina, Strzyżenie Ojciec & Syn, 140 zl
INSERT INTO transaction (id, salon_id, employee_id, date, total_amount, tip_amount, status)
VALUES (
  '10000000-0000-0000-0000-000000000007',
  'a0000000-0000-0000-0000-000000000001',
  'e0000000-0000-0000-0000-000000000005',
  CURRENT_DATE + TIME '11:00:00',
  140.00, 0.00, 'completed'
);

INSERT INTO transaction_item (id, transaction_id, type, item_id, name, price_at_sale, quantity, commission_amount)
VALUES (
  'f1000000-0000-0000-0000-000000000010',
  '10000000-0000-0000-0000-000000000007',
  'service', '50000000-0000-0000-0000-000000000002',
  'Strzyżenie Ojciec & Syn', 140.00, 1, 56.00
);

-- T8: Oliwia, Odswiezenie Strzyzenia, 75 zl, napiwek 5 zl
INSERT INTO transaction (id, salon_id, employee_id, date, total_amount, tip_amount, status)
VALUES (
  '10000000-0000-0000-0000-000000000008',
  'a0000000-0000-0000-0000-000000000001',
  'e0000000-0000-0000-0000-000000000002',
  CURRENT_DATE + TIME '10:30:00',
  75.00, 5.00, 'completed'
);

INSERT INTO transaction_item (id, transaction_id, type, item_id, name, price_at_sale, quantity, commission_amount)
VALUES (
  'f1000000-0000-0000-0000-000000000011',
  '10000000-0000-0000-0000-000000000008',
  'service', '50000000-0000-0000-0000-000000000006',
  'Odświeżenie Strzyżenia', 75.00, 1, 30.00
);

-- T9: Tomek, Strzyżenie Męskie, 80 zl
INSERT INTO transaction (id, salon_id, employee_id, date, total_amount, tip_amount, status)
VALUES (
  '10000000-0000-0000-0000-000000000009',
  'a0000000-0000-0000-0000-000000000001',
  'e0000000-0000-0000-0000-000000000004',
  CURRENT_DATE + TIME '10:00:00',
  80.00, 0.00, 'completed'
);

INSERT INTO transaction_item (id, transaction_id, type, item_id, name, price_at_sale, quantity, commission_amount)
VALUES (
  'f1000000-0000-0000-0000-000000000012',
  '10000000-0000-0000-0000-000000000009',
  'service', '50000000-0000-0000-0000-000000000001',
  'Strzyżenie Męskie', 80.00, 1, 32.00
);

-- T10: Edi, Strzyżenie + Broda Spa + Wosk matowy, 195 zl
INSERT INTO transaction (id, salon_id, employee_id, date, total_amount, tip_amount, status)
VALUES (
  '10000000-0000-0000-0000-000000000010',
  'a0000000-0000-0000-0000-000000000001',
  'e0000000-0000-0000-0000-000000000003',
  CURRENT_DATE + TIME '09:30:00',
  195.00, 0.00, 'completed'
);

INSERT INTO transaction_item (id, transaction_id, type, item_id, name, price_at_sale, quantity, commission_amount)
VALUES
  ('f1000000-0000-0000-0000-000000000013',
   '10000000-0000-0000-0000-000000000010',
   'service', '50000000-0000-0000-0000-000000000003',
   'Strzyżenie + Broda Spa', 140.00, 1, 56.00),

  ('f1000000-0000-0000-0000-000000000014',
   '10000000-0000-0000-0000-000000000010',
   'product', 'd0000000-0000-0000-0000-000000000004',
   'Wosk matowy', 55.00, 1, 11.00);

-- ============================================
-- RUCHY KASOWE (przykladowe operacje z dzisiejszego dnia)
-- ============================================

-- Zasilenie kasy rano (drobne od szefa)
INSERT INTO cash_movement (id, salon_id, direction, reason, amount, employee_id, description, created_at)
VALUES (
  'f3000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'in', 'top_up', 200.00,
  'e0000000-0000-0000-0000-000000000001',
  'Zasilenie kasy - drobne na start dnia',
  CURRENT_DATE + TIME '08:30:00'
);

-- Wyplata napiwkow - Oliwia wyplacila 50 zl
INSERT INTO cash_movement (id, salon_id, direction, reason, amount, employee_id, description, created_at)
VALUES (
  'f3000000-0000-0000-0000-000000000002',
  'a0000000-0000-0000-0000-000000000001',
  'out', 'tip_withdrawal', 50.00,
  'e0000000-0000-0000-0000-000000000002',
  'Wypłata napiwków - Oliwia',
  CURRENT_DATE + TIME '13:00:00'
);

INSERT INTO tip_withdrawal (id, employee_id, amount, created_at)
VALUES (
  'f4000000-0000-0000-0000-000000000001',
  'e0000000-0000-0000-0000-000000000002',
  50.00,
  CURRENT_DATE + TIME '13:00:00'
);

-- Pobranie na zakupy - Tomek poszedl po srodki czystosci
INSERT INTO cash_movement (id, salon_id, direction, reason, amount, employee_id, description, created_at)
VALUES (
  'f3000000-0000-0000-0000-000000000003',
  'a0000000-0000-0000-0000-000000000001',
  'out', 'expense_take', 100.00,
  'e0000000-0000-0000-0000-000000000004',
  'Pobranie na zakupy - środki czystości',
  CURRENT_DATE + TIME '11:15:00'
);

INSERT INTO expense (id, salon_id, employee_id, initial_amount, description, status, created_at)
VALUES (
  'f5000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'e0000000-0000-0000-0000-000000000004',
  100.00,
  'Środki czystości - Rossmann',
  'pending',
  CURRENT_DATE + TIME '11:15:00'
);

-- Rozliczenie zakupow - Tomek wydal 67 zl, reszta 33 zl wrocila do kasetki
INSERT INTO cash_movement (id, salon_id, direction, reason, amount, employee_id, description, created_at)
VALUES (
  'f3000000-0000-0000-0000-000000000004',
  'a0000000-0000-0000-0000-000000000001',
  'in', 'expense_settle', 33.00,
  'e0000000-0000-0000-0000-000000000004',
  'Rozliczenie zakupów - reszta 33 zł (wydano 67 zł z 100 zł)',
  CURRENT_DATE + TIME '12:00:00'
);

UPDATE expense
SET final_cost = 67.00, status = 'settled', settled_at = CURRENT_DATE + TIME '12:00:00'
WHERE id = 'f5000000-0000-0000-0000-000000000001';

-- Barber loan - Edi wydal reszte z wlasnych (brak drobnych w kasie)
INSERT INTO cash_movement (id, salon_id, direction, reason, amount, employee_id, description, created_at)
VALUES (
  'f3000000-0000-0000-0000-000000000005',
  'a0000000-0000-0000-0000-000000000001',
  'out', 'barber_loan', 20.00,
  'e0000000-0000-0000-0000-000000000003',
  'Edi wydał resztę z własnych - brak drobnych',
  CURRENT_DATE + TIME '10:15:00'
);

-- Zwrot dla Ediego - kasa oddala dlug
INSERT INTO cash_movement (id, salon_id, direction, reason, amount, employee_id, description, created_at)
VALUES (
  'f3000000-0000-0000-0000-000000000006',
  'a0000000-0000-0000-0000-000000000001',
  'out', 'barber_payback', 20.00,
  'e0000000-0000-0000-0000-000000000003',
  'Zwrot dla Ediego za wydaną resztę',
  CURRENT_DATE + TIME '14:00:00'
);

-- Sprzedaz bonu (zarejestrowana jako ruch kasowy + transakcja bonu)
INSERT INTO cash_movement (id, salon_id, direction, reason, amount, description, created_at)
VALUES (
  'f3000000-0000-0000-0000-000000000007',
  'a0000000-0000-0000-0000-000000000001',
  'in', 'voucher_sale', 200.00,
  'Sprzedaż bonu podarunkowego BON-2026-001 (200 zł, gotówka)',
  CURRENT_DATE + TIME '09:00:00'
);

-- ============================================
-- REJESTRACJA URZADZEN (przykladowe urzadzenia)
-- ============================================
INSERT INTO device_registration (id, device_id, salon_id, employee_id, device_type, status, device_name, registered_at, approved_at, last_seen_at)
VALUES
  -- Telefon Zbyszka (admin)
  ('f6000000-0000-0000-0000-000000000001',
   'f7000000-0000-0000-0000-000000000001',
   'a0000000-0000-0000-0000-000000000001',
   'e0000000-0000-0000-0000-000000000001',
   'admin', 'approved', 'Telefon Zbyszka',
   CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE - INTERVAL '30 days',
   CURRENT_DATE + TIME '14:20:00'),

  -- Tablet przy kasie (station)
  ('f6000000-0000-0000-0000-000000000002',
   'f7000000-0000-0000-0000-000000000002',
   'a0000000-0000-0000-0000-000000000001',
   NULL,
   'station', 'approved', 'Kasa główna',
   CURRENT_DATE - INTERVAL '30 days', CURRENT_DATE - INTERVAL '30 days',
   CURRENT_DATE + TIME '14:20:00'),

  -- Telefon Oliwii (personal)
  ('f6000000-0000-0000-0000-000000000003',
   'f7000000-0000-0000-0000-000000000003',
   'a0000000-0000-0000-0000-000000000001',
   'e0000000-0000-0000-0000-000000000002',
   'personal', 'approved', 'Telefon Oliwii',
   CURRENT_DATE - INTERVAL '14 days', CURRENT_DATE - INTERVAL '14 days',
   CURRENT_DATE + TIME '14:20:00'),

  -- Nowy telefon Tomka - oczekuje na zatwierdzenie
  ('f6000000-0000-0000-0000-000000000004',
   'f7000000-0000-0000-0000-000000000004',
   'a0000000-0000-0000-0000-000000000001',
   'e0000000-0000-0000-0000-000000000004',
   'personal', 'pending', 'Telefon Tomka',
   CURRENT_DATE - INTERVAL '1 day', NULL,
   CURRENT_DATE - INTERVAL '1 day');

-- ============================================
-- PODSUMOWANIE
-- ============================================
-- Salon:        1 (FORMEN DEV)
-- Pracownicy:   5 (1 admin + 4 barber)
-- Uslugi:       11
-- Produkty:     5
-- Klienci:      3
-- Bony:         3 (2 aktywne, 1 zuzyte)
-- Transakcje:   10 (dzisiejsze, odpowiadajace mock-om)
-- Ruchy kasowe: 7 (zasilenie, napiwki, zakupy, loan, payback, bon)
-- Urzadzenia:   4 (3 zatwierdzone, 1 oczekujace)
