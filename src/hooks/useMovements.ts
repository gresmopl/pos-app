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

  const pendingLoans = movements.filter((m) => m.type === "barber_loan" && m.status === "pending");

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

  const handleTopUp = useCallback(
    async (amount: number, reason: string) => {
      const movement = await db.cashMovements.create({
        type: "top_up",
        amount,
        description: reason,
      });
      setMovements((prev) => [movement, ...prev]);
      showSuccess(`Wpłacono ${amount} zł do kasy`);
    },
    [showSuccess]
  );

  const handleBarberLoan = useCallback(
    async (employeeId: string, amount: number) => {
      const movement = await db.cashMovements.create({
        type: "barber_loan",
        employeeId,
        amount,
        description: "Wydał z własnych (reszta)",
        status: "pending",
      });
      setMovements((prev) => [movement, ...prev]);
      showSuccess(`Zarejestrowano dług kasetki: ${amount} zł dla ${movement.employeeName}`);
    },
    [showSuccess]
  );

  const handleBarberPayback = useCallback(
    async (loan: CashMovement) => {
      // Mark original loan as settled
      await db.cashMovements.updateStatus(loan.id, "settled");

      // Create payback movement
      const movement = await db.cashMovements.create({
        type: "barber_payback",
        amount: loan.amount,
        description: `Zwrot za resztę dla ${loan.employeeName}`,
      });

      setMovements((prev) => [
        movement,
        ...prev.map((m) => (m.id === loan.id ? { ...m, status: "settled" as const } : m)),
      ]);
      showSuccess(`Zwrócono ${loan.amount} zł dla ${loan.employeeName}`);
    },
    [showSuccess]
  );

  const handleVoucherSale = useCallback(async (amount: number, payment: string, code: string) => {
    const movement = await db.cashMovements.create({
      type: "voucher_sale",
      amount,
      description: `Sprzedaż bonu ${code} (${payment === "cash" ? "gotówka" : "karta"})`,
      voucherCode: code,
      paymentMethod: payment,
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
    pendingLoans,
    settleModal,
    settleTarget,
    settleCost,
    setSettleCost,
    closeSettleModal,
    openSettleModal,
    handleTipWithdrawal,
    handleExpenseTake,
    handleSettle,
    handleTopUp,
    handleBarberLoan,
    handleBarberPayback,
    handleVoucherSale,
  };
}
