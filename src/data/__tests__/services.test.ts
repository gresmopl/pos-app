import { describe, it, expect } from "vitest";
import { mockServices } from "../services";

describe("mockServices", () => {
  it("should have at least one service", () => {
    expect(mockServices.length).toBeGreaterThan(0);
  });

  it("should have unique IDs", () => {
    const ids = mockServices.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("should have positive prices", () => {
    mockServices.forEach((s) => {
      expect(s.price).toBeGreaterThan(0);
    });
  });

  it("should have non-empty names", () => {
    mockServices.forEach((s) => {
      expect(s.name.trim().length).toBeGreaterThan(0);
    });
  });

  it("should have non-empty categories", () => {
    mockServices.forEach((s) => {
      expect(s.category.trim().length).toBeGreaterThan(0);
    });
  });
});
