import { useState } from "react";
import { mockTransactions } from "@/data/transactions";
import { mockEmployees } from "@/data/employees";
import {
  Text,
  Group,
  Stack,
  Box,
  UnstyledButton,
  Divider,
  Container,
  Badge,
  Button,
  Collapse,
  ScrollArea,
  Modal,
  PinInput,
  TextInput,
  Avatar,
} from "@mantine/core";
import {
  IconCash,
  IconCreditCard,
  IconDeviceMobile,
  IconGift,
  IconChevronDown,
  IconChevronUp,
  IconArrowsSplit,
  IconArrowBackUp,
  IconSearch,
  IconUsers,
  IconStack2,
} from "@tabler/icons-react";
import { MOCK_OPERATIONS_PIN } from "@/lib/constants";
import { PageHeader } from "@/components/layout/PageHeader";

const paymentIcon: Record<string, typeof IconCash> = {
  cash: IconCash,
  card: IconCreditCard,
  blik: IconDeviceMobile,
  voucher: IconGift,
  split: IconArrowsSplit,
};

const paymentLabel: Record<string, string> = {
  cash: "Gotówka",
  card: "Karta",
  blik: "BLIK",
  voucher: "Bon",
  split: "Gotówka + Karta",
};

export default function HistoryPage() {
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [undoModal, setUndoModal] = useState(false);
  const [undoPin, setUndoPin] = useState("");
  const [undoPinError, setUndoPinError] = useState(false);
  const [undoSuccess, setUndoSuccess] = useState(false);
  const [_undoTransactionId, setUndoTransactionId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");

  const uniqueEmployees = Array.from(new Set(mockTransactions.map((t) => t.employeeName)));

  const filtered = mockTransactions.filter((t) => {
    if (filter !== "all" && t.employeeName !== filter) return false;
    if (paymentFilter !== "all" && t.paymentMethod !== paymentFilter) return false;
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

        {/* ===== SEARCH ===== */}
        <Box py="sm">
          <TextInput
            placeholder="Szukaj (usługa, klient, fryzjer)..."
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            size="sm"
          />
        </Box>

        {/* ===== FILTER: EMPLOYEE ===== */}
        <ScrollArea type="auto" offsetScrollbars scrollbarSize={4}>
          <Group gap="xs" wrap="nowrap" mb="xs">
            <UnstyledButton onClick={() => setFilter("all")} style={{ flexShrink: 0 }}>
              <Avatar
                size={36}
                radius="xl"
                color={filter === "all" ? "green" : "gray"}
                variant={filter === "all" ? "filled" : "light"}
              >
                <IconUsers size={18} />
              </Avatar>
            </UnstyledButton>
            {uniqueEmployees.map((name) => {
              const emp = mockEmployees.find((e) => e.name === name);
              const avatar = emp?.avatar ?? name.slice(0, 2).toUpperCase();
              return (
                <UnstyledButton
                  key={name}
                  onClick={() => setFilter(name)}
                  style={{ flexShrink: 0 }}
                >
                  <Avatar
                    size={36}
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

        {/* ===== FILTER: PAYMENT METHOD ===== */}
        <ScrollArea type="auto" offsetScrollbars scrollbarSize={4}>
          <Group gap="xs" wrap="nowrap" mb="sm">
            <UnstyledButton onClick={() => setPaymentFilter("all")} style={{ flexShrink: 0 }}>
              <Avatar
                size={36}
                radius="xl"
                color={paymentFilter === "all" ? "blue" : "gray"}
                variant={paymentFilter === "all" ? "filled" : "light"}
              >
                <IconStack2 size={18} />
              </Avatar>
            </UnstyledButton>
            {[
              { value: "cash", icon: IconCash },
              { value: "card", icon: IconCreditCard },
              { value: "blik", icon: IconDeviceMobile },
              { value: "voucher", icon: IconGift },
              { value: "split", icon: IconArrowsSplit },
            ].map((opt) => (
              <UnstyledButton
                key={opt.value}
                onClick={() => setPaymentFilter(opt.value)}
                style={{ flexShrink: 0 }}
              >
                <Avatar
                  size={36}
                  radius="xl"
                  color={paymentFilter === opt.value ? "blue" : "gray"}
                  variant={paymentFilter === opt.value ? "filled" : "light"}
                >
                  <opt.icon size={18} />
                </Avatar>
              </UnstyledButton>
            ))}
          </Group>
        </ScrollArea>

        <Divider />

        {/* ===== TRANSACTION LIST ===== */}
        <Stack gap={0} py="sm">
          {filtered.length === 0 ? (
            <Stack align="center" gap="xs" py="xl">
              <Text fz="sm" c="dimmed" ta="center">
                Nie ma jeszcze dziś transakcji
              </Text>
              {(filter !== "all" || paymentFilter !== "all" || searchQuery) && (
                <Button
                  variant="subtle"
                  size="xs"
                  onClick={() => {
                    setFilter("all");
                    setPaymentFilter("all");
                    setSearchQuery("");
                  }}
                >
                  Wyczyść filtry
                </Button>
              )}
            </Stack>
          ) : (
            filtered.map((transaction, index) => {
              const PayIcon = paymentIcon[transaction.paymentMethod];
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
                      <Group gap="md" wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
                        <Text fz="xs" c="dimmed" w={75} style={{ flexShrink: 0 }}>
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
                        <PayIcon size={18} color="var(--mantine-color-dimmed)" />
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
                    <Box px="xs" pb="sm" ml={57}>
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
                        <Group justify="space-between" align="center">
                          <Badge size="sm" variant="light">
                            {paymentLabel[transaction.paymentMethod]}
                          </Badge>
                          {index === 0 && filter === "all" && (
                            <Button
                              variant="subtle"
                              color="red"
                              size="xs"
                              leftSection={<IconArrowBackUp size={14} />}
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
                          )}
                        </Group>
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
                onClick={() => {
                  if (undoPin === MOCK_OPERATIONS_PIN) {
                    setUndoSuccess(true);
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
