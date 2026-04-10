import { useState } from "react";
import { Text, Group, Box, UnstyledButton, Modal, Stack, NumberInput, Button } from "@mantine/core";
import { TIP_PERCENTAGES } from "@/lib/constants";

interface TipSelectorProps {
  subtotal: number;
  tipAmount: number;
  onTipChange: (amount: number) => void;
}

export function TipSelector({ subtotal, tipAmount, onTipChange }: TipSelectorProps) {
  const [customTipModal, setCustomTipModal] = useState(false);
  const [customTipValue, setCustomTipValue] = useState<number | string>("");

  const isCustomTip =
    tipAmount > 0 && !TIP_PERCENTAGES.some((p) => Math.round(subtotal * (p / 100)) === tipAmount);

  return (
    <>
      <Box py="md">
        <Text fz="xs" c="var(--mantine-color-text)" tt="uppercase" lts={1} mb="xs">
          Napiwek
        </Text>
        <Group gap="sm">
          <UnstyledButton
            px="md"
            py="xs"
            style={{
              border: "1px solid var(--mantine-color-default-border)",
              borderRadius: "var(--mantine-radius-md)",
              backgroundColor: isCustomTip ? "var(--mantine-color-green-light)" : undefined,
            }}
            onClick={() => {
              setCustomTipValue(tipAmount || "");
              setCustomTipModal(true);
            }}
          >
            <Text fz="sm" fw={500} ta="center">
              Wpisz
            </Text>
            <Text fz="xs" c="dimmed" ta="center">
              {isCustomTip ? `${tipAmount} zł` : "... zł"}
            </Text>
          </UnstyledButton>
          {TIP_PERCENTAGES.map((val) => {
            const tipVal = Math.round(subtotal * (val / 100));
            return (
              <UnstyledButton
                key={val}
                onClick={() => onTipChange(tipVal)}
                px="md"
                py="xs"
                style={{
                  border: "1px solid var(--mantine-color-default-border)",
                  borderRadius: "var(--mantine-radius-md)",
                  backgroundColor:
                    tipAmount === tipVal ? "var(--mantine-color-green-light)" : undefined,
                }}
              >
                <Text fz="sm" fw={500} ta="center">
                  {val}%
                </Text>
                <Text fz="xs" c="dimmed" ta="center">
                  {tipVal} zł
                </Text>
              </UnstyledButton>
            );
          })}
          <UnstyledButton
            onClick={() => onTipChange(0)}
            px="md"
            py="xs"
            style={{
              border: "1px solid var(--mantine-color-default-border)",
              borderRadius: "var(--mantine-radius-md)",
              backgroundColor: tipAmount === 0 ? "var(--mantine-color-green-light)" : undefined,
            }}
          >
            <Text fz="sm" fw={500} ta="center">
              Bez
            </Text>
            <Text fz="xs" c="dimmed" ta="center">
              0 zł
            </Text>
          </UnstyledButton>
        </Group>
      </Box>

      <Modal
        opened={customTipModal}
        onClose={() => setCustomTipModal(false)}
        title={
          <Text fw={700} fz="lg">
            Napiwek
          </Text>
        }
        size="xs"
      >
        <Stack gap="md">
          <NumberInput
            label="Kwota napiwku"
            placeholder="0"
            value={customTipValue}
            onChange={setCustomTipValue}
            min={0}
            suffix=" zł"
            size="lg"
          />
          <Button
            fullWidth
            onClick={() => {
              onTipChange(Number(customTipValue) || 0);
              setCustomTipModal(false);
            }}
          >
            Zatwierdź
          </Button>
        </Stack>
      </Modal>
    </>
  );
}
