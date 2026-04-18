import { useState } from "react";
import { useDevice } from "@/contexts/DeviceContext";
import { useEmployees } from "@/hooks/useDbData";
import {
  Text,
  Stack,
  Box,
  Container,
  Divider,
  TextInput,
  Select,
  Button,
  Loader,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconDeviceMobile, IconClock, IconShieldOff, IconLock } from "@tabler/icons-react";

const DEVICE_ADMIN_PIN = "1234";

const DEVICE_TYPES = [
  { value: "personal", label: "Telefon pracownika" },
  { value: "station", label: "Stacja (wspólny tablet)" },
  { value: "admin", label: "Urządzenie szefa" },
];

function RegisterScreen(): React.JSX.Element {
  const { deviceId, register } = useDevice();
  const { data: employees = [] } = useEmployees();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    initialValues: {
      deviceName: "",
      deviceType: "personal" as string,
      employeeId: "" as string,
      adminPin: "",
    },
    validate: {
      deviceName: (v) => (v.trim() ? null : "Podaj nazwę urządzenia"),
      adminPin: (v, values) =>
        values.deviceType === "admin"
          ? v === DEVICE_ADMIN_PIN
            ? null
            : "Nieprawidłowy PIN"
          : null,
    },
  });

  const handleSubmit = async (): Promise<void> => {
    if (form.validate().hasErrors) return;
    setSubmitting(true);
    try {
      await register(
        form.values.deviceName,
        form.values.deviceType as "personal" | "station" | "admin",
        form.values.employeeId || undefined
      );
    } catch (err) {
      console.error("[DeviceGate] Registration failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const employeeOptions = employees.map((e) => ({ value: e.id, label: e.name }));

  return (
    <Box mih="100vh">
      <Container size="xs">
        <Stack align="center" gap="lg" py={60}>
          <IconDeviceMobile size={48} color="var(--mantine-color-blue-filled)" />
          <Text fw={700} fz={24} ta="center">
            Rejestracja urządzenia
          </Text>
          <Text fz="sm" c="dimmed" ta="center">
            To urządzenie nie jest jeszcze zarejestrowane w systemie FORMEN. Wypełnij formularz -
            szef zatwierdzi dostęp.
          </Text>

          <Divider w="100%" />

          <Stack gap="md" w="100%">
            <TextInput
              label="Nazwa urządzenia"
              placeholder="np. iPhone Oliwia, Tablet recepcja"
              {...form.getInputProps("deviceName")}
            />
            <Select
              label="Typ urządzenia"
              data={DEVICE_TYPES}
              {...form.getInputProps("deviceType")}
            />
            {form.values.deviceType === "personal" && (
              <Select
                label="Przypisany pracownik"
                placeholder="Wybierz..."
                data={employeeOptions}
                clearable
                {...form.getInputProps("employeeId")}
              />
            )}
            {form.values.deviceType === "admin" && (
              <TextInput
                label="PIN szefa"
                placeholder="Wprowadź PIN"
                leftSection={<IconLock size={16} />}
                type="password"
                inputMode="numeric"
                maxLength={4}
                {...form.getInputProps("adminPin")}
              />
            )}
            <Button fullWidth size="lg" onClick={handleSubmit} loading={submitting}>
              Zarejestruj
            </Button>
          </Stack>

          <Text fz={10} c="dimmed" ta="center">
            ID: {deviceId.slice(0, 8)}...
          </Text>
        </Stack>
      </Container>
    </Box>
  );
}

function PendingScreen(): React.JSX.Element {
  const { device, refetch } = useDevice();

  return (
    <Box mih="100vh">
      <Container size="xs">
        <Stack align="center" gap="lg" py={80}>
          <IconClock size={48} color="var(--mantine-color-yellow-filled)" />
          <Text fw={700} fz={24} ta="center">
            Oczekiwanie na zatwierdzenie
          </Text>
          <Text fz="sm" c="dimmed" ta="center">
            Urządzenie{" "}
            <Text span fw={600}>
              {device?.deviceName}
            </Text>{" "}
            zostało zarejestrowane. Poczekaj, aż szef zatwierdzi dostęp w panelu admina.
          </Text>
          <Button variant="light" onClick={refetch}>
            Sprawdź status
          </Button>
        </Stack>
      </Container>
    </Box>
  );
}

function BlockedScreen(): React.JSX.Element {
  return (
    <Box mih="100vh">
      <Container size="xs">
        <Stack align="center" gap="lg" py={80}>
          <IconShieldOff size={48} color="var(--mantine-color-red-filled)" />
          <Text fw={700} fz={24} ta="center">
            Urządzenie zablokowane
          </Text>
          <Text fz="sm" c="dimmed" ta="center">
            To urządzenie zostało zablokowane przez administratora. Skontaktuj się z szefem salonu.
          </Text>
        </Stack>
      </Container>
    </Box>
  );
}

interface DeviceGateProps {
  children: React.ReactNode;
}

export function DeviceGate({ children }: DeviceGateProps): React.JSX.Element {
  const { status } = useDevice();

  if (status === "loading") {
    return (
      <Box mih="100vh">
        <Container size="xs">
          <Stack align="center" gap="md" py={80}>
            <Loader size="lg" />
            <Text fz="sm" c="dimmed">
              Sprawdzanie urządzenia...
            </Text>
          </Stack>
        </Container>
      </Box>
    );
  }

  if (status === "unregistered") return <RegisterScreen />;
  if (status === "pending") return <PendingScreen />;
  if (status === "blocked") return <BlockedScreen />;

  return <>{children}</>;
}
