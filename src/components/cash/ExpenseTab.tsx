import { Text, Group, Stack, Divider, NumberInput, TextInput, Select, Button } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconCash, IconReceipt } from "@tabler/icons-react";
import type { CashMovement } from "./types";

interface ExpenseTabProps {
  employeeOptions: { value: string; label: string }[];
  pendingExpenses: CashMovement[];
  onTake: (employeeId: string, amount: number, desc: string) => void;
  onSettleClick: (expense: CashMovement) => void;
  lockedEmployeeId?: string | null;
}

export function ExpenseTab({
  employeeOptions,
  pendingExpenses,
  onTake,
  onSettleClick,
  lockedEmployeeId,
}: ExpenseTabProps) {
  const form = useForm({
    initialValues: {
      employee: (lockedEmployeeId ?? "") as string,
      amount: "" as number | string,
      desc: "",
    },
    validate: {
      employee: (v) => (v ? null : "Wybierz pracownika"),
      amount: (v) => (!Number(v) || Number(v) <= 0 ? "Podaj kwotę" : null),
    },
  });

  const handleSubmit = () => {
    if (form.validate().hasErrors) return;
    onTake(form.values.employee, Number(form.values.amount), form.values.desc);
    form.reset();
  };

  return (
    <Stack gap="md" py="md">
      {pendingExpenses.length > 0 && (
        <>
          <Text fz="xs" c="var(--mantine-color-text)" tt="uppercase" lts={1}>
            Do rozliczenia
          </Text>
          <Stack gap={0}>
            {pendingExpenses.map((exp, index) => (
              <div key={exp.id}>
                <Group justify="space-between" py="sm" px="xs">
                  <div>
                    <Text fw={500} fz="md">
                      {exp.description}
                    </Text>
                    <Text fz="xs" c="dimmed">
                      {exp.employeeName} · Pobrano {exp.amount.toLocaleString("pl-PL")} zł
                    </Text>
                  </div>
                  <Button
                    variant="light"
                    size="sm"
                    onClick={() => onSettleClick(exp)}
                    leftSection={<IconReceipt size={16} />}
                  >
                    Rozlicz
                  </Button>
                </Group>
                {index < pendingExpenses.length - 1 && <Divider />}
              </div>
            ))}
          </Stack>
          <Divider />
        </>
      )}

      <Text fz="xs" c="var(--mantine-color-text)" tt="uppercase" lts={1}>
        Pobierz na zakupy
      </Text>
      <Text fz="sm">Pracownik pobiera gotówkę z kasetki na zakupy salonowe.</Text>

      <Select
        label="Pracownik"
        placeholder="Wybierz..."
        data={employeeOptions}
        disabled={!!lockedEmployeeId}
        {...form.getInputProps("employee")}
      />

      <NumberInput
        label="Kwota"
        placeholder="0"
        min={0}
        suffix=" zł"
        {...form.getInputProps("amount")}
      />

      <TextInput
        label="Cel (opcjonalnie)"
        placeholder="np. Środki czystości"
        {...form.getInputProps("desc")}
      />

      <Button size="lg" fullWidth onClick={handleSubmit} leftSection={<IconCash size={20} />}>
        Pobierz z kasy
      </Button>
    </Stack>
  );
}
