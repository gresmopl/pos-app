import { useState, useCallback, useRef, useEffect } from "react";
import { db } from "@/db";
import type { CashMovement } from "@/lib/types";

export function useMovements() {
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Load today's movements from DB
  useEffect(() => {
    db.cashMovements.getToday().then(setMovements).catch(console.error);
  }, []);

  useEffect(() => {
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, []);

  const [settleModal, setSettleModal] = useState(false);
  const [settleTarget, setSettleTarget] = useState<CashMovement | null>(null);
  const [settleCost, setSettleCost] = useState<number | string>("");

  const pendingExpenses = movements.filter(
    (m) => m.type === "expense_take" && m.status === "pending"
  );

  const showSuccess = useCallback((msg: string) => {
    setSuccessMsg(msg);
    if (successTimer.current) clearTimeout(successTimer.current);
    successTimer.current = setTimeout(() => setSuccessMsg(null), 3000);
  }, []);

  const handleTipWithdrawal = useCallback(
    async (employeeId: string, amount: number) => {
      const movement = await db.cashMovements.create({
        type: "tip_withdrawal",
        employeeId,
        amount,
        description: "Wypłata napiwków",
      });
      setMovements((prev) => [movement, ...prev]);
      showSuccess(`Wypłacono ${amount} zł napiwków dla ${movement.employeeName}`);
    },
    [showSuccess]
  );

  const handleExpenseTake = useCallback(
    async (employeeId: string, amount: number, desc: string) => {
      const movement = await db.cashMovements.create({
        type: "expense_take",
        employeeId,
        amount,
        description: desc || "Zakupy salonowe",
        status: "pending",
      });
      setMovements((prev) => [movement, ...prev]);
      showSuccess(`Pobrano ${amount} zł na zakupy - ${movement.employeeName}`);
    },
    [showSuccess]
  );

  const handleSettle = useCallback(async () => {
    if (!settleTarget) return;
    const cost = Number(settleCost);
    if (cost < 0) return;

    await db.cashMovements.updateStatus(settleTarget.id, "settled", cost);

    const change = settleTarget.amount - cost;

    // Zwrot reszty do kasetki jako osobny ruch
    let settleMovement: CashMovement | null = null;
    if (change > 0) {
      settleMovement = await db.cashMovements.create({
        type: "expense_settle",
        amount: change,
        description: `Zwrot reszty z zakupów (${settleTarget.employeeName}: pobrano ${settleTarget.amount} zł, wydano ${cost} zł)`,
      });
    }

    setMovements((prev) => {
      const updated = prev.map((m) =>
        m.id === settleTarget.id ? { ...m, status: "settled" as const, finalCost: cost } : m
      );
      return settleMovement ? [settleMovement, ...updated] : updated;
    });

    setSettleModal(false);
    setSettleTarget(null);
    setSettleCost("");
    showSuccess(
      change > 0
        ? `Rozliczono: wydano ${cost} zł, zwrot ${change} zł do kasetki`
        : `Rozliczono: wydano ${cost} zł`
    );
  }, [settleTarget, settleCost, showSuccess]);

  const handleOwnCashDeposit = useCallback(
    async (employeeId: string, amount: number) => {
      const movement = await db.cashMovements.create({
        type: "own_cash_deposit",
        employeeId,
        amount,
        description: "Wpłata do kasy (własne pieniądze)",
      });
      setMovements((prev) => [movement, ...prev]);
      showSuccess(
        `Wpłacono ${amount} zł do kasy · ${movement.employeeName} (dopisane do portfela)`
      );
    },
    [showSuccess]
  );

  const handleVoucherSale = useCallback(async (amount: number, code: string) => {
    const movement = await db.cashMovements.create({
      type: "voucher_sale",
      amount,
      description: `Sprzedaż bonu ${code}`,
      voucherCode: code,
    });
    setMovements((prev) => [movement, ...prev]);
  }, []);

  const openSettleModal = useCallback((expense: CashMovement) => {
    setSettleTarget(expense);
    setSettleCost("");
    setSettleModal(true);
  }, []);

  const closeSettleModal = useCallback(() => {
    setSettleModal(false);
  }, []);

  return {
    movements,
    successMsg,
    pendingExpenses,
    settleModal,
    settleTarget,
    settleCost,
    setSettleCost,
    closeSettleModal,
    openSettleModal,
    handleTipWithdrawal,
    handleExpenseTake,
    handleSettle,
    handleOwnCashDeposit,
    handleVoucherSale,
  };
}
