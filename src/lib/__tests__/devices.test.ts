import { describe, it, expect } from "vitest";
import { checkArchiveGuard } from "../devices";
import type { DeviceRegistration } from "../types";

const NOW = new Date("2026-08-10T12:00:00Z");

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

function device(over: Partial<DeviceRegistration> = {}): DeviceRegistration {
  return {
    id: "row-1",
    deviceId: "uuid-1",
    employeeId: null,
    deviceType: "personal",
    status: "approved",
    deviceName: "Telefon",
    registeredAt: daysAgo(200),
    approvedAt: daysAgo(200),
    lastSeenAt: daysAgo(200),
    ...over,
  };
}

describe("checkArchiveGuard", () => {
  it("nie pozwala zarchiwizowac biezacego urzadzenia", () => {
    const d = device({ deviceId: "uuid-mine", lastSeenAt: daysAgo(300) });
    expect(checkArchiveGuard(d, "uuid-mine", NOW)).toEqual({ allowed: false });
  });

  it("ostrzega przy urzadzeniu uzywanym 5 dni temu (Ewela)", () => {
    const d = device({ deviceName: "Ewela", lastSeenAt: daysAgo(5) });
    expect(checkArchiveGuard(d, "uuid-mine", NOW)).toEqual({
      allowed: true,
      level: "warn",
      daysSilent: 5,
    });
  });

  it("ostrzega przy urzadzeniu uzywanym 10 dni temu (TEST33)", () => {
    const d = device({ deviceName: "TEST33", deviceType: "admin", lastSeenAt: daysAgo(10) });
    expect(checkArchiveGuard(d, "uuid-mine", NOW)).toEqual({
      allowed: true,
      level: "warn",
      daysSilent: 10,
    });
  });

  it("granica: dokladnie 30 dni ciszy nadal ostrzega", () => {
    const d = device({ lastSeenAt: daysAgo(30) });
    expect(checkArchiveGuard(d, "uuid-mine", NOW)).toEqual({
      allowed: true,
      level: "warn",
      daysSilent: 30,
    });
  });

  it("granica: 31 dni ciszy jest bezpieczne", () => {
    const d = device({ lastSeenAt: daysAgo(31) });
    expect(checkArchiveGuard(d, "uuid-mine", NOW)).toEqual({ allowed: true, level: "safe" });
  });

  it("stare urzadzenie testowe (110 dni ciszy) jest bezpieczne", () => {
    const d = device({ deviceName: "test16", lastSeenAt: daysAgo(110) });
    expect(checkArchiveGuard(d, "uuid-mine", NOW)).toEqual({ allowed: true, level: "safe" });
  });

  it("zgloszenie oczekujace jest bezpieczne nawet gdy swieze", () => {
    const d = device({ status: "pending", lastSeenAt: daysAgo(1) });
    expect(checkArchiveGuard(d, "uuid-mine", NOW)).toEqual({ allowed: true, level: "safe" });
  });

  it("urzadzenie nigdy nie widziane jest bezpieczne", () => {
    const d = device({ lastSeenAt: null });
    expect(checkArchiveGuard(d, "uuid-mine", NOW)).toEqual({ allowed: true, level: "safe" });
  });

  it("nie pokazuje ujemnej liczby dni przy rozjechanym zegarze", () => {
    const d = device({ lastSeenAt: new Date(NOW.getTime() + 60_000).toISOString() });
    expect(checkArchiveGuard(d, "uuid-mine", NOW)).toEqual({
      allowed: true,
      level: "warn",
      daysSilent: 0,
    });
  });
});
