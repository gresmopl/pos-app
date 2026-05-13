import { useState } from "react";
import { Text, Stack, Modal, NumberInput, Button } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconGift } from "@tabler/icons-react";

interface VoucherModalProps {
  opened: boolean;
  onClose: () => void;
  onSale: (amount: number) => void;
}

export function VoucherModal({ opened, onClose, onSale }: VoucherModalProps) {
  const form = useForm({
    initialValues: { amount: "" as number | string },
    validate: {
      amount: (v) => (Number(v) > 0 ? null : "Podaj kwotę bonu"),
    },
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSale = async () => {
    if (form.validate().hasErrors) return;
    setSubmitting(true);
    try {
      await onSale(Number(form.values.amount));
      form.reset();
    } catch (err) {
      console.error("[Cash] VoucherModal submit failed:", err);
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
          Sprzedaj bon
        </Text>
      }
      size="sm"
    >
      <Stack gap="md">
        <Text fz="sm" c="dimmed">
          Bon nie jest przypisany do fryzjera - wpływa do kasy salonu.
        </Text>

        <NumberInput
          label="Kwota bonu"
          placeholder="0"
          data-autofocus
          min={1}
          suffix=" zł"
          size="md"
          onFocus={(event) => event.currentTarget.select()}
          {...form.getInputProps("amount")}
        />

        <Button
          fullWidth
          size="lg"
          color="green"
          onClick={handleSale}
          loading={submitting}
          leftSection={<IconGift size={20} />}
        >
          Sprzedaj bon - {Number(form.values.amount) || 0} zł
        </Button>
      </Stack>
    </Modal>
  );
}
