import { useState } from "react";
import {
  Text,
  Stack,
  Modal,
  NumberInput,
  TextInput,
  Select,
  Button,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconCash } from "@tabler/icons-react";

interface ExpenseModalProps {
  opened: boolean;
  onClose: () => void;
  employeeOptions: { value: string; label: string }[];
  lockedEmployeeId?: string | null;
  onTake: (employeeId: string, amount: number, desc: string) => void;
}

export function ExpenseModal({
  opened,
  onClose,
  employeeOptions,
  lockedEmployeeId,
  onTake,
}: ExpenseModalProps) {
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

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (form.validate().hasErrors) return;
    setSubmitting(true);
    try {
      await onTake(form.values.employee, Number(form.values.amount), form.values.desc);
      form.reset();
    } catch (err) {
      console.error("[Cash] ExpenseModal submit failed:", err);
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
          Pobranie na zakupy
        </Text>
      }
      size="sm"
    >
      <Stack gap="md">
        <Text fz="sm" c="dimmed">
          Pracownik pobiera gotówkę z kasetki na zakupy salonowe.
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

        <TextInput
          label="Cel (opcjonalnie)"
          placeholder="np. Środki czystości"
          size="md"
          {...form.getInputProps("desc")}
        />

        <Button
          fullWidth
          size="lg"
          color="red"
          onClick={handleSubmit}
          loading={submitting}
          leftSection={<IconCash size={20} />}
        >
          Pobierz z kasy
        </Button>
      </Stack>
    </Modal>
  );
}
