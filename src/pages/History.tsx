import { useState, useEffect } from "react";
import { useEmployees } from "@/hooks/useDbData";
import { db } from "@/db";
import type { Transaction } from "@/lib/types";
import {
  Text,
  Group,
  Stack,
  Box,
  UnstyledButton,
  Divider,
  Container,
  Button,
  Collapse,
  ScrollArea,
  Modal,
  PinInput,
  TextInput,
  Avatar,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import {
  IconChevronDown,
  IconChevronUp,
  IconArrowBackUp,
  IconSearch,
  IconUsers,
  IconCalendar,
} from "@tabler/icons-react";
import { MOCK_OPERATIONS_PIN } from "@/lib/constants";
import { PageHeader } from "@/components/layout/PageHeader";
import { useDeviceRole } from "@/contexts/DeviceContext";

function startOfDay(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function endOfDay(date: Date): string {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.toISOString();
}

export default function HistoryPage() {
  const { data: employees = [] } = useEmployees();
  const { isPersonal, lockedEmployeeId } = useDeviceRole();
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const [dateFrom, setDateFrom] = useState<Date | null>(new Date());
  const [dateTo, setDateTo] = useState<Date | null>(new Date());

  useEffect(() => {
    async function load() {
      const since = dateFrom ? startOfDay(dateFrom) : null;
      const txs = await db.transactions.getSince(since);
      if (dateTo) {
        const end = endOfDay(dateTo);
        setTransactions(txs.filter((t) => t.timestamp <= end));
      } else {
        setTransactions(txs);
      }
    }
    load().catch(console.error);
  }, [dateFrom, dateTo]);
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [undoModal, setUndoModal] = useState(false);
  const [undoPin, setUndoPin] = useState("");
  const [undoPinError, setUndoPinError] = useState(false);
  const [undoSuccess, setUndoSuccess] = useState(false);
  const [undoTransactionId, setUndoTransactionId] = useState<string | null>(null);
  const [undoing, setUndoing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const uniqueEmployees = Array.from(new Set(transactions.map((t) => t.employeeName)));

  const lockedEmployee = lockedEmployeeId ? employees.find((e) => e.id === lockedEmployeeId) : null;

  const filtered = transactions.filter((t) => {
    if (lockedEmployee && t.employeeName !== lockedEmployee.name) return false;
    if (!lockedEmployee && filter !== "all" && t.employeeName !== filter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchesName = t.employeeName.toLowerCase().includes(q);
      const matchesClient = t.clientName?.toLowerCase().includes(q);
      const matchesItems = t.items.some((i) => i.name.toLowerCase().includes(q));
      if (!matchesName && !matchesClient && !matchesItems) return false;
    }
    return true;
  });

  const serviceCount = filtered.reduce(
    (sum, t) => sum + t.items.filter((i) => i.type === "service").length,
    0
  );
  const totalRevenue = filtered.reduce((sum, t) => sum + t.totalAmount, 0);

  const today = new Date().toDateString();

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const isToday = date.toDateString() === today;
    if (isToday) {
      return date.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" });
    }
    return (
      date.toLocaleDateString("pl-PL", { day: "numeric", month: "short" }) +
      " " +
      date.toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" })
    );
  };

  return (
    <Box mih="100vh" pb={100}>
      <Container size="lg">
        <PageHeader title="Historia transakcji" />

        <Divider />

        {/* ===== DATE FILTER ===== */}
        <Group grow gap="sm" py="sm">
          <DatePickerInput
            label="Od"
            placeholder="Wybierz datę"
            valueFormat="D MMM YYYY"
            value={dateFrom}
            onChange={(val) => setDateFrom(val ? new Date(val) : null)}
            maxDate={dateTo ?? undefined}
            leftSection={<IconCalendar size={16} />}
            size="sm"
            clearable
          />
          <DatePickerInput
            label="Do"
            placeholder="Wybierz datę"
            valueFormat="D MMM YYYY"
            value={dateTo}
            onChange={(val) => setDateTo(val ? new Date(val) : null)}
            minDate={dateFrom ?? undefined}
            maxDate={new Date()}
            leftSection={<IconCalendar size={16} />}
            size="sm"
            clearable
          />
        </Group>

        {/* ===== SEARCH ===== */}
        <Box pb="sm">
          <TextInput
            placeholder="Szukaj (usługa, klient, fryzjer)..."
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            size="sm"
          />
        </Box>

        {/* ===== FILTER: EMPLOYEE ===== */}
        {!isPersonal && (
          <ScrollArea type="auto" offsetScrollbars scrollbarSize={4}>
            <Group gap="xs" wrap="nowrap" mb="xs">
              <UnstyledButton onClick={() => setFilter("all")} style={{ flexShrink: 0 }}>
                <Avatar
                  size={44}
                  radius="xl"
                  color={filter === "all" ? "green" : "gray"}
                  variant={filter === "all" ? "filled" : "light"}
                >
                  <IconUsers size={20} />
                </Avatar>
              </UnstyledButton>
              {uniqueEmployees.map((name) => {
                const emp = employees.find((e) => e.name === name);
                const avatar = emp?.avatar ?? name.slice(0, 2).toUpperCase();
                return (
                  <UnstyledButton
                    key={name}
                    onClick={() => setFilter(name)}
                    style={{ flexShrink: 0 }}
                  >
                    <Avatar
                      size={44}
                      radius="xl"
                      color={filter === name ? "green" : "gray"}
                      variant={filter === name ? "filled" : "light"}
                    >
                      {avatar}
                    </Avatar>
                  </UnstyledButton>
                );
              })}
            </Group>
          </ScrollArea>
        )}

        <Divider />

        {/* ===== TRANSACTION LIST ===== */}
        <Stack gap={0} py="sm">
          {filtered.length === 0 ? (
            <Stack align="center" gap="xs" py="xl">
              <Text fz="sm" c="dimmed" ta="center">
                Brak transakcji w wybranym okresie
              </Text>
              {(filter !== "all" || searchQuery) && (
                <Button
                  variant="subtle"
                  size="xs"
                  onClick={() => {
                    setFilter("all");
                    setSearchQuery("");
                  }}
                >
                  Wyczyść filtry
                </Button>
              )}
            </Stack>
          ) : (
            filtered.map((transaction, index) => {
              const isExpanded = expandedId === transaction.id;
              const itemsSummary = transaction.items.map((i) => i.name).join(", ");

              return (
                <div key={transaction.id}>
                  <UnstyledButton
                    w="100%"
                    py="sm"
                    px="xs"
                    onClick={() => setExpandedId(isExpanded ? null : transaction.id)}
                  >
                    <Group justify="space-between" wrap="nowrap">
                      <Group gap="xs" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                        <Text fz="xs" c="dimmed" w={50} style={{ flexShrink: 0 }}>
                          {formatTime(transaction.timestamp)}
                        </Text>
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <Group gap={6}>
                            <Text fw={600} fz="md">
                              {transaction.employeeName}
                            </Text>
                            {transaction.clientName && (
                              <Text fz="xs" c="dimmed">
                                · {transaction.clientName}
                              </Text>
                            )}
                          </Group>
                          <Text fz="sm" c="dimmed" lineClamp={1}>
                            {itemsSummary}
                          </Text>
                        </div>
                      </Group>
                      <Group gap="sm" wrap="nowrap" style={{ flexShrink: 0 }}>
                        <Text fw={600} fz="md">
                          {transaction.totalAmount.toLocaleString("pl-PL")} zł
                        </Text>
                        {isExpanded ? (
                          <IconChevronUp size={16} color="var(--mantine-color-dimmed)" />
                        ) : (
                          <IconChevronDown size={16} color="var(--mantine-color-dimmed)" />
                        )}
                      </Group>
                    </Group>
                  </UnstyledButton>

                  <Collapse expanded={isExpanded}>
                    <Box px="xs" pb="sm" ml={60}>
                      <Stack gap={4}>
                        {transaction.items.map((item, i) => (
                          <Group key={i} justify="space-between">
                            <Text fz="sm">{item.name}</Text>
                            <Text fz="sm" c="dimmed">
                              {item.price.toLocaleString("pl-PL")} zł
                            </Text>
                          </Group>
                        ))}
                        {transaction.discountAmount > 0 && (
                          <Group justify="space-between">
                            <Text fz="sm" c="red">
                              Rabat
                            </Text>
                            <Text fz="sm" c="red">
                              -{transaction.discountAmount.toLocaleString("pl-PL")} zł
                            </Text>
                          </Group>
                        )}
                        {transaction.tipAmount > 0 && (
                          <Group justify="space-between">
                            <Text fz="sm" c="green">
                              Napiwek
                            </Text>
                            <Text fz="sm" c="green">
                              +{transaction.tipAmount.toLocaleString("pl-PL")} zł
                            </Text>
                          </Group>
                        )}
                        <Divider my={4} />
                        <Group justify="space-between">
                          <Text fz="sm" fw={600}>
                            Razem
                          </Text>
                          <Text fz="sm" fw={600}>
                            {transaction.totalAmount.toLocaleString("pl-PL")} zł
                          </Text>
                        </Group>
                        {transaction.id === transactions[0]?.id &&
                          new Date(transaction.timestamp).toDateString() === today && (
                            <Group justify="flex-end">
                              <Button
                                variant="subtle"
                                color="red"
                                size="sm"
                                leftSection={<IconArrowBackUp size={16} />}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setUndoTransactionId(transaction.id);
                                  setUndoPin("");
                                  setUndoPinError(false);
                                  setUndoModal(true);
                                }}
                              >
                                Cofnij transakcję
                              </Button>
                            </Group>
                          )}
                      </Stack>
                    </Box>
                  </Collapse>

                  {index < filtered.length - 1 && <Divider />}
                </div>
              );
            })
          )}
        </Stack>
      </Container>

      {/* ===== BOTTOM SUMMARY ===== */}
      <Box
        style={{
          position: "fixed",
          bottom: 60,
          left: 0,
          right: 0,
          zIndex: 100,
          borderTop: "1px solid var(--mantine-color-default-border)",
          backgroundColor: "var(--mantine-color-body)",
        }}
        p="md"
      >
        <Container size="lg">
          <Group justify="space-between">
            <div>
              <Text fz="xs" c="var(--mantine-color-text)" tt="uppercase" lts={1}>
                Wykonane usługi
              </Text>
              <Text fw={700} fz="xl">
                {serviceCount}
              </Text>
            </div>
            <div style={{ textAlign: "right" }}>
              <Text fz="xs" c="var(--mantine-color-text)" tt="uppercase" lts={1}>
                Utarg
              </Text>
              <Text fw={700} fz="xl" c="green">
                {totalRevenue.toLocaleString("pl-PL")} zł
              </Text>
            </div>
          </Group>
        </Container>
      </Box>

      {/* ===== UNDO TRANSACTION MODAL ===== */}
      <Modal
        opened={undoModal}
        onClose={() => {
          setUndoModal(false);
          setUndoSuccess(false);
        }}
        title={
          <Text fw={700} fz="lg">
            {undoSuccess ? "Transakcja cofnięta" : "Cofnij transakcję"}
          </Text>
        }
        size="sm"
      >
        {undoSuccess ? (
          <Stack align="center" gap="md" py="md">
            <Box
              p="lg"
              style={{
                borderRadius: "50%",
                backgroundColor: "var(--mantine-color-red-light)",
              }}
            >
              <IconArrowBackUp size={32} color="var(--mantine-color-red-filled)" />
            </Box>
            <Text fz="sm" ta="center">
              Transakcja została cofnięta i oznaczona jako anulowana.
            </Text>
            <Button
              fullWidth
              onClick={() => {
                setUndoModal(false);
                setUndoSuccess(false);
              }}
            >
              Zamknij
            </Button>
          </Stack>
        ) : (
          <Stack gap="md">
            <Text fz="sm">
              Cofnięcie transakcji wymaga autoryzacji administratora. Wpisz PIN szefa.
            </Text>
            <Stack align="center" gap="xs">
              <PinInput
                length={4}
                type="number"
                inputMode="numeric"
                mask
                value={undoPin}
                onChange={(val) => {
                  setUndoPin(val);
                  setUndoPinError(false);
                }}
                error={undoPinError}
              />
              {undoPinError && (
                <Text fz="xs" c="red">
                  Nieprawidłowy PIN
                </Text>
              )}
            </Stack>
            <Group justify="flex-end">
              <Button variant="subtle" onClick={() => setUndoModal(false)}>
                Anuluj
              </Button>
              <Button
                color="red"
                disabled={undoPin.length < 4}
                loading={undoing}
                onClick={async () => {
                  if (undoPin === MOCK_OPERATIONS_PIN) {
                    setUndoing(true);
                    try {
                      await db.transactions.cancel(undoTransactionId!);
                      setTransactions((prev) => prev.filter((t) => t.id !== undoTransactionId));
                      setUndoSuccess(true);
                    } catch (err) {
                      console.error("[History] Cancel failed:", err);
                    } finally {
                      setUndoing(false);
                    }
                  } else {
                    setUndoPinError(true);
                  }
                }}
              >
                Cofnij transakcję
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Box>
  );
}
