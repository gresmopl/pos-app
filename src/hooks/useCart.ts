import { useState, useMemo, useCallback } from "react";
import type { CartItem, DiscountState } from "@/lib/types";

export function useCart() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [tipAmount, setTipAmount] = useState(0);
  const [discount, setDiscount] = useState<DiscountState | null>(null);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const discountAmount = useMemo(() => {
    if (!discount) return 0;
    if (discount.type === "percent") {
      return Math.round(subtotal * (discount.value / 100) * 100) / 100;
    }
    return Math.min(discount.value, subtotal);
  }, [discount, subtotal]);

  const total = subtotal - discountAmount + tipAmount;

  const itemCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  const addToCart = useCallback(
    (item: { id: string; name: string; price: number }, type: "service" | "product") => {
      setCart((prev) => {
        const existing = prev.find((c) => c.id === item.id && c.type === type);
        if (existing) {
          return prev.map((c) =>
            c.cartId === existing.cartId ? { ...c, quantity: c.quantity + 1 } : c
          );
        }
        return [...prev, { ...item, type, quantity: 1, cartId: crypto.randomUUID() }];
      });
    },
    []
  );

  const updateQuantity = useCallback((cartId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.cartId === cartId ? { ...item, quantity: item.quantity + delta } : item
        )
        .filter((item) => item.quantity > 0)
    );
  }, []);

  const removeFromCart = useCallback((cartId: string) => {
    setCart((prev) => prev.filter((item) => item.cartId !== cartId));
  }, []);

  const resetCart = useCallback(() => {
    setCart([]);
    setTipAmount(0);
    setDiscount(null);
  }, []);

  return {
    cart,
    tipAmount,
    discount,
    subtotal,
    discountAmount,
    total,
    itemCount,
    setTipAmount,
    setDiscount,
    addToCart,
    updateQuantity,
    removeFromCart,
    resetCart,
  };
}
