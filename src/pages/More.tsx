import { useNavigate } from "react-router";
import { Container, Stack, Text, UnstyledButton, Group, Badge, Divider, Box } from "@mantine/core";
import {
  IconHistory,
  IconScissors,
  IconChartBar,
  IconUsers,
  IconLock,
  IconDoorExit,
  IconChevronRight,
  IconCalendarEvent,
} from "@tabler/icons-react";
import { useDeviceRole, useDevice } from "@/contexts/DeviceContext";
import { BOTTOM_NAV_HEIGHT } from "@/components/layout/BottomNavBar";

interface MenuItem {
  icon: typeof IconHistory;
  label: string;
  sub: string;
  path: string;
}

const DAILY_ITEMS: MenuItem[] = [
  { icon: IconHistory, label: "Historia sprzedaży", sub: "Wszystkie transakcje", path: "/history" },
  { icon: IconScissors, label: "Cennik", sub: "Usługi i produkty", path: "/admin/pricing" },
  {
    icon: IconCalendarEvent,
    label: "Zamknięcie zmiany",
    sub: "Raport i koperta",
    path: "/shift-close",
  },
];

const ADMIN_ITEMS: MenuItem[] = [
  { icon: IconChartBar, label: "Statystyki", sub: "Miesiąc, rok, rekord", path: "/" },
  { icon: IconUsers, label: "Pracownicy", sub: "Prowizje, retencja", path: "/admin/employees" },
  { icon: IconLock, label: "Panel admina", sub: "Wymaga PIN", path: "/admin" },
];

const DEVICE_TYPE_LABEL: Record<string, string> = {
  personal: "Telefon pracownika",
  station: "Tablet przy kasie",
  admin: "Urządzenie admina",
};

function MenuRow({
  item,
  navigate,
}: {
  item: MenuItem;
  navigate: (path: string) => void;
}): React.JSX.Element {
  return (
    <UnstyledButton
      onClick={() => navigate(item.path)}
      py="sm"
      px="xs"
      style={{ borderRadius: "var(--mantine-radius-md)" }}
    >
      <Group wrap="nowrap">
        <item.icon size={22} stroke={1.5} color="var(--mantine-color-dimmed)" />
        <Box style={{ flex: 1 }}>
          <Text fz="sm" fw={500}>
            {item.label}
          </Text>
          <Text fz="xs" c="dimmed">
            {item.sub}
          </Text>
        </Box>
        <IconChevronRight size={16} stroke={1.5} color="var(--mantine-color-dimmed)" />
      </Group>
    </UnstyledButton>
  );
}

function SectionLabel({ children }: { children: string }): React.JSX.Element {
  return (
    <Text fz="xs" c="dimmed" tt="uppercase" lts={1} mt="xs">
      {children}
    </Text>
  );
}

export default function MorePage(): React.JSX.Element {
  const navigate = useNavigate();
  const { isAdmin } = useDeviceRole();
  const { device } = useDevice();

  const deviceLabel = device
    ? (DEVICE_TYPE_LABEL[device.deviceType] ?? device.deviceType)
    : "Nieznane";
  const deviceName = device?.deviceName ?? "Niezarejestrowane";

  return (
    <Container size="lg" pb={BOTTOM_NAV_HEIGHT + 16}>
      <Text fz="xl" fw={700} py="md">
        Więcej
      </Text>

      <Stack gap={4}>
        <SectionLabel>Codzienne</SectionLabel>
        {DAILY_ITEMS.map((item) => (
          <MenuRow key={item.path} item={item} navigate={navigate} />
        ))}
      </Stack>

      {isAdmin && (
        <>
          <Divider my="sm" />
          <Stack gap={4}>
            <SectionLabel>Dla szefa</SectionLabel>
            {ADMIN_ITEMS.map((item) => (
              <MenuRow key={item.path} item={item} navigate={navigate} />
            ))}
          </Stack>
        </>
      )}

      <Divider my="sm" />

      <Stack gap="xs" py="sm">
        <SectionLabel>Urządzenie</SectionLabel>
        <Group gap="xs">
          <Text fz="sm">{deviceName}</Text>
          <Badge size="sm" variant="light">
            {deviceLabel}
          </Badge>
        </Group>
      </Stack>

      <Divider my="sm" />

      <UnstyledButton
        onClick={() => {
          localStorage.removeItem("formen_device_id");
          window.location.href = "/";
        }}
        py="sm"
        px="xs"
      >
        <Group gap="xs">
          <IconDoorExit size={20} stroke={1.5} color="var(--mantine-color-red-filled)" />
          <Text fz="sm" c="red" fw={500}>
            Wyloguj urządzenie
          </Text>
        </Group>
      </UnstyledButton>
    </Container>
  );
}
