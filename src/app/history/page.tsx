"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { mockTransactions } from "@/data/transactions";
import {
  Text,
  Group,
  Stack,
  Box,
  UnstyledButton,
  Divider,
  Container,
  ActionIcon,
  Badge,
  SegmentedControl,
  Collapse,
} from "@mantine/core";
import {
  IconArrowLeft,
  IconCash,
  IconCreditCard,
  IconDeviceMobile,
  IconGift,
  IconChevronDown,
  IconChevronUp,
  IconArrowsSplit,
} from "@tabler/icons-react";

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
  const router = useRouter();
  const [filter, setFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const uniqueEmployees = Array.from(new Set(mockTransactions.map((t) => t.employeeName)));

  const filterOptions = [
    { label: "Wszystkie", value: "all" },
    ...uniqueEmployees.map((name) => ({ label: name, value: name })),
  ];

  const filtered =
    filter === "all" ? mockTransactions : mockTransactions.filter((t) => t.employeeName === filter);

  const serviceCount = filtered.reduce(
    (sum, t) => sum + t.items.filter((i) => i.type === "service").length,
    0
  );
  const totalRevenue = filtered.reduce((sum, t) => sum + t.totalAmount, 0);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("pl-PL", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Box mih="100vh" pb={100}>
      <Container size="lg">
        {/* ===== HEADER ===== */}
        <Group justify="space-between" py="md">
          <Group gap="sm">
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              onClick={() => router.push("/")}
              aria-label="Powrót"
            >
              <IconArrowLeft size={22} />
            </ActionIcon>
            <Text fw={700} fz={24}>
              Historia transakcji
            </Text>
          </Group>
        </Group>

        <Divider />

        {/* ===== FILTER ===== */}
        <Box py="md">
          <SegmentedControl
            fullWidth
            value={filter}
            onChange={setFilter}
            data={filterOptions}
            size="sm"
          />
        </Box>
        <Divider />

        {/* ===== TRANSACTION LIST ===== */}
        <Stack gap={0} py="sm">
          {filtered.length === 0 ? (
            <Text fz="sm" c="dimmed" ta="center" py="xl">
              Brak transakcji.
            </Text>
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
                        <Text fz="sm" c="dimmed" w={45} style={{ flexShrink: 0 }}>
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
                        <Badge size="sm" variant="light">
                          {paymentLabel[transaction.paymentMethod]}
                        </Badge>
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
    </Box>
  );
}
