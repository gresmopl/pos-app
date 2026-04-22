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
  Modal,
  NumberInput,
  TextInput,
  Select,
  UnstyledButton,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import {
  IconSearch,
  IconShoppingCart,
  IconCash,
  IconGift,
  IconChevronRight,
  IconReceipt,
} from "@tabler/icons-react";
import { pluralize } from "@/lib/constants";
import { PageHeader } from "@/components/layout/PageHeader";
import { MovementHistory } from "@/components/cash/MovementHistory";
import { SettleModal } from "@/components/cash/SettleModal";
import { useDeviceRole } from "@/contexts/DeviceContext";
import { BOTTOM_NAV_HEIGHT } from "@/components/layout/BottomNavBar";

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

  const lastCheck = terminalChecks.length > 0 ? terminalChecks[terminalChecks.length - 1] : null;
  const terminalCheck = lastCheck
    ? {
        timestamp: new Date(lastCheck.createdAt),
        cashAmount: lastCheck.calculatedCash,
        txCountAtCheck: lastCheck.txCount,
      }
    : null;

  const txSinceCheck = terminalCheck ? transactions.length - terminalCheck.txCountAtCheck : 0;
  const cashSinceCheck = terminalCheck
    ? transactions.slice(terminalCheck.txCountAtCheck).reduce((sum, tx) => sum + tx.totalAmount, 0)
    : 0;

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
    <Box mih="100vh" pb={BOTTOM_NAV_HEIGHT + 16}>
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
            backgroundColor: terminalCheck
              ? "var(--mantine-color-green-light)"
              : "var(--mantine-color-gray-light)",
            textAlign: "center",
          }}
        >
          {terminalCheck ? (
            <>
              <Text fz="xs" c="dimmed" tt="uppercase" lts={1}>
                Gotówka w kasie
              </Text>
              <Text fw={700} fz={48} c="green" lh={1.1} mt={4}>
                {terminalCheck.cashAmount.toLocaleString("pl-PL")} zł
              </Text>
              <Text fz="xs" c="dimmed" mt={6}>
                stan na{" "}
                {terminalCheck.timestamp.toLocaleTimeString("pl-PL", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                (po raporcie terminala)
              </Text>
              {txSinceCheck > 0 && (
                <Text fz="xs" c="yellow" fw={500} mt={2}>
                  +{txSinceCheck}{" "}
                  {pluralize(txSinceCheck, "transakcja", "transakcje", "transakcji")} od sprawdzenia
                  ({cashSinceCheck.toLocaleString("pl-PL")} zł)
                </Text>
              )}
            </>
          ) : (
            <>
              <Text fz="xs" c="dimmed" tt="uppercase" lts={1}>
                Sprzedaż w tej zmianie
              </Text>
              <Text fw={700} fz={48} lh={1.1} mt={4}>
                {loading ? "..." : `${systemCash.toLocaleString("pl-PL")} zł`}
              </Text>
              <Text fz="xs" c="dimmed" mt={6}>
                Wpisz raport z terminala, aby zobaczyć stan gotówki
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
          title="Sprawdź z terminalem"
          subtitle="Wpisz kwotę z raportu i zobacz różnicę"
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
            title="Wpłata drobnych"
            subtitle="Wpłata z własnych pieniędzy"
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

// ─── Terminal Check Modal ─────────────────────────────────────────

function TerminalCheckModal({
  opened,
  onClose,
  expectedCash,
  onConfirm,
}: {
  opened: boolean;
  onClose: () => void;
  expectedCash: number;
  onConfirm: (cashAmount: number, terminalAmount: number) => void;
}) {
  const [terminalAmount, setTerminalAmount] = useState<number | string>("");
  const [checked, setChecked] = useState(false);

  const amount = Number(terminalAmount) || 0;
  const cashInDrawer = expectedCash - amount;

  const handleCheck = () => {
    setChecked(true);
    onConfirm(cashInDrawer, amount);
  };

  const handleClose = () => {
    setTerminalAmount("");
    setChecked(false);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Text fw={700} fz="lg">
          Sprawdź kasę
        </Text>
      }
      size="sm"
    >
      <Stack gap="md">
        <Box
          p="md"
          style={{
            borderRadius: "var(--mantine-radius-md)",
            backgroundColor: "var(--mantine-color-gray-light)",
          }}
        >
          <Text fz="xs" c="dimmed">
            Utarg dziś (system)
          </Text>
          <Text fw={700} fz="xl">
            {expectedCash.toLocaleString("pl-PL")} zł
          </Text>
        </Box>

        <NumberInput
          label="Suma z raportu terminala (karty)"
          description="Kwota płatności kartą z raportu terminala"
          placeholder="0"
          data-autofocus
          value={terminalAmount}
          onChange={setTerminalAmount}
          min={0}
          suffix=" zł"
          size="md"
        />

        {!checked ? (
          <Button fullWidth size="lg" onClick={handleCheck} disabled={!Number(terminalAmount)}>
            Oblicz gotówkę
          </Button>
        ) : (
          <Box
            p="md"
            style={{
              borderRadius: "var(--mantine-radius-md)",
              textAlign: "center",
              backgroundColor:
                cashInDrawer < 0
                  ? "var(--mantine-color-red-light)"
                  : "var(--mantine-color-green-light)",
              border: `2px solid ${cashInDrawer < 0 ? "var(--mantine-color-red-filled)" : "var(--mantine-color-green-filled)"}`,
            }}
          >
            <Text fz="xs" c="dimmed">
              {cashInDrawer < 0
                ? "Kwota terminala wydaje się za wysoka"
                : "Gotówka w kasie powinna wynosić"}
            </Text>
            <Text fw={700} fz={32} c={cashInDrawer < 0 ? "red" : "green"}>
              {cashInDrawer.toLocaleString("pl-PL")} zł
            </Text>
          </Box>
        )}

        {checked && (
          <Button fullWidth size="lg" variant="light" onClick={handleClose}>
            Zamknij
          </Button>
        )}
      </Stack>
    </Modal>
  );
}

// ─── Expense Modal ────────────────────────────────────────────────

function ExpenseModal({
  opened,
  onClose,
  employeeOptions,
  lockedEmployeeId,
  onTake,
}: {
  opened: boolean;
  onClose: () => void;
  employeeOptions: { value: string; label: string }[];
  lockedEmployeeId?: string | null;
  onTake: (employeeId: string, amount: number, desc: string) => void;
}) {
  const form = useForm({
    initialValues: {
      employee: (lockedEmployeeId ?? "") as string,
      amount: "" as number | string,
      desc: "",
    },
    validate: {
      employee: (v) => (v ? null : "Wybierz pracownika"),
      amount: (v) => (!Number(v) || Number(v) <= 0 ? "Podaj kwotę" : null),
    },
  });

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (form.validate().hasErrors) return;
    setSubmitting(true);
    try {
      await onTake(form.values.employee, Number(form.values.amount), form.values.desc);
      form.reset();
    } catch (err) {
      console.error("[Cash] ExpenseModal submit failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Text fw={700} fz="lg">
          Pobranie na zakupy
        </Text>
      }
      size="sm"
    >
      <Stack gap="md">
        <Text fz="sm" c="dimmed">
          Pracownik pobiera gotówkę z kasetki na zakupy salonowe.
        </Text>

        <Select
          label="Pracownik"
          placeholder="Wybierz..."
          data={employeeOptions}
          disabled={!!lockedEmployeeId}
          {...form.getInputProps("employee")}
        />

        <NumberInput
          label="Kwota"
          placeholder="0"
          min={0}
          suffix=" zł"
          size="md"
          data-autofocus
          {...form.getInputProps("amount")}
        />

        <TextInput
          label="Cel (opcjonalnie)"
          placeholder="np. Środki czystości"
          size="md"
          {...form.getInputProps("desc")}
        />

        <Button
          fullWidth
          size="lg"
          color="red"
          onClick={handleSubmit}
          loading={submitting}
          leftSection={<IconCash size={20} />}
        >
          Pobierz z kasy
        </Button>
      </Stack>
    </Modal>
  );
}

// ─── Deposit Modal ────────────────────────────────────────────────

function DepositModal({
  opened,
  onClose,
  employeeOptions,
  lockedEmployeeId,
  onDeposit,
}: {
  opened: boolean;
  onClose: () => void;
  employeeOptions: { value: string; label: string }[];
  lockedEmployeeId?: string | null;
  onDeposit: (employeeId: string, amount: number) => Promise<void>;
}) {
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    initialValues: {
      employee: (lockedEmployeeId ?? "") as string,
      amount: "" as number | string,
    },
    validate: {
      employee: (v) => (v ? null : "Wybierz pracownika"),
      amount: (v) => (!Number(v) || Number(v) <= 0 ? "Podaj kwotę" : null),
    },
  });

  const handleSubmit = async (): Promise<void> => {
    if (form.validate().hasErrors) return;
    setSubmitting(true);
    try {
      await onDeposit(form.values.employee, Number(form.values.amount));
      form.reset();
    } catch (err) {
      console.error("[CashPage] Deposit failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Text fw={700} fz="lg">
          Wpłata drobnych
        </Text>
      }
      size="sm"
    >
      <Stack gap="md">
        <Text fz="sm" c="dimmed">
          Wpłata własnych pieniędzy do kasetki lub pokrycie reszty dla klienta. Kwota doliczy się do
          Portfela pracownika.
        </Text>

        <Select
          label="Pracownik"
          placeholder="Wybierz..."
          data={employeeOptions}
          disabled={!!lockedEmployeeId}
          {...form.getInputProps("employee")}
        />

        <NumberInput
          label="Kwota"
          placeholder="0"
          min={0}
          suffix=" zł"
          size="md"
          data-autofocus
          {...form.getInputProps("amount")}
        />

        <Button
          fullWidth
          size="lg"
          color="green"
          loading={submitting}
          onClick={handleSubmit}
          leftSection={<IconCash size={20} />}
        >
          Wpłać do kasy
        </Button>
      </Stack>
    </Modal>
  );
}

// ─── Voucher Modal ────────────────────────────────────────────────

function VoucherModal({
  opened,
  onClose,
  onSale,
}: {
  opened: boolean;
  onClose: () => void;
  onSale: (amount: number) => void;
}) {
  const [value, setValue] = useState<number | string>("");
  const [error, setError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);

  const handleSale = async () => {
    const amount = Number(value);
    if (!amount || amount <= 0) {
      setError("Podaj kwotę bonu");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await onSale(amount);
      setValue("");
    } catch (err) {
      console.error("[Cash] VoucherModal submit failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setValue("");
    setError(null);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Text fw={700} fz="lg">
          Sprzedaj bon
        </Text>
      }
      size="sm"
    >
      <Stack gap="md">
        <Text fz="sm" c="dimmed">
          Bon nie jest przypisany do fryzjera - wpływa do kasy salonu.
        </Text>

        <NumberInput
          label="Kwota bonu"
          placeholder="0"
          data-autofocus
          value={value}
          onChange={(v) => {
            setValue(v);
            setError(null);
          }}
          min={1}
          suffix=" zł"
          size="md"
          error={error}
        />

        <Button
          fullWidth
          size="lg"
          color="green"
          onClick={handleSale}
          loading={submitting}
          leftSection={<IconGift size={20} />}
        >
          Sprzedaj bon - {Number(value) || 0} zł
        </Button>
      </Stack>
    </Modal>
  );
}
