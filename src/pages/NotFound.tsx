import { useNavigate } from "react-router";
import { Container, Stack, Text, Button, Box } from "@mantine/core";
import { IconError404 } from "@tabler/icons-react";

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <Box mih="100vh">
      <Container size="sm">
        <Stack align="center" gap="lg" py={80}>
          <Box
            p="lg"
            style={{
              borderRadius: "50%",
              backgroundColor: "var(--mantine-color-gray-light)",
            }}
          >
            <IconError404 size={48} color="var(--mantine-color-dimmed)" />
          </Box>
          <Text fw={700} fz={24} ta="center">
            Strona nie istnieje
          </Text>
          <Text fz="sm" ta="center" c="dimmed">
            Podany adres nie został znaleziony. Sprawdź URL lub wróć do strony głównej.
          </Text>
          <Button onClick={() => navigate("/")}>Powrót do ekranu głównego</Button>
        </Stack>
      </Container>
    </Box>
  );
}
