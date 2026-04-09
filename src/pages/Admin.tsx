import { useState } from "react";
import { useNavigate } from "react-router";
import {
  Text,
  Group,
  Stack,
  Box,
  Container,
  ActionIcon,
  Divider,
  PinInput,
  Button,
} from "@mantine/core";
import { IconArrowLeft, IconLock } from "@tabler/icons-react";

const ADMIN_PIN = "1234"; // mock

export default function AdminPage() {
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  const handlePinComplete = (value: string) => {
    if (value === ADMIN_PIN) {
      setAuthenticated(true);
      setError(false);
    } else {
      setError(true);
      setPin("");
    }
  };

  if (!authenticated) {
    return (
      <Box mih="100vh">
        <Container size="xs">
          <Group py="md">
            <ActionIcon variant="subtle" color="gray" size="lg" onClick={() => navigate("/")}>
              <IconArrowLeft size={22} />
            </ActionIcon>
            <Text fw={700} fz={24}>
              Panel admina
            </Text>
          </Group>
          <Divider />
          <Stack align="center" gap="lg" py={60}>
            <IconLock size={40} color="var(--mantine-color-dimmed)" />
            <Text fz="lg" fw={500}>
              Wprowadź PIN
            </Text>
            <PinInput
              length={4}
              mask
              size="xl"
              value={pin}
              onChange={(value) => {
                setPin(value);
                setError(false);
              }}
              onComplete={handlePinComplete}
              error={error}
            />
            {error && (
              <Text fz="sm" c="red">
                Nieprawidłowy PIN
              </Text>
            )}
            <Text fz="xs" c="dimmed">
              PIN testowy: 1234
            </Text>
          </Stack>
        </Container>
      </Box>
    );
  }

  return (
    <Box mih="100vh">
      <Container size="lg">
        <Group py="md">
          <ActionIcon variant="subtle" color="gray" size="lg" onClick={() => navigate("/")}>
            <IconArrowLeft size={22} />
          </ActionIcon>
          <Text fw={700} fz={24}>
            Panel admina
          </Text>
        </Group>
        <Divider />
        <Stack gap={0} py="md">
          <AdminLink
            label="Cennik"
            description="Usługi i produkty"
            onClick={() => navigate("/admin/pricing")}
          />
          <Divider />
          <AdminLink
            label="Pracownicy"
            description="Profile, prowizje, PIN-y"
            onClick={() => {}}
            disabled
          />
          <Divider />
          <AdminLink
            label="Raporty miesięczne"
            description="Zestawienia, eksport"
            onClick={() => {}}
            disabled
          />
        </Stack>
      </Container>
    </Box>
  );
}

function AdminLink({
  label,
  description,
  onClick,
  disabled,
}: {
  label: string;
  description: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      variant="subtle"
      color="gray"
      fullWidth
      justify="start"
      py="md"
      h="auto"
      onClick={onClick}
      disabled={disabled}
      styles={{ label: { width: "100%" } }}
    >
      <Group justify="space-between" w="100%">
        <div>
          <Text fw={500} fz="md">
            {label}
          </Text>
          <Text fz="sm">{description}</Text>
        </div>
        <Text fz="lg" c="dimmed">
          ›
        </Text>
      </Group>
    </Button>
  );
}
