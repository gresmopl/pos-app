import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import {
  useEmployees,
  useDailyStats,
  useSalonSettings,
  useRecentReports,
  useTransactionsSinceLastClose,
  useMovementsSinceLastClose,
  useLastFloat,
} from "@/hooks/useDbData";
import { sumCommission } from "@/lib/commission";
import { calcExpectedCash, calcSystemCash } from "@/lib/cash";
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
import { pluralize } from "@/lib/constants";
import { useDeviceRole } from "@/contexts/DeviceContext";

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
      new Date().toLocaleDateString(
        "pl-PL",
        isMobile
          ? { day: "numeric", month: "short" }
          : { weekday: "long", day: "numeric", month: "long", year: "numeric" }
      )
    );
  }, [isMobile]);

  const { data: employees = [], loading: empLoading } = useEmployees();
  const { data: stats } = useDailyStats();
  const { data: salon } = useSalonSettings();
  const { data: txsSinceClose = [] } = useTransactionsSinceLastClose();
  const { data: movementsSinceClose = [] } = useMovementsSinceLastClose();
  const { data: lastFloat } = useLastFloat();
  const { data: recentReports = [] } = useRecentReports(2);
  const { isAdmin, isPersonal, lockedEmployeeId } = useDeviceRole();

  const visibleEmployees = lockedEmployeeId
    ? employees.filter((e) => e.id === lockedEmployeeId)
    : employees;

  // Utarg od ostatniego shift_close (dla wszystkich widokow)
  const revenueSinceClose = txsSinceClose
    .filter((tx) => !lockedEmployeeId || tx.employeeId === lockedEmployeeId)
    .reduce((s, tx) => s + (tx.totalAmount - tx.tipAmount), 0);

  // Oczekiwany stan kasy - fizyczna gotowka + bony papierowe w szufladzie
  // (wspoldzielony dla calego salonu, nie filtrujemy per pracownik)
  const systemCash = calcSystemCash(txsSinceClose);
  const expectedCash = calcExpectedCash(lastFloat ?? 0, systemCash, movementsSinceClose);

  const personalEmployee =
    isPersonal && lockedEmployeeId ? employees.find((e) => e.id === lockedEmployeeId) : undefined;
  const personalCommission = personalEmployee
    ? sumCommission(
        txsSinceClose.filter((tx) => tx.employeeId === lockedEmployeeId),
        personalEmployee
      )
    : 0;
  const diff = (stats?.todayServices ?? 0) - (stats?.yesterdayServices ?? 0);
  const yearDiff =
    stats && stats.lastYearServices > 0
      ? Math.round(((stats.yearServices - stats.lastYearServices) / stats.lastYearServices) * 100)
      : 0;
  const monthProgress =
    stats && stats.monthTarget > 0
      ? Math.round((stats.monthServices / stats.monthTarget) * 100)
      : 0;

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
            {!isPersonal && (
              <ActionIcon
                variant="subtle"
                color="gray"
                size="lg"
                aria-label="Ustawienia"
                onClick={() => navigate("/admin")}
              >
                <IconSettings size={20} />
              </ActionIcon>
            )}
          </Group>
        </Group>

        <Divider />

        {/* ===== STATS BAR ===== */}
        <SimpleGrid cols={4} py="md">
          <Stack gap={0} align="center">
            <IconSun size={18} color="#fbbf24" />
            <Group gap={4} align="baseline">
              <Text fw={700} fz={22}>
                {stats?.todayServices}
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
            <Text fz="xs" c="dimmed">
              Dziś
            </Text>
          </Stack>

          <Stack gap={0} align="center">
            <IconCalendar size={18} color="#60a5fa" />
            <Text fw={700} fz={22}>
              {stats?.monthServices}
            </Text>
            <Progress value={monthProgress} color="green" size={3} w={60} />
            <Text fz="xs" c="dimmed">
              Miesiąc
            </Text>
          </Stack>

          <Stack gap={0} align="center">
            <IconChartBar size={18} color="#a78bfa" />
            <Group gap={4} align="baseline">
              <Text fw={700} fz={22}>
                {stats?.yearServices}
              </Text>
              <Text fz="xs" fw={600} c={yearDiff >= 0 ? "green" : "red"}>
                {yearDiff >= 0 ? "+" : ""}
                {yearDiff}%
              </Text>
            </Group>
            <Text fz="xs" c="dimmed">
              Rok
            </Text>
          </Stack>

          <Stack gap={0} align="center">
            <IconTrophy size={18} color="#f59e0b" />
            <Text fw={700} fz={22}>
              {stats?.allTimeRecord}
            </Text>
            <Text fz="xs" c="dimmed">
              Rekord
            </Text>
          </Stack>
        </SimpleGrid>

        <Divider />

        {/* ===== OCZEKIWANY STAN KASY (widoczny dla wszystkich) ===== */}
        <Box py="md">
          <Text fz="xs" c="var(--mantine-color-text)" tt="uppercase" lts={1}>
            Oczekiwany stan kasy
          </Text>
          <Text fw={700} fz={32} c="green">
            {expectedCash.toLocaleString("pl-PL")} zł
          </Text>
          <Text fz="xs" c="dimmed">
            Gotówka + bony papierowe w szufladzie (do fizycznego przeliczenia na start zmiany)
          </Text>
        </Box>
        <Divider />

        {/* ===== REVENUE (admin only) ===== */}
        {isAdmin && (
          <>
            <Box py="md">
              <Text fz="xs" c="var(--mantine-color-text)" tt="uppercase" lts={1}>
                Utarg od ostatniego zamknięcia
              </Text>
              <Text fw={700} fz={32} c="green">
                {revenueSinceClose.toLocaleString("pl-PL")} zł
              </Text>
            </Box>
            <Divider />
          </>
        )}

        {/* ===== PERSONAL COMMISSION (fryzjer na swoim telefonie) ===== */}
        {isPersonal && personalEmployee && (
          <>
            <Box py="md">
              <Group justify="space-between" align="flex-start">
                <div>
                  <Text fz="xs" c="var(--mantine-color-text)" tt="uppercase" lts={1}>
                    Twoja prowizja (od ostatniego zamknięcia)
                  </Text>
                  <Text fw={700} fz={32} c="green">
                    {personalCommission.toLocaleString("pl-PL", {
                      maximumFractionDigits: 2,
                    })}{" "}
                    zł
                  </Text>
                </div>
                <Stack gap={0} align="flex-end">
                  <Text fz="xs" c="dimmed" tt="uppercase" lts={1}>
                    Stawki
                  </Text>
                  <Text fz="sm" fw={600}>
                    Usługi: {personalEmployee.commissionServicePercent}%
                  </Text>
                  <Text fz="sm" fw={600}>
                    Produkty: {personalEmployee.commissionProductPercent}%
                  </Text>
                </Stack>
              </Group>
              <Group justify="space-between" mt="xs">
                <Text fz="xs" c="dimmed">
                  Utarg: {revenueSinceClose.toLocaleString("pl-PL")} zł
                </Text>
                <Text fz="xs" c="dimmed">
                  Do wypłaty z Portfela:{" "}
                  <Text span fw={700} c="green">
                    {personalEmployee.tipBalance.toLocaleString("pl-PL", {
                      minimumFractionDigits: 2,
                    })}{" "}
                    zł
                  </Text>
                </Text>
              </Group>
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
            {empLoading && (
              <Text fz="sm" c="dimmed" ta="center" py="xl">
                Ładowanie...
              </Text>
            )}
            {!empLoading && visibleEmployees.length === 0 && (
              <Stack align="center" gap="sm" py="xl">
                <Text fz="sm" c="dimmed" ta="center">
                  Brak pracowników. Dodaj pierwszego pracownika w Panelu Admina.
                </Text>
                <Button variant="light" size="sm" onClick={() => navigate("/admin")}>
                  Przejdź do ustawień
                </Button>
              </Stack>
            )}
            {stats?.todayServices === 0 && visibleEmployees.length > 0 && (
              <Text fz="xs" c="dimmed" ta="center" py="sm">
                {isPersonal
                  ? "Kliknij aby rozpocząć rachunek"
                  : "Wybierz fryzjera aby rozpocząć pierwszy rachunek"}
              </Text>
            )}
            {visibleEmployees.map((employee, index) => (
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
                            {pluralize(employee.todayServices, "usługa", "usługi", "usług")}
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
                {index < visibleEmployees.length - 1 && <Divider />}
              </div>
            ))}
          </Stack>
        </Box>

        {/* ===== OSTATNIE ZAMKNIECIA KASY ===== */}
        {recentReports.length > 0 && (
          <>
            <Divider />
            <Box py="md">
              <Text fz="xs" c="var(--mantine-color-text)" tt="uppercase" lts={1} mb="sm">
                Ostatnie zamknięcia kasy
              </Text>
              <Stack gap="xs">
                {recentReports.map((r) => {
                  const d = new Date(r.closedAt);
                  const dateStr = d.toLocaleDateString("pl-PL", {
                    day: "2-digit",
                    month: "2-digit",
                  });
                  const timeStr = d.toLocaleTimeString("pl-PL", {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  const diffColor =
                    r.difference === 0 ? "green" : r.difference < 0 ? "red" : "blue";
                  const diffLabel =
                    r.difference === 0
                      ? "OK"
                      : r.difference < 0
                        ? `Manko ${r.difference.toLocaleString("pl-PL")} zł`
                        : `Nadwyżka +${r.difference.toLocaleString("pl-PL")} zł`;
                  return (
                    <Box
                      key={r.id}
                      p="sm"
                      style={{
                        borderRadius: "var(--mantine-radius-md)",
                        border: "1px solid var(--mantine-color-default-border)",
                      }}
                    >
                      <Group justify="space-between" wrap="nowrap">
                        <div>
                          <Text fw={600} fz="sm">
                            {dateStr} · {timeStr}
                          </Text>
                          <Text fz="xs" c="dimmed">
                            Zamykał: {r.closingEmployeeName} · do koperty{" "}
                            {r.depositAmount.toLocaleString("pl-PL")} zł
                          </Text>
                        </div>
                        <Text fw={700} fz="sm" c={diffColor} style={{ whiteSpace: "nowrap" }}>
                          {diffLabel}
                        </Text>
                      </Group>
                    </Box>
                  );
                })}
              </Stack>
            </Box>
          </>
        )}
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
            <UnstyledButton onClick={() => navigate("/history")} mih={56}>
              <Stack align="center" gap={4}>
                <IconHistory size={24} color="var(--mantine-color-blue-filled)" />
                <Text fz="xs" c="var(--mantine-color-text)" ta="center" lh={1.2}>
                  Historia
                </Text>
              </Stack>
            </UnstyledButton>
            <UnstyledButton onClick={() => navigate("/cash")} mih={56}>
              <Stack align="center" gap={4}>
                <IconWallet size={24} color="var(--mantine-color-green-filled)" />
                <Text fz="xs" c="var(--mantine-color-text)" ta="center" lh={1.2}>
                  Ruchy kasowe
                </Text>
              </Stack>
            </UnstyledButton>
            <UnstyledButton onClick={() => navigate("/shift-close")} mih={56}>
              <Stack align="center" gap={4}>
                <IconDoorExit size={24} color="var(--mantine-color-red-filled)" />
                <Text fz="xs" c="var(--mantine-color-text)" ta="center" lh={1.2}>
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
