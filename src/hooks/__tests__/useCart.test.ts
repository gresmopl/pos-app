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

  it("calculates percent discount", () => {
    const { result } = renderHook(() => useCart());
    act(() => result.current.addToCart({ id: "s1", name: "Strzyżenie", price: 100 }, "service"));
    act(() => result.current.setDiscount({ type: "percent", value: 20 }));
    expect(result.current.discountAmount).toBe(20);
    expect(result.current.total).toBe(80);
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
    act(() => result.current.setDiscount({ type: "percent", value: 10 }));
    act(() => result.current.resetCart());
    expect(result.current.cart).toEqual([]);
    expect(result.current.tipAmount).toBe(0);
    expect(result.current.discount).toBeNull();
    expect(result.current.total).toBe(0);
  });
});
