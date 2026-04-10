export type DbAdapter = "mock" | "supabase" | "rest";
export type DbEnvironment = "development" | "staging" | "production";

export interface DbConfig {
  adapter: DbAdapter;
  environment: DbEnvironment;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  apiUrl?: string;
}

export function getDbConfig(): DbConfig {
  const adapter = (import.meta.env.VITE_DB_ADAPTER as DbAdapter) || "mock";
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
