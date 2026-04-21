import { Container, Text, SimpleGrid, Stack, Group, Progress, Box } from "@mantine/core";
import {
  IconSun,
  IconCalendar,
  IconChartBar,
  IconTrophy,
  IconArrowUpRight,
  IconArrowDownRight,
} from "@tabler/icons-react";
import { useDailyStats } from "@/hooks/useDbData";
import { PageHeader } from "@/components/layout/PageHeader";
import { BOTTOM_NAV_HEIGHT } from "@/components/layout/BottomNavBar";

export default function Stats(): React.JSX.Element {
  const { data: stats, loading } = useDailyStats();

  const diff = (stats?.todayServices ?? 0) - (stats?.yesterdayServices ?? 0);
  const yearDiff =
    stats && stats.lastYearServices > 0
      ? Math.round(((stats.yearServices - stats.lastYearServices) / stats.lastYearServices) * 100)
      : 0;
  const monthProgress =
    stats && stats.monthTarget > 0
      ? Math.round((stats.monthServices / stats.monthTarget) * 100)
      : 0;

  return (
    <Container size="lg" pb={BOTTOM_NAV_HEIGHT + 16}>
      <PageHeader title="Statystyki" backTo="/more" />

      {loading && (
        <Text fz="sm" c="dimmed" ta="center" py="xl">
          Ładowanie...
        </Text>
      )}

      {!loading && !stats && (
        <Text fz="sm" c="dimmed" ta="center" py="xl">
          Nie udało się załadować statystyk
        </Text>
      )}

      {stats &&
        stats.monthTarget === 0 &&
        stats.todayServices === 0 &&
        stats.yearServices === 0 && (
          <Text fz="sm" c="dimmed" ta="center" py="xl">
            Brak danych do wyświetlenia
          </Text>
        )}

      {stats && (
        <SimpleGrid cols={2} spacing="md" py="md">
          <Box
            p="md"
            style={{
              border: "1px solid var(--mantine-color-default-border)",
              borderRadius: "var(--mantine-radius-md)",
            }}
          >
            <Group gap={6} mb={4}>
              <IconSun size={18} color="#fbbf24" />
              <Text fz="xs" c="dimmed">
                Dziś
              </Text>
            </Group>
            <Group gap={6} align="baseline">
              <Text fw={700} fz={28}>
                {stats.todayServices}
              </Text>
              <Text fz="xs" fw={600} c={diff >= 0 ? "green" : "red"}>
                {diff >= 0 ? (
                  <IconArrowUpRight size={12} style={{ verticalAlign: "middle" }} />
                ) : (
                  <IconArrowDownRight size={12} style={{ verticalAlign: "middle" }} />
                )}
                {diff >= 0 ? "+" : ""}
                {diff} vs wczoraj
              </Text>
            </Group>
          </Box>

          <Box
            p="md"
            style={{
              border: "1px solid var(--mantine-color-default-border)",
              borderRadius: "var(--mantine-radius-md)",
            }}
          >
            <Group gap={6} mb={4}>
              <IconCalendar size={18} color="#60a5fa" />
              <Text fz="xs" c="dimmed">
                Miesiąc
              </Text>
            </Group>
            <Text fw={700} fz={28}>
              {stats.monthServices}
            </Text>
            {stats.monthTarget > 0 && (
              <Stack gap={4} mt={4}>
                <Progress value={monthProgress} color="green" size="sm" />
                <Text fz="xs" c="dimmed">
                  {monthProgress}% celu ({stats.monthTarget})
                </Text>
              </Stack>
            )}
          </Box>

          <Box
            p="md"
            style={{
              border: "1px solid var(--mantine-color-default-border)",
              borderRadius: "var(--mantine-radius-md)",
            }}
          >
            <Group gap={6} mb={4}>
              <IconChartBar size={18} color="#a78bfa" />
              <Text fz="xs" c="dimmed">
                Rok
              </Text>
            </Group>
            <Group gap={6} align="baseline">
              <Text fw={700} fz={28}>
                {stats.yearServices}
              </Text>
              {yearDiff !== 0 && (
                <Text fz="xs" fw={600} c={yearDiff >= 0 ? "green" : "red"}>
                  {yearDiff >= 0 ? "+" : ""}
                  {yearDiff}% r/r
                </Text>
              )}
            </Group>
          </Box>

          <Box
            p="md"
            style={{
              border: "1px solid var(--mantine-color-default-border)",
              borderRadius: "var(--mantine-radius-md)",
            }}
          >
            <Group gap={6} mb={4}>
              <IconTrophy size={18} color="#f59e0b" />
              <Text fz="xs" c="dimmed">
                Rekord
              </Text>
            </Group>
            <Text fw={700} fz={28}>
              {stats.allTimeRecord}
            </Text>
            <Text fz="xs" c="dimmed">
              Najlepszy miesiąc
            </Text>
          </Box>
        </SimpleGrid>
      )}
    </Container>
  );
}
