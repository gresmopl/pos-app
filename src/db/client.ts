import { dbConfig } from "./config";
import { createSupabaseClient } from "./adapters/supabase";
import { createRestClient } from "./adapters/rest";
import type { DbClient } from "./types";

function createClient(): DbClient {
  switch (dbConfig.adapter) {
    case "rest":
      return createRestClient(dbConfig);
    case "supabase":
    default:
      return createSupabaseClient(dbConfig);
  }
}

export const db: DbClient = createClient();
