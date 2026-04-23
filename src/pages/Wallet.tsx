import { useState, useEffect, useCallback } from "react";
import { useEmployees } from "@/hooks/useDbData";
import { db } from "@/db";
import type { Employee, CashMovement } from "@/lib/types";
import {
  Text,
  Group,
  Stack,
  Box,
  Container,
  Divider,
  Button,
  Avatar,
  UnstyledButton,
  NumberInput,
} from "@mantine/core";
import { IconCash, IconChevronRight } from "@tabler/icons-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useDeviceRole } from "@/contexts/DeviceContext";
import { BOTTOM_NAV_HEIGHT, PAGE_BOTTOM_PADDING } from "@/components/layout/BottomNavBar";
import { notifications } from "@mantine/notifications";

export default function WalletPage(): React.JSX.Element {
  const { data: employees = [], refetch } = useEmployees();
  const { isPersonal, lockedEmployeeId } = useDeviceRole();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [movements, setMovements] = useState<CashMovement[]>([]);
  const [withdrawAmount, setWithdrawAmount] = useState<number | string>("");
  const [submitting, setSubmitting] = useState(false);

  const lockedEmployee = lockedEmployeeId ? employees.find((e) => e.id === lockedEmployeeId) : null;

  const activeId = lockedEmployeeId ?? selectedId;
  const activeEmployee = employees.find((e) => e.id === activeId);

  useEffect(() => {
    async function loadMovements(): Promise<void> {
      const since = await db.dailyReports.getLastClosedAt();
      const mvs = await db.cashMovements.getSince(since);
      setMovements(mvs);
    }
    loadMovements().catch(console.error);
  }, []);

  const employeeMovements = activeEmployee
    ? movements.filter(
        (m) =>
          m.employeeName === activeEmployee.name &&
          (m.type === "tip_withdrawal" || m.type === "own_cash_deposit")
      )
    : [];

  const handleWithdraw = useCallback(
    async (employee: Employee, amount: number) => {
      setSubmitting(true);
      try {
        const movement = await db.cashMovements.create({
          type: "tip_withdrawal",
          employeeId: employee.id,
          amount,
          description: "Wypłata z portfela",
        });
        setMovements((prev) => [movement, ...prev]);
        setWithdrawAmount("");
        refetch();
        notifications.show({
          message: `Wypłacono ${amount} zł dla ${employee.name}`,
          color: "green",
        });
      } catch (err) {
        console.error("[Wallet] Withdrawal failed:", err);
        notifications.show({ message: "Błąd wypłaty z portfela", color: "red" });
      } finally {
        setSubmitting(false);
      }
    },
    [refetch]
  );

  const setQuickAmount = (amount: number) => {
    setWithdrawAmount(amount);
  };

  if (isPersonal && lockedEmployee) {
    return (
      <Box mih="100vh" pb={PAGE_BOTTOM_PADDING}>
        <Container size="lg">
          <PageHeader title="Napiwki" hideBack />
          <Divider />
          <WorkerDetail
            employee={lockedEmployee}
            movements={employeeMovements}
            withdrawAmount={withdrawAmount}
            setWithdrawAmount={setWithdrawAmount}
            setQuickAmount={setQuickAmount}
            onWithdraw={handleWithdraw}
            submitting={submitting}
          />
        </Container>
      </Box>
    );
  }

  if (activeEmployee) {
    return (
      <Box mih="100vh" pb={PAGE_BOTTOM_PADDING}>
        <Container size="lg">
          <PageHeader
            title={activeEmployee.name}
            onBack={() => {
              setSelectedId(null);
              setWithdrawAmount("");
            }}
          />
          <Divider />
          <WorkerDetail
            employee={activeEmployee}
            movements={employeeMovements}
            withdrawAmount={withdrawAmount}
            setWithdrawAmount={setWithdrawAmount}
            setQuickAmount={setQuickAmount}
            onWithdraw={handleWithdraw}
            submitting={submitting}
          />
        </Container>
      </Box>
    );
  }

  return (
    <Box mih="100vh" pb={PAGE_BOTTOM_PADDING}>
      <Container size="lg">
        <PageHeader title="Napiwki" hideBack />
        <Divider />

        <Stack gap={0} mt="sm">
          {employees.map((emp, index) => (
            <div key={emp.id}>
              <UnstyledButton
                w="100%"
                py="sm"
                px="xs"
                onClick={() => setSelectedId(emp.id)}
                style={{ borderRadius: "var(--mantine-radius-md)" }}
              >
                <Group wrap="nowrap">
                  <Avatar size={40} radius="xl" color="green" variant="light">
                    {emp.avatar}
                  </Avatar>
                  <Box style={{ flex: 1 }}>
                    <Text fz="sm" fw={500}>
                      {emp.name}
                    </Text>
                    <Text fz="xs" c={emp.tipBalance > 0 ? "green" : "dimmed"} fw={600}>
                      {emp.tipBalance.toLocaleString("pl-PL")} zł
                    </Text>
                  </Box>
                  <IconChevronRight size={16} stroke={1.5} color="var(--mantine-color-dimmed)" />
                </Group>
              </UnstyledButton>
              {index < employees.length - 1 && <Divider />}
            </div>
          ))}
        </Stack>
      </Container>
    </Box>
  );
}

