import type { Employee, DailyStats, Service, Product, Transaction } from "@/lib/types";

export interface DbClient {
  employees: {
    getAll(): Promise<Employee[]>;
    getById(id: string): Promise<Employee | undefined>;
  };
  stats: {
    getDaily(): Promise<DailyStats>;
  };
  services: {
    getAll(): Promise<Service[]>;
    getActive(): Promise<Service[]>;
  };
  products: {
    getAll(): Promise<Product[]>;
    getActive(): Promise<Product[]>;
  };
  transactions: {
    getAll(): Promise<Transaction[]>;
    getByEmployee(employeeId: string): Promise<Transaction[]>;
    getToday(): Promise<Transaction[]>;
  };
}
