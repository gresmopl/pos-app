-- =====================================================================
-- Masowa archiwizacja urzadzen nieuzywanych od ponad 30 dni
-- =====================================================================
--
-- Odpowiednik przycisku "Archiwizuj" z /admin/devices, wykonany hurtem.
-- Ustawia status='blocked' RAZEM z is_active=false - tak samo jak
-- db.devices.archive() w src/db/adapters/supabase.ts.
--
-- DLACZEGO OBA POLA: getByDeviceId() nie filtruje po is_active, wiec sam
-- is_active=false ukrylby urzadzenie przed szefem, ale zostawil mu dostep
-- do aplikacji. Zmiana statusu odbiera dostep (DeviceGate -> BlockedScreen).
--
-- BEZPIECZENSTWO: urzadzenie z cisza > 30 dni z definicji nie jest tym,
-- na ktorym szef akurat pracuje (to bylo widziane dzis), wiec skrypt nie
-- moze odciac go od aplikacji.
--
-- SKUTEK DLA PRACOWNIKOW: jesli ktos wroci do zarchiwizowanego telefonu,
-- zobaczy ekran "Urzadzenie zablokowane". Zeby go wpuscic: /admin/devices
-- -> sekcja "Archiwum" -> "Przywroc" -> potem "Odblokuj".
--
-- Uruchamiac w Supabase -> SQL Editor, krok po kroku, w kolejnosci.
-- =====================================================================


-- ---------------------------------------------------------------------
-- KROK 0: kopia zapasowa (ubezpieczenie na wypadek pomylki)
-- ---------------------------------------------------------------------
-- Zapisuje status i is_active WSZYSTKICH urzadzen sprzed zmiany.
-- Bez tego nie da sie precyzyjnie cofnac operacji.

create table if not exists device_registration_backup_20260810 as
select id, device_name, status, is_active, now() as backup_at
from device_registration;

-- sprawdzenie, ze kopia powstala (powinno byc tyle, ile masz urzadzen):
select count(*) as zapisano_w_kopii from device_registration_backup_20260810;


-- ---------------------------------------------------------------------
-- KROK 1: PROBA NA SUCHO - co dokladnie zostanie zarchiwizowane
-- ---------------------------------------------------------------------
-- NICZEGO NIE ZMIENIA. Przeczytaj liste i upewnij sie, ze nie ma tam
-- urzadzenia, ktore nadal jest w uzyciu.

select
  device_name,
  device_type,
  status                              as status_teraz,
  last_seen_at::date                  as ostatnio_widziane,
  (now()::date - last_seen_at::date)  as dni_ciszy
from device_registration
where is_active = true
  and (last_seen_at is null or last_seen_at < now() - interval '30 days')
order by last_seen_at asc nulls first;

-- a to zostanie NA LISCIE (kontrola: same urzadzenia realnie uzywane):
select
  device_name,
  device_type,
  (now()::date - last_seen_at::date) as dni_ciszy
from device_registration
where is_active = true
  and last_seen_at >= now() - interval '30 days'
order by last_seen_at desc;


-- ---------------------------------------------------------------------
-- KROK 2: WLASCIWA ARCHIWIZACJA
-- ---------------------------------------------------------------------
-- Uruchom dopiero gdy lista z KROKU 1 wyglada dobrze.
-- RETURNING pokaze dokladnie te wiersze, ktore zostaly zmienione.

update device_registration
set status = 'blocked',
    is_active = false
where is_active = true
  and (last_seen_at is null or last_seen_at < now() - interval '30 days')
returning device_name, status, is_active;


-- ---------------------------------------------------------------------
-- KROK 3: WERYFIKACJA
-- ---------------------------------------------------------------------
-- Oczekiwane: wiersz "is_active=false" to archiwum (niewidoczne w apce),
-- wiersze "is_active=true" to lista, ktora zobaczysz w /admin/devices.

select
  status,
  is_active,
  count(*) as ile
from device_registration
group by status, is_active
order by is_active desc, status;


-- =====================================================================
-- COFNIECIE (tylko jesli cos poszlo nie tak)
-- =====================================================================
-- Przywraca status i is_active dokladnie takie, jakie byly przed KROKIEM 2.
-- Dziala tylko dopoki tabela kopii istnieje.

-- update device_registration d
-- set status    = b.status,
--     is_active = b.is_active
-- from device_registration_backup_20260810 b
-- where d.id = b.id
--   and (d.status is distinct from b.status
--        or d.is_active is distinct from b.is_active);


-- =====================================================================
-- SPRZATANIE (dopiero gdy jestes pewny wyniku, np. po kilku dniach)
-- =====================================================================

-- drop table device_registration_backup_20260810;
