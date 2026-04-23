import { useState } from "react";
import { Text, Stack, NumberInput, Select, Button } from "@mantine/core";
import { SectionLabel } from "@/components/layout/SectionLabel";
import { useForm } from "@mantine/form";
import { IconPlus } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";

interface DepositTabProps {
  employeeOptions: { value: string; label: string }[];
  onDeposit: (employeeId: string, amount: number) => Promise<void>;
  lockedEmployeeId?: string | null;
}

export function DepositTab({ employeeOptions, onDeposit, lockedEmployeeId }: DepositTabProps) {
  const [submitting, setSubmitting] = useState(false);

  const form = useForm({
    initialValues: {
      employee: (lockedEmployeeId ?? "") as string,
      amount: "" as number | string,
    },
    validate: {
      employee: (v) => (v ? null : "Wybierz pracownika"),
      amount: (v) => (!Number(v) || Number(v) <= 0 ? "Podaj kwotę" : null),
    },
  });

  const handleSubmit = async (): Promise<void> => {
    if (form.validate().hasErrors) return;
    setSubmitting(true);
    try {
      await onDeposit(form.values.employee, Number(form.values.amount));
      form.reset();
    } catch (err) {
      console.error("[DepositTab] Deposit failed:", err);
      notifications.show({ message: "Błąd wpłaty do kasy", color: "red" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Stack gap="md" py="md">
      <SectionLabel>Wpłata własna do kasy</SectionLabel>
      <Text fz="sm">
        Kliknij, gdy wrzuciłeś do kasetki własne pieniądze lub dałeś klientowi resztę z własnych.
        Kwota doliczy się do Twojego Portfela.
      </Text>

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

      <Button
        size="lg"
        color="green"
        fullWidth
        onClick={handleSubmit}
        loading={submitting}
        leftSection={<IconPlus size={20} />}
      >
        Wpłać do kasy
      </Button>
    </Stack>
  );
}
