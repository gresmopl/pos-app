import { Text, Stack, Box, NumberInput, Select, Button } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconCash } from "@tabler/icons-react";
import { mockEmployees } from "@/data/employees";

interface TipTabProps {
  employeeOptions: { value: string; label: string }[];
  onWithdraw: (employeeId: string, amount: number) => void;
}

export function TipTab({ employeeOptions, onWithdraw }: TipTabProps) {
  const form = useForm({
    initialValues: {
      employee: "" as string,
      amount: "" as number | string,
    },
    validate: {
      employee: (v) => (v ? null : "Wybierz pracownika"),
      amount: (v) => {
        const n = Number(v);
        if (!n || n <= 0) return "Podaj kwotę";
        const emp = mockEmployees.find((e) => e.id === form.values.employee);
        if (emp && n > emp.tipBalance) return "Kwota przekracza dostępne napiwki";
        return null;
      },
    },
  });

  const selectedEmployee = mockEmployees.find((e) => e.id === form.values.employee);

  const handleSubmit = () => {
    if (form.validate().hasErrors) return;
    onWithdraw(form.values.employee, Number(form.values.amount));
    form.reset();
  };

  return (
    <Stack gap="md" py="md">
      <div>
        <Text fz="xs" c="var(--mantine-color-text)" tt="uppercase" lts={1} mb="xs">
          Wypłata napiwków
        </Text>
        <Text fz="sm" mb="md">
          Fryzjer pobiera zgromadzone napiwki z kasetki.
        </Text>
      </div>

      <Select
        label="Pracownik"
        placeholder="Wybierz..."
        data={employeeOptions}
        {...form.getInputProps("employee")}
      />

      {selectedEmployee && (
        <Box
          p="md"
          style={{
            borderRadius: "var(--mantine-radius-md)",
            border: "1px solid var(--mantine-color-default-border)",
          }}
        >
          <Text fz="xs" c="dimmed">
            Dostępne napiwki · {selectedEmployee.name}
          </Text>
          <Text fw={700} fz={28}>
            {selectedEmployee.tipBalance.toLocaleString("pl-PL", { minimumFractionDigits: 2 })} zł
          </Text>
        </Box>
      )}

      <NumberInput
        label="Kwota do wypłaty"
        placeholder="0"
        min={0}
        max={selectedEmployee?.tipBalance ?? 0}
        suffix=" zł"
        size="md"
        {...form.getInputProps("amount")}
      />

      <Button
        size="lg"
        color="green"
        fullWidth
        onClick={handleSubmit}
        leftSection={<IconCash size={20} />}
      >
        Potwierdź wypłatę
      </Button>
    </Stack>
  );
}
