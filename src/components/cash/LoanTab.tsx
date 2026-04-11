import { Text, Group, Stack, Divider, NumberInput, Select, Button } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconCash, IconHandGrab } from "@tabler/icons-react";
import type { CashMovement } from "./types";

interface LoanTabProps {
  employeeOptions: { value: string; label: string }[];
  pendingLoans: CashMovement[];
  onLoan: (employeeId: string, amount: number) => void;
  onPayback: (loan: CashMovement) => void;
}

export function LoanTab({ employeeOptions, pendingLoans, onLoan, onPayback }: LoanTabProps) {
  const form = useForm({
    initialValues: {
      employee: "" as string,
      amount: "" as number | string,
    },
    validate: {
      employee: (v) => (v ? null : "Wybierz pracownika"),
      amount: (v) => (!Number(v) || Number(v) <= 0 ? "Podaj kwotę" : null),
    },
  });

  const handleSubmit = () => {
    if (form.validate().hasErrors) return;
    onLoan(form.values.employee, Number(form.values.amount));
    form.reset();
  };

  return (
    <Stack gap="md" py="md">
      {pendingLoans.length > 0 && (
        <>
          <Text fz="xs" c="var(--mantine-color-text)" tt="uppercase" lts={1}>
            Do zwrotu
          </Text>
          <Stack gap={0}>
            {pendingLoans.map((loan, index) => (
              <div key={loan.id}>
                <Group justify="space-between" py="sm" px="xs">
                  <div>
                    <Text fw={500} fz="md">
                      {loan.employeeName}
                    </Text>
                    <Text fz="xs" c="dimmed">
                      Wydał z własnych · {loan.amount.toLocaleString("pl-PL")} zł
                    </Text>
                  </div>
                  <Button
                    variant="light"
                    color="green"
                    size="xs"
                    onClick={() => onPayback(loan)}
                    leftSection={<IconHandGrab size={14} />}
                  >
                    Zwróć
                  </Button>
                </Group>
                {index < pendingLoans.length - 1 && <Divider />}
              </div>
            ))}
          </Stack>
          <Divider />
        </>
      )}

      <Text fz="xs" c="var(--mantine-color-text)" tt="uppercase" lts={1}>
        Wydałem z własnych
      </Text>
      <Text fz="sm">Fryzjer wydał resztę z kieszeni (brak drobnych w kasetce).</Text>

      <Select
        label="Pracownik"
        placeholder="Wybierz..."
        data={employeeOptions}
        {...form.getInputProps("employee")}
      />

      <NumberInput
        label="Kwota"
        placeholder="0"
        min={0}
        suffix=" zł"
        {...form.getInputProps("amount")}
      />

      <Button size="lg" fullWidth onClick={handleSubmit} leftSection={<IconCash size={20} />}>
        Zarejestruj dług kasetki
      </Button>
    </Stack>
  );
}
