import { useState, useEffect, useCallback, useRef } from "react";
import { useEmployees } from "@/hooks/useDbData";
import { db } from "@/db";
import { calcExpectedCash, calcSystemCash } from "@/lib/cash";
import type { Transaction, CashMovement, TerminalCheck } from "@/lib/types";
import {
  Text,
  Group,
  Stack,
  Box,
  Container,
  Divider,
  Button,
  UnstyledButton,
} from "@mantine/core";
import {
  IconSearch,
  IconShoppingCart,
  IconCash,
  IconGift,
  IconChevronRight,
  IconReceipt,
} from "@tabler/icons-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { MovementHistory } from "@/components/cash/MovementHistory";
import { SettleModal } from "@/components/cash/SettleModal";
import { TerminalCheckModal } from "@/components/cash/TerminalCheckModal";
import { ExpenseModal } from "@/components/cash/ExpenseModal";
import { DepositModal } from "@/components/cash/DepositModal";
import { VoucherModal } from "@/components/cash/VoucherModal";
import { useDeviceRole } from "@/contexts/DeviceContext";
import { PAGE_BOTTOM_PADDING } from "@/components/layout/BottomNavBar";

function ActionButton({
  icon,
  iconBg,
  title,
  subtitle,
  onClick,
}: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <UnstyledButton
      w="100%"
      py="sm"
      px="md"
      onClick={onClick}
      style={{
        border: "1px solid var(--mantine-color-default-border)",
        borderRadius: "var(--mantine-radius-md)",
      }}
    >
      <Group justify="space-between" wrap="nowrap">
        <Group gap="md" wrap="nowrap">
          <Box
            p={10}
            style={{
              borderRadius: "var(--mantine-radius-md)",
              backgroundColor: iconBg,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {icon}
          </Box>
          <div>
            <Text fw={600} fz="md">
              {title}
            </Text>
            <Text fz="xs" c="dimmed">
              {subtitle}
            </Text>
          </div>
        </Group>
        <IconChevronRight size={20} color="var(--mantine-color-dimmed)" />
      </Group>
    </UnstyledButton>
  );
}

export default function CashPage() {
  const { data: employees = [] } = useEmployees();
  const { lockedEmployeeId } = useDeviceRole();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [terminalChecks, setTerminalChecks] = useState<TerminalCheck[]>([]);

  useEffect(() => {
    async function load(): Promise<void> {
      let since: string | null = null;
      let lastFloat = 0;
      try {
        [since, lastFloat] = await Promise.all([
          db.dailyReports.getLastClosedAt(),
          db.dailyReports.getLastFloat(),
        ]);
      } catch (err) {
        console.error("[Cash] dailyReports load failed, using defaults:", err);
      }
      try {
        const [txs, mvs, tcs] = await Promise.all([
          db.transactions.getSince(since),
          db.cashMovements.getSince(since),
          db.terminalChecks.getSince(since),
        ]);
        setTransactions(txs);
        setMovements(mvs);
        setTerminalChecks(tcs);
      } catch (err) {
        console.error("[Cash] transactions/movements load failed:", err);
      }
      setOpeningBalance(lastFloat);
      setLoading(false);
    }
    load().catch(console.error);
  }, []);

  const systemCash = calcSystemCash(transactions);
  const expectedCash = calcExpectedCash(openingBalance, systemCash, movements);

  const previousTerminalTotal = terminalChecks.reduce((sum, tc) => sum + tc.terminalAmount, 0);

  const currentCashInDrawer = expectedCash - previousTerminalTotal;

  const lastCheck = terminalChecks.length > 0 ? terminalChecks[terminalChecks.length - 1] : null;
  const lastCheckTimestamp = lastCheck ? new Date(lastCheck.createdAt) : null;

  const [activeModal, setActiveModal] = useState<
    "terminal" | "expense" | "deposit" | "voucher" | null
  >(null);

  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const successTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, []);

  const showSuccess = useCallback((msg: string) => {
    setSuccessMsg(msg);
    if (successTimer.current) clearTimeout(successTimer.current);
    successTimer.current = setTimeout(() => setSuccessMsg(null), 3000);
  }, []);

  const [settleModal, setSettleModal] = useState(false);
  const [settleTarget, setSettleTarget] = useState<CashMovement | null>(null);
  const [settleCost, setSettleCost] = useState<number | string>("");

  const pendingExpenses = movements.filter(
    (m) => m.type === "expense_take" && m.status === "pending"
  );

  const employeeOptions = employees.map((e) => ({
    value: e.id,
    label: e.name,
  }));

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
      setActiveModal(null);
      showSuccess(`Pobrano ${amount} zł na zakupy`);
    },
    [showSuccess]
  );

  const handleOwnCashDeposit = useCallback(
    async (employeeId: string, amount: number) => {
      const movement = await db.cashMovements.create({
        type: "own_cash_deposit",
        employeeId,
        amount,
        description: "Wpłata do kasy (własne pieniądze)",
      });
      setMovements((prev) => [movement, ...prev]);
      setActiveModal(null);
      showSuccess(`Wpłacono ${amount} zł do kasy`);
    },
    [showSuccess]
  );

  const handleVoucherSale = useCallback(
    async (amount: number) => {
      const movement = await db.cashMovements.create({
        type: "voucher_sale",
        amount,
        description: `Sprzedaż bonu ${amount} zł`,
      });
      setMovements((prev) => [movement, ...prev]);
      setActiveModal(null);
      showSuccess(`Sprzedano bon na ${amount} zł`);
    },
    [showSuccess]
  );

  const handleSettle = useCallback(async () => {
    if (!settleTarget) return;
    const cost = Number(settleCost);
    if (cost < 0) return;

    await db.cashMovements.updateStatus(settleTarget.id, "settled", cost);

    const change = settleTarget.amount - cost;

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

  return (
    <Box mih="100vh" pb={PAGE_BOTTOM_PADDING}>
      <Container size="lg">
        <PageHeader title="Kasa" hideBack />

        <Divider />

        {/* ===== HERO ===== */}
        <Box
          py="lg"
          px="md"
          my="md"
          style={{
            borderRadius: "var(--mantine-radius-lg)",
            backgroundColor: lastCheck
              ? "var(--mantine-color-green-light)"
              : "var(--mantine-color-gray-light)",
            textAlign: "center",
          }}
        >
          {lastCheck ? (
            <>
              <Text fz="xs" c="dimmed" tt="uppercase" lts={1}>
                Gotówka w kasie
              </Text>
              <Text fw={700} fz={48} c="green" lh={1.1} mt={4}>
                {currentCashInDrawer.toLocaleString("pl-PL")} zł
              </Text>
              <Text fz="xs" c="dimmed" mt={6}>
                ostatni raport z terminala:{" "}
                {lastCheckTimestamp!.toLocaleTimeString("pl-PL", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </>
          ) : (
            <>
              <Text fz="xs" c="dimmed" tt="uppercase" lts={1}>
                GOTÓWKA I PŁATNOŚĆ KARTĄ
              </Text>
              <Text fw={700} fz={48} lh={1.1} mt={4}>
                {loading ? "..." : `${systemCash.toLocaleString("pl-PL")} zł`}
              </Text>
              <Text fz="xs" c="dimmed" mt={6}>
                Zrób raport na terminalu i wpisz kwotę
              </Text>
            </>
          )}
        </Box>

        {successMsg && (
          <Box
            py="sm"
            px="md"
            mb="md"
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

        {/* ===== SPRAWDŹ ===== */}
        <Text fz="xs" c="dimmed" tt="uppercase" lts={1} mb="xs">
          Sprawdź
        </Text>
        <ActionButton
          icon={<IconSearch size={22} color="var(--mantine-color-blue-filled)" />}
          iconBg="var(--mantine-color-blue-light)"
          title="Stan kasy"
          subtitle="Zrób raport na terminalu i wpisz kwotę"
          onClick={() => setActiveModal("terminal")}
        />

        {/* ===== DODATKOWE OPERACJE ===== */}
        <Text fz="xs" c="dimmed" tt="uppercase" lts={1} mt="md" mb="xs">
          Dodatkowe operacje
        </Text>
        <Stack gap="sm">
          <ActionButton
            icon={<IconShoppingCart size={22} color="var(--mantine-color-yellow-filled)" />}
            iconBg="var(--mantine-color-yellow-light)"
            title="Pobranie na zakupy"
            subtitle="Kawa, środki czystości itp."
            onClick={() => setActiveModal("expense")}
          />
          <ActionButton
            icon={<IconCash size={22} color="var(--mantine-color-green-filled)" />}
            iconBg="var(--mantine-color-green-light)"
            title="Wpłata własna"
            subtitle="Wpłata z własnych pieniędzy do kasy"
            onClick={() => setActiveModal("deposit")}
          />
          <ActionButton
            icon={<IconGift size={22} color="var(--mantine-color-pink-filled)" />}
            iconBg="var(--mantine-color-pink-light)"
            title="Sprzedaj bon"
            subtitle="Bon podarunkowy (bez prowizji)"
            onClick={() => setActiveModal("voucher")}
          />
        </Stack>

        {/* ===== PENDING EXPENSES ===== */}
        {pendingExpenses.length > 0 && (
          <>
            <Text fz="xs" c="dimmed" tt="uppercase" lts={1} mt="md" mb="xs">
              Do rozliczenia
            </Text>
            <Stack gap={0}>
              {pendingExpenses.map((exp, index) => (
                <div key={exp.id}>
                  <Group justify="space-between" py="sm" px="xs">
                    <div>
                      <Text fw={500} fz="md">
                        {exp.description}
                      </Text>
                      <Text fz="xs" c="dimmed">
                        {exp.employeeName} · Pobrano {exp.amount.toLocaleString("pl-PL")} zł
                      </Text>
                    </div>
                    <Button
                      variant="light"
                      size="md"
                      onClick={() => {
                        setSettleTarget(exp);
                        setSettleCost("");
                        setSettleModal(true);
                      }}
                      leftSection={<IconReceipt size={16} />}
                    >
                      Rozlicz
                    </Button>
                  </Group>
                  {index < pendingExpenses.length - 1 && <Divider />}
                </div>
              ))}
            </Stack>
          </>
        )}

        {/* ===== MOVEMENT HISTORY ===== */}
        <MovementHistory movements={movements} terminalChecks={terminalChecks} />
      </Container>

      {/* ===== TERMINAL CHECK MODAL ===== */}
      <TerminalCheckModal
        opened={activeModal === "terminal"}
        onClose={() => setActiveModal(null)}
        expectedCash={expectedCash}
        previousTerminalTotal={previousTerminalTotal}
        onConfirm={async (cashAmount, terminalAmount) => {
          try {
            const check = await db.terminalChecks.create({
              terminalAmount,
              expectedCash,
              calculatedCash: cashAmount,
              txCount: transactions.length,
            });
            setTerminalChecks((prev) => [...prev, check]);
          } catch (err) {
            console.error("[Cash] terminal check save failed:", err);
          }
        }}
      />

      {/* ===== EXPENSE MODAL ===== */}
      <ExpenseModal
        opened={activeModal === "expense"}
        onClose={() => setActiveModal(null)}
        employeeOptions={employeeOptions}
        lockedEmployeeId={lockedEmployeeId}
        onTake={handleExpenseTake}
      />

      {/* ===== DEPOSIT MODAL ===== */}
      <DepositModal
        opened={activeModal === "deposit"}
        onClose={() => setActiveModal(null)}
        employeeOptions={employeeOptions}
        lockedEmployeeId={lockedEmployeeId}
        onDeposit={handleOwnCashDeposit}
      />

      {/* ===== VOUCHER MODAL ===== */}
      <VoucherModal
        opened={activeModal === "voucher"}
        onClose={() => setActiveModal(null)}
        onSale={handleVoucherSale}
      />

      {/* ===== SETTLE MODAL ===== */}
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

