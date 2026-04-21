import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Text, Group, Stack, Box, Container, Divider, PinInput, Button } from "@mantine/core";
import { IconLock, IconRefresh, IconDownload } from "@tabler/icons-react";
import { MOCK_ADMIN_PIN } from "@/lib/constants";
import { PageHeader } from "@/components/layout/PageHeader";

declare const APP_VERSION: string;

async function forceUpdate(): Promise<void> {
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.map((r) => r.unregister()));
  const keys = await caches.keys();
  await Promise.all(keys.map((k) => caches.delete(k)));
  window.location.reload();
}

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
}

// Catch event at module level (fires before component mounts)
let savedPrompt: BeforeInstallPromptEvent | null = null;
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  savedPrompt = e as BeforeInstallPromptEvent;
});

export default function AdminPage() {
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [canInstall, setCanInstall] = useState(!!savedPrompt);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      savedPrompt = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async (): Promise<void> => {
    if (!savedPrompt) return;
    await savedPrompt.prompt();
    savedPrompt = null;
    setCanInstall(false);
  };

  const handlePinComplete = (value: string) => {
    if (value === MOCK_ADMIN_PIN) {
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
          <PageHeader
            title="Panel admina"
            rightSection={
              <Text fz="xs" c="dimmed">
                v{APP_VERSION}
              </Text>
            }
          />
          <Divider />
          <Stack align="center" gap="lg" py={60}>
            <IconLock size={40} color="var(--mantine-color-dimmed)" />
            <Text fz="lg" fw={500}>
              Wprowadź PIN
            </Text>
            <PinInput
              length={4}
              inputMode="numeric"
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
            <Button
              variant="subtle"
              color="gray"
              size="sm"
              leftSection={<IconRefresh size={14} />}
              onClick={forceUpdate}
            >
              v{APP_VERSION} · Wymuś aktualizację
            </Button>
            {canInstall && (
              <Button
                variant="subtle"
                color="gray"
                size="sm"
                leftSection={<IconDownload size={14} />}
                onClick={handleInstall}
              >
                Zainstaluj na ekranie głównym
              </Button>
            )}
          </Stack>
        </Container>
      </Box>
    );
  }

  return (
    <Box mih="100vh">
      <Container size="lg">
        <PageHeader
          title="Panel admina"
          rightSection={
            <Text fz="xs" c="dimmed">
              v{APP_VERSION}
            </Text>
          }
        />
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
            description="Profile, prowizje, aktywność"
            onClick={() => navigate("/admin/employees")}
          />
          <Divider />
          <AdminLink
            label="Urządzenia"
            description="Rejestracja, zatwierdzanie, blokowanie"
            onClick={() => navigate("/admin/devices")}
          />
          <Divider />
          <AdminLink
            label="Ustawienia"
            description="Dane salonu, kasa, bony, prowizje, płatności"
            onClick={() => navigate("/admin/settings")}
          />
          <Divider />
          <AdminLink
            label="Raporty miesięczne"
            description="Zestawienia, eksport"
            onClick={() => {}}
            disabled
          />
          <Divider />
          <AdminLink
            label="Ankieta dla szefa"
            description="Pytania projektowe, uwagi, zgłoszenia"
            onClick={() => navigate("/admin/survey")}
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
          <Text fw={500} fz="md" ta="left">
            {label}
          </Text>
          <Text fz="sm" ta="left">
            {description}
          </Text>
        </div>
        <Text fz="lg" c="dimmed">
          ›
        </Text>
      </Group>
    </Button>
  );
}
