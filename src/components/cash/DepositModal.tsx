import { useState } from "react";
import { Text, Stack, Modal, NumberInput, Select, Button } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconCash } from "@tabler/icons-react";

interface DepositModalProps {
  opened: boolean;
  onClose: () => void;
  employeeOptions: { value: string; label: string }[];
  lockedEmployeeId?: string | null;
  onDeposit: (employeeId: string, amount: number) => Promise<void>;
}

export function DepositModal({
  opened,
  onClose,
  employeeOptions,
  lockedEmployeeId,
  onDeposit,
}: DepositModalProps) {
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
      console.error("[CashPage] Deposit failed:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Text fw={700} fz="lg">
          Wpłata własna do kasy
        </Text>
      }
      size="sm"
    >
      <Stack gap="md">
        <Text fz="sm" c="dimmed">
          Wpłata własnych pieniędzy do kasetki lub pokrycie reszty dla klienta. Kwota doliczy się do
          Portfela pracownika.
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
          size="md"
          data-autofocus
          onFocus={(event) => event.currentTarget.select()}
          {...form.getInputProps("amount")}
        />

        <Button
          fullWidth
          size="lg"
          color="green"
          loading={submitting}
          onClick={handleSubmit}
          leftSection={<IconCash size={20} />}
        >
          Wpłać do kasy
        </Button>
      </Stack>
    </Modal>
  );
}
