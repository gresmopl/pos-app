import { useState } from "react";
import { db } from "@/db";
import { useDbQuery } from "@/hooks/useDbQuery";
import { notifications } from "@mantine/notifications";
import {
  Text,
  Group,
  Stack,
  Box,
  Container,
  Divider,
  Badge,
  Button,
  Loader,
  Card,
} from "@mantine/core";
import {
  IconDeviceMobile,
  IconCheck,
  IconBan,
  IconDeviceTablet,
  IconShield,
  IconUser,
} from "@tabler/icons-react";
import { PageHeader } from "@/components/layout/PageHeader";
import type { DeviceRegistration } from "@/lib/types";

function useDevices() {
  return useDbQuery(() => db.devices.getAll());
}

const STATUS_BADGE: Record<DeviceRegistration["status"], { color: string; label: string }> = {
  pending: { color: "yellow", label: "Oczekuje" },
  approved: { color: "green", label: "Zatwierdzony" },
  blocked: { color: "red", label: "Zablokowany" },
};

const TYPE_ICON: Record<DeviceRegistration["deviceType"], typeof IconDeviceMobile> = {
  personal: IconUser,
  station: IconDeviceTablet,
  admin: IconShield,
};

const TYPE_LABEL: Record<DeviceRegistration["deviceType"], string> = {
  personal: "Telefon pracownika",
  station: "Stacja (tablet)",
  admin: "Urządzenie szefa",
};

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DeviceCard({
  device,
  onAction,
}: {
  device: DeviceRegistration;
  onAction: () => void;
}): React.JSX.Element {
  const [loading, setLoading] = useState(false);
  const badge = STATUS_BADGE[device.status];
  const TypeIcon = TYPE_ICON[device.deviceType];

  const handleApprove = async (): Promise<void> => {
    setLoading(true);
    try {
      await db.devices.approve(device.id);
      onAction();
    } catch {
      notifications.show({ color: "red", message: "Nie udało się zatwierdzić urządzenia" });
    } finally {
      setLoading(false);
    }
  };

  const handleBlock = async (): Promise<void> => {
    setLoading(true);
    try {
      await db.devices.block(device.id);
      onAction();
    } catch {
      notifications.show({ color: "red", message: "Nie udało się zablokować urządzenia" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card withBorder p="md">
      <Group justify="space-between" mb="xs">
        <Group gap="xs">
          <TypeIcon size={18} color="var(--mantine-color-dimmed)" />
          <Text fw={600} fz="md">
            {device.deviceName}
          </Text>
        </Group>
        <Badge color={badge.color} variant="light" size="sm">
          {badge.label}
        </Badge>
      </Group>

      <Stack gap={4}>
        <Text fz="xs" c="dimmed">
          Typ: {TYPE_LABEL[device.deviceType]}
        </Text>
        {device.employeeName && (
          <Text fz="xs" c="dimmed">
            Pracownik: {device.employeeName}
          </Text>
        )}
        <Text fz="xs" c="dimmed">
          Zarejestrowano: {formatDate(device.registeredAt)}
        </Text>
        {device.approvedAt && (
          <Text fz="xs" c="dimmed">
            Zatwierdzono: {formatDate(device.approvedAt)}
          </Text>
        )}
        <Text fz="xs" c="dimmed">
          Ostatnio widziano: {formatDate(device.lastSeenAt)}
        </Text>
        <Text fz="xs" c="dimmed">
          ID: {device.deviceId.slice(0, 8)}...
        </Text>
      </Stack>

      {device.status === "pending" && (
        <Group mt="sm" gap="sm">
          <Button
            size="md"
            color="green"
            leftSection={<IconCheck size={16} />}
            onClick={handleApprove}
            loading={loading}
          >
            Zatwierdź
          </Button>
          <Button
            size="md"
            color="red"
            variant="light"
            leftSection={<IconBan size={16} />}
            onClick={handleBlock}
            loading={loading}
          >
            Zablokuj
          </Button>
        </Group>
      )}

      {device.status === "approved" && (
        <Group mt="sm">
          <Button
            size="md"
            color="red"
            variant="light"
            leftSection={<IconBan size={16} />}
            onClick={handleBlock}
            loading={loading}
          >
            Zablokuj
          </Button>
        </Group>
      )}

      {device.status === "blocked" && (
        <Group mt="sm">
          <Button
            size="md"
            color="green"
            variant="light"
            leftSection={<IconCheck size={16} />}
            onClick={handleApprove}
            loading={loading}
          >
            Odblokuj
          </Button>
        </Group>
      )}
    </Card>
  );
}

export default function AdminDevicesPage(): React.JSX.Element {
  const { data: devices, loading, refetch } = useDevices();

  const pending = devices?.filter((d) => d.status === "pending") ?? [];
  const approved = devices?.filter((d) => d.status === "approved") ?? [];
  const blocked = devices?.filter((d) => d.status === "blocked") ?? [];

  return (
    <Box mih="100vh">
      <Container size="sm">
        <PageHeader title="Urządzenia" backTo="/admin" />
        <Divider />

        {loading ? (
          <Stack align="center" py={40}>
            <Loader size="md" />
          </Stack>
        ) : !devices || devices.length === 0 ? (
          <Stack align="center" gap="md" py={40}>
            <IconDeviceMobile size={40} color="var(--mantine-color-dimmed)" />
            <Text fz="sm" c="dimmed" ta="center">
              Brak zarejestrowanych urządzeń
            </Text>
          </Stack>
        ) : (
          <Stack gap="lg" py="md">
            {pending.length > 0 && (
              <Stack gap="xs">
                <Text fw={600} fz="sm" c="yellow">
                  Oczekujące ({pending.length})
                </Text>
                {pending.map((d) => (
                  <DeviceCard key={d.id} device={d} onAction={refetch} />
                ))}
              </Stack>
            )}

            {approved.length > 0 && (
              <Stack gap="xs">
                <Text fw={600} fz="sm" c="green">
                  Zatwierdzone ({approved.length})
                </Text>
                {approved.map((d) => (
                  <DeviceCard key={d.id} device={d} onAction={refetch} />
                ))}
              </Stack>
            )}

            {blocked.length > 0 && (
              <Stack gap="xs">
                <Text fw={600} fz="sm" c="red">
                  Zablokowane ({blocked.length})
                </Text>
                {blocked.map((d) => (
                  <DeviceCard key={d.id} device={d} onAction={refetch} />
                ))}
              </Stack>
            )}
          </Stack>
        )}
      </Container>
    </Box>
  );
}
