import { Text, Group, Stack, Box, Divider } from "@mantine/core";
import { IconArrowUp, IconArrowDown, IconGift, IconReceipt, IconWallet } from "@tabler/icons-react";
import type { CashMovement } from "./types";

interface MovementHistoryProps {
  movements: CashMovement[];
}

export function MovementHistory({ movements }: MovementHistoryProps) {
  if (movements.length === 0) {
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
      <Text fz="xs" c="var(--mantine-color-text)" tt="uppercase" lts={1} mt="sm">
        Dzisiejsze operacje
      </Text>
      <Stack gap={0}>
        {movements.map((m, index) => {
          const isOut = ["tip_withdrawal", "expense_take", "barber_payback"].includes(m.type);
          const isDebt = m.type === "barber_loan";
          const isVoucher = m.type === "voucher_sale";
          const isOwnDeposit = m.type === "own_cash_deposit";

          const bgColor = isDebt
            ? "var(--mantine-color-yellow-light)"
            : isOut
              ? "var(--mantine-color-red-light)"
              : "var(--mantine-color-green-light)";

          const iconColor = isDebt
            ? "var(--mantine-color-yellow-filled)"
            : isOut
              ? "var(--mantine-color-red-filled)"
              : "var(--mantine-color-green-filled)";

          const amountColor = isDebt ? "yellow" : isOut ? "red" : "green";
          const amountPrefix = isDebt ? "" : isOut ? "-" : "+";

          return (
            <div key={m.id}>
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
                    {isDebt ? (
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
              {index < movements.length - 1 && <Divider />}
            </div>
          );
        })}
      </Stack>
    </>
  );
}
