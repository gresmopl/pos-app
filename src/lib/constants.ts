// Mock PINs - Phase 2: replaced by hashed PINs from Supabase (Salon.admin_pin_hash, Salon.operations_pin_hash)
export const MOCK_ADMIN_PIN = "1234";
export const MOCK_OPERATIONS_PIN = "1234";

// Voucher expiry (months from sale date)
export const VOUCHER_EXPIRY_MONTHS = 12;

// Payment methods
export const PAYMENT_METHODS = ["cash", "card", "blik", "voucher", "split"] as const;

// Service categories
export const SERVICE_CATEGORIES = [
  "Strzyżenie",
  "Broda",
  "Combo",
  "Koloryzacja",
  "Dodatkowe",
] as const;

/**
 * Polish noun declension for counts: 1 usługa, 2 usługi, 5 usług.
 * @param count - number
 * @param one - form for 1 (e.g. "usługa")
 * @param few - form for 2-4 (e.g. "usługi")
 * @param many - form for 0, 5+ (e.g. "usług")
 */
export function pluralize(count: number, one: string, few: string, many: string): string {
  const abs = Math.abs(count);
  if (abs === 1) return `${count} ${one}`;
  const lastTwo = abs % 100;
  const lastOne = abs % 10;
  if (lastTwo >= 10 && lastTwo <= 20) return `${count} ${many}`;
  if (lastOne >= 2 && lastOne <= 4) return `${count} ${few}`;
  return `${count} ${many}`;
}
