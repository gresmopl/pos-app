import { db } from "@/db";
import { useDbQuery } from "./useDbQuery";

export function useEmployees() {
  return useDbQuery(() => db.employees.getActive());
}

export function useAllEmployees() {
  return useDbQuery(() => db.employees.getAll());
}

export function useServices() {
  return useDbQuery(() => db.services.getActive());
}

export function useAllServices() {
  return useDbQuery(() => db.services.getAll());
}

export function useProducts() {
  return useDbQuery(() => db.products.getActive());
}

export function useAllProducts() {
  return useDbQuery(() => db.products.getAll());
}

export function useDailyStats() {
  return useDbQuery(() => db.stats.getDaily());
}

export function useTodayTransactions() {
  return useDbQuery(() => db.transactions.getToday());
}

export function useAllTransactions() {
  return useDbQuery(() => db.transactions.getAll());
}
