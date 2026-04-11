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
    salon: {
      async get() {
        return fetchApi(apiUrl, "/api/salon");
      },
      async update(input) {
        const r = await fetch(`${apiUrl}/api/salon`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        if (!r.ok) throw new Error(`API error: ${r.status}`);
        return r.json();
      },
    },
    devices: {
      async getByDeviceId(deviceId: string) {
        const r = await fetch(`${apiUrl}/api/devices?deviceId=${encodeURIComponent(deviceId)}`);
        if (r.status === 404) return null;
        if (!r.ok) throw new Error(`API error: ${r.status}`);
        return r.json();
      },
      async getAll() {
        return fetchApi(apiUrl, "/api/devices");
      },
      async register(input) {
        // Server handles auto-approve logic for first admin device
        const r = await fetch(`${apiUrl}/api/devices`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        if (!r.ok) throw new Error(`API error: ${r.status}`);
        return r.json();
      },
      async approve(id) {
        const r = await fetch(`${apiUrl}/api/devices/${id}/approve`, { method: "POST" });
        if (!r.ok) throw new Error(`API error: ${r.status}`);
      },
      async block(id) {
        const r = await fetch(`${apiUrl}/api/devices/${id}/block`, { method: "POST" });
        if (!r.ok) throw new Error(`API error: ${r.status}`);
      },
      async updateLastSeen(deviceId) {
        const r = await fetch(`${apiUrl}/api/devices/heartbeat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deviceId }),
        });
        if (!r.ok) throw new Error(`API error: ${r.status}`);
      },
    },
    employees: {
      async getAll() {
        return fetchApi(apiUrl, "/api/employees");
      },
      async getActive() {
        return fetchApi(apiUrl, "/api/employees?active=true");
      },
      async getById(id: string) {
        return fetchApi(apiUrl, `/api/employees/${id}`);
      },
      async create(input) {
        const r = await fetch(`${apiUrl}/api/employees`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        if (!r.ok) throw new Error(`API error: ${r.status}`);
        return r.json();
      },
      async update(id, input) {
        const r = await fetch(`${apiUrl}/api/employees/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        if (!r.ok) throw new Error(`API error: ${r.status}`);
        return r.json();
      },
      async toggleActive(id, isActive) {
        const r = await fetch(`${apiUrl}/api/employees/${id}/active`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive }),
        });
        if (!r.ok) throw new Error(`API error: ${r.status}`);
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
      async create(input) {
        const r = await fetch(`${apiUrl}/api/services`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        if (!r.ok) throw new Error(`API error: ${r.status}`);
        return r.json();
      },
      async update(id, input) {
        const r = await fetch(`${apiUrl}/api/services/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        if (!r.ok) throw new Error(`API error: ${r.status}`);
        return r.json();
      },
      async toggleActive(id, isActive) {
        const r = await fetch(`${apiUrl}/api/services/${id}/active`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive }),
        });
        if (!r.ok) throw new Error(`API error: ${r.status}`);
      },
    },
    products: {
      async getAll() {
        return fetchApi(apiUrl, "/api/products");
      },
      async getActive() {
        return fetchApi(apiUrl, "/api/products?active=true");
      },
      async create(input) {
        const r = await fetch(`${apiUrl}/api/products`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        if (!r.ok) throw new Error(`API error: ${r.status}`);
        return r.json();
      },
      async update(id, input) {
        const r = await fetch(`${apiUrl}/api/products/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        if (!r.ok) throw new Error(`API error: ${r.status}`);
        return r.json();
      },
      async toggleActive(id, isActive) {
        const r = await fetch(`${apiUrl}/api/products/${id}/active`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive }),
        });
        if (!r.ok) throw new Error(`API error: ${r.status}`);
      },
    },
    cashMovements: {
      async getToday() {
        return fetchApi(apiUrl, "/api/cash-movements?period=today");
      },
      async getSince(since: string | null) {
        const param = since ? `?since=${encodeURIComponent(since)}` : "";
        return fetchApi(apiUrl, `/api/cash-movements${param}`);
      },
      async create(input) {
        const r = await fetch(`${apiUrl}/api/cash-movements`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        if (!r.ok) throw new Error(`API error: ${r.status}`);
        return r.json();
      },
      async updateStatus(id, status, finalCost) {
        const r = await fetch(`${apiUrl}/api/cash-movements/${id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status, finalCost }),
        });
        if (!r.ok) throw new Error(`API error: ${r.status}`);
      },
    },
    dailyReports: {
      async create(input) {
        const r = await fetch(`${apiUrl}/api/daily-reports`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        if (!r.ok) throw new Error(`API error: ${r.status}`);
      },
      async getToday() {
        const r = await fetch(`${apiUrl}/api/daily-reports/today`);
        if (r.status === 404) return null;
        if (!r.ok) throw new Error(`API error: ${r.status}`);
        return r.json();
      },
      async getLastClosedAt() {
        const r = await fetch(`${apiUrl}/api/daily-reports/last`);
        if (r.status === 404) return null;
        if (!r.ok) throw new Error(`API error: ${r.status}`);
        const data = await r.json();
        return data.closedAt;
      },
      async getLastFloat() {
        const r = await fetch(`${apiUrl}/api/daily-reports/last`);
        if (r.status === 404) return 0;
        if (!r.ok) throw new Error(`API error: ${r.status}`);
        const data = await r.json();
        return data.floatAmount ?? 0;
      },
    },
    vouchers: {
      async getByCode(code: string) {
        const r = await fetch(`${apiUrl}/api/vouchers?code=${encodeURIComponent(code)}`);
        if (r.status === 404) return null;
        if (!r.ok) throw new Error(`API error: ${r.status}`);
        return r.json();
      },
      async redeem(id: string, amount: number) {
        const r = await fetch(`${apiUrl}/api/vouchers/${id}/redeem`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount }),
        });
        if (!r.ok) throw new Error(`API error: ${r.status}`);
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
      async getSince(since: string | null) {
        const param = since ? `?since=${encodeURIComponent(since)}` : "";
        return fetchApi(apiUrl, `/api/transactions${param}`);
      },
      async create(input) {
        const response = await fetch(`${apiUrl}/api/transactions`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        if (!response.ok) throw new Error(`API error: ${response.status}`);
        return response.json();
      },
      async cancel(id) {
        const r = await fetch(`${apiUrl}/api/transactions/${id}/cancel`, { method: "POST" });
        if (!r.ok) throw new Error(`API error: ${r.status}`);
      },
    },
  };
}
