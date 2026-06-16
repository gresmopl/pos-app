-- Migracja: brakujące kolumny progów retencji w tabeli salon
-- Data: 2026-06-16
--
-- Problem: zywa baza (DEV Supabase, i prawdopodobnie PROD) nie ma kolumn
--   retention_threshold_top / high / mid, mimo ze sa w schema.sql.
--   Skutek: zapis ustawien (/admin/settings) zwraca 400 PGRST204
--   ("Could not find the 'retention_threshold_high' column of 'salon'"),
--   bo handleSave PATCH-uje wszystkie pola naraz. Odczyt dziala, bo
--   mapSalon ma fallbacki (95/85/75) - to maskowalo brak kolumn.
--
-- Idempotentne (IF NOT EXISTS) - bezpieczne do wielokrotnego uruchomienia.
-- Uruchom w Supabase SQL Editor (DEV i PROD).

ALTER TABLE salon ADD COLUMN IF NOT EXISTS retention_threshold_top  NUMERIC(5,2) NOT NULL DEFAULT 95;
ALTER TABLE salon ADD COLUMN IF NOT EXISTS retention_threshold_high NUMERIC(5,2) NOT NULL DEFAULT 85;
ALTER TABLE salon ADD COLUMN IF NOT EXISTS retention_threshold_mid  NUMERIC(5,2) NOT NULL DEFAULT 75;

-- Odswiezenie cache schematu PostgREST (Supabase zwykle robi to automatycznie):
NOTIFY pgrst, 'reload schema';
