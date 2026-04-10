import type { DbClient } from "../types";
import type { DbConfig } from "../config";

// Phase 2: Supabase adapter for development database
// Install: npm install @supabase/supabase-js
// Usage: VITE_DB_ADAPTER=supabase in .env.development

export function createSupabaseClient(config: DbConfig): DbClient {
  const { supabaseUrl, supabaseAnonKey } = config;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase URL and Anon Key are required. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
    );
  }

  // const supabase = createClient(supabaseUrl, supabaseAnonKey);

  return {
    employees: {
      async getAll() {
        // const { data } = await supabase.from('employees').select('*').eq('is_active', true);
        // return data ?? [];
        throw new Error("Supabase adapter not implemented yet");
      },
      async getById(id: string) {
        void id;
        throw new Error("Supabase adapter not implemented yet");
      },
    },
    stats: {
      async getDaily() {
        throw new Error("Supabase adapter not implemented yet");
      },
    },
    services: {
      async getAll() {
        throw new Error("Supabase adapter not implemented yet");
      },
      async getActive() {
        throw new Error("Supabase adapter not implemented yet");
      },
    },
    products: {
      async getAll() {
        throw new Error("Supabase adapter not implemented yet");
      },
      async getActive() {
        throw new Error("Supabase adapter not implemented yet");
      },
    },
    transactions: {
      async getAll() {
        throw new Error("Supabase adapter not implemented yet");
      },
      async getByEmployee(_employeeId: string) {
        throw new Error("Supabase adapter not implemented yet");
      },
      async getToday() {
        throw new Error("Supabase adapter not implemented yet");
      },
    },
  };
}
