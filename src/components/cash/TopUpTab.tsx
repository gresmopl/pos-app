import { Text, Stack, NumberInput, Select, Button } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconPlus } from "@tabler/icons-react";

interface TopUpTabProps {
  onTopUp: (amount: number, reason: string) => void;
}

export function TopUpTab({ onTopUp }: TopUpTabProps) {
  const form = useForm({
    initialValues: {
      amount: "" as number | string,
      reason: "Zasilenie (drobne od szefa)",
    },
    validate: {
      amount: (v) => (!Number(v) || Number(v) <= 0 ? "Podaj kwotę" : null),
    },
  });

  const handleSubmit = () => {
    if (form.validate().hasErrors) return;
    onTopUp(Number(form.values.amount), form.values.reason);
    form.reset();
  };

  return (
    <Stack gap="md" py="md">
      <Text fz="xs" c="var(--mantine-color-text)" tt="uppercase" lts={1}>
        Wpłata do kasy
      </Text>
      <Text fz="sm">Zasilenie kasetki gotówką (np. drobne od szefa).</Text>

      <Select
        label="Powód"
        data={[
          { value: "Zasilenie (drobne od szefa)", label: "Zasilenie (drobne od szefa)" },
          { value: "Inne", label: "Inne" },
        ]}
        {...form.getInputProps("reason")}
      />

      <NumberInput
        label="Kwota"
        placeholder="0"
        min={0}
        suffix=" zł"
        {...form.getInputProps("amount")}
      />

      <Button
        size="lg"
        color="green"
        fullWidth
        onClick={handleSubmit}
        leftSection={<IconPlus size={20} />}
      >
        Wpłać do kasy
      </Button>
    </Stack>
  );
}
