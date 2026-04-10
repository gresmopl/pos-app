import { useState } from "react";
import { Text, Group, Stack, Box, Modal, NumberInput, Button } from "@mantine/core";

interface SplitPaymentModalProps {
  opened: boolean;
  onClose: () => void;
  total: number;
  onConfirm: (method: string, details: string) => void;
}

export function SplitPaymentModal({ opened, onClose, total, onConfirm }: SplitPaymentModalProps) {
  const [cashAmount, setCashAmount] = useState<number | string>("");

  const handleClose = () => {
    onClose();
    setCashAmount("");
  };

  const formatPLN = (val: number) => val.toLocaleString("pl-PL", { minimumFractionDigits: 2 });
  const cashVal = Number(cashAmount) || 0;
  const cardVal = total - cashVal;

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Text fw={700} fz="lg">
          Gotówka + Karta
        </Text>
      }
      size="sm"
    >
      <Stack gap="md">
        <Box ta="center" mb="sm">
          <Text fz="xs" c="var(--mantine-color-text)" tt="uppercase" lts={1}>
            Do zapłaty
          </Text>
          <Text fw={700} fz={28}>
            {formatPLN(total)} zł
          </Text>
        </Box>

        <NumberInput
          label="Kwota gotówką"
          placeholder="0"
          value={cashAmount}
          onChange={setCashAmount}
          min={0}
          max={total}
          suffix=" zł"
          size="md"
        />

        {cashVal > 0 && (
          <Box
            p="md"
            style={{
              borderRadius: "var(--mantine-radius-md)",
              border: "1px solid var(--mantine-color-default-border)",
            }}
          >
            <Group justify="space-between">
              <Text fz="sm">Gotówka:</Text>
              <Text fz="sm" fw={600}>
                {cashVal.toLocaleString("pl-PL")} zł
              </Text>
            </Group>
            <Group justify="space-between">
              <Text fz="sm">Karta:</Text>
              <Text fz="sm" fw={600}>
                {formatPLN(cardVal)} zł
              </Text>
            </Group>
          </Box>
        )}

        <Button
          fullWidth
          size="lg"
          disabled={!cashVal || cashVal >= total}
          onClick={() => {
            onConfirm(
              "Gotówka + Karta",
              `Gotówka: ${cashVal.toLocaleString("pl-PL")} zł, Karta: ${formatPLN(cardVal)} zł`
            );
            setCashAmount("");
          }}
        >
          Zapłać
        </Button>
      </Stack>
    </Modal>
  );
}
