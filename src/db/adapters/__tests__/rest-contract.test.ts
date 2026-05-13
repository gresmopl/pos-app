import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { createRestClient } from "../rest";
import type { DbConfig } from "../../config";

// Kontrakt seamu DbClient: REST backend MUSI zwracac domain shape (camelCase,
// types per @/lib/types). Adapter uzywa `r.json() as Promise<T>` - type assertion,
// nie runtime validation. Te testy fixuja shape ktorego oczekujemy od backendu.
//
// Gdy ten test pada -> albo zmienil sie typ Employee/Service/etc. w @/lib/types
// (i backend Hetzner trzeba zaktualizowac), albo backend zwrocil niewlasciwy
// shape (i to bug po stronie backendu). Patrz ADR-014.

const testConfig: DbConfig = {
  adapter: "rest",
  environment: "development",
  apiUrl: "http://test.local",
};

describe("REST adapter contract", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("employees.getActive zwraca domain shape (camelCase, displayOrder, showRetentionBadge)", async () => {
    const mockEmployee = {
      id: "e1",
      name: "Jan Kowalski",
      avatar: "JA",
      role: "barber",
      tipBalance: 100,
      commissionServicePercent: 40,
      commissionProductPercent: 20,
      retentionPercent: null,
      displayOrder: 0,
      showRetentionBadge: true,
      isActive: true,
    };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => [mockEmployee],
    });

    const client = createRestClient(testConfig);
    const result = await client.employees.getActive();

    expect(result).toHaveLength(1);
    expect(result[0].displayOrder).toBe(0);
    expect(result[0].showRetentionBadge).toBe(true);
    expect(result[0].tipBalance).toBe(100);
    expect(result[0].commissionServicePercent).toBe(40);
  });

  it("services.getActive zwraca domain shape (camelCase, displayOrder)", async () => {
    const mockService = {
      id: "s1",
      name: "Strzyzenie",
      price: 60,
      priceFrom: false,
      description: null,
      displayOrder: 1,
      isActive: true,
    };
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => [mockService],
    });

    const client = createRestClient(testConfig);
    const result = await client.services.getActive();

    expect(result[0].displayOrder).toBe(1);
    expect(result[0].priceFrom).toBe(false);
    expect(result[0].isActive).toBe(true);
  });

  it("rzuca bledem na non-2xx response (pokazuje URL endpointu)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    const client = createRestClient(testConfig);
    await expect(client.employees.getActive()).rejects.toThrow(/500/);
  });
});
