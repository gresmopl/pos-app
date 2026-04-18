import { useState, useEffect, useCallback, useRef } from "react";
import { useEmployees } from "@/hooks/useDbData";
import { db } from "@/db";
import { calcExpectedCash, calcSystemCash } from "@/lib/cash";
import type { Transaction, CashMovement } from "@/lib/types";
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
  IconCheck,
  IconCopy,
} from "@tabler/icons-react";
import { CopyButton } from "@mantine/core";
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

  useEffect(() => {
    async function load(): Promise<void> {
      const [since, lastFloat] = await Promise.all([
        db.dailyReports.getLastClosedAt(),
        db.dailyReports.getLastFloat(),
      ]);
      const [txs, mvs] = await Promise.all([
        db.transactions.getSince(since),
        db.cashMovements.getSince(since),
      ]);
      setTransactions(txs);
      setMovements(mvs);
      setOpeningBalance(lastFloat);
      setLoading(false);
    }
    load().catch(console.error);
  }, []);

  const systemCash = calcSystemCash(transactions);
  const expectedCash = calcExpectedCash(openingBalance, systemCash, movements);

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

  const handleVoucherSale = useCallback(async (amount: number, code: string) => {
    const movement = await db.cashMovements.create({
      type: "voucher_sale",
      amount,
      description: `Sprzedaż bonu ${code}`,
      voucherCode: code,
    });
    setMovements((prev) => [movement, ...prev]);
  }, []);

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
        <PageHeader title="Kasa" />

        <Divider />

        {/* ===== HERO ===== */}
        <Box
          py="lg"
          px="md"
          my="md"
          style={{
            borderRadius: "var(--mantine-radius-lg)",
            backgroundColor: "var(--mantine-color-green-light)",
            textAlign: "center",
          }}
        >
          <Text fz="xs" c="dimmed" tt="uppercase" lts={1}>
            W kasie powinno być
          </Text>
          <Text fw={700} fz={48} c="green" lh={1.1} mt={4}>
            {loading ? "..." : `${expectedCash.toLocaleString("pl-PL")} zł`}
          </Text>
          <Text fz="sm" c="dimmed" mt={6}>
            Utarg dziś: {systemCash.toLocaleString("pl-PL")} zł
          </Text>
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
            title="Wyjąłem na zakupy"
            subtitle="Kawa, środki czystości itp."
            onClick={() => setActiveModal("expense")}
          />
          <ActionButton
            icon={<IconCash size={22} color="var(--mantine-color-green-filled)" />}
            iconBg="var(--mantine-color-green-light)"
            title="Dołożyłem drobne"
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
                      size="sm"
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
        <MovementHistory movements={movements} />
      </Container>

      {/* ===== TERMINAL CHECK MODAL ===== */}
      <TerminalCheckModal
        opened={activeModal === "terminal"}
        onClose={() => setActiveModal(null)}
        expectedCash={expectedCash}
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
}: {
  opened: boolean;
  onClose: () => void;
  expectedCash: number;
}) {
  const [terminalAmount, setTerminalAmount] = useState<number | string>("");
  const [checked, setChecked] = useState(false);

  const amount = Number(terminalAmount) || 0;
  const difference = amount - expectedCash;

  const handleCheck = () => {
    setChecked(true);
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
            System mówi, że w kasie powinno być
          </Text>
          <Text fw={700} fz="xl">
            {expectedCash.toLocaleString("pl-PL")} zł
          </Text>
        </Box>

        <NumberInput
          label="Suma z raportu terminala"
          placeholder="0"
          value={terminalAmount}
          onChange={setTerminalAmount}
          min={0}
          suffix=" zł"
          size="md"
        />

        {!checked ? (
          <Button fullWidth size="lg" onClick={handleCheck} disabled={!Number(terminalAmount)}>
            Sprawdź
          </Button>
        ) : (
          <Box
            p="md"
            style={{
              borderRadius: "var(--mantine-radius-md)",
              textAlign: "center",
              backgroundColor:
                difference === 0
                  ? "var(--mantine-color-green-light)"
                  : "var(--mantine-color-yellow-light)",
              border: `2px solid ${
                difference === 0
                  ? "var(--mantine-color-green-filled)"
                  : "var(--mantine-color-yellow-filled)"
              }`,
            }}
          >
            {difference === 0 ? (
              <>
                <Text fw={700} fz="lg" c="green">
                  Wszystko się zgadza!
                </Text>
              </>
            ) : (
              <>
                <Text fz="sm" c="dimmed">
                  Różnica
                </Text>
                <Text fw={700} fz={32} c={difference > 0 ? "green" : "red"}>
                  {difference > 0 ? "+" : ""}
                  {difference.toLocaleString("pl-PL")} zł
                </Text>
              </>
            )}
          </Box>
        )}

        {checked && (
          <Button fullWidth variant="light" onClick={handleClose}>
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

  const handleSubmit = () => {
    if (form.validate().hasErrors) return;
    onTake(form.values.employee, Number(form.values.amount), form.values.desc);
    form.reset();
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
          Wyjąłem na zakupy
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
          {...form.getInputProps("amount")}
        />

        <TextInput
          label="Cel (opcjonalnie)"
          placeholder="np. Środki czystości"
          {...form.getInputProps("desc")}
        />

        <Button fullWidth size="lg" onClick={handleSubmit} leftSection={<IconCash size={20} />}>
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
          Dołożyłem drobne
        </Text>
      }
      size="sm"
    >
      <Stack gap="md">
        <Text fz="sm" c="dimmed">
          Wrzuciłeś do kasetki własne pieniądze lub dałeś klientowi resztę z własnych. Kwota doliczy
          się do Twojego Portfela.
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
  onSale: (amount: number, code: string) => void;
}) {
  const [value, setValue] = useState<number | string>("");
  const [success, setSuccess] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSale = () => {
    const amount = Number(value);
    if (!amount || amount <= 0) {
      setError("Podaj kwotę bonu");
      return;
    }
    setError(null);

    const generatedCode = `BON-${Date.now().toString(36).toUpperCase()}`;
    setCode(generatedCode);
    setSuccess(true);
    onSale(amount, generatedCode);
  };

  const handleClose = () => {
    setValue("");
    setSuccess(false);
    setCode("");
    setError(null);
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Text fw={700} fz="lg">
          {success ? "Bon sprzedany!" : "Sprzedaj bon"}
        </Text>
      }
      size="sm"
    >
      {success ? (
        <Stack align="center" gap="md" py="md">
          <Box
            p="md"
            style={{
              borderRadius: "50%",
              backgroundColor: "var(--mantine-color-green-light)",
            }}
          >
            <IconCheck size={40} color="var(--mantine-color-green-filled)" />
          </Box>
          <Box
            p="md"
            w="100%"
            style={{
              borderRadius: "var(--mantine-radius-md)",
              border: "1px solid var(--mantine-color-default-border)",
              textAlign: "center",
            }}
          >
            <Text fz="xs" c="dimmed">
              Kod bonu
            </Text>
            <Text fw={700} fz={22} style={{ letterSpacing: 2 }}>
              {code}
            </Text>
            <Text fz="sm" c="dimmed" mt="xs">
              Wartość: {Number(value).toLocaleString("pl-PL")} zł
            </Text>
          </Box>
          <CopyButton value={code}>
            {({ copied, copy }) => (
              <Button
                fullWidth
                size="md"
                variant="light"
                color={copied ? "green" : "gray"}
                leftSection={copied ? <IconCheck size={18} /> : <IconCopy size={18} />}
                onClick={copy}
              >
                {copied ? "Skopiowano!" : "Kopiuj kod"}
              </Button>
            )}
          </CopyButton>
          <Button fullWidth size="lg" variant="light" onClick={handleClose}>
            Zamknij
          </Button>
        </Stack>
      ) : (
        <Stack gap="md">
          <Text fz="sm" c="dimmed">
            Bon nie jest przypisany do fryzjera - wpływa do kasy salonu.
          </Text>

          <NumberInput
            label="Kwota bonu"
            placeholder="0"
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
            leftSection={<IconGift size={20} />}
          >
            Sprzedaj bon - {Number(value) || 0} zł
          </Button>
        </Stack>
      )}
    </Modal>
  );
}
