import { dbConfig } from "./config";
import { createMockClient } from "./adapters/mock";
import { createSupabaseClient } from "./adapters/supabase";
import { createRestClient } from "./adapters/rest";
import type { DbClient } from "./types";

function createClient(): DbClient {
  switch (dbConfig.adapter) {
    case "supabase":
      return createSupabaseClient(dbConfig);
    case "rest":
      return createRestClient(dbConfig);
    case "mock":
    default:
      return createMockClient();
  }
}

export const db: DbClient = createClient();
