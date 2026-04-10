import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useForm } from "@mantine/form";
import { db } from "@/db";
import { useEmployees } from "@/hooks/useDbData";
import type { Transaction, CashMovement } from "@/lib/types";
import {
  Text,
  Group,
  Stack,
  Box,
  Container,
  Divider,
  Button,
  NumberInput,
  Select,
  Modal,
} from "@mantine/core";
import { IconPrinter, IconCheck } from "@tabler/icons-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { CASH_TOLERANCE } from "@/lib/constants";

function diffColor(diff: number, tolerance: number) {
  if (Math.abs(diff) <= tolerance) return "green";
  return diff > 0 ? "blue" : "red";
}

function diffLabel(diff: number, tolerance: number) {
  if (Math.abs(diff) <= tolerance) return " (OK)";
  return diff > 0 ? " (nadwyżka)" : " (brak)";
}

function formatDiff(diff: number) {
  return `${diff > 0 ? "+" : ""}${diff.toLocaleString("pl-PL")} zł`;
}

function calcExpectedCash(
  openingBalance: number,
  systemCash: number,
  movements: CashMovement[]
): number {
  const cashIn = movements
    .filter(
      (m) =>
        m.type === "top_up" ||
        m.type === "expense_settle" ||
        (m.type === "voucher_sale" && m.paymentMethod === "cash")
    )
    .reduce((sum, m) => sum + m.amount, 0);

  const cashOut = movements
    .filter(
      (m) => m.type === "tip_withdrawal" || m.type === "expense_take" || m.type === "barber_payback"
    )
    .reduce((sum, m) => sum + m.amount, 0);

  return openingBalance + systemCash + cashIn - cashOut;
}

