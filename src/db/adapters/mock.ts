import { mockEmployees, mockStats } from "@/data/employees";
import { mockServices } from "@/data/services";
import { mockProducts } from "@/data/products";
import { mockTransactions } from "@/data/transactions";
import type { DbClient } from "../types";

export function createMockClient(): DbClient {
  return {
    employees: {
      async getAll() {
        return mockEmployees;
      },
      async getById(id: string) {
        return mockEmployees.find((e) => e.id === id);
      },
    },
    stats: {
      async getDaily() {
        return mockStats;
      },
    },
    services: {
      async getAll() {
        return mockServices;
      },
      async getActive() {
        return mockServices.filter((s) => s.isActive);
      },
    },
    products: {
      async getAll() {
        return mockProducts;
      },
      async getActive() {
        return mockProducts.filter((p) => p.isActive);
      },
    },
    transactions: {
      async getAll() {
        return mockTransactions;
      },
      async getByEmployee(employeeId: string) {
        return mockTransactions.filter((t) => t.employeeId === employeeId);
      },
      async getToday() {
        const today = new Date().toDateString();
        return mockTransactions.filter((t) => new Date(t.timestamp).toDateString() === today);
      },
    },
  };
}
