import { useState, useId } from "react";
import { mockEmployees } from "@/data/employees";
import { Text, Box, Container, Divider, SegmentedControl } from "@mantine/core";
import type { CashMovement } from "@/lib/types";
import { PageHeader } from "@/components/layout/PageHeader";
import { MovementHistory } from "@/components/cash/MovementHistory";
import { TipTab } from "@/components/cash/TipTab";
import { ExpenseTab } from "@/components/cash/ExpenseTab";
import { TopUpTab } from "@/components/cash/TopUpTab";
import { LoanTab } from "@/components/cash/LoanTab";
import { VoucherTab } from "@/components/cash/VoucherTab";
import { SettleModal } from "@/components/cash/SettleModal";

export default function CashPage() {
  const tabsId = useId();
  const [tab, setTab] = useState("tips");

  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Settle modal
  const [settleModal, setSettleModal] = useState(false);
  const [settleTarget, setSettleTarget] = useState<CashMovement | null>(null);
  const [settleCost, setSettleCost] = useState<number | string>("");

  const employeeOptions = mockEmployees.map((e) => ({
    value: e.id,
    label: e.name,
  }));

  const pendingExpenses = movements.filter(
    (m) => m.type === "expense_take" && m.status === "pending"
  );

  const pendingLoans = movements.filter((m) => m.type === "barber_loan" && m.status === "pending");

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleTipWithdrawal = (employeeId: string, amount: number) => {
    const emp = mockEmployees.find((e) => e.id === employeeId);
    if (!emp) return;

    setMovements((prev) => [
      {
        id: `cm${Date.now()}`,
        type: "tip_withdrawal",
        employeeName: emp.name,
        amount,
        description: "Wypłata napiwków",
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);
    showSuccess(`Wypłacono ${amount} zł napiwków dla ${emp.name}`);
  };

  const handleExpenseTake = (employeeId: string, amount: number, desc: string) => {
    const emp = mockEmployees.find((e) => e.id === employeeId);
    if (!emp) return;

    setMovements((prev) => [
      {
        id: `cm${Date.now()}`,
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
  };

  const handleSettle = () => {
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
  };

  const handleTopUp = (amount: number, reason: string) => {
    setMovements((prev) => [
      {
        id: `cm${Date.now()}`,
        type: "top_up",
        employeeName: "Szef",
        amount,
        description: reason,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);
    showSuccess(`Wpłacono ${amount} zł do kasy`);
  };

  const handleBarberLoan = (employeeId: string, amount: number) => {
    const emp = mockEmployees.find((e) => e.id === employeeId);
    if (!emp) return;

    setMovements((prev) => [
      {
        id: `cm${Date.now()}`,
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
  };

  const handleBarberPayback = (loan: CashMovement) => {
    setMovements((prev) => [
      {
        id: `cm${Date.now()}`,
        type: "barber_payback" as const,
        employeeName: loan.employeeName,
        amount: loan.amount,
        description: `Zwrot za resztę dla ${loan.employeeName}`,
        timestamp: new Date().toISOString(),
      },
      ...prev.map((m) => (m.id === loan.id ? { ...m, status: "settled" as const } : m)),
    ]);
    showSuccess(`Zwrócono ${loan.amount} zł dla ${loan.employeeName}`);
  };

  const handleVoucherSale = (amount: number, payment: string, code: string) => {
    setMovements((prev) => [
      {
        id: `cm${Date.now()}`,
        type: "voucher_sale",
        employeeName: "Salon",
        amount,
        description: `Sprzedaż bonu ${code} (${payment === "cash" ? "gotówka" : "karta"})`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);
  };

  const openSettleModal = (expense: CashMovement) => {
    setSettleTarget(expense);
    setSettleCost("");
    setSettleModal(true);
  };

  return (
    <Box mih="100vh" pb={40}>
      <Container size="lg">
        <PageHeader title="Ruchy kasowe" />

        <Divider />

        <Box py="md">
          <SegmentedControl
            id={tabsId}
            fullWidth
            value={tab}
            onChange={setTab}
            size="xs"
            data={[
              { label: "Napiwki", value: "tips" },
              { label: "Zakupy", value: "expenses" },
              { label: "Wpłata", value: "topup" },
              { label: "Zwrot", value: "loan" },
              { label: "Bon", value: "voucher" },
            ]}
          />
        </Box>

        <Divider />

        {successMsg && (
          <Box
            py="sm"
            px="md"
            my="md"
            style={{
              borderRadius: "var(--mantine-radius-md)",
              border: "1px solid var(--mantine-color-green-light-color)",
              backgroundColor: "var(--mantine-color-green-light)",
            }}
          >
            <Text fz="sm" c="green" fw={500}>
              {successMsg}
            </Text>
          </Box>
        )}

        {tab === "tips" && (
          <TipTab employeeOptions={employeeOptions} onWithdraw={handleTipWithdrawal} />
        )}

        {tab === "expenses" && (
          <ExpenseTab
            employeeOptions={employeeOptions}
            pendingExpenses={pendingExpenses}
            onTake={handleExpenseTake}
            onSettleClick={openSettleModal}
          />
        )}

        {tab === "topup" && <TopUpTab onTopUp={handleTopUp} />}

        {tab === "loan" && (
          <LoanTab
            employeeOptions={employeeOptions}
            pendingLoans={pendingLoans}
            onLoan={handleBarberLoan}
            onPayback={handleBarberPayback}
          />
        )}

        {tab === "voucher" && <VoucherTab onSale={handleVoucherSale} />}

        <MovementHistory movements={movements} />
      </Container>

      <SettleModal
        opened={settleModal}
        onClose={() => setSettleModal(false)}
        target={settleTarget}
        settleCost={settleCost}
        setSettleCost={setSettleCost}
        onSettle={handleSettle}
      />
    </Box>
  );
}
