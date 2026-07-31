import { describe, it, expect, vi } from "vitest";
import { fetchAllPages } from "../pagination";

function makeSource(total: number) {
  return Array.from({ length: total }, (_, i) => ({ id: i }));
}

describe("fetchAllPages", () => {
  it("pobiera wszystkie wiersze gdy jest ich wiecej niz jedna strona (reprodukcja buga: 3028 wierszy, cap 1000)", async () => {
    const source = makeSource(3028);
    const fetchPage = vi.fn(async (from: number, to: number) => ({
      data: source.slice(from, to + 1),
      error: null,
    }));

    const result = await fetchAllPages(fetchPage, 1000);

    expect(result).toHaveLength(3028);
    expect(result[0]).toEqual({ id: 0 });
    expect(result[3027]).toEqual({ id: 3027 });
    expect(fetchPage).toHaveBeenCalledTimes(4);
    expect(fetchPage).toHaveBeenNthCalledWith(1, 0, 999);
    expect(fetchPage).toHaveBeenNthCalledWith(2, 1000, 1999);
    expect(fetchPage).toHaveBeenNthCalledWith(3, 2000, 2999);
    expect(fetchPage).toHaveBeenNthCalledWith(4, 3000, 3999);
  });

  it("zatrzymuje sie po jednej stronie gdy danych jest mniej niz limit", async () => {
    const source = makeSource(30);
    const fetchPage = vi.fn(async (from: number, to: number) => ({
      data: source.slice(from, to + 1),
      error: null,
    }));

    const result = await fetchAllPages(fetchPage, 1000);

    expect(result).toHaveLength(30);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it("obsluguje pusty wynik", async () => {
    const fetchPage = vi.fn(async () => ({ data: [], error: null }));
    const result = await fetchAllPages(fetchPage, 1000);
    expect(result).toEqual([]);
    expect(fetchPage).toHaveBeenCalledTimes(1);
  });

  it("rzuca blad z warstwy Supabase zamiast go polykac", async () => {
    const fetchPage = vi.fn(async () => ({ data: null, error: { message: "boom" } }));
    await expect(fetchAllPages(fetchPage, 1000)).rejects.toEqual({ message: "boom" });
  });
});
