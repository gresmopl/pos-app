import { useState, useCallback, useRef, useEffect } from "react";
import { mockEmployees } from "@/data/employees";
import type { CashMovement } from "@/lib/types";

export function useMovements() {
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

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
    (employeeId: string, amount: number) => {
      const emp = mockEmployees.find((e) => e.id === employeeId);
      if (!emp) return;

      setMovements((prev) => [
        {
          id: crypto.randomUUID(),
          type: "tip_withdrawal",
          employeeName: emp.name,
          amount,
          description: "Wypłata napiwków",
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ]);
      showSuccess(`Wypłacono ${amount} zł napiwków dla ${emp.name}`);
    },
    [showSuccess]
  );

  const handleExpenseTake = useCallback(
    (employeeId: string, amount: number, desc: string) => {
      const emp = mockEmployees.find((e) => e.id === employeeId);
      if (!emp) return;

      setMovements((prev) => [
        {
          id: crypto.randomUUID(),
          type: "expense_take",
          employeeName: emp.name,
          amount,
          description: desc || "Zakupy salonowe",
          timestamp: new Date().toISOString(),
          status: "pending",
        },
        ...prev,
      ]);
      showSuccess(`Pobrano ${amount} zł na zakupy - ${emp.name}`);
    },
    [showSuccess]
  );

  const handleSettle = useCallback(() => {
    if (!settleTarget) return;
    const cost = Number(settleCost);
    if (cost < 0) return;

    setMovements((prev) =>
      prev.map((m) =>
        m.id === settleTarget.id ? { ...m, status: "settled" as const, finalCost: cost } : m
      )
    );

    const change = settleTarget.amount - cost;
    setSettleModal(false);
    setSettleTarget(null);
    setSettleCost("");
    showSuccess(`Rozliczono: wydano ${cost} zł, do zwrotu ${change > 0 ? change : 0} zł`);
  }, [settleTarget, settleCost, showSuccess]);

  const handleTopUp = useCallback(
    (amount: number, reason: string) => {
      setMovements((prev) => [
        {
          id: crypto.randomUUID(),
          type: "top_up",
          employeeName: "Szef",
          amount,
          description: reason,
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ]);
      showSuccess(`Wpłacono ${amount} zł do kasy`);
    },
    [showSuccess]
  );

  const handleBarberLoan = useCallback(
    (employeeId: string, amount: number) => {
      const emp = mockEmployees.find((e) => e.id === employeeId);
      if (!emp) return;

      setMovements((prev) => [
        {
          id: crypto.randomUUID(),
          type: "barber_loan",
          employeeName: emp.name,
          amount,
          description: "Wydał z własnych (reszta)",
          timestamp: new Date().toISOString(),
          status: "pending",
        },
        ...prev,
      ]);
      showSuccess(`Zarejestrowano dług kasetki: ${amount} zł dla ${emp.name}`);
    },
    [showSuccess]
  );

  const handleBarberPayback = useCallback(
    (loan: CashMovement) => {
      setMovements((prev) => [
        {
          id: crypto.randomUUID(),
          type: "barber_payback" as const,
          employeeName: loan.employeeName,
          amount: loan.amount,
          description: `Zwrot za resztę dla ${loan.employeeName}`,
          timestamp: new Date().toISOString(),
        },
        ...prev.map((m) => (m.id === loan.id ? { ...m, status: "settled" as const } : m)),
      ]);
      showSuccess(`Zwrócono ${loan.amount} zł dla ${loan.employeeName}`);
    },
    [showSuccess]
  );

  const handleVoucherSale = useCallback(
    (amount: number, payment: string, code: string) => {
      setMovements((prev) => [
        {
          id: crypto.randomUUID(),
          type: "voucher_sale",
          employeeName: "Salon",
          amount,
          description: `Sprzedaż bonu ${code} (${payment === "cash" ? "gotówka" : "karta"})`,
          timestamp: new Date().toISOString(),
        },
        ...prev,
      ]);
    },
    []
  );

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
