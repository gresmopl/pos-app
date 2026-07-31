import { useState } from "react";
import { Text, Stack, Modal, NumberInput, Button } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconCoin } from "@tabler/icons-react";

interface TopUpModalProps {
  opened: boolean;
  onClose: () => void;
  onTopUp: (amount: number) => void;
}

export function TopUpModal({ opened, onClose, onTopUp }: TopUpModalProps) {
  const form = useForm({
    initialValues: { amount: "" as number | string },
    validate: {
      amount: (v) => (Number(v) > 0 ? null : "Podaj kwotę"),
    },
  });
  const [submitting, setSubmitting] = useState(false);

  const handleTopUp = async () => {
    if (form.validate().hasErrors) return;
    setSubmitting(true);
    try {
      await onTopUp(Number(form.values.amount));
      form.reset();
    } catch (err) {
      console.error("[Cash] TopUpModal submit failed:", err);
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
          Zasilenie kasy
        </Text>
      }
      size="sm"
    >
      <Stack gap="md">
        <Text fz="sm" c="dimmed">
          Np. drobne na wydawanie reszty. Nie jest przypisane do żadnego pracownika i nie wpływa na
          niczyj portfel.
        </Text>

        <NumberInput
          label="Kwota"
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
          onClick={handleTopUp}
          loading={submitting}
          leftSection={<IconCoin size={20} />}
        >
          Zasil kasę - {Number(form.values.amount) || 0} zł
        </Button>
      </Stack>
    </Modal>
  );
}
