import { useState } from "react";
import { db } from "@/db";
import { useDbQuery } from "@/hooks/useDbQuery";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
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
  Modal,
  Collapse,
  UnstyledButton,
} from "@mantine/core";
import {
  IconDeviceMobile,
  IconCheck,
  IconBan,
  IconDeviceTablet,
  IconShield,
  IconUser,
  IconArchive,
  IconArrowBackUp,
  IconChevronDown,
  IconChevronRight,
} from "@tabler/icons-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PAGE_BOTTOM_PADDING } from "@/components/layout/BottomNavBar";
import { useDevice } from "@/contexts/DeviceContext";
import { checkArchiveGuard } from "@/lib/devices";
import { pluralize } from "@/lib/constants";
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
  currentDeviceId,
  onAction,
}: {
  device: DeviceRegistration;
  currentDeviceId: string;
  onAction: () => void;
}): React.JSX.Element {
  const [loading, setLoading] = useState(false);
  const [archiveModal, setArchiveModal] = useState(false);
  const badge = STATUS_BADGE[device.status];
  const TypeIcon = TYPE_ICON[device.deviceType];
  const guard = checkArchiveGuard(device, currentDeviceId, new Date());
  const isCurrent = device.deviceId === currentDeviceId;

  const handleApprove = async (): Promise<void> => {
    setLoading(true);
    try {
      await db.devices.approve(device.id);
      onAction();
    } catch {
      notifications.show({
        color: "red",
        message: "Nie udało się zatwierdzić urządzenia. Spróbuj ponownie.",
      });
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
      notifications.show({
        color: "red",
        message: "Nie udało się zablokować urządzenia. Spróbuj ponownie.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async (): Promise<void> => {
    setLoading(true);
    try {
      await db.devices.archive(device.id);
      setArchiveModal(false);
      onAction();
    } catch {
      notifications.show({
        color: "red",
        message: "Nie udało się zarchiwizować urządzenia. Spróbuj ponownie.",
      });
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
        <Group gap="xs">
          {isCurrent && (
            <Badge color="blue" variant="light" size="sm">
              To urządzenie
            </Badge>
          )}
          <Badge color={badge.color} variant="light" size="sm">
            {badge.label}
          </Badge>
        </Group>
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

      {guard.allowed && (
        <Group mt="xs">
          <Button
            size="sm"
            variant="subtle"
            color="gray"
            leftSection={<IconArchive size={16} />}
            onClick={() => setArchiveModal(true)}
            loading={loading}
          >
            Archiwizuj
          </Button>
        </Group>
      )}

      <Modal
        opened={archiveModal}
        onClose={() => setArchiveModal(false)}
        title={
          <Text fw={700} fz="lg">
            Zarchiwizować urządzenie?
          </Text>
        }
        size="sm"
      >
        <Stack gap="md">
          <Text fz="sm">
            <Text span fw={600}>
              {device.deviceName}
            </Text>{" "}
            zniknie z listy i straci dostęp do aplikacji. Możesz je przywrócić w sekcji Archiwum.
          </Text>
          {guard.allowed && guard.level === "warn" && (
            <Text fz="sm" c="red" fw={500}>
              Urządzenie było używane {pluralize(guard.daysSilent, "dzień", "dni", "dni")} temu.
              Jeśli ktoś z niego korzysta, zostanie wylogowany.
            </Text>
          )}
          <Group justify="flex-end">
            <Button variant="subtle" size="lg" onClick={() => setArchiveModal(false)}>
              Anuluj
            </Button>
            <Button color="red" size="lg" onClick={handleArchive} loading={loading}>
              Archiwizuj
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Card>
  );
}

function ArchivedCard({
  device,
  onAction,
}: {
  device: DeviceRegistration;
  onAction: () => void;
}): React.JSX.Element {
  const [loading, setLoading] = useState(false);

  const handleRestore = async (): Promise<void> => {
    setLoading(true);
    try {
      await db.devices.restore(device.id);
      onAction();
    } catch {
      notifications.show({
        color: "red",
        message: "Nie udało się przywrócić urządzenia. Spróbuj ponownie.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card withBorder p="sm">
      <Group justify="space-between" wrap="nowrap">
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text fz="sm" fw={500} truncate>
            {device.deviceName}
          </Text>
          <Text fz="xs" c="dimmed">
            {TYPE_LABEL[device.deviceType]} · ostatnio {formatDate(device.lastSeenAt)}
          </Text>
        </Box>
        <Button
          size="sm"
          variant="subtle"
          color="gray"
          leftSection={<IconArrowBackUp size={16} />}
          onClick={handleRestore}
          loading={loading}
        >
          Przywróć
        </Button>
      </Group>
    </Card>
  );
}

export default function AdminDevicesPage(): React.JSX.Element {
  useDocumentTitle("Urządzenia");
  const { data: devices, loading, refetch } = useDevices();
  const { deviceId: currentDeviceId } = useDevice();
  const [archiveOpen, setArchiveOpen] = useState(false);

  const visible = devices?.filter((d) => d.isActive) ?? [];
  const archived = devices?.filter((d) => !d.isActive) ?? [];

  const pending = visible.filter((d) => d.status === "pending");
  const approved = visible.filter((d) => d.status === "approved");
  const blocked = visible.filter((d) => d.status === "blocked");

  return (
    <Box mih="100vh" pb={PAGE_BOTTOM_PADDING}>
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
                  <DeviceCard
                    key={d.id}
                    device={d}
                    currentDeviceId={currentDeviceId}
                    onAction={refetch}
                  />
                ))}
              </Stack>
            )}

            {approved.length > 0 && (
              <Stack gap="xs">
                <Text fw={600} fz="sm" c="green">
                  Zatwierdzone ({approved.length})
                </Text>
                {approved.map((d) => (
                  <DeviceCard
                    key={d.id}
                    device={d}
                    currentDeviceId={currentDeviceId}
                    onAction={refetch}
                  />
                ))}
              </Stack>
            )}

            {blocked.length > 0 && (
              <Stack gap="xs">
                <Text fw={600} fz="sm" c="red">
                  Zablokowane ({blocked.length})
                </Text>
                {blocked.map((d) => (
                  <DeviceCard
                    key={d.id}
                    device={d}
                    currentDeviceId={currentDeviceId}
                    onAction={refetch}
                  />
                ))}
              </Stack>
            )}

            <Divider />

            <Stack gap="xs">
              <UnstyledButton onClick={() => setArchiveOpen((o) => !o)} py="xs">
                <Group gap="xs">
                  {archiveOpen ? (
                    <IconChevronDown size={16} color="var(--mantine-color-dimmed)" />
                  ) : (
                    <IconChevronRight size={16} color="var(--mantine-color-dimmed)" />
                  )}
                  <Text fw={600} fz="sm" c="dimmed">
                    Archiwum ({archived.length})
                  </Text>
                </Group>
              </UnstyledButton>
              <Collapse expanded={archiveOpen}>
                <Stack gap="xs">
                  {archived.length === 0 ? (
                    <Text fz="xs" c="dimmed" py="sm">
                      Archiwum jest puste.
                    </Text>
                  ) : (
                    archived.map((d) => <ArchivedCard key={d.id} device={d} onAction={refetch} />)
                  )}
                </Stack>
              </Collapse>
            </Stack>
          </Stack>
        )}
      </Container>
    </Box>
  );
}
