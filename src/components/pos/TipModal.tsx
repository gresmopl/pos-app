import { useEffect, useState } from "react";
import { Text, Group, Stack, Modal, NumberInput, Button, SimpleGrid } from "@mantine/core";
import { MAX_TIP } from "@/lib/constants";

interface TipModalProps {
  opened: boolean;
  onClose: () => void;
  tipAmount: number;
  onApply: (amount: number) => void;
}

export function TipModal({ opened, onClose, tipAmount, onApply }: TipModalProps) {
  const [value, setValue] = useState<number | string>(tipAmount || 0);
  const quickAmounts = [1, 5, 10, 20];

  useEffect(() => {
    if (opened) {
      setValue(tipAmount || 0);
    }
  }, [opened, tipAmount]);

  const handleApply = () => {
    onApply(Math.min(MAX_TIP, Math.max(0, Number(value) || 0)));
    onClose();
  };

  const handleClear = () => {
    onApply(0);
    onClose();
  };

  const incrementValue = (amount: number) => {
    setValue((current) => Math.min(MAX_TIP, (Number(current) || 0) + amount));
  };

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Text fw={700} fz="lg">
          Napiwek
        </Text>
      }
      size="sm"
    >
      <Stack gap="md">
        <NumberInput
          label="Kwota napiwku (zł)"
          data-autofocus
          value={value}
          onChange={setValue}
          min={0}
          max={MAX_TIP}
          decimalScale={2}
          suffix=" zł"
          inputMode="decimal"
          onFocus={(event) => event.currentTarget.select()}
        />
        <SimpleGrid cols={4} spacing="xs">
          {quickAmounts.map((amount) => (
            <Button key={amount} variant="light" size="md" onClick={() => incrementValue(amount)}>
              +{amount}
            </Button>
          ))}
        </SimpleGrid>
        <Group justify="space-between">
          <Button variant="subtle" color="red" size="lg" onClick={handleClear}>
            Usuń napiwek
          </Button>
          <Button size="lg" onClick={handleApply}>
            Zastosuj
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
