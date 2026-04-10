import { Text, Group, Box, NumberInput, Button } from "@mantine/core";

interface TipSelectorProps {
  tipAmount: number;
  onTipChange: (amount: number) => void;
}

export function TipSelector({ tipAmount, onTipChange }: TipSelectorProps) {
  return (
    <Box py="md">
      <Text fz="xs" c="var(--mantine-color-text)" tt="uppercase" lts={1} mb="xs">
        Napiwek
      </Text>
      <Group gap="sm" align="flex-end">
        <NumberInput
          placeholder="0"
          value={tipAmount}
          onChange={(val) => onTipChange(Number(val) || 0)}
          min={0}
          suffix=" zł"
          size="md"
          style={{ flex: 1 }}
        />
        <Button
          variant={tipAmount === 0 ? "filled" : "light"}
          color="gray"
          size="md"
          onClick={() => onTipChange(0)}
        >
          Bez napiwku
        </Button>
      </Group>
    </Box>
  );
}
