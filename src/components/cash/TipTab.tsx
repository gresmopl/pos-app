import { useState } from "react";
import { Text, Stack, Box, NumberInput, Select, Button } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconCash } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useEmployees } from "@/hooks/useDbData";

interface TipTabProps {
  employeeOptions: { value: string; label: string }[];
  onWithdraw: (employeeId: string, amount: number) => Promise<void>;
  lockedEmployeeId?: string | null;
}

export function TipTab({ employeeOptions, onWithdraw, lockedEmployeeId }: TipTabProps) {
  const { data: employees = [], refetch } = useEmployees();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    initialValues: {
      employee: (lockedEmployeeId ?? "") as string,
      amount: "" as number | string,
    },
    validate: {
      employee: (v) => (v ? null : "Wybierz pracownika"),
      amount: (v) => {
        const n = Number(v);
        if (!n || n <= 0) return "Podaj kwotę";
        const emp = employees.find((e) => e.id === form.values.employee);
        if (emp && n > emp.tipBalance) return "Kwota przekracza saldo portfela";
        return null;
      },
    },
  });

  const selectedEmployee = employees.find((e) => e.id === form.values.employee);

  const handleSubmit = async () => {
    if (form.validate().hasErrors) return;
    setSubmitting(true);
    try {
      await onWithdraw(form.values.employee, Number(form.values.amount));
      refetch();
      form.reset();
    } catch (err) {
      console.error("[TipTab] Withdrawal failed:", err);
      notifications.show({ message: "Błąd wypłaty z portfela", color: "red" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Stack gap="md" py="md">
      <Text fz="xs" c="var(--mantine-color-text)" tt="uppercase" lts={1}>
        Wypłata z portfela
      </Text>
      <Text fz="sm">
        Fryzjer pobiera z kasetki pieniądze należne: napiwki z karty/BLIK oraz własne wpłaty
        drobnych.
      </Text>

      <Select
        label="Pracownik"
        placeholder="Wybierz..."
        data={employeeOptions}
        disabled={!!lockedEmployeeId}
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
            Do wypłaty · {selectedEmployee.name}
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
        {...form.getInputProps("amount")}
      />

      <Button
        size="lg"
        color="green"
        fullWidth
        onClick={handleSubmit}
        loading={submitting}
        leftSection={<IconCash size={20} />}
      >
        Potwierdź wypłatę
      </Button>
    </Stack>
  );
}
