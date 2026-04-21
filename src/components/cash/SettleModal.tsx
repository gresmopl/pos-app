import { Text, Stack, Box, Modal, NumberInput, Button } from "@mantine/core";
import type { CashMovement } from "./types";

interface SettleModalProps {
  opened: boolean;
  onClose: () => void;
  target: CashMovement | null;
  settleCost: number | string;
  setSettleCost: (value: number | string) => void;
  onSettle: () => void;
}

export function SettleModal({
  opened,
  onClose,
  target,
  settleCost,
  setSettleCost,
  onSettle,
}: SettleModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Text fw={700} fz="lg">
          Rozlicz zakupy
        </Text>
      }
      size="sm"
    >
      {target && (
        <Stack gap="md">
          <Box
            p="md"
            style={{
              borderRadius: "var(--mantine-radius-md)",
              border: "1px solid var(--mantine-color-default-border)",
            }}
          >
            <Text fz="sm" c="dimmed">
              Pobrano
            </Text>
            <Text fw={700} fz="xl">
              {target.amount.toLocaleString("pl-PL")} zł
            </Text>
            <Text fz="xs" c="dimmed">
              {target.description} · {target.employeeName}
            </Text>
          </Box>

          <NumberInput
            label="Kwota z paragonu"
            placeholder="0"
            data-autofocus
            value={settleCost}
            onChange={setSettleCost}
            min={0}
            max={target.amount}
            suffix=" zł"
            size="md"
          />

          {Number(settleCost) > 0 && (
            <Box
              p="md"
              style={{
                borderRadius: "var(--mantine-radius-md)",
                backgroundColor: "var(--mantine-color-green-light)",
              }}
            >
              <Text fz="sm" fw={500}>
                Do zwrotu do kasetki:{" "}
                <Text span fw={700}>
                  {(target.amount - Number(settleCost)).toLocaleString("pl-PL")} zł
                </Text>
              </Text>
            </Box>
          )}

          <Button fullWidth size="lg" color="green" onClick={onSettle}>
            Rozlicz
          </Button>
        </Stack>
      )}
    </Modal>
  );
}
