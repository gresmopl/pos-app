import { useState } from "react";
import {
  Container,
  Divider,
  SegmentedControl,
  Button,
  Stack,
  Group,
  Text,
  Box,
  Table,
  SimpleGrid,
} from "@mantine/core";
import { MonthPickerInput, DatePickerInput } from "@mantine/dates";
import { IconFileSpreadsheet } from "@tabler/icons-react";
import dayjs from "dayjs";
import { db } from "@/db";
import {
  buildReport,
  monthPeriod,
  rangePeriod,
  previousPeriodOf,
  type MonthlyReport,
} from "@/lib/reports";
import { exportReportToExcel } from "@/lib/reportExport";
import { PageHeader } from "@/components/layout/PageHeader";
import { SectionLabel } from "@/components/layout/SectionLabel";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

type Mode = "month" | "range";

const card = {
  border: "1px solid var(--mantine-color-default-border)",
  borderRadius: "var(--mantine-radius-md)",
};

function zl(n: number): string {
  return `${n.toFixed(2)} zł`;
}

export default function AdminReports(): React.JSX.Element {
  useDocumentTitle("Raporty miesięczne");
  const [mode, setMode] = useState<Mode>("month");
  // Domyślnie poprzedni (zamknięty) miesiąc - raport robi się za miesiąc, który się skończył.
  const [month, setMonth] = useState<Date>(() => dayjs().subtract(1, "month").toDate());
  const [from, setFrom] = useState<Date | null>(null);
  const [to, setTo] = useState<Date | null>(null);
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const canGenerate = mode === "month" ? !!month : !!from && !!to;

  async function generate(): Promise<void> {
    const period = mode === "month" ? monthPeriod(month) : rangePeriod(from!, to!);
    const previousPeriod = previousPeriodOf(period);
    setLoading(true);
    setReport(null);
    try {
      const [transactions, cashReports, employees] = await Promise.all([
        db.transactions.getSince(previousPeriod.start),
        db.dailyReports.getRecent(500),
        db.employees.getAll(),
      ]);
      setReport(buildReport({ transactions, cashReports, employees, period, previousPeriod }));
    } catch (err) {
      console.error("[AdminReports] generate failed:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleExport(): Promise<void> {
    if (!report) return;
    const suffix =
      mode === "month"
        ? dayjs(month).format("YYYY-MM")
        : `${dayjs(from!).format("YYYY-MM-DD")}_${dayjs(to!).format("YYYY-MM-DD")}`;
    setExporting(true);
    try {
      await exportReportToExcel(report, suffix);
    } catch (err) {
      console.error("[AdminReports] export failed:", err);
    } finally {
      setExporting(false);
    }
  }

  const isEmpty =
    report !== null && report.finance.txCount === 0 && report.cash.shifts.length === 0;

  return (
    <Container size="lg">
      <PageHeader title="Raporty miesięczne" backTo="/admin" />
      <Divider />

      <Stack gap="md" py="md">
        <SegmentedControl
          value={mode}
          onChange={(v) => setMode(v as Mode)}
          data={[
            { label: "Miesiąc", value: "month" },
            { label: "Zakres dat", value: "range" },
          ]}
        />

        {mode === "month" ? (
          <MonthPickerInput
            label="Miesiąc"
            value={month}
            onChange={(v) => setMonth(v ? dayjs(v).toDate() : new Date())}
            valueFormat="MMMM YYYY"
            maxDate={new Date()}
          />
        ) : (
          <Group grow>
            <DatePickerInput
              label="Od"
              valueFormat="D MMM YYYY"
              value={from}
              onChange={(v) => setFrom(v ? dayjs(v).toDate() : null)}
              maxDate={to ?? new Date()}
              clearable
            />
            <DatePickerInput
              label="Do"
              valueFormat="D MMM YYYY"
              value={to}
              onChange={(v) => setTo(v ? dayjs(v).toDate() : null)}
              minDate={from ?? undefined}
              maxDate={new Date()}
              clearable
            />
          </Group>
        )}

        <Button onClick={generate} loading={loading} disabled={!canGenerate}>
          Generuj raport
        </Button>
      </Stack>

      {report && (
        <>
          <Group justify="space-between" align="center" mb="sm">
            <Text fw={600}>{report.period.label}</Text>
            <Button
              variant="light"
              leftSection={<IconFileSpreadsheet size={16} />}
              onClick={handleExport}
              loading={exporting}
              disabled={isEmpty}
            >
              Eksportuj do Excela
            </Button>
          </Group>

          {isEmpty ? (
            <Text c="dimmed" ta="center" py="xl">
              Brak danych za wybrany okres
            </Text>
          ) : (
            <Stack gap="lg">
              {/* FINANSE */}
              <div>
                <SectionLabel>Finanse salonu</SectionLabel>
                <SimpleGrid cols={2} spacing="sm">
                  <Box p="md" style={card}>
                    <Text fz="xs" c="dimmed">
                      Przychód netto
                    </Text>
                    <Text fw={700} fz="xl">
                      {zl(report.finance.totalRevenue)}
                    </Text>
                  </Box>
                  <Box p="md" style={card}>
                    <Text fz="xs" c="dimmed">
                      Transakcje
                    </Text>
                    <Text fw={700} fz="xl">
                      {report.finance.txCount}
                    </Text>
                  </Box>
                  <Box p="md" style={card}>
                    <Text fz="xs" c="dimmed">
                      Usługi / Produkty
                    </Text>
                    <Text fw={700} fz="md">
                      {zl(report.finance.serviceRevenue)} / {zl(report.finance.productRevenue)}
                    </Text>
                  </Box>
                  <Box p="md" style={card}>
                    <Text fz="xs" c="dimmed">
                      Bony / Rabaty / Napiwki
                    </Text>
                    <Text fw={700} fz="md">
                      {zl(report.finance.voucherSales)} / {zl(report.finance.totalDiscounts)} /{" "}
                      {zl(report.finance.totalTips)}
                    </Text>
                  </Box>
                </SimpleGrid>
              </div>

              {/* PRACOWNICY */}
              <div>
                <SectionLabel>Rozliczenie pracowników</SectionLabel>
                <Box style={card} p="xs">
                  <Table>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Pracownik</Table.Th>
                        <Table.Th ta="right">Usł.</Table.Th>
                        <Table.Th ta="right">Prod.</Table.Th>
                        <Table.Th ta="right">Przychód</Table.Th>
                        <Table.Th ta="right">Napiwki</Table.Th>
                        <Table.Th ta="right">Prowizja</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {report.employees.map((e) => (
                        <Table.Tr key={e.employeeId}>
                          <Table.Td>{e.name}</Table.Td>
                          <Table.Td ta="right">{e.servicesCount}</Table.Td>
                          <Table.Td ta="right">{e.productsCount}</Table.Td>
                          <Table.Td ta="right">{zl(e.netRevenue)}</Table.Td>
                          <Table.Td ta="right">{zl(e.tips)}</Table.Td>
                          <Table.Td ta="right">{zl(e.commission)}</Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </Box>
              </div>

              {/* KASA */}
              <div>
                <SectionLabel>Kontrola gotówki</SectionLabel>
                <Box p="md" style={card}>
                  <Group justify="space-between">
                    <Text fz="sm" c="dimmed">
                      Bilans kasowy (suma różnic)
                    </Text>
                    <Text
                      fw={700}
                      fz="xl"
                      c={
                        report.cash.totalDifference === 0
                          ? undefined
                          : report.cash.totalDifference > 0
                            ? "green"
                            : "red"
                      }
                    >
                      {zl(report.cash.totalDifference)}
                    </Text>
                  </Group>
                  {report.cash.shifts.length > 0 && (
                    <Table mt="sm">
                      <Table.Tbody>
                        {report.cash.shifts.map((s) => (
                          <Table.Tr key={s.closedAt}>
                            <Table.Td>{s.closedAt.slice(0, 10)}</Table.Td>
                            <Table.Td>{s.closingEmployeeName}</Table.Td>
                            <Table.Td
                              ta="right"
                              c={
                                s.difference === 0 ? undefined : s.difference > 0 ? "green" : "red"
                              }
                            >
                              {zl(s.difference)}
                            </Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  )}
                </Box>
              </div>

              {/* TRENDY */}
              <div>
                <SectionLabel>Trendy</SectionLabel>
                <SimpleGrid cols={3} spacing="sm">
                  <Box p="md" style={card}>
                    <Text fz="xs" c="dimmed">
                      Zmiana przychodu
                    </Text>
                    <Text fw={700} fz="lg">
                      {report.trend.revenueDeltaPercent === null
                        ? "—"
                        : `${report.trend.revenueDeltaPercent}%`}
                    </Text>
                  </Box>
                  <Box p="md" style={card}>
                    <Text fz="xs" c="dimmed">
                      Zmiana liczby usług
                    </Text>
                    <Text fw={700} fz="lg">
                      {report.trend.servicesDeltaPercent === null
                        ? "—"
                        : `${report.trend.servicesDeltaPercent}%`}
                    </Text>
                  </Box>
                  <Box p="md" style={card}>
                    <Text fz="xs" c="dimmed">
                      Najlepszy dzień
                    </Text>
                    <Text fw={700} fz="md">
                      {report.trend.bestDay
                        ? `${report.trend.bestDay.date} (${report.trend.bestDay.services})`
                        : "—"}
                    </Text>
                  </Box>
                </SimpleGrid>
              </div>
            </Stack>
          )}
        </>
      )}
    </Container>
  );
}
