"use client";

import { useState, useId } from "react";
import { useRouter } from "next/navigation";
import { mockEmployees } from "@/data/employees";
import {
  Text,
  Group,
  Stack,
  Box,
  Container,
  ActionIcon,
  Divider,
  SegmentedControl,
  Button,
  NumberInput,
  TextInput,
  Select,
  Modal,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconCash,
  IconReceipt,
  IconPlus,
  IconHandGrab,
  IconArrowDown,
  IconArrowUp,
  IconGift,
  IconCheck,
} from "@tabler/icons-react";

interface CashMovement {
  id: string;
  type:
    | "tip_withdrawal"
    | "expense_take"
    | "expense_settle"
    | "top_up"
    | "barber_loan"
    | "barber_payback"
    | "voucher_sale";
  employeeName: string;
  amount: number;
  description: string;
  timestamp: string;
  status?: "pending" | "settled";
  finalCost?: number;
}

export default function CashPage() {
  const router = useRouter();
  const tabsId = useId();
  const paymentId = useId();
  const [tab, setTab] = useState("tips");

  // Top-up (Cash In)
  const [topUpAmount, setTopUpAmount] = useState<number | string>("");
  const [topUpReason, setTopUpReason] = useState("Zasilenie (drobne od szefa)");

  // Barber loan
  const [loanEmployee, setLoanEmployee] = useState<string | null>(null);
  const [loanAmount, setLoanAmount] = useState<number | string>("");
  const [movements, setMovements] = useState<CashMovement[]>([]);

  // Tip withdrawal
  const [tipEmployee, setTipEmployee] = useState<string | null>(null);
  const [tipAmount, setTipAmount] = useState<number | string>("");

  // Expense - take
  const [expenseAmount, setExpenseAmount] = useState<number | string>("");
  const [expenseDesc, setExpenseDesc] = useState("");
  const [expenseEmployee, setExpenseEmployee] = useState<string | null>(null);

  // Expense - settle
  const [settleModal, setSettleModal] = useState(false);
  const [settleTarget, setSettleTarget] = useState<CashMovement | null>(null);
  const [settleCost, setSettleCost] = useState<number | string>("");

  // Voucher sale
  const [voucherValue, setVoucherValue] = useState<number | string>("");
  const [voucherPayment, setVoucherPayment] = useState("cash");
  const [voucherSuccess, setVoucherSuccess] = useState(false);
  const [voucherCode, setVoucherCode] = useState("");

  // Success feedback
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const employeeOptions = mockEmployees.map((e) => ({
    value: e.id,
    label: e.name,
  }));

  const pendingExpenses = movements.filter(
    (m) => m.type === "expense_take" && m.status === "pending"
  );

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleTipWithdrawal = () => {
    const amount = Number(tipAmount);
    if (!tipEmployee || !amount || amount <= 0) return;
    const emp = mockEmployees.find((e) => e.id === tipEmployee);
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
    setTipEmployee(null);
    setTipAmount("");
    showSuccess(`Wypłacono ${amount} zł napiwków dla ${emp.name}`);
  };

  const handleExpenseTake = () => {
    const amount = Number(expenseAmount);
    if (!expenseEmployee || !amount || amount <= 0) return;
    const emp = mockEmployees.find((e) => e.id === expenseEmployee);
    if (!emp) return;

    setMovements((prev) => [
      {
        id: `cm${Date.now()}`,
        type: "expense_take",
        employeeName: emp.name,
        amount,
        description: expenseDesc || "Zakupy salonowe",
        timestamp: new Date().toISOString(),
        status: "pending",
      },
      ...prev,
    ]);
    setExpenseEmployee(null);
    setExpenseAmount("");
    setExpenseDesc("");
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

  const handleTopUp = () => {
    const amount = Number(topUpAmount);
    if (!amount || amount <= 0) return;

    setMovements((prev) => [
      {
        id: `cm${Date.now()}`,
        type: "top_up",
        employeeName: "Szef",
        amount,
        description: topUpReason,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);
    setTopUpAmount("");
    showSuccess(`Wpłacono ${amount} zł do kasy`);
  };

  const handleBarberLoan = () => {
    const amount = Number(loanAmount);
    if (!loanEmployee || !amount || amount <= 0) return;
    const emp = mockEmployees.find((e) => e.id === loanEmployee);
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
    setLoanEmployee(null);
    setLoanAmount("");
    showSuccess(`Zarejestrowano dług kasetki: ${amount} zł dla ${emp.name}`);
  };

  const handleBarberPayback = (loan: CashMovement) => {
    setMovements((prev) =>
      prev.map((m) =>
        m.id === loan.id
          ? {
              ...m,
              type: "barber_payback" as const,
              status: "settled" as const,
              description: "Zwrot za resztę (rozliczono)",
            }
          : m
      )
    );
    showSuccess(`Zwrócono ${loan.amount} zł dla ${loan.employeeName}`);
  };

  const handleVoucherSale = () => {
    const amount = Number(voucherValue);
    if (!amount || amount <= 0) return;

    const code = `BON-${Date.now().toString(36).toUpperCase()}`;
    setVoucherCode(code);

    setMovements((prev) => [
      {
        id: `cm${Date.now()}`,
        type: "voucher_sale",
        employeeName: "Salon",
        amount,
        description: `Sprzedaż bonu ${code} (${voucherPayment === "cash" ? "gotówka" : "karta"})`,
        timestamp: new Date().toISOString(),
      },
      ...prev,
    ]);

    setVoucherSuccess(true);
  };

  const resetVoucher = () => {
    setVoucherValue("");
    setVoucherPayment("cash");
    setVoucherSuccess(false);
    setVoucherCode("");
  };

  const pendingLoans = movements.filter((m) => m.type === "barber_loan" && m.status === "pending");

  return (
    <Box mih="100vh" pb={40}>
      <Container size="lg">
        {/* ===== HEADER ===== */}
        <Group py="md" gap="sm">
          <ActionIcon variant="subtle" color="gray" size="lg" onClick={() => router.push("/")}>
            <IconArrowLeft size={22} />
          </ActionIcon>
          <Text fw={700} fz={24}>
            Ruchy kasowe
          </Text>
        </Group>

        <Divider />

        {/* ===== TABS ===== */}
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

        {/* ===== SUCCESS MESSAGE ===== */}
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

        {/* ===== TIPS TAB ===== */}
        {tab === "tips" && (
          <Stack gap="md" py="md">
            <div>
              <Text fz="xs" c="var(--mantine-color-text)" tt="uppercase" lts={1} mb="xs">
                Wypłata napiwków
              </Text>
              <Text fz="sm" mb="md">
                Fryzjer pobiera zgromadzone napiwki z kasetki.
              </Text>
            </div>

            <Select
              label="Pracownik"
              placeholder="Wybierz..."
              data={employeeOptions}
              value={tipEmployee}
              onChange={setTipEmployee}
            />

            {tipEmployee &&
              (() => {
                const emp = mockEmployees.find((e) => e.id === tipEmployee);
                return emp ? (
                  <Box
                    p="md"
                    style={{
                      borderRadius: "var(--mantine-radius-md)",
                      border: "1px solid var(--mantine-color-default-border)",
                    }}
                  >
                    <Text fz="xs" c="dimmed">
                      Dostępne napiwki · {emp.name}
                    </Text>
                    <Text fw={700} fz={28}>
                      {emp.tipBalance.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł
                    </Text>
                  </Box>
                ) : null;
              })()}

            <NumberInput
              label="Kwota do wypłaty"
              placeholder="0"
              value={tipAmount}
              onChange={setTipAmount}
              min={0}
              max={mockEmployees.find((e) => e.id === tipEmployee)?.tipBalance ?? 0}
              suffix=" zł"
              size="md"
            />

            <Button
              size="lg"
              color="green"
              fullWidth
              disabled={!tipEmployee || !Number(tipAmount)}
              onClick={handleTipWithdrawal}
              leftSection={<IconCash size={20} />}
            >
              Potwierdź wypłatę
            </Button>
          </Stack>
        )}

        {/* ===== EXPENSES TAB ===== */}
        {tab === "expenses" && (
          <Stack gap="md" py="md">
            {/* Pending expenses to settle */}
            {pendingExpenses.length > 0 && (
              <>
                <Text fz="xs" c="var(--mantine-color-text)" tt="uppercase" lts={1}>
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
                          size="xs"
                          onClick={() => {
                            setSettleTarget(exp);
                            setSettleCost("");
                            setSettleModal(true);
                          }}
                          leftSection={<IconReceipt size={14} />}
                        >
                          Rozlicz
                        </Button>
                      </Group>
                      {index < pendingExpenses.length - 1 && <Divider />}
                    </div>
                  ))}
                </Stack>
                <Divider />
              </>
            )}

            {/* New expense */}
            <Text fz="xs" c="var(--mantine-color-text)" tt="uppercase" lts={1}>
              Pobierz na zakupy
            </Text>
            <Text fz="sm">Pracownik pobiera gotówkę z kasetki na zakupy salonowe.</Text>

            <Select
              label="Pracownik"
              placeholder="Wybierz..."
              data={employeeOptions}
              value={expenseEmployee}
              onChange={setExpenseEmployee}
            />

            <NumberInput
              label="Kwota"
              placeholder="0"
              value={expenseAmount}
              onChange={setExpenseAmount}
              min={0}
              suffix=" zł"
              size="md"
            />

            <TextInput
              label="Cel (opcjonalnie)"
              placeholder="np. Środki czystości"
              value={expenseDesc}
              onChange={(e) => setExpenseDesc(e.currentTarget.value)}
            />

            <Button
              size="lg"
              fullWidth
              disabled={!expenseEmployee || !Number(expenseAmount)}
              onClick={handleExpenseTake}
              leftSection={<IconCash size={20} />}
            >
              Pobierz z kasy
            </Button>
          </Stack>
        )}

        {/* ===== TOP-UP TAB ===== */}
        {tab === "topup" && (
          <Stack gap="md" py="md">
            <div>
              <Text fz="xs" c="var(--mantine-color-text)" tt="uppercase" lts={1} mb="xs">
                Wpłata do kasy
              </Text>
              <Text fz="sm" mb="md">
                Zasilenie kasetki gotówką (np. drobne od szefa).
              </Text>
            </div>

            <Select
              label="Powód"
              data={[
                { value: "Zasilenie (drobne od szefa)", label: "Zasilenie (drobne od szefa)" },
                { value: "Inne", label: "Inne" },
              ]}
              value={topUpReason}
              onChange={(v) => setTopUpReason(v ?? "Zasilenie (drobne od szefa)")}
            />

            <NumberInput
              label="Kwota"
              placeholder="0"
              value={topUpAmount}
              onChange={setTopUpAmount}
              min={0}
              suffix=" zł"
              size="md"
            />

            <Button
              size="lg"
              color="green"
              fullWidth
              disabled={!Number(topUpAmount)}
              onClick={handleTopUp}
              leftSection={<IconPlus size={20} />}
            >
              Wpłać do kasy
            </Button>
          </Stack>
        )}

        {/* ===== LOAN TAB ===== */}
        {tab === "loan" && (
          <Stack gap="md" py="md">
            {/* Pending loans to pay back */}
            {pendingLoans.length > 0 && (
              <>
                <Text fz="xs" c="var(--mantine-color-text)" tt="uppercase" lts={1}>
                  Do zwrotu
                </Text>
                <Stack gap={0}>
                  {pendingLoans.map((loan, index) => (
                    <div key={loan.id}>
                      <Group justify="space-between" py="sm" px="xs">
                        <div>
                          <Text fw={500} fz="md">
                            {loan.employeeName}
                          </Text>
                          <Text fz="xs" c="dimmed">
                            Wydał z własnych · {loan.amount.toLocaleString("pl-PL")} zł
                          </Text>
                        </div>
                        <Button
                          variant="light"
                          color="green"
                          size="xs"
                          onClick={() => handleBarberPayback(loan)}
                          leftSection={<IconHandGrab size={14} />}
                        >
                          Zwróć
                        </Button>
                      </Group>
                      {index < pendingLoans.length - 1 && <Divider />}
                    </div>
                  ))}
                </Stack>
                <Divider />
              </>
            )}

            {/* New loan */}
            <div>
              <Text fz="xs" c="var(--mantine-color-text)" tt="uppercase" lts={1} mb="xs">
                Wydałem z własnych
              </Text>
              <Text fz="sm" mb="md">
                Fryzjer wydał resztę z kieszeni (brak drobnych w kasetce).
              </Text>
            </div>

            <Select
              label="Pracownik"
              placeholder="Wybierz..."
              data={employeeOptions}
              value={loanEmployee}
              onChange={setLoanEmployee}
            />

            <NumberInput
              label="Kwota"
              placeholder="0"
              value={loanAmount}
              onChange={setLoanAmount}
              min={0}
              suffix=" zł"
              size="md"
            />

            <Button
              size="lg"
              fullWidth
              disabled={!loanEmployee || !Number(loanAmount)}
              onClick={handleBarberLoan}
              leftSection={<IconCash size={20} />}
            >
              Zarejestruj dług kasetki
            </Button>
          </Stack>
        )}

        {/* ===== VOUCHER TAB ===== */}
        {tab === "voucher" && (
          <Stack gap="md" py="md">
            {!voucherSuccess ? (
              <>
                <div>
                  <Text fz="xs" c="var(--mantine-color-text)" tt="uppercase" lts={1} mb="xs">
                    Sprzedaż bonu podarunkowego
                  </Text>
                  <Text fz="sm" mb="md">
                    Bon nie jest przypisany do fryzjera - wpływa do kasy salonu.
                  </Text>
                </div>

                <Text fz="sm" fw={500}>
                  Szybki wybór
                </Text>
                <Group gap="sm">
                  {[50, 100, 200].map((v) => (
                    <Button
                      key={v}
                      variant={Number(voucherValue) === v ? "filled" : "light"}
                      size="md"
                      onClick={() => setVoucherValue(v)}
                      style={{ flex: 1 }}
                    >
                      {v} zł
                    </Button>
                  ))}
                </Group>

                <NumberInput
                  label="Lub wpisz kwotę"
                  placeholder="0"
                  value={voucherValue}
                  onChange={setVoucherValue}
                  min={1}
                  suffix=" zł"
                  size="md"
                />

                <SegmentedControl
                  id={paymentId}
                  fullWidth
                  value={voucherPayment}
                  onChange={setVoucherPayment}
                  data={[
                    { label: "Gotówka", value: "cash" },
                    { label: "Karta", value: "card" },
                  ]}
                />

                <Button
                  size="lg"
                  color="green"
                  fullWidth
                  disabled={!Number(voucherValue)}
                  onClick={handleVoucherSale}
                  leftSection={<IconGift size={20} />}
                >
                  Sprzedaj bon - {Number(voucherValue) || 0} zł
                </Button>
              </>
            ) : (
              <Stack align="center" gap="md" py="xl">
                <Box
                  p="md"
                  style={{
                    borderRadius: "50%",
                    backgroundColor: "var(--mantine-color-green-light)",
                  }}
                >
                  <IconCheck size={40} color="var(--mantine-color-green-filled)" />
                </Box>
                <Text fw={700} fz={24}>
                  Bon sprzedany!
                </Text>
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
                    {voucherCode}
                  </Text>
                  <Text fz="sm" c="dimmed" mt="xs">
                    Wartość: {Number(voucherValue).toLocaleString("pl-PL")} zł ·{" "}
                    {voucherPayment === "cash" ? "Gotówka" : "Karta"}
                  </Text>
                </Box>
                <Button size="lg" fullWidth variant="light" onClick={resetVoucher}>
                  Sprzedaj kolejny bon
                </Button>
              </Stack>
            )}
          </Stack>
        )}

        {/* ===== HISTORY ===== */}
        {movements.length > 0 && (
          <>
            <Divider my="md" />
            <Text fz="xs" c="var(--mantine-color-text)" tt="uppercase" lts={1} mb="sm">
              Dzisiejsze operacje
            </Text>
            <Stack gap={0}>
              {movements.map((m, index) => {
                const isOut = ["tip_withdrawal", "expense_take", "barber_payback"].includes(m.type);
                const isVoucher = m.type === "voucher_sale";
                return (
                  <div key={m.id}>
                    <Group justify="space-between" py="sm" px="xs" wrap="nowrap">
                      <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                        <Box
                          p={6}
                          style={{
                            borderRadius: "50%",
                            backgroundColor: isOut
                              ? "var(--mantine-color-red-light)"
                              : "var(--mantine-color-green-light)",
                            flexShrink: 0,
                          }}
                        >
                          {isVoucher ? (
                            <IconGift size={14} color="var(--mantine-color-green-filled)" />
                          ) : isOut ? (
                            <IconArrowUp size={14} color="var(--mantine-color-red-filled)" />
                          ) : (
                            <IconArrowDown size={14} color="var(--mantine-color-green-filled)" />
                          )}
                        </Box>
                        <div style={{ minWidth: 0 }}>
                          <Text fw={500} fz="sm" lineClamp={1}>
                            {m.description}
                            {m.status === "settled" && " (rozliczono)"}
                          </Text>
                          <Text fz="xs" c="dimmed">
                            {m.employeeName} ·{" "}
                            {new Date(m.timestamp).toLocaleTimeString("pl-PL", {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </Text>
                        </div>
                      </Group>
                      <Text
                        fw={600}
                        fz="sm"
                        c={isOut ? "red" : "green"}
                        style={{ flexShrink: 0 }}
                      >
                        {isOut ? "-" : "+"}
                        {(m.finalCost ?? m.amount).toLocaleString("pl-PL")} zł
                      </Text>
                    </Group>
                    {index < movements.length - 1 && <Divider />}
                  </div>
                );
              })}
            </Stack>
          </>
        )}
      </Container>

      {/* ===== SETTLE MODAL ===== */}
      <Modal
        opened={settleModal}
        onClose={() => setSettleModal(false)}
        title={
          <Text fw={700} fz="lg">
            Rozlicz zakupy
          </Text>
        }
        size="sm"
      >
        {settleTarget && (
          <Stack gap="md">
            <Box
              p="md"
              style={{
                borderRadius: "var(--mantine-radius-md)",
                border: "1px solid var(--mantine-color-default-border)",
              }}
            >
              <Text fz="sm" c="dimmed">
                Pobrano
              </Text>
              <Text fw={700} fz="xl">
                {settleTarget.amount.toLocaleString("pl-PL")} zł
              </Text>
              <Text fz="xs" c="dimmed">
                {settleTarget.description} · {settleTarget.employeeName}
              </Text>
            </Box>

            <NumberInput
              label="Kwota z paragonu"
              placeholder="0"
              value={settleCost}
              onChange={setSettleCost}
              min={0}
              max={settleTarget.amount}
              suffix=" zł"
              size="md"
            />

            {Number(settleCost) > 0 && (
              <Box
                p="md"
                style={{
                  borderRadius: "var(--mantine-radius-md)",
                  backgroundColor: "var(--mantine-color-green-light)",
                }}
              >
                <Text fz="sm" fw={500}>
                  Do zwrotu do kasetki:{" "}
                  <Text span fw={700}>
                    {(settleTarget.amount - Number(settleCost)).toLocaleString("pl-PL")} zł
                  </Text>
                </Text>
              </Box>
            )}

            <Button fullWidth size="lg" onClick={handleSettle}>
              Rozlicz
            </Button>
          </Stack>
        )}
      </Modal>
    </Box>
  );
}
