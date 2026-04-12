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
import { useDeviceRole } from "@/contexts/DeviceContext";

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

export default function ShiftClosePage(): React.JSX.Element {
  const navigate = useNavigate();
  const { lockedEmployeeId } = useDeviceRole();

  const form = useForm({
    initialValues: {
      closingEmployee: (lockedEmployeeId ?? "") as string,
      floatAmount: "" as number | string,
      envelopeAmount: "" as number | string,
    },
    validate: {
      closingEmployee: (v) => (v ? null : "Wybierz pracownika"),
      floatAmount: (v) => (Number(v) < 0 ? "Kwota nie może być ujemna" : null),
      envelopeAmount: (v) =>
        Number(v) < 0 ? "Kwota nie może być ujemna" : !Number(v) ? "Podaj kwotę do koperty" : null,
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
    }
    load().catch(console.error);
  }, []);

  const employeeOptions = employees.map((e) => ({
    value: e.id,
    label: e.name,
  }));

  // === SYSTEM VALUES ===
  let systemCash = 0;
  let systemNonCash = 0;

  for (const tx of transactions) {
    if (tx.paymentBreakdown && tx.paymentBreakdown.length > 0) {
      for (const pd of tx.paymentBreakdown) {
        if (pd.method === "cash" || pd.method === "voucher") {
          systemCash += pd.amount;
        } else {
          systemNonCash += pd.amount;
        }
      }
    } else if (tx.paymentMethod === "cash" || tx.paymentMethod === "voucher") {
      systemCash += tx.totalAmount;
    } else {
      systemNonCash += tx.totalAmount;
    }
  }

  const expectedCash = calcExpectedCash(openingBalance, systemCash, movements);

  // === FORM VALUES ===
  const floatVal = Number(form.values.floatAmount) || 0;
  const envelopeVal = Number(form.values.envelopeAmount) || 0;
  const actualCash = floatVal + envelopeVal;
  const difference = actualCash - expectedCash;

  const closingName = form.values.closingEmployee
    ? employees.find((e) => e.id === form.values.closingEmployee)?.name
    : null;

  const handleConfirm = async (): Promise<void> => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await db.dailyReports.create({
        closingEmployeeId: form.values.closingEmployee,
        expectedCash,
        actualCash,
        expectedVouchers: systemNonCash,
        actualVouchersValue: 0,
        floatAmount: floatVal,
        depositAmount: envelopeVal,
        difference,
        voucherDifference: 0,
      });
      setConfirmModal(false);
      setDone(true);
      if (navigator.vibrate) navigator.vibrate(100);
    } catch (err) {
      console.error("[ShiftClose] Save failed:", err);
      setIsSubmitting(false);
    }
  };

  // === SUCCESS SCREEN ===
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

            {/* Receipt */}
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

              <Group justify="space-between" mb={4}>
                <Text fz="xs">Sprzedaż Karta / BLIK:</Text>
                <Text fz="xs" fw={600}>
                  {systemNonCash.toLocaleString("pl-PL")} zł
                </Text>
              </Group>
              <Group justify="space-between" mb={4}>
                <Text fz="xs">Oczekiwana gotówka:</Text>
                <Text fz="xs" fw={600}>
                  {expectedCash.toLocaleString("pl-PL")} zł
                </Text>
              </Group>

              <Divider my="sm" variant="dashed" />

              <Group justify="space-between" mb={4}>
                <Text fz="xs">Drobne na jutro:</Text>
                <Text fz="xs" fw={600}>
                  {floatVal.toLocaleString("pl-PL")} zł
                </Text>
              </Group>
              <Group justify="space-between" mb={4}>
                <Text fz="xs">Do koperty:</Text>
                <Text fz="xs" fw={600}>
                  {envelopeVal.toLocaleString("pl-PL")} zł
                </Text>
              </Group>

              {difference !== 0 && (
                <>
                  <Divider my="sm" variant="dashed" />
                  <Group justify="space-between" mb={4}>
                    <Text fz="xs">Różnica kasowa:</Text>
                    <Text fz="xs" fw={600} c={difference > 0 ? "blue" : "red"}>
                      {difference > 0 ? "+" : ""}
                      {difference.toLocaleString("pl-PL")} zł
                      {difference > 0 ? " (nadwyżka)" : " (manko)"}
                    </Text>
                  </Group>
                </>
              )}
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

  // === MAIN FORM ===
  return (
    <Box mih="100vh" pb={160}>
      <Container size="lg">
        <PageHeader title="Zamknięcie zmiany" />

        <Divider />

        {/* KROK 1: Identyfikacja */}
        <Stack gap="sm" py="sm">
          <Select
            label="Kto zamyka zmianę?"
            placeholder="Wybierz pracownika..."
            data={employeeOptions}
            disabled={!!lockedEmployeeId}
            {...form.getInputProps("closingEmployee")}
          />
        </Stack>

        {form.values.closingEmployee && (
          <>
            {/* KROK 2: Podglad systemowy */}
            <Divider />
            <Stack gap="xs" pt="sm">
              <Text fz="xs" c="var(--mantine-color-text)" tt="uppercase" lts={1}>
                Podgląd systemowy
              </Text>
              <Group justify="space-between">
                <Text fz="sm">Sprzedaż Karta / BLIK:</Text>
                <Text fz="sm" fw={600}>
                  {systemNonCash.toLocaleString("pl-PL")} zł
                </Text>
              </Group>
              <Divider />
              <div>
                <Text fz="sm" fw={700}>
                  Oczekiwana gotówka/bony w szufladzie:
                </Text>
                <Text fz="lg" fw={700} c="green" lh={1.2}>
                  {expectedCash.toLocaleString("pl-PL")} zł
                </Text>
              </div>
            </Stack>

            {/* KROK 3: Inputy fryzjera */}
            <Divider mt="sm" />
            <Stack gap="sm" py="sm">
              <Text fz="xs" c="var(--mantine-color-text)" tt="uppercase" lts={1}>
                Wprowadź stan fizyczny
              </Text>

              <NumberInput
                label="Drobne na jutro"
                description="Pogotowie kasowe zostawiane w szufladzie na start kolejnego dnia"
                placeholder="0"
                min={0}
                suffix=" zł"
                {...form.getInputProps("floatAmount")}
              />

              <NumberInput
                label="Do koperty"
                description="Utarg gotówkowy wyciągnięty z kasy dla szefa"
                placeholder="0"
                min={0}
                suffix=" zł"
                {...form.getInputProps("envelopeAmount")}
              />
            </Stack>

            {/* KROK 4: Weryfikacja na zywo */}
            {(floatVal > 0 || envelopeVal > 0) && (
              <>
                <Divider />
                <Box py="sm">
                  <Stack gap="sm" align="center">
                    {difference === 0 ? (
                      <Text fz="lg" fw={700} c="green" ta="center">
                        Stan kasy się zgadza!
                      </Text>
                    ) : (
                      <Text fz="lg" fw={700} c="red" ta="center">
                        {difference < 0
                          ? `Manko: ${difference.toLocaleString("pl-PL")} zł`
                          : `Nadwyżka: +${difference.toLocaleString("pl-PL")} zł`}
                      </Text>
                    )}
                  </Stack>
                </Box>
              </>
            )}
          </>
        )}
      </Container>

      {/* BOTTOM CTA */}
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
            disabled={isSubmitting || !form.values.closingEmployee}
            onClick={() => {
              if (form.validate().hasErrors) return;
              setConfirmModal(true);
            }}
            leftSection={<IconPrinter size={20} />}
            fz="md"
            fw={600}
          >
            Zatwierdź i drukuj
          </Button>
        </Container>
      </Box>

      {/* CONFIRM MODAL */}
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
              {envelopeVal.toLocaleString("pl-PL")} zł
            </Text>
            . Drobne na jutro:{" "}
            <Text span fw={700}>
              {floatVal.toLocaleString("pl-PL")} zł
            </Text>
            .
          </Text>
          {difference !== 0 && (
            <Text fz="sm" c={difference > 0 ? "blue" : "red"}>
              {difference < 0
                ? `Manko: ${difference.toLocaleString("pl-PL")} zł`
                : `Nadwyżka: +${difference.toLocaleString("pl-PL")} zł`}
            </Text>
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
