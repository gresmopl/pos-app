import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCart } from "../useCart";

describe("useCart", () => {
  it("starts with empty cart and zero totals", () => {
    const { result } = renderHook(() => useCart());
    expect(result.current.cart).toEqual([]);
    expect(result.current.subtotal).toBe(0);
    expect(result.current.total).toBe(0);
    expect(result.current.tipAmount).toBe(0);
    expect(result.current.itemCount).toBe(0);
  });

  it("adds item to cart", () => {
    const { result } = renderHook(() => useCart());
    act(() => result.current.addToCart({ id: "s1", name: "Strzyżenie", price: 50 }, "service"));
    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].name).toBe("Strzyżenie");
    expect(result.current.subtotal).toBe(50);
  });

  it("increments quantity for duplicate item", () => {
    const { result } = renderHook(() => useCart());
    act(() => result.current.addToCart({ id: "s1", name: "Strzyżenie", price: 50 }, "service"));
    act(() => result.current.addToCart({ id: "s1", name: "Strzyżenie", price: 50 }, "service"));
    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].quantity).toBe(2);
    expect(result.current.subtotal).toBe(100);
    expect(result.current.itemCount).toBe(2);
  });

  it("updates quantity and removes when zero", () => {
    const { result } = renderHook(() => useCart());
    act(() => result.current.addToCart({ id: "s1", name: "Strzyżenie", price: 50 }, "service"));
    const cartId = result.current.cart[0].cartId;
    act(() => result.current.updateQuantity(cartId, -1));
    expect(result.current.cart).toHaveLength(0);
  });

  it("removes item from cart", () => {
    const { result } = renderHook(() => useCart());
    act(() => result.current.addToCart({ id: "s1", name: "Strzyżenie", price: 50 }, "service"));
    const cartId = result.current.cart[0].cartId;
    act(() => result.current.removeFromCart(cartId));
    expect(result.current.cart).toHaveLength(0);
  });

  it("calculates fixed discount capped at subtotal", () => {
    const { result } = renderHook(() => useCart());
    act(() => result.current.addToCart({ id: "s1", name: "Strzyżenie", price: 50 }, "service"));
    act(() => result.current.setDiscount({ type: "amount", value: 100 }));
    expect(result.current.discountAmount).toBe(50);
    expect(result.current.total).toBe(0);
  });

  it("includes tip in total", () => {
    const { result } = renderHook(() => useCart());
    act(() => result.current.addToCart({ id: "s1", name: "Strzyżenie", price: 50 }, "service"));
    act(() => result.current.setTipAmount(10));
    expect(result.current.total).toBe(60);
  });

  it("resets cart completely", () => {
    const { result } = renderHook(() => useCart());
    act(() => result.current.addToCart({ id: "s1", name: "Strzyżenie", price: 50 }, "service"));
    act(() => result.current.setTipAmount(10));
    act(() => result.current.setDiscount({ type: "amount", value: 10 }));
    act(() => result.current.resetCart());
    expect(result.current.cart).toEqual([]);
    expect(result.current.tipAmount).toBe(0);
    expect(result.current.discount).toBeNull();
    expect(result.current.total).toBe(0);
  });

  it("aktualizuje cene jednostkowa pozycji po updatePrice", () => {
    const { result } = renderHook(() => useCart());
    act(() => result.current.addToCart({ id: "p1", name: "Pomada", price: 50 }, "product"));
    const cartId = result.current.cart[0].cartId;
    act(() => result.current.updatePrice(cartId, 35.5));
    expect(result.current.cart[0].price).toBe(35.5);
    expect(result.current.subtotal).toBe(35.5);
  });

  it("updatePrice z wartoscia ujemna clampuje do 0 (defense-in-depth)", () => {
    const { result } = renderHook(() => useCart());
    act(() => result.current.addToCart({ id: "p1", name: "Pomada", price: 50 }, "product"));
    const cartId = result.current.cart[0].cartId;
    act(() => result.current.updatePrice(cartId, -10));
    expect(result.current.cart[0].price).toBe(0);
  });

  it("updatePrice nie zmienia innych pozycji w koszyku", () => {
    const { result } = renderHook(() => useCart());
    act(() => result.current.addToCart({ id: "p1", name: "Pomada", price: 50 }, "product"));
    act(() => result.current.addToCart({ id: "p2", name: "Szampon", price: 30 }, "product"));
    const cartId = result.current.cart[0].cartId;
    act(() => result.current.updatePrice(cartId, 99));
    expect(result.current.cart[0].price).toBe(99);
    expect(result.current.cart[1].price).toBe(30);
    expect(result.current.subtotal).toBe(129);
  });

  it("invariant: zeruje tipAmount gdy ostatnia usluga znika z koszyka", () => {
    const { result } = renderHook(() => useCart());
    act(() => result.current.addToCart({ id: "s1", name: "Strzyzenie", price: 60 }, "service"));
    act(() => result.current.setTipAmount(20));
    expect(result.current.tipAmount).toBe(20);

    const cartId = result.current.cart[0].cartId;
    act(() => result.current.removeFromCart(cartId));

    expect(result.current.tipAmount).toBe(0);
    expect(result.current.hasService).toBe(false);
  });

  it("invariant: zeruje tipAmount gdy usluga zamieniona na sam produkt", () => {
    const { result } = renderHook(() => useCart());
    act(() => result.current.addToCart({ id: "s1", name: "Strzyzenie", price: 60 }, "service"));
    act(() => result.current.addToCart({ id: "p1", name: "Pomada", price: 30 }, "product"));
    act(() => result.current.setTipAmount(10));
    expect(result.current.tipAmount).toBe(10);

    const serviceCartId = result.current.cart[0].cartId;
    act(() => result.current.removeFromCart(serviceCartId));

    expect(result.current.tipAmount).toBe(0);
    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].type).toBe("product");
  });

  it("invariant: nie rusza tipAmount jesli zostaje przynajmniej jedna usluga", () => {
    const { result } = renderHook(() => useCart());
    act(() => result.current.addToCart({ id: "s1", name: "Strzyzenie", price: 60 }, "service"));
    act(() => result.current.addToCart({ id: "s2", name: "Broda", price: 40 }, "service"));
    act(() => result.current.setTipAmount(15));

    const firstCartId = result.current.cart[0].cartId;
    act(() => result.current.removeFromCart(firstCartId));

    expect(result.current.tipAmount).toBe(15);
    expect(result.current.hasService).toBe(true);
  });

  it("invariant: zeruje discount gdy koszyk staje sie pusty", () => {
    const { result } = renderHook(() => useCart());
    act(() => result.current.addToCart({ id: "s1", name: "Strzyzenie", price: 60 }, "service"));
    act(() => result.current.setDiscount({ type: "amount", value: 10 }));
    expect(result.current.discount).not.toBeNull();

    const cartId = result.current.cart[0].cartId;
    act(() => result.current.removeFromCart(cartId));

    expect(result.current.discount).toBeNull();
    expect(result.current.cart).toEqual([]);
  });
});
