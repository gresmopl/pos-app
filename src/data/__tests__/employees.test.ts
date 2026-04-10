import { describe, it, expect } from "vitest";
import { mockEmployees, mockStats } from "../employees";

describe("mockEmployees", () => {
  it("should have at least one employee", () => {
    expect(mockEmployees.length).toBeGreaterThan(0);
  });

  it("should have unique IDs", () => {
    const ids = mockEmployees.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("should have valid roles", () => {
    mockEmployees.forEach((e) => {
      expect(["admin", "barber"]).toContain(e.role);
    });
  });

  it("should have at least one admin", () => {
    const admins = mockEmployees.filter((e) => e.role === "admin");
    expect(admins.length).toBeGreaterThan(0);
  });

  it("should have non-negative numeric fields", () => {
    mockEmployees.forEach((e) => {
      expect(e.todayRevenue).toBeGreaterThanOrEqual(0);
      expect(e.todayServices).toBeGreaterThanOrEqual(0);
      expect(e.tipBalance).toBeGreaterThanOrEqual(0);
      expect(e.commissionServicePercent).toBeGreaterThanOrEqual(0);
      expect(e.commissionProductPercent).toBeGreaterThanOrEqual(0);
    });
  });

  it("should have valid status when defined", () => {
    mockEmployees.forEach((e) => {
      if (e.status) {
        expect(["available", "busy", "break"]).toContain(e.status);
      }
    });
  });
});

describe("mockStats", () => {
  it("should have positive service counts", () => {
    expect(mockStats.todayServices).toBeGreaterThanOrEqual(0);
    expect(mockStats.monthServices).toBeGreaterThanOrEqual(0);
    expect(mockStats.yearServices).toBeGreaterThanOrEqual(0);
  });

  it("should have a positive month target", () => {
    expect(mockStats.monthTarget).toBeGreaterThan(0);
  });

  it("should have a positive all-time record", () => {
    expect(mockStats.allTimeRecord).toBeGreaterThan(0);
  });
});
