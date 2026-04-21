export type DbAdapter = "mock" | "supabase" | "rest";
export type DbEnvironment = "development" | "staging" | "production";

export interface DbConfig {
  adapter: DbAdapter;
  environment: DbEnvironment;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  apiUrl?: string;
}

const VALID_ADAPTERS: DbAdapter[] = ["mock", "supabase", "rest"];

function resolveAdapter(): DbAdapter {
  const explicit = import.meta.env.VITE_DB_ADAPTER as string | undefined;
  if (explicit) {
    if (!VALID_ADAPTERS.includes(explicit as DbAdapter)) {
      console.error(`[DbConfig] Invalid VITE_DB_ADAPTER: "${explicit}", falling back to mock`);
      return "mock";
    }
    return explicit as DbAdapter;
  }

  if (import.meta.env.VITE_API_URL) return "rest";
  if (import.meta.env.VITE_SUPABASE_URL) return "supabase";
  return "mock";
}

export function getDbConfig(): DbConfig {
  const adapter = resolveAdapter();
  const environment = (import.meta.env.VITE_DB_ENV as DbEnvironment) || "development";

  return {
    adapter,
    environment,
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    apiUrl: import.meta.env.VITE_API_URL,
  };
}

export const dbConfig = getDbConfig();
