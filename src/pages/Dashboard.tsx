import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
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
  Button,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import {
  IconSun,
  IconMoon,
  IconSettings,
  IconCalendar,
  IconChartBar,
  IconTrophy,
  IconArrowUpRight,
  IconArrowDownRight,
  IconHistory,
  IconWallet,
  IconDoorExit,
  IconScissors,
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
  const navigate = useNavigate();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";

  const isMobile = useMediaQuery("(max-width: 600px)");
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    setDateStr(
      new Date().toLocaleDateString("pl-PL", isMobile
        ? { day: "numeric", month: "short" }
        : { weekday: "long", day: "numeric", month: "long", year: "numeric" }
      )
    );
  }, [isMobile]);

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
          <Group gap="sm">
            <ActionIcon variant="subtle" color="gray" size="lg">
              <IconScissors size={22} />
            </ActionIcon>
            <Text fw={700} fz={24}>
              FORMEN
            </Text>
          </Group>
          <Group gap="sm">
            {dateStr && (
              <Text fz="sm" c="var(--mantine-color-text)">
                {dateStr}
              </Text>
            )}
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
              onClick={() => navigate("/admin")}
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
            {mockEmployees.length === 0 && (
              <Stack align="center" gap="sm" py="xl">
                <Text fz="sm" c="dimmed" ta="center">
                  Brak pracowników. Dodaj pierwszego pracownika w Panelu Admina.
                </Text>
                <Button variant="light" size="sm" onClick={() => navigate("/admin")}>
                  Przejdź do ustawień
                </Button>
              </Stack>
            )}
            {mockEmployees.map((employee, index) => (
              <div key={employee.id}>
                <UnstyledButton
                  w="100%"
                  py="sm"
                  px="xs"
                  onClick={() => navigate(`/pos?employee=${employee.id}`)}
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
          zIndex: 100,
          borderTop: "1px solid var(--mantine-color-default-border)",
          backgroundColor: "var(--mantine-color-body)",
        }}
        p="md"
      >
        <Container size="lg">
          <SimpleGrid cols={3}>
            <UnstyledButton onClick={() => navigate("/history")}>
              <Stack align="center" gap={4}>
                <IconHistory size={22} color="var(--mantine-color-blue-filled)" />
                <Text fz={11} c="var(--mantine-color-text)" ta="center" lh={1.2}>
                  Historia
                </Text>
              </Stack>
            </UnstyledButton>
            <UnstyledButton onClick={() => navigate("/cash")}>
              <Stack align="center" gap={4}>
                <IconWallet size={22} color="var(--mantine-color-green-filled)" />
                <Text fz={11} c="var(--mantine-color-text)" ta="center" lh={1.2}>
                  Ruchy kasowe
                </Text>
              </Stack>
            </UnstyledButton>
            <UnstyledButton onClick={() => navigate("/shift-close")}>
              <Stack align="center" gap={4}>
                <IconDoorExit size={22} color="var(--mantine-color-red-filled)" />
                <Text fz={11} c="var(--mantine-color-text)" ta="center" lh={1.2}>
                  Zamknij zmianę
                </Text>
              </Stack>
            </UnstyledButton>
          </SimpleGrid>
        </Container>
      </Box>

    </Box>
  );
}
