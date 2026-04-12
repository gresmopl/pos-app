import { useState, useId } from "react";
import { useEmployees } from "@/hooks/useDbData";
import { Text, Box, Container, Divider, SegmentedControl } from "@mantine/core";
import { useMovements } from "@/hooks/useMovements";
import { PageHeader } from "@/components/layout/PageHeader";
import { MovementHistory } from "@/components/cash/MovementHistory";
import { TipTab } from "@/components/cash/TipTab";
import { ExpenseTab } from "@/components/cash/ExpenseTab";
import { TopUpTab } from "@/components/cash/TopUpTab";
import { LoanTab } from "@/components/cash/LoanTab";
import { VoucherTab } from "@/components/cash/VoucherTab";
import { SettleModal } from "@/components/cash/SettleModal";
import { useDeviceRole } from "@/contexts/DeviceContext";

export default function CashPage() {
  const tabsId = useId();
  const [tab, setTab] = useState("tips");

  const {
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
  } = useMovements();

  const { data: employees = [] } = useEmployees();
  const { lockedEmployeeId } = useDeviceRole();

  const employeeOptions = employees.map((e) => ({
    value: e.id,
    label: e.name,
  }));

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
          <TipTab
            employeeOptions={employeeOptions}
            onWithdraw={handleTipWithdrawal}
            lockedEmployeeId={lockedEmployeeId}
          />
        )}

        {tab === "expenses" && (
          <ExpenseTab
            employeeOptions={employeeOptions}
            pendingExpenses={pendingExpenses}
            onTake={handleExpenseTake}
            onSettleClick={openSettleModal}
            lockedEmployeeId={lockedEmployeeId}
          />
        )}

        {tab === "topup" && <TopUpTab onTopUp={handleTopUp} />}

        {tab === "loan" && (
          <LoanTab
            employeeOptions={employeeOptions}
            pendingLoans={pendingLoans}
            onLoan={handleBarberLoan}
            onPayback={handleBarberPayback}
            lockedEmployeeId={lockedEmployeeId}
          />
        )}

        {tab === "voucher" && <VoucherTab onSale={handleVoucherSale} />}

        <MovementHistory movements={movements} />
      </Container>

      <SettleModal
        opened={settleModal}
        onClose={closeSettleModal}
        target={settleTarget}
        settleCost={settleCost}
        setSettleCost={setSettleCost}
        onSettle={handleSettle}
      />
    </Box>
  );
}
