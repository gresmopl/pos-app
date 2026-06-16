// Jednorazowy audyt dryfu schematu: schema.sql vs zywa baza (PostgREST OpenAPI).
// Uruchom: node scripts/schema-drift-audit.mjs
import { readFileSync } from "node:fs";

// Dane logowania czytane z .env.development (lub z env procesu) - bez hardkodu.
// Klucz anon jest publiczny (trafia do bundla przegladarki), ale nie trzymamy go w zrodle.
function readEnv(name) {
  if (process.env[name]) return process.env[name];
  try {
    const env = readFileSync(".env.development", "utf8");
    const line = env.split("\n").find((l) => l.startsWith(`${name}=`));
    if (line) return line.slice(name.length + 1).trim();
  } catch {
    /* brak pliku */
  }
  return undefined;
}

const URL = readEnv("VITE_SUPABASE_URL");
const KEY = readEnv("VITE_SUPABASE_ANON_KEY");
if (!URL || !KEY) {
  console.error("Brak VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (env lub .env.development)");
  process.exit(1);
}

// --- 1. Parsuj schema.sql -> { table: Set(columns) }
const sql = readFileSync("src/db/schema.sql", "utf8");
const declared = {};
const tableRe = /CREATE TABLE (\w+)\s*\(([\s\S]*?)\n\);/g;
let m;
while ((m = tableRe.exec(sql))) {
  const [, table, body] = m;
  const cols = new Set();
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("--")) continue;
    const first = line.split(/\s+/)[0].toLowerCase();
    // pomijaj linie ograniczen
    if (["primary", "foreign", "unique", "check", "constraint", "references"].includes(first))
      continue;
    if (/^[a-z_]+$/.test(first)) cols.add(first);
  }
  declared[table] = cols;
}

// --- 2. Pobierz realne kolumny per tabela (GET select=*&limit=1 -> klucze wiersza)
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const live = {};
const empty = [];
for (const table of Object.keys(declared)) {
  const res = await fetch(`${URL}/rest/v1/${table}?select=*&limit=1`, { headers });
  if (!res.ok) {
    live[table] = null; // brak dostepu / brak tabeli
    continue;
  }
  const rows = await res.json();
  if (Array.isArray(rows) && rows.length > 0) {
    live[table] = new Set(Object.keys(rows[0]));
  } else {
    live[table] = "EMPTY"; // pusta tabela - nie zweryfikujemy kolumn z danych
    empty.push(table);
  }
}

// --- 3. Diff
let problems = 0;
for (const table of Object.keys(declared).sort()) {
  const l = live[table];
  if (l === null) {
    console.log(`\n[BRAK DOSTEPU / TABELI] ${table}`);
    problems++;
    continue;
  }
  if (l === "EMPTY") continue; // raport ponizej
  const missing = [...declared[table]].filter((c) => !l.has(c));
  const extra = [...l].filter((c) => !declared[table].has(c));
  if (missing.length || extra.length) {
    console.log(`\n## ${table}`);
    if (missing.length) {
      console.log(`  !! BRAK w bazie (RYZYKO ZAPISU): ${missing.join(", ")}`);
      problems += missing.length;
    }
    if (extra.length) console.log(`  legacy (w bazie, brak w schema): ${extra.join(", ")}`);
  } else {
    console.log(`OK  ${table} (${l.size} kolumn)`);
  }
}
if (empty.length) console.log(`\nPUSTE (brak danych, nie sprawdzono z danych): ${empty.join(", ")}`);
console.log(`\n=== Tabele: ${Object.keys(declared).length}, problemy: ${problems}, puste: ${empty.length} ===`);
