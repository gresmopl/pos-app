import type { Employee } from "./types";

export function sortEmployees(items: Employee[]): Employee[] {
  return [...items].sort(
    (a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name, "pl")
  );
}
