import type { DbClient } from "../types";
import type { DbConfig } from "../config";

// Production: REST API adapter for MyDevil (Node.js + PostgreSQL)
// Usage: VITE_DB_ADAPTER=rest in .env.production

async function fetchApi<T>(apiUrl: string, endpoint: string): Promise<T> {
  const response = await fetch(`${apiUrl}${endpoint}`);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export function createRestClient(config: DbConfig): DbClient {
  const { apiUrl } = config;

  if (!apiUrl) {
    throw new Error("API URL is required. Set VITE_API_URL.");
  }

  return {
    employees: {
      async getAll() {
        return fetchApi(apiUrl, "/api/employees");
      },
      async getById(id: string) {
        return fetchApi(apiUrl, `/api/employees/${id}`);
      },
    },
    stats: {
      async getDaily() {
        return fetchApi(apiUrl, "/api/stats/daily");
      },
    },
    services: {
      async getAll() {
        return fetchApi(apiUrl, "/api/services");
      },
      async getActive() {
        return fetchApi(apiUrl, "/api/services?active=true");
      },
    },
    products: {
      async getAll() {
        return fetchApi(apiUrl, "/api/products");
      },
      async getActive() {
        return fetchApi(apiUrl, "/api/products?active=true");
      },
    },
    transactions: {
      async getAll() {
        return fetchApi(apiUrl, "/api/transactions");
      },
      async getByEmployee(employeeId: string) {
        return fetchApi(apiUrl, `/api/transactions?employeeId=${employeeId}`);
      },
      async getToday() {
        return fetchApi(apiUrl, "/api/transactions?period=today");
      },
    },
  };
}
