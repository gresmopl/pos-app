import { Text, Stack, Modal, PinInput, Group, Button } from "@mantine/core";

interface PinModalProps {
  opened: boolean;
  onClose: () => void;
  title: string;
  description: string;
  pin: string;
  onPinChange: (value: string) => void;
  onSubmit: () => void;
  error: boolean;
}

export function PinModal({
  opened,
  onClose,
  title,
  description,
  pin,
  onPinChange,
  onSubmit,
  error,
}: PinModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Text fw={700} fz="lg">
          {title}
        </Text>
      }
      size="sm"
    >
      <Stack gap="md">
        <Text fz="sm">{description}</Text>
        <Stack align="center" gap="xs">
          <PinInput
            length={4}
            type="number"
            mask
            value={pin}
            onChange={(val) => onPinChange(val)}
            error={error}
          />
          {error && (
            <Text fz="xs" c="red">
              Nieprawidłowy PIN
            </Text>
          )}
        </Stack>
        <Group justify="flex-end">
          <Button variant="subtle" onClick={onClose}>
            Anuluj
          </Button>
          <Button disabled={pin.length < 4} onClick={onSubmit}>
            Potwierdź
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
