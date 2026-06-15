import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router";
import { useForm } from "@mantine/form";
import { db } from "@/db";
import { useEmployees } from "@/hooks/useDbData";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
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
import { IconPrinter, IconCheck, IconEye } from "@tabler/icons-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionLabel } from "@/components/layout/SectionLabel";
import { BOTTOM_NAV_HEIGHT } from "@/components/layout/BottomNavBar";
import { useDeviceRole } from "@/contexts/DeviceContext";

export default function ShiftClosePage(): React.JSX.Element {
  useDocumentTitle("Zamknięcie zmiany");
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
  const [labelPreview, setLabelPreview] = useState(false);

  const { data: employees = [] } = useEmployees();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [terminalChecks, setTerminalChecks] = useState<TerminalCheck[]>([]);
  const [openingBalance, setOpeningBalance] = useState(0);
  const [lastClosedAt, setLastClosedAt] = useState<string | null>(null);
  const [balanceClearedAt, setBalanceClearedAt] = useState<string | null>(null);
  const [priorBalance, setPriorBalance] = useState(0);

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
      setLastClosedAt(since);
      try {
        const salon = await db.salon.get();
        setBalanceClearedAt(salon.balanceClearedAt);
        setPriorBalance(await db.dailyReports.getBalanceSince(salon.balanceClearedAt));
      } catch (err) {
        console.error("[ShiftClose] balance load failed:", err);
      }
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
  const periodBalance = priorBalance + difference;
  const balanceClearedLabel = balanceClearedAt
    ? new Date(balanceClearedAt).toLocaleDateString("pl-PL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : null;

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
        description: `Zamknięcie zmiany (koperta: ${envelopeVal} zł, drobne: ${floatVal} zł${totalTerminal > 0 ? `, terminal: ${totalTerminal} zł` : ""}) · ${difference === 0 ? "OK" : difference > 0 ? `nadwyżka ${difference.toLocaleString("pl-PL")} zł` : `manko ${Math.abs(difference).toLocaleString("pl-PL")} zł`}`,
      });
      setConfirmModal(false);
      setDone(true);
      if (navigator.vibrate) navigator.vibrate(100);
    } catch (err) {
      console.error("[ShiftClose] Save failed:", err);
      setIsSubmitting(false);
    }
  };

  // === SHARED: label preview modal (dostepny i w formularzu, i po zamknieciu) ===
  const lastClosedLabel = lastClosedAt
    ? new Date(lastClosedAt).toLocaleString("pl-PL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "pierwsza zmiana";

  const labelContent = (
    <>
      <div style={{ marginBottom: 3 }}>
        FORMEN · {new Date().toLocaleDateString("pl-PL")}{" "}
        {new Date().toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })} ·{" "}
        {closingName}
      </div>
      <div style={{ marginBottom: 3 }}>Od: {lastClosedLabel}</div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
        <span>Laczna sprzedaz:</span>
        <span>{systemCash.toLocaleString("pl-PL")} zl</span>
      </div>
      {totalTerminal > 0 && (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
          <span>Terminal:</span>
          <span>{totalTerminal.toLocaleString("pl-PL")} zl</span>
        </div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
        <span>Oczekiwana gotowka:</span>
        <span>{expectedCashOnly.toLocaleString("pl-PL")} zl</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
        <span>Drobne na jutro:</span>
        <span>{floatVal.toLocaleString("pl-PL")} zl</span>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
        <span>Do koperty:</span>
        <span>{envelopeVal.toLocaleString("pl-PL")} zl</span>
      </div>
      {difference !== 0 && (
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span>Roznica:</span>
          <span>
            {difference > 0 ? "+" : ""}
            {difference.toLocaleString("pl-PL")} zl {difference > 0 ? "(nadwyzka)" : "(manko)"}
          </span>
        </div>
      )}
    </>
  );

  const labelPreviewModal = (
    <Modal
      opened={labelPreview}
      onClose={() => setLabelPreview(false)}
      title="Podgląd etykiety 100×60mm"
      size="auto"
      centered
    >
      <Box
        style={{
          width: 378,
          height: 227,
          fontFamily: "monospace",
          fontSize: 15,
          lineHeight: 1.35,
          padding: "8px 8px 0 19px",
          border: "2px dashed var(--mantine-color-dimmed)",
          background: "white",
          color: "black",
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        {labelContent}
      </Box>
    </Modal>
  );

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

            {/* Receipt — widok na ekranie */}
            <Box
              w="100%"
              p={8}
              style={{
                borderRadius: "var(--mantine-radius-md)",
                border: "1px solid var(--mantine-color-default-border)",
                fontFamily: "monospace",
              }}
            >
              <Text fz="xs" ta="center" c="dimmed" mb={2}>
                FORMEN · {new Date().toLocaleDateString("pl-PL")}{" "}
                {new Date().toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })} ·{" "}
                {closingName}
              </Text>
              <Text fz="xs" c="dimmed" mb={4}>
                Od: {lastClosedLabel}
              </Text>
              <Group justify="space-between" mb={2}>
                <Text fz="xs">Łączna sprzedaż:</Text>
                <Text fz="xs" fw={600}>
                  {systemCash.toLocaleString("pl-PL")} zł
                </Text>
              </Group>
              {totalTerminal > 0 && (
                <Group justify="space-between" mb={2}>
                  <Text fz="xs">Terminal:</Text>
                  <Text fz="xs" fw={600}>
                    {totalTerminal.toLocaleString("pl-PL")} zł
                  </Text>
                </Group>
              )}
              <Group justify="space-between" mb={2}>
                <Text fz="xs">Oczekiwana gotówka:</Text>
                <Text fz="xs" fw={600}>
                  {expectedCashOnly.toLocaleString("pl-PL")} zł
                </Text>
              </Group>
              <Group justify="space-between" mb={2}>
                <Text fz="xs">Drobne na jutro:</Text>
                <Text fz="xs" fw={600}>
                  {floatVal.toLocaleString("pl-PL")} zł
                </Text>
              </Group>
              <Group justify="space-between" mb={2}>
                <Text fz="xs">Do koperty:</Text>
                <Text fz="xs" fw={600}>
                  {envelopeVal.toLocaleString("pl-PL")} zł
                </Text>
              </Group>
              {difference !== 0 && (
                <Group justify="space-between" mb={2}>
                  <Text fz="xs">Różnica:</Text>
                  <Text fz="xs" fw={600} c={difference > 0 ? "blue" : "red"}>
                    {difference > 0 ? "+" : ""}
                    {difference.toLocaleString("pl-PL")} zł
                    {difference > 0 ? " (nadwyżka)" : " (manko)"}
                  </Text>
                </Group>
              )}
            </Box>

            {/* Receipt portal — drukowany poza #root, gwarantuje 1 etykiete */}
            {createPortal(
              <div data-print-area style={{ fontFamily: "monospace" }}>
                {labelContent}
              </div>,
              document.body
            )}

            <Group>
              <Button
                color="green"
                size="lg"
                leftSection={<IconPrinter size={18} />}
                onClick={() => window.print()}
              >
                Drukuj raport
              </Button>
              <Button
                variant="outline"
                size="lg"
                leftSection={<IconEye size={18} />}
                onClick={() => setLabelPreview(true)}
              >
                Podgląd
              </Button>
              <Button color="dark" size="lg" onClick={() => navigate("/")}>
                Powrót
              </Button>
            </Group>
          </Stack>
        </Container>
        {labelPreviewModal}
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
              <SectionLabel>Podgląd systemowy</SectionLabel>
              <Divider />
              <div>
                <Text fz="sm" fw={700}>
                  Łączna sprzedaż (system):
                </Text>
                <Text fz="lg" fw={700} c="green" lh={1.2}>
                  {systemCash.toLocaleString("pl-PL")} zł
                </Text>
              </div>
              <div>
                <Text fz="sm" fw={700}>
                  Oczekiwana gotówka w kasie:
                </Text>
                <Text fz="lg" fw={700} c="blue" lh={1.2}>
                  {expectedCashOnly.toLocaleString("pl-PL")} zł
                </Text>
              </div>
            </Stack>

            {/* KROK 3: Inputy fryzjera */}
            <Divider mt="sm" />
            <Stack gap="sm" py="sm">
              <SectionLabel>Rozliczenie terminala</SectionLabel>

              {previousTerminalTotal > 0 && (
                <Box
                  p="sm"
                  style={{
                    borderRadius: "var(--mantine-radius-md)",
                    backgroundColor: "var(--mantine-color-blue-light)",
                  }}
                >
                  <Text fz="xs" c="dimmed">
                    Wcześniejsze raporty z terminala (zsumowane)
                  </Text>
                  <Text fw={700} fz="md" c="blue">
                    {previousTerminalTotal.toLocaleString("pl-PL")} zł
                  </Text>
                </Box>
              )}

              <NumberInput
                label="Kwota z bieżącego rozliczenia terminala"
                description="Administracja → Rozliczenie dnia na terminalu"
                placeholder="0"
                min={0}
                suffix=" zł"
                size="lg"
                onFocus={(event) => event.currentTarget.select()}
                {...form.getInputProps("terminalAmount")}
              />

              <Divider />
              <SectionLabel>Stan gotówki w kasie</SectionLabel>

              <NumberInput
                label="Drobne na jutro"
                description="Drobne zostawione w kasie na jutro"
                placeholder="0"
                min={0}
                suffix=" zł"
                size="lg"
                onFocus={(event) => event.currentTarget.select()}
                {...form.getInputProps("floatAmount")}
              />

              <NumberInput
                label="Do koperty"
                description="Utarg gotówkowy wyciągnięty z kasy dla szefa"
                placeholder="0"
                min={0}
                suffix=" zł"
                size="lg"
                onFocus={(event) => event.currentTarget.select()}
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
                    <Divider w="100%" />
                    <div style={{ textAlign: "center" }}>
                      <Text fz="sm" fw={700}>
                        Bilans (suma nadpłata/manko):
                      </Text>
                      <Text fz="lg" fw={700} c={periodBalance < 0 ? "red" : "green"} lh={1.2}>
                        {periodBalance > 0 ? "+" : ""}
                        {periodBalance.toLocaleString("pl-PL")} zł
                      </Text>
                      <Text fz="xs" c="dimmed">
                        {balanceClearedLabel ? `od: ${balanceClearedLabel}` : "od początku"}
                      </Text>
                    </div>
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
          <Group gap="sm">
            <Button
              style={{ flex: 1 }}
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
            <Button
              size="lg"
              variant="outline"
              leftSection={<IconEye size={18} />}
              onClick={() => setLabelPreview(true)}
              title="Podgląd etykiety wydruku"
            >
              Podgląd
            </Button>
          </Group>
        </Container>
      </Box>

      {labelPreviewModal}

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
              Potwierdź
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
