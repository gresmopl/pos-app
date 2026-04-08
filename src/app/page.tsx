"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { mockEmployees, mockStats } from "@/data/employees";
import {
  Text,
  Group,
  Stack,
  SimpleGrid,
  ActionIcon,
  Box,
  Avatar,
  Badge,
  useMantineColorScheme,
  UnstyledButton,
  Divider,
  Progress,
  Container,
  Modal,
  Button,
  NumberInput,
  SegmentedControl,
} from "@mantine/core";
import {
  IconSun,
  IconMoon,
  IconSettings,
  IconCalendar,
  IconChartBar,
  IconTrophy,
  IconArrowUpRight,
  IconArrowDownRight,
  IconGift,
  IconHistory,
  IconWallet,
  IconDoorExit,
} from "@tabler/icons-react";

const statusColor: Record<string, string> = {
  available: "green",
  busy: "yellow",
  break: "gray",
};

const statusLabel: Record<string, string> = {
  available: "Dostępny",
  busy: "Zajęty",
  break: "Przerwa",
};

export default function Dashboard() {
  const router = useRouter();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";

  // Voucher sale modal
  const [voucherModal, setVoucherModal] = useState(false);
  const [voucherValue, setVoucherValue] = useState<number | string>("");
  const [voucherPayment, setVoucherPayment] = useState("cash");
  const [voucherSuccess, setVoucherSuccess] = useState(false);
  const [voucherCode, setVoucherCode] = useState("");

  // Mock: admin widzi utarg, fryzjer nie
  const isAdmin = true; // TODO: replace with real role check

  const totalRevenue = mockEmployees.reduce((s, e) => s + e.todayRevenue, 0);
  const diff = mockStats.todayServices - mockStats.yesterdayServices;
  const yearDiff = Math.round(
    ((mockStats.yearServices - mockStats.lastYearServices) / mockStats.lastYearServices) * 100
  );
  const monthProgress = Math.round((mockStats.monthServices / mockStats.monthTarget) * 100);

  return (
    <Box mih="100vh" pb={80}>
      <Container size="lg">
        {/* ===== HEADER ===== */}
        <Group justify="space-between" py="md">
          <Text fw={700} fz={24}>
            FORMEN
          </Text>
          <Group gap="sm">
            <Text fz="sm" c="var(--mantine-color-text)">
              {new Date().toLocaleDateString("pl-PL", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </Text>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              onClick={toggleColorScheme}
              aria-label="Przełącz motyw"
            >
              {isDark ? <IconSun size={20} /> : <IconMoon size={20} />}
            </ActionIcon>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              aria-label="Ustawienia"
              onClick={() => router.push("/admin")}
            >
              <IconSettings size={20} />
            </ActionIcon>
          </Group>
        </Group>

        <Divider />

        {/* ===== STATS BAR (ikony + liczby, bez tekstu) ===== */}
        <SimpleGrid cols={4} py="md">
          <Stack gap={0} align="center">
            <IconSun size={18} color="#fbbf24" />
            <Group gap={4} align="baseline">
              <Text fw={700} fz={22}>
                {mockStats.todayServices}
              </Text>
              <Text fz="xs" fw={600} c={diff >= 0 ? "green" : "red"}>
                {diff >= 0 ? (
                  <IconArrowUpRight size={12} style={{ verticalAlign: "middle" }} />
                ) : (
                  <IconArrowDownRight size={12} style={{ verticalAlign: "middle" }} />
                )}
                {diff >= 0 ? "+" : ""}
                {diff}
              </Text>
            </Group>
          </Stack>

          <Stack gap={0} align="center">
            <IconCalendar size={18} color="#60a5fa" />
            <Text fw={700} fz={22}>
              {mockStats.monthServices}
            </Text>
            <Progress value={monthProgress} color="green" size={3} w={60} />
          </Stack>

          <Stack gap={0} align="center">
            <IconChartBar size={18} color="#a78bfa" />
            <Group gap={4} align="baseline">
              <Text fw={700} fz={22}>
                {mockStats.yearServices}
              </Text>
              <Text fz="xs" fw={600} c={yearDiff >= 0 ? "green" : "red"}>
                {yearDiff >= 0 ? "+" : ""}
                {yearDiff}%
              </Text>
            </Group>
          </Stack>

          <Stack gap={0} align="center">
            <IconTrophy size={18} color="#f59e0b" />
            <Text fw={700} fz={22}>
              {mockStats.allTimeRecord}
            </Text>
          </Stack>
        </SimpleGrid>

        <Divider />

        {/* ===== REVENUE (admin only) ===== */}
        {isAdmin && (
          <>
            <Box py="md">
              <Text fz="xs" c="var(--mantine-color-text)" tt="uppercase" lts={1}>
                Utarg dzisiaj
              </Text>
              <Text fw={700} fz={32} c="green">
                {totalRevenue.toLocaleString("pl-PL")} zł
              </Text>
            </Box>
            <Divider />
          </>
        )}

        {/* ===== EMPLOYEE LIST ===== */}
        <Box py="md">
          <Text fz="xs" c="var(--mantine-color-text)" tt="uppercase" lts={1} mb="md">
            Pracownicy
          </Text>
          <Stack gap={0}>
            {mockEmployees.map((employee, index) => (
              <div key={employee.id}>
                <UnstyledButton
                  w="100%"
                  py="sm"
                  px="xs"
                  onClick={() => router.push(`/pos?employee=${employee.id}`)}
                >
                  <Group justify="space-between" wrap="nowrap">
                    <Group gap="md" wrap="nowrap">
                      <Avatar
                        size={44}
                        radius="xl"
                        color={employee.status ? statusColor[employee.status] : "gray"}
                        variant="light"
                      >
                        {employee.avatar}
                      </Avatar>
                      <div>
                        <Text fw={600} fz="md">
                          {employee.name}
                        </Text>
                        <Group gap={6}>
                          {employee.status && statusLabel[employee.status] && (
                            <Badge
                              size="sm"
                              variant="dot"
                              color={employee.status ? statusColor[employee.status] : "gray"}
                            >
                              {statusLabel[employee.status]}
                            </Badge>
                          )}
                          <Text fz="sm" c="var(--mantine-color-text)">
                            {employee.status && statusLabel[employee.status] ? "· " : ""}
                            {employee.todayServices} usług
                          </Text>
                        </Group>
                      </div>
                    </Group>
                    {isAdmin && (
                      <Text fw={600} fz="lg" style={{ whiteSpace: "nowrap" }}>
                        {employee.todayRevenue.toLocaleString("pl-PL")} zł
                      </Text>
                    )}
                  </Group>
                </UnstyledButton>
                {index < mockEmployees.length - 1 && <Divider />}
              </div>
            ))}
          </Stack>
        </Box>
      </Container>

      {/* ===== BOTTOM BAR ===== */}
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
          <SimpleGrid cols={4}>
            <UnstyledButton onClick={() => setVoucherModal(true)}>
              <Stack align="center" gap={4}>
                <IconGift size={22} color="var(--mantine-color-yellow-filled)" />
                <Text fz="xs" c="var(--mantine-color-text)">
                  Sprzedaż bonu
                </Text>
              </Stack>
            </UnstyledButton>
            <UnstyledButton onClick={() => router.push("/history")}>
              <Stack align="center" gap={4}>
                <IconHistory size={22} color="var(--mantine-color-blue-filled)" />
                <Text fz="xs" c="var(--mantine-color-text)">
                  Historia
                </Text>
              </Stack>
            </UnstyledButton>
            <UnstyledButton onClick={() => router.push("/cash")}>
              <Stack align="center" gap={4}>
                <IconWallet size={22} color="var(--mantine-color-green-filled)" />
                <Text fz="xs" c="var(--mantine-color-text)">
                  Ruchy kasowe
                </Text>
              </Stack>
            </UnstyledButton>
            <UnstyledButton onClick={() => router.push("/shift-close")}>
              <Stack align="center" gap={4}>
                <IconDoorExit size={22} color="var(--mantine-color-red-filled)" />
                <Text fz="xs" c="var(--mantine-color-text)">
                  Zamknij zmianę
                </Text>
              </Stack>
            </UnstyledButton>
          </SimpleGrid>
        </Container>
      </Box>

      {/* ===== VOUCHER SALE MODAL ===== */}
      <Modal
        opened={voucherModal}
        onClose={() => {
          setVoucherModal(false);
          setVoucherSuccess(false);
          setVoucherValue("");
        }}
        title={
          <Text fw={700} fz="lg">
            Sprzedaż bonu
          </Text>
        }
        size="sm"
      >
        {voucherSuccess ? (
          <Stack align="center" gap="md" py="md">
            <Text fz={48}>🎁</Text>
            <Text fw={600} fz="lg" ta="center">
              Bon sprzedany!
            </Text>
            <Text fz="sm" c="dimmed" ta="center">
              Wartość: {Number(voucherValue).toLocaleString("pl-PL")} zł ·{" "}
              {voucherPayment === "cash" ? "Gotówka" : "Karta"}
            </Text>
            <Text fz="xs" c="dimmed" ta="center">
              Kod bonu: {voucherCode}
            </Text>
            <Button
              fullWidth
              onClick={() => {
                setVoucherModal(false);
                setVoucherSuccess(false);
                setVoucherValue("");
              }}
            >
              Zamknij
            </Button>
          </Stack>
        ) : (
          <Stack gap="md">
            <Text fz="sm">Sprzedaż bonu podarunkowego. Nie wymaga wyboru fryzjera.</Text>

            <Group gap="sm">
              {[50, 100, 200].map((val) => (
                <Button
                  key={val}
                  variant={Number(voucherValue) === val ? "filled" : "light"}
                  color="green"
                  onClick={() => setVoucherValue(val)}
                  size="sm"
                >
                  {val} zł
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
              fullWidth
              value={voucherPayment}
              onChange={setVoucherPayment}
              data={[
                { label: "Gotówka", value: "cash" },
                { label: "Karta", value: "card" },
              ]}
            />

            <Button
              fullWidth
              size="lg"
              disabled={!Number(voucherValue)}
              onClick={() => {
                setVoucherCode(`BON-${Date.now().toString().slice(-6)}`);
                setVoucherSuccess(true);
              }}
              leftSection={<IconGift size={20} />}
            >
              Sprzedaj bon {Number(voucherValue) ? `za ${Number(voucherValue)} zł` : ""}
            </Button>
          </Stack>
        )}
      </Modal>
    </Box>
  );
}