export default function ShiftClosePage() {
  const navigate = useNavigate();

  const form = useForm({
    initialValues: {
      closingEmployee: "" as string,
      cashAmount: "" as number | string,
      floatAmount: "" as number | string,
      vouchersAmount: "" as number | string,
    },
    validate: {
      closingEmployee: (v) => (v ? null : "Wybierz pracownika"),
      cashAmount: (v) => (Number(v) < 0 ? "Kwota nie może być ujemna" : null),
      floatAmount: (v, values) =>
        Number(v) < 0
          ? "Kwota nie może być ujemna"
          : Number(v) > Number(values.cashAmount)
            ? "Drobne nie mogą być większe niż gotówka"
            : null,
      vouchersAmount: (v) => (Number(v) < 0 ? "Kwota nie może być ujemna" : null),
    },
  });

  const [confirmModal, setConfirmModal] = useState(false);
  const [done, setDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: employees = [] } = useEmployees();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [openingBalance, setOpeningBalance] = useState(0);

  useEffect(() => {
    async function load() {
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
    }
    load().catch(console.error);
  }, []);

  const employeeOptions = employees.map((e) => ({
    value: e.id,
    label: e.name,
  }));

  // === SYSTEM VALUES (from payment breakdown for accuracy) ===
  let systemCash = 0;
  let systemCard = 0;
  let systemBlik = 0;
  let systemVoucher = 0;
  const systemTotal = transactions.reduce((sum, t) => sum + t.totalAmount, 0);

  for (const tx of transactions) {
    if (tx.paymentBreakdown && tx.paymentBreakdown.length > 0) {
      for (const pd of tx.paymentBreakdown) {
        if (pd.method === "cash") systemCash += pd.amount;
        else if (pd.method === "card") systemCard += pd.amount;
        else if (pd.method === "blik") systemBlik += pd.amount;
        else if (pd.method === "voucher") systemVoucher += pd.amount;
      }
    } else {
      // Fallback for old transactions without breakdown
      if (tx.paymentMethod === "cash") systemCash += tx.totalAmount;
      else if (tx.paymentMethod === "card") systemCard += tx.totalAmount;
      else if (tx.paymentMethod === "blik") systemBlik += tx.totalAmount;
      else if (tx.paymentMethod === "voucher") systemVoucher += tx.totalAmount;
    }
  }

  // === EXPECTED VALUES (transactions + movements) ===
  const expectedCash = calcExpectedCash(openingBalance, systemCash, movements);
  const expectedVouchers = systemVoucher;

  // === FORM VALUES ===
  const cash = Number(form.values.cashAmount) || 0;
  const vouchers = Number(form.values.vouchersAmount) || 0;
  const floatVal = Number(form.values.floatAmount) || 0;

  const deposit = Math.max(0, cash - floatVal) + vouchers;
  const cashDifference = cash - expectedCash;
  const voucherDifference = vouchers - expectedVouchers;

  const closingName = form.values.closingEmployee
    ? employees.find((e) => e.id === form.values.closingEmployee)?.name
    : null;

  const handleConfirm = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await db.dailyReports.create({
        closingEmployeeId: form.values.closingEmployee,
        expectedCash,
        actualCash: cash,
        expectedVouchers,
        actualVouchersValue: vouchers,
        floatAmount: floatVal,
        depositAmount: deposit,
        difference: cashDifference,
        voucherDifference,
      });
      setConfirmModal(false);
      setDone(true);
      if (navigator.vibrate) navigator.vibrate(100);
    } catch (err) {
      console.error("[ShiftClose] Save failed:", err);
      setIsSubmitting(false);
    }
  };

  // === MOVEMENTS SUMMARY (for display) ===
  const movementsSummary = [
    ...(openingBalance > 0
      ? [{ label: "Pogotowie kasowe", amount: openingBalance, sign: "+" as const }]
      : []),
    {
      label: "Wpłaty do kasy",
      amount: movements.filter((m) => m.type === "top_up").reduce((s, m) => s + m.amount, 0),
      sign: "+" as const,
    },
    {
      label: "Sprzedaż bonów (gotówka)",
      amount: movements
        .filter((m) => m.type === "voucher_sale" && m.paymentMethod === "cash")
        .reduce((s, m) => s + m.amount, 0),
      sign: "+" as const,
    },
    {
      label: "Zwroty z zakupów",
      amount: movements
        .filter((m) => m.type === "expense_settle")
        .reduce((s, m) => s + m.amount, 0),
      sign: "+" as const,
    },
    {
      label: "Wypłaty napiwków",
      amount: movements
        .filter((m) => m.type === "tip_withdrawal")
        .reduce((s, m) => s + m.amount, 0),
      sign: "-" as const,
    },
    {
      label: "Pobrania na zakupy",
      amount: movements.filter((m) => m.type === "expense_take").reduce((s, m) => s + m.amount, 0),
      sign: "-" as const,
    },
    {
      label: "Zwroty pożyczek",
      amount: movements
        .filter((m) => m.type === "barber_payback")
        .reduce((s, m) => s + m.amount, 0),
      sign: "-" as const,
    },
  ].filter((r) => r.amount > 0);

  if (done) {
    return (
      <Box mih="100vh">
        <Container size="sm">
          <Stack align="center" gap="lg" py={80}>
            <Box
              p="lg"
              style={{
                borderRadius: "50%",
                backgroundColor: "var(--mantine-color-green-light)",
              }}
            >
              <IconCheck size={48} color="var(--mantine-color-green-filled)" />
            </Box>
            <Text fw={700} fz={24} ta="center">
              Zmiana zamknięta
            </Text>
            <Text fz="sm" ta="center">
              Raport kasowy gotowy. Zamykał: {closingName}
            </Text>

            {/* Receipt preview */}
            <Box
              w="100%"
              p="md"
              data-print-area
              style={{
                borderRadius: "var(--mantine-radius-md)",
                border: "1px solid var(--mantine-color-default-border)",
                fontFamily: "monospace",
              }}
            >
              <Text fz="sm" ta="center" fw={700} mb="xs">
                RAPORT KASOWY
              </Text>
              <Text fz="xs" ta="center" c="dimmed" mb="md">
                {new Date().toLocaleDateString("pl-PL")},{" "}
                {new Date().toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })} ·
                Zamykał: {closingName}
              </Text>
              <Divider mb="sm" variant="dashed" />
              {openingBalance > 0 && (
                <Group justify="space-between" mb={4}>
                  <Text fz="xs">Pogotowie kasowe:</Text>
                  <Text fz="xs" fw={600}>
                    {openingBalance.toLocaleString("pl-PL")} zł
                  </Text>
                </Group>
              )}
              <Group justify="space-between" mb={4}>
                <Text fz="xs">Gotówka (policzona):</Text>
                <Text fz="xs" fw={600}>
                  {cash.toLocaleString("pl-PL")} zł
                </Text>
              </Group>
              <Group justify="space-between" mb={4}>
                <Text fz="xs">Gotówka (oczekiwana):</Text>
                <Text fz="xs" fw={600}>
                  {expectedCash.toLocaleString("pl-PL")} zł
                </Text>
              </Group>
              <Group justify="space-between" mb={4}>
                <Text fz="xs">Różnica gotówkowa:</Text>
                <Text fz="xs" fw={600} c={diffColor(cashDifference, CASH_TOLERANCE)}>
                  {formatDiff(cashDifference)}
                  {diffLabel(cashDifference, CASH_TOLERANCE)}
                </Text>
              </Group>
              <Divider my="sm" variant="dashed" />
              <Group justify="space-between" mb={4}>
                <Text fz="xs">Bony (policzone):</Text>
                <Text fz="xs" fw={600}>
                  {vouchers.toLocaleString("pl-PL")} zł
                </Text>
              </Group>
              <Group justify="space-between" mb={4}>
                <Text fz="xs">Bony (oczekiwane):</Text>
                <Text fz="xs" fw={600}>
                  {expectedVouchers.toLocaleString("pl-PL")} zł
                </Text>
              </Group>
              {voucherDifference !== 0 && (
                <Group justify="space-between" mb={4}>
                  <Text fz="xs">Różnica bonowa:</Text>
                  <Text fz="xs" fw={600} c={diffColor(voucherDifference, CASH_TOLERANCE)}>
                    {formatDiff(voucherDifference)}
                    {diffLabel(voucherDifference, CASH_TOLERANCE)}
                  </Text>
                </Group>
              )}
              <Divider my="sm" variant="dashed" />
              <Group justify="space-between" mb={4}>
                <Text fz="xs">Drobne na jutro:</Text>
                <Text fz="xs" fw={600}>
                  {floatVal.toLocaleString("pl-PL")} zł
                </Text>
              </Group>
              <Group justify="space-between" mb={4}>
                <Text fz="sm" fw={700}>
                  DO KOPERTY:
                </Text>
                <Text fz="sm" fw={700}>
                  {deposit.toLocaleString("pl-PL")} zł
                </Text>
              </Group>
            </Box>

            <Group>
              <Button
                variant="light"
                leftSection={<IconPrinter size={18} />}
                onClick={() => window.print()}
              >
                Drukuj raport
              </Button>
              <Button onClick={() => navigate("/")}>Powrót do ekranu głównego</Button>
            </Group>
          </Stack>
        </Container>
      </Box>
    );
  }

  return (
    <Box mih="100vh" pb={160}>
      <Container size="lg">
        <PageHeader title="Zamknięcie zmiany" />

        <Divider />

        {/* ===== SYSTEM SUMMARY ===== */}
        <Box py="md">
          <Text fz="xs" c="var(--mantine-color-text)" tt="uppercase" lts={1} mb="sm">
            Sprzedaż od ostatniego zamknięcia
          </Text>
          <Stack gap={4}>
            <Group justify="space-between">
              <Text fz="sm">Gotówka:</Text>
              <Text fz="sm" fw={600}>
                {systemCash.toLocaleString("pl-PL")} zł
              </Text>
            </Group>
            <Group justify="space-between">
              <Text fz="sm">Karta/BLIK:</Text>
              <Text fz="sm" fw={600}>
                {(systemCard + systemBlik).toLocaleString("pl-PL")} zł
              </Text>
            </Group>
            <Group justify="space-between">
              <Text fz="sm">Bony (płatność bonem):</Text>
              <Text fz="sm" fw={600}>
                {systemVoucher.toLocaleString("pl-PL")} zł
              </Text>
            </Group>
            <Divider my={4} />
            <Group justify="space-between">
              <Text fz="sm" fw={700}>
                Razem:
              </Text>
              <Text fz="sm" fw={700}>
                {systemTotal.toLocaleString("pl-PL")} zł
              </Text>
            </Group>
          </Stack>
        </Box>

        {/* ===== MOVEMENTS AFFECTING CASH ===== */}
        {movementsSummary.length > 0 && (
          <>
            <Divider />
            <Box py="md">
              <Text fz="xs" c="var(--mantine-color-text)" tt="uppercase" lts={1} mb="sm">
                Ruchy kasowe
              </Text>
              <Stack gap={4}>
                {movementsSummary.map((row) => (
                  <Group key={row.label} justify="space-between">
                    <Text fz="sm">{row.label}:</Text>
                    <Text fz="sm" fw={600} c={row.sign === "+" ? "green" : "red"}>
                      {row.sign}
                      {row.amount.toLocaleString("pl-PL")} zł
                    </Text>
                  </Group>
                ))}
                <Divider my={4} />
                <Group justify="space-between">
                  <Text fz="sm" fw={700}>
                    Oczekiwana gotówka:
                  </Text>
                  <Text fz="sm" fw={700}>
                    {expectedCash.toLocaleString("pl-PL")} zł
                  </Text>
                </Group>
              </Stack>
            </Box>
          </>
        )}

        <Divider />

        {/* ===== FORM ===== */}
        <Stack gap="md" py="md">
          <Text fz="xs" c="var(--mantine-color-text)" tt="uppercase" lts={1}>
            Wprowadź stan fizyczny
          </Text>

          <Select
            label="Zamyka zmianę"
            placeholder="Wybierz pracownika..."
            data={employeeOptions}
            {...form.getInputProps("closingEmployee")}
          />

          <NumberInput
            label="Gotówka (zł)"
            description="Policz banknoty i monety"
            placeholder="0"
            min={0}
            suffix=" zł"
            size="md"
            {...form.getInputProps("cashAmount")}
          />

          <NumberInput
            label="Drobne na jutro (zł)"
            description="Pogotowie kasowe na następną zmianę"
            placeholder="0"
            min={0}
            suffix=" zł"
            size="md"
            {...form.getInputProps("floatAmount")}
          />

          <NumberInput
            label="Bony papierowe (zł)"
            description="Suma wartości bonów zebranych od klientów"
            placeholder="0"
            min={0}
            suffix=" zł"
            size="md"
            {...form.getInputProps("vouchersAmount")}
          />
        </Stack>

        <Divider />

        {/* ===== CALCULATED RESULT ===== */}
        {(cash > 0 || vouchers > 0) && (
          <Box py="md">
            <Stack gap="sm">
              <Group justify="space-between">
                <Text fz="sm">Gotówka do koperty:</Text>
                <Text fz="sm" fw={600}>
                  {Math.max(0, cash - floatVal).toLocaleString("pl-PL")} zł
                </Text>
              </Group>
              {vouchers > 0 && (
                <Group justify="space-between">
                  <Text fz="sm">Bony do koperty:</Text>
                  <Text fz="sm" fw={600}>
                    {vouchers.toLocaleString("pl-PL")} zł
                  </Text>
                </Group>
              )}
              <Divider />
              <Group justify="space-between">
                <Text fz="md" fw={600}>
                  Do koperty (razem):
                </Text>
                <Text fz={28} fw={700} c="green">
                  {deposit.toLocaleString("pl-PL")} zł
                </Text>
              </Group>

              {/* Cash difference */}
              <Group justify="space-between">
                <Text fz="sm" c="dimmed">
                  Różnica gotówkowa:
                </Text>
                <Text fz="sm" fw={600} c={diffColor(cashDifference, CASH_TOLERANCE)}>
                  {formatDiff(cashDifference)}
                  {diffLabel(cashDifference, CASH_TOLERANCE)}
                </Text>
              </Group>

              {/* Voucher difference */}
              {(vouchers > 0 || expectedVouchers > 0) && (
                <Group justify="space-between">
                  <Text fz="sm" c="dimmed">
                    Różnica bonowa:
                  </Text>
                  <Text fz="sm" fw={600} c={diffColor(voucherDifference, CASH_TOLERANCE)}>
                    {formatDiff(voucherDifference)}
                    {diffLabel(voucherDifference, CASH_TOLERANCE)}
                  </Text>
                </Group>
              )}
            </Stack>
          </Box>
        )}
      </Container>

      {/* ===== BOTTOM CTA ===== */}
      <Box
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          borderTop: "1px solid var(--mantine-color-default-border)",
          backgroundColor: "var(--mantine-color-body)",
        }}
        p="md"
      >
        <Container size="lg">
          <Button
            fullWidth
            size="lg"
            color="dark"
            disabled={isSubmitting}
            onClick={() => {
              if (form.validate().hasErrors) return;
              if (!cash && !vouchers) return;
              setConfirmModal(true);
            }}
            leftSection={<IconPrinter size={20} />}
            fz="md"
            fw={600}
          >
            Zatwierdź i drukuj raport
          </Button>
        </Container>
      </Box>

      {/* ===== CONFIRM MODAL ===== */}
      <Modal
        opened={confirmModal}
        onClose={() => setConfirmModal(false)}
        title={
          <Text fw={700} fz="lg">
            Potwierdzenie
          </Text>
        }
        size="sm"
      >
        <Stack gap="md">
          <Text fz="sm">
            Zamykasz zmianę. Do koperty trafi{" "}
            <Text span fw={700}>
              {deposit.toLocaleString("pl-PL")} zł
            </Text>
            . Drobne na jutro:{" "}
            <Text span fw={700}>
              {floatVal.toLocaleString("pl-PL")} zł
            </Text>
            .
          </Text>
          {(cashDifference !== 0 || voucherDifference !== 0) && (
            <Stack gap={4}>
              {cashDifference !== 0 && (
                <Text fz="sm" c={diffColor(cashDifference, CASH_TOLERANCE)}>
                  Różnica gotówkowa: {formatDiff(cashDifference)}
                  {Math.abs(cashDifference) <= CASH_TOLERANCE ? " (w tolerancji)" : ""}
                </Text>
              )}
              {voucherDifference !== 0 && (
                <Text fz="sm" c={diffColor(voucherDifference, CASH_TOLERANCE)}>
                  Różnica bonowa: {formatDiff(voucherDifference)}
                  {Math.abs(voucherDifference) <= CASH_TOLERANCE ? " (w tolerancji)" : ""}
                </Text>
              )}
            </Stack>
          )}
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => setConfirmModal(false)}>
              Anuluj
            </Button>
            <Button color="green" onClick={handleConfirm} loading={isSubmitting}>
              Potwierdzam
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
