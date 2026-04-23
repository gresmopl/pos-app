import { useMemo } from "react";
import { Text, Group, Stack, Box, Divider } from "@mantine/core";
import {
  IconArrowUp,
  IconArrowDown,
  IconGift,
  IconReceipt,
  IconWallet,
  IconDeviceLandlinePhone,
  IconLock,
} from "@tabler/icons-react";
import type { CashMovement, TerminalCheck } from "@/lib/types";
import { SectionLabel } from "@/components/layout/SectionLabel";

type TimelineEntry =
  | { kind: "movement"; data: CashMovement }
  | { kind: "terminal"; data: TerminalCheck };

interface MovementHistoryProps {
  movements: CashMovement[];
  terminalChecks?: TerminalCheck[];
}

export function MovementHistory({ movements, terminalChecks = [] }: MovementHistoryProps) {
  const entries = useMemo<TimelineEntry[]>(() => {
    const all: TimelineEntry[] = [
      ...movements.map((m) => ({ kind: "movement" as const, data: m })),
      ...terminalChecks.map((t) => ({ kind: "terminal" as const, data: t })),
    ];
    all.sort(
      (a, b) =>
        new Date(a.kind === "movement" ? a.data.timestamp : a.data.createdAt).getTime() -
        new Date(b.kind === "movement" ? b.data.timestamp : b.data.createdAt).getTime()
    );
    return all;
  }, [movements, terminalChecks]);

  if (entries.length === 0) {
    return (
      <>
        <Divider />
        <Text fz="xs" c="dimmed" py="md" ta="center">
          Brak operacji kasowych w tej zmianie
        </Text>
      </>
    );
  }

  return (
    <>
      <Divider />
      <Box mt="sm">
        <SectionLabel>Dzisiejsze operacje</SectionLabel>
      </Box>
      <Stack gap={0}>
        {entries.map((entry, index) => (
          <div key={entry.kind === "movement" ? entry.data.id : `tc-${entry.data.id}`}>
            {entry.kind === "terminal" ? (
              <TerminalCheckRow check={entry.data} />
            ) : (
              <MovementRow movement={entry.data} />
            )}
            {index < entries.length - 1 && <Divider />}
          </div>
        ))}
      </Stack>
    </>
  );
}

function TerminalCheckRow({ check }: { check: TerminalCheck }) {
  return (
    <Group justify="space-between" py="sm" px="xs" wrap="nowrap">
      <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
        <Box
          p={6}
          style={{
            borderRadius: "50%",
            backgroundColor: "var(--mantine-color-blue-light)",
            flexShrink: 0,
          }}
        >
          <IconDeviceLandlinePhone size={14} color="var(--mantine-color-blue-filled)" />
        </Box>
        <div style={{ minWidth: 0 }}>
          <Text fw={500} fz="sm">
            Raport terminala
          </Text>
          <Text fz="xs" c="dimmed">
            Gotówka: {check.calculatedCash.toLocaleString("pl-PL")} zł ·{" "}
            {new Date(check.createdAt).toLocaleTimeString("pl-PL", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </div>
      </Group>
      <Text fw={600} fz="sm" c="blue" style={{ flexShrink: 0 }}>
        {check.terminalAmount.toLocaleString("pl-PL")} zł
      </Text>
    </Group>
  );
}

function MovementRow({ movement: m }: { movement: CashMovement }) {
  const isShiftClose = m.type === "shift_close";
  const isOut = ["tip_withdrawal", "expense_take", "barber_payback"].includes(m.type);
  const isDebt = m.type === "barber_loan";
  const isVoucher = m.type === "voucher_sale";
  const isOwnDeposit = m.type === "own_cash_deposit";

  const bgColor = isShiftClose
    ? "var(--mantine-color-gray-light)"
    : isDebt
      ? "var(--mantine-color-yellow-light)"
      : isOut
        ? "var(--mantine-color-red-light)"
        : "var(--mantine-color-green-light)";

  const iconColor = isShiftClose
    ? "var(--mantine-color-dimmed)"
    : isDebt
      ? "var(--mantine-color-yellow-filled)"
      : isOut
        ? "var(--mantine-color-red-filled)"
        : "var(--mantine-color-green-filled)";

  const amountColor = isShiftClose ? "dimmed" : isDebt ? "yellow" : isOut ? "red" : "green";
  const amountPrefix = isShiftClose ? "" : isDebt ? "" : isOut ? "-" : "+";

  return (
    <Group justify="space-between" py="sm" px="xs" wrap="nowrap">
      <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
        <Box
          p={6}
          style={{
            borderRadius: "50%",
            backgroundColor: bgColor,
            flexShrink: 0,
          }}
        >
          {isShiftClose ? (
            <IconLock size={14} color={iconColor} />
          ) : isDebt ? (
            <IconReceipt size={14} color={iconColor} />
          ) : isOwnDeposit ? (
            <IconWallet size={14} color={iconColor} />
          ) : isVoucher ? (
            <IconGift size={14} color={iconColor} />
          ) : isOut ? (
            <IconArrowUp size={14} color={iconColor} />
          ) : (
            <IconArrowDown size={14} color={iconColor} />
          )}
        </Box>
        <div style={{ minWidth: 0 }}>
          <Text fw={500} fz="sm" lineClamp={2}>
            {m.description}
            {m.status === "settled" && " (rozliczono)"}
          </Text>
          <Text fz="xs" c="dimmed">
            {m.employeeName} ·{" "}
            {new Date(m.timestamp).toLocaleTimeString("pl-PL", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </div>
      </Group>
      <Text fw={600} fz="sm" c={amountColor} style={{ flexShrink: 0 }}>
        {amountPrefix}
        {(m.finalCost ?? m.amount).toLocaleString("pl-PL")} zł
      </Text>
    </Group>
  );
}
