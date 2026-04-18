import { Container, Text, Stack } from "@mantine/core";
import { PageHeader } from "@/components/layout/PageHeader";
import { BOTTOM_NAV_HEIGHT } from "@/components/layout/BottomNavBar";

export default function MorePage(): React.JSX.Element {
  return (
    <Container size="lg" pb={BOTTOM_NAV_HEIGHT + 16}>
      <PageHeader title="Więcej" />
      <Stack align="center" justify="center" mih={300}>
        <Text c="dimmed">Ekran więcej - wkrótce</Text>
      </Stack>
    </Container>
  );
}
