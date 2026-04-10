import { useState } from "react";
import { useNavigate } from "react-router";
import { useForm } from "@mantine/form";
import { mockEmployees } from "@/data/employees";
import { mockTransactions } from "@/data/transactions";
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

  // Mock: check if shift already closed today (Phase 2: query DailyReport table)
  const [shiftClosedToday, setShiftClosedToday] = useState(false);

  const employeeOptions = mockEmployees.map((e) => ({
    value: e.id,
    label: e.name,
  }));

  // System expected values (mock)
  const systemCash = mockTransactions
    .filter((t) => t.paymentMethod === "cash")
    .reduce((sum, t) => sum + t.totalAmount, 0);

  const systemCard = mockTransactions
    .filter((t) => t.paymentMethod === "card")
    .reduce((sum, t) => sum + t.totalAmount, 0);

  const systemBlik = mockTransactions
    .filter((t) => t.paymentMethod === "blik")
    .reduce((sum, t) => sum + t.totalAmount, 0);

  const systemVoucher = mockTransactions
    .filter((t) => t.paymentMethod === "voucher")
    .reduce((sum, t) => sum + t.totalAmount, 0);

  const systemSplit = mockTransactions
    .filter((t) => t.paymentMethod === "split")
    .reduce((sum, t) => sum + t.totalAmount, 0);

  const systemTotal = mockTransactions.reduce((sum, t) => sum + t.totalAmount, 0);

  const cash = Number(form.values.cashAmount) || 0;
  const vouchers = Number(form.values.vouchersAmount) || 0;
  const floatVal = Number(form.values.floatAmount) || 0;

  const deposit = Math.max(0, cash - floatVal) + vouchers;
  const difference = cash - systemCash;

  const closingName = form.values.closingEmployee
    ? mockEmployees.find((e) => e.id === form.values.closingEmployee)?.name
    : null;

  const handleConfirm = () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setConfirmModal(false);
    setShiftClosedToday(true);
    setDone(true);
    if (navigator.vibrate) navigator.vibrate(100);
  };

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
              Raport dobowy gotowy. Zamykał: {closingName}
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
                RAPORT DOBOWY
              </Text>
              <Text fz="xs" ta="center" c="dimmed" mb="md">
                {new Date().toLocaleDateString("pl-PL")},{" "}
                {new Date().toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })} ·
                Zamykał: {closingName}
              </Text>
              <Divider mb="sm" variant="dashed" />
              <Group justify="space-between" mb={4}>
                <Text fz="xs">Gotówka:</Text>
                <Text fz="xs" fw={600}>
                  {cash.toLocaleString("pl-PL")} zł
                </Text>
              </Group>
              <Group justify="space-between" mb={4}>
                <Text fz="xs">Bony papierowe:</Text>
                <Text fz="xs" fw={600}>
                  {vouchers.toLocaleString("pl-PL")} zł
                </Text>
              </Group>
              <Group justify="space-between" mb={4}>
                <Text fz="xs">Drobne na jutro:</Text>
                <Text fz="xs" fw={600}>
                  {floatVal.toLocaleString("pl-PL")} zł
                </Text>
              </Group>
              <Divider my="sm" variant="dashed" />
              <Group justify="space-between" mb={4}>
                <Text fz="sm" fw={700}>
                  DO KOPERTY:
                </Text>
                <Text fz="sm" fw={700}>
                  {deposit.toLocaleString("pl-PL")} zł
                </Text>
              </Group>
              <Group justify="space-between">
                <Text fz="xs">Różnica:</Text>
                <Text
                  fz="xs"
                  fw={600}
                  c={difference === 0 ? "green" : difference > 0 ? "blue" : "red"}
                >
                  {difference > 0 ? "+" : ""}
                  {difference.toLocaleString("pl-PL")} zł
                  {difference > 0 ? " (nadwyżka)" : difference < 0 ? " (brak)" : " (OK)"}
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

  if (shiftClosedToday && !done) {
    return (
      <Box mih="100vh">
        <Container size="sm">
          <Stack align="center" gap="lg" py={80}>
            <Box
              p="lg"
              style={{
                borderRadius: "50%",
                backgroundColor: "var(--mantine-color-yellow-light)",
              }}
            >
              <IconPrinter size={48} color="var(--mantine-color-yellow-filled)" />
            </Box>
            <Text fw={700} fz={24} ta="center">
              Zmiana już zamknięta
            </Text>
            <Text fz="sm" ta="center" c="dimmed">
              Dzisiejsza zmiana została już zamknięta. Nie można zamknąć zmiany ponownie.
            </Text>
            <Button onClick={() => navigate("/")}>Powrót do ekranu głównego</Button>
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
            Podsumowanie systemowe
          </Text>
          <Stack gap={4}>
            <Group justify="space-between">
              <Text fz="sm">Sprzedaż gotówka:</Text>
              <Text fz="sm" fw={600}>
                {systemCash.toLocaleString("pl-PL")} zł
              </Text>
            </Group>
            <Group justify="space-between">
              <Text fz="sm">Sprzedaż karta/BLIK:</Text>
              <Text fz="sm" fw={600}>
                {(systemCard + systemBlik).toLocaleString("pl-PL")} zł
              </Text>
            </Group>
            <Group justify="space-between">
              <Text fz="sm">Sprzedaż bon (fizyczne bony):</Text>
              <Text fz="sm" fw={600}>
                {systemVoucher.toLocaleString("pl-PL")} zł
              </Text>
            </Group>
            {systemSplit > 0 && (
              <Group justify="space-between">
                <Text fz="sm">Sprzedaż split (gotówka + karta):</Text>
                <Text fz="sm" fw={600}>
                  {systemSplit.toLocaleString("pl-PL")} zł
                </Text>
              </Group>
            )}
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
            description="Suma wartości papierowych bonów"
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
              <Group justify="space-between">
                <Text fz="sm" c="dimmed">
                  Różnica (policzone a system):
                </Text>
                <Text
                  fz="sm"
                  fw={600}
                  c={difference === 0 ? "green" : difference > 0 ? "blue" : "red"}
                >
                  {difference > 0 ? "+" : ""}
                  {difference.toLocaleString("pl-PL")} zł
                  {difference > 0 ? " (nadwyżka)" : difference < 0 ? " (brak)" : ""}
                </Text>
              </Group>
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
          {difference !== 0 && (
            <Text fz="sm" c={difference > 0 ? "blue" : "red"}>
              Różnica kasowa: {difference > 0 ? "+" : ""}
              {difference.toLocaleString("pl-PL")} zł
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
