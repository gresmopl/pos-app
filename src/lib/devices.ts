import type { DeviceRegistration } from "./types";
import { DEVICE_ARCHIVE_INACTIVE_DAYS } from "./constants";

/**
 * Czy urzadzenie mozna zarchiwizowac i czy trzeba przy tym ostrzec szefa.
 *
 * Prog dni jest OSTRZEZENIEM, nie zakazem: zaden prog nie oddzieli urzadzenia
 * testowego od telefonu pracownika na urlopie - roznia sie intencja, nie liczba.
 * Twardo zabronione jest tylko archiwizowanie urzadzenia, na ktorym szef aktualnie
 * pracuje, bo odcialoby go od aplikacji.
 */
export type ArchiveGuard =
  | { allowed: false }
  | { allowed: true; level: "safe" }
  | { allowed: true; level: "warn"; daysSilent: number };

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function checkArchiveGuard(
  device: DeviceRegistration,
  currentDeviceId: string,
  now: Date
): ArchiveGuard {
  if (device.deviceId === currentDeviceId) return { allowed: false };
  if (device.status === "pending") return { allowed: true, level: "safe" };
  if (!device.lastSeenAt) return { allowed: true, level: "safe" };

  const elapsed = now.getTime() - new Date(device.lastSeenAt).getTime();
  const daysSilent = Math.max(0, Math.floor(elapsed / MS_PER_DAY));

  if (daysSilent > DEVICE_ARCHIVE_INACTIVE_DAYS) return { allowed: true, level: "safe" };
  return { allowed: true, level: "warn", daysSilent };
}
