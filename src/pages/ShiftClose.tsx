import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useForm } from "@mantine/form";
import { db } from "@/db";
import { useEmployees } from "@/hooks/useDbData";
import type { Transaction, CashMovement, TerminalCheck } from "@/lib/types";
import { calcExpectedCash, calcSystemCash } from "@/lib/cash";
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
import { BOTTOM_NAV_HEIGHT } from "@/components/layout/BottomNavBar";
import { useDeviceRole } from "@/contexts/DeviceContext";

export default function ShiftClosePage(): React.JSX.Element {
  const navigate = useNavigate();
  const { lockedEmployeeId } = useDeviceRole();

  const form = useForm({
    initialValues: {
      closingEmployee: (lockedEmployeeId ?? "") as string,
      terminalAmount: "" as number | string,
      floatAmount: "" as number | string,
      envelopeAmount: "" as number | string,
    },
    validate: {
      closingEmployee: (v) => (v ? null : "Wybierz pracownika"),
      terminalAmount: (v) => (Number(v) < 0 ? "Kwota nie może być ujemna" : null),
      floatAmount: (v) => (Number(v) < 0 ? "Kwota nie może być ujemna" : null),
      envelopeAmount: (v) =>
        v === "" || v === undefined
          ? "Podaj kwotę do koperty"
          : Number(v) < 0
            ? "Kwota nie może być ujemna"
            : null,
    },
  });

  const [confirmModal, setConfirmModal] = useState(false);
  const [done, setDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: employees = [] } = useEmployees();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [terminalChecks, setTerminalChecks] = useState<TerminalCheck[]>([]);
  const [openingBalance, setOpeningBalance] = useState(0);

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
        console.error("[ShiftClose] dailyReports load failed, using defaults:", err);
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
        console.error("[ShiftClose] transactions/movements load failed:", err);
      }
      setOpeningBalance(lastFloat);
    }
    load().catch(console.error);
  }, []);

  const employeeOptions = employees.map((e) => ({
    value: e.id,
    label: e.name,
  }));

  // === SYSTEM VALUES ===
  const systemCash = calcSystemCash(transactions);
  const expectedCash = calcExpectedCash(openingBalance, systemCash, movements);

  // === FORM VALUES ===
  const previousTerminalTotal = terminalChecks.reduce((sum, tc) => sum + tc.terminalAmount, 0);
  const terminalVal = Number(form.values.terminalAmount) || 0;
  const totalTerminal = previousTerminalTotal + terminalVal;
  const floatVal = Number(form.values.floatAmount) || 0;
  const envelopeVal = Number(form.values.envelopeAmount) || 0;
  const actualCash = floatVal + envelopeVal;
  const expectedCashOnly = expectedCash - totalTerminal;
  const difference = actualCash - expectedCashOnly;

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
        terminalAmount: totalTerminal,
        expectedVouchers: 0,
        actualVouchersValue: 0,
        floatAmount: floatVal,
        depositAmount: envelopeVal,
        difference,
        voucherDifference: 0,
      });
      await db.cashMovements.create({
        type: "shift_close",
        employeeId: form.values.closingEmployee,
        amount: envelopeVal,
        description: `Zamknięcie zmiany (koperta: ${envelopeVal} zł, drobne: ${floatVal} zł${totalTerminal > 0 ? `, terminal: ${totalTerminal} zł` : ""})`,
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
                <Text fz="xs">Łączna sprzedaż:</Text>
                <Text fz="xs" fw={600}>
                  {expectedCash.toLocaleString("pl-PL")} zł
                </Text>
              </Group>
              {totalTerminal > 0 && (
                <Group justify="space-between" mb={4}>
                  <Text fz="xs">Terminal (karty/blik):</Text>
                  <Text fz="xs" fw={600}>
                    {totalTerminal.toLocaleString("pl-PL")} zł
                  </Text>
                </Group>
              )}
              <Group justify="space-between" mb={4}>
                <Text fz="xs">Oczekiwana gotówka:</Text>
                <Text fz="xs" fw={600}>
                  {expectedCashOnly.toLocaleString("pl-PL")} zł
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
                size="lg"
                leftSection={<IconPrinter size={18} />}
                onClick={() => window.print()}
              >
                Drukuj raport
              </Button>
              <Button size="lg" onClick={() => navigate("/")}>
                Powrót do ekranu głównego
              </Button>
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
              <Divider />
              <div>
                <Text fz="sm" fw={700}>
                  Łączna sprzedaż (system):
                </Text>
                <Text fz="lg" fw={700} c="green" lh={1.2}>
                  {expectedCash.toLocaleString("pl-PL")} zł
                </Text>
              </div>
              {totalTerminal > 0 && (
                <div>
                  <Text fz="sm" fw={700}>
                    Oczekiwana gotówka w kasie:
                  </Text>
                  <Text fz="lg" fw={700} c="blue" lh={1.2}>
                    {expectedCashOnly.toLocaleString("pl-PL")} zł
                  </Text>
                </div>
              )}
            </Stack>

            {/* KROK 3: Inputy fryzjera */}
            <Divider mt="sm" />
            <Stack gap="sm" py="sm">
              <Text fz="xs" c="var(--mantine-color-text)" tt="uppercase" lts={1}>
                Raport terminala
              </Text>

              {previousTerminalTotal > 0 && (
                <Box
                  p="sm"
                  style={{
                    borderRadius: "var(--mantine-radius-md)",
                    backgroundColor: "var(--mantine-color-blue-light)",
                  }}
                >
                  <Text fz="xs" c="dimmed">
                    Wcześniejsze raporty terminala (zsumowane)
                  </Text>
                  <Text fw={700} fz="md" c="blue">
                    {previousTerminalTotal.toLocaleString("pl-PL")} zł
                  </Text>
                </Box>
              )}

              <NumberInput
                label="Kwota z bieżącego raportu terminala"
                description="Kwota od ostatniego sprawdzenia (terminal raportuje przyrostowo)"
                placeholder="0"
                min={0}
                suffix=" zł"
                size="lg"
                {...form.getInputProps("terminalAmount")}
              />

              <Divider />
              <Text fz="xs" c="var(--mantine-color-text)" tt="uppercase" lts={1}>
                Stan gotówki w kasie
              </Text>

              <NumberInput
                label="Drobne na jutro"
                description="Pogotowie kasowe zostawiane w szufladzie na start kolejnego dnia"
                placeholder="0"
                min={0}
                suffix=" zł"
                size="lg"
                {...form.getInputProps("floatAmount")}
              />

              <NumberInput
                label="Do koperty"
                description="Utarg gotówkowy wyciągnięty z kasy dla szefa"
                placeholder="0"
                min={0}
                suffix=" zł"
                size="lg"
                {...form.getInputProps("envelopeAmount")}
              />
            </Stack>

            {/* KROK 4: Weryfikacja na zywo */}
            {(form.values.floatAmount !== "" || form.values.envelopeAmount !== "") && (
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
          bottom: BOTTOM_NAV_HEIGHT,
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
            leftSection={<IconCheck size={20} />}
            fz="md"
            fw={600}
          >
            Zamknij zmianę
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
            {totalTerminal > 0 && (
              <>
                {" "}
                Terminal:{" "}
                <Text span fw={700}>
                  {totalTerminal.toLocaleString("pl-PL")} zł
                </Text>
                .
              </>
            )}
          </Text>
          {difference !== 0 && (
            <Text fz="sm" c={difference > 0 ? "blue" : "red"}>
              {difference < 0
                ? `Manko: ${difference.toLocaleString("pl-PL")} zł`
                : `Nadwyżka: +${difference.toLocaleString("pl-PL")} zł`}
            </Text>
          )}
          <Group justify="flex-end">
            <Button variant="subtle" size="lg" onClick={() => setConfirmModal(false)}>
              Anuluj
            </Button>
            <Button color="green" size="lg" onClick={handleConfirm} loading={isSubmitting}>
              Potwierdzam
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