function WorkerDetail({
  employee,
  movements,
  withdrawAmount,
  setWithdrawAmount,
  setQuickAmount,
  onWithdraw,
  submitting,
}: {
  employee: Employee;
  movements: CashMovement[];
  withdrawAmount: number | string;
  setWithdrawAmount: (v: number | string) => void;
  setQuickAmount: (v: number) => void;
  onWithdraw: (employee: Employee, amount: number) => void;
  submitting: boolean;
}) {
  const balance = employee.tipBalance;
  const amount = Number(withdrawAmount) || 0;
  const canWithdraw = amount > 0 && amount <= balance;

  return (
    <Stack gap="md" py="md">
      {/* Balance card */}
      <Box
        p="lg"
        style={{
          borderRadius: "var(--mantine-radius-lg)",
          border: "2px solid var(--mantine-color-green-filled)",
          textAlign: "center",
        }}
      >
        <Text fz="xs" c="dimmed" tt="uppercase" lts={1}>
          Portfel
        </Text>
        <Text fw={700} fz={48} c="green" lh={1.1} mt={4}>
          {balance.toLocaleString("pl-PL")} zł
        </Text>
        <Text fz="xs" c="dimmed" mt={4}>
          do wypłaty z kasy
        </Text>

        {/* Quick amounts */}
        {balance > 0 && (
          <Group grow gap="sm" mt="lg">
            {balance >= 10 && (
              <Button variant="light" color="green" onClick={() => setQuickAmount(10)}>
                10 zł
              </Button>
            )}
            {balance >= 20 && (
              <Button variant="light" color="green" onClick={() => setQuickAmount(20)}>
                20 zł
              </Button>
            )}
            <Button color="green" onClick={() => setQuickAmount(balance)}>
              Całość
            </Button>
          </Group>
        )}

        {/* Amount input + withdraw button */}
        {balance > 0 && (
          <Box mt="md">
            <Text fz="xs" c="dimmed" tt="uppercase" lts={1} ta="left" mb={4}>
              Kwota do wypłaty
            </Text>
            <NumberInput
              value={withdrawAmount}
              onChange={setWithdrawAmount}
              min={0}
              max={balance}
              suffix=" zł"
              size="lg"
              styles={{
                input: {
                  textAlign: "center",
                  fontWeight: 700,
                  fontSize: "var(--mantine-font-size-xl)",
                },
              }}
            />
            <Button
              fullWidth
              size="lg"
              color="red"
              mt="md"
              disabled={!canWithdraw}
              loading={submitting}
              onClick={() => onWithdraw(employee, amount)}
              leftSection={<IconCash size={20} />}
            >
              Wypłać z kasy
            </Button>
          </Box>
        )}

        {balance === 0 && (
          <Text fz="sm" c="dimmed" mt="md">
            Brak środków do wypłaty
          </Text>
        )}
      </Box>

      {/* History */}
      {movements.length > 0 && (
        <>
          <Text fz="xs" c="dimmed" tt="uppercase" lts={1}>
            Historia
          </Text>
          <Stack gap={0}>
            {movements.map((m, index) => {
              const isWithdrawal = m.type === "tip_withdrawal";
              return (
                <div key={m.id}>
                  <Group justify="space-between" py="sm" px="xs" wrap="nowrap">
                    <div style={{ minWidth: 0 }}>
                      <Text fw={500} fz="sm" lineClamp={1}>
                        {isWithdrawal ? "Wypłata z portfela" : "Wpłata własna"}
                      </Text>
                      <Text fz="xs" c="dimmed">
                        {new Date(m.timestamp).toLocaleTimeString("pl-PL", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </div>
                    <Text
                      fw={600}
                      fz="sm"
                      c={isWithdrawal ? "red" : "green"}
                      style={{ flexShrink: 0 }}
                    >
                      {isWithdrawal ? "-" : "+"}
                      {m.amount.toLocaleString("pl-PL")} zł
                    </Text>
                  </Group>
                  {index < movements.length - 1 && <Divider />}
                </div>
              );
            })}
          </Stack>
        </>
      )}
    </Stack>
  );
}
