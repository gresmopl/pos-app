import QRCode from "react-qr-code";
import { Text, Stack, Box, Container, Divider, Paper, Button, Code } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconCopy, IconShare } from "@tabler/icons-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { buildAppUrl } from "@/lib/appUrl";

export default function AdminSharePage(): React.JSX.Element {
  useDocumentTitle("Udostępnij aplikację");

  const appUrl = buildAppUrl(window.location.origin, import.meta.env.BASE_URL);
  const canShare = typeof navigator.share === "function";

  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(appUrl);
      notifications.show({ color: "green", message: "Link skopiowany" });
    } catch {
      notifications.show({
        color: "red",
        message: "Nie udało się skopiować. Zaznacz adres i skopiuj ręcznie.",
      });
    }
  };

  const handleShare = async (): Promise<void> => {
    try {
      await navigator.share({ title: "FORMEN", url: appUrl });
    } catch {
      // Uzytkownik anulowal arkusz udostepniania - to nie jest blad.
    }
  };

  return (
    <Box mih="100vh">
      <Container size="xs">
        <PageHeader title="Udostępnij aplikację" backTo="/admin" />
        <Divider />

        <Stack align="center" gap="lg" py="xl">
          <Text fz="sm" c="dimmed" ta="center">
            Pracownik skanuje kod telefonem, wypełnia formularz rejestracji, a Ty zatwierdzasz go w
            „Urządzenia".
          </Text>

          {/* Tlo MUSI byc biale niezaleznie od motywu - kod QR w trybie ciemnym
              wygladalby poprawnie, ale czytniki go nie zeskanuja. */}
          <Paper bg="white" p="md" radius="md" withBorder>
            <QRCode value={appUrl} size={240} level="M" bgColor="#ffffff" fgColor="#000000" />
          </Paper>

          <Code fz="xs" style={{ wordBreak: "break-all" }}>
            {appUrl}
          </Code>

          <Stack gap="sm" w="100%">
            <Button fullWidth size="lg" leftSection={<IconCopy size={18} />} onClick={handleCopy}>
              Skopiuj link
            </Button>
            {canShare && (
              <Button
                fullWidth
                size="lg"
                variant="light"
                leftSection={<IconShare size={18} />}
                onClick={handleShare}
              >
                Wyślij
              </Button>
            )}
          </Stack>
        </Stack>
      </Container>
    </Box>
  );
}
