import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useEmployees } from "@/hooks/useDbData";
import {
  Text,
  Group,
  Stack,
  ActionIcon,
  Box,
  Avatar,
  Badge,
  useMantineColorScheme,
  UnstyledButton,
  Divider,
  Container,
  Button,
} from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { IconSun, IconMoon, IconScissors } from "@tabler/icons-react";
import { pluralize } from "@/lib/constants";
import { useDeviceRole } from "@/contexts/DeviceContext";
import { BOTTOM_NAV_HEIGHT } from "@/components/layout/BottomNavBar";

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
  const { isAdmin, isPersonal, lockedEmployeeId } = useDeviceRole();

  const visibleEmployees = lockedEmployeeId
    ? employees.filter((e) => e.id === lockedEmployeeId)
    : employees;

  return (
    <Box mih="100vh" pb={BOTTOM_NAV_HEIGHT + 16}>
      <Container size="lg">
        {/* ===== HEADER ===== */}
        <Group justify="space-between" py="md">
          <Group gap="sm">
            <IconScissors size={22} stroke={1.5} />
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
          </Group>
        </Group>

        <Divider />

        {/* ===== EMPLOYEE LIST ===== */}
        <Stack gap={0} pt="md">
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
          {!empLoading && visibleEmployees.length > 0 && (
            <Text fz="xs" c="dimmed" ta="center" pb="sm">
              {isPersonal
                ? "Kliknij aby rozpocząć rachunek"
                : "Wybierz fryzjera aby rozpocząć rachunek"}
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
                        <Text fz="sm" c="dimmed">
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
      </Container>
    </Box>
  );
}
